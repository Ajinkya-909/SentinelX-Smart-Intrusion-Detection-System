import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { statistics } from "../../shared/utils/statistics.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 3: Data Transfer Spike
 *
 * Triggers when:
 * - Total data transferred (response_size_bytes) exceeds baseline by 3x stddev
 */
export const dataTransferSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    if (ctx.timeBuckets.size === 0) return findings;

    // Calculate total data transfer per minute
    const transferRates: number[] = [];
    const bucketData: {
      bucket: string;
      logs: any[];
      totalBytes: number;
    }[] = [];

    for (const [bucket, logs] of ctx.timeBuckets) {
      const totalBytes = logs.reduce(
        (sum, log) => sum + (log.response_size_bytes || 0),
        0,
      );
      transferRates.push(totalBytes);
      bucketData.push({ bucket, logs, totalBytes });
    }

    if (transferRates.length < 2) return findings;

    const mean = statistics.mean(transferRates);
    const stddev = statistics.stddev(transferRates);
    const threshold = mean + stddev * 3; // 3 stddev

    // Find spikes
    for (const { bucket, logs, totalBytes } of bucketData) {
      if (totalBytes >= threshold && totalBytes > 0) {
        const zScore = statistics.zScore(totalBytes, mean, stddev);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "DATA_TRANSFER_SPIKE",
            severity: FindingSeverity.MEDIUM,
            confidence: Math.min(0.9, 0.6 + Math.abs(zScore) * 0.1),
            title: "Data Transfer Spike Detected",
            summary: `Abnormal spike in data transfer volume during ${bucket}`,
            log_references: logs.map((log) => log.id),
            affected_entities: {
              time_bucket: bucket,
              total_bytes_transferred: totalBytes,
            },
            evidence: {
              baseline_mean_bytes: Math.round(mean),
              baseline_stddev_bytes: Math.round(stddev),
              current_total_bytes: totalBytes,
              z_score: Math.round(zScore * 100) / 100,
              multiplier:
                totalBytes > 0
                  ? Math.round((totalBytes / mean) * 100) / 100
                  : 0,
            },
            metadata: {
              rule_id: "stat_1_3",
              rule_version: "1.0",
              threshold_stddevs: 3,
            },
            recommendation:
              "Check for data exfiltration. Monitor IPs and endpoints involved. Review large response sizes.",
          }),
        );
      }
    }

    return findings;
  },
};
