import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { statistics } from "../../shared/utils/statistics.util";

/**
 * DETECTOR 5: Critical Event Spike
 *
 * Triggers when:
 * - Spike in critical/high severity events
 * - 5x multiplier above baseline
 */
export const criticalEventSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    if (ctx.timeBuckets.size === 0 || ctx.criticalEvents.length === 0)
      return findings;

    // Calculate critical event counts per minute
    const criticalCounts: number[] = [];
    const bucketData: {
      bucket: string;
      criticalCount: number;
      logs: any[];
    }[] = [];

    for (const [bucket, logs] of ctx.timeBuckets) {
      const criticalCount = logs.filter(
        (log) =>
          log.severity === "CRITICAL" ||
          log.severity === "HIGH" ||
          log.status_code >= 500,
      ).length;

      criticalCounts.push(criticalCount);
      bucketData.push({
        bucket,
        criticalCount,
        logs,
      });
    }

    if (criticalCounts.length < 2) return findings;

    const mean = statistics.mean(criticalCounts);
    const stddev = statistics.stddev(criticalCounts);
    const spikeThreshold = mean * 5; // 5x multiplier

    // Find spikes
    for (const { bucket, criticalCount, logs } of bucketData) {
      if (criticalCount >= spikeThreshold && criticalCount > 0) {
        const zScore = statistics.zScore(criticalCount, mean, stddev);
        const criticalLogs = logs.filter(
          (log) =>
            log.severity === "CRITICAL" ||
            log.severity === "HIGH" ||
            log.status_code >= 500,
        );

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "CRITICAL_EVENT_SPIKE",
            severity: FindingSeverity.HIGH,
            confidence: Math.min(0.95, 0.7 + Math.abs(zScore) * 0.1),
            title: "Critical Event Spike Detected",
            summary: `Spike in critical/high severity events during ${bucket}`,
            log_references: criticalLogs.map((log) => log.id),
            affected_entities: {
              time_bucket: bucket,
              critical_event_count: criticalCount,
            },
            evidence: {
              baseline_critical_events: Math.round(mean),
              baseline_stddev: Math.round(stddev),
              current_critical_events: criticalCount,
              z_score: Math.round(zScore * 100) / 100,
            },
            metadata: {
              rule_id: "stat_1_5",
              rule_version: "1.0",
              threshold_multiplier: 5,
            },
            recommendation:
              "URGENT: Review critical errors immediately. Check system health and logs. Investigate root cause.",
          }),
        );
      }
    }

    return findings;
  },
};

