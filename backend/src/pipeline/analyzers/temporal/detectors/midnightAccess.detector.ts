import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";

export const midnightAccessDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const unusualHours = [1, 2, 3, 4]; // 1 AM to 4 AM range

    const findingsMap = new Map<string, any>();

    for (const log of ctx.logs) {
      if (log.metadata?.security === undefined) continue;
      if (log.metadata?.security?.authSuccess !== true) continue;

      const hour = timeline.getHour(log);

      if (unusualHours.includes(hour)) {
        const username = log.metadata?.actor?.username || "unknown";
        const ip = log.ip_address || "unknown";
        const key = `${username}_${ip}_${hour}`;

        if (!findingsMap.has(key)) {
          findingsMap.set(key, {
            username,
            ip,
            hour,
            logs: []
          });
        }
        findingsMap.get(key).logs.push(log);
      }
    }

    for (const [key, entry] of findingsMap) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "temporal",
          finding_type: "MIDNIGHT_ACCESS",
          severity: FindingSeverity.LOW,
          confidence: 0.70, // Lower confidence because night-shift workers exist
          title: "Midnight Access Detected",
          summary: `Successful login for ${entry.username} at ${entry.hour}:00 from ${entry.ip} (${entry.logs.length} occurrences).`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            username: entry.username,
            ip_address: entry.ip,
            hour: entry.hour,
          },
          evidence: {
            first_timestamp: entry.logs[0].timestamp,
            last_timestamp: entry.logs[entry.logs.length - 1].timestamp,
            occurrences: entry.logs.length,
            hour: entry.hour,
            is_unusual_hour: true,
          },
          metadata: { rule_id: "temp_2_2" },
          recommendation: "Review context. If this user does not normally log in at this hour, check for compromised credentials or impossible travel.",
        }),
      );
    }

    return findings;
  },
};