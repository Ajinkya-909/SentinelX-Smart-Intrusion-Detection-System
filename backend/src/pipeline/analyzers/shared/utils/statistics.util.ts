export const statistics = {
  /**
   * Calculate mean (average)
   */
  mean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  },

  /**
   * Calculate standard deviation
   */
  stddev(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = this.mean(numbers);
    const variance =
      numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) /
      numbers.length;
    return Math.sqrt(variance);
  },

  /**
   * Calculate Z-score
   */
  zScore(value: number, mean: number, stddev: number): number {
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
  },

  /**
   * Check if value is anomaly based on Z-score threshold
   */
  isAnomaly(
    value: number,
    mean: number,
    stddev: number,
    threshold: number = 3.0,
  ): boolean {
    const z = this.zScore(value, mean, stddev);
    return Math.abs(z) >= threshold;
  },

  /**
   * Calculate percentile
   */
  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  },

  /**
   * Calculate quartiles
   */
  quartiles(numbers: number[]): { q1: number; median: number; q3: number } {
    const sorted = [...numbers].sort((a, b) => a - b);
    return {
      q1: this.percentile(sorted, 25),
      median: this.percentile(sorted, 50),
      q3: this.percentile(sorted, 75),
    };
  },

  /**
   * Detect outliers using IQR method
   */
  outliers(numbers: number[]): number[] {
    const { q1, q3 } = this.quartiles(numbers);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    return numbers.filter((n) => n < lower || n > upper);
  },

  /**
   * Get rolling window stats
   */
  rollingWindowStats(
    numbers: number[],
    windowSize: number,
  ): { mean: number; stddev: number }[] {
    const stats: { mean: number; stddev: number }[] = [];

    for (let i = 0; i <= numbers.length - windowSize; i++) {
      const window = numbers.slice(i, i + windowSize);
      stats.push({
        mean: this.mean(window),
        stddev: this.stddev(window),
      });
    }

    return stats;
  },
};
