import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const lateralMovementDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Focus on successful authentication events
    const authLogs = ctx.logs.filter(log => log.metadata?.security?.authSuccess === true);
    
    // Group by username (actor.username) since grouping util doesn't support arbitrary fields
    const logsByUser = new Map<string, any[]>();
    for (const log of authLogs) {
      const uname = log.metadata?.actor?.username ?? "unknown";
      if (!logsByUser.has(uname)) logsByUser.set(uname, []);
      logsByUser.get(uname)!.push(log);
    }

    for (const [username, logs] of logsByUser) {
      if (!username || username === "unknown") continue;

      // Track distinct source IPs used by this single user
      const distinctIps = new Set(logs.map((log: any) => log.ip_address).filter(Boolean));

      // If one user is hopping between multiple IPs in this short temporal batch
      if (distinctIps.size > 1) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "correlation",
            finding_type: "LATERAL_MOVEMENT",
            severity: FindingSeverity.HIGH,
            confidence: 0.88,
            title: "Potential Lateral Movement",
            summary: `User '${username}' authenticated from multiple different IPs (${Array.from(distinctIps).join(', ')}) in a short timeframe.`,
            log_references: logs.slice(0, 10).map((l: any) => l.id),
            affected_entities: { username },
            evidence: {
              ips_involved: Array.from(distinctIps),
              total_auth_events: logs.length
            },
            metadata: { rule_id: "corr_3_1" },
            recommendation: "Investigate if this user is performing lateral movement. Check if the user is using a VPN or if credentials were compromised and used from a new location.",
          })
        );
      }
    }
    return findings;
  }
};