import { NormalizedLog, AnalysisContext } from "../../shared/context/AnalysisContext";
import { IpFeatureVector } from "../types/features.types";

export function extractIpFeatures(
  ip: string,
  ipLogs: NormalizedLog[],
  ctx: AnalysisContext,
): IpFeatureVector {
  // ===== BASIC COUNTS =====
  const requestCount = ipLogs.length;
  // FIX: Use metadata.request.statusCode
  const errorLogs = ipLogs.filter(log => (log.metadata?.request?.statusCode || 200) >= 400);
  const errorCount = errorLogs.length;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  // ===== AUTHENTICATION BEHAVIOR =====
  // FIX: Rely on normalizer's security context
  const authLogs = ipLogs.filter(log => log.metadata?.security !== undefined || log.event_type.includes("LOGIN"));
  const failedAuthLogs = authLogs.filter(log => log.metadata?.security?.authSuccess === false);
  const successfulAuthLogs = authLogs.filter(log => log.metadata?.security?.authSuccess === true);

  const failedLoginAttempts = failedAuthLogs.length;
  const successfulLoginCount = successfulAuthLogs.length;
  const authTotal = failedLoginAttempts + successfulLoginCount;
  const authFailureRatio = authTotal > 0 ? failedLoginAttempts / authTotal : 0;

  // ===== REQUEST TIMING PATTERNS =====
  const timestamps = ipLogs
    .map(log => new Date(log.timestamp).getTime())
    .sort((a, b) => a - b);

  let avgRequestIntervalSeconds = 0;
  let maxRequestIntervalSeconds = 0;
  let minRequestIntervalSeconds = Infinity;
  let requestBurstSize = 0;

  if (timestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const interval = (timestamps[i]! - timestamps[i - 1]!) / 1000;
      intervals.push(interval);
      maxRequestIntervalSeconds = Math.max(maxRequestIntervalSeconds, interval);
      minRequestIntervalSeconds = Math.min(minRequestIntervalSeconds, interval);
    }
    avgRequestIntervalSeconds = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    for (const timeBucket of ctx.timeBuckets.values()) {
      const bucketIpCount = timeBucket.filter((log: any) => log.ip_address === ip).length;
      requestBurstSize = Math.max(requestBurstSize, bucketIpCount);
    }
  }

  if (minRequestIntervalSeconds === Infinity) minRequestIntervalSeconds = 0;

  // ===== ENDPOINT ACCESS PATTERNS =====
  const endpointMap = new Map<string, number>();
  for (const log of ipLogs) {
    const endpoint = log.metadata?.action?.endpoint; // FIX
    if (endpoint) {
      endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1);
    }
  }
  const uniqueEndpointsAccessed = endpointMap.size;
  const endpointConcentration = calculateConcentration(endpointMap);

  // ===== USER AGENT DIVERSITY =====
  const userAgents = new Set<string>();
  for (const log of ipLogs) {
    const ua = log.metadata?.client?.userAgent; // FIX
    if (ua) userAgents.add(ua);
  }
  const uniqueUserAgents = userAgents.size;
  const protocolDiversity = Math.min(userAgents.size / Math.max(requestCount / 5, 1), 1);

  // ===== HTTP STATUS ANALYSIS =====
  const http4xxCount = ipLogs.filter(log => {
    const code = log.metadata?.request?.statusCode || 200;
    return code >= 400 && code < 500;
  }).length;
  const http5xxCount = ipLogs.filter(log => (log.metadata?.request?.statusCode || 200) >= 500).length;

  // ===== ERROR TYPES =====
  const errorTypeSet = new Set<string>();
  for (const log of errorLogs) {
    if (log.event_type) errorTypeSet.add(log.event_type);
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
  // FIX: Map to parserMetadata.bytes
  const responseSizes = ipLogs
    .map(log => Number(log.metadata?.parserMetadata?.bytes) || 0)
    .filter(size => size > 0);

  const avgResponseSizeBytes = responseSizes.length > 0 ? responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length : 0;
  const maxResponseSizeBytes = responseSizes.length > 0 ? Math.max(...responseSizes) : 0;
  const largeResponseCount = responseSizes.filter(size => size > 1024 * 1024).length;

  // ===== PAYLOAD ANOMALIES =====
  const payloadAnomalies = ipLogs.filter(log => 
    log.severity === "CRITICAL" || log.severity === "HIGH" // Let normalizer dictate payload anomalies
  ).length;

  // ===== AUTH ATTEMPTS PER MINUTE =====
  const authMinutes = new Set<string>();
  for (const log of authLogs) {
    const date = new Date(log.timestamp);
    authMinutes.add(`${date.getFullYear()}-${date.getHours()}-${date.getMinutes()}`);
  }
  const loginAttemptsPerMinute = authMinutes.size > 0 ? authLogs.length / authMinutes.size : 0;

  return {
    entity: `ip:${ip}`, requestCount, uniqueEndpointsAccessed, avgRequestIntervalSeconds,
    maxRequestIntervalSeconds, minRequestIntervalSeconds, requestBurstSize, failedLoginAttempts,
    successfulLoginCount, authFailureRatio, loginAttemptsPerMinute, errorCount, errorRate,
    uniqueErrorTypes, http4xxCount, http5xxCount, endpointConcentration, protocolDiversity,
    userAgentCount: uniqueUserAgents, uniqueUserAgents, timeOfDayEntropy, accessTimeConsistency,
    hoursActive, avgResponseSizeBytes, maxResponseSizeBytes, largeResponseCount, payloadAnomalies,
    timestamp: new Date().toISOString(), jobId: ctx.jobId,
  };
}

// Helper: concentration metric (0-1) - how focused counts are on top endpoints
function calculateConcentration(map: Map<string, number>): number {
  if (!map || map.size === 0) return 0;
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  const max = Math.max(...Array.from(map.values()));
  return total > 0 ? Math.min(1, max / total) : 0;
}

// Helper: normalized Shannon entropy (0-1)
function calculateEntropy(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = values.map(v => v / total).filter(p => p > 0);
  let entropy = 0;
  for (const p of probs) entropy -= p * Math.log2(p);
  return entropy / Math.log2(values.length || 1);
}