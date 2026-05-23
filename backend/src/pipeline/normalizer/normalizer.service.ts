import { ParsedLog } from "../parser/types";
import { prisma } from "../../config/db";
import {
  NormalizedLog,
  NormalizationResult,
  NormalizedLogMetadata,
  ActionMetadata,
  ActorMetadata,
  RequestMetadata,
  SecurityMetadata,
  ClientMetadata,
  DataContextMetadata,
  ErrorMetadata,
  BehaviorMetadata,
  ParserMetadata,
} from "./types";
import {
  getFieldMapping,
  normalizeSeverity,
  normalizeEventType,
  FieldMapping,
  extractSemanticField,
  extractUnmappedFields,
  classifySeverity,
  classifyEventType,
} from "./mappings";

/**
 * Normalization Service
 * Transforms parser-specific logs into canonical normalized logs
 * Stores in database for downstream analyzer consumption
 */

/**
 * Gracefully extract field from parsed log using field aliases
 * Returns null if no matching field found
 */
function extractField(
  log: ParsedLog,
  fieldAliases: string | string[] | undefined,
): any {
  if (!fieldAliases) return null;

  const aliases = Array.isArray(fieldAliases) ? fieldAliases : [fieldAliases];

  for (const alias of aliases) {
    if (log[alias] !== undefined && log[alias] !== null && log[alias] !== "") {
      return log[alias];
    }
  }

  return null;
}

/**
 * Normalize timestamp to ISO8601 Date
 * Gracefully handles various timestamp formats
 * CRITICAL: Enforces UTC for Z-suffixed timestamps (no double offset!)
 */
function normalizeTimestamp(log: ParsedLog, mapping: FieldMapping): Date {
  const timestamp = extractField(log, mapping.timestamp);

  if (!timestamp) {
    console.warn("[NORMALIZER] No timestamp found in log, using current time");
    return new Date();
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Unix timestamp (seconds or milliseconds)
  if (typeof timestamp === "number") {
    // Assume seconds if less than 10^12 (roughly year 2286 in ms)
    return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  }

  if (typeof timestamp === "string") {
    // Check if timestamp has Z suffix (UTC indicator)
    const hasZSuffix = timestamp.includes("Z");

    // Parse the timestamp
    const parsed = new Date(timestamp);

    if (!isNaN(parsed.getTime())) {
      // CRITICAL FIX: If the original string has Z suffix, the Date object
      // already contains the correct UTC value internally.
      // We must return it as-is without applying timezone offset.
      // Using toISOString() ensures UTC representation in database.

      if (hasZSuffix) {
        // Z-suffixed timestamps are already UTC - return as-is
        // The Date object internally stores epoch milliseconds (UTC)
        // Databases interpret this correctly
        return parsed;
      }

      // For timestamps without Z suffix, also trust JavaScript's parsing
      // It treats them as UTC by standard
      return parsed;
    }

    console.warn(`[NORMALIZER] Could not parse timestamp: ${timestamp}`);
    return new Date();
  }

  return new Date();
}

/**
 * Validate and normalize IP address
 * Returns undefined if invalid
 */
function normalizeIP(ip: string): string | undefined {
  if (!ip || typeof ip !== "string") return undefined;

  const trimmed = ip.trim();

  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    return trimmed;
  }

  // IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  if (ipv6Regex.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return undefined;
}

/**
 * Extract nested object fields from parsed log
 * Gracefully omits large fields to keep metadata lightweight
 */
function extractNestedFields(
  log: ParsedLog,
  mapping: FieldMapping,
  maxSize: number = 500,
): Record<string, any> {
  const extracted: Record<string, any> = {};

  for (const [key, value] of Object.entries(log)) {
    // Skip already mapped fields
    if (
      [
        "timestamp",
        "logLevel",
        "message",
        "sourceIp",
        "user",
        "statusCode",
        "raw",
      ].includes(key)
    ) {
      continue;
    }

    // Skip undefined/null values
    if (value === undefined || value === null) continue;

    // Convert to string for size check
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    // Truncate large values (request/response bodies, long traces)
    if (stringValue.length > maxSize) {
      extracted[key] = stringValue.substring(0, maxSize) + "... (truncated)";
    } else {
      extracted[key] = value;
    }
  }

  return extracted;
}

/**
 * Build action metadata from parsed log
 */
function buildActionMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): ActionMetadata | undefined {
  const method = extractField(log, mapping.method);
  const endpoint = extractField(log, mapping.endpoint);
  const statusCode = extractField(log, mapping.statusCode);

  if (!method && !endpoint && statusCode === undefined) {
    return undefined; // No action data available
  }

  return {
    type: method ? normalizeEventType(method) : normalizeEventType(endpoint),
    endpoint: endpoint ? String(endpoint) : undefined,
    method: method ? String(method).toUpperCase() : undefined,
    success: statusCode ? String(statusCode).startsWith("2") : undefined,
    error:
      statusCode && !String(statusCode).startsWith("2")
        ? `HTTP ${statusCode}`
        : undefined,
  };
}

/**
 * Build actor metadata from parsed log
 */
function buildActorMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): ActorMetadata | undefined {
  const user = extractField(log, mapping.user);
  const sessionId = extractField(log, mapping.sessionId);

  if (!user && !sessionId) {
    return undefined; // No actor data
  }

  return {
    username: user ? String(user) : undefined,
    sessionId: sessionId ? String(sessionId) : undefined,
  };
}

/**
 * Build request metadata from parsed log
 */
function buildRequestMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): RequestMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode);
  const url = extractField(log, mapping.url);
  const userAgent = extractField(log, mapping.userAgent);

  if (!statusCode && !url && !userAgent) {
    return undefined; // No request data
  }

  return {
    statusCode: statusCode ? parseInt(String(statusCode), 10) : undefined,
    url: url ? String(url) : undefined,
    headers: userAgent
      ? {
          userAgent: String(userAgent),
        }
      : undefined,
  };
}

/**
 * Build security metadata from parsed log
 * Infers auth success/failure from context
 */
function buildSecurityMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
  eventType: string,
): SecurityMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode);
  const user = extractField(log, mapping.user);

  // Infer auth-related metadata from event type and status codes
  if (eventType.includes("LOGIN") || statusCode === 401 || statusCode === 403) {
    return {
      authenticated: statusCode !== 401,
      authSuccess: statusCode && String(statusCode).startsWith("2"),
      failureReason:
        statusCode === 401
          ? "invalid_credentials"
          : statusCode === 403
            ? "access_denied"
            : undefined,
    };
  }

  return undefined;
}

/**
 * Build client metadata from parsed log
 */
function buildClientMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): ClientMetadata | undefined {
  const sourceIp = extractField(log, mapping.sourceIp);
  const userAgent = extractField(log, mapping.userAgent);

  if (!sourceIp && !userAgent) {
    return undefined; // No client data
  }

  const normalizedIp = sourceIp ? normalizeIP(String(sourceIp)) : undefined;

  return {
    ipAddress: normalizedIp,
    userAgent: userAgent ? String(userAgent) : undefined,
  };
}

/**
 * Build data context metadata from parsed log
 */
function buildDataContextMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): DataContextMetadata | undefined {
  const message = extractField(log, mapping.message);

  if (!message) {
    return undefined;
  }

  // Very basic inference - analyzers can enhance this
  return {
    resourceType: "log_data",
  };
}

/**
 * Build error metadata from parsed log
 */
function buildErrorMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
): ErrorMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode);
  const message = extractField(log, mapping.message);

  const isError =
    statusCode &&
    (String(statusCode).startsWith("4") || String(statusCode).startsWith("5"));

  if (!isError && !message) {
    return undefined;
  }

  return {
    occurred: !!isError,
    code: statusCode ? String(statusCode) : undefined,
    message: message ? String(message).substring(0, 200) : undefined, // Truncate long messages
  };
}

/**
 * Build complete normalized log metadata
 * Gracefully omits sections with no data
 */
function buildMetadata(
  log: ParsedLog,
  mapping: FieldMapping,
  eventType: string,
): NormalizedLogMetadata {
  const metadata: NormalizedLogMetadata = {
    raw: log.raw || "", // Always include raw log
  };

  // Build each section, only include if data exists
  const action = buildActionMetadata(log, mapping);
  if (action) metadata.action = action;

  const actor = buildActorMetadata(log, mapping);
  if (actor) metadata.actor = actor;

  const request = buildRequestMetadata(log, mapping);
  if (request) metadata.request = request;

  const security = buildSecurityMetadata(log, mapping, eventType);
  if (security) metadata.security = security;

  const client = buildClientMetadata(log, mapping);
  if (client) metadata.client = client;

  const dataContext = buildDataContextMetadata(log, mapping);
  if (dataContext) metadata.dataContext = dataContext;

  const error = buildErrorMetadata(log, mapping);
  if (error) metadata.error = error;

  // Parser metadata for fields not covered by canonical schema
  const otherFields = extractNestedFields(log, mapping);
  if (Object.keys(otherFields).length > 0) {
    metadata.parserMetadata = {
      sourceFormat: "unknown",
      originalFields: otherFields,
    };
  }

  return metadata;
}

/**
 * Normalize a single parsed log to canonical format
 */
function normalizeLog(
  log: ParsedLog,
  jobId: string,
  detectedType: string,
  sourceMapping: FieldMapping,
): NormalizedLog | null {
  try {
    // For KEY_VALUE logs, use semantic extraction from keyValueFields
    let timestamp: Date;
    let sourceIp: string | undefined;
    let eventType: string;
    let severity: string;
    let user: string | undefined;
    let message: string;
    let unmappedFields: Record<string, any> = {};

    if (detectedType === "KEY_VALUE" && log.keyValueFields) {
      // Semantic extraction for key-value logs
      sourceIp = extractSemanticField(log.keyValueFields, "ipAddress");
      user = extractSemanticField(log.keyValueFields, "user");
      message = log.message || "";

      // Use fuzzy logic classifiers
      severity = classifySeverity(log.keyValueFields, "INFO");
      eventType = classifyEventType(log.keyValueFields, log.raw || "");

      // Extract unmapped fields for JSONB metadata
      unmappedFields = extractUnmappedFields(log.keyValueFields);

      // CRITICAL: Use normalizeTimestamp to ensure UTC handling (prevents timezone offset bugs)
      timestamp = normalizeTimestamp(log, sourceMapping);
    } else {
      // Traditional extraction for other log types
      timestamp = normalizeTimestamp(log, sourceMapping);
      const sourceIpRaw = extractField(log, sourceMapping.sourceIp);
      sourceIp = sourceIpRaw ? String(sourceIpRaw) : undefined;

      const logLevel = extractField(log, sourceMapping.logLevel);
      severity = normalizeSeverity(logLevel);

      const method = extractField(log, sourceMapping.method);
      eventType = method ? normalizeEventType(method) : "GENERIC_EVENT";

      user = extractField(log, sourceMapping.user);
      message = extractField(log, sourceMapping.message) || log.message || "";
    }

    // Validate and normalize IP
    const normalizedIp = sourceIp ? normalizeIP(sourceIp) : undefined;

    // Build structured metadata
    const metadata = buildMetadata(log, sourceMapping, eventType);

    // For KEY_VALUE logs, add unmapped fields to metadata
    if (
      detectedType === "KEY_VALUE" &&
      Object.keys(unmappedFields).length > 0
    ) {
      if (!metadata.parserMetadata) {
        metadata.parserMetadata = {
          sourceFormat: "KEY_VALUE",
          originalFields: unmappedFields,
        };
      } else {
        metadata.parserMetadata.originalFields = {
          ...metadata.parserMetadata.originalFields,
          ...unmappedFields,
        };
      }
    }

    // Build normalized log
    const normalizedLog: NormalizedLog = {
      job_id: jobId,
      timestamp,
      source: detectedType,
      event_type: eventType,
      ip_address: normalizedIp,
      severity: severity as any,
      metadata,
    };

    return normalizedLog;
  } catch (error) {
    console.error(`[NORMALIZER] Error normalizing log:`, error, log);
    return null; // Skip this log, continue with others
  }
}

/**
 * Main normalization function
 * Transforms parsed logs to normalized canonical format and stores in DB
 */
export const normalizerService = {
  async normalize(
    jobId: string,
    parsedLogs: ParsedLog[],
    processingMetadata: any,
  ): Promise<NormalizationResult> {
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    console.log(
      `[NORMALIZER] Starting normalization of ${parsedLogs.length} logs for job ${jobId}`,
    );

    try {
      // Get detected type from processing metadata
      const detectedType = processingMetadata?.detectedType || "UNKNOWN";
      const sourceMapping = getFieldMapping(detectedType);

      // Normalize all logs
      const normalizedLogs: NormalizedLog[] = [];

      for (const parsedLog of parsedLogs) {
        const normalized = normalizeLog(
          parsedLog,
          jobId,
          detectedType,
          sourceMapping,
        );

        if (normalized) {
          normalizedLogs.push(normalized);
          successCount++;
        } else {
          failCount++;
        }
      }

      // Log summary before DB insert
      console.log(
        `[NORMALIZER] Normalized: ${successCount} successful, ${failCount} failed out of ${parsedLogs.length} logs`,
      );

      // If we have normalized logs, save them to database
      if (normalizedLogs.length > 0) {
        // Transform for database - convert severity to string if needed
        // Convert undefined ip_address to null for database compatibility
        const logsForDb = normalizedLogs.map((log) => ({
          job_id: log.job_id,
          timestamp: log.timestamp,
          source: log.source,
          event_type: log.event_type,
          ip_address: log.ip_address || null, // Prisma expects null, not undefined
          severity: log.severity,
          metadata: log.metadata as any, // Prisma handles JSON serialization
        }));

        console.log(
          `[NORMALIZER] Inserting ${logsForDb.length} normalized logs into database...`,
        );

        // Bulk insert into normalized_logs table
        await prisma.normalized_logs.createMany({
          data: logsForDb,
          skipDuplicates: false,
        });

        console.log(
          `[NORMALIZER] Successfully saved ${logsForDb.length} normalized logs`,
        );
      }

      // Update job checkpoint
      console.log(
        `[NORMALIZER] Updating job ${jobId} checkpoint to NORMALIZED...`,
      );

      await prisma.jobs.update({
        where: { id: jobId },
        data: {
          last_completed_stage: "NORMALIZED",
          processing_metadata: {
            ...processingMetadata,
            normalized_count: successCount,
            normalization_time_ms: Date.now() - startTime,
            failed_to_normalize: failCount,
          },
        },
      });

      console.log(`[NORMALIZER] Job ${jobId} checkpoint updated successfully`);

      return {
        success: true,
        failedCount: failCount,
        stats: {
          totalProcessed: parsedLogs.length,
          successfullyNormalized: successCount,
          failed: failCount,
          normalizationTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error(
        `[NORMALIZER] Normalization failed for job ${jobId}:`,
        error,
      );

      // Mark job as failed
      await prisma.jobs.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error_message: `Normalization failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });

      throw error;
    }
  },
};
