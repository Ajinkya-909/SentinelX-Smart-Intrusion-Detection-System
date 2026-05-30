import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";

export const privilegeEscalationChainDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Split logs into attempts and successes
    const attempts = ctx.logs.filter(l => l.event_type === "PERMISSION_DENIED" || (l.metadata?.request?.statusCode === 403));
    const successes = ctx.logs.filter(l => l.event_type === "PRIVILEGE_ESCALATION_SUCCESS" || l.metadata?.parserMetadata?.EventID === 4672);

    for (const success of successes) {
      // Look for a previous "Denied" attempt from the same IP/User within the same window
      const priorAttempt = attempts.find(a => 
        (a.ip_address === success.ip_address || a.metadata?.actor?.username === success.metadata?.actor?.username) &&
        new Date(a.timestamp).getTime() < new Date(success.timestamp).getTime()
      );

      if (priorAttempt) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "correlation",
            finding_type: "PRIVILEGE_ESCALATION_CHAIN",
            severity: FindingSeverity.CRITICAL,
            confidence: 0.95,
            title: "Privilege Escalation Chain",
            summary: `Successful privilege escalation followed a denied attempt by the same entity.`,
            log_references: [priorAttempt.id, success.id],
            affected_entities: {
              source_ip: success.ip_address,
              username: success.metadata?.actor?.username
            },
            evidence: {
              denied_event_id: priorAttempt.id,
              success_event_id: success.id,
              time_delta_seconds: (new Date(success.timestamp).getTime() - new Date(priorAttempt.timestamp).getTime()) / 1000
            },
            metadata: { rule_id: "corr_4_1" },
            recommendation: "CRITICAL: The attacker attempted to gain unauthorized access, was denied, and then succeeded. The server is compromised. Isolate the system immediately.",
          })
        );
      }
    }
    return findings;
  }
};