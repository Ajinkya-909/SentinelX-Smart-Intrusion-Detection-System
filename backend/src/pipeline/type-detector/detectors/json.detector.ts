import logger from "../../../config/logger";
import { DetectorResult } from "./nginx.detector";

// ================================================
// JSON DETECTOR
// ================================================

export class JsonDetector {
  private readonly name = "JSON";

  // JSON-specific regex patterns
  private patterns = {
    // Line starts with { (JSON object)
    jsonObject: /^\s*\{/,

    // Line starts with [ (JSON array)
    jsonArray: /^\s*\[/,

    // Contains JSON key-value pair: "key": value
    jsonProperty: /"[^"]+"\s*:/,

    // Contains common log fields
    commonLogFields:
      /"(timestamp|level|message|severity|type|event|logger|class)"/i,
  };

  /**
   * Analyze lines for JSON log format
   * @param lines - Sample of log lines
   * @returns - DetectorResult with confidence score
   */
  analyze(lines: string[]): DetectorResult {
    logger.debug(`[JSON_DETECTOR] Analyzing ${lines.length} lines`);

    let jsonObjectMatches = 0;
    let jsonArrayMatches = 0;
    let jsonPropertyMatches = 0;
    let commonLogFieldMatches = 0;
    let validJsonMatches = 0;

    for (const line of lines) {
      // Check for JSON object or array start
      if (this.patterns.jsonObject.test(line)) {
        jsonObjectMatches++;
      }
      if (this.patterns.jsonArray.test(line)) {
        jsonArrayMatches++;
      }

      // Check for JSON property format
      if (this.patterns.jsonProperty.test(line)) {
        jsonPropertyMatches++;
      }

      // Check for common log fields in JSON
      if (this.patterns.commonLogFields.test(line)) {
        commonLogFieldMatches++;
      }

      // Try to parse as valid JSON
      try {
        JSON.parse(line);
        validJsonMatches++;
      } catch {
        // Not valid JSON, skip
      }
    }

    // Calculate confidence: average of pattern matches
    const jsonObjectConfidence = jsonObjectMatches / lines.length;
    const jsonPropertyConfidence = jsonPropertyMatches / lines.length;
    const commonLogFieldConfidence = commonLogFieldMatches / lines.length;
    const validJsonConfidence = validJsonMatches / lines.length;

    const confidence =
      (jsonObjectConfidence +
        jsonPropertyConfidence +
        commonLogFieldConfidence +
        validJsonConfidence) /
      4;

    logger.debug(
      `[JSON_DETECTOR] Confidence: ${(confidence * 100).toFixed(2)}% (jsonObject: ${(jsonObjectConfidence * 100).toFixed(2)}%, jsonProperty: ${(jsonPropertyConfidence * 100).toFixed(2)}%, commonLogField: ${(commonLogFieldConfidence * 100).toFixed(2)}%, validJson: ${(validJsonConfidence * 100).toFixed(2)}%)`,
    );

    return {
      type: "JSON",
      parser: "jsonParserV1",
      confidence,
      matched: [
        jsonObjectMatches > 0 ? "jsonObject" : null,
        jsonPropertyMatches > 0 ? "jsonProperty" : null,
        commonLogFieldMatches > 0 ? "commonLogField" : null,
        validJsonMatches > 0 ? "validJson" : null,
      ].filter((m) => m !== null) as string[],
    };
  }
}

export const jsonDetector = new JsonDetector();
