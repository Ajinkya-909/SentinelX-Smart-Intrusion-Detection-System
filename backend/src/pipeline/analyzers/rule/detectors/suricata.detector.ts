import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const suricataDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const findingsMap = new Map<string, any>();

    for (const log of ctx.logs) {
      // Fast-fail: We only care about explicit Suricata logs
      if (log.metadata?.parserMetadata?.wrapper !== "suricata") continue;

      const suricataData = log.metadata.parserMetadata;
      const alert = suricataData.original_json?.alert;

      if (!alert) continue; // Safety check

      const ip = log.ip_address || "unknown";
      const signatureId = alert.signature_id || "unknown";
      const key = `${ip}_${signatureId}`;

      if (!findingsMap.has(key)) {
        // Map Suricata numeric severities to SentinelX enum
        let severity = FindingSeverity.INFO;
        if (alert.severity === 1) severity = FindingSeverity.CRITICAL;
        else if (alert.severity === 2) severity = FindingSeverity.HIGH;
        else if (alert.severity === 3) severity = FindingSeverity.MEDIUM;

        findingsMap.set(key, {
          ip,
          severity,
          signature: alert.signature,
          signature_id: alert.signature_id,
          category: alert.category || 'Unknown Category',
          dest_ip: suricataData.dest_ip,
          dest_port: suricataData.dest_port,
          action: alert.action || "allowed",
          raw_payload: suricataData.original_json?.payload,
          logs: []
        });
      }

      findingsMap.get(key).logs.push(log);
    }

    for (const [key, entry] of findingsMap) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "rule",
          finding_type: "ANOMALOUS_BEHAVIOR",
          severity: entry.severity,
          confidence: 0.99, // Extremely high confidence because it's a dedicated IDS signature
          title: `IDS Alert: ${entry.signature}`,
          summary: `Suricata detected a network threat: ${entry.category} from ${entry.ip} (${entry.logs.length} occurrences)`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            source_ip: entry.ip,
            target_ip: entry.dest_ip,
            target_port: entry.dest_port
          },
          evidence: {
            signature_id: entry.signature_id,
            category: entry.category,
            occurrences: entry.logs.length,
            action: entry.action,
            raw_payload: entry.raw_payload // If Suricata captured the packet payload
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