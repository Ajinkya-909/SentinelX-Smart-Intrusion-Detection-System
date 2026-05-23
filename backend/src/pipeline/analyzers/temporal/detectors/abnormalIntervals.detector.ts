import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { slidingWindow } from "../../shared/utils/slidingWindow.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 6: Abnormal Intervals
 *
 * Triggers when:
 * - Requests have abnormally short intervals (< 500ms)
 * - Indicates automated attack or bot activity
 */
export const abnormalIntervalsDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length < 2) return findings;

    // Check by IP for rapid-fire requests
    for (const [ipKey, logs] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      if (logs.length < 2) continue;

      const intervals = slidingWindow.getIntervals(logs);

      // Count how many intervals are below threshold
      const rapidIntervals = intervals.filter(
        (interval) => interval < config.temporal.intervals.minIntervalMs / 1000,
      );

      if (rapidIntervals.length > 0) {
        const ip = ipKey.replace("ip_", "");
        const avgInterval =
          intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "ABNORMAL_INTERVALS",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.8,
            title: "Abnormally Short Request Intervals",
            summary: `${rapidIntervals.length} requests from ${ip} with intervals < 500ms`,
            log_references: logs.slice(0, 30).map((log) => log.id),
            affected_entities: {
              source_ip: ip,
              rapid_request_count: rapidIntervals.length,
            },
            evidence: {
              rapid_intervals_count: rapidIntervals.length,
              total_intervals: intervals.length,
              min_interval_ms: Math.round(Math.min(...intervals) * 1000),
              avg_interval_ms: Math.round(avgInterval * 1000),
              threshold_ms: config.temporal.intervals.minIntervalMs,
            },
            metadata: {
              rule_id: "temp_2_4",
              rule_version: "1.0",
              threshold_ms: config.temporal.intervals.minIntervalMs,
            },
            recommendation:
              "Investigate for bot/automated attack. Implement rate limiting. Consider IP blocking.",
          }),
        );
      }
    }

    return findings;
  },
};
