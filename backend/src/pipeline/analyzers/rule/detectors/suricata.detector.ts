import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const suricataDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    for (const log of ctx.logs) {
      // Fast-fail: We only care about explicit Suricata logs
      if (log.metadata?.parserMetadata?.wrapper !== "suricata") continue;

      const suricataData = log.metadata.parserMetadata;
      const alert = suricataData.original_json?.alert;

      if (!alert) continue; // Safety check

      // Map Suricata numeric severities to SentinelX enum
      let severity = FindingSeverity.INFO;
      if (alert.severity === 1) severity = FindingSeverity.CRITICAL;
      else if (alert.severity === 2) severity = FindingSeverity.HIGH;
      else if (alert.severity === 3) severity = FindingSeverity.MEDIUM;

      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "rule",
          finding_type: "ANOMALOUS_BEHAVIOR",
          severity: severity,
          confidence: 0.99, // Extremely high confidence because it's a dedicated IDS signature
          title: `IDS Alert: ${alert.signature}`,
          summary: `Suricata detected a network threat: ${alert.category || 'Unknown Category'}`,
          log_references: [log.id],
          affected_entities: {
            source_ip: log.ip_address,
            target_ip: suricataData.dest_ip,
            target_port: suricataData.dest_port
          },
          evidence: {
            signature_id: alert.signature_id,
            category: alert.category,
            action: alert.action || "allowed",
            raw_payload: suricataData.original_json?.payload // If Suricata captured the packet payload
          },
          metadata: {
            rule_id: "rule_ids_passthrough",
            ids_engine: "suricata"
          },
          recommendation: "Investigate target IP for signs of compromise. Review the specific CVE associated with the signature ID.",
        })
      );
    }

    return findings;
  },
};