import { AnalysisContext, NormalizedLog, SessionGroup } from "./AnalysisContext";
import { grouping } from "../utils/grouping.util";
import { timeline } from "../utils/timeline.util";

export const buildAnalysisContext = (logs: NormalizedLog[], jobId: string): AnalysisContext => {
  const context: AnalysisContext = {
    logs,
    jobId,
    entityTimelines: new Map(),
    eventSequences: new Map(),
    sessions: [],
    endpointAccess: new Map(),
    timeBuckets: new Map(),
    userIpMappings: new Map(),
    ipUserMappings: new Map(),
    errorPatterns: new Map(),
    requestFrequency: new Map(),
    authEvents: [],
    failedAuthEvents: [],
    successfulAuthEvents: [],
    adminAccessEvents: [],
    criticalEvents: [],
    statistics: {
      totalRequests: logs.length,
      totalErrors: 0,
      requestsPerMinute: 0,
      errorsPerMinute: 0,
      avgResponseTime: 0,
      stdDevResponseTime: 0,
      rollingWindows: new Map(),
    },
  };

  // ===== 1. TIMELINES & 3. MAPPINGS =====
  for (const log of logs) {
    const userId = log.metadata?.actor?.username || "unknown"; // FIXED
    const ip = log.ip_address || "unknown";
    
    const userKey = `user_${userId}`;
    const ipKey = `ip_${ip}`;

    if (!context.entityTimelines.has(userKey)) context.entityTimelines.set(userKey, []);
    context.entityTimelines.get(userKey)!.push(log);

    if (!context.entityTimelines.has(ipKey)) context.entityTimelines.set(ipKey, []);
    context.entityTimelines.get(ipKey)!.push(log);

    // Mappings
    if (!context.userIpMappings.has(userId)) context.userIpMappings.set(userId, new Set());
    context.userIpMappings.get(userId)!.add(ip);

    if (!context.ipUserMappings.has(ip)) context.ipUserMappings.set(ip, new Set());
    context.ipUserMappings.get(ip)!.add(userId);
  }

  // ===== 2. SORT ALL TIMELINES =====
  for (const timelineList of context.entityTimelines.values()) {
    timelineList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ===== 4. BUILD TIME BUCKETS (1-minute) =====
  for (const log of logs) {
    const bucket = new Date(log.timestamp);
    bucket.setSeconds(0, 0);
    const bucketKey = bucket.toISOString();

    if (!context.timeBuckets.has(bucketKey)) context.timeBuckets.set(bucketKey, []);
    context.timeBuckets.get(bucketKey)!.push(log);
  }

  // ===== 5. CLASSIFY AUTH EVENTS (Context-Aware) =====
  for (const log of logs) {
    // Rely explicitly on the new normalizer's security metadata
    if (log.metadata?.security !== undefined || log.event_type.includes("LOGIN")) {
      context.authEvents.push(log);
      if (log.metadata?.security?.authSuccess === true) {
        context.successfulAuthEvents.push(log);
      } else {
        context.failedAuthEvents.push(log);
      }
    }
  }

  // ===== 6. CLASSIFY ADMIN EVENTS =====
  for (const log of logs) {
    const endpoint = log.metadata?.action?.endpoint || "";
    const username = log.metadata?.actor?.username || "";
    if (endpoint.includes("/admin") || endpoint.includes("/api/admin") || username === "admin" || username === "root") {
      context.adminAccessEvents.push(log);
    }
  }

  // ===== 7. CLASSIFY CRITICAL EVENTS =====
  for (const log of logs) {
    const statusCode = log.metadata?.request?.statusCode || 0;
    if (log.severity === "CRITICAL" || log.severity === "HIGH" || statusCode >= 500) {
      context.criticalEvents.push(log);
      context.statistics.totalErrors++;
    }
  }

  // ===== 8. BUILD ENDPOINT ACCESS PATTERNS =====
  const endpointGroups = grouping.groupByEndpoint(logs);
  for (const [endpoint, endpointLogs] of endpointGroups) {
    const sorted = timeline.sortByTimestamp(endpointLogs);
    if (sorted.length === 0) continue;

    const successCount = endpointLogs.filter(log => (log.metadata?.request?.statusCode || 200) < 400).length;
    const failureCount = endpointLogs.filter(log => (log.metadata?.request?.statusCode || 200) >= 400).length;
    const statusCodes = new Set(endpointLogs.map(log => log.metadata?.request?.statusCode || 0).filter(Boolean));

    if (!context.endpointAccess.has(endpoint)) context.endpointAccess.set(endpoint, []);

    context.endpointAccess.get(endpoint)!.push({
      endpoint,
      count: endpointLogs.length,
      firstAccess: new Date(sorted[0]!.timestamp),
      lastAccess: new Date(sorted[sorted.length - 1]!.timestamp),
      successCount,
      failureCount,
      statusCodes,
    });
  }

  // ===== 10. BUILD SESSIONS =====
  context.sessions = buildSessionGroups(logs);

  return context;
};

/**
 * Build session groups from logs
 * Now natively supports the explicit 'sessionId' extracted by the Normalizer
 */
const buildSessionGroups = (logs: NormalizedLog[]): SessionGroup[] => {
  const sessions: SessionGroup[] = [];
  const userGroups = grouping.groupByUser(logs);

  for (const [userId, userLogs] of userGroups) {
    const sorted = timeline.sortByTimestamp(userLogs);

    let currentSession: NormalizedLog[] = [];
    let lastIp = "";
    let lastSessionId = "";
    let lastTimestamp = new Date(0);

    for (const log of sorted) {
      const timeDiffMinutes = (new Date(log.timestamp).getTime() - lastTimestamp.getTime()) / (1000 * 60);
      const currentSessionId = log.metadata?.actor?.sessionId || "";

      // Break session IF explicit Session ID changed, OR IP changed, OR 30 min gap
      const isNewSession = 
        (currentSessionId && currentSessionId !== lastSessionId && lastSessionId !== "") ||
        (log.ip_address !== lastIp && lastIp !== "") || 
        timeDiffMinutes > 30;

      if (isNewSession) {
        if (currentSession.length > 0) sessions.push(createSessionGroup(userId, currentSession));
        currentSession = [log];
      } else {
        currentSession.push(log);
      }

      lastIp = log.ip_address;
      lastSessionId = currentSessionId || lastSessionId;
      lastTimestamp = new Date(log.timestamp);
    }

    if (currentSession.length > 0) sessions.push(createSessionGroup(userId, currentSession));
  }

  return sessions;
};

const createSessionGroup = (userId: string, logs: NormalizedLog[]): SessionGroup => {
  const sorted = timeline.sortByTimestamp(logs);
  
  // Explicit Session ID from log, or fallback to generated ID
  const explicitSessionId = logs.find(l => l.metadata?.actor?.sessionId)?.metadata?.actor?.sessionId;

  return {
    sessionId: explicitSessionId || `session_${userId}_${new Date(sorted[0]!.timestamp).getTime()}`,
    userId,
    startTime: new Date(sorted[0]!.timestamp),
    endTime: new Date(sorted[sorted.length - 1]!.timestamp),
    ipAddresses: new Set(logs.map(log => log.ip_address).filter(Boolean)),
    userAgents: new Set(logs.map(log => log.metadata?.client?.userAgent).filter(Boolean) as string[]),
    events: logs,
  };
};