import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { statistics } from "../../shared/utils/statistics.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 2: Error Rate Spike
 *
 * Triggers when:
 * - Error rate (4xx/5xx responses) exceeds baseline by 3x multiplier
 */
export const errorRateSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.timeBuckets.size === 0) return findings;

    // Calculate error rates per minute
    const errorRates: number[] = [];
    const bucketData: { bucket: string; logs: any[]; errorCount: number }[] =
      [];

    for (const [bucket, logs] of ctx.timeBuckets) {
      const errorCount = logs.filter((log) => log.status_code >= 400).length;
      const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;
      errorRates.push(errorRate);
      bucketData.push({ bucket, logs, errorCount });
    }

    if (errorRates.length < 2) return findings;

    const mean = statistics.mean(errorRates);
    const stddev = statistics.stddev(errorRates);
    const spikeThreshold = mean * config.statistical.errorRateMultiplier;

    // Find spikes
    for (const { bucket, logs, errorCount } of bucketData) {
      const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

      if (errorRate >= spikeThreshold && errorCount > 0) {
        const zScore = statistics.zScore(errorRate, mean, stddev);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "ERROR_RATE_SPIKE",
            severity: FindingSeverity.MEDIUM,
            confidence: Math.min(0.95, 0.6 + Math.abs(zScore) * 0.1),
            title: "Error Rate Spike Detected",
            summary: `Abnormal spike in error responses during ${bucket}`,
            log_references: logs
              .filter((log) => log.status_code >= 400)
              .map((log) => log.id),
            affected_entities: {
              time_bucket: bucket,
              error_count: errorCount,
              total_requests: logs.length,
            },
            evidence: {
              baseline_error_rate: Math.round(mean * 100) / 100,
              baseline_stddev: Math.round(stddev * 100) / 100,
              current_error_rate: Math.round(errorRate * 100) / 100,
              error_count: errorCount,
              z_score: Math.round(zScore * 100) / 100,
            },
            metadata: {
              rule_id: "stat_1_2",
              rule_version: "1.0",
              threshold_multiplier: config.statistical.errorRateMultiplier,
            },
            recommendation:
              "Check application logs for errors. Monitor backend health. Review error types.",
          }),
        );
      }
    }

    return findings;
  },
};
