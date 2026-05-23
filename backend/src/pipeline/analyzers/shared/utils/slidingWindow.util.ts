import { NormalizedLog } from "../context/AnalysisContext";

export const slidingWindow = {
  /**
   * Get logs within a time window for a specific entity
   */
  getLogsInWindow(
    logs: NormalizedLog[],
    windowSeconds: number,
    referenceTime: Date = new Date(),
  ): NormalizedLog[] {
    const windowStart = new Date(
      referenceTime.getTime() - windowSeconds * 1000,
    );
    return logs.filter(
      (log) =>
        new Date(log.timestamp) >= windowStart &&
        new Date(log.timestamp) <= referenceTime,
    );
  },

  /**
   * Count logs in time window
   */
  countInWindow(
    logs: NormalizedLog[],
    windowSeconds: number,
    referenceTime: Date = new Date(),
  ): number {
    return this.getLogsInWindow(logs, windowSeconds, referenceTime).length;
  },

  /**
   * Get time gaps between consecutive events (in seconds)
   */
  getIntervals(logs: NormalizedLog[]): number[] {
    if (logs.length < 2) return [];

    const sorted = [...logs].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gapMs =
        new Date(sorted[i]!.timestamp).getTime() -
        new Date(sorted[i - 1]!.timestamp).getTime();
      intervals.push(gapMs / 1000);
    }
    return intervals;
  },

  /**
   * Detect burst (many events in short time)
   */
  isBurst(
    logs: NormalizedLog[],
    threshold: number,
    windowSeconds: number,
  ): boolean {
    return this.countInWindow(logs, windowSeconds) >= threshold;
  },
};
