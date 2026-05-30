import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const longSessionDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Group logs by explicit Session ID rather than just IP (since IPs can be shared via NAT)
    const logsBySession = new Map<string, any[]>();
    for (const log of ctx.logs) {
      const sid = log.metadata?.actor?.sessionId ?? "unknown";
      if (!logsBySession.has(sid)) logsBySession.set(sid, []);
      logsBySession.get(sid)!.push(log);
    }

    for (const [sessionId, logs] of logsBySession) {
      if (!sessionId || sessionId === "unknown" || sessionId === "undefined") continue;

      // Ensure logs are sorted chronologically
      const sortedLogs = logs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (sortedLogs.length === 0) continue;
      const firstEvent = new Date(sortedLogs[0]!.timestamp).getTime();
      const lastEvent = new Date(sortedLogs[sortedLogs.length - 1]!.timestamp).getTime();
      
      // Calculate session duration in seconds
      const durationSeconds = (lastEvent - firstEvent) / 1000;

      // If the session has been continuously active longer than the maximum allowed threshold (e.g., 24 hours)
      const maxDurationSeconds = (config.temporal as any).longSession?.maxDurationSeconds ?? 24 * 3600;
      if (durationSeconds >= maxDurationSeconds) {
        
        // Grab the username and IP associated with this long session
        const username = sortedLogs[0].metadata?.actor?.username || "unknown";
        const ip = sortedLogs[0].ip_address || "unknown";

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "LONG_SESSION",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.85,
            title: "Unnaturally Long Session Detected",
            summary: `Session for user '${username}' has been continuously active for ${Math.round(durationSeconds / 3600)} hours.`,
            log_references: [sortedLogs[0].id, sortedLogs[sortedLogs.length - 1].id], // Link the start and end logs
            affected_entities: {
              session_id: sessionId,
              username: username,
              ip_address: ip
            },
            evidence: {
              session_duration_seconds: durationSeconds,
              session_start: sortedLogs[0].timestamp,
              last_activity: sortedLogs[sortedLogs.length - 1].timestamp,
              total_events_in_session: sortedLogs.length
            },
            metadata: { 
              rule_id: "temp_3_1",
              threshold_seconds: maxDurationSeconds
            },
            recommendation: "Force expire this session token. Investigate if the session was hijacked or if the application lacks proper timeout controls.",
          })
        );
      }
    }

    return findings;
  },
};