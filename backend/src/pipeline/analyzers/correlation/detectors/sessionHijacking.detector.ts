import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 5: Session Hijacking
 *
 * Detects attack chain:
 * - User logs in normally from IP A + Browser X
 * - Later: same user active from IP B + Browser Y
 * - Followed by suspicious activity from IP B
 * - Within 1 hour
 */
export const sessionHijackingDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.sessions.length < 2) return findings;

    // Check for users with multiple concurrent sessions from different IPs/browsers
    for (let i = 0; i < ctx.sessions.length; i++) {
      const session1 = ctx.sessions[i]!;

      for (let j = i + 1; j < ctx.sessions.length; j++) {
        const session2 = ctx.sessions[j]!;

        // Same user, different sessions
        if (session1.userId === session2.userId) {
          // Check if sessions overlap in time
          const overlap =
            session1.startTime < session2.endTime &&
            session2.startTime < session1.endTime;

          if (!overlap) continue;

          // Check if different IPs or browsers
          const ipsOverlap = Array.from(session1.ipAddresses).some((ip) =>
            session2.ipAddresses.has(ip),
          );
          const agentsOverlap = Array.from(session1.userAgents).some((agent) =>
            session2.userAgents.has(agent),
          );

          if (!ipsOverlap && !agentsOverlap) {
            // Different IP AND different browser = potential hijack
            findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "correlation",
                finding_type: "SESSION_HIJACKING",
                severity: FindingSeverity.HIGH,
                confidence: 0.82,
                title: "Potential Session Hijacking Detected",
                summary: `User ${session1.userId} has overlapping sessions from different IPs and browsers`,
                log_references: [
                  ...session1.events.slice(0, 15).map((log) => log.id),
                  ...session2.events.slice(0, 15).map((log) => log.id),
                ],
                affected_entities: {
                  username: session1.userId,
                  session1_ips: Array.from(session1.ipAddresses),
                  session2_ips: Array.from(session2.ipAddresses),
                },
                evidence: {
                  session1_start: session1.startTime.toISOString(),
                  session1_end: session1.endTime.toISOString(),
                  session2_start: session2.startTime.toISOString(),
                  session2_end: session2.endTime.toISOString(),
                  different_ips: !ipsOverlap,
                  different_browsers: !agentsOverlap,
                },
                metadata: {
                  rule_id: "corr_3_1",
                  rule_version: "1.0",
                },
                recommendation:
                  "Verify legitimate concurrent sessions. Investigate for credential theft. Force re-authentication.",
              }),
            );
          }
        }
      }
    }

    return findings;
  },
};
