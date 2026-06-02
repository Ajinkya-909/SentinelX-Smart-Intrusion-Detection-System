import { NormalizedLog, AnalysisContext } from "../../shared/context/AnalysisContext";
import { UserFeatureVector } from "../types/features.types";

export function extractUsername(log: any): string | null {
  // FIX: Strictly use the new context-aware actor metadata
  return log.metadata?.actor?.username || null;
}

export function extractUserFeatures(
  username: string,
  userLogs: NormalizedLog[],
  ctx: AnalysisContext,
): UserFeatureVector {
  const totalRequests = userLogs.length;
  const errorCount = userLogs.filter(log => (log.metadata?.request?.statusCode || 200) >= 400).length;
  const userErrorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
  const httpErrorCount = errorCount;

  // ===== LOGIN BEHAVIOR =====
  const authLogs = userLogs.filter(log => log.metadata?.security !== undefined);
  const failedLogins = authLogs.filter(log => log.metadata?.security?.authSuccess === false).length;
  const successfulLogins = authLogs.filter(log => log.metadata?.security?.authSuccess === true).length;
  const loginAttempts = authLogs.length;
  const loginFailureRatio = loginAttempts > 0 ? failedLogins / loginAttempts : 0;

  // ===== IP DIVERSITY =====
  const ips = new Set<string>();
  for (const log of userLogs) {
    if (log.ip_address) ips.add(log.ip_address);
  }
  const distinctIpsUsed = ips.size;
  const geographicDiversityScore = Math.min(distinctIpsUsed / 5, 1);

  // ===== ENDPOINT ACCESS =====
  const endpointMap = new Map<string, number>();
  for (const log of userLogs) {
    const endpoint = log.metadata?.action?.endpoint;
    if (endpoint) endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1);
  }
  const distinctEndpointsAccessed = endpointMap.size;
  const endpointConcentration = calculateEndpointConcentration(endpointMap);

  // ===== PRIVILEGE & ADMIN ACCESS =====
  const adminAccessAttempts = userLogs.filter(log => log.metadata?.action?.endpoint?.includes("/admin")).length;
  const privilegeEscalationAttempts = userLogs.filter(log => log.event_type === "PRIVILEGE_ESCALATION").length;
  const criticalResourceAccesses = userLogs.filter(log => log.severity === "CRITICAL" || log.severity === "HIGH").length;

  // ===== ERROR PATTERNS =====
  const errorTypeSet = new Set<string>();
  for (const log of userLogs.filter(l => (l.metadata?.request?.statusCode || 200) >= 400)) {
    if (log.event_type) errorTypeSet.add(log.event_type);
  }
  const uniqueErrorTypes = errorTypeSet.size;

  // ===== TEMPORAL PATTERNS =====
  const timestamps = userLogs.map(log => new Date(log.timestamp).getTime()).sort((a, b) => a - b);
  const firstActivityTime = timestamps.length > 0 ? new Date(timestamps[0]!).toISOString() : new Date().toISOString();
  const lastActivityTime = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]!).toISOString() : new Date().toISOString();

  const hourSet = new Set<number>();
  for (const timestamp of timestamps) hourSet.add(new Date(timestamp).getHours());
  const hoursActive = hourSet.size;

  const nightTimeAccessCount = userLogs.filter(log => {
    const hour = new Date(log.timestamp).getHours();
    return hour >= 22 || hour < 6;
  }).length;

  const weekendCount = userLogs.filter(log => {
    const day = new Date(log.timestamp).getDay();
    return day === 0 || day === 6;
  }).length;
  const weekendActivityLevel = totalRequests > 0 ? weekendCount / totalRequests : 0;

  // ===== DATA TRANSFER PATTERNS =====
  const responseSizes = userLogs.map(log => Number(log.metadata?.parserMetadata?.bytes) || 0).filter(size => size > 0);
  const totalDataTransferred = responseSizes.reduce((a, b) => a + b, 0);
  const avgDataPerRequest = totalRequests > 0 ? totalDataTransferred / totalRequests : 0;
  const largeDataTransferCount = responseSizes.filter(size => size > 100 * 1024 * 1024).length;
  const downloadToUploadRatio = 1; // Simplified since we unified bytes

  // ===== SESSION PATTERNS =====
  const uniqueSessionsCount = ctx.sessions.filter((s: any) => s.userId === username).length;
  const avgSessionDuration = uniqueSessionsCount > 0
      ? ctx.sessions.filter((s: any) => s.userId === username).reduce((sum: number, s: any) => sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000, 0) / uniqueSessionsCount
      : 0;

  const longSessionCount = ctx.sessions.filter((s: any) => s.userId === username && (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000 > 3600).length;
  const concurrentSessionCount = calculateConcurrentSessions(ctx.sessions.filter((s: any) => s.userId === username));

  const dayMap = new Map<string, number>();
  for (const session of ctx.sessions.filter((s: any) => s.userId === username)) {
    const day = new Date(session.startTime).toDateString();
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  const avgSessionsPerDay = dayMap.size > 0 ? uniqueSessionsCount / dayMap.size : 0;

  const hourMap = new Map<string, number>();
  for (const session of ctx.sessions.filter((s: any) => s.userId === username)) {
    const hourKey = new Date(session.startTime).toISOString().substring(0, 13);
    hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + 1);
  }
  const maxSessionsInOneHour = hourMap.size > 0 ? Math.max(...Array.from(hourMap.values())) : 0;

  return {
    entity: `user:${username}`, loginAttempts, failedLogins, successfulLogins, loginFailureRatio,
    distinctIpsUsed, geographicDiversityScore, totalRequests, distinctEndpointsAccessed,
    endpointAccessConcentration: endpointConcentration, uniqueSessionsCount, avgSessionDuration,
    adminAccessAttempts, privilegeEscalationAttempts, criticalResourceAccesses, userErrorRate,
    httpErrorCount, uniqueErrorTypes, firstActivityTime, lastActivityTime, hoursActive,
    nightTimeAccessCount, weekendActivityLevel, totalDataTransferred, avgDataPerRequest,
    largeDataTransferCount, downloadToUploadRatio, avgSessionsPerDay, maxSessionsInOneHour,
    longSessionCount, concurrentSessionCount, timestamp: new Date().toISOString(), jobId: ctx.jobId,
  };
}

// Helper: endpoint concentration (reuse same calc as IP)
function calculateEndpointConcentration(map: Map<string, number>): number {
  if (!map || map.size === 0) return 0;
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  const max = Math.max(...Array.from(map.values()));
  return total > 0 ? Math.min(1, max / total) : 0;
}

// Helper: very simple concurrent session counter (max overlapping sessions)
function calculateConcurrentSessions(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;
  const times: Array<[number, number]> = sessions.map(s => [new Date(s.startTime).getTime(), new Date(s.endTime).getTime()]);
  times.sort((a, b) => a[0] - b[0]);
  let maxOverlap = 0;
  for (let i = 0; i < times.length; i++) {
    let overlap = 0;
    const ti = times[i];
    if (!ti) continue;
    for (let j = 0; j < times.length; j++) {
      const tj = times[j];
      if (!tj) continue;
      if (tj[0] <= ti[0] && tj[1] >= ti[0]) overlap++;
    }
    maxOverlap = Math.max(maxOverlap, overlap);
  }
  return maxOverlap;
}