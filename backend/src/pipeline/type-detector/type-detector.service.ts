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

// Array of all available heuristic detectors for easy iteration
const ALL_DETECTORS = [
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
];

export class TypeDetectorService {
  /**
   * Analyzes raw lines to detect log format using heuristic scoring and dynamic sampling.
   * @param rawLines - Array of preprocessed log lines
   * @param options - Config options (e.g., exclude certain parsers during adaptive retries)
   */
  async detect(rawLines: string[], options?: { exclude?: string[] }): Promise<DetectionResult> {
    logger.info(`[TYPE_DETECTOR] Starting adaptive type detection on ${rawLines.length} lines`);

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
      const sampleLines = rawLines.slice(0, sampleSize);

      logger.info(`[TYPE_DETECTOR] Sampling ${sampleSize} lines...`);

      let currentBest: any = null;
      let highestConfidence = -1;
      const currentAnalysis: Record<string, number> = {};

      // Run all detectors in the suite
      for (const detector of ALL_DETECTORS) {
        const result = detector.analyze(sampleLines);
        currentAnalysis[result.type] = result.confidence;

        // Skip excluded types (used by the adaptive parser loop to force fallbacks)
        if (excludedTypes.includes(result.type)) {
          continue;
        }

        // Track the highest confidence winner
        if (result.confidence > highestConfidence) {
          highestConfidence = result.confidence;
          currentBest = result;
        }
      }

      bestRawResult = currentBest;
      finalAnalysis = currentAnalysis;

      logger.debug(`[TYPE_DETECTOR] Best match at ${sampleSize} lines: ${bestRawResult?.type} (${((bestRawResult?.confidence || 0) * 100).toFixed(2)}%)`);

      // If we have a strong confidence (>= 50%), OR we've exhausted the available lines, stop expanding.
      if ((bestRawResult && bestRawResult.confidence >= 0.50) || sampleSize >= rawLines.length) {
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