import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const rapidAuthVelocityDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    // Filter down to ANY authentication attempt (success or failure)
    const authLogs = ctx.logs.filter(log => log.event_type === "LOGIN_ATTEMPT" || log.event_type === "LOGIN_FAILED");
    if (authLogs.length === 0) return findings;

    const authByIp = grouping.groupByIp(authLogs);

    for (const [ip, logs] of authByIp) {
      // Look at the unique users this single IP is trying to log into
      const uniqueUsersTargeted = new Set(
        logs.map(log => log.metadata?.actor?.username).filter(Boolean)
      );

      // If one IP is trying to log into 10+ different accounts in this single time window
      if (uniqueUsersTargeted.size >= config.bruteForce.rapidThreshold) {
        
        // Did any of them succeed?
        const successfulLogins = logs.filter(log => log.metadata?.security?.authSuccess === true);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "RAPID_AUTH_VELOCITY",
            severity: successfulLogins.length > 0 ? FindingSeverity.CRITICAL : FindingSeverity.HIGH,
            confidence: 0.95,
            title: "Password Spraying Attack Detected",
            summary: `IP ${ip} attempted to authenticate against ${uniqueUsersTargeted.size} different accounts`,
            log_references: logs.map(l => l.id),
            affected_entities: {
              ip_address: ip,
              unique_accounts_targeted: uniqueUsersTargeted.size,
              successful_compromises: successfulLogins.length
            },
            evidence: {
              total_auth_attempts: logs.length,
              compromised_accounts: successfulLogins.map(l => l.metadata?.actor?.username),
              targets_sample: Array.from(uniqueUsersTargeted).slice(0, 10)
            },
            metadata: { rule_id: "rule_auth_2" },
            recommendation: successfulLogins.length > 0 
              ? "CRITICAL: Disable compromised accounts immediately and block source IP. Initiate incident response."
              : "Block source IP. No accounts appear compromised yet.",
          })
        );
      }
    }

    return findings;
  },
};