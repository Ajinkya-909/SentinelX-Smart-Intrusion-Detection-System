import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const errorRateSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Filter to logs that actually have an endpoint (Web Logs, CloudTrail, etc.)
    const endpointLogs = ctx.logs.filter(log => log.metadata?.action?.endpoint);
    if (endpointLogs.length === 0) return findings;

    // Group by endpoint to analyze specific targets (e.g., /api/login vs /images/logo.png)
    const logsByEndpoint = grouping.groupByEndpoint(endpointLogs);

    for (const [endpoint, logs] of logsByEndpoint) {
      if (!endpoint || logs.length < 20) continue; // Need minimum volume to calculate a reliable percentage

      // Count actual errors using the Context-Aware normalizer mappings
      const errorLogs = logs.filter(log => {
        const isHttpError = log.metadata?.request?.statusCode && log.metadata.request.statusCode >= 400;
        const isAuthError = log.metadata?.security?.authSuccess === false;
        const isHighSeverity = log.severity === "HIGH" || log.severity === "CRITICAL";
        return isHttpError || isAuthError || isHighSeverity;
      });

      const errorRate = errorLogs.length / logs.length;

      // If the error rate for a specific endpoint exceeds 40% under high volume
      if (errorRate > 0.40) {
        
        // Find out who is causing these errors
        const guiltyIps = new Set(errorLogs.map((l: any) => l.ip_address).filter(Boolean));

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "ERROR_RATE_SPIKE",
            severity: FindingSeverity.HIGH,
            confidence: 0.90,
            title: "Anomalous Endpoint Error Rate",
            summary: `Endpoint ${endpoint} is experiencing a ${Math.round(errorRate * 100)}% failure rate.`,
            log_references: errorLogs.slice(0, 50).map((log: any) => log.id),
            affected_entities: {
              target_endpoint: endpoint,
              unique_ips_involved: guiltyIps.size
            },
            evidence: {
              total_requests: logs.length,
              error_requests: errorLogs.length,
              error_percentage: Math.round(errorRate * 100),
              primary_offenders: Array.from(guiltyIps).slice(0, 5)
            },
            metadata: { rule_id: "stat_1_2" },
            recommendation: guiltyIps.size === 1 
                ? "A single IP is causing mass errors. Likely a targeted scan or brute-force. Block IP."
                : "Multiple IPs are failing. Possible distributed attack (DDoS) or severe application outage. Investigate backend health.",
          }),
        );
      }
    }

    return findings;
  },
};