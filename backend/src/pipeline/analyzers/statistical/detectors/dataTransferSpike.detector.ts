import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { statistics } from "../../shared/utils/statistics.util";

export const dataTransferSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Filter logs that actually have byte transfer metrics
    const dataLogs = ctx.logs.filter(log => log.metadata?.parserMetadata?.bytes !== undefined);
    if (dataLogs.length < 50) return findings;

    const logsByIp = grouping.groupByIp(dataLogs);
    const dataTransferPerIp = new Map<string, number>();
    const transferAmounts: number[] = [];

    // Calculate total bytes transferred per IP in this window
    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;
      
      const totalBytes = logs.reduce((sum, log) => {
        const bytes = Number(log.metadata?.parserMetadata?.bytes) || 0;
        return sum + bytes;
      }, 0);

      dataTransferPerIp.set(ip, totalBytes);
      transferAmounts.push(totalBytes);
    }

    if (transferAmounts.length < 3) return findings;

    const meanBytes = statistics.mean(transferAmounts);
    const stddevBytes = statistics.stddev(transferAmounts);
    
    // Set a minimum threshold (e.g., 50MB) to avoid flagging spikes in tiny traffic environments
    const MIN_EXFIL_THRESHOLD_BYTES = 50 * 1024 * 1024; 

    for (const [ip, totalBytes] of dataTransferPerIp.entries()) {
      // If the IP transferred significantly more than the crowd average AND exceeds our hard minimum
      if (totalBytes > MIN_EXFIL_THRESHOLD_BYTES && totalBytes > (meanBytes + (stddevBytes * 3))) {
        
        const zScore = statistics.zScore(totalBytes, meanBytes, stddevBytes);
        const mbTransferred = Math.round(totalBytes / 1024 / 1024);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "DATA_TRANSFER_SPIKE",
            severity: FindingSeverity.CRITICAL, // Data exfiltration is almost always critical
            confidence: Math.min(0.95, 0.7 + (Math.abs(zScore) * 0.05)),
            title: "Anomalous Data Transfer (Possible Exfiltration)",
            summary: `IP ${ip} transferred ${mbTransferred}MB of data, wildly exceeding the network average.`,
            log_references: logsByIp.get(ip)?.slice(0, 50).map((l: any) => l.id) || [],
            affected_entities: {
              ip_address: ip,
              total_bytes_transferred: totalBytes
            },
            evidence: {
              mb_transferred: mbTransferred,
              crowd_mean_mb: Math.round(meanBytes / 1024 / 1024),
              z_score: Math.round(zScore * 100) / 100,
            },
            metadata: { rule_id: "stat_2_1" },
            recommendation: "CRITICAL: Isolate IP and verify if the downloaded endpoints contain sensitive PII, database dumps, or proprietary source code.",
          }),
        );
      }
    }

    return findings;
  },
};