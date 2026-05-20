/**
 * Normalized Log Types
 * These are the canonical/stable structures persisted to normalized_logs table
 * Analyzers query these structures consistently regardless of source log type
 */

/**
 * Action metadata - what action was attempted
 */
export interface ActionMetadata {
  type?: string | undefined; // LOGIN, READ, WRITE, DELETE, UPLOAD, DOWNLOAD, HTTP_REQUEST, SYSTEM_EVENT
  description?: string | undefined;
  endpoint?: string | undefined; // e.g., /api/users
  method?: string | undefined; // GET, POST, PUT, DELETE, etc.
  success?: boolean | undefined; // Did the action succeed?
  error?: string | undefined; // If failed, why?
}

/**
 * Actor metadata - who/what performed the action
 */
export interface ActorMetadata {
  userId?: string | undefined; // User ID from auth system
  username?: string | undefined; // Username/email
  type?: string | undefined; // USER, SYSTEM, ADMIN, SERVICE
  sessionId?: string | undefined; // Session tracking
}

/**
 * Request metadata - HTTP/transaction details
 */
export interface RequestMetadata {
  statusCode?: number | undefined; // HTTP 200, 401, 403, 500, etc.
  duration?: number | undefined; // Response time in ms
  url?: string | undefined; // Full URL or path
  query?: Record<string, any> | undefined; // Query parameters
  headers?:
    | {
        userAgent?: string | undefined;
        referer?: string | undefined;
        contentType?: string | undefined;
        [key: string]: any;
      }
    | undefined;
}

/**
 * Security metadata - authentication & security context
 */
export interface SecurityMetadata {
  authenticated?: boolean | undefined; // Was user authenticated?
  authMethod?: string | undefined; // BASIC, JWT, OAUTH, SESSION, SSH_PASSWORD
  authSuccess?: boolean | undefined; // Did auth succeed?
  failureReason?: string | undefined; // Why auth failed: invalid_password, user_not_found
  mfaUsed?: boolean | undefined;
}

/**
 * Client metadata - source characteristics
 */
export interface ClientMetadata {
  ipAddress?: string | undefined; // Source IP (can differ from normalized_logs.ip_address for contexts)
  port?: number | undefined;
  userAgent?: string | undefined;
  country?: string | undefined; // GeoIP if available
  isVpn?: boolean | undefined;
  isTor?: boolean | undefined;
}

/**
 * Data context metadata - what was accessed
 */
export interface DataContextMetadata {
  resourceId?: string | undefined; // What resource: user_id, file_id, etc.
  resourceType?: string | undefined; // user, file, setting, database
  recordCount?: number | undefined; // How many records affected
  sensitivity?: string | undefined; // PUBLIC, INTERNAL, CONFIDENTIAL, SECRET
}

/**
 * Error metadata - error information
 */
export interface ErrorMetadata {
  occurred?: boolean | undefined;
  type?: string | undefined; // ERROR, WARNING, EXCEPTION
  code?: string | undefined; // Error code
  message?: string | undefined; // Error message (truncated if too long)
}

/**
 * Behavior metadata - behavioral signals
 */
export interface BehaviorMetadata {
  isRetry?: boolean | undefined;
  retryCount?: number | undefined;
  bulkOperation?: boolean | undefined; // Multiple resources at once?
  rapidSequence?: boolean | undefined; // Part of rapid sequence?
}

/**
 * Parser-specific metadata - fallback to original fields
 */
export interface ParserMetadata {
  sourceFormat?: string; // NGINX, SYSLOG, JSON, WINDOWS_EVENT
  originalFields?: Record<string, any>; // Other parser-specific fields (truncated)
}

/**
 * Complete normalized log metadata structure
 * Gracefully includes only fields that were available in source log
 */
export interface NormalizedLogMetadata {
  action?: ActionMetadata;
  actor?: ActorMetadata;
  request?: RequestMetadata;
  security?: SecurityMetadata;
  client?: ClientMetadata;
  dataContext?: DataContextMetadata;
  error?: ErrorMetadata;
  behavior?: BehaviorMetadata;
  parserMetadata?: ParserMetadata;
  raw: string; // Original unparsed log line - ALWAYS included
}

/**
 * Canonical normalized log structure
 * This is what gets persisted to normalized_logs table
 * All downstream analyzers work with this structure
 */
export interface NormalizedLog {
  job_id: string; // Reference to job
  timestamp: Date; // ISO8601 normalized timestamp
  source: string; // Log source type (NGINX_ACCESS, SYSLOG, JSON, etc.)
  event_type: string; // Type of event (HTTP_GET, LOGIN_ATTEMPT, etc.)
  ip_address?: string | undefined; // Normalized source IP
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"; // Normalized severity
  metadata: NormalizedLogMetadata; // Structured metadata for analyzers
}

/**
 * Normalization result - output of normalization stage
 */
export interface NormalizationResult {
  success: boolean;
  normalizedLogs: NormalizedLog[];
  failedCount: number;
  stats: {
    totalProcessed: number;
    successfullyNormalized: number;
    failed: number;
    normalizationTimeMs: number;
  };
}

/**
 * Field extraction result - helper for mapping extraction
 */
export interface FieldExtractionResult {
  value: any;
  found: boolean;
  fieldName?: string; // Which alias was found
}
