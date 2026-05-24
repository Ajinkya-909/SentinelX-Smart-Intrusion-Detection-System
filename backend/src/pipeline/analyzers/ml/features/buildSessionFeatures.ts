/**
 * Session Feature Extraction
 *
 * Extracts behavioral features for each session from the AnalysisContext.
 * These features capture session-level patterns including request velocity,
 * resource access, error rates, and temporal characteristics.
 */

import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { SessionFeatureVector } from "../types/features.types";
import logger from "../../../../config/logger";

/**
 * Build session feature vectors from AnalysisContext
 *
 * For each session, extract behavioral metrics
 */
export function buildSessionFeatures(
  ctx: AnalysisContext,
): SessionFeatureVector[] {
  const startTime = Date.now();
  const features: SessionFeatureVector[] = [];

  try {
    // Extract features for each session
    for (const session of ctx.sessions) {
      const vector = extractSessionFeatures(session, ctx);
      features.push(vector);
    }

    const executionTime = Date.now() - startTime;
    logger.debug(
      `[SESSION FEATURE EXTRACTION] Extracted ${features.length} session feature vectors in ${executionTime}ms`,
    );

    return features;
  } catch (error) {
    logger.error(
      `[SESSION FEATURE EXTRACTION] Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Extract features for a single session
 */
function extractSessionFeatures(
  session: any,
  ctx: AnalysisContext,
): SessionFeatureVector {
  const sessionLogs = session.events || [];

  // ===== SESSION BASICS =====
  const sessionId = session.sessionId;
  const username = session.userId;
  const ipAddress = Array.from(session.ipAddresses)[0] || "unknown"; // Get first IP

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  // ===== REQUEST BEHAVIOR WITHIN SESSION =====
  const requestCount = sessionLogs.length;
  const durationMinutes = durationSeconds / 60 || 1;
  const requestsPerMinute = requestCount / durationMinutes;

  // Request velocity analysis
  const timestamps = sessionLogs
    .map((log: any) => new Date(log.timestamp).getTime())
    .sort((a: number, b: number) => a - b);

  let maxRequestsInOneMinute = 0;
  let avgTimeBetweenRequests = 0;
  let requestIntervalVariance = 0;

  if (timestamps.length > 1) {
    // Find max requests in any 1-minute window
    for (let i = 0; i < timestamps.length; i++) {
      const windowStart = timestamps[i];
      const windowEnd = windowStart + 60000; // 1 minute
      const requestsInWindow = timestamps.filter(
        (t) => t >= windowStart && t < windowEnd,
      ).length;
      maxRequestsInOneMinute = Math.max(
        maxRequestsInOneMinute,
        requestsInWindow,
      );
    }

    // Calculate average time between requests
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const interval = (timestamps[i] - timestamps[i - 1]) / 1000; // seconds
      intervals.push(interval);
    }

    avgTimeBetweenRequests =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Calculate variance (consistency of request timing)
    const mean = avgTimeBetweenRequests;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - mean, 2),
        0,
      ) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Normalize variance to 0-1 scale
    requestIntervalVariance = Math.min(stdDev / (mean + 0.1), 1);
  }

  // ===== RESOURCE ACCESS =====
  const endpointSet = new Set<string>();
  const modifyingMethods = ["POST", "PUT", "DELETE", "PATCH"];
  let resourcesModified = 0;

  let dataUploadedBytes = 0;
  let dataDownloadedBytes = 0;

  for (const log of sessionLogs) {
    if (log.endpoint) {
      endpointSet.add(log.endpoint);
    }

    if (log.http_method && modifyingMethods.includes(log.http_method)) {
      resourcesModified++;
    }

    if (log.request_size_bytes) {
      dataUploadedBytes += log.request_size_bytes;
    }

    if (log.response_size_bytes) {
      dataDownloadedBytes += log.response_size_bytes;
    }
  }

  const uniqueEndpointsAccessed = endpointSet.size;
  const endpointAccessPattern = calculateEndpointPattern(sessionLogs);

  // ===== ERROR PATTERNS =====
  const errorLogs = sessionLogs.filter((log: any) => log.status_code >= 400);
  const errorCount = errorLogs.length;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  const failedAuthAttemptsInSession = sessionLogs.filter(
    (log: any) =>
      log.event_type?.toUpperCase().includes("AUTH") && log.status_code >= 400,
  ).length;

  const http4xxCount = sessionLogs.filter(
    (log: any) => log.status_code >= 400 && log.status_code < 500,
  ).length;

  const http5xxCount = sessionLogs.filter(
    (log: any) => log.status_code >= 500,
  ).length;

  // ===== TEMPORAL PATTERNS =====
  const timeOfDayScore = calculateTimeOfDayScore(startTime);
  const isNightTime = isNightTimeHour(startTime);
  const isWeekend = isWeekendDay(startTime);
  const sessionSpanHours = durationSeconds / 3600;

  // ===== PROTOCOL PATTERNS =====
  const methodSet = new Set<string>();
  for (const log of sessionLogs) {
    if (log.http_method) {
      methodSet.add(log.http_method);
    }
  }
  const methodDiversity = Math.min(methodSet.size / 5, 1); // normalize to 5 common methods

  // Protocol changes (assuming http_method indicates protocol type)
  const protocolChanges = calculateProtocolChanges(sessionLogs);

  // ===== ANOMALY INDICATORS =====
  const payloadAnomalyCount = sessionLogs.filter(
    (log: any) =>
      log.message &&
      (log.message.includes("payload") ||
        log.message.includes("injection") ||
        log.message.includes("traversal") ||
        log.message.includes("overflow")),
  ).length;

  const suspiciousEventCount = sessionLogs.filter(
    (log: any) =>
      log.severity === "CRITICAL" ||
      log.event_type?.includes("SUSPICIOUS") ||
      log.message?.includes("suspicious"),
  ).length;

  const criticalResourceAccessCount = sessionLogs.filter(
    (log: any) =>
      log.endpoint?.includes("/admin") ||
      log.endpoint?.includes("/config") ||
      log.message?.includes("admin"),
  ).length;

  // ===== CONSTRUCT FEATURE VECTOR =====
  return {
    entity: `session:${sessionId}`,
    sessionId,
    username,
    ipAddress,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds,
    requestCount,
    requestsPerMinute,
    maxRequestsInOneMinute,
    avgTimeBetweenRequests,
    requestIntervalVariance,
    uniqueEndpointsAccessed,
    endpointAccessPattern,
    resourcesModified,
    dataUploadedBytes,
    dataDownloadedBytes,
    errorCount,
    errorRate,
    failedAuthAttemptsInSession,
    http4xxCount,
    http5xxCount,
    timeOfDayScore,
    isNightTime,
    isWeekend,
    sessionSpanHours,
    methodDiversity,
    protocolChanges,
    payloadAnomalyCount,
    suspiciousEventCount,
    criticalResourceAccessCount,
    timestamp: new Date().toISOString(),
    jobId: ctx.jobId,
  };
}

/**
 * Calculate endpoint access pattern concentration
 */
function calculateEndpointPattern(logs: any[]): number {
  const endpointMap = new Map<string, number>();

  for (const log of logs) {
    if (log.endpoint) {
      endpointMap.set(log.endpoint, (endpointMap.get(log.endpoint) || 0) + 1);
    }
  }

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
 * Calculate how "normal" the time of day is (0-1)
 * Business hours (08:00-20:00) = 1.0, off-hours = lower
 */
function calculateTimeOfDayScore(date: Date): number {
  const hour = date.getHours();

  // Peak business hours (9-17)
  if (hour >= 9 && hour <= 17) return 1.0;

  // Extended business hours (8-20)
  if (hour >= 8 && hour <= 20) return 0.8;

  // Evening (20-22)
  if (hour >= 20 && hour < 22) return 0.6;

  // Very early morning (6-8)
  if (hour >= 6 && hour < 8) return 0.6;

  // Night (22-06)
  return 0.2;
}

/**
 * Check if hour is night time (22:00-06:00)
 */
function isNightTimeHour(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

/**
 * Check if day is weekend
 */
function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Count protocol/method changes in session
 */
function calculateProtocolChanges(logs: any[]): number {
  if (logs.length <= 1) return 0;

  let changes = 0;
  for (let i = 1; i < logs.length; i++) {
    const prevMethod = logs[i - 1].http_method;
    const currMethod = logs[i].http_method;

    if (prevMethod && currMethod && prevMethod !== currMethod) {
      changes++;
    }
  }

  return changes;
}
