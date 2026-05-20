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
  requestBody?: string | string[];
  responseBody?: string | string[];
  [key: string]: string | string[] | undefined; // Allow custom fields
}

export interface ParserTypeMapping {
  [parserType: string]: FieldMapping;
}

/**
 * NGINX Access Log Format Mapping
 * Maps NGINX fields to canonical schema
 */
export const nginxMapping: FieldMapping = {
  timestamp: ["timestamp", "time_local", "$time_local"],
  sourceIp: ["remote_addr", "client_ip", "source_ip"],
  user: ["remote_user", "username"],
  statusCode: ["status", "http_status", "response_code"],
  method: ["method", "request_method", "http_method"],
  url: ["request", "uri", "request_uri"],
  endpoint: ["request", "uri", "request_uri"],
  logLevel: ["log_level", "level"], // Derived from status code usually
  userAgent: ["http_user_agent", "user_agent", "agent"],
  message: ["request", "log_message"],
};

/**
 * Syslog Format Mapping
 * Maps Syslog fields to canonical schema
 */
export const syslogMapping: FieldMapping = {
  timestamp: ["timestamp", "date", "time"],
  sourceIp: ["source_ip", "remote_addr", "client_ip"],
  user: ["user", "username", "uid"],
  logLevel: ["severity", "level", "priority"],
  eventType: ["process", "facility", "program"],
  message: ["message", "msg", "text"],
  statusCode: ["exit_code", "code", "result"],
  sessionId: ["session", "session_id", "pid"],
};

/**
 * JSON Log Format Mapping
 * Maps JSON fields to canonical schema
 */
export const jsonMapping: FieldMapping = {
  timestamp: ["timestamp", "@timestamp", "time", "ts", "date"],
  sourceIp: ["ip", "source_ip", "client_ip", "remote_addr", "src_ip"],
  user: ["user", "username", "uid", "user_id", "actor"],
  logLevel: ["level", "severity", "log_level", "priority"],
  statusCode: ["status", "status_code", "http_status", "code"],
  message: ["message", "msg", "text", "description", "event"],
  eventType: ["event_type", "type", "event", "action"],
  method: ["method", "http_method", "request_method"],
  url: ["url", "uri", "request_uri", "path"],
  endpoint: ["endpoint", "url", "uri", "path"],
  userAgent: ["user_agent", "useragent", "ua"],
  sessionId: ["session", "session_id", "request_id", "trace_id"],
};

/**
 * Windows Event Log Format Mapping
 * Maps Windows Event fields to canonical schema
 */
export const windowsEventMapping: FieldMapping = {
  timestamp: ["timestamp", "TimeCreated", "eventTime"],
  sourceIp: ["source_ip", "IpAddress", "computer"],
  user: ["user", "SubjectUserName", "TargetUserName"],
  eventType: ["EventID", "event_type", "type"],
  message: ["message", "Description", "EventData"],
  statusCode: ["result_code", "ResultCode", "status"],
  logLevel: ["level", "Level"],
};

/**
 * Generic/CSV Format Mapping
 * Used as fallback for unknown formats
 */
export const genericMapping: FieldMapping = {
  timestamp: ["timestamp", "date", "time", "0"],
  sourceIp: ["ip", "source_ip", "client"],
  user: ["user", "username", "actor"],
  logLevel: ["level", "severity"],
  message: ["message", "msg", "text"],
  statusCode: ["status", "code"],
};

/**
 * Combined mapping registry
 * Maps detected log type to field mappings
 */
export const fieldMappingsRegistry: ParserTypeMapping = {
  NGINX_ACCESS: nginxMapping,
  NGINX_ERROR: nginxMapping,
  SYSLOG: syslogMapping,
  SYSTEM_LOG: syslogMapping,
  JSON: jsonMapping,
  JSON_LOG: jsonMapping,
  WINDOWS_EVENT: windowsEventMapping,
  WINDOWS_SECURITY: windowsEventMapping,
  GENERIC: genericMapping,
  CSV: genericMapping,
  UNKNOWN: genericMapping,
};

/**
 * Get field mapping for detected log type
 * @param detectedType - Type detected by type-detector (e.g., 'NGINX_ACCESS')
 * @returns Field mapping or generic mapping as fallback
 */
export function getFieldMapping(detectedType: string): FieldMapping {
  return fieldMappingsRegistry[detectedType] ?? fieldMappingsRegistry.GENERIC!;
}

/**
 * Severity level mappings
 * Maps various log level formats to canonical severity
 */
export const severityMappings: Record<string, string> = {
  // Debug levels
  trace: "INFO",
  debug: "INFO",

  // Info levels
  info: "INFO",
  information: "INFO",
  informational: "INFO",

  // Warning levels
  warn: "MEDIUM",
  warning: "MEDIUM",
  notice: "MEDIUM",

  // Error levels
  error: "HIGH",
  err: "HIGH",
  failure: "HIGH",
  failed: "HIGH",

  // Critical levels
  critical: "CRITICAL",
  alert: "CRITICAL",
  emergency: "CRITICAL",
  fatal: "CRITICAL",
  severe: "CRITICAL",

  // HTTP status codes
  "200": "INFO",
  "201": "INFO",
  "204": "INFO",
  "301": "INFO",
  "302": "INFO",
  "304": "INFO",
  "400": "MEDIUM",
  "401": "MEDIUM",
  "403": "MEDIUM",
  "404": "MEDIUM",
  "429": "HIGH", // Rate limited
  "500": "HIGH",
  "502": "HIGH",
  "503": "HIGH",
  "504": "HIGH",
};

/**
 * Get severity from various formats
 * @param value - Log level/severity/status code value
 * @returns Normalized severity level
 */
export function normalizeSeverity(value: any): string {
  if (!value) return "INFO";

  const strValue = String(value).toLowerCase().trim();
  const mapped = severityMappings[strValue];

  if (mapped) return mapped;

  // Fuzzy matching for variations
  if (strValue.includes("error") || strValue.includes("fail")) return "HIGH";
  if (strValue.includes("warn") || strValue.includes("warn")) return "MEDIUM";
  if (strValue.includes("crit") || strValue.includes("alert"))
    return "CRITICAL";

  return "INFO"; // Default to INFO if cannot determine
}

/**
 * Event type detection from various formats
 * Maps action/method/type to canonical event types
 */
export const eventTypeMappings: Record<string, string> = {
  // HTTP methods
  get: "HTTP_GET",
  post: "HTTP_POST",
  put: "HTTP_PUT",
  delete: "HTTP_DELETE",
  patch: "HTTP_PATCH",
  options: "HTTP_OPTIONS",
  head: "HTTP_HEAD",

  // Login/Auth
  login: "LOGIN_ATTEMPT",
  logout: "LOGOUT",
  authenticate: "LOGIN_ATTEMPT",
  ssh_login: "SSH_LOGIN_ATTEMPT",
  failed_login: "LOGIN_FAILED",
  invalid_user: "LOGIN_FAILED",
  authentication_failure: "LOGIN_FAILED",

  // Data operations
  read: "DATA_READ",
  write: "DATA_WRITE",
  insert: "DATA_INSERT",
  update: "DATA_UPDATE",
  record_delete: "DATA_DELETE",
  remove: "DATA_DELETE",

  // System events
  system_start: "SYSTEM_START",
  system_stop: "SYSTEM_STOP",
  service_start: "SERVICE_START",
  service_stop: "SERVICE_STOP",
  kernel: "KERNEL_EVENT",
  cron: "CRON_JOB",

  // File operations
  file_access: "FILE_ACCESS",
  file_open: "FILE_OPEN",
  file_create: "FILE_CREATE",
  file_delete: "FILE_DELETE",
  file_modify: "FILE_MODIFY",
};

/**
 * Get event type from method/type/action
 * @param value - HTTP method, action type, etc.
 * @returns Normalized event type
 */
export function normalizeEventType(value: any): string {
  if (!value) return "UNKNOWN_EVENT";

  const strValue = String(value).toLowerCase().trim();
  const mapped = eventTypeMappings[strValue];

  if (mapped) return mapped;

  // Partial matching
  if (strValue.includes("login") || strValue.includes("auth"))
    return "LOGIN_ATTEMPT";
  if (strValue.includes("error") || strValue.includes("fail"))
    return "ERROR_EVENT";
  if (strValue.includes("success")) return "SUCCESS_EVENT";

  return "GENERIC_EVENT"; // Default to generic
}
