import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const dataExfiltrationChainDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // 1. Identify suspicious activities (Logins or Lateral Movement)
    const suspiciousEvents = ctx.logs.filter(l => 
      l.metadata?.security?.authSuccess === false || 
      l.event_type === "LATERAL_MOVEMENT_SUSPICION"
    );

    // 2. Identify data transfers (Firewall logs or logs with high byte counts)
    const transferLogs = ctx.logs.filter(l => 
      (l.metadata?.parserMetadata?.bytes && Number(l.metadata.parserMetadata.bytes) > 10 * 1024 * 1024) || // > 10MB
      l.event_type === "NETWORK_ALLOW"
    );

    // Group both by IP to see if the same IP that logged in also transferred massive data
    const ipsWithSuspiciousActivity = new Set(suspiciousEvents.map(l => l.ip_address).filter(Boolean));

    for (const ip of ipsWithSuspiciousActivity) {
      const relatedTransfers = transferLogs.filter(l => l.ip_address === ip);
      
      if (relatedTransfers.length > 0) {
        // Calculate total bytes
        const totalBytes = relatedTransfers.reduce((sum, l) => sum + (Number(l.metadata?.parserMetadata?.bytes) || 0), 0);
        
        // If data exfiltration exceeds 50MB
        if (totalBytes > 50 * 1024 * 1024) {
          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "correlation",
              finding_type: "DATA_EXFILTRATION_CHAIN",
              severity: FindingSeverity.CRITICAL,
              confidence: 0.95,
              title: "Data Exfiltration Chain Detected",
              summary: `IP ${ip} authenticated suspiciously and then transferred ${Math.round(totalBytes / 1024 / 1024)}MB of data.`,
              log_references: [...suspiciousEvents.filter(l => l.ip_address === ip).map(l => l.id), ...relatedTransfers.map(l => l.id)],
              affected_entities: { source_ip: ip },
              evidence: {
                total_bytes_transferred: totalBytes,
                suspicious_events_count: suspiciousEvents.filter(l => l.ip_address === ip).length
              },
              metadata: { rule_id: "corr_2_1" },
              recommendation: "CRITICAL: Data Exfiltration in progress. Isolate the source IP and perform immediate forensic analysis on the destination IP.",
            })
          );
        }
      }
    }

    return findings;
  }
};