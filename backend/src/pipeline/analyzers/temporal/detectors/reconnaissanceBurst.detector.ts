import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { slidingWindow } from "../../shared/utils/slidingWindow.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 2: Reconnaissance Burst
 *
 * Triggers when:
 * - 50+ requests in 5 minutes
 * - 50% failure rate (4xx/5xx)
 * - 10+ unique endpoints
 *
 * Indicates scanning/enumeration behavior
 */
export const reconnaissanceBurstDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Check by IP
    for (const [ipKey, logs] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      const windowLogs = slidingWindow.getLogsInWindow(
        logs,
        config.temporal.reconnaissance.windowMinutes * 60,
      );

      const failureCount = windowLogs.filter(
        (log) => log.status_code >= 400,
      ).length;
      const failureRate =
        windowLogs.length > 0 ? failureCount / windowLogs.length : 0;

      const uniqueEndpoints = new Set(windowLogs.map((log) => log.endpoint))
        .size;

      if (
        windowLogs.length >= config.temporal.reconnaissance.threshold &&
        failureRate >= config.temporal.reconnaissance.failureRatio &&
        uniqueEndpoints >= config.temporal.reconnaissance.uniqueEndpoints
      ) {
        const ip = ipKey.replace("ip_", "");

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "RECONNAISSANCE_BURST",
            severity: FindingSeverity.HIGH,
            confidence: 0.88,
            title: "Reconnaissance Activity Detected",
            summary: `IP ${ip} performing systematic endpoint scanning`,
            log_references: windowLogs.slice(0, 50).map((log) => log.id),
            affected_entities: {
              source_ip: ip,
              request_count: windowLogs.length,
              unique_endpoints_targeted: uniqueEndpoints,
            },
            evidence: {
              total_requests: windowLogs.length,
              failed_requests: failureCount,
              failure_rate: Math.round(failureRate * 100),
              unique_endpoints: uniqueEndpoints,
              time_window_minutes: config.temporal.reconnaissance.windowMinutes,
            },
            metadata: {
              rule_id: "temp_1_2",
              rule_version: "1.0",
            },
            recommendation:
              "Block IP immediately. Review which endpoints were targeted. Analyze for information gathering.",
          }),
        );
      }
    }

    return findings;
  },
};

