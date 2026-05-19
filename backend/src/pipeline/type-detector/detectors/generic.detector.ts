import logger from "../../../config/logger";
import { DetectorResult } from "./nginx.detector";

// ================================================
// GENERIC DETECTOR
// ================================================

export class GenericDetector {
  private readonly name = "GENERIC";

  // Generic patterns that match most log formats
  private patterns = {
    // Any line with a timestamp-like pattern
    timestamp: /\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3}\s+\d{1,2}/,

    // Any line with brackets or parentheses (common in structured logs)
    bracketed: /[\[\(].*[\]\)]/,

    // Any line with key=value pattern (CSV-like or key-value logs)
    keyValue: /\w+\s*=\s*\S+/,

    // Any line with at least some text (not empty after preprocessing)
    hasContent: /.+/,
  };

  /**
   * Analyze lines for generic log format (fallback)
   * This detector always returns a low confidence score as a fallback
   * @param lines - Sample of log lines
   * @returns - DetectorResult with low confidence score
   */
  analyze(lines: string[]): DetectorResult {
    logger.debug(`[GENERIC_DETECTOR] Analyzing ${lines.length} lines`);

    let timestampMatches = 0;
    let bracketedMatches = 0;
    let keyValueMatches = 0;
    let hasContentMatches = 0;

    for (const line of lines) {
      if (this.patterns.timestamp.test(line)) {
        timestampMatches++;
      }
      if (this.patterns.bracketed.test(line)) {
        bracketedMatches++;
      }
      if (this.patterns.keyValue.test(line)) {
        keyValueMatches++;
      }
      if (this.patterns.hasContent.test(line)) {
        hasContentMatches++;
      }
    }

    // Generic detector should have lower confidence than specific detectors
    // It's a fallback, so max out at 0.4-0.5
    const timestampConfidence = timestampMatches / lines.length;
    const bracketedConfidence = bracketedMatches / lines.length;
    const keyValueConfidence = keyValueMatches / lines.length;
    const hasContentConfidence = hasContentMatches / lines.length;

    let confidence =
      (timestampConfidence +
        bracketedConfidence +
        keyValueConfidence +
        hasContentConfidence) /
      4;

    // Cap generic detector confidence at 0.45 to ensure specific detectors take priority
    confidence = Math.min(confidence, 0.45);

    logger.debug(
      `[GENERIC_DETECTOR] Confidence: ${(confidence * 100).toFixed(2)}% (timestamp: ${(timestampConfidence * 100).toFixed(2)}%, bracketed: ${(bracketedConfidence * 100).toFixed(2)}%, keyValue: ${(keyValueConfidence * 100).toFixed(2)}%, hasContent: ${(hasContentConfidence * 100).toFixed(2)}%)`,
    );

    return {
      type: "GENERIC",
      parser: "genericParser",
      confidence,
      matched: [
        timestampMatches > 0 ? "timestamp" : null,
        bracketedMatches > 0 ? "bracketed" : null,
        keyValueMatches > 0 ? "keyValue" : null,
        hasContentMatches > 0 ? "hasContent" : null,
      ].filter((m) => m !== null) as string[],
    };
  }
}

export const genericDetector = new GenericDetector();
