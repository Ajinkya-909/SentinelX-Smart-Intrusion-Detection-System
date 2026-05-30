import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class JsonParser extends BaseParser {
  // Generic field aliases
  private readonly genericMappings = {
    timestamp: ["timestamp", "time", "created_at", "date", "ts", "@timestamp", "datetime", "EventTime"],
    level: ["level", "severity", "priority", "log_level", "loglevel", "alert.severity"],
    message: ["message", "msg", "text", "event", "content", "description", "eventName"],
    sourceIp: ["ip", "source_ip", "src_ip", "client_ip", "remote_addr", "sourceIPAddress"],
    user: ["user", "username", "user_id", "uid", "actor", "userIdentity.userName", "userIdentity.arn"],
    statusCode: ["status", "status_code", "code", "http_status"]
  };

  // FIX 1: Changed from protected to public to match BaseParser signature
  public parseLine(line: string): ParsedLog | null {
    try {
      const json = JSON.parse(line);
      if (!json || typeof json !== 'object') return null;

      // 1. DOCKER ENVELOPE UNPACKER
      if (json.log && (json.stream === 'stdout' || json.stream === 'stderr')) {
        return {
          timestamp: new Date(json.time || new Date()),
          logLevel: this.inferDockerLevel(json.stream, json.log),
          message: String(json.log).trim(),
          raw: line,
          metadata: {
            wrapper: "docker",
            container_id: json.container_id,
            original_json: json
          }
        };
      }

      // 2. SURICATA EVE UNPACKER
      if (json.event_type && json.alert) {
        const suricataLog: ParsedLog = {
          timestamp: new Date(json.timestamp || new Date()),
          logLevel: json.alert.severity <= 2 ? "CRITICAL" : "HIGH",
          message: `[SURICATA] ${json.alert.signature}`,
          raw: line,
          metadata: {
            wrapper: "suricata",
            event_type: json.event_type,
            dest_ip: json.dest_ip,
            dest_port: json.dest_port,
            signature_id: json.alert.signature_id,
            category: json.alert.category,
            original_json: json
          }
        };
        
        // Fix for exactOptionalPropertyTypes
        if (json.src_ip) suricataLog.sourceIp = String(json.src_ip);
        return suricataLog;
      }

      // 3. AWS CLOUDTRAIL UNPACKER
      if (json.userIdentity && json.eventSource) {
        const cloudTrailLog: ParsedLog = {
          timestamp: new Date(json.eventTime || new Date()),
          logLevel: json.errorCode || json.errorMessage ? "ERROR" : "INFO",
          message: `[${json.eventSource}] ${json.eventName}`,
          raw: line,
          metadata: {
            wrapper: "cloudtrail",
            awsRegion: json.awsRegion,
            errorCode: json.errorCode,
            userAgent: json.userAgent,
            requestParameters: json.requestParameters,
            original_json: json
          }
        };

        // Fix for exactOptionalPropertyTypes
        if (json.sourceIPAddress) cloudTrailLog.sourceIp = String(json.sourceIPAddress);
        
        const userArn = json.userIdentity.arn || json.userIdentity.userName;
        if (userArn) cloudTrailLog.user = String(userArn);

        return cloudTrailLog;
      }

      // 4. GENERIC JSON EXTRACTION
      const timestampRaw = this.extractField(json, this.genericMappings.timestamp);
      const levelRaw = this.extractField(json, this.genericMappings.level);
      const messageRaw = this.extractField(json, this.genericMappings.message) || JSON.stringify(json).substring(0, 200);
      const sourceIpRaw = this.extractField(json, this.genericMappings.sourceIp);

      const genericLog: ParsedLog = {
        timestamp: timestampRaw ? new Date(timestampRaw) : new Date(),
        logLevel: levelRaw ? String(levelRaw).toUpperCase() : "INFO",
        message: String(messageRaw),
        raw: line,
        metadata: {
          wrapper: "generic_json",
          original_json: json
        }
      };

      // FIX 2: Only assign optional properties if they actually exist to satisfy exactOptionalPropertyTypes
      if (sourceIpRaw) {
        genericLog.sourceIp = String(sourceIpRaw);
      }

      return genericLog;

    } catch (e) {
      return null;
    }
  }

  private extractField(obj: any, paths: string[]): any {
    for (const path of paths) {
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (current === undefined || current === null) break;
        current = current[key];
      }
      if (current !== undefined && current !== null && current !== "") {
        return current;
      }
    }
    return undefined;
  }

  private inferDockerLevel(stream: string, logString: string): string {
    if (stream === 'stderr') return "ERROR";
    const lower = String(logString).toLowerCase();
    if (lower.includes("error") || lower.includes("fail") || lower.includes("fatal")) return "ERROR";
    if (lower.includes("warn")) return "WARN";
    return "INFO";
  }
}

export const jsonParser = new JsonParser();