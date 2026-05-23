import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { grouping } from "../../shared/utils/grouping.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 3: Account Takeover Indicator
 *
 * Triggers when:
 * - SAME user_id
 * - Different IP address
 * - Different user_agent
 * - Successful login after previous session
 * - WITHIN 60 minutes
 */
export const accountTakeoverDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.successfulAuthEvents.length < 2) return findings;

    // Group successful logins by user
    const byUser = grouping.groupByUser(ctx.successfulAuthEvents);

    for (const [userId, logs] of byUser) {
      if (logs.length < 2) continue;

      const sorted = timeline.sortByTimestamp(logs);

      // Compare consecutive logins
      for (let i = 1; i < sorted.length; i++) {
        const prevLog = sorted[i - 1]!;
        const currLog = sorted[i]!;

        const timeDiff =
          new Date(currLog.timestamp).getTime() -
          new Date(prevLog.timestamp).getTime();
        const timeDiffMinutes = timeDiff / (1000 * 60);

        const prevIp = prevLog.ip_address;
        const currIp = currLog.ip_address;
        const prevAgent = prevLog.user_agent;
        const currAgent = currLog.user_agent;

        const ipChanged = prevIp !== currIp;
        const agentChanged = prevAgent !== currAgent;
        const timeGapValid =
          timeDiffMinutes > config.accountTakeover.minTimeGapMinutes &&
          timeDiffMinutes <= config.accountTakeover.ipChangeWindow / 60;

        if (ipChanged && agentChanged && timeGapValid) {
          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "ACCOUNT_TAKEOVER_INDICATOR",
              severity: FindingSeverity.MEDIUM,
              confidence: 0.8,
              title: "Possible Account Takeover",
              summary: "User's IP and browser changed between sessions",
              log_references: [prevLog.id, currLog.id],
              affected_entities: {
                username: userId,
                previous_ip: prevIp,
                new_ip: currIp,
                previous_agent: prevAgent,
                new_agent: currAgent,
              },
              evidence: {
                previous_session_end: prevLog.timestamp,
                new_session_start: currLog.timestamp,
                time_gap_minutes: timeDiffMinutes,
                ip_different: true,
                agent_different: true,
              },
              metadata: {
                rule_id: "rule_2_1",
                rule_version: "1.0",
              },
              recommendation:
                "Notify user of suspicious login. Request email verification or MFA. Review recent account activity.",
            }),
          );
        }
      }
    }

    return findings;
  },
};
