import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const reconnaissanceBurstDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    const logsByIp = grouping.groupByIp(ctx.logs);

    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;

      // Extract status codes from the new metadata schema
      const failureCount = logs.filter((log) => {
        const status = log.metadata?.request?.statusCode;
        return status && status >= 400;
      }).length;

      const failureRate = logs.length > 0 ? failureCount / logs.length : 0;

      // Extract unique endpoints
      const uniqueEndpoints = new Set(
        logs.map((log) => log.metadata?.action?.endpoint).filter(Boolean)
      ).size;

      if (
        logs.length >= config.temporal.reconnaissance.threshold &&
        failureRate >= config.temporal.reconnaissance.failureRatio &&
        uniqueEndpoints >= config.temporal.reconnaissance.uniqueEndpoints
      ) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "RECONNAISSANCE_BURST",
            severity: FindingSeverity.HIGH,
            confidence: 0.90,
            title: "Reconnaissance Activity Detected",
            summary: `IP ${ip} performing systematic endpoint scanning with a ${Math.round(failureRate * 100)}% error rate.`,
            log_references: logs.slice(0, 50).map((log) => log.id),
            affected_entities: {
              source_ip: ip,
              request_count: logs.length,
              unique_endpoints_targeted: uniqueEndpoints,
            },
            evidence: {
              total_requests: logs.length,
              failed_requests: failureCount,
              failure_rate: Math.round(failureRate * 100),
              unique_endpoints: uniqueEndpoints,
            },
            metadata: { rule_id: "temp_1_2" },
            recommendation: "Block IP immediately. Analyze logs to ensure no endpoints returned HTTP 200 containing sensitive data.",
          }),
        );
      }
    }

    return findings;
  },
};