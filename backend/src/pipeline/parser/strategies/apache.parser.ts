import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class ApacheParser extends BaseParser {
  protected parserName = "APACHE_PARSER";

  public parseLine(line: string): ParsedLog | null {
    if (!line || !line.trim()) return null;

    // 1. Handle Apache Error Logs
    // Format 1: [Wed Oct 11 14:32:52.223423 2026] [core:error] [pid 1234:tid 5678] [client 1.1.1.1:56231] AH00124: Request exceeded...
    // Format 2: [Sun Jun 01 02:18:14 2026] [error] [client 127.0.0.1] client denied...
    // Format 3: [Sun Jun 01 02:18:14.341103 2026] [mpm_prefork:info] [pid 28144] AH00163: Apache/2.4.41 (Ubuntu) configured
    const errorRegex = /^\[([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s+\d{4})\]\s+\[(?:([a-z0-9_-]+):)?([a-z]+)\]\s+(?:\[pid\s+(\d+)(?::tid\s+\d+)?\]\s+)?(.*)/i;
    const errorMatch = line.match(errorRegex);

    if (errorMatch) {
      const rawTimestamp = errorMatch[1]!;
      const moduleName = errorMatch[2];
      const rawLevel = errorMatch[3]!.toUpperCase();
      const pid = errorMatch[4];
      const messageAndClient = errorMatch[5]!;

      // Extract client IP if present
      const clientMatch = messageAndClient.match(/^\[client\s+([0-9a-fA-F:.]+)(?::\d+)?\]\s*(.*)/i);
      let sourceIp: string | undefined;
      let cleanMessage = messageAndClient;

      if (clientMatch) {
        sourceIp = clientMatch[1];
        cleanMessage = clientMatch[2]!;
      }

      const timestamp = this.parseApacheErrorTimestamp(rawTimestamp);

      // Classify the event type from message content (like syslog parser does)
      const eventType = this.classifyApacheErrorEvent(cleanMessage, rawLevel);

      const log: ParsedLog = {
        timestamp,
        logLevel: this.mapApacheLogLevel(rawLevel),
        message: cleanMessage.substring(0, 500),
        raw: line,
        metadata: {
          log_type: "error",
          event_type: eventType,
          module: moduleName || undefined,
          pid: pid ? parseInt(pid, 10) : undefined,
        },
      };

      if (sourceIp) {
        log.sourceIp = sourceIp;
      }

      return log;
    }

    // 2. Handle Apache Access Logs (Combined / Common Log Format / VHost Tagged)
    // Format 1 (Standard): 127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.0" 200 2326
    // Format 2 (VHost Prefixed): vhost.example.com:80 192.168.1.50 - - [02/Jun/2026:06:11:50 +0530] "GET /images/logo.png HTTP/1.1" 304 0
    const accessIpRegex = /^(?:[\w.-]+:\d+\s+)?([0-9a-fA-F:.]+)\s/;
    const ipMatch = line.match(accessIpRegex);
    const timeMatch = line.match(/\[([^\]]+)\]/);

    if (ipMatch && timeMatch) {
      const sourceIp = ipMatch[1];
      const timestamp = this.parseApacheAccessTimestamp(timeMatch[1]!);

      // Extract request info
      const reqMatch = line.match(/"([^\"]+)"/);
      let message = "Unknown Request";
      let method: string | undefined;
      let path: string | undefined;
      let protocol: string | undefined;

      const reqStr = reqMatch && reqMatch[1] ? reqMatch[1] : undefined;
      if (reqStr) {
        message = reqStr;
        const parts = message.split(" ");
        if (parts.length >= 3) {
          method = parts[0];
          path = parts[1];
          protocol = parts[2];
        }
      } else {
        message = line.substring(0, 200);
      }

      // Extract status code and bytes
      const statusMatch = line.match(/"\s+(\d{3})\s+(\d+|-)/);
      const statusCode = statusMatch && statusMatch[1] ? parseInt(statusMatch[1], 10) : undefined;
      const bytes = statusMatch && statusMatch[2] && statusMatch[2] !== "-" ? parseInt(statusMatch[2], 10) : undefined;

      const log: ParsedLog = {
        timestamp,
        logLevel: this.inferLevelFromStatusCode(statusCode),
        message: message.substring(0, 500),
        raw: line,
        metadata: {
          log_type: "access",
        },
      };

      if (sourceIp) log.sourceIp = sourceIp;
      if (statusCode) log.statusCode = statusCode;

      if (method) log.metadata.method = method;
      if (path) log.metadata.path = path;
      if (protocol) log.metadata.protocol = protocol;
      if (bytes !== undefined) log.metadata.bytes = bytes;

      // Extract referrer and user agent if combined format
      const allQuotes = Array.from(line.matchAll(/"([^"]*)"/g));
      if (allQuotes.length >= 3) {
        const ref = allQuotes[1]?.[1];
        const ua = allQuotes[2]?.[1];
        if (ref) log.metadata.referrer = ref;
        if (ua) log.metadata.userAgent = ua;
      }

      return log;
    }

    return null;
  }

  private mapApacheLogLevel(rawLevel: string): string {
    switch (rawLevel) {
      case "EMERG":
      case "ALERT":
      case "CRIT":
        return "CRITICAL";
      case "ERR":
      case "ERROR":
        return "ERROR";
      case "WARN":
      case "WARNING":
        return "WARN";
      case "NOTICE":
      case "INFO":
        return "INFO";
      case "DEBUG":
        return "DEBUG";
      default:
        return "INFO";
    }
  }

  /**
   * Classifies Apache error log messages into semantic event types.
   * This is the equivalent of what the syslog parser does at line 101-110
   * with its actionMatch pattern — without this, the normalizer receives
   * no event_type and every line becomes UNKNOWN_EVENT.
   */
  private classifyApacheErrorEvent(message: string, rawLevel: string): string {
    const lower = message.toLowerCase();

    // --- Access / Permission errors (highest priority — security relevant) ---
    if (lower.includes("directory index forbidden") || lower.includes("client denied"))
      return "ACCESS_DENIED";
    if (lower.includes("access denied") || lower.includes("permission denied"))
      return "PERMISSION_DENIED";
    if (lower.includes("file does not exist") || lower.includes("file not found"))
      return "FILE_NOT_FOUND";
    if (lower.includes("authentication") && lower.includes("failed"))
      return "AUTH_FAILURE";
    if (lower.includes("script not found") || lower.includes("not found"))
      return "FILE_NOT_FOUND";

    // --- Service lifecycle ---
    if (lower.includes("configured") && (lower.includes("resuming") || lower.includes("apache")))
      return "SERVICE_START";
    if (lower.includes("caught sig") || lower.includes("shutting down") || lower.includes("graceful stop"))
      return "SERVICE_STOP";
    if (lower.includes("restart"))
      return "SERVICE_RESTART";

    // --- Worker / process management ---
    if (lower.includes("workerenv.init()") && lower.includes("ok"))
      return "SERVICE_INIT";
    if (lower.includes("workerenv") && lower.includes("error state"))
      return "MODULE_ERROR";
    if (lower.includes("jk2_init()") || lower.includes("found child"))
      return "PROCESS_SPAWN";
    if (lower.includes("child process") && lower.includes("exit"))
      return "PROCESS_EXIT";

    // --- Module / config errors ---
    if (lower.includes("invalid command") || lower.includes("syntax error"))
      return "CONFIG_ERROR";
    if (lower.includes("timeout") || lower.includes("timed out"))
      return "TIMEOUT";
    if (lower.includes("connection refused") || lower.includes("connection reset"))
      return "CONNECTION_CLOSED";
    if (lower.includes("proxy") && lower.includes("error"))
      return "PROXY_ERROR";

    // --- Fallback based on severity level ---
    // Even if we can't classify the exact event, "APACHE_ERROR" is infinitely
    // more useful than "UNKNOWN_EVENT" for the analyzers and insights
    if (rawLevel === "ERROR" || rawLevel === "ERR" || rawLevel === "CRIT" || rawLevel === "EMERG" || rawLevel === "ALERT")
      return "APACHE_ERROR";

    // Notice/info level events that didn't match anything specific
    return "APACHE_NOTICE";
  }

  private parseApacheAccessTimestamp(timestampStr: string): Date {
    try {
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const parts = timestampStr.split(/[\/,:\s]/);
      if (parts.length >= 6 && parts[1] && months.hasOwnProperty(parts[1])) {
        const day = parseInt(parts[0]!, 10) || 1;
        const month = months[parts[1]]!;
        const year = parseInt(parts[2]!, 10) || new Date().getUTCFullYear();
        const hours = parseInt(parts[3]!, 10) || 0;
        const mins = parseInt(parts[4]!, 10) || 0;
        const secs = parseInt(parts[5]!, 10) || 0;
        return new Date(Date.UTC(year, month, day, hours, mins, secs));
      }
      return new Date();
    } catch {
      return new Date();
    }
  }

  private parseApacheErrorTimestamp(timestampStr: string): Date {
    try {
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      // Format: Wed Oct 11 14:32:52.223423 2026 or Sun Jun 01 02:18:14 2026
      const match = timestampStr.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?\s+(\d{4})/);
      if (match) {
        const monthName = match[1]!;
        if (months.hasOwnProperty(monthName)) {
          const month = months[monthName]!;
          const day = parseInt(match[2]!, 10);
          const hours = parseInt(match[3]!, 10);
          const mins = parseInt(match[4]!, 10);
          const secs = parseInt(match[5]!, 10);
          const msStr = match[6];
          const ms = msStr ? parseInt(msStr.substring(0, 3), 10) : 0;
          const year = parseInt(match[7]!, 10);
          return new Date(Date.UTC(year, month, day, hours, mins, secs, ms));
        }
      }
      return new Date();
    } catch {
      return new Date();
    }
  }
}

export const apacheParser = new ApacheParser();
