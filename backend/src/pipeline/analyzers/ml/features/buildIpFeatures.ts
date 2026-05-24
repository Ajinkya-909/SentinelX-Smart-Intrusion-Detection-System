/**
 * IP Feature Extraction
 *
 * Extracts behavioral features for each IP address from the AnalysisContext.
 * These features capture request patterns, authentication behavior, error patterns,
 * and temporal characteristics that ML algorithms can analyze for anomalies.
 */

import {
  AnalysisContext,
  NormalizedLog,
} from "../../shared/context/AnalysisContext";
import { IpFeatureVector } from "../types/features.types";
import logger from "../../../../config/logger";

/**
 * Calculate entropy of values in a set (0-1, higher = more diverse)
 */
function calculateEntropy(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Normalize to 0-1 scale (entropy proxy)
  // High stdDev = high variance = high entropy
  return Math.min(stdDev / (mean + 0.1), 1);
}

/**
 * Calculate concentration score (0-1, higher = more concentrated)
 * Inverse of entropy - how focused requests are on few endpoints
 */
function calculateConcentration(items: Map<string, number>): number {
  if (items.size === 0) return 0;
  if (items.size === 1) return 1;

  const total = Array.from(items.values()).reduce((a, b) => a + b, 0);
  const probabilities = Array.from(items.values()).map(
    (count) => count / total,
  );

  // Shannon entropy
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize: max entropy = log2(size), return 1 - normalized_entropy
  const maxEntropy = Math.log2(items.size);
  const normalizedEntropy = entropy / maxEntropy;

  // Return concentration (inverse of entropy)
  return 1 - normalizedEntropy;
}

/**
 * Build IP feature vectors from AnalysisContext
 *
 * For each unique IP in the logs, extract behavioral metrics
 */
export function buildIpFeatures(ctx: AnalysisContext): IpFeatureVector[] {
  const startTime = Date.now();
  const features: IpFeatureVector[] = [];

  try {
    // Group logs by IP address
    const ipMap = new Map<string, typeof ctx.logs>();

    for (const log of ctx.logs) {
      if (!log.ip_address) continue;

      if (!ipMap.has(log.ip_address)) {
        ipMap.set(log.ip_address, []);
      }
      ipMap.get(log.ip_address)!.push(log);
    }

    // Build feature vector for each IP
    for (const [ip, ipLogs] of ipMap) {
      const vector = extractIpFeatures(ip, ipLogs, ctx);
      features.push(vector);
    }

    const executionTime = Date.now() - startTime;
    logger.debug(
      `[IP FEATURE EXTRACTION] Extracted ${features.length} IP feature vectors in ${executionTime}ms`,
    );

    return features;
  } catch (error) {
    logger.error(
      `[IP FEATURE EXTRACTION] Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Extract features for a single IP
 */
function extractIpFeatures(
  ip: string,
  ipLogs: NormalizedLog[],
  ctx: AnalysisContext,
): IpFeatureVector {
  // ===== BASIC COUNTS =====
  const requestCount = ipLogs.length;
  const errorLogs = ipLogs.filter(
    (log: NormalizedLog) => log.status_code >= 400,
  );
  const errorCount = errorLogs.length;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  // ===== AUTHENTICATION BEHAVIOR =====
  const authLogs = ipLogs.filter((log: NormalizedLog) =>
    log.event_type?.toUpperCase().includes("AUTH"),
  );
  const failedAuthLogs = ipLogs.filter(
    (log: NormalizedLog) =>
      log.event_type?.toUpperCase().includes("AUTH") && log.status_code >= 400,
  );
  const successfulAuthLogs = ipLogs.filter(
    (log: NormalizedLog) =>
      log.event_type?.toUpperCase().includes("AUTH") && log.status_code < 400,
  );

  const failedLoginAttempts = failedAuthLogs.length;
  const successfulLoginCount = successfulAuthLogs.length;
  const authTotal = failedLoginAttempts + successfulLoginCount;
  const authFailureRatio = authTotal > 0 ? failedLoginAttempts / authTotal : 0;

  // ===== REQUEST TIMING PATTERNS =====
  const timestamps = ipLogs
    .map((log: NormalizedLog) => new Date(log.timestamp).getTime())
    .sort((a: number, b: number) => a - b);

  let avgRequestIntervalSeconds = 0;
  let maxRequestIntervalSeconds = 0;
  let minRequestIntervalSeconds = Infinity;
  let requestBurstSize = 0;

  if (timestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const interval = (timestamps[i]! - timestamps[i - 1]!) / 1000; // seconds
      intervals.push(interval);
      maxRequestIntervalSeconds = Math.max(maxRequestIntervalSeconds, interval);
      minRequestIntervalSeconds = Math.min(minRequestIntervalSeconds, interval);
    }

    avgRequestIntervalSeconds =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Calculate request burst size (max requests in 1-minute windows)
    for (const timeBucket of ctx.timeBuckets.values()) {
      const bucketIpCount = timeBucket.filter(
        (log) => log.ip_address === ip,
      ).length;
      requestBurstSize = Math.max(requestBurstSize, bucketIpCount);
    }
  }

  if (minRequestIntervalSeconds === Infinity) {
    minRequestIntervalSeconds = 0;
  }

  // ===== ENDPOINT ACCESS PATTERNS =====
  const endpointMap = new Map<string, number>();
  for (const log of ipLogs) {
    if (log.endpoint) {
      endpointMap.set(log.endpoint, (endpointMap.get(log.endpoint) || 0) + 1);
    }
  }

  const uniqueEndpointsAccessed = endpointMap.size;
  const endpointConcentration = calculateConcentration(endpointMap);

  // ===== USER AGENT DIVERSITY =====
  const userAgents = new Set<string>();
  for (const log of ipLogs) {
    if (log.user_agent) {
      userAgents.add(log.user_agent);
    }
  }
  const uniqueUserAgents = userAgents.size;
  const protocolDiversity = Math.min(
    userAgents.size / Math.max(requestCount / 5, 1),
    1,
  );

  // ===== HTTP STATUS ANALYSIS =====
  const http4xxCount = ipLogs.filter(
    (log: NormalizedLog) => log.status_code >= 400 && log.status_code < 500,
  ).length;
  const http5xxCount = ipLogs.filter(
    (log: NormalizedLog) => log.status_code >= 500,
  ).length;

  // ===== ERROR TYPES =====
  const errorTypeSet = new Set<string>();
  for (const log of errorLogs) {
    if (log.event_type) {
      errorTypeSet.add(log.event_type);
    }
  }
  const uniqueErrorTypes = errorTypeSet.size;

  // ===== TEMPORAL PATTERNS =====
  const hourMap = new Map<number, number>();
  for (const timestamp of timestamps) {
    const hour = new Date(timestamp).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  }

  const hoursActive = hourMap.size;
  const timeOfDayEntropy = calculateEntropy(Array.from(hourMap.values()));
  const accessTimeConsistency = 1 - timeOfDayEntropy;

  // ===== RESPONSE SIZE PATTERNS =====
  const responseSizes = ipLogs
    .map((log: NormalizedLog) => log.response_size_bytes || 0)
    .filter((size: number) => size > 0);

  const avgResponseSizeBytes =
    responseSizes.length > 0
      ? responseSizes.reduce((a: number, b: number) => a + b, 0) /
        responseSizes.length
      : 0;

  const maxResponseSizeBytes =
    responseSizes.length > 0 ? Math.max(...responseSizes) : 0;

  const largeResponseCount = responseSizes.filter(
    (size: number) => size > 1024 * 1024,
  ).length; // > 1MB

  // ===== PAYLOAD ANOMALIES =====
  // For now, count suspicious patterns in messages
  const payloadAnomalies = ipLogs.filter(
    (log: NormalizedLog) =>
      log.message &&
      (log.message.includes("payload") ||
        log.message.includes("injection") ||
        log.message.includes("traversal")),
  ).length;

  // ===== AUTH ATTEMPTS PER MINUTE =====
  const authMinutes = new Set<string>();
  for (const log of authLogs) {
    const date = new Date(log.timestamp);
    const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    authMinutes.add(minuteKey);
  }
  const loginAttemptsPerMinute =
    authMinutes.size > 0 ? authLogs.length / authMinutes.size : 0;

  // ===== CONSTRUCT FEATURE VECTOR =====
  return {
    entity: `ip:${ip}`,
    requestCount,
    uniqueEndpointsAccessed,
    avgRequestIntervalSeconds,
    maxRequestIntervalSeconds,
    minRequestIntervalSeconds,
    requestBurstSize,
    failedLoginAttempts,
    successfulLoginCount,
    authFailureRatio,
    loginAttemptsPerMinute,
    errorCount,
    errorRate,
    uniqueErrorTypes,
    http4xxCount,
    http5xxCount,
    endpointConcentration,
    protocolDiversity,
    userAgentCount: uniqueUserAgents,
    uniqueUserAgents,
    timeOfDayEntropy,
    accessTimeConsistency,
    hoursActive,
    avgResponseSizeBytes,
    maxResponseSizeBytes,
    largeResponseCount,
    payloadAnomalies,
    timestamp: new Date().toISOString(),
    jobId: ctx.jobId,
  };
}
