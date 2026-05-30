import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class NginxParser extends BaseParser {
  public parseLine(line: string): ParsedLog | null {
    if (!line || !line.trim()) return null;

    let remainingLine = line;
    
    // 1. Extract IP Address (First thing in the line)
    const ipMatch = remainingLine.match(/^([a-fA-F0-9.:]+)\s/);
    const sourceIp = ipMatch ? ipMatch[1] : undefined;

    // 2. Extract Timestamp [15/May/2026:10:30:00 +0000]
    const timeMatch = remainingLine.match(/\[([^\]]+)\]/);
    const timestamp = timeMatch && timeMatch[1] ? this.parseNginxTimestamp(timeMatch[1]) : new Date();

    // 3. Extract Request Block "GET /api HTTP/1.1"
    const reqMatch = remainingLine.match(/"([^"]+)"/);
    let message = "Unknown Request";
    let method, path, protocol;
    
     if (reqMatch && reqMatch[1]) {
       message = reqMatch[1];
       const parts = message.split(' ');
       if (parts.length >= 3) {
        method = parts[0];
        path = parts[1];
        protocol = parts[2];
       }
     } else {
       // Fallback if quotes are missing
       message = line.substring(0, 200);
     }

    // 4. Extract Status Code & Bytes (Look for a 3-digit number surrounded by spaces after the request)
    const statusMatch = remainingLine.match(/"\s+(\d{3})\s+(\d+|-)/);
    const statusCode = statusMatch && statusMatch[1] ? parseInt(statusMatch[1], 10) : undefined;
    const bytes = statusMatch && statusMatch[2] && statusMatch[2] !== '-' ? parseInt(statusMatch[2], 10) : undefined;

    // 5. Build the robust Log Object
    const log: ParsedLog = {
      timestamp,
      logLevel: this.inferLevelFromStatusCode(statusCode),
      message: message.substring(0, 500),
      raw: line,
      metadata: {}
    };

    // Safely assign optionals for strict TypeScript
    if (sourceIp) log.sourceIp = sourceIp;
    if (statusCode) log.statusCode = statusCode;
    
    if (method) log.metadata.method = method;
    if (path) log.metadata.path = path;
    if (protocol) log.metadata.protocol = protocol;
    if (bytes !== undefined) log.metadata.bytes = bytes;

    // 6. User Agent & Referrer (Optional trailing data)
    const allQuotes = [...remainingLine.matchAll(/"([^\"]*)"/g)];
    if (allQuotes.length >= 3) {
      const ref = allQuotes[1] && allQuotes[1][1] ? allQuotes[1][1] : undefined;
      const ua = allQuotes[2] && allQuotes[2][1] ? allQuotes[2][1] : undefined;
      if (ref) log.metadata.referrer = ref;
      if (ua) log.metadata.userAgent = ua;
    }

    return log;
  }
  
  private parseNginxTimestamp(timestampStr?: string): Date {
    try {
      if (!timestampStr) return new Date();
      const months: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      const parts = timestampStr.split(/[\/,:\s]/);
      if (parts.length >= 6 && parts[0] && parts[1] && months.hasOwnProperty(parts[1])) {
         const day = parseInt(parts[0], 10) || 1;
         const month = months[parts[1]];
         const year = parseInt(parts[2] ?? String(new Date().getUTCFullYear()), 10) || new Date().getUTCFullYear();
         const hours = parseInt(parts[3] ?? '0', 10) || 0;
         const mins = parseInt(parts[4] ?? '0', 10) || 0;
         const secs = parseInt(parts[5] ?? '0', 10) || 0;
         return new Date(Date.UTC(year, month, day, hours, mins, secs));
      }
      return new Date();
    } catch {
      return new Date(); // Safe fallback instead of crashing
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