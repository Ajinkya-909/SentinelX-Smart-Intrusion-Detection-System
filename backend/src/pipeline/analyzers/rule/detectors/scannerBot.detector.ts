import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const scannerBotDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    
    // Hardcoded list of known malicious/intrusive automated scanners
    const knownScannerAgents = [
      "nmap", "sqlmap", "nikto", "dirbuster", "zgrab", "masscan", 
      "w3af", "arachni", "netsparker", "nessus"
    ];

    for (const log of ctx.logs) {
      const userAgent = log.metadata?.client?.userAgent?.toLowerCase();
      
      if (!userAgent) continue;

      for (const scanner of knownScannerAgents) {
        if (userAgent.includes(scanner)) {
          findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "rule",
                finding_type: "SCANNER_BOT_DETECTED",
                severity: FindingSeverity.MEDIUM,
              confidence: 0.99, // 99% confident if they broadcast a known malicious user-agent
              title: "Automated Security Scanner Detected",
              summary: `IP ${log.ip_address} is using known security scanner: ${scanner}`,
              log_references: [log.id],
              affected_entities: {
                ip_address: log.ip_address,
              },
              evidence: {
                user_agent: userAgent,
                scanner_family: scanner
              },
              metadata: { rule_id: "rule_bot_1" },
              recommendation: "Add IP to WAF blocklist. Scanners are often precursors to targeted exploitation.",
            })
          );
          break; // Report once per log
        }
      }
    }
    return findings;
  },
};