import { BaseParser } from "./base.parser";
import { ParsedLog } from "../types";

export class JsonParser extends BaseParser {
  // Generic field aliases
  private readonly genericMappings = {
    timestamp: [
      "timestamp",
      "time",
      "created_at",
      "date",
      "ts",
      "@timestamp",
      "datetime",
      "EventTime",
      "__REALTIME_TIMESTAMP",
      "_SOURCE_REALTIME_TIMESTAMP",
      "Time",
    ],
    level: [
      "level",
      "severity",
      "priority",
      "log_level",
      "loglevel",
      "alert.severity",
      "PRIORITY",
    ],
    message: [
      "message",
      "msg",
      "text",
      "event",
      "content",
      "description",
      "eventName",
      "MESSAGE",
      "Message",
    ],
    sourceIp: [
      "ip",
      "source_ip",
      "src_ip",
      "client_ip",
      "remote_addr",
      "sourceIPAddress",
      "_IP_ADDRESS",
      "Src IP",
      "Src_IP",
    ],
    user: [
      "user",
      "username",
      "user_id",
      "uid",
      "actor",
      "userIdentity.userName",
      "userIdentity.arn",
      "_SYSTEMD_USER",
      "Username",
    ],
    statusCode: ["status", "status_code", "code", "http_status"],
  };

  // FIX 1: Changed from protected to public to match BaseParser signature
  public parseLine(line: string): ParsedLog | null {
    try {
      const json = JSON.parse(line);
      if (!json || typeof json !== "object") return null;

      // 1. DOCKER ENVELOPE UNPACKER
      if (json.log && (json.stream === "stdout" || json.stream === "stderr")) {
        return {
          timestamp: new Date(json.time || new Date()),
          logLevel: this.inferDockerLevel(json.stream, json.log),
          message: String(json.log).trim(),
          raw: line,
          metadata: {
            wrapper: "docker",
            container_id: json.container_id,
            original_json: json,
          },
        };
      }

      // 2. SURICATA EVE UNPACKER
      if (
        json.event_type &&
        (json.alert ||
          json.flow_id !== undefined ||
          ["alert", "http", "dns", "tls", "fileinfo", "flow", "stats", "ssh", "smb", "dcerpc"].includes(json.event_type))
      ) {
        const isAlert = !!json.alert;
        const severity = isAlert
          ? (json.alert.severity <= 2 ? "CRITICAL" : "HIGH")
          : "INFO";

        let message = `[SURICATA] ${json.event_type.toUpperCase()}`;
        if (isAlert) {
          message = `[SURICATA] ${json.alert.signature}`;
        } else if (json.event_type === "http" && json.http) {
          message = `[SURICATA HTTP] ${json.http.http_method || "GET"} ${json.http.url || "/"}`;
        } else if (json.event_type === "dns" && json.dns) {
          message = `[SURICATA DNS] ${json.dns.type || "query"} ${json.dns.rrname || ""}`;
        } else if (json.event_type === "tls" && json.tls) {
          message = `[SURICATA TLS] ${json.tls.subject || "Session"}`;
        } else if (json.flow_id) {
          message = `[SURICATA ${json.event_type.toUpperCase()}] Flow ID: ${json.flow_id}`;
        }

        const suricataLog: ParsedLog = {
          timestamp: new Date(json.timestamp || new Date()),
          logLevel: severity,
          message,
          raw: line,
          metadata: {
            wrapper: "suricata",
            event_type: json.event_type,
            dest_ip: json.dest_ip,
            dest_port: json.dest_port,
            original_json: json,
          },
        };

        if (isAlert) {
          suricataLog.metadata.signature_id = json.alert.signature_id;
          suricataLog.metadata.category = json.alert.category;
        }

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
            original_json: json,
          },
        };

        // Fix for exactOptionalPropertyTypes
        if (json.sourceIPAddress)
          cloudTrailLog.sourceIp = String(json.sourceIPAddress);

        const userArn = json.userIdentity.arn || json.userIdentity.userName;
        if (userArn) cloudTrailLog.user = String(userArn);

        return cloudTrailLog;
      }

      // 4. WINDOWS EVENT JSON UNPACKER (Enhanced for Phase 2)
      // Supports both nested winlogbeat/sysmon format and flat JSON exports
      // Nested: {"Event": {"System": {"EventID": {...}, "TimeCreated": {...}, "Provider": {...}}}}
      // Flat: {"EventID": 4688, "Channel": "Security", "TargetUserName": "..."}
      if (json.Event || (json.System && json.System.EventID) || json.EventID) {
        // Extract Windows event level and map to standard log levels
        const winLevel = json.System?.Level ?? json.Level;
        let logLevel = "INFO";
        if (winLevel === 1 || winLevel === "1") logLevel = "CRITICAL";
        else if (winLevel === 2 || winLevel === "2") logLevel = "ERROR";
        else if (winLevel === 3 || winLevel === "3") logLevel = "WARN";
        else if (winLevel === 4 || winLevel === "4") logLevel = "INFO";

        // Extract event message - try multiple sources
        const winMsg =
          json.EventData?.Message ||
          json.Description ||
          json.Message ||
          json.System?.Provider?.Name ||
          "Windows Event Log";

        const winLog: ParsedLog = {
          timestamp:
            json.System?.TimeCreated?.SystemTime || json.TimeCreated
              ? new Date(
                  json.System?.TimeCreated?.SystemTime || json.TimeCreated,
                )
              : new Date(),
          logLevel,
          message: String(winMsg).substring(0, 500),
          raw: line,
          metadata: {
            wrapper: "windows_event",
            event_id: json.System?.EventID || json.EventID,
            event_type: this.mapWindowsEventIdToType(json.System?.EventID || json.EventID),
            channel: json.System?.Channel || json.Channel,
            provider: json.System?.Provider?.Name || json.Provider,
            // PHASE 2: Promote nested Windows fields to root for easier access by normalizer
            computer: json.System?.Computer || json.Computer,
            level: winLevel,
            original_json: json,
          },
        };

        // Extract IP address from multiple possible locations
        const winIp =
          json.EventData?.IpAddress ||
          json.IpAddress ||
          json.source_ip ||
          json.System?.Computer;
        if (winIp && this.isValidIp(String(winIp))) {
          winLog.sourceIp = String(winIp);
        }

        // Extract username from multiple possible locations
        const winUser =
          json.EventData?.TargetUserName ||
          json.EventData?.SubjectUserName ||
          json.TargetUserName ||
          json.SubjectUserName ||
          json.User;
        if (winUser) {
          winLog.user = String(winUser);
        }

        // PHASE 2: Capture important Windows-specific metadata
        if (json.EventData?.CommandLine) {
          winLog.metadata.command_line = String(
            json.EventData.CommandLine,
          ).substring(0, 500);
        }
        if (json.EventData?.ParentImage) {
          winLog.metadata.parent_image = String(json.EventData.ParentImage);
        }
        if (json.EventData?.ProcessId || json.ProcessId) {
          winLog.metadata.process_id =
            json.EventData?.ProcessId || json.ProcessId;
        }

        return winLog;
      }

      // 5. GENERIC JSON EXTRACTION
      const timestampRaw = this.extractField(
        json,
        this.genericMappings.timestamp,
      );
      const levelRaw = this.extractField(json, this.genericMappings.level);
      const messageRaw =
        this.extractField(json, this.genericMappings.message) ||
        JSON.stringify(json).substring(0, 200);
      const sourceIpRaw = this.extractField(
        json,
        this.genericMappings.sourceIp,
      );
      const userRaw = this.extractField(json, this.genericMappings.user);
      const statusCodeRaw = this.extractField(
        json,
        this.genericMappings.statusCode,
      );

      let parsedDate = new Date();
      if (timestampRaw) {
        const d = new Date(timestampRaw);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      const genericLog: ParsedLog = {
        timestamp: parsedDate,
        logLevel: levelRaw ? String(levelRaw).toUpperCase() : "INFO",
        message: String(messageRaw),
        raw: line,
        metadata: {
          wrapper: "generic_json",
          original_json: json,
        },
      };

      if (sourceIpRaw) {
        genericLog.sourceIp = String(sourceIpRaw);
      }
      if (userRaw) {
        genericLog.user = String(userRaw);
      }
      if (statusCodeRaw !== undefined && statusCodeRaw !== null && statusCodeRaw !== "") {
        const parsedCode = parseInt(String(statusCodeRaw), 10);
        if (!isNaN(parsedCode)) {
          genericLog.statusCode = parsedCode;
        }
      }

      // Promote all properties of json to the top-level of genericLog
      // so extractField()'s dot-notation traversal and normalizer mappings can find them.
      for (const [key, value] of Object.entries(json)) {
        if (
          key === "timestamp" ||
          key === "logLevel" ||
          key === "message" ||
          key === "sourceIp" ||
          key === "user" ||
          key === "statusCode" ||
          key === "raw" ||
          key === "metadata"
        ) {
          continue;
        }
        genericLog[key] = value;
      }

      return genericLog;
    } catch (e) {
      return null;
    }
  }

  private extractField(obj: any, paths: string[]): any {
    for (const path of paths) {
      const keys = path.split(".");
      let current = obj;
      for (const key of keys) {
        if (current === undefined || current === null || typeof current !== "object") {
          current = undefined;
          break;
        }
        const foundKey = Object.keys(current).find(k => k.toLowerCase() === key.toLowerCase());
        current = foundKey ? current[foundKey] : undefined;
      }
      if (current !== undefined && current !== null && current !== "") {
        return current;
      }
    }
    return undefined;
  }

  private inferDockerLevel(stream: string, logString: string): string {
    if (stream === "stderr") return "ERROR";
    const lower = String(logString).toLowerCase();
    if (
      lower.includes("error") ||
      lower.includes("fail") ||
      lower.includes("fatal")
    )
      return "ERROR";
    if (lower.includes("warn")) return "WARN";
    return "INFO";
  }

  private mapWindowsEventIdToType(eventId: string | number): string {
    const id = String(eventId);
    switch (id) {
      case "4624": return "LOGIN_SUCCESS";
      case "4625": return "LOGIN_FAILED";
      case "4634":
      case "4647": return "SESSION_END";
      case "4648": return "LOGIN_ATTEMPT";
      case "4720": return "ACCOUNT_CREATED";
      case "4722": return "ACCOUNT_ENABLED";
      case "4723":
      case "4724": return "PASSWORD_CHANGED";
      case "4728":
      case "4732":
      case "4756": return "GROUP_MEMBER_ADDED";
      case "4740": return "ACCOUNT_LOCKED_OUT";
      case "4688": return "PROCESS_CREATED";
      case "7045": return "SERVICE_INSTALLED";
      case "1102": return "AUDIT_LOG_CLEARED";
      default: return "WINDOWS_EVENT_" + id;
    }
  }

  /**
   * Validate if a string is a valid IPv4 or IPv6 address
   */
  private isValidIp(ip: string): boolean {
    if (!ip) return false;
    // IPv4: xxx.xxx.xxx.xxx
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) return true;
    // IPv6: basic check for colons and hex digits
    const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
    if (ipv6Regex.test(ip)) return true;
    return false;
  }
}

export const jsonParser = new JsonParser();
