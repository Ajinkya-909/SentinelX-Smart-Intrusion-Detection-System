import { NormalizedLog } from "../context/AnalysisContext";

export const grouping = {
  /**
   * Group logs by user ID
   */
  groupByUser(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const userId = log.metadata?.user_id || "unknown";
      if (!groups.has(userId)) {
        groups.set(userId, []);
      }
      groups.get(userId)!.push(log);
    }
    return groups;
  },

  /**
   * Group logs by IP address
   */
  groupByIp(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const ip = log.ip_address || "unknown";
      if (!groups.has(ip)) {
        groups.set(ip, []);
      }
      groups.get(ip)!.push(log);
    }
    return groups;
  },

  /**
   * Group logs by endpoint
   */
  groupByEndpoint(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const endpoint = log.endpoint || "unknown";
      if (!groups.has(endpoint)) {
        groups.set(endpoint, []);
      }
      groups.get(endpoint)!.push(log);
    }
    return groups;
  },

  /**
   * Group logs by event type
   */
  groupByEventType(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const eventType = log.event_type || "unknown";
      if (!groups.has(eventType)) {
        groups.set(eventType, []);
      }
      groups.get(eventType)!.push(log);
    }
    return groups;
  },

  /**
   * Group logs by user + IP combination
   */
  groupByUserIpPair(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const userId = log.metadata?.user_id || "unknown";
      const ip = log.ip_address || "unknown";
      const key = `${userId}|${ip}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    }
    return groups;
  },

  /**
   * Get unique values for a field
   */
  getUniqueValues(logs: NormalizedLog[], field: string): Set<string> {
    const values = new Set<string>();
    for (const log of logs) {
      const value = (log as any)[field];
      if (value) {
        values.add(String(value));
      }
    }
    return values;
  },
};
