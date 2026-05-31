import { DetectionResult } from "../../types/db.types";
import { jobRepository } from "../../repositories/job.repository";
import logger from "../../config/logger";
import {
  nginxDetector,
  apacheDetector,
  syslogDetector,
  windowsEventDetector,
  firewallDetector,
  cloudTrailDetector,
  suricataDetector,
  dockerDetector,
  jsonDetector,
  keyValueDetector,
  genericDetector
} from "./detectors";

// ============================================================================
// PHASE 1: TIERED DETECTOR HIERARCHY
// ============================================================================

// Tier 1: High-Fidelity Envelopes. If these match, they are almost certainly correct.
const TIER_1_HIGH_FIDELITY = [
  cloudTrailDetector,
  suricataDetector,
  dockerDetector,
  windowsEventDetector
];

// Tier 2: Standard Infrastructure. Strict text formats with predictable regex.
const TIER_2_INFRASTRUCTURE = [
  syslogDetector,
  nginxDetector,
  apacheDetector,
  firewallDetector
];

// Tier 3: Greedy Structural Fallbacks. These should ONLY win if Tiers 1 & 2 fail.
const TIER_3_FALLBACKS = [
  jsonDetector,
  keyValueDetector,
  genericDetector
];

export class TypeDetectorService {
  /**
   * Analyzes raw lines to detect log format using Tiered Heuristic Scoring,
   * Fallback Penalties, and Dynamic Sampling.
   * @param rawLines - Array of preprocessed log lines
   * @param options - Config options (e.g., exclude certain parsers during adaptive retries)
   */
  async detect(rawLines: string[], options?: { exclude?: string[] }): Promise<DetectionResult> {
    logger.info(`[TYPE_DETECTOR] Starting adaptive tiered type detection on ${rawLines.length} lines`);

    const excludedTypes = options?.exclude || [];
    if (excludedTypes.length > 0) {
      logger.info(`[TYPE_DETECTOR] Excluding previously failed types: ${excludedTypes.join(", ")}`);
    }

    const sampleSizesToTry = [100, 500, 1000];
    let bestRawResult: any = null;
    let finalAnalysis: Record<string, number> = {};

    // Dynamic Expanding Sample Size Loop
    for (const size of sampleSizesToTry) {
      const sampleSize = Math.min(size, rawLines.length);

      // FIX: Sample from three positions (start, middle, end) instead of always
      // slicing from the beginning of the file.
      //
      // Log files frequently have format headers, rotation markers, or comment
      // lines at the top that don't match the actual format of the body content.
      // Always sampling rawLines.slice(0, N) means the detector sees these
      // atypical lines disproportionately, producing artificially low confidence
      // for the correct format and sometimes picking the wrong parser entirely.
      //
      // Distributing the sample across three positions gives a representative
      // view of the file's actual content regardless of header noise.
      const sampleLines = this.getDistributedSample(rawLines, sampleSize);

      logger.info(`[TYPE_DETECTOR] Sampling ${sampleSize} lines (distributed: start/middle/end)...`);

      // 1. Analyze and group results by tier, immediately filtering out excluded types
      // By calling analyze() first, we access the valid public `type` property on the result object.
      const tier1Results = TIER_1_HIGH_FIDELITY
        .map(d => d.analyze(sampleLines))
        .filter(r => !excludedTypes.includes(r.type));

      const tier2Results = TIER_2_INFRASTRUCTURE
        .map(d => d.analyze(sampleLines))
        .filter(r => !excludedTypes.includes(r.type));

      const tier3Results = TIER_3_FALLBACKS
        .map(d => d.analyze(sampleLines))
        .filter(r => !excludedTypes.includes(r.type));

      // ============================================================================
      // PHASE 2: THE PENALTY ENGINE
      // ============================================================================
      // FIX: Raised threshold from 0.20 → 0.40 before applying the Tier 3 penalty.
      //
      // At 0.20, any Tier 1/2 detector hitting just 21% confidence (e.g. a CloudTrail
      // export where 25% of lines are JSON event records and 75% are structured text
      // headers) triggered a 60% penalty on ALL Tier 3 fallbacks — pushing jsonDetector
      // below genericDetector even when JSON was clearly the right answer.
      //
      // At 0.40, the signal must represent a genuine majority before we penalise
      // the structural fallbacks. A detector at 41%+ is meaningfully dominating the
      // sample; at 21% it's a weak hint that shouldn't override structural evidence.
      const hasStrongSignal =
        tier1Results.some(r => r.confidence > 0.40) ||
        tier2Results.some(r => r.confidence > 0.40);

      if (hasStrongSignal) {
        for (const fallbackResult of tier3Results) {
          // Apply a 60% penalty to the fallback score to prevent hijacking
          fallbackResult.confidence *= 0.4;
        }
        logger.debug(`[TYPE_DETECTOR] Strong strict signal detected (>40%). Applied 60% penalty to Tier 3 fallbacks.`);
      }

      // Combine all valid results after penalties have been applied
      const allResults = [...tier1Results, ...tier2Results, ...tier3Results];

      let currentBest: any = null;
      let highestConfidence = -1;
      const currentAnalysis: Record<string, number> = {};

      // 2. Determine the actual winner 
      for (const result of allResults) {
        currentAnalysis[result.type] = result.confidence;
        if (result.confidence > highestConfidence) {
          highestConfidence = result.confidence;
          currentBest = result;
        }
      }

      bestRawResult = currentBest;
      finalAnalysis = currentAnalysis;

      logger.debug(`[TYPE_DETECTOR] Best match at ${sampleSize} lines: ${bestRawResult?.type} (${((bestRawResult?.confidence || 0) * 100).toFixed(2)}%)`);

      // ============================================================================
      // PHASE 3: RAISED EXIT THRESHOLD (50% -> 85%)
      // ============================================================================
      if ((bestRawResult && bestRawResult.confidence >= 0.85) || sampleSize >= rawLines.length) {
        logger.info(`[TYPE_DETECTOR] Confidence threshold met or max lines reached. Stopping expansion.`);
        break;
      } else {
        logger.warn(`[TYPE_DETECTOR] Low confidence (${((bestRawResult?.confidence || 0) * 100).toFixed(2)}%). Expanding sample size...`);
      }
    }

    // Ultimate Safety Net: If EVERYTHING was excluded somehow, force generic.
    if (!bestRawResult) {
      bestRawResult = genericDetector.analyze(rawLines.slice(0, 100));
    }

    // Build the final DetectionResult formatted for the pipeline database
    const detectionResult: DetectionResult = {
      detectedType: bestRawResult.type,
      confidence: bestRawResult.confidence,
      parser: bestRawResult.parser,
      encoding: "utf8", // Assume utf8 as preprocessor handles standardizing this
      patterns: {
        matched: bestRawResult.matched || [],
        analysis: finalAnalysis,
      },
    };

    logger.info(
      `[TYPE_DETECTOR] Final Detection: ${detectionResult.detectedType} (${Math.round(detectionResult.confidence * 100)}% confidence) -> mapped to ${detectionResult.parser}`
    );

    return detectionResult;
  }

  /**
   * Returns a representative sample drawn from three positions in the file:
   * the start, the middle, and the end — each getting roughly one third of
   * the requested sample size.
   *
   * This prevents log file headers, rotation markers, or comment blocks at
   * the top of a file from dominating the detection sample and producing
   * artificially low confidence or wrong type selection.
   */
  private getDistributedSample(lines: string[], size: number): string[] {
    if (lines.length <= size) return lines;

    const third = Math.floor(size / 3);
    const remainder = size - third * 2; // absorb rounding into the middle slice
    const mid = Math.floor(lines.length / 2);

    return [
      ...lines.slice(0, third),                        // start
      ...lines.slice(mid, mid + remainder),            // middle
      ...lines.slice(lines.length - third),            // end
    ];
  }

  // --- EXISTING DATABASE METHODS (Untouched) ---

  async updateDetectionMetadata(jobId: string, metadata: DetectionResult): Promise<void> {
    logger.info(`[TYPE_DETECTOR] Storing detection metadata for job ${jobId}`);
    await jobRepository.updateDetectionMetadata(jobId, metadata);
    logger.info(`[TYPE_DETECTOR] Detection metadata stored successfully`);
  }

  async getDetectionMetadata(jobId: string): Promise<DetectionResult | null> {
    logger.info(`[TYPE_DETECTOR] Fetching detection metadata for job ${jobId}`);
    const metadata = await jobRepository.getDetectionMetadata(jobId);
    if (metadata) {
      logger.info(`[TYPE_DETECTOR] Detection metadata found: ${metadata.detectedType}`);
    } else {
      logger.warn(`[TYPE_DETECTOR] No detection metadata found for job ${jobId}`);
    }
    return metadata;
  }
}

export const typeDetectorService = new TypeDetectorService();