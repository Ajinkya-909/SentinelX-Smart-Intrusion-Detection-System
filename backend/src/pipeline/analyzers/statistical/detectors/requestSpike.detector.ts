import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { statistics } from "../../shared/utils/statistics.util.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 1: Request Spike
 *
 * Triggers when:
 * - Request count exceeds baseline by 5x multiplier
 * - Within a time window
 */
export const requestSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.timeBuckets.size === 0) return findings;

    // Get request counts per minute
    const minuteCounts: number[] = [];
    for (const bucket of ctx.timeBuckets.values()) {
      minuteCounts.push(bucket.length);
    }

    if (minuteCounts.length < 2) return findings;

    const mean = statistics.mean(minuteCounts);
    const stddev = statistics.stddev(minuteCounts);
    const spikeThreshold = mean * config.statistical.spikeMultiplier;

    // Find spikes
    const bucketEntries = Array.from(ctx.timeBuckets.entries());
    for (const [bucketKey, logs] of bucketEntries) {
      if (logs.length >= spikeThreshold) {
        const zScore = statistics.zScore(logs.length, mean, stddev);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "REQUEST_SPIKE",
            severity: FindingSeverity.MEDIUM,
            confidence: Math.min(0.95, 0.6 + Math.abs(zScore) * 0.1),
            title: "Request Spike Detected",
            summary: `Abnormal spike in request volume during ${bucketKey}`,
            log_references: logs.map((log) => log.id),
            affected_entities: {
              time_bucket: bucketKey,
              request_count: logs.length,
            },
            evidence: {
              baseline_mean: Math.round(mean),
              baseline_stddev: Math.round(stddev),
              spike_count: logs.length,
              z_score: Math.round(zScore * 100) / 100,
              multiplier: Math.round((logs.length / mean) * 100) / 100,
            },
            metadata: {
              rule_id: "stat_1_1",
              rule_version: "1.0",
              threshold_multiplier: config.statistical.spikeMultiplier,
            },
            recommendation:
              "Investigate source IPs. Check for DDoS or scanning activity. Review application logs.",
          }),
        );
      }
    }

    return findings;
  },
};
