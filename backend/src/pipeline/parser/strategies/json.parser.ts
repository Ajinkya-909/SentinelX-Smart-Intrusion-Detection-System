import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

/**
 * JSON Log Parser
 * Parses log entries in JSON format
 *
 * Expected format (one JSON object per line):
 * {"timestamp":"2024-01-15T10:30:00Z","level":"ERROR","message":"Database connection failed","ip":"192.168.1.1"}
 *
 * Flexible field mapping:
 * - timestamp: timestamp, time, created_at, date, ts
 * - level: level, severity, priority, log_level
 * - message: message, msg, text, event
 * - ip/source: ip, source_ip, src_ip, client_ip
 * - user: user, username, user_id, uid
 * - status: status, status_code, code
 */
export class JsonParser extends BaseParser {
  protected parserName = "JSON_PARSER";

  /**
   * Common field name variations
   */
  private readonly fieldMappings = {
    timestamp: [
      "timestamp",
      "time",
      "created_at",
      "date",
      "ts",
      "@timestamp",
      "datetime",
    ],
    level: ["level", "severity", "priority", "log_level", "loglevel"],
    message: ["message", "msg", "text", "event", "content", "description"],
    sourceIp: ["ip", "source_ip", "src_ip", "client_ip", "remote_addr"],
    user: ["user", "username", "user_id", "uid", "actor"],
    statusCode: ["status", "status_code", "code", "http_status"],
  };

  /**
   * Parse single JSON log line
   * @param line - Raw JSON log line
   * @returns - ParsedLog or null if cannot parse
   */
  parseLine(line: string): ParsedLog | null {
    try {
      // Try to parse JSON
      const json = this.safeJsonParse(line);
      if (!json || typeof json !== "object") {
        return null;
      }

      // Extract fields using flexible mapping
      const timestamp = this.extractField(json, this.fieldMappings.timestamp);
      const level = this.extractField(json, this.fieldMappings.level);
      const message = this.extractField(json, this.fieldMappings.message);
      const sourceIp = this.extractField(json, this.fieldMappings.sourceIp);
      const user = this.extractField(json, this.fieldMappings.user);
      const statusCode = this.extractField(json, this.fieldMappings.statusCode);

      // Require at least a message to consider it a valid log
      if (!message) {
        return null;
      }

      const validatedIp = sourceIp
        ? this.validateIp(String(sourceIp))
        : undefined;
      const parsedUser = user ? String(user) : undefined;
      const parsedStatusCode = statusCode
        ? parseInt(String(statusCode), 10)
        : undefined;

      const parsedLog: ParsedLog = {
        timestamp: timestamp ? this.parseTimestamp(timestamp) : new Date(),
        logLevel: level ? String(level).toUpperCase() : "INFO",
        message: String(message),
        raw: line,
        metadata: {
          ...json, // Store the entire JSON as metadata
        },
      };

      // Only add optional fields if they have values
      if (validatedIp) parsedLog.sourceIp = validatedIp;
      if (parsedUser) parsedLog.user = parsedUser;
      if (parsedStatusCode !== undefined)
        parsedLog.statusCode = parsedStatusCode;

      return parsedLog;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract field value from JSON object using multiple field name options
   * @param obj - JSON object
   * @param fieldNames - Array of possible field names
   * @returns - Field value or undefined
   */
  private extractField(obj: Record<string, any>, fieldNames: string[]): any {
    for (const fieldName of fieldNames) {
      if (fieldName in obj) {
        return obj[fieldName];
      }
    }
    return undefined;
  }
}

export const jsonParser = new JsonParser();
