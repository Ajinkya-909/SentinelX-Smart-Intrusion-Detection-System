import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";

/**
 * DETECTOR 4: Midnight Access
 *
 * Triggers when:
 * - Suspicious login attempts at unusual times (3AM)
 * - Indicates potential automated attacks or compromised credentials
 */
export const midnightAccessDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    if (ctx.successfulAuthEvents.length === 0) return findings;

    // Check for logins at 3AM (unusual time)
    const unusualHours = [2, 3, 4]; // 2AM-4AM range

    for (const log of ctx.successfulAuthEvents) {
      const hour = timeline.getHour(log);

      if (unusualHours.includes(hour)) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "MIDNIGHT_ACCESS",
            severity: FindingSeverity.LOW,
            confidence: 0.65,
            title: "Midnight Access Detected",
            summary: `Successful login for ${log.metadata?.user_id} at ${hour}:00 (unusual time)`,
            log_references: [log.id],
            affected_entities: {
              username: log.metadata?.user_id || "unknown",
              ip_address: log.ip_address,
              hour,
            },
            evidence: {
              timestamp: log.timestamp,
              hour,
              is_unusual_hour: true,
            },
            metadata: {
              rule_id: "temp_2_2",
              rule_version: "1.0",
            },
            recommendation:
              "Verify login with user. Check for account compromise or legitimate work schedule.",
          }),
        );
      }
    }

    return findings;
  },
};

