import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const bruteForceDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    // Filter only logs that explicitly indicate authentication failures
    const failedAuthLogs = ctx.logs.filter(log => log.metadata?.security?.authSuccess === false);
    if (failedAuthLogs.length === 0) return findings;

    // Group the failures by IP address
    const failedByIp = grouping.groupByIp(failedAuthLogs);
    
    for (const [ip, logs] of failedByIp) {
      const count = logs.length;

      // Because analyzer.service.ts already sliced the data into a strict time window,
      // we don't need to re-calculate timestamps. We just check if the sheer volume
      // in this window exceeds our threshold.
      if (count >= config.bruteForce.threshold) {
        
        // Extract the unique usernames targeted (e.g., did they try 'admin', 'root', 'user1'?)
        const usernamesTargeted = new Set(
            logs.map(log => log.metadata?.actor?.username).filter(Boolean)
        );

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "BRUTE_FORCE_AUTH",
            severity: FindingSeverity.HIGH,
            confidence: count > (config.bruteForce.threshold * 2) ? 0.99 : 0.90,
            title: "Brute Force Attack Detected",
            summary: `${count} failed authentication attempts detected from ${ip}`,
            log_references: logs.map((log) => log.id),
            affected_entities: {
              ip_address: ip,
              attempt_count: count,
              unique_users_targeted: usernamesTargeted.size,
            },
            evidence: {
              failed_attempts: count,
              first_attempt: logs[0]?.timestamp,
              last_attempt: logs[logs.length - 1]?.timestamp,
              targets: Array.from(usernamesTargeted).slice(0, 5) // Show top 5 targeted users
            },
            metadata: {
              rule_id: "rule_brute_force_1",
              trigger_threshold: config.bruteForce.threshold,
            },
            recommendation: "Block IP address immediately. Check if any attempts from this IP were successful.",
          }),
        );
      }
    }

    return findings;
  },
};