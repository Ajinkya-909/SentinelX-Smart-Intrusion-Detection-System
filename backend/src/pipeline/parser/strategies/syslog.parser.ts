import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class SyslogParser extends BaseParser {
  public parseLine(line: string): ParsedLog | null {
    if (!line || !line.trim()) return null;

    let messageStartIdx = 0;

    // STRICT TIMESTAMP VALIDATION (Phase 2 Enhancement)
    // Syslog MUST start with either RFC5424 (modern) or RFC3164 (traditional) timestamp
    // If neither format matches at the start, return null immediately

    // RFC5424 Modern format: 2026-01-15T10:30:45Z or 2026-01-15T10:30:45.123+02:00
    const rfc5424Match = line.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/,
    );

    // RFC3164 Traditional format: Jan 15 10:30:45
    const rfc3164Match = line.match(
      /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
    );

    if (!rfc5424Match && !rfc3164Match) {
      // STRICT: No valid syslog timestamp at start = not a syslog entry
      return null;
    }

    const log: ParsedLog = {
      timestamp: new Date(),
      logLevel: "INFO",
      message: "",
      raw: line,
      metadata: {},
    };

    // Parse the timestamp that matched
    if (rfc5424Match && rfc5424Match[1]) {
      log.timestamp = new Date(rfc5424Match[1]);
      messageStartIdx = rfc5424Match[0].length;
    } else if (rfc3164Match && rfc3164Match[1]) {
      log.timestamp = this.parseSyslogTimestamp(rfc3164Match[1]);
      messageStartIdx = rfc3164Match[0].length;
    }

    const remainingAfterTime = line.substring(messageStartIdx).trim();

    // 2. Extract Hostname, Service, PID
    const headerMatch = remainingAfterTime.match(
      /^([a-zA-Z0-9_.-]+)?\s*([a-zA-Z0-9_.()/-]+)(?:\[(\d+)\])?:\s*(.*)/,
    );

    if (headerMatch) {
      if (headerMatch[1]) log.metadata.hostname = headerMatch[1];
      if (headerMatch[2]) log.metadata.service = headerMatch[2];
      if (headerMatch[3]) log.metadata.pid = parseInt(headerMatch[3], 10);

      if (headerMatch[4]) log.message = headerMatch[4].trim(); // The actual log content
    } else {
      // Fallback: If it lacks the clean colon-separated daemon, just grab everything
      log.message = remainingAfterTime;
    }

    // 3. Infer Log Level
    log.logLevel = this.inferSyslogLevel(log.message);

    // 4. Scrape IP Address dynamically (Enterprise: IPv4 and IPv6)
    const ipv4Match = log.message.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
    if (ipv4Match) {
      log.sourceIp = ipv4Match[0];
    } else {
      // Basic IPv6 matching (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334)
      const ipv6Match = log.message.match(
        /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/,
      );
      if (ipv6Match) log.sourceIp = ipv6Match[0];
    }

    // 5. Scrape Username dynamically (Expanded for VPNs, DBs, and generic auth)
    const userMatch = log.message.match(
      /\b(?:user=|for (?:invalid user )?|user\s+|account\s+)([a-zA-Z0-9_.-]+)\b/i,
    );
    if (userMatch && userMatch[1]) {
      log.user = userMatch[1];
    }

    // 6. Scrape Network Port (Crucial for firewall and IDS syslogs)
    const portMatch = log.message.match(/\bport\s+(\d{1,5})\b/i);
    if (portMatch && portMatch[1]) {
      log.metadata.port = parseInt(portMatch[1], 10);
    }

    // 7. Scrape MAC Address (Crucial for DHCP and Wireless controller syslogs)
    const macMatch = log.message.match(
      /\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/,
    );
    if (macMatch) {
      log.metadata.macAddress = macMatch[0];
    }

    // 8. Pre-Classify Explicit Events (Gives Normalizer a massive head start)
    const actionMatch = log.message.match(
      /\b(authentication failure|accepted password|accepted publickey|session opened|session closed|disconnected|connection closed|failed password|invalid user|timeout|started|stopped|restart)\b/i,
    );
    if (actionMatch && actionMatch[1]) {
      // Converts "authentication failure" to "AUTHENTICATION_FAILURE" automatically
      log.metadata.event_type = actionMatch[1]
        .toUpperCase()
        .replace(/\s+/g, "_");
    }

    return log;
  }

  private parseSyslogTimestamp(ts?: string): Date {
    if (!ts) return new Date();
    const currentYear = new Date().getFullYear();
    const date = new Date(`${ts} ${currentYear} UTC`);

    if (date > new Date()) {
      date.setFullYear(currentYear - 1);
    }
    return date;
  }

  private inferSyslogLevel(message: string): string {
    const lower = message.toLowerCase();
    if (
      lower.includes("error") ||
      lower.includes("fail") ||
      lower.includes("fatal") ||
      lower.includes("out of memory") ||
      lower.includes("invalid user") ||
      lower.includes("denied")
    )
      return "ERROR";
    if (lower.includes("warn")) return "WARN";
    if (lower.includes("debug") || lower.includes("trace")) return "DEBUG";
    return "INFO";
  }
}

export const syslogParser = new SyslogParser();
