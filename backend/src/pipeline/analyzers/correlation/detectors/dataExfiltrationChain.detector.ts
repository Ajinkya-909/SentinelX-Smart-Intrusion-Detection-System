import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 2: Data Exfiltration Chain
 *
 * Detects attack chain:
 * - Suspicious access pattern (multiple requests to sensitive endpoints)
 * - Followed by large data transfer
 * - Within 30 minutes
 */
export const dataExfiltrationChainDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length < 2) return findings;

    // Group by IP
    for (const [ipKey, logs] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      const ip = ipKey.replace("ip_", "");
      const sorted = timeline.sortByTimestamp(logs);

      // Find high-response-size requests (data transfer phase)
      let maxDataTransfer = 0;
      let maxDataLog: (typeof logs)[0] | null = null;

      for (const log of sorted) {
        if ((log.response_size_bytes || 0) > maxDataTransfer) {
          maxDataTransfer = log.response_size_bytes || 0;
          maxDataLog = log;
        }
      }

      if (!maxDataLog || maxDataTransfer < 1000000) continue; // 1MB minimum

      // Find suspicious access before data transfer
      const logsBeforeTransfer = sorted.filter((log) => {
        const diff =
          new Date(maxDataLog!.timestamp).getTime() -
          new Date(log.timestamp).getTime();
        return diff > 0 && diff <= config.correlation.dataExfilWindow * 1000;
      });

      if (logsBeforeTransfer.length > 5) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "correlation",
            finding_type: "DATA_EXFILTRATION_CHAIN",
            severity: FindingSeverity.CRITICAL,
            confidence: 0.95,
            title: "Data Exfiltration Chain Detected",
            summary: `IP ${ip} accessed multiple endpoints then transferred large amount of data`,
            log_references: [
              ...logsBeforeTransfer.slice(0, 10).map((log) => log.id),
              maxDataLog.id,
            ],
            affected_entities: {
              source_ip: ip,
              data_exfil_size_bytes: maxDataTransfer,
              endpoints_accessed: new Set(
                logsBeforeTransfer.map((log) => log.endpoint),
              ).size,
            },
            evidence: {
              suspicious_accesses: logsBeforeTransfer.length,
              data_transfer_bytes: maxDataTransfer,
              data_transfer_mb: Math.round(maxDataTransfer / 1024 / 1024),
              time_before_exfil_seconds:
                (new Date(maxDataLog.timestamp).getTime() -
                  new Date(logsBeforeTransfer[0]!.timestamp).getTime()) /
                1000,
            },
            metadata: {
              rule_id: "corr_1_2",
              rule_version: "1.0",
              window_seconds: config.correlation.dataExfilWindow,
            },
            recommendation:
              "CRITICAL: Block IP/user immediately. Review accessed files. Notify security team of possible data breach.",
          }),
        );
      }
    }

    return findings;
  },
};

