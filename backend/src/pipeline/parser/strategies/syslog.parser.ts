import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";
import logger from "../../../config/logger";

/**
 * Syslog Parser
 * Parses standard syslog format (RFC 3164 / RFC 5424)
 *
 * Expected formats:
 * RFC 3164: Jan 15 10:30:00 server1 kernel: [12345.678900] Out of memory: Kill process
 * RFC 5424: 2024-01-15T10:30:00.000Z server1 kernel[12345]: process killed
 *
 * Fields extracted:
 * - timestamp
 * - hostname/source
 * - process/service name
 * - log level/priority
 * - message
 */
export class SyslogParser extends BaseParser {
  protected parserName = "SYSLOG_PARSER";

  /**
   * RFC 3164 format: Jan 15 10:30:00 hostname service[pid]: message
   */
  private readonly rfc3164Pattern =
    /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+([^\s]+)\s+([^\[:\s]+)(?:\[(\d+)\])?:\s+(.*)$/;

  /**
   * RFC 5424 format: 2024-01-15T10:30:00.000Z hostname service[pid]: message
   */
  private readonly rfc5424Pattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?\s+([^\s]+)\s+([^\[:\s]+)(?:\[(\d+)\])?:\s+(.*)$/;

  /**
   * Generic syslog pattern - more lenient
   */
  private readonly genericPattern =
    /^(.+?)\s+([^\[:\s]+)(?:\[(\d+)\])?:\s+(.*)$/;

  /**
   * Priority levels (syslog)
   */
  private readonly priorityLevels: Record<string, string> = {
    emerg: "CRITICAL",
    alert: "CRITICAL",
    crit: "CRITICAL",
    err: "ERROR",
    error: "ERROR",
    warn: "WARN",
    warning: "WARN",
    notice: "INFO",
    info: "INFO",
    debug: "DEBUG",
  };

  /**
   * Parse single syslog line
   * @param line - Raw syslog line
   * @returns - ParsedLog or null if cannot parse
   */
  parseLine(line: string): ParsedLog | null {
    try {
      // Try RFC 5424 first (ISO timestamp)
      let match = line.match(this.rfc5424Pattern);
      if (match) {
        return this.parseRfc5424(match, line);
      }

      // Try RFC 3164 (traditional)
      match = line.match(this.rfc3164Pattern);
      if (match) {
        return this.parseRfc3164(match, line);
      }

      // Fallback to generic pattern
      match = line.match(this.genericPattern);
      if (match) {
        return this.parseGenericSyslog(match, line);
      }

      return null; // Cannot parse this line
    } catch (error) {
      throw new Error(
        `Failed to parse Syslog line: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse RFC 5424 format
   */
  private parseRfc5424(
    match: RegExpMatchArray,
    rawLine: string,
  ): ParsedLog | null {
    const year = match[1] || "2024";
    const month = match[2] || "01";
    const day = match[3] || "01";
    const hours = match[4] || "00";
    const minutes = match[5] || "00";
    const seconds = match[6] || "00";
    const hostname = match[7] || "unknown";
    const service = match[8] || "unknown";
    const pid = match[9];
    const message = match[10] || "";

    const timestamp = new Date(
      Date.UTC(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10),
      ),
    );

    const logLevel = this.extractSyslogLevel(message);

    const parsedLog: ParsedLog = {
      timestamp,
      logLevel,
      message: message.substring(0, 200),
      raw: rawLine,
      metadata: {
        hostname,
        service,
      },
    };

    if (pid) parsedLog.metadata.pid = parseInt(pid, 10);

    return parsedLog;
  }

  /**
   * Parse RFC 3164 format
   */
  private parseRfc3164(
    match: RegExpMatchArray,
    rawLine: string,
  ): ParsedLog | null {
    const month = match[1] || "Jan";
    const day = match[2] || "01";
    const hours = match[3] || "00";
    const minutes = match[4] || "00";
    const seconds = match[5] || "00";
    const hostname = match[6] || "unknown";
    const service = match[7] || "unknown";
    const pid = match[8];
    const message = match[9] || "";

    // RFC 3164 doesn't include year - use current year or guess from log
    const now = new Date();
    const monthNum = this.parseMonth(month);
    let year = now.getFullYear();

    // If the log month is in the future, assume it's from last year
    if (monthNum > now.getMonth()) {
      year--;
    }

    const timestamp = new Date(
      Date.UTC(
        year,
        monthNum,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10),
      ),
    );

    const logLevel = this.extractSyslogLevel(message);

    const parsedLog: ParsedLog = {
      timestamp,
      logLevel,
      message: message.substring(0, 200),
      raw: rawLine,
      metadata: {
        hostname,
        service,
      },
    };

    if (pid) parsedLog.metadata.pid = parseInt(pid, 10);

    return parsedLog;
  }

  /**
   * Parse generic syslog (fallback)
   */
  private parseGenericSyslog(
    match: RegExpMatchArray,
    rawLine: string,
  ): ParsedLog | null {
    const timeStr = match[1] || "";
    const service = match[2] || "unknown";
    const pid = match[3];
    const message = match[4] || "";

    // Try to parse timestamp from the leading text
    const timestamp = this.parseTimestamp(timeStr);
    const logLevel = this.extractSyslogLevel(message);

    const parsedLog: ParsedLog = {
      timestamp,
      logLevel,
      message: message.substring(0, 200),
      raw: rawLine,
      metadata: {
        service,
      },
    };

    if (pid) parsedLog.metadata.pid = parseInt(pid, 10);

    return parsedLog;
  }

  /**
   * Extract syslog severity level from message
   * Looks for keywords like "ERROR", "WARN", "DEBUG", etc.
   */
  private extractSyslogLevel(message: string): string {
    const lowerMsg = message.toLowerCase();

    for (const [keyword, level] of Object.entries(this.priorityLevels)) {
      if (lowerMsg.includes(keyword)) {
        return level;
      }
    }

    // Check for common keywords
    if (
      lowerMsg.includes("failed") ||
      lowerMsg.includes("error") ||
      lowerMsg.includes("fatal")
    ) {
      return "ERROR";
    }
    if (lowerMsg.includes("warning") || lowerMsg.includes("warn")) {
      return "WARN";
    }

    return "INFO";
  }

  /**
   * Parse month name to number
   */
  private parseMonth(monthStr: string): number {
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
    return months[monthStr] ?? 0;
  }
}

export const syslogParser = new SyslogParser();
