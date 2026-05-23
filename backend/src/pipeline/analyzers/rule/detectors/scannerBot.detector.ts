import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 9: Scanner/Bot Detection
 *
 * Triggers when request user_agent matches known scanners:
 * - sqlmap
 * - nikto
 * - nmap
 * - masscan
 * - shodan
 * - nessus
 * - qualys
 * - burp
 * - zaproxy
 */
export const scannerBotDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Group logs by IP
    const byIp = grouping.groupByIp(ctx.logs);

    for (const [ip, logs] of byIp) {
      let scannerType = "";
      let scannerLogs: typeof logs = [];

      // Check for scanner patterns
      for (const log of logs) {
        const ua = (log.user_agent || "").toLowerCase();

        for (const pattern of config.scannerBotPatterns) {
          if (ua.includes(pattern.toLowerCase())) {
            scannerType = pattern;
            scannerLogs.push(log);
            break;
          }
        }
      }

      if (scannerLogs.length > 0 && scannerType) {
        // Count unique endpoints scanned
        const endpoints = grouping.getUniqueValues(scannerLogs, "endpoint");

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "SCANNER_BOT_DETECTED",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.85,
            title: "Security Scanner Detected",
            summary: "Requests from known security scanner detected",
            log_references: scannerLogs.map((log) => log.id),
            affected_entities: {
              source_ip: ip,
              user_agent: scannerLogs[0]?.user_agent || "unknown",
              scanner_type: scannerType,
            },
            evidence: {
              scanner_type: scannerType,
              request_count: scannerLogs.length,
              unique_endpoints_scanned: endpoints.size,
              endpoints: Array.from(endpoints),
            },
            metadata: {
              rule_id: "rule_5_1",
              rule_version: "1.0",
            },
            recommendation:
              "Block IP immediately. Review scanner activity logs for vulnerabilities discovered.",
          }),
        );
      }
    }

    return findings;
  },
};

