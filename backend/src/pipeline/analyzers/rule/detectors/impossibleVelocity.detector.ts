import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 4: Impossible Rapid IP Change
 *
 * Triggers when:
 * - SAME user_id
 * - Successful login from IP A
 * - Successful login from IP B (different)
 * - Time difference < 60 seconds
 *
 * This is physically impossible - strong indicator of account compromise
 */
export const impossibleVelocityDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.successfulAuthEvents.length < 2) return findings;

    // Group successful logins by user
    const byUser = grouping.groupByUser(ctx.successfulAuthEvents);

    for (const [userId, logs] of byUser) {
      if (logs.length < 2) continue;

      const sorted = timeline.sortByTimestamp(logs);

      // Check all pairs of logins
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const log1 = sorted[i]!;
          const log2 = sorted[j]!;

          const timeDiff =
            new Date(log2.timestamp).getTime() -
            new Date(log1.timestamp).getTime();
          const timeDiffSeconds = timeDiff / 1000;

          const ip1 = log1.ip_address;
          const ip2 = log2.ip_address;

          if (
            ip1 !== ip2 &&
            timeDiffSeconds > 0 &&
            timeDiffSeconds <= config.accountTakeover.ipVelocityThreshold
          ) {
            findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "rule",
                finding_type: "IMPOSSIBLE_IP_VELOCITY",
                severity: FindingSeverity.HIGH,
                confidence: 0.92,
                title: "Impossible Rapid IP Change",
                summary:
                  "User logged in from two different IPs within 60 seconds",
                log_references: [log1.id, log2.id],
                affected_entities: {
                  username: userId,
                  ip1,
                  ip2,
                  time_delta_seconds: timeDiffSeconds,
                },
                evidence: {
                  ip_address_1: ip1,
                  ip_address_2: ip2,
                  time_delta_seconds: timeDiffSeconds,
                  impossible_travel: true,
                },
                metadata: {
                  rule_id: "rule_2_2",
                  rule_version: "1.0",
                  threshold_seconds: config.accountTakeover.ipVelocityThreshold,
                },
                recommendation:
                  "CRITICAL: Immediately invalidate all sessions. Force re-authentication. Review account security.",
              }),
            );
          }
        }
      }
    }

    return findings;
  },
};

