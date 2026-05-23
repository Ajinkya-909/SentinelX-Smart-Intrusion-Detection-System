import { NormalizedLog } from "../context/AnalysisContext";

export const timeline = {
  /**
   * Sort logs by timestamp (ascending)
   */
  sortByTimestamp(logs: NormalizedLog[]): NormalizedLog[] {
    return [...logs].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  },

  /**
   * Get time between two logs (in seconds)
   */
  getTimeDiffSeconds(log1: NormalizedLog, log2: NormalizedLog): number {
    const diff =
      new Date(log2.timestamp).getTime() - new Date(log1.timestamp).getTime();
    return diff / 1000;
  },

  /**
   * Get time between two logs (in milliseconds)
   */
  getTimeDiffMs(log1: NormalizedLog, log2: NormalizedLog): number {
    return (
      new Date(log2.timestamp).getTime() - new Date(log1.timestamp).getTime()
    );
  },

  /**
   * Get earliest log
   */
  earliest(logs: NormalizedLog[]): NormalizedLog | null {
    if (logs.length === 0) return null;
    return this.sortByTimestamp(logs)[0] ?? null;
  },

  /**
   * Get latest log
   */
  latest(logs: NormalizedLog[]): NormalizedLog | null {
    if (logs.length === 0) return null;
    const sorted = this.sortByTimestamp(logs);
    return sorted[sorted.length - 1] ?? null;
  },

  /**
   * Get time span (in seconds) between earliest and latest log
   */
  timeSpan(logs: NormalizedLog[]): number {
    if (logs.length < 2) return 0;
    const first = this.earliest(logs);
    const last = this.latest(logs);
    if (!first || !last) return 0;
    return this.getTimeDiffSeconds(first, last);
  },

  /**
   * Get hour from timestamp
   */
  getHour(log: NormalizedLog): number {
    return new Date(log.timestamp).getHours();
  },

  /**
   * Get day of week (0=Sunday, 6=Saturday)
   */
  getDayOfWeek(log: NormalizedLog): number {
    return new Date(log.timestamp).getDay();
  },

  /**
   * Check if log is during off-hours (startHour to endHour)
   */
  isOffHours(log: NormalizedLog, startHour: number, endHour: number): boolean {
    const hour = this.getHour(log);

    if (startHour < endHour) {
      // Normal case (e.g., 9 to 17)
      return hour < startHour || hour >= endHour;
    } else {
      // Wrap around midnight (e.g., 22 to 6)
      return hour >= startHour || hour < endHour;
    }
  },

  /**
   * Bucket logs into 1-minute intervals
   */
  bucketByMinute(logs: NormalizedLog[]): Map<string, NormalizedLog[]> {
    const buckets = new Map<string, NormalizedLog[]>();

    for (const log of logs) {
      const date = new Date(log.timestamp);
      date.setSeconds(0, 0);
      const bucketKey = date.toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(log);
    }

    return buckets;
  },

  /**
   * Bucket logs into custom time intervals (in minutes)
   */
  bucketByInterval(
    logs: NormalizedLog[],
    intervalMinutes: number,
  ): Map<string, NormalizedLog[]> {
    const buckets = new Map<string, NormalizedLog[]>();
    const intervalMs = intervalMinutes * 60 * 1000;

    for (const log of logs) {
      const date = new Date(log.timestamp);
      const bucketTime = Math.floor(date.getTime() / intervalMs) * intervalMs;
      const bucketKey = new Date(bucketTime).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(log);
    }

    return buckets;
  },
};
