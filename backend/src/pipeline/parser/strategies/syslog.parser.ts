import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class SyslogParser extends BaseParser {
  public parseLine(line: string): ParsedLog | null {
    if (!line || !line.trim()) return null;

    const log: ParsedLog = {
      timestamp: new Date(),
      logLevel: "INFO",
      message: "",
      raw: line,
      metadata: {}
    };

    let messageStartIdx = 0;

    // 1. Extract Timestamp (Checks for both Modern RFC5424 and Traditional RFC3164)
    const rfc5424Match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/);
    const rfc3164Match = line.match(/^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);

    if (rfc5424Match && rfc5424Match[1]) {
      log.timestamp = new Date(rfc5424Match[1]);
      messageStartIdx = rfc5424Match[0].length;
    } else if (rfc3164Match && rfc3164Match[1]) {
      log.timestamp = this.parseSyslogTimestamp(rfc3164Match[1]);
      messageStartIdx = rfc3164Match[0].length;
    }

    const remainingAfterTime = line.substring(messageStartIdx).trim();

    // 2. Extract Hostname, Service, PID (e.g., "ubuntu sshd[1234]: " OR just "sshd[1234]: ")
    const headerMatch = remainingAfterTime.match(/^([a-zA-Z0-9_.-]+)?\s*([a-zA-Z0-9_.-]+)(?:\[(\d+)\])?:\s*(.*)/);
    
    if (headerMatch) {
      if (headerMatch[1]) log.metadata.hostname = headerMatch[1];
      if (headerMatch[2]) log.metadata.service = headerMatch[2];
      if (headerMatch[3]) log.metadata.pid = parseInt(headerMatch[3], 10);
        
      if (headerMatch[4]) log.message = headerMatch[4].trim(); // The actual log content
    } else {
        // Fallback: If it lacks the clean colon-separated daemon, just grab everything
        log.message = remainingAfterTime;
    }

    // 3. Infer Log Level and attempt to scrape IP addresses dynamically
    log.logLevel = this.inferSyslogLevel(log.message);
    
    // Attempt to scrape an IP from the message body (useful for auth logs)
    const ipMatch = log.message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipMatch) {
      log.sourceIp = ipMatch[0];
    }

    return log;
  }

    private parseSyslogTimestamp(ts?: string): Date {
      // RFC3164 omits the year, so we must safely infer it
      if (!ts) return new Date();
      const currentYear = new Date().getFullYear();
      const date = new Date(`${ts} ${currentYear} UTC`);
     
      // Handle year wrap-around logic (e.g., processing December logs in January)
      if (date > new Date()) {
        date.setFullYear(currentYear - 1);
      }
      return date;
    }

  private inferSyslogLevel(message: string): string {
     const lower = message.toLowerCase();
     if (lower.includes("error") || lower.includes("fail") || lower.includes("fatal") || lower.includes("out of memory") || lower.includes("invalid user")) return "ERROR";
     if (lower.includes("warn")) return "WARN";
     if (lower.includes("debug") || lower.includes("trace")) return "DEBUG";
     return "INFO";
  }
}

export const syslogParser = new SyslogParser();