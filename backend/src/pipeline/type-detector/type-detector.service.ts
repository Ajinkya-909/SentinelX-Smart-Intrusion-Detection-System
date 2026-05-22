import { DetectionResult } from "../../types/db.types";
import { jobRepository } from "../../repositories/job.repository";
import logger from "../../config/logger";
import {
  nginxDetector,
  syslogDetector,
  jsonDetector,
  keyValueDetector,
  genericDetector,
  DetectorResult,
} from "./detectors";

// ================================================
// TYPE DETECTOR SERVICE
// ================================================

export class TypeDetectorService {
  /**
   * Main detection method
   * Analyzes raw lines to detect log format
   * @param rawLines - Array of preprocessed log lines
   * @returns - DetectionResult with detected type, confidence, parser, encoding
   */
  async detect(rawLines: string[]): Promise<DetectionResult> {
    logger.info(
      `[TYPE_DETECTOR] Starting type detection on ${rawLines.length} lines`,
    );

    // Sample first N lines for analysis (don't analyze entire file)
    const sampleSize = Math.min(100, rawLines.length);
    const sampleLines = rawLines.slice(0, sampleSize);

    logger.info(
      `[TYPE_DETECTOR] Analyzing sample of ${sampleSize} lines with all detectors`,
    );

    // Run all detectors and store results in object (type-safe)
    const detectorResults = {
      nginx: nginxDetector.analyze(sampleLines),
      syslog: syslogDetector.analyze(sampleLines),
      json: jsonDetector.analyze(sampleLines),
      keyValue: keyValueDetector.analyze(sampleLines),
      generic: genericDetector.analyze(sampleLines),
    };

    logger.debug(
      `[TYPE_DETECTOR] Detector results:`,
      Object.entries(detectorResults)
        .map(
          ([type, result]) =>
            `${type}=${(result.confidence * 100).toFixed(2)}%`,
        )
        .join(", "),
    );

    // Find the detector with highest confidence
    const bestResult = Object.values(detectorResults).reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );

    logger.info(
      `[TYPE_DETECTOR] Best match: ${bestResult.type} with ${(bestResult.confidence * 100).toFixed(2)}% confidence`,
    );

    // Build final DetectionResult
    const detectionResult: DetectionResult = {
      detectedType: bestResult.type,
      confidence: bestResult.confidence,
      parser: bestResult.parser,
      encoding: "utf8",
      patterns: {
        matched: bestResult.matched,
        analysis: {
          nginx: detectorResults.nginx.confidence,
          syslog: detectorResults.syslog.confidence,
          json: detectorResults.json.confidence,
          keyValue: detectorResults.keyValue.confidence,
          generic: detectorResults.generic.confidence,
        },
      },
    };

    logger.info(
      `[TYPE_DETECTOR] Detection result: ${detectionResult.detectedType} (${Math.round(detectionResult.confidence * 100)}% confidence)`,
    );

    return detectionResult;
  }

  /**
   * Update detection metadata in database
   * Called from orchestrator after detection completes
   * @param jobId - UUID of the job
   * @param metadata - DetectionResult to store
   */
  async updateDetectionMetadata(
    jobId: string,
    metadata: DetectionResult,
  ): Promise<void> {
    logger.info(`[TYPE_DETECTOR] Storing detection metadata for job ${jobId}`);
    await jobRepository.updateDetectionMetadata(jobId, metadata);
    logger.info(`[TYPE_DETECTOR] Detection metadata stored successfully`);
  }

  /**
   * Fetch detection metadata from database
   * Called from parserService to get detected type and parser strategy
   * @param jobId - UUID of the job
   * @returns - DetectionResult if exists, null otherwise
   */
  async getDetectionMetadata(jobId: string): Promise<DetectionResult | null> {
    logger.info(`[TYPE_DETECTOR] Fetching detection metadata for job ${jobId}`);
    const metadata = await jobRepository.getDetectionMetadata(jobId);
    if (metadata) {
      logger.info(
        `[TYPE_DETECTOR] Detection metadata found: ${metadata.detectedType}`,
      );
    } else {
      logger.warn(
        `[TYPE_DETECTOR] No detection metadata found for job ${jobId}`,
      );
    }
    return metadata;
  }
}

export const typeDetectorService = new TypeDetectorService();
