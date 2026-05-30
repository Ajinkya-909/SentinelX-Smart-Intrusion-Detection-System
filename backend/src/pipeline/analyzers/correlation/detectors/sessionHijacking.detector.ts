import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";

export const sessionHijackingDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Group logs by Session ID (extracted by our new Normalizer/Parser)
    const logsBySession = new Map<string, any[]>();
    for (const log of ctx.logs) {
      const sid = log.metadata?.actor?.sessionId ?? "unknown";
      if (!logsBySession.has(sid)) logsBySession.set(sid, []);
      logsBySession.get(sid)!.push(log);
    }

    for (const [sessionId, logs] of logsBySession) {
      if (!sessionId || sessionId === "unknown" || sessionId === "undefined") continue;

      // Find unique IPs associated with this ONE session ID
      const distinctIps = new Set(logs.map((log: any) => log.ip_address).filter(Boolean));

      if (distinctIps.size > 1) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "correlation",
            finding_type: "SESSION_HIJACKING",
            severity: FindingSeverity.CRITICAL,
            confidence: 0.95,
            title: "Session Hijacking/Sharing Detected",
            summary: `Session '${sessionId}' is being used simultaneously from ${distinctIps.size} different IPs.`,
            log_references: logs.slice(0, 10).map((l: any) => l.id),
            affected_entities: { session_id: sessionId },
            evidence: { ips: Array.from(distinctIps), event_count: logs.length },
            metadata: { rule_id: "corr_5_1" },
            recommendation: "Revoke session immediately. User account potentially compromised."
          })
        );
      }
    }
    return findings;
  }
};