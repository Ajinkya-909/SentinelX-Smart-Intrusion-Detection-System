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

    const findingsMap = new Map<string, any>();

    for (const log of ctx.logs) {
      const userAgent = log.metadata?.client?.userAgent?.toLowerCase();
      
      if (!userAgent) continue;

      for (const scanner of knownScannerAgents) {
        if (userAgent.includes(scanner)) {
          
          const ip = log.ip_address || "unknown";
          const key = `${ip}_${scanner}`;

          if (!findingsMap.has(key)) {
            findingsMap.set(key, {
              ip,
              scanner,
              userAgent,
              logs: []
            });
          }

          findingsMap.get(key).logs.push(log);
          break; // Report once per log
        }
      }
    }

    for (const [key, entry] of findingsMap) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "rule",
          finding_type: "SCANNER_BOT_DETECTED",
          severity: FindingSeverity.MEDIUM,
          confidence: 0.99, // 99% confident if they broadcast a known malicious user-agent
          title: "Automated Security Scanner Detected",
          summary: `IP ${entry.ip} is using known security scanner: ${entry.scanner} (${entry.logs.length} requests)`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            ip_address: entry.ip,
          },
          evidence: {
            user_agent: entry.userAgent,
            scanner_family: entry.scanner,
            occurrences: entry.logs.length,
          },
          metadata: { rule_id: "rule_bot_1" },
          recommendation: "Add IP to WAF blocklist. Scanners are often precursors to targeted exploitation.",
        })
      );
    }

    return findings;
  },
};