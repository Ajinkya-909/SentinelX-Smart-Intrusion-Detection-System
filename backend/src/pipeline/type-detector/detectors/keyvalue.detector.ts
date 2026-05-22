import logger from "../../../config/logger";
import { DetectorResult } from "./nginx.detector";

// ================================================
// KEY-VALUE DETECTOR
// ================================================

export class KeyValueDetector {
  private readonly name = "KEY_VALUE";

  /**
   * Analyze lines for key-value log format
   * Uses structural entropy and token density analysis
   *
   * Key-value format: "key1=value1 key2=value2 key3=value3"
   * or "key1:value1 key2:value2"
   *
   * @param lines - Sample of log lines
   * @returns - DetectorResult with confidence score
   */
  analyze(lines: string[]): DetectorResult {
    logger.debug(`[KEYVALUE_DETECTOR] Analyzing ${lines.length} lines`);

    let keyValueLineCount = 0;
    let totalTokens = 0;
    let validTokenDensity = 0;

    for (const line of lines) {
      // Check if line contains key-value pairs
      const kvMatches = line.match(/\w+\s*[=:]\s*\S+/g) || [];

      if (kvMatches.length > 0) {
        keyValueLineCount++;

        // Token density: ratio of key-value tokens to total string length
        const tokenLength = kvMatches.reduce(
          (sum, token) => sum + token.length,
          0,
        );
        const tokenDensity = tokenLength / line.length;

        // Valid token density is when key-value pairs make up >50% of the line
        if (tokenDensity > 0.5) {
          validTokenDensity++;
        }

        totalTokens += kvMatches.length;
      }
    }

    // Calculate confidence
    const lineFrequency = keyValueLineCount / lines.length;
    const densityRatio = validTokenDensity / Math.max(keyValueLineCount, 1);
    const averageTokensPerLine = totalTokens / Math.max(keyValueLineCount, 1);

    /**
     * Confidence calculation:
     * 1. At least 80% of lines must contain key-value pairs
     * 2. At least 60% of those lines must have valid token density
     * 3. Average tokens per line should be > 1 (multiple key-value pairs)
     */
    let confidence = 0;

    if (
      lineFrequency >= 0.8 &&
      densityRatio >= 0.6 &&
      averageTokensPerLine >= 1.5
    ) {
      // Strong key-value format detected
      confidence = 0.95;
    } else if (
      lineFrequency >= 0.7 &&
      densityRatio >= 0.5 &&
      averageTokensPerLine >= 1
    ) {
      // Moderate key-value format detected
      confidence = 0.85;
    } else if (lineFrequency >= 0.5) {
      // Some key-value structure detected
      confidence = 0.65;
    } else {
      // Not a key-value format
      confidence = 0.0;
    }

    logger.debug(
      `[KEYVALUE_DETECTOR] Analysis: lineFrequency=${(lineFrequency * 100).toFixed(2)}%, densityRatio=${(densityRatio * 100).toFixed(2)}%, avgTokens=${averageTokensPerLine.toFixed(2)}, confidence=${(confidence * 100).toFixed(2)}%`,
    );

    return {
      type: "KEY_VALUE",
      parser: "keyValueParser",
      confidence,
      matched: [
        lineFrequency > 0.5 ? "keyValue" : null,
        averageTokensPerLine >= 1 ? "multipleTokens" : null,
        densityRatio >= 0.6 ? "highDensity" : null,
      ].filter((m) => m !== null) as string[],
    };
  }
}

export const keyValueDetector = new KeyValueDetector();
