import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";

export const midnightAccessDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const unusualHours = [1, 2, 3, 4]; // 1 AM to 4 AM range

    for (const log of ctx.logs) {
      // Look explicitly for successful authentications
      if (log.event_type !== "LOGIN_ATTEMPT" && log.event_type !== "SSH_LOGIN_ATTEMPT") continue;
      if (log.metadata?.security?.authSuccess !== true) continue;

      const hour = timeline.getHour(log);

      if (unusualHours.includes(hour)) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "MIDNIGHT_ACCESS",
            severity: FindingSeverity.LOW,
            confidence: 0.70, // Lower confidence because night-shift workers exist
            title: "Midnight Access Detected",
            summary: `Successful login for ${log.metadata?.actor?.username || "unknown user"} at ${hour}:00.`,
            log_references: [log.id],
            affected_entities: {
              username: log.metadata?.actor?.username || "unknown",
              ip_address: log.ip_address,
              hour,
            },
            evidence: {
              timestamp: log.timestamp,
              hour,
              is_unusual_hour: true,
            },
            metadata: { rule_id: "temp_2_2" },
            recommendation: "Review context. If this user does not normally log in at this hour, check for compromised credentials or impossible travel.",
          }),
        );
      }
    }

    return findings;
  },
};