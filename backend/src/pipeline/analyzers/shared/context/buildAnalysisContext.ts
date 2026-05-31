import {
  AnalysisContext,
  NormalizedLog,
  SessionGroup,
} from "./AnalysisContext";
import { grouping } from "../utils/grouping.util";
import { timeline } from "../utils/timeline.util";

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

  // ===== 1. TIMELINES & 3. MAPPINGS =====
  // FIX: "unknown" entities are excluded from entityTimelines and mappings.
  // Without this guard, logs missing IP or username all accumulate under
  // "ip:unknown" / "user:unknown", which can become the largest entries in
  // the map and skew every detector that iterates entityTimelines by count.
  // (requestSpikeDetector already guarded against this locally — this makes
  // it a global invariant so every detector gets clean data automatically.)
  for (const log of logs) {
    const userId = log.metadata?.actor?.username || "unknown";
    const ip = log.ip_address || "unknown";

    const userKey = `user:${userId}`;
    const ipKey = `ip:${ip}`;

    // Only add known users to entity timelines
    if (userId !== "unknown") {
      if (!context.entityTimelines.has(userKey))
        context.entityTimelines.set(userKey, []);
      context.entityTimelines.get(userKey)!.push(log);
    }

    // Only add known IPs to entity timelines and mappings
    if (ip !== "unknown") {
      if (!context.entityTimelines.has(ipKey))
        context.entityTimelines.set(ipKey, []);
      context.entityTimelines.get(ipKey)!.push(log);

      if (!context.ipUserMappings.has(ip))
        context.ipUserMappings.set(ip, new Set());
      context.ipUserMappings.get(ip)!.add(userId);
    }

    // userIpMappings: only track when both sides are known
    if (userId !== "unknown" && ip !== "unknown") {
      if (!context.userIpMappings.has(userId))
        context.userIpMappings.set(userId, new Set());
      context.userIpMappings.get(userId)!.add(ip);
    }
  }

  // ===== 2. SORT ALL TIMELINES =====
  for (const timelineList of context.entityTimelines.values()) {
    timelineList.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  // ===== 4. BUILD TIME BUCKETS (1-minute) =====
  for (const log of logs) {
    const bucket = new Date(log.timestamp);
    bucket.setSeconds(0, 0);
    const bucketKey = bucket.toISOString();

    if (!context.timeBuckets.has(bucketKey))
      context.timeBuckets.set(bucketKey, []);
    context.timeBuckets.get(bucketKey)!.push(log);
  }

  // ===== 4b. COMPUTE STATISTICS FROM TIME BUCKETS =====
  // FIX: statistics fields were initialized to 0 and never populated.
  // requestsPerMinute / errorsPerMinute are straightforward averages over
  // the 1-minute buckets built above. rollingWindows is populated here so
  // any detector that reads it gets real data instead of an empty Map.
  if (context.timeBuckets.size > 0) {
    const bucketCounts = Array.from(context.timeBuckets.values()).map(b => b.length);
    const total = bucketCounts.reduce((a, b) => a + b, 0);
    context.statistics.requestsPerMinute = total / bucketCounts.length;

    const errorCounts = Array.from(context.timeBuckets.values()).map(
      (b) => b.filter((l) => l.severity === "CRITICAL" || l.severity === "HIGH" ||
        (l.metadata?.request?.statusCode ?? 0) >= 400).length
    );
    const totalErrors = errorCounts.reduce((a, b) => a + b, 0);
    context.statistics.errorsPerMinute = totalErrors / errorCounts.length;

    // Populate rollingWindows: Map<string, number[]> where each key is a
    // bucket timestamp and the value is an array of per-minute counts for
    // a sliding window ending at that bucket. Detectors can read the last
    // N entries to compute rolling averages or spike thresholds.
    const bucketKeys = Array.from(context.timeBuckets.keys()).sort();
    for (let i = 0; i < bucketKeys.length; i++) {
      const key = bucketKeys[i]!;
      // Store the running series of counts up to and including this bucket,
      // capped at the last 60 entries (~1 hour of 1-minute buckets) to keep
      // memory bounded on long log files.
      const windowSlice = bucketKeys
        .slice(Math.max(0, i - 59), i + 1)
        .map((k) => context.timeBuckets.get(k)!.length);
      context.statistics.rollingWindows.set(key, windowSlice);
    }
  }

  // ===== 5. CLASSIFY AUTH EVENTS (Context-Aware) =====
  // FIX: Broadened from just "LOGIN" to cover all normalized syslog auth event
  // types (AUTH_SUCCESS, AUTH_FAILURE, SESSION_START, SESSION_END, LOGON, etc.).
  // The old check only matched HTTP-style login events. Syslog "Failed password"
  // and "Accepted publickey" normalize to AUTH_FAILURE / AUTH_SUCCESS — they
  // never matched "LOGIN", so authEvents was always empty for Linux auth logs,
  // making brute force, account takeover, and impossible velocity detectors
  // fire zero findings on syslog sources.
  for (const log of logs) {
    const et = log.event_type;
    const isAuthEvent =
      log.metadata?.security !== undefined ||
      et.includes("LOGIN")   ||
      et.includes("AUTH")    ||
      et.includes("SESSION") ||
      et.includes("LOGON")   ||
      et.includes("LOGOFF")  ||
      et === "PERMISSION_DENIED" ||
      et === "SUDO";

    if (!isAuthEvent) continue;

    context.authEvents.push(log);

    if (log.metadata?.security?.authSuccess === true) {
      context.successfulAuthEvents.push(log);
    } else {
      context.failedAuthEvents.push(log);
    }
  }

  // ===== 6. CLASSIFY ADMIN EVENTS =====
  for (const log of logs) {
    const endpoint = log.metadata?.action?.endpoint || "";
    const username = log.metadata?.actor?.username || "";
    if (
      endpoint.includes("/admin") ||
      endpoint.includes("/api/admin") ||
      username === "admin" ||
      username === "root"
    ) {
      context.adminAccessEvents.push(log);
    }
  }

  // ===== 7. CLASSIFY CRITICAL EVENTS =====
  for (const log of logs) {
    const statusCode = log.metadata?.request?.statusCode || 0;
    if (
      log.severity === "CRITICAL" ||
      log.severity === "HIGH" ||
      statusCode >= 500
    ) {
      context.criticalEvents.push(log);
      context.statistics.totalErrors++;
    }
  }

  // ===== 8. BUILD ENDPOINT ACCESS PATTERNS =====
  const endpointGroups = grouping.groupByEndpoint(logs);
  for (const [endpoint, endpointLogs] of endpointGroups) {
    const sorted = timeline.sortByTimestamp(endpointLogs);
    if (sorted.length === 0) continue;

    const successCount = endpointLogs.filter(
      (log) => (log.metadata?.request?.statusCode || 200) < 400,
    ).length;
    const failureCount = endpointLogs.filter(
      (log) => (log.metadata?.request?.statusCode || 200) >= 400,
    ).length;
    const statusCodes = new Set(
      endpointLogs
        .map((log) => log.metadata?.request?.statusCode || 0)
        .filter(Boolean),
    );

    if (!context.endpointAccess.has(endpoint))
      context.endpointAccess.set(endpoint, []);

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
      const timeDiffMinutes =
        (new Date(log.timestamp).getTime() - lastTimestamp.getTime()) /
        (1000 * 60);
      const currentSessionId = log.metadata?.actor?.sessionId || "";

      // FIX: Previously, any IP change immediately created a new session,
      // which breaks mobile users, VPN users, and cloud NAT environments that
      // legitimately change IPs mid-session. This caused sessionHijacking and
      // longSession detectors to undercount session length and overcount session
      // count dramatically.
      //
      // New logic: explicit sessionId change is the primary splitter (most reliable).
      // IP change alone only splits when there's also a meaningful time gap (5+ min),
      // because a genuine IP change mid-session (not a session boundary) typically
      // has no gap at all — the next request comes in immediately from the new IP.
      // The 30-minute idle timeout remains as the catch-all.
      const hasExplicitSessionIds = currentSessionId !== "" && lastSessionId !== "";
      const sessionIdChanged = hasExplicitSessionIds && currentSessionId !== lastSessionId;

      const ipChangedWithGap =
        log.ip_address !== lastIp &&
        lastIp !== "" &&
        timeDiffMinutes > 5;

      const isNewSession =
        sessionIdChanged ||
        ipChangedWithGap ||
        timeDiffMinutes > 30;

      if (isNewSession) {
        if (currentSession.length > 0)
          sessions.push(createSessionGroup(userId, currentSession));
        currentSession = [log];
      } else {
        currentSession.push(log);
      }

      lastIp = log.ip_address;
      lastSessionId = currentSessionId || lastSessionId;
      lastTimestamp = new Date(log.timestamp);
    }

    if (currentSession.length > 0)
      sessions.push(createSessionGroup(userId, currentSession));
  }

  return sessions;
};

const createSessionGroup = (
  userId: string,
  logs: NormalizedLog[],
): SessionGroup => {
  const sorted = timeline.sortByTimestamp(logs);

  // Explicit Session ID from log, or fallback to generated ID
  const explicitSessionId = logs.find((l) => l.metadata?.actor?.sessionId)
    ?.metadata?.actor?.sessionId;

  return {
    sessionId:
      explicitSessionId ||
      `session_${userId}_${new Date(sorted[0]!.timestamp).getTime()}`,
    userId,
    startTime: new Date(sorted[0]!.timestamp),
    endTime: new Date(sorted[sorted.length - 1]!.timestamp),
    ipAddresses: new Set(logs.map((log) => log.ip_address).filter(Boolean)),
    userAgents: new Set(
      logs
        .map((log) => log.metadata?.client?.userAgent)
        .filter(Boolean) as string[],
    ),
    events: logs,
  };
};