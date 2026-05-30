import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const rapidBurstDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Group the temporal batch by IP
    const logsByIp = grouping.groupByIp(ctx.logs);

    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;

      const count = logs.length;

      // Since the orchestrator provides a temporal window, we just check total volume
      if (count >= config.temporal.burst.threshold) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "RAPID_BURST",
            severity: FindingSeverity.HIGH,
            confidence: 0.95,
            title: "Rapid Request Burst Detected",
            summary: `${count} requests from ${ip} within the analysis window`,
            log_references: logs.slice(0, 50).map((log) => log.id), // Cap references to prevent payload bloat
            affected_entities: {
              source_ip: ip,
              request_count: count,
            },
            evidence: {
              requests_in_window: count,
              first_request: logs[0]?.timestamp,
              last_request: logs[logs.length - 1]?.timestamp,
            },
            metadata: {
              rule_id: "temp_1_1",
              trigger_threshold: config.temporal.burst.threshold,
            },
            recommendation: "Investigate source IP for DDoS, brute-force, or automated bot activity. Consider rate limiting at the WAF.",
          }),
        );
      }
    }

    return findings;
  },
};