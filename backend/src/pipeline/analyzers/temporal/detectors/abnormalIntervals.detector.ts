import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { statistics } from "../../shared/utils/statistics.util";

export const abnormalIntervalsDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    const logsByIp = grouping.groupByIp(ctx.logs);

    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;
      
      // We need a decent sample size to prove automated behavior
      if (logs.length < 15) continue;

      const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const intervals: number[] = [];

      // Calculate the time difference (in seconds) between every consecutive request
      for (let i = 1; i < sortedLogs.length; i++) {
        const curr = sortedLogs[i];
        const prev = sortedLogs[i - 1];
        if (!curr || !prev) continue;
        const diff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
        intervals.push(diff);
      }

      const meanInterval = statistics.mean(intervals);
      const stddev = statistics.stddev(intervals);

      // If the standard deviation is extremely low (less than 1.5 seconds) AND the mean interval is greater than 5 seconds
      // it means the script is polling/beaconing exactly on a rigid timer.
      if (stddev < 1.5 && meanInterval > 5) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "ABNORMAL_INTERVALS",
            severity: FindingSeverity.HIGH,
            confidence: 0.98, // Mathematics makes this a near certainty
            title: "Automated Beaconing / Bot Behavior",
            summary: `IP ${ip} is making requests at mathematically perfect intervals (every ~${Math.round(meanInterval)}s).`,
            log_references: sortedLogs.slice(0, 10).map((log) => log.id),
            affected_entities: {
              ip_address: ip,
            },
            evidence: {
              total_requests: logs.length,
              mean_interval_seconds: Math.round(meanInterval * 100) / 100,
              standard_deviation: Math.round(stddev * 1000) / 1000,
              is_rigid_timer: true
            },
            metadata: { rule_id: "temp_3_2" },
            recommendation: "Block IP immediately. This is highly indicative of Command and Control (C2) beaconing, a scraper bot, or a scheduled malicious script.",
          })
        );
      }
    }

    return findings;
  },
};