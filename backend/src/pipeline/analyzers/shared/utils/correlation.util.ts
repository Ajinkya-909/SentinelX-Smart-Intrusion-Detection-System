import { NormalizedLog } from "../context/AnalysisContext";

export const correlation = {
  /**
   * Detect if logs form a sequence (ordered by time)
   */
  getSequence(logs: NormalizedLog[]): NormalizedLog[] {
    return [...logs].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  },

  /**
   * Check if event B happened after event A within timeWindow (seconds)
   */
  eventFollowsWithinWindow(
    eventA: NormalizedLog,
    eventB: NormalizedLog,
    windowSeconds: number,
  ): boolean {
    const diffMs =
      new Date(eventB.timestamp).getTime() -
      new Date(eventA.timestamp).getTime();
    const diffSeconds = diffMs / 1000;

    return diffSeconds >= 0 && diffSeconds <= windowSeconds;
  },

  /**
   * Find all events of type X that precede events of type Y within window
   */
  findPrecedingEvents(
    allLogs: NormalizedLog[],
    precedingType: string,
    followingType: string,
    windowSeconds: number,
  ): { preceding: NormalizedLog; following: NormalizedLog }[] {
    const chains: { preceding: NormalizedLog; following: NormalizedLog }[] = [];
    const precedingEvents = allLogs.filter(
      (log) => log.event_type === precedingType,
    );
    const followingEvents = allLogs.filter(
      (log) => log.event_type === followingType,
    );

    for (const preceding of precedingEvents) {
      for (const following of followingEvents) {
        if (
          this.eventFollowsWithinWindow(preceding, following, windowSeconds)
        ) {
          chains.push({ preceding, following });
        }
      }
    }

    return chains;
  },

  /**
   * Count how many different values exist for a dynamically mapped field
   */
  countDistinctValues(logs: NormalizedLog[], getter: (log: NormalizedLog) => any): number {
    const values = new Set<string>();
    for (const log of logs) {
      const value = getter(log);
      if (value !== undefined && value !== null) {
        values.add(String(value));
      }
    }
    return values.size;
  },

  /**
   * Get all distinct values using a dynamically mapped field
   */
  getDistinctValues(logs: NormalizedLog[], getter: (log: NormalizedLog) => any): Set<string> {
    const values = new Set<string>();
    for (const log of logs) {
      const value = getter(log);
      if (value !== undefined && value !== null) {
        values.add(String(value));
      }
    }
    return values;
  },

  /**
   * Find common attributes across multiple logs natively mapped to the deep schema
   */
  findCommonAttributes(logs: NormalizedLog[]): {
    commonIps: Set<string>;
    commonUsers: Set<string>;
    commonEndpoints: Set<string>;
  } {
    const commonIps = new Set<string>();
    const commonUsers = new Set<string>();
    const commonEndpoints = new Set<string>();

    for (const log of logs) {
      if (log.ip_address) commonIps.add(log.ip_address);
      if (log.metadata?.actor?.username) commonUsers.add(log.metadata.actor.username);
      if (log.metadata?.action?.endpoint) commonEndpoints.add(log.metadata.action.endpoint);
    }

    return { commonIps, commonUsers, commonEndpoints };
  },

  /**
   * Build attack chain graph (sequence of related events mapping to user or IP)
   */
  buildEventChain(logs: NormalizedLog[], entityId: string): NormalizedLog[] {
    return this.getSequence(
      logs.filter(
        (log) =>
          log.metadata?.actor?.username === entityId || log.ip_address === entityId,
      ),
    );
  },
};