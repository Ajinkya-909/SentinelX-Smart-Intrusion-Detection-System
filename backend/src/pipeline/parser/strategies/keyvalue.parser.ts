import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

/**
 * Key-Value Log Parser
 * Specialized parser for structured key-value logs
 *
 * Handles formats like:
 * - "timestamp=2024-05-10T10:15:22Z user=john.doe ip=192.168.1.100 status=success"
 * - "2024-05-10T10:15:22Z event=LOGIN user=admin source=192.168.1.50 severity=high"
 *
 * Uses semantic tokenization to extract all key-value pairs dynamically
 */
export class KeyValueParser extends BaseParser {
  protected parserName = "KEY_VALUE_PARSER";

  /**
   * Regex pattern for extracting key-value pairs
   * Handles both quoted and unquoted values
   * Matches: key=value, key="value with spaces", key='value'
   *
   * Pattern breakdown:
   * (?:^|\s+)                    - Start of line or whitespace (don't capture)
   * (?<key>\w+)                  - Capture key name
   * (?:=|:)                      - Equals or colon separator
   * (?:"(?<qvalue>[^"]*)"|       - Quoted value (double quotes)
   *    '(?<sqvalue>[^']*)'|       - Single quoted value
   *    (?<uvalue>\S*))           - Unquoted value (non-whitespace)
   */
  private readonly keyValuePattern =
    /(?:^|\s+)(?<key>\w+)(?:=|:)(?:"(?<qvalue>[^"]*)"|'(?<sqvalue>[^']*)'|(?<uvalue>\S*))/g;

  /**
   * ISO 8601 timestamp pattern for extracting primary timestamp
   */
  private readonly timestampPattern =
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;

  /**
   * Parse a single key-value log line
   * @param line - Raw log line
   * @returns - ParsedLog with extracted key-value pairs as individual properties
   */
  parseLine(line: string): ParsedLog | null {
    try {
      // Skip empty lines
      if (!line || line.trim().length === 0) {
        return null;
      }

      // Extract all key-value pairs
      const extractedFields: Record<string, string> = {};
      let match;

      // Reset regex state
      this.keyValuePattern.lastIndex = 0;

      // Iterate through all matches
      while ((match = this.keyValuePattern.exec(line)) !== null) {
        const key = match.groups?.key;
        // Use the first matched value group (quoted, single-quoted, or unquoted)
        const value =
          match.groups?.qvalue ||
          match.groups?.sqvalue ||
          match.groups?.uvalue ||
          "";

        if (key) {
          extractedFields[key] = value;
        }
      }

      // If no key-value pairs found, return null
      if (Object.keys(extractedFields).length === 0) {
        return null;
      }

      // Extract or infer timestamp
      let timestamp: Date = new Date();
      const tsFromLine = line.match(this.timestampPattern)?.[1];
      if (tsFromLine) {
        timestamp = this.parseTimestamp(tsFromLine);
      } else if (extractedFields.timestamp) {
        timestamp = this.parseTimestamp(extractedFields.timestamp);
      }

      // Extract log level from common fields
      const logLevel =
        this.inferLogLevel(extractedFields) ||
        this.extractLogLevel(line) ||
        "INFO";

      // Extract IP address with semantic mapping
      const sourceIp = this.extractSemanticField(
        extractedFields,
        /(^ip$|ip_address|source_ip|client_ip|remote_addr|remote_ip|ipv4|ipv6|addr)/i,
      );

      // Extract user with semantic mapping
      const user = this.extractSemanticField(
        extractedFields,
        /(^user$|username|user_id|uid|actor|account|principal)/i,
      );

      // Extract event type
      const eventType = this.extractEventType(extractedFields, line);

      // Extract severity
      const severity = this.extractSemanticField(
        extractedFields,
        /(severity|severity_level|level|priority|urgency|impact)/i,
      );

      const parsedLog: ParsedLog = {
        timestamp,
        logLevel,
        message: (eventType ||
          extractedFields.message ||
          extractedFields.action ||
          line.substring(0, 500)) as string,
        raw: line,
        metadata: {
          parser: "keyValue",
          keyValuePairs: Object.keys(extractedFields).length,
        },
      };

      // Add optional fields
      if (sourceIp) {
        const validatedIp = this.validateIp(sourceIp);
        if (validatedIp) {
          parsedLog.sourceIp = validatedIp;
        }
      }
      if (user) {
        parsedLog.user = user;
      }
      if (severity) {
        parsedLog.severity = severity;
      }
      if (eventType) {
        (parsedLog as any).eventType = eventType;
      }

      // FIX: Removed `parsedLog.keyValueFields = extractedFields`.
      //
      // Previously, the entire raw extractedFields object was stored on the
      // parsed log. The normalizer's extractNestedFields() then picked it up
      // (it was not in the exclusion list) and wrote the whole thing into
      // parserMetadata.keyValueFields — meaning every KV field was persisted
      // twice: once via the semantic promotions above (sourceIp, user, etc.)
      // and once as a raw blob. This doubled storage for every KV log and
      // made normalizer output harder to read and query.
      //
      // The semantic fields already promoted above (sourceIp, user, eventType,
      // severity) are sufficient for all detectors. Any remaining fields the
      // normalizer needs are accessible through the individual promotions below.
      //
      // Promote remaining extractedFields individually so extractField()'s
      // dot-notation traversal and the jsonMapping aliases can reach them,
      // without dumping an opaque blob into parserMetadata.
      for (const [key, value] of Object.entries(extractedFields)) {
        // Skip fields already promoted to named ParsedLog properties above
        if (
          key === "timestamp" ||
          (sourceIp && /(^ip$|ip_address|source_ip|client_ip|remote_addr|remote_ip|ipv4|ipv6|addr)/i.test(key)) ||
          (user && /(^user$|username|user_id|uid|actor|account|principal)/i.test(key)) ||
          (severity && /(severity|severity_level|level|priority|urgency|impact)/i.test(key))
        ) {
          continue;
        }
        // Promote to top-level so extractField() can find them directly
        (parsedLog as any)[key] = value;
      }

      return parsedLog;
    } catch (error) {
      throw new Error(
        `Failed to parse key-value log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract log level from common field names
   */
  private inferLogLevel(fields: Record<string, string>): string | undefined {
    const levelKeys = ["level", "severity", "log_level", "priority", "urgency"];

    for (const key of levelKeys) {
      const value = fields[key]?.toUpperCase();
      if (value) {
        if (
          [
            "CRITICAL",
            "ERROR",
            "WARN",
            "WARNING",
            "INFO",
            "DEBUG",
            "TRACE",
            "FATAL",
            "SEVERE",
          ].includes(value)
        ) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract field using semantic pattern matching
   * Finds fields that match semantic concepts regardless of exact naming
   */
  private extractSemanticField(
    fields: Record<string, string>,
    semanticPattern: RegExp,
  ): string | undefined {
    for (const [key, value] of Object.entries(fields)) {
      if (semanticPattern.test(key)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract event type from fields
   * Looks for explicit event_type fields or infers from event name
   * Priority: Line patterns > explicit event fields (exclude generic 'action')
   */
  private extractEventType(
    fields: Record<string, string>,
    line: string,
  ): string | undefined {
    // 1. First, try to extract from line to get primary event type
    // This catches events like USER_LOGIN, FAILED_LOGIN, SUSPICIOUS_ACTIVITY, etc.
    const eventPatterns =
      /(USER_LOGIN|USER_LOGOUT|FAILED_LOGIN|BRUTE_FORCE_ATTEMPT|BRUTE_FORCE|SUSPICIOUS_ACTIVITY|PERMISSION_DENIED|AUTH|LOGIN|LOGOUT|ERROR|SUCCESS|ATTEMPT)/i;
    const eventMatch = line.match(eventPatterns);
    if (eventMatch) {
      return eventMatch[0];
    }

    // 2. Check explicit event type fields (but exclude generic 'action' field)
    const eventTypeFields = [
      "event_type",
      "event",
      "type",
      "operation",
      "event_name",
    ];

    for (const field of eventTypeFields) {
      if (fields[field]) {
        return fields[field];
      }
    }

    return undefined;
  }

  /**
   * Extract log level using heuristics
   */
  private extractLogLevel(line: string): string | undefined {
    const levelPattern =
      /\b(CRITICAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL|SEVERE)\b/i;
    const match = line.match(levelPattern);
    return match ? match[0].toUpperCase() : undefined;
  }
}

export const keyValueParser = new KeyValueParser();