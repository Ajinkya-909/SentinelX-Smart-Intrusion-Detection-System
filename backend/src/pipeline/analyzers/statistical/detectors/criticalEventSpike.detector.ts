import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const criticalEventSpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    // Filter to only highly severe events mapped by our Context-Aware normalizer
    const criticalLogs = ctx.logs.filter(log => log.severity === "CRITICAL" || log.severity === "HIGH");
    
    // If more than 15% of all logs in this temporal window are HIGH/CRITICAL, the system is under siege
    const criticalRatio = ctx.logs.length > 0 ? criticalLogs.length / ctx.logs.length : 0;

    // Minimum volume threshold to avoid false alarms in low-traffic windows
    if (criticalLogs.length > 100 && criticalRatio > 0.15) {
      
      // Determine what the primary event type causing this spike is
      const eventTypeCounts = new Map<string, number>();
      for (const log of criticalLogs) {
        const count = eventTypeCounts.get(log.event_type) || 0;
        eventTypeCounts.set(log.event_type, count + 1);
      }
      
      // Sort to find the dominant error type
      const topEventTypes = Array.from(eventTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => `${type}: ${count}`);

        findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "statistical",
          finding_type: "CRITICAL_EVENT_SPIKE",
          severity: FindingSeverity.CRITICAL,
          confidence: 0.99,
          title: "System-Wide Critical Event Spike",
          summary: `${criticalLogs.length} severe events detected, comprising ${Math.round(criticalRatio * 100)}% of all traffic in this window.`,
          log_references: criticalLogs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            system_wide: true,
            total_critical_events: criticalLogs.length
          },
          evidence: {
            total_window_logs: ctx.logs.length,
            critical_logs: criticalLogs.length,
            critical_ratio_percentage: Math.round(criticalRatio * 100),
            primary_event_types: topEventTypes
          },
          metadata: { rule_id: "stat_3_1" },
          recommendation: "CRITICAL ALARM: The infrastructure is experiencing a massive anomaly. Check the primary event types to determine if this is a volumetric attack or a severe infrastructure failure.",
        }),
      );
    }

    return findings;
  },
};