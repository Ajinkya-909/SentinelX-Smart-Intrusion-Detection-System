/**
 * User Feature Extraction
 *
 * Extracts behavioral features for each user/username from the AnalysisContext.
 * These features capture login patterns, access diversity, privilege operations,
 * and session characteristics.
 */

import {
  AnalysisContext,
  NormalizedLog,
} from "../../shared/context/AnalysisContext";
import { UserFeatureVector } from "../types/features.types";
import logger from "../../../../config/logger";

/**
 * Build user feature vectors from AnalysisContext
 *
 * For each unique user/username in logs, extract behavioral metrics
 */
export function buildUserFeatures(ctx: AnalysisContext): UserFeatureVector[] {
  const startTime = Date.now();
  const features: UserFeatureVector[] = [];

  try {
    // Group logs by username
    const userMap = new Map<string, NormalizedLog[]>();

    for (const log of ctx.logs) {
      // Extract username from metadata or event_type
      const username = extractUsername(log);
      if (!username) continue;

      if (!userMap.has(username)) {
        userMap.set(username, []);
      }
      userMap.get(username)!.push(log);
    }

    // Build feature vector for each user
    for (const [username, userLogs] of userMap) {
      const vector = extractUserFeatures(username, userLogs, ctx);
      features.push(vector);
    }

    const executionTime = Date.now() - startTime;
    logger.debug(
      `[USER FEATURE EXTRACTION] Extracted ${features.length} user feature vectors in ${executionTime}ms`,
    );

    return features;
  } catch (error) {
    logger.error(
      `[USER FEATURE EXTRACTION] Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Extract username from log
 */
function extractUsername(log: any): string | null {
  // Try multiple common field names
  return (
    log.username ||
    log.user ||
    log.metadata?.username ||
    log.metadata?.user ||
    log.metadata?.userId ||
    null
  );
}

/**
 * Extract features for a single user
 */
function extractUserFeatures(
  username: string,
  userLogs: NormalizedLog[],
  ctx: AnalysisContext,
): UserFeatureVector {
  // ===== BASIC COUNTS =====
  const totalRequests = userLogs.length;
  const errorCount = userLogs.filter(
    (log: NormalizedLog) => log.status_code >= 400,
  ).length;
  const userErrorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
  const httpErrorCount = errorCount;

  // ===== LOGIN BEHAVIOR =====
  const authLogs = userLogs.filter((log: NormalizedLog) =>
    log.event_type?.toUpperCase().includes("AUTH"),
  );
  const failedLogins = authLogs.filter(
    (log: NormalizedLog) => log.status_code >= 400,
  ).length;
  const successfulLogins = authLogs.filter(
    (log: NormalizedLog) => log.status_code < 400,
  ).length;
  const loginAttempts = authLogs.length;
  const loginFailureRatio =
    loginAttempts > 0 ? failedLogins / loginAttempts : 0;

  // ===== IP DIVERSITY =====
  const ips = new Set<string>();
  for (const log of userLogs) {
    if (log.ip_address) {
      ips.add(log.ip_address);
    }
  }
  const distinctIpsUsed = ips.size;

  // Rough geo-diversity score (would need geo-IP data for real implementation)
  // For now, use IP count as proxy
  const geographicDiversityScore = Math.min(distinctIpsUsed / 5, 1);

  // ===== ENDPOINT ACCESS =====
  const endpointMap = new Map<string, number>();
  for (const log of userLogs) {
    if (log.endpoint) {
      endpointMap.set(log.endpoint, (endpointMap.get(log.endpoint) || 0) + 1);
    }
  }
  const distinctEndpointsAccessed = endpointMap.size;

  // Calculate concentration (how focused on few endpoints)
  const endpointConcentration = calculateEndpointConcentration(endpointMap);

  // ===== PRIVILEGE & ADMIN ACCESS =====
  const adminAccessAttempts = userLogs.filter(
    (log: NormalizedLog) =>
      log.endpoint?.includes("/admin") ||
      log.endpoint?.includes("/config") ||
      log.message?.includes("admin"),
  ).length;

  const privilegeEscalationAttempts = userLogs.filter(
    (log: NormalizedLog) =>
      log.message?.includes("privilege") ||
      log.message?.includes("sudo") ||
      log.message?.includes("escalat"),
  ).length;

  const criticalResourceAccesses = userLogs.filter(
    (log: NormalizedLog) =>
      log.severity === "CRITICAL" ||
      log.status_code >= 500 ||
      log.event_type?.includes("CRITICAL"),
  ).length;

  // ===== ERROR PATTERNS =====
  const errorTypeSet = new Set<string>();
  for (const log of userLogs.filter(
    (l: NormalizedLog) => l.status_code >= 400,
  )) {
    if (log.event_type) {
      errorTypeSet.add(log.event_type);
    }
  }
  const uniqueErrorTypes = errorTypeSet.size;

  // ===== TEMPORAL PATTERNS =====
  const timestamps = userLogs
    .map((log: NormalizedLog) => new Date(log.timestamp).getTime())
    .sort((a: number, b: number) => a - b);

  const firstActivityTime =
    timestamps.length > 0
      ? new Date(timestamps[0]!).toISOString()
      : new Date().toISOString();
  const lastActivityTime =
    timestamps.length > 0
      ? new Date(timestamps[timestamps.length - 1]!).toISOString()
      : new Date().toISOString();

  // Hours active
  const hourSet = new Set<number>();
  for (const timestamp of timestamps) {
    const hour = new Date(timestamp).getHours();
    hourSet.add(hour);
  }
  const hoursActive = hourSet.size;

  // Night time access (22:00-06:00)
  const nightTimeAccessCount = userLogs.filter((log: NormalizedLog) => {
    const hour = new Date(log.timestamp).getHours();
    return hour >= 22 || hour < 6;
  }).length;

  // Weekend activity
  const weekendCount = userLogs.filter((log: NormalizedLog) => {
    const day = new Date(log.timestamp).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }).length;
  const weekendActivityLevel =
    totalRequests > 0 ? weekendCount / totalRequests : 0;

  // ===== DATA TRANSFER PATTERNS =====
  const responseSizes = userLogs
    .map((log: NormalizedLog) => log.response_size_bytes || 0)
    .filter((size: number) => size > 0);
  const totalDataTransferred = responseSizes.reduce(
    (a: number, b: number) => a + b,
    0,
  );
  const avgDataPerRequest =
    totalRequests > 0 ? totalDataTransferred / totalRequests : 0;

  const largeDataTransferCount = responseSizes.filter(
    (size: number) => size > 100 * 1024 * 1024,
  ).length; // > 100MB

  // Download vs upload ratio (approximate from request/response sizes)
  const requestSizes = userLogs
    .map((log: NormalizedLog) => log.request_size_bytes || 0)
    .filter((size: number) => size > 0);
  const totalRequestSize = requestSizes.reduce(
    (a: number, b: number) => a + b,
    0,
  );
  const downloadToUploadRatio =
    totalRequestSize > 0 ? totalDataTransferred / totalRequestSize : 1;

  // ===== SESSION PATTERNS =====
  const uniqueSessionsCount = ctx.sessions.filter(
    (s) => s.userId === username,
  ).length;
  const avgSessionDuration =
    uniqueSessionsCount > 0
      ? ctx.sessions
          .filter((s) => s.userId === username)
          .reduce(
            (sum, s) =>
              sum +
              (new Date(s.endTime).getTime() -
                new Date(s.startTime).getTime()) /
                1000,
            0,
          ) / uniqueSessionsCount
      : 0;

  const longSessionCount = ctx.sessions.filter(
    (s) =>
      s.userId === username &&
      (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000 >
        3600, // > 1 hour
  ).length;

  // Concurrent sessions (sessions that overlap in time)
  const concurrentSessionCount = calculateConcurrentSessions(
    ctx.sessions.filter((s) => s.userId === username),
  );

  // ===== DAILY SESSION PATTERNS =====
  const dayMap = new Map<string, number>();
  for (const session of ctx.sessions.filter((s) => s.userId === username)) {
    const day = new Date(session.startTime).toDateString();
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  const avgSessionsPerDay =
    dayMap.size > 0 ? uniqueSessionsCount / dayMap.size : 0;

  // Max sessions in one hour
  const hourMap = new Map<string, number>();
  for (const session of ctx.sessions.filter((s) => s.userId === username)) {
    const hourKey = new Date(session.startTime).toISOString().substring(0, 13);
    hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + 1);
  }
  const maxSessionsInOneHour =
    hourMap.size > 0 ? Math.max(...Array.from(hourMap.values())) : 0;

  // ===== CONSTRUCT FEATURE VECTOR =====
  return {
    entity: `user:${username}`,
    loginAttempts,
    failedLogins,
    successfulLogins,
    loginFailureRatio,
    distinctIpsUsed,
    geographicDiversityScore,
    totalRequests,
    distinctEndpointsAccessed,
    endpointAccessConcentration: endpointConcentration,
    uniqueSessionsCount,
    avgSessionDuration,
    adminAccessAttempts,
    privilegeEscalationAttempts,
    criticalResourceAccesses,
    userErrorRate,
    httpErrorCount,
    uniqueErrorTypes,
    firstActivityTime,
    lastActivityTime,
    hoursActive,
    nightTimeAccessCount,
    weekendActivityLevel,
    totalDataTransferred,
    avgDataPerRequest,
    largeDataTransferCount,
    downloadToUploadRatio,
    avgSessionsPerDay,
    maxSessionsInOneHour,
    longSessionCount,
    concurrentSessionCount,
    timestamp: new Date().toISOString(),
    jobId: ctx.jobId,
  };
}

/**
 * Calculate endpoint concentration score
 */
function calculateEndpointConcentration(
  endpointMap: Map<string, number>,
): number {
  if (endpointMap.size === 0) return 0;
  if (endpointMap.size === 1) return 1;

  const total = Array.from(endpointMap.values()).reduce((a, b) => a + b, 0);
  const probabilities = Array.from(endpointMap.values()).map(
    (count) => count / total,
  );

  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(endpointMap.size);
  const normalizedEntropy = entropy / maxEntropy;

  return 1 - normalizedEntropy;
}

/**
 * Calculate how many sessions overlap in time
 */
function calculateConcurrentSessions(
  sessions: Array<{ startTime: Date; endTime: Date }>,
): number {
  if (sessions.length <= 1) return 0;

  let maxConcurrent = 0;

  for (let i = 0; i < sessions.length; i++) {
    let concurrent = 1;

    for (let j = 0; j < sessions.length; j++) {
      if (i === j) continue;

      // Check if session j overlaps with session i
      const overlap =
        sessions[j]!.startTime < sessions[i]!.endTime &&
        sessions[j]!.endTime > sessions[i]!.startTime;

      if (overlap) {
        concurrent++;
      }
    }

    maxConcurrent = Math.max(maxConcurrent, concurrent);
  }

  return maxConcurrent;
}
