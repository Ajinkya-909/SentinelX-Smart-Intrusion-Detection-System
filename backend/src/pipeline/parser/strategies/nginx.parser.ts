import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

/**
 * NGINX Access Log Parser
 * Parses standard NGINX access log format
 *
 * Expected format:
 * 127.0.0.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
 *
 * Fields extracted:
 * - IP address (source)
 * - timestamp
 * - HTTP method
 * - path
 * - HTTP version
 * - status code
 * - response size (bytes)
 * - referrer
 * - user agent
 */
export class NginxParser extends BaseParser {
  protected parserName = "NGINX_PARSER";

  /**
   * Regex pattern for standard NGINX access log
   * Captures: IP, timestamp, method, path, protocol, status, bytes, referrer, user-agent
   *
   * Format: IP - - [timestamp] "METHOD path PROTOCOL" status bytes "referrer" "user-agent"
   * Example: 127.0.0.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
   */
  private readonly pattern =
    /^([^\s]+)\s+-\s+-\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^\s]+)\s+(HTTP\/[\d.]+)"\s+(\d{3})\s+(\d+|-)\s+"([^"]*)"\s+"([^"]*)"/;

  /**
   * Parse single NGINX access log line
   * @param line - Raw NGINX log line
   * @returns - ParsedLog or null if cannot parse
   */
  parseLine(line: string): ParsedLog | null {
    try {
      const match = line.match(this.pattern);

      if (!match || match.length < 10) {
        return null; // Line doesn't match NGINX format
      }

      const sourceIp = match[1] || "";
      const timestampStr = match[2] || "";
      const method = match[3] || "";
      const path = match[4] || "";
      const protocol = match[5] || "";
      const statusCodeStr = match[6] || "";
      const bytesStr = match[7] || "-";
      const referrer = match[8] || "";
      const userAgent = match[9] || "";

      const statusCode = parseInt(statusCodeStr, 10);
      const bytes = bytesStr === "-" ? undefined : parseInt(bytesStr, 10);

      // Parse NGINX timestamp format: 15/Jan/2024:10:30:00 +0000
      const timestamp = this.parseNginxTimestamp(timestampStr);
      const validatedIp = this.validateIp(sourceIp);

      const parsedLog: ParsedLog = {
        timestamp,
        logLevel: this.inferLevelFromStatusCode(statusCode),
        message: `${method} ${path} ${protocol}`,
        statusCode,
        raw: line,
        // Additional metadata
        metadata: {
          method,
          path,
          protocol,
          bytes,
          referrer: referrer || undefined,
          userAgent: userAgent || undefined,
        },
      };

      // Only add optional fields if they have values
      if (validatedIp) parsedLog.sourceIp = validatedIp;

      return parsedLog;
    } catch (error) {
      throw new Error(
        `Failed to parse NGINX log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse NGINX timestamp format: 15/Jan/2024:10:30:00 +0000
   * @param timestampStr - NGINX format timestamp
   * @returns - Date object
   */
  private parseNginxTimestamp(timestampStr: string): Date {
    try {
      // Format: 15/Jan/2024:10:30:00 +0000
      // Convert to ISO format: 2024-01-15T10:30:00Z
      const months: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const parts = timestampStr.split(/[\/:\s+]/);
      if (parts.length < 6) {
        return new Date();
      }

      const day = parseInt(parts[0] || "1", 10);
      const monthKey = parts[1] || "Jan";
      const month = months[monthKey] || 0;
      const year = parseInt(parts[2] || "2024", 10);
      const hours = parseInt(parts[3] || "0", 10);
      const minutes = parseInt(parts[4] || "0", 10);
      const seconds = parseInt(parts[5] || "0", 10);

      return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    } catch {
      return new Date();
    }
  }
}

export const nginxParser = new NginxParser();
