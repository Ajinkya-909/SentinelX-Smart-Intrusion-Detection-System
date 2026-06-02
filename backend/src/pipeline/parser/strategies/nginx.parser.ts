import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class NginxParser extends BaseParser {
  public parseLine(line: string): ParsedLog | null {
    if (!line || !line.trim()) return null;

    // --- NGINX Error Logs ---
    // Format: 2026/05/15 10:30:45 [error] 12345#0: *6789 message, client: 1.1.1.1, server: localhost...
    // STRICT: Must have timestamp, level, and pid#tid format
    const errorMatch = line.match(
      /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[([a-z]+)\]\s+(\d+#\d+):\s+(.*)/i,
    );

    if (errorMatch) {
      const tsStr: string = errorMatch[1] ?? "";
      const levelRaw: string = (errorMatch[2] ?? "").toUpperCase();
      const msgStr: string = (errorMatch[4] ?? "").substring(0, 500);
      const pidTid: string = errorMatch[3] ?? "";

      const log: ParsedLog = {
        timestamp: new Date(tsStr),
        logLevel: levelRaw === "CRIT" ? "CRITICAL" : levelRaw,
        message: msgStr,
        raw: line,
        metadata: {
          pid_tid: pidTid,
          log_type: "error",
        },
      };

      // Extract explicit client IP from error message
      const clientMatch = (errorMatch[4] ?? "").match(
        /client:\s+([0-9a-fA-F:.]+)/i,
      );
      if (clientMatch && clientMatch[1]) log.sourceIp = clientMatch[1];

      return log;
    }

    // --- NGINX Access Logs ---
    // STRICT: Must start with IP address and have bracketed [timestamp] format
    // Combined format: IP - user [date] "METHOD path HTTP/1.x" status bytes "referrer" "userAgent"
    let remainingLine = line;

    const ipMatch = remainingLine.match(/^([0-9a-fA-F:.]+)\s/);
    const sourceIp: string | undefined = ipMatch ? ipMatch[1] : undefined;

    const timeMatch = remainingLine.match(/\[([^\]]+)\]/);

    // STRICT VALIDATION: Access logs MUST have IP at start AND bracketed timestamp
    // If either is missing, this is not a valid Nginx log - return null instead of guessing
    if (!sourceIp || !timeMatch) {
      return null;
    }
    const timestamp =
      timeMatch && timeMatch[1]
        ? this.parseNginxTimestamp(timeMatch[1])
        : new Date();

    const reqMatch = remainingLine.match(/"([^\"]+)"/);
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

    const statusMatch = remainingLine.match(/"\s+(\d{3})\s+(\d+|-)/);
    const statusCode =
      statusMatch && statusMatch[1] ? parseInt(statusMatch[1], 10) : undefined;
    const bytes =
      statusMatch && statusMatch[2] && statusMatch[2] !== "-"
        ? parseInt(statusMatch[2], 10)
        : undefined;

    const log: ParsedLog = {
      timestamp,
      logLevel: this.inferLevelFromStatusCode(statusCode),
      message: message.substring(0, 500),
      raw: line,
      metadata: { log_type: "access" },
    };

    if (sourceIp) log.sourceIp = sourceIp;
    if (statusCode) log.statusCode = statusCode;

    if (method) log.metadata.method = method;
    if (path) log.metadata.path = path;
    if (protocol) log.metadata.protocol = protocol;
    if (bytes !== undefined) log.metadata.bytes = bytes;

    const allQuotes = Array.from(remainingLine.matchAll(/"([^"]*)"/g));
    if (allQuotes.length >= 3) {
      const ref = allQuotes[1]?.[1];
      const ua = allQuotes[2]?.[1];
      if (ref) log.metadata.referrer = ref;
      if (ua) log.metadata.userAgent = ua;
    }

    return log;
  }

  private parseNginxTimestamp(timestampStr?: string): Date {
    try {
      if (!timestampStr) return new Date();
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
      const parts = timestampStr.split(/[\/,:\s]/);
      if (
        parts.length >= 6 &&
        parts[0] &&
        parts[1] &&
        months.hasOwnProperty(parts[1])
      ) {
        const day = parseInt(parts[0], 10) || 1;
        const month = months[parts[1]];
        const year =
          parseInt(parts[2] ?? String(new Date().getUTCFullYear()), 10) ||
          new Date().getUTCFullYear();
        const hours = parseInt(parts[3] ?? "0", 10) || 0;
        const mins = parseInt(parts[4] ?? "0", 10) || 0;
        const secs = parseInt(parts[5] ?? "0", 10) || 0;
        return new Date(Date.UTC(year, month, day, hours, mins, secs));
      }
      return new Date();
    } catch {
      return new Date();
    }
  }

  protected inferLevelFromStatusCode(statusCode?: number): string {
    if (!statusCode) return "INFO";
    if (statusCode >= 500) return "ERROR";
    if (statusCode >= 400) return "WARN";
    return "INFO";
  }
}

export const nginxParser = new NginxParser();
