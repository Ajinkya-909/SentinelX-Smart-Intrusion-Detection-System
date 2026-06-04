import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const privilegeEscalationDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    for (const log of ctx.logs) {
      let isEscalationAttempt = false;
      let context = "";

      // 1. Web-based Escalation (Accessing restricted endpoints)
      const endpoint = log.metadata?.action?.endpoint?.toLowerCase();
      if (endpoint && (endpoint.includes("/admin") || endpoint.includes("/system/config") || endpoint.includes("/root"))) {
        // If they hit an admin endpoint and got a 403 Forbidden, they were caught. 
        // If they got a 200 OK, they succeeded.
        isEscalationAttempt = true;
        context = `Web request to restricted path: ${endpoint}`;
      }

      // 2. System-based Escalation (Linux sudo / Windows Event 4672)
      const message = log.message?.toLowerCase();
      if (log.source === "SYSLOG" && message && message.includes("sudo") && message.includes("incorrect password")) {
        isEscalationAttempt = true;
        context = "Failed sudo command attempt in syslog";
      }
      
      // Windows specific: Event ID 4672 (Special privileges assigned to new logon)
      if (log.source === "WINDOWS_EVENT" && log.metadata?.parserMetadata?.EventID === 4672) {
        isEscalationAttempt = true;
        context = "Windows Special Privileges Assigned (Event 4672)";
      }

      if (isEscalationAttempt) {
        const isSuccessful = log.metadata?.request?.statusCode === 200 || log.metadata?.parserMetadata?.EventID === 4672;

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "PRIVILEGE_ESCALATION_ATTEMPT",
            severity: isSuccessful ? FindingSeverity.CRITICAL : FindingSeverity.MEDIUM,
            confidence: 0.90,
            title: isSuccessful ? "Successful Privilege Escalation" : "Privilege Escalation Attempt",
            summary: `Suspicious admin-level activity detected from ${log.metadata?.actor?.username || log.ip_address}`,
            log_references: [log.id],
            affected_entities: {
              ip_address: log.ip_address,
              username: log.metadata?.actor?.username,
            },
            evidence: {
              escalation_context: context,
              was_successful: isSuccessful,
              raw_message: log.message ? String(log.message).substring(0, 100) : undefined
            },
            metadata: { rule_id: "rule_priv_1" },
            recommendation: isSuccessful 
              ? "CRITICAL: Unauthorized admin access granted. Lock down account and initiate incident response."
              : "Review user permissions and ensure admin endpoints are strictly access-controlled.",
          })
        );
      }
    }

    return findings;
  },
};