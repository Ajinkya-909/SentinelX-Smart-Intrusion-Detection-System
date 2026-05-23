import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 4: Privilege Escalation Chain
 *
 * Detects attack chain:
 * - Failed privilege escalation attempts
 * - Followed by successful admin/high-priv operation
 * - Within 2 minutes (rapid escalation)
 */
export const privilegeEscalationChainDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length < 2) return findings;

    // Find failed priv-esc attempts (403 on admin endpoint)
    const failedPrivEscLogs = ctx.logs.filter(
      (log) =>
        (log.endpoint?.includes("/admin") ||
          log.endpoint?.includes("/api/admin")) &&
        (log.status_code === 403 || log.status_code === 401),
    );

    if (failedPrivEscLogs.length === 0) return findings;

    // Find successful admin operations
    const successfulAdminLogs = ctx.adminAccessEvents.filter(
      (log) => log.status_code < 400,
    );

    if (successfulAdminLogs.length === 0) return findings;

    // Check for rapid chains
    for (const failed of failedPrivEscLogs) {
      for (const success of successfulAdminLogs) {
        const userId = failed.metadata?.user_id;

        // Same user: failed priv-esc then successful admin
        if (userId === success.metadata?.user_id) {
          const timeDiff =
            new Date(success.timestamp).getTime() -
            new Date(failed.timestamp).getTime();
          const timeDiffSeconds = timeDiff / 1000;

          if (
            timeDiffSeconds > 0 &&
            timeDiffSeconds <= config.correlation.escalationWindow
          ) {
            findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "correlation",
                finding_type: "PRIVILEGE_ESCALATION_CHAIN",
                severity: FindingSeverity.CRITICAL,
                confidence: 0.96,
                title: "Privilege Escalation Chain Detected",
                summary: `User ${userId} escalated privileges after failed attempt`,
                log_references: [failed.id, success.id],
                affected_entities: {
                  username: userId,
                  failed_priv_esc_endpoint: failed.endpoint,
                  successful_admin_endpoint: success.endpoint,
                },
                evidence: {
                  failed_attempts: 1,
                  successful_escalation: true,
                  time_between_attempts_seconds: timeDiffSeconds,
                },
                metadata: {
                  rule_id: "corr_2_2",
                  rule_version: "1.0",
                  window_seconds: config.correlation.escalationWindow,
                },
                recommendation:
                  "CRITICAL: Immediate privilege revocation. Investigate for exploit/vulnerability. Audit admin actions.",
              }),
            );
          }
        }
      }
    }

    return findings;
  },
};
