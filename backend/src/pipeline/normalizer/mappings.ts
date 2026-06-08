/**
 * Field Mappings for Normalization
 * Maps parser-specific fields to canonical normalized log fields
 * Supports multiple aliases for same semantic field (e.g., source_ip, remote_addr, client_ip)
 */

export interface FieldMapping {
  timestamp?: string | string[];
  eventType?: string | string[];
  sourceIp?: string | string[];
  logLevel?: string | string[];
  statusCode?: string | string[];
  user?: string | string[];
  message?: string | string[];
  sessionId?: string | string[];
  method?: string | string[];
  url?: string | string[];
  endpoint?: string | string[];
  userAgent?: string | string[];
  [key: string]: string | string[] | undefined; // Allow custom fields
}

export interface ParserTypeMapping {
  [parserType: string]: FieldMapping;
}

// 1. Web Logs (NGINX & Apache)
// FIX: Added "metadata.method", "metadata.path", "metadata.userAgent" aliases.
//
// The nginx parser stores method, path, and userAgent inside log.metadata
// (e.g. log.metadata.method = "GET"). The normalizer's extractField() already
// supports dot-notation traversal, but the old webMapping only listed top-level
// keys like "method" and "request". Without these aliases, extractField never
// found the values, so normalizedLog.metadata.action.method was always undefined
// for every nginx access log — silently breaking pathTraversal, sqlInjection,
// xss, and every other detector that reads metadata.action.endpoint or
// metadata.action.method.
export const webMapping: FieldMapping = {
  timestamp: ["timestamp", "time_local", "$time_local"],
  sourceIp: ["remote_addr", "client_ip", "source_ip", "sourceIp"],
  user: ["remote_user", "username"],
  statusCode: ["status", "http_status", "response_code", "statusCode"],
  method: ["method", "request_method", "http_method", "metadata.method"],
  url: ["request", "uri", "request_uri", "path", "metadata.path"],
  endpoint: ["request", "uri", "request_uri", "path", "metadata.path"],
  logLevel: ["log_level", "level", "logLevel"],
  userAgent: ["http_user_agent", "user_agent", "agent", "metadata.userAgent"],
  message: ["request", "log_message", "message"],
};

// 2. System & Auth Logs
export const syslogMapping: FieldMapping = {
  timestamp: ["timestamp", "date", "time"],
  sourceIp: ["source_ip", "remote_addr", "client_ip", "sourceIp"],
  user: ["user", "username", "uid"],
  logLevel: ["severity", "level", "priority", "logLevel"],
  eventType: ["process", "facility", "program", "service"],
  message: ["message", "msg", "text"],
  statusCode: ["exit_code", "code", "result"],
  sessionId: ["session", "session_id", "pid"],
};

// 3. AWS CloudTrail Mapping
export const cloudTrailMapping: FieldMapping = {
  timestamp: ["eventTime", "timestamp"],
  sourceIp: ["sourceIPAddress", "sourceIp"],
  user: ["user", "userIdentity.arn", "userIdentity.userName"],
  eventType: ["eventName", "eventType"],
  logLevel: ["logLevel", "errorCode", "errorMessage"], // presence of error indicates HIGH severity
  message: ["message", "eventName"],
  userAgent: ["userAgent"],
};

// 4. Suricata IDS Mapping
export const suricataMapping: FieldMapping = {
  timestamp: ["timestamp"],
  sourceIp: ["src_ip", "sourceIp"],
  eventType: ["event_type"],
  logLevel: ["logLevel", "alert.severity"],
  message: ["message", "alert.signature"],
};

// 5. Firewall Mapping
export const firewallMapping: FieldMapping = {
  timestamp: ["timestamp", "time", "date", "Time"],
  sourceIp: ["SRC", "src", "source_ip", "src_ip", "sourceIp", "Src IP", "Src_IP"],
  user: ["USER", "user", "Username", "user_name"],
  logLevel: ["level", "severity", "logLevel", "Log subtype"],
  eventType: ["ACTION", "act", "action", "Log subtype", "log_type"],
  message: ["message", "msg", "Message"],
};

// 6. Windows Event Mapping
export const windowsEventMapping: FieldMapping = {
  timestamp: ["timestamp", "TimeCreated", "System.TimeCreated"],
  sourceIp: ["source_ip", "IpAddress", "sourceIp"],
  user: [
    "user",
    "SubjectUserName",
    "TargetUserName",
    "EventData.TargetUserName",
  ],
  eventType: ["EventID", "System.EventID", "event_type"],
  message: ["message", "Description", "EventData"],
  statusCode: ["result_code", "ResultCode", "status"],
  logLevel: ["level", "Level", "System.Level"],
};

// 7. Generic JSON Mapping
export const jsonMapping: FieldMapping = {
  timestamp: ["timestamp", "@timestamp", "time", "ts", "date", "Time"],
  sourceIp: [
    "ip",
    "source_ip",
    "src_ip",
    "client_ip",
    "remote_addr",
    "sourceIp",
    "Src IP",
    "Src_IP",
    "foreign_ip",
  ],
  user: ["user", "username", "uid", "user_id", "actor", "Username"],
  logLevel: ["level", "severity", "log_level", "priority", "logLevel", "Log subtype"],
  statusCode: ["status", "status_code", "http_status", "code", "column_0"],
  message: ["message", "msg", "text", "description", "event", "Message", "column_1"],
  eventType: ["event_type", "type", "event", "action", "Log subtype", "log_type"],
};

// Combined mapping registry
// PHASE 3: All log types mapped to their canonical field extractors
export const fieldMappingsRegistry: ParserTypeMapping = {
  // Web Servers (Nginx & Apache - both access and error formats use webMapping)
  NGINX_ACCESS: webMapping,
  NGINX_ERROR: webMapping,
  APACHE_ACCESS: webMapping,
  APACHE_ERROR: webMapping,
  APACHE_LOG: webMapping,
  // System & Security Logs
  SYSLOG: syslogMapping,
  WINDOWS_EVENT: windowsEventMapping,
  FIREWALL_LOG: firewallMapping,
  // Cloud & IDS
  AWS_CLOUDTRAIL: cloudTrailMapping,
  SURICATA_EVE: suricataMapping,
  // Containers & Structured Data
  DOCKER_JSON: jsonMapping,
  JSON: jsonMapping,
  // FIX: KEY_VALUE was mapped to firewallMapping, which looks for firewall-specific
  // fields like SRC, ACT, ACTION. KV logs are general-purpose — they come from
  // application logs, API gateways, auth systems, and anything else. Using
  // firewallMapping meant KV logs with user_agent, endpoint, session_id, and
  // other semantic fields had those values silently dropped because firewallMapping
  // has no aliases for them. jsonMapping is the broadest general-purpose mapping
  // and is the correct fallback for any structured but source-unknown format.
  KEY_VALUE: jsonMapping,
  GENERIC: jsonMapping,
};

export function getFieldMapping(detectedType: string): FieldMapping {
  return fieldMappingsRegistry[detectedType] ?? fieldMappingsRegistry.GENERIC!;
}

// ================================================
// VALUE NORMALIZATION CLASSIFIERS
// ================================================

export const severityMappings: Record<string, string> = {
  // Debug & Info
  trace: "INFO",
  debug: "INFO",
  info: "INFO",
  notice: "INFO",
  // Medium/Warn
  warn: "MEDIUM",
  warning: "MEDIUM",
  // High/Error
  error: "HIGH",
  err: "HIGH",
  failure: "HIGH",
  failed: "HIGH",
  // Critical
  critical: "CRITICAL",
  alert: "CRITICAL",
  emergency: "CRITICAL",
  fatal: "CRITICAL",
  // HTTP
  "200": "INFO",
  "201": "INFO",
  "301": "INFO",
  "400": "MEDIUM",
  "401": "MEDIUM",
  "403": "MEDIUM",
  "404": "MEDIUM",
  "500": "HIGH",
  "503": "HIGH",
  // Suricata numeric severities
  "1": "CRITICAL",
  "2": "HIGH",
  "3": "MEDIUM",
  "4": "INFO",
};

export function normalizeSeverity(value: any): string {
  if (!value) return "INFO";
  const strValue = String(value).toLowerCase().trim();
  const mapped = severityMappings[strValue];
  if (mapped) return mapped;

  if (strValue.includes("error") || strValue.includes("fail")) return "HIGH";
  if (strValue.includes("warn")) return "MEDIUM";
  if (
    strValue.includes("crit") ||
    strValue.includes("alert") ||
    strValue.includes("emerg")
  )
    return "CRITICAL";

  return "INFO";
}

export function normalizeEventType(value: any): string {
  if (!value) return "UNKNOWN_EVENT";
  const strValue = String(value).toUpperCase().trim();

  // Directly pass through standard actions without fuzzy matching
  if (strValue.startsWith("HTTP_")) return strValue;
  if (strValue.startsWith("WINDOWS_EVENT_")) return strValue;
  if (
    [
      "LOGIN_ATTEMPT",
      "LOGIN_FAILED",
      "LOGOUT",
      "AUTH_SUCCESS",
      "AUTH_FAILURE",
      "SESSION_START",
      "SESSION_END",
      "ALERT",
      "DNS",
      "HTTP",
      "TLS",
      "FLOW",
      "FILEINFO",
      "STATS",
      "SSH",
      "SMB",
      "DCERPC",
    ].includes(strValue)
  )
    return strValue;

  const lower = String(value).toLowerCase().trim().replace(/_/g, " ");

  // =====================================================================
  // PHASE 3: Enhanced Linux/Syslog Authentication Event Recognition
  // =====================================================================
  // These patterns specifically match syslog auth messages from OpenSSH, PAM, sudo, etc.

  // Failed authentication attempts (highest priority - fail fast on these)
  if (lower.includes("failed password") || lower.includes("invalid password"))
    return "LOGIN_FAILED";
  if (lower.includes("authentication failure")) return "AUTH_FAILURE";
  if (lower.includes("invalid user") || lower.includes("user unknown"))
    return "LOGIN_FAILED";
  if (
    lower.includes("failed") &&
    (lower.includes("login") || lower.includes("auth"))
  )
    return "LOGIN_FAILED";
  if (lower.includes("denied") && lower.includes("permission"))
    return "PERMISSION_DENIED";
  if (lower.includes("disconnect")) return "SESSION_END";

  // Successful authentication attempts
  if (
    lower.includes("accepted password") ||
    lower.includes("accepted publickey")
  )
    return "AUTH_SUCCESS";
  if (lower.includes("session opened") || lower.includes("opened for user"))
    return "SESSION_START";
  if (lower.includes("session closed")) return "SESSION_END";
  if (lower.includes("user authenticated")) return "AUTH_SUCCESS";

  // Sudo and privilege escalation
  if (lower.includes("sudo")) return "SUDO_COMMAND";
  if (lower.includes("setuid") || lower.includes("setgid"))
    return "PRIVILEGE_CHANGE";

  // General connection events
  if (lower.includes("connection from")) return "CONNECTION_ATTEMPT";
  if (lower.includes("connection accepted")) return "CONNECTION_ACCEPTED";
  if (lower.includes("connection closed") || lower.includes("connection reset"))
    return "CONNECTION_CLOSED";

  // Attack patterns
  if (lower.includes("brute") || lower.includes("brute_force"))
    return "BRUTE_FORCE_ATTEMPT";
  if (lower.includes("suspicious")) return "SUSPICIOUS_ACTIVITY";
  if (lower.includes("port scan") || lower.includes("port scanning"))
    return "PORT_SCAN";

  // Firewall Actions
  if (["permit", "accept", "allow", "allowed"].includes(lower)) return "NETWORK_ALLOW";
  if (["deny", "drop", "block", "blocked", "denied"].includes(lower))
    return "NETWORK_BLOCK";

  // HTTP mappings
  if (
    ["get", "post", "put", "delete", "patch", "options", "head"].includes(lower)
  )
    return `HTTP_${strValue}`;

  // Generic auth mappings (fallback)
  if (lower.includes("login")) return "LOGIN_ATTEMPT";
  if (lower.includes("auth")) return "AUTH_ATTEMPT";

  return "GENERIC_EVENT";
}

// ================================================
// SEMANTIC ONTOLOGY FOR KEY-VALUE LOGS
// ================================================

export const semanticPatterns: Record<string, RegExp> = {
  ipAddress:
    /(^ip$|ip_address|source_ip|client_ip|remote_addr|src|src_ip|sourceIPAddress)/i,
  user: /(^user$|username|uid|actor|account|SubjectUserName|USER|userIdentity\.userName)/i,
  status: /(^status$|result|outcome|return_code|exit_code|code)/i,
  eventType: /(^event$|event_type|type|action|ACT|eventName|EventID)/i,
  severity: /(severity|level|priority|alert\.severity|errorCode)/i,
  timestamp: /(^timestamp$|time|date|ts|@timestamp|eventTime|TimeCreated)/i,
  message: /(^message$|msg|text|description|alert\.signature)/i,
  method: /(^method$|http_method|request_method|verb)/i,
  url: /(^url$|uri|path|request_uri|endpoint)/i,
};

export function extractSemanticField(
  fields: Record<string, any>,
  semanticField: keyof typeof semanticPatterns,
): any {
  const pattern = semanticPatterns[semanticField];
  if (!pattern) return undefined;

  for (const [key, value] of Object.entries(fields)) {
    if (
      pattern.test(key) &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }
  return undefined;
}

export function extractUnmappedFields(
  fields: Record<string, any>,
): Record<string, any> {
  const unmapped: Record<string, any> = {};
  const allPatterns = Object.values(semanticPatterns);

  for (const [key, value] of Object.entries(fields)) {
    const isMatched = allPatterns.some((pattern) => pattern.test(key));
    if (!isMatched && value !== undefined && value !== null && value !== "") {
      unmapped[key] = value;
    }
  }
  return unmapped;
}

export function classifySeverity(
  fields: Record<string, any>,
  defaultSeverity: string = "INFO",
): string {
  const explicitSeverity = extractSemanticField(fields, "severity");
  if (explicitSeverity) return normalizeSeverity(explicitSeverity);

  const eventType = extractSemanticField(fields, "eventType");
  if (eventType) {
    const eventStr = String(eventType).toLowerCase();
    if (
      eventStr.includes("brute") ||
      eventStr.includes("suspicious") ||
      eventStr.includes("attack")
    )
      return "CRITICAL";
    if (
      eventStr.includes("fail") ||
      eventStr.includes("error") ||
      eventStr.includes("denied")
    )
      return "HIGH";
  }

  const status = extractSemanticField(fields, "status");
  if (status) return normalizeSeverity(status);

  return defaultSeverity;
}

export function classifyEventType(
  fields: Record<string, any>,
  rawMessage: string = "",
): string {
  const explicitType = extractSemanticField(fields, "eventType");
  if (explicitType) return normalizeEventType(explicitType);

  const rawLower = rawMessage.toLowerCase();

  // =====================================================================
  // PHASE 3: Enhanced Syslog Auth Pattern Recognition
  // =====================================================================

  // Failed authentication (highest priority)
  if (
    rawLower.includes("failed password") ||
    rawLower.includes("invalid password")
  )
    return "LOGIN_FAILED";
  if (rawLower.includes("authentication failure")) return "AUTH_FAILURE";
  if (rawLower.includes("invalid user") || rawLower.includes("user unknown"))
    return "LOGIN_FAILED";

  // Successful authentication
  if (
    rawLower.includes("accepted password") ||
    rawLower.includes("accepted publickey")
  )
    return "AUTH_SUCCESS";
  if (rawLower.includes("session opened")) return "SESSION_START";
  if (rawLower.includes("session closed")) return "SESSION_END";
  if (rawLower.includes("user authenticated")) return "AUTH_SUCCESS";

  // Privilege escalation
  if (rawLower.includes("sudo")) return "SUDO_COMMAND";
  if (rawLower.includes("setuid") || rawLower.includes("setgid"))
    return "PRIVILEGE_CHANGE";

  // Connection events
  if (rawLower.includes("connection from")) return "CONNECTION_ATTEMPT";
  if (rawLower.includes("connection accepted")) return "CONNECTION_ACCEPTED";
  if (
    rawLower.includes("connection closed") ||
    rawLower.includes("connection reset")
  )
    return "CONNECTION_CLOSED";

  // Attack indicators
  if (rawLower.includes("brute_force") || rawLower.includes("brute force"))
    return "BRUTE_FORCE_ATTEMPT";
  if (rawLower.includes("suspicious") && rawLower.includes("activity"))
    return "SUSPICIOUS_ACTIVITY";
  if (rawLower.includes("port_scan") || rawLower.includes("port scan"))
    return "PORT_SCAN";
  if (rawLower.includes("permission") && rawLower.includes("denied"))
    return "PERMISSION_DENIED";

  // Fallback to HTTP methods if applicable
  const method = extractSemanticField(fields, "method");
  if (method) return normalizeEventType(method);

  // Generic patterns
  if (
    rawLower.includes("failed_login") ||
    (rawLower.includes("fail") && rawLower.includes("login"))
  )
    return "LOGIN_FAILED";
  if (rawLower.includes("login") && !rawLower.includes("fail"))
    return "LOGIN_ATTEMPT";

  return "GENERIC_EVENT";
}
