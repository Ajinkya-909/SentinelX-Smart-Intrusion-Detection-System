import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { timeline } from "../../shared/utils/timeline.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const offHoursAdminDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    for (const log of ctx.logs) {
      const endpoint = log.metadata?.action?.endpoint?.toLowerCase() || "";
      const username = log.metadata?.actor?.username?.toLowerCase() || "";
      
      // Determine if this is admin activity
      const isAdminActivity = endpoint.includes("/admin") || endpoint.includes("/system") || username === "admin" || username === "root";

      if (!isAdminActivity) continue;

      const hour = timeline.getHour(log);
      const dayOfWeek = timeline.getDayOfWeek(log);
      
      const isOffHours = timeline.isOffHours(
        log,
        config.temporal.offHours.startHour,
        config.temporal.offHours.endHour,
      );
      
      const isBusinessDay = config.temporal.offHours.businessDays.includes(dayOfWeek);

      if (isOffHours || !isBusinessDay) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "OFF_HOURS_ADMIN_ACCESS",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.85,
            title: "Off-Hours Admin Access",
            summary: `Admin-level activity detected at ${hour}:00 on a ${isBusinessDay ? 'business day' : 'non-business day'}.`,
            log_references: [log.id],
            affected_entities: {
              username: log.metadata?.actor?.username || "unknown",
              source_ip: log.ip_address,
              target_endpoint: log.metadata?.action?.endpoint,
            },
            evidence: {
              timestamp: log.timestamp,
              hour,
              day_of_week: dayOfWeek,
              is_business_day: isBusinessDay,
              is_off_hours: isOffHours,
            },
            metadata: { rule_id: "temp_2_1" },
            recommendation: "Verify this activity with the administrator. If unauthorized, revoke session tokens and investigate for lateral movement.",
          }),
        );
      }
    }

    return findings;
  },
};