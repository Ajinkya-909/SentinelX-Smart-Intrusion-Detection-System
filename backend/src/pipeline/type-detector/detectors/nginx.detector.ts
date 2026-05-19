import logger from "../../../config/logger";

// ================================================
// DETECTOR RESULT INTERFACE
// ================================================

export interface DetectorResult {
  type: string;
  parser: string;
  confidence: number;
  matched: string[];
}

// ================================================
// NGINX DETECTOR
// ================================================

export class NginxDetector {
  private readonly name = "NGINX";

  // NGINX-specific regex patterns
  private patterns = {
    // Standard NGINX access log: 192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /path HTTP/1.1" 200 1234
    accessLog:
      /(\d+\.\d+\.\d+\.\d+)\s+\S+\s+\S+\s+\[.*?\]\s+"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\S+\s+HTTP\/\d\.\d"\s+(\d{3})/,

    // HTTP request line: GET /path HTTP/1.1
    httpRequest:
      /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\S+\s+HTTP\/\d\.\d/,

    // Status code: 200, 404, 500, etc
    statusCode: /\s(2\d{2}|3\d{2}|4\d{2}|5\d{2})\s/,
  };

  /**
   * Analyze lines for NGINX log format
   * @param lines - Sample of log lines
   * @returns - DetectorResult with confidence score
   */
  analyze(lines: string[]): DetectorResult {
    logger.debug(`[NGINX_DETECTOR] Analyzing ${lines.length} lines`);

    let accessLogMatches = 0;
    let httpRequestMatches = 0;
    let statusCodeMatches = 0;

    for (const line of lines) {
      if (this.patterns.accessLog.test(line)) {
        accessLogMatches++;
      }
      if (this.patterns.httpRequest.test(line)) {
        httpRequestMatches++;
      }
      if (this.patterns.statusCode.test(line)) {
        statusCodeMatches++;
      }
    }

    // Calculate confidence: average of all pattern matches
    const accessLogConfidence = accessLogMatches / lines.length;
    const httpRequestConfidence = httpRequestMatches / lines.length;
    const statusCodeConfidence = statusCodeMatches / lines.length;

    const confidence =
      (accessLogConfidence + httpRequestConfidence + statusCodeConfidence) / 3;

    logger.debug(
      `[NGINX_DETECTOR] Confidence: ${(confidence * 100).toFixed(2)}% (accessLog: ${(accessLogConfidence * 100).toFixed(2)}%, httpRequest: ${(httpRequestConfidence * 100).toFixed(2)}%, statusCode: ${(statusCodeConfidence * 100).toFixed(2)}%)`,
    );

    return {
      type: "NGINX_ACCESS",
      parser: "nginxParserV1",
      confidence,
      matched: [
        accessLogMatches > 0 ? "accessLog" : null,
        httpRequestMatches > 0 ? "httpRequest" : null,
        statusCodeMatches > 0 ? "statusCode" : null,
      ].filter((m) => m !== null) as string[],
    };
  }
}

export const nginxDetector = new NginxDetector();
