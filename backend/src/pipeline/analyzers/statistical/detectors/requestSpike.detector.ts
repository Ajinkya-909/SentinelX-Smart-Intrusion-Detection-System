import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { statistics } from "../../shared/utils/statistics.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const requestSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length < 50) return findings; // Need a decent sample size for statistics

    // Group logs by IP address to compare actors against the crowd
    const logsByIp = grouping.groupByIp(ctx.logs);
    const ipCounts: number[] = [];
    
    for (const [ip, logs] of logsByIp) {
      if (ip !== "unknown") ipCounts.push(logs.length);
    }

    if (ipCounts.length < 3) return findings; // Need a crowd to establish a baseline

    const mean = statistics.mean(ipCounts);
    const stddev = statistics.stddev(ipCounts);
    
    // Minimum threshold to prevent flagging slight variations in low-traffic windows
    const minThreshold = Math.max(config.statistical.spikeMultiplier, mean + (stddev * 3));

    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;

      const count = logs.length;

      // If an IP is operating > 3 standard deviations above the crowd average
      if (count > minThreshold && count > 50) {
        const zScore = statistics.zScore(count, mean, stddev);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "REQUEST_SPIKE",
            severity: FindingSeverity.HIGH,
            confidence: Math.min(0.95, 0.6 + (Math.abs(zScore) * 0.05)), // Higher Z-Score = Higher Confidence
            title: "Anomalous Request Volume (Z-Score Spike)",
            summary: `IP ${ip} generated ${count} requests, mathematically anomalous compared to the network average of ${Math.round(mean)}.`,
            log_references: logs.slice(0, 50).map((log: any) => log.id),
            affected_entities: {
              ip_address: ip,
              request_count: count,
            },
            evidence: {
              crowd_mean: Math.round(mean),
              crowd_stddev: Math.round(stddev * 100) / 100,
              spike_count: count,
              z_score: Math.round(zScore * 100) / 100,
            },
            metadata: { rule_id: "stat_1_1" },
            recommendation: "Investigate IP for DoS, automated scraping, or misconfigured API integrations.",
          }),
        );
      }
    }

    return findings;
  },
};