import { NormalizedLog } from "../context/AnalysisContext";

export const grouping = {
  /**
   * Group logs by user ID, natively understanding the new actor metadata
   */
  groupByUser(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const userId = log.metadata?.actor?.username || "unknown";
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
   * Group logs by requested URL / endpoint
   */
  groupByEndpoint(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const endpoint = log.metadata?.action?.endpoint || "unknown";
      if (!groups.has(endpoint)) {
        groups.set(endpoint, []);
      }
      groups.get(endpoint)!.push(log);
    }
    return groups;
  },

  /**
   * Group logs by event type (HTTP_GET, LOGIN_FAILED, NETWORK_ALLOW)
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
      const userId = log.metadata?.actor?.username || "unknown";
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
   * Dynamic grouping functional approach for deep JSONB fields
   * Example: groupByField(logs, log => log.metadata?.actor?.sessionId)
   */
  groupByField(logs: NormalizedLog[], getter: (log: NormalizedLog) => any): Map<string, NormalizedLog[]> {
    const groups = new Map<string, NormalizedLog[]>();
    for (const log of logs) {
      const val = getter(log);
      const key = val !== undefined && val !== null ? String(val) : "unknown";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    }
    return groups;
  },

  /**
   * Get unique values for a field (supports functional getters to read deep metadata)
   */
  getUniqueValues(logs: NormalizedLog[], getterOrField: string | ((log: NormalizedLog) => any)): Set<string> {
    const values = new Set<string>();
    for (const log of logs) {
      const value = typeof getterOrField === 'function' 
        ? getterOrField(log) 
        : (log as any)[getterOrField];
        
      if (value !== undefined && value !== null) {
        values.add(String(value));
      }
    }
    return values;
  },
};