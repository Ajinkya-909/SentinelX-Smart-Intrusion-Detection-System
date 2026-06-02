import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const accountTakeoverDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    const authLogs = ctx.logs.filter(log => log.metadata?.security !== undefined);
    if (authLogs.length === 0) return findings;

    // Group by User to track the sequence of their specific logins
    const authByUser = grouping.groupByUser(authLogs);

    for (const [username, logs] of authByUser) {
      if (!username) continue;

      // Sort temporally (oldest to newest)
      const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let consecutiveFailures = 0;
      const failedLogIds: string[] = [];

      for (const log of sortedLogs) {
        const isSuccess = log.metadata?.security?.authSuccess;

        if (isSuccess === false) {
          consecutiveFailures++;
          failedLogIds.push(log.id);
        } else if (isSuccess === true) {
          // If we see a success AFTER a chain of 5+ failures, the account was likely just breached
          if (consecutiveFailures >= 5) {
            findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "rule",
                finding_type: "ACCOUNT_TAKEOVER_INDICATOR",
                severity: FindingSeverity.CRITICAL,
                confidence: 0.90,
                title: "Possible Account Takeover (ATO)",
                summary: `User '${username}' successfully logged in immediately after ${consecutiveFailures} consecutive failures.`,
                log_references: [...failedLogIds, log.id],
                affected_entities: {
                  username: username,
                  compromised_ip: log.ip_address || "unknown",
                },
                evidence: {
                  consecutive_failures_before_success: consecutiveFailures,
                  successful_login_timestamp: log.timestamp,
                },
                metadata: { rule_id: "rule_ato_1" },
                recommendation: "CRITICAL: Force password reset and terminate active sessions for this user. Verify if MFA was bypassed.",
              })
            );
          }
          // Reset tracker after a success
          consecutiveFailures = 0;
          failedLogIds.length = 0;
        }
      }
    }

    return findings;
  },
};