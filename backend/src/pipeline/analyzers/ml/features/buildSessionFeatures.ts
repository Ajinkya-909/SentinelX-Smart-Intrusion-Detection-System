import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { SessionFeatureVector } from "../types/features.types";

export function extractSessionFeatures(
  session: any,
  ctx: AnalysisContext,
): SessionFeatureVector {
  const sessionLogs = session.events || [];

  const sessionId = session.sessionId;
  const username = session.userId;
  const ipAddress = (Array.from(session.ipAddresses)[0] ?? "unknown") as string;

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  const requestCount = sessionLogs.length;
  const durationMinutes = durationSeconds / 60 || 1;
  const requestsPerMinute = requestCount / durationMinutes;

  const timestamps = sessionLogs.map((log: any) => new Date(log.timestamp).getTime()).sort((a: number, b: number) => a - b);
  let maxRequestsInOneMinute = 0;
  let avgTimeBetweenRequests = 0;
  let requestIntervalVariance = 0;

  if (timestamps.length > 1) {
    for (let i = 0; i < timestamps.length; i++) {
      const windowStart = timestamps[i]!;
      const windowEnd = windowStart + 60000;
      const requestsInWindow = timestamps.filter((t: number) => t >= windowStart && t < windowEnd).length;
      maxRequestsInOneMinute = Math.max(maxRequestsInOneMinute, requestsInWindow);
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push((timestamps[i]! - timestamps[i - 1]!) / 1000);
    }
    avgTimeBetweenRequests = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const mean = avgTimeBetweenRequests;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    requestIntervalVariance = Math.min(Math.sqrt(variance) / (mean + 0.1), 1);
  }

  const endpointSet = new Set<string>();
  const modifyingMethods = ["POST", "PUT", "DELETE", "PATCH"];
  let resourcesModified = 0;
  let dataDownloadedBytes = 0;

  for (const log of sessionLogs) {
    const endpoint = log.metadata?.action?.endpoint;
    const method = log.metadata?.action?.method;
    const bytes = Number(log.metadata?.parserMetadata?.bytes) || 0;

    if (endpoint) endpointSet.add(endpoint);
    if (method && modifyingMethods.includes(method.toUpperCase())) resourcesModified++;
    if (bytes) dataDownloadedBytes += bytes;
  }

  const uniqueEndpointsAccessed = endpointSet.size;
  const endpointAccessPattern = calculateEndpointPattern(sessionLogs);

  const errorLogs = sessionLogs.filter((log: any) => (log.metadata?.request?.statusCode || 200) >= 400);
  const errorCount = errorLogs.length;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  const failedAuthAttemptsInSession = sessionLogs.filter((log: any) => log.metadata?.security?.authSuccess === false).length;
  const http4xxCount = sessionLogs.filter((log: any) => {
      const code = log.metadata?.request?.statusCode || 200;
      return code >= 400 && code < 500;
  }).length;
  const http5xxCount = sessionLogs.filter((log: any) => (log.metadata?.request?.statusCode || 200) >= 500).length;

  const timeOfDayScore = calculateTimeOfDayScore(startTime);
  const isNightTime = isNightTimeHour(startTime);
  const isWeekend = isWeekendDay(startTime);
  const sessionSpanHours = durationSeconds / 3600;

  const methodSet = new Set<string>();
  for (const log of sessionLogs) {
    if (log.metadata?.action?.method) methodSet.add(log.metadata.action.method);
  }
  const methodDiversity = Math.min(methodSet.size / 5, 1);
  const protocolChanges = calculateProtocolChanges(sessionLogs);

  const payloadAnomalyCount = sessionLogs.filter((log: any) => log.severity === "CRITICAL" || log.severity === "HIGH").length;
  const suspiciousEventCount = payloadAnomalyCount;
  const criticalResourceAccessCount = sessionLogs.filter((log: any) => log.metadata?.action?.endpoint?.includes("/admin")).length;

  return {
    entity: `session:${sessionId}`, sessionId, username, ipAddress, startTime: startTime.toISOString(),
    endTime: endTime.toISOString(), durationSeconds, requestCount, requestsPerMinute, maxRequestsInOneMinute,
    avgTimeBetweenRequests, requestIntervalVariance, uniqueEndpointsAccessed, endpointAccessPattern,
    resourcesModified, dataUploadedBytes: 0, dataDownloadedBytes, errorCount, errorRate,
    failedAuthAttemptsInSession, http4xxCount, http5xxCount, timeOfDayScore, isNightTime, isWeekend,
    sessionSpanHours, methodDiversity, protocolChanges, payloadAnomalyCount, suspiciousEventCount,
    criticalResourceAccessCount, timestamp: new Date().toISOString(), jobId: ctx.jobId,
  };
}

// FIX: Helper needs to look at correct endpoint
function calculateEndpointPattern(logs: any[]): number {
  const endpointMap = new Map<string, number>();
  for (const log of logs) {
    const endpoint = log.metadata?.action?.endpoint;
    if (endpoint) endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1);
  }
  if (endpointMap.size === 0) return 0;
  if (endpointMap.size === 1) return 1;

  const total = Array.from(endpointMap.values()).reduce((a, b) => a + b, 0);
  const probabilities = Array.from(endpointMap.values()).map(count => count / total);
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return 1 - (entropy / Math.log2(endpointMap.size));
}

// FIX: Helper needs to look at correct method
function calculateProtocolChanges(logs: any[]): number {
  if (logs.length <= 1) return 0;
  let changes = 0;
  for (let i = 1; i < logs.length; i++) {
    const prevMethod = logs[i - 1].metadata?.action?.method;
    const currMethod = logs[i].metadata?.action?.method;
    if (prevMethod && currMethod && prevMethod !== currMethod) changes++;
  }
  return changes;
}

// Time-of-day scoring: normalized (0-1) where 1 is very unusual
function calculateTimeOfDayScore(startTime: Date): number {
  const hour = startTime.getHours();
  // simple heuristic: daytime (8-20) normal; night is anomalous
  if (hour >= 8 && hour < 20) return 0;
  return 1;
}

function isNightTimeHour(d: Date): boolean {
  const h = d.getHours();
  return h >= 22 || h < 6;
}

function isWeekendDay(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}