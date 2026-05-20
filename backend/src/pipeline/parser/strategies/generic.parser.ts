import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

/**
 * Generic Log Parser
 * Fallback parser for unstructured or unknown log formats
 *
 * This parser attempts to extract information from any text-based log
 * by looking for common patterns and keywords
 *
 * Heuristics:
 * - First non-whitespace part might be timestamp
 * - Keywords like ERROR, WARN, INFO indicate log level
 * - IP address patterns indicate source
 * - Numeric codes might be status codes
 */
export class GenericParser extends BaseParser {
  protected parserName = "GENERIC_PARSER";

  /**
   * Pattern to detect log levels in text
   */
  private readonly levelPattern =
    /\b(CRITICAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL|SEVERE)\b/i;

  /**
   * Pattern to detect IPv4 addresses
   */
  private readonly ipPattern = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/;

  /**
   * Pattern to detect status codes (3-digit numbers in context)
   */
  private readonly statusPattern = /\b(2\d{2}|3\d{2}|4\d{2}|5\d{2})\b/;

  /**
   * Common timestamp patterns
   */
  private readonly timestampPatterns = [
    // ISO format: 2024-01-15T10:30:00Z
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/,
    // US format: 01/15/2024 10:30:00
    /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/,
    // EU format: 15-01-2024 10:30:00
    /(\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2}:\d{2})/,
    // Syslog format: Jan 15 10:30:00
    /([A-Za-z]{3}\s+\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/,
  ];

  /**
   * Parse single generic log line
   * @param line - Raw log line
   * @returns - ParsedLog or null if line is empty
   */
  parseLine(line: string): ParsedLog | null {
    try {
      // Skip empty lines
      if (!line || line.trim().length === 0) {
        return null;
      }

      // Extract fields using heuristics
      const timestamp = this.extractTimestamp(line);
      const logLevel = this.extractLogLevel(line);
      const sourceIp = this.extractIp(line);
      const statusCode = this.extractStatusCode(line);
      const validatedIp = sourceIp ? this.validateIp(sourceIp) : undefined;

      const parsedLog: ParsedLog = {
        timestamp: timestamp || new Date(),
        logLevel,
        message: line.substring(0, 1000), // Truncate very long lines
        raw: line,
        metadata: {
          parser: "generic",
          truncated: line.length > 1000,
        },
      };

      // Only add optional fields if they have values
      if (validatedIp) parsedLog.sourceIp = validatedIp;
      if (statusCode !== undefined) parsedLog.statusCode = statusCode;

      return parsedLog;
    } catch (error) {
      throw new Error(
        `Failed to parse generic log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract timestamp from log line using pattern matching
   */
  private extractTimestamp(line: string): Date | undefined {
    for (const pattern of this.timestampPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        try {
          const parsed = this.parseTimestamp(match[1]);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }
    return undefined;
  }

  /**
   * Extract log level from line
   */
  private extractLogLevel(line: string): string {
    const match = line.match(this.levelPattern);
    if (match) {
      return match[0].toUpperCase();
    }

    // Infer from keywords
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes("error") ||
      lowerLine.includes("fatal") ||
      lowerLine.includes("failed")
    ) {
      return "ERROR";
    }
    if (lowerLine.includes("warn")) {
      return "WARN";
    }
    if (lowerLine.includes("debug")) {
      return "DEBUG";
    }

    return "INFO";
  }

  /**
   * Extract IP address from line
   */
  private extractIp(line: string): string | undefined {
    const match = line.match(this.ipPattern);
    return match ? match[1] : undefined;
  }

  /**
   * Extract HTTP status code from line
   */
  private extractStatusCode(line: string): number | undefined {
    const match = line.match(this.statusPattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return undefined;
  }
}

export const genericParser = new GenericParser();
