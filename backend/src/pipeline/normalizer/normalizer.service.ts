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
  ErrorMetadata
} from "./types";
import {
  getFieldMapping,
  FieldMapping,
  normalizeSeverity,
  normalizeEventType
} from "./mappings";

/**
 * Normalization Service
 * Transforms parser-specific logs into canonical normalized logs
 * Context-Aware: Preserves deep JSON payloads and explicit threat signatures
 */

function extractField(log: Record<string, any>, fieldAliases: string | string[] | undefined): any {
  if (!fieldAliases) return null;
  const aliases = Array.isArray(fieldAliases) ? fieldAliases : [fieldAliases];

  for (const alias of aliases) {
    // Allows extraction of nested dots (e.g., "userIdentity.arn" or "alert.severity")
    const keys = alias.split('.');
    let current: any = log;
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
  return null;
}

function normalizeTimestamp(log: ParsedLog, mapping: FieldMapping): Date {
  const timestamp = extractField(log, mapping.timestamp) || log.timestamp;
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;

  if (typeof timestamp === "number") {
    return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  }

  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function normalizeIP(ip: string): string | undefined {
  if (!ip || typeof ip !== "string") return undefined;
  let trimmed = ip.trim();

  // Strip port suffix before validation: "192.168.1.1:8080" → "192.168.1.1"
  // Also handles IPv6 with port: "[::1]:8080" → "::1"
  if (trimmed.startsWith("[")) {
    // IPv6 bracket notation: [::1]:port
    const bracketEnd = trimmed.indexOf("]");
    if (bracketEnd !== -1) trimmed = trimmed.slice(1, bracketEnd);
  } else if (trimmed.includes(":")) {
    // Only strip if exactly one colon (IPv4 with port). Multiple colons = bare IPv6.
    const colonCount = (trimmed.match(/:/g) || []).length;
    if (colonCount === 1) trimmed = trimmed.split(":")[0]!;
  }

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) return trimmed;
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  if (ipv6Regex.test(trimmed)) return trimmed.toLowerCase();
  return undefined;
}

// FIX: Removed the 500-character Data Guillotine!
function extractNestedFields(log: ParsedLog, mapping: FieldMapping): Record<string, any> {
  const extracted: Record<string, any> = {};

  for (const [key, value] of Object.entries(log)) {
    if (["timestamp", "logLevel", "message", "sourceIp", "user", "statusCode", "raw", "metadata"].includes(key)) continue;
    if (value === undefined || value === null) continue;

    // Preserve JSON objects natively for the database's JSONB column
    if (typeof value === 'object') {
      extracted[key] = value;
    } else {
      // Only truncate insanely large pure-text blobs to prevent DB blowout
      const stringValue = String(value);
      if (stringValue.length > 10000) {
        extracted[key] = stringValue.substring(0, 10000) + "... (truncated)";
      } else {
        extracted[key] = value;
      }
    }
  }

  return extracted;
}

// --- STANDARD METADATA BUILDERS ---

function buildActionMetadata(log: ParsedLog, mapping: FieldMapping): ActionMetadata | undefined {
  const method = extractField(log, mapping.method);
  const endpoint = extractField(log, mapping.endpoint);
  const statusCode = extractField(log, mapping.statusCode);

  if (!method && !endpoint && statusCode === undefined) return undefined;

  return {
    type: method ? normalizeEventType(method) : normalizeEventType(endpoint),
    endpoint: endpoint ? String(endpoint) : undefined,
    method: method ? String(method).toUpperCase() : undefined,
    success: statusCode ? String(statusCode).startsWith("2") : undefined,
    error: statusCode && !String(statusCode).startsWith("2") ? `HTTP ${statusCode}` : undefined,
  };
}

function buildActorMetadata(log: ParsedLog, mapping: FieldMapping): ActorMetadata | undefined {
  const user = extractField(log, mapping.user) || log.user;
  const sessionId = extractField(log, mapping.sessionId);
  if (!user && !sessionId) return undefined;
  return {
    username: user ? String(user) : undefined,
    sessionId: sessionId ? String(sessionId) : undefined,
  };
}

function buildRequestMetadata(log: ParsedLog, mapping: FieldMapping): RequestMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode) || log.statusCode;
  const url = extractField(log, mapping.url);
  const userAgent = extractField(log, mapping.userAgent);
  if (!statusCode && !url && !userAgent) return undefined;
  return {
    statusCode: statusCode ? parseInt(String(statusCode), 10) : undefined,
    url: url ? String(url) : undefined,
    headers: userAgent ? { userAgent: String(userAgent) } : undefined,
  };
}

function buildSecurityMetadata(log: ParsedLog, mapping: FieldMapping, eventType: string): SecurityMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode);
  const user = extractField(log, mapping.user) || log.user;

  // Broad auth-event check: covers HTTP status codes, normalized syslog event types,
  // and CloudTrail/Windows auth events.
  const isAuthEvent =
    eventType.includes("LOGIN")       ||
    eventType.includes("AUTH")        ||
    eventType.includes("SESSION")     ||
    eventType.includes("LOGON")       ||  // Windows event log terminology
    eventType.includes("LOGOFF")      ||
    eventType === "PERMISSION_DENIED" ||
    eventType === "SUDO"              ||
    statusCode === 401                ||
    statusCode === 403                ||
    (user && statusCode && (
      String(statusCode).toLowerCase() === "success" ||
      String(statusCode).toLowerCase() === "succeeded" ||
      String(statusCode).toLowerCase() === "ok" ||
      String(statusCode).toLowerCase() === "failed" ||
      String(statusCode).toLowerCase() === "failure" ||
      String(statusCode).toLowerCase() === "fail"
    ));

  if (!isAuthEvent) return undefined;

  // Determine success: explicit success event types take precedence over status codes
  const isSuccess =
    eventType === "AUTH_SUCCESS"  ||
    eventType === "LOGIN_SUCCESS" ||
    eventType === "SESSION_START" ||
    eventType === "LOGON_SUCCESS" ||
    (statusCode !== undefined && (
      String(statusCode).startsWith("2") ||
      String(statusCode).toLowerCase() === "success" ||
      String(statusCode).toLowerCase() === "succeeded" ||
      String(statusCode).toLowerCase() === "ok"
    ));

  // Determine failure reason with priority: explicit event type → HTTP status code
  let failureReason: string | undefined;
  if (
    eventType === "AUTH_FAILURE" || 
    eventType === "LOGIN_FAILURE" ||
    (statusCode && (
      String(statusCode).toLowerCase() === "failed" ||
      String(statusCode).toLowerCase() === "failure" ||
      String(statusCode).toLowerCase() === "fail"
    ))
  ) {
    failureReason = "invalid_credentials";
  } else if (eventType === "PERMISSION_DENIED" || statusCode === 403) {
    failureReason = "access_denied";
  } else if (statusCode === 401) {
    failureReason = "invalid_credentials";
  }

  const isFailed = 
    eventType === "AUTH_FAILURE" || 
    eventType === "LOGIN_FAILURE" || 
    (statusCode !== undefined && (
      String(statusCode).toLowerCase() === "failed" || 
      String(statusCode).toLowerCase() === "failure" || 
      String(statusCode).toLowerCase() === "fail" || 
      String(statusCode) === "401"
    ));

  return {
    authenticated: !isFailed && statusCode !== 401,
    authSuccess: isSuccess,
    failureReason,
  };
}

function buildClientMetadata(log: ParsedLog, mapping: FieldMapping): ClientMetadata | undefined {
  const sourceIp = extractField(log, mapping.sourceIp) || log.sourceIp;
  const userAgent = extractField(log, mapping.userAgent);
  if (!sourceIp && !userAgent) return undefined;
  return {
    ipAddress: sourceIp ? normalizeIP(String(sourceIp)) : undefined,
    userAgent: userAgent ? String(userAgent) : undefined,
  };
}

function buildDataContextMetadata(log: ParsedLog, mapping: FieldMapping): DataContextMetadata | undefined {
  const message = extractField(log, mapping.message) || log.message;
  if (!message) return undefined;
  return { resourceType: "log_data" };
}

function buildErrorMetadata(log: ParsedLog, mapping: FieldMapping): ErrorMetadata | undefined {
  const statusCode = extractField(log, mapping.statusCode);
  const isError = statusCode && (String(statusCode).startsWith("4") || String(statusCode).startsWith("5"));
  if (!isError) return undefined;
  return {
    occurred: true,
    code: statusCode ? String(statusCode) : undefined,
  };
}

function buildMetadata(log: ParsedLog, mapping: FieldMapping, eventType: string): NormalizedLogMetadata {
  const metadata: NormalizedLogMetadata = { raw: log.raw || "" };

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

  const error = buildErrorMetadata(log, mapping);
  if (error) metadata.error = error;

  // FIX: Merge deep JSON payloads (Suricata, CloudTrail) safely into ParserMetadata
  const unmappedFields = extractNestedFields(log, mapping);
  if (Object.keys(unmappedFields).length > 0 || log.metadata) {
    metadata.parserMetadata = {
      ...unmappedFields,
      ...(log.metadata || {}) // 'original_json' lands safely here
    };
  }

  return metadata;
}

function normalizeLog(log: ParsedLog, jobId: string, detectedType: string, sourceMapping: FieldMapping): NormalizedLog | null {
  try {
    const timestamp = normalizeTimestamp(log, sourceMapping);
    
    // IP Normalization priority: Explicitly extracted by parser -> Ontological Mapping -> Undefined
    const sourceIpRaw = log.sourceIp || extractField(log, sourceMapping.sourceIp);
    const normalizedIp = sourceIpRaw ? normalizeIP(String(sourceIpRaw)) : undefined;

    // FIX: Context-Aware Severity (Trust explicitly extracted parser severities first)
    let severity = "INFO";
    if (log.logLevel && log.logLevel !== "INFO") {
      severity = normalizeSeverity(log.logLevel);
    } else {
      const mappedLevel = extractField(log, sourceMapping.logLevel);
      severity = normalizeSeverity(mappedLevel);
    }

    // FIX: Context-Aware Event Type (Trust explicit parser context like Suricata signatures)
    let eventType = "GENERIC_EVENT";
    if (log.metadata?.event_type) {
      eventType = normalizeEventType(log.metadata.event_type);
    } else if (log.metadata?.eventName) {
      eventType = normalizeEventType(log.metadata.eventName);
    } else {
      const methodRaw = extractField(log, sourceMapping.method) || extractField(log, sourceMapping.eventType);
      eventType = normalizeEventType(methodRaw);
    }

    // Upgrade for authentication logs parsed as JSON/CSV
    if (eventType === "GENERIC_EVENT" || eventType === "UNKNOWN_EVENT") {
      const user = extractField(log, sourceMapping.user) || log.user;
      const status = extractField(log, sourceMapping.statusCode);
      if (user && status) {
        const statusStr = String(status).toLowerCase().trim();
        if (statusStr === "success" || statusStr === "succeeded" || statusStr === "ok") {
          eventType = "LOGIN_SUCCESS";
        } else if (statusStr === "failed" || statusStr === "failure" || statusStr === "fail") {
          eventType = "LOGIN_FAILED";
        }
      }
    }

    const metadata = buildMetadata(log, sourceMapping, eventType);

    return {
      job_id: jobId,
      timestamp,
      source: detectedType,
      event_type: eventType,
      ip_address: normalizedIp || undefined,
      severity: severity as any,
      metadata: metadata as any
    };
  } catch (error) {
    console.error(`[NORMALIZER] Error normalizing log:`, error);
    return null;
  }
}

export const normalizerService = {
  async normalize(
    jobId: string,
    parsedLogs: ParsedLog[],
    processingMetadata: any,
  ): Promise<NormalizationResult> {
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    const detectedType = processingMetadata?.detectedType || "GENERIC";
    const sourceMapping = getFieldMapping(detectedType);

    const normalizedLogs: NormalizedLog[] = [];

    for (const parsedLog of parsedLogs) {
      const normalized = normalizeLog(parsedLog, jobId, detectedType, sourceMapping);
      if (normalized) {
        normalizedLogs.push(normalized);
        successCount++;
      } else {
        failCount++;
      }
    }

    if (normalizedLogs.length > 0) {
      const createData = normalizedLogs.map(n => ({
        ...n,
        ip_address: n.ip_address ?? null,
      }));

      await prisma.normalized_logs.createMany({
        data: createData as any,
        skipDuplicates: false,
      });
    }

    // Note: Database update for job stage and metadata removed from here
    // because this method is called per batch. The orchestrator now performs
    // a single aggregated update at the end of all batches to avoid premature
    // checkpointing and metadata overwrites.


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
  },
};