import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { slidingWindow } from "../../shared/utils/slidingWindow.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 1: Rapid Burst
 *
 * Triggers when:
 * - 100+ requests from same source (IP/User)
 * - WITHIN 30 seconds
 */
export const rapidBurstDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Check by IP
    for (const [ipKey, logs] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      const count = slidingWindow.countInWindow(
        logs,
        config.temporal.burst.windowSeconds,
      );

      if (count >= config.temporal.burst.threshold) {
        const ip = ipKey.replace("ip_", "");

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "RAPID_BURST",
            severity: FindingSeverity.HIGH,
            confidence: 0.92,
            title: "Rapid Request Burst Detected",
            summary: `${count} requests from ${ip} within ${config.temporal.burst.windowSeconds}s`,
            log_references: logs.slice(0, 50).map((log) => log.id), // Limit refs
            affected_entities: {
              source_ip: ip,
              request_count: count,
            },
            evidence: {
              requests_in_window: count,
              window_seconds: config.temporal.burst.windowSeconds,
              avg_interval_ms:
                count > 1
                  ? (config.temporal.burst.windowSeconds * 1000) / count
                  : 0,
            },
            metadata: {
              rule_id: "temp_1_1",
              rule_version: "1.0",
              threshold: config.temporal.burst.threshold,
            },
            recommendation:
              "Investigate source IP for DDoS or automated attack. Consider rate limiting.",
          }),
        );
      }
    }

    return findings;
  },
};

