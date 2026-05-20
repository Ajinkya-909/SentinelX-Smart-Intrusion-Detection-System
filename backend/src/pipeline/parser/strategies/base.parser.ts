import { ParsedLog, ParserResult, ParseError, ParserStats } from "../types";
import logger from "../../../config/logger";

/**
 * Base Parser Abstract Class
 * Defines interface for all log format parsers
 * Each parser implements log-type-specific parsing logic
 */
export abstract class BaseParser {
  protected parserName: string = "BaseParser";

  /**
   * Main parse method
   * @param lines - Array of raw log lines to parse
   * @returns - ParserResult with parsed logs and error tracking
   */
  async parse(lines: string[]): Promise<ParserResult> {
    logger.info(
      `[${this.parserName}] Starting to parse ${lines.length} log lines`,
    );

    const startTime = Date.now();
    const parsedLogs: ParsedLog[] = [];
    const failedLines: ParseError[] = [];
    let successCount = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      try {
        const parsed = this.parseLine(lines[lineNum]);
        if (parsed) {
          parsedLogs.push(parsed);
          successCount++;
        }
      } catch (error) {
        failedLines.push({
          lineNumber: lineNum + 1,
          rawLine: lines[lineNum],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const stats: ParserStats = {
      totalLines: lines.length,
      successfullyParsed: successCount,
      failedToParse: failedLines.length,
      averageParseTimeMs: lines.length > 0 ? totalTime / lines.length : 0,
    };

    logger.info(
      `[${this.parserName}] Parse complete: ${successCount}/${lines.length} successful (${Math.round((successCount / lines.length) * 100)}%)`,
    );

    return {
      success: successCount > 0,
      parsedLogs,
      failedLines,
      stats,
    };
  }

  /**
   * Abstract method - implemented by subclasses
   * Parses a single log line into structured data
   * @param line - Raw log line
   * @returns - ParsedLog object or null if line cannot be parsed
   */
  abstract parseLine(line: string): ParsedLog | null;

  /**
   * Helper: Convert various timestamp formats to Date
   * @param timestamp - Timestamp string or number
   * @returns - Date object
   */
  protected parseTimestamp(timestamp: string | number | Date): Date {
    if (timestamp instanceof Date) return timestamp;

    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }

    // Try ISO format first
    const isoDate = new Date(timestamp);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Fallback: current time
    logger.warn(`[${this.parserName}] Could not parse timestamp: ${timestamp}`);
    return new Date();
  }

  /**
   * Helper: Infer log level from HTTP status code
   * @param statusCode - HTTP status code (200, 404, 500, etc)
   * @returns - Log level (INFO, WARN, ERROR, etc)
   */
  protected inferLevelFromStatusCode(statusCode?: number): string {
    if (!statusCode) return "INFO";

    if (statusCode < 300) return "INFO";
    if (statusCode < 400) return "INFO";
    if (statusCode < 500) return "WARN";
    return "ERROR";
  }

  /**
   * Helper: Clean and validate IP address
   * @param ip - IP string
   * @returns - Cleaned IP or undefined
   */
  protected validateIp(ip?: string): string | undefined {
    if (!ip) return undefined;

    const ipRegex =
      /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
    return ipRegex.test(ip) ? ip : undefined;
  }

  /**
   * Helper: Safe JSON parse
   * @param json - JSON string
   * @returns - Parsed object or null
   */
  protected safeJsonParse(json: string): any {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
