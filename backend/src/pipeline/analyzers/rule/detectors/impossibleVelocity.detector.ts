import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const impossibleVelocityDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Only look at SUCCESSFUL authentications
    const successLogs = ctx.logs.filter(log => log.metadata?.security?.authSuccess === true);
    if (successLogs.length === 0) return findings;

    const authByUser = grouping.groupByUser(successLogs);

    for (const [username, logs] of authByUser) {
      if (!username) continue;

      // Collect all distinct IP addresses for this user in this time window
      const distinctIps = new Set(logs.map(log => log.ip_address).filter(Boolean));

      // It is highly suspicious for a single user to log in from 3+ distinct IP addresses in a short temporal batch
      if (distinctIps.size >= 3) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "IMPOSSIBLE_IP_VELOCITY",
            severity: FindingSeverity.HIGH,
            confidence: 0.85,
            title: "Impossible Login Velocity (Concurrent IPs)",
            summary: `User '${username}' successfully authenticated from ${distinctIps.size} different IP addresses concurrently.`,
            log_references: logs.map(l => l.id),
            affected_entities: {
              username: username,
            },
            evidence: {
              concurrent_ips_used: Array.from(distinctIps),
              time_window_evaluated: "Analyzer Batch Window"
            },
            metadata: { rule_id: "rule_velocity_1" },
            recommendation: "Likely session hijacking or shared compromised credentials. Invalidate all active tokens for this user.",
          })
        );
      }
    }

    return findings;
  },
};