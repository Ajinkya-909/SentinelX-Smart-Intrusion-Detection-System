import {
  AnalysisContext,
  NormalizedLog,
  SessionGroup,
} from "./AnalysisContext";
import { grouping } from "../utils/grouping.util";
import { timeline } from "../utils/timeline.util";

/**
 * Build the Analysis Context - precomputes all indexes
 * This is called ONCE at the start of analyzer execution
 * All detectors reuse this context
 */
export const buildAnalysisContext = (
  logs: NormalizedLog[],
  jobId: string,
): AnalysisContext => {
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

  // ===== 1. BUILD ENTITY TIMELINES =====
  for (const log of logs) {
    const userId = log.metadata?.user_id || "unknown";
    const userKey = `user_${userId}`;
    const ipKey = `ip_${log.ip_address}`;

    if (!context.entityTimelines.has(userKey)) {
      context.entityTimelines.set(userKey, []);
    }
    context.entityTimelines.get(userKey)!.push(log);

    if (!context.entityTimelines.has(ipKey)) {
      context.entityTimelines.set(ipKey, []);
    }
    context.entityTimelines.get(ipKey)!.push(log);
  }

  // ===== 2. SORT ALL TIMELINES =====
  for (const timelineList of context.entityTimelines.values()) {
    timelineList.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  // ===== 3. BUILD USER-IP MAPPINGS =====
  for (const log of logs) {
    const userId = log.metadata?.user_id || "unknown";
    const ip = log.ip_address;

    if (!context.userIpMappings.has(userId)) {
      context.userIpMappings.set(userId, new Set());
    }
    context.userIpMappings.get(userId)!.add(ip);

    if (!context.ipUserMappings.has(ip)) {
      context.ipUserMappings.set(ip, new Set());
    }
    context.ipUserMappings.get(ip)!.add(userId);
  }

  // ===== 4. BUILD TIME BUCKETS (1-minute) =====
  for (const log of logs) {
    const bucket = new Date(log.timestamp);
    bucket.setSeconds(0, 0);
    const bucketKey = bucket.toISOString();

    if (!context.timeBuckets.has(bucketKey)) {
      context.timeBuckets.set(bucketKey, []);
    }
    context.timeBuckets.get(bucketKey)!.push(log);
  }

  // ===== 5. CLASSIFY AUTH EVENTS =====
  for (const log of logs) {
    if (
      log.event_type === "auth_success" ||
      log.event_type === "login_success"
    ) {
      context.authEvents.push(log);
      context.successfulAuthEvents.push(log);
    } else if (
      log.event_type === "auth_failed" ||
      log.event_type === "login_failed"
    ) {
      context.authEvents.push(log);
      context.failedAuthEvents.push(log);
    }
  }

  // ===== 6. CLASSIFY ADMIN EVENTS =====
  for (const log of logs) {
    if (
      log.endpoint?.includes("/admin") ||
      log.endpoint?.includes("/api/admin") ||
      log.metadata?.role === "admin"
    ) {
      context.adminAccessEvents.push(log);
    }
  }

  // ===== 7. CLASSIFY CRITICAL EVENTS =====
  for (const log of logs) {
    if (
      log.severity === "CRITICAL" ||
      log.severity === "HIGH" ||
      log.status_code >= 500 ||
      (log.status_code >= 400 && log.status_code < 500)
    ) {
      context.criticalEvents.push(log);
    }
  }

  // ===== 8. BUILD ENDPOINT ACCESS PATTERNS =====
  const endpointGroups = grouping.groupByEndpoint(logs);
  for (const [endpoint, endpointLogs] of endpointGroups) {
    const sorted = timeline.sortByTimestamp(endpointLogs);
    if (sorted.length === 0) continue;

    const successCount = endpointLogs.filter(
      (log) => log.status_code < 400,
    ).length;
    const failureCount = endpointLogs.filter(
      (log) => log.status_code >= 400,
    ).length;
    const statusCodes = new Set(endpointLogs.map((log) => log.status_code));

    if (!context.endpointAccess.has(endpoint)) {
      context.endpointAccess.set(endpoint, []);
    }

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

  // ===== 9. CALCULATE REQUEST FREQUENCY =====
  const userGroups = grouping.groupByUser(logs);
  for (const [userId, userLogs] of userGroups) {
    context.requestFrequency.set(`user_${userId}`, userLogs.length);
  }

  const ipGroups = grouping.groupByIp(logs);
  for (const [ip, ipLogs] of ipGroups) {
    context.requestFrequency.set(`ip_${ip}`, ipLogs.length);
  }

  // ===== 10. BUILD SESSIONS =====
  context.sessions = buildSessionGroups(logs);

  // ===== 11. CALCULATE STATISTICS =====
  if (logs.length > 0) {
    context.statistics.totalErrors = logs.filter(
      (log) => log.status_code >= 400,
    ).length;

    const responseTimes = logs
      .filter((log) => log.response_time_ms !== undefined)
      .map((log) => log.response_time_ms);

    if (responseTimes.length > 0) {
      context.statistics.avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const variance =
        responseTimes.reduce(
          (sum, time) =>
            sum + Math.pow(time - context.statistics.avgResponseTime, 2),
          0,
        ) / responseTimes.length;
      context.statistics.stdDevResponseTime = Math.sqrt(variance);
    }

    // Calculate per-minute stats
    const timeBucketCounts: number[] = [];
    for (const bucket of context.timeBuckets.values()) {
      timeBucketCounts.push(bucket.length);
    }

    if (timeBucketCounts.length > 0) {
      context.statistics.requestsPerMinute =
        timeBucketCounts.reduce((a, b) => a + b, 0) / timeBucketCounts.length;
    }
  }

  return context;
};

/**
 * Build session groups from logs
 * A session is a sequence of events from the same user
 */
const buildSessionGroups = (logs: NormalizedLog[]): SessionGroup[] => {
  const sessions: SessionGroup[] = [];
  const userGroups = grouping.groupByUser(logs);

  for (const [userId, userLogs] of userGroups) {
    const sorted = timeline.sortByTimestamp(userLogs);

    // Simple session grouping: group consecutive events from same IP
    let currentSession: NormalizedLog[] = [];
    let lastIp = "";
    let lastTimestamp = new Date(0);

    for (const log of sorted) {
      const timeDiff =
        new Date(log.timestamp).getTime() - lastTimestamp.getTime();
      const timeDiffMinutes = timeDiff / (1000 * 60);

      // Start new session if IP changed or > 30 minutes gap
      if (log.ip_address !== lastIp || timeDiffMinutes > 30) {
        if (currentSession.length > 0) {
          sessions.push(createSessionGroup(userId, currentSession));
        }
        currentSession = [log];
        lastIp = log.ip_address;
      } else {
        currentSession.push(log);
      }

      lastTimestamp = new Date(log.timestamp);
    }

    // Don't forget the last session
    if (currentSession.length > 0) {
      sessions.push(createSessionGroup(userId, currentSession));
    }
  }

  return sessions;
};

/**
 * Create a session group object
 */
const createSessionGroup = (
  userId: string,
  logs: NormalizedLog[],
): SessionGroup => {
  const sorted = timeline.sortByTimestamp(logs);
  if (sorted.length === 0) {
    throw new Error("createSessionGroup called with empty logs array");
  }

  const ipAddresses = new Set(logs.map((log) => log.ip_address));
  const userAgents = new Set(logs.map((log) => log.user_agent));

  return {
    sessionId: `session_${userId}_${new Date(sorted[0]!.timestamp).getTime()}`,
    userId,
    startTime: new Date(sorted[0]!.timestamp),
    endTime: new Date(sorted[sorted.length - 1]!.timestamp),
    ipAddresses,
    userAgents,
    events: logs,
  };
};
