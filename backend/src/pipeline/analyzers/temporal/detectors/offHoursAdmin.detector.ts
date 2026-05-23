import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 3: Off-Hours Admin Access
 *
 * Triggers when:
 * - Admin user accessing admin endpoints
 * - During off-hours (10PM-6AM by default)
 * - Outside business days
 */
export const offHoursAdminDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.adminAccessEvents.length === 0) return findings;

    for (const log of ctx.adminAccessEvents) {
      const hour = timeline.getHour(log);
      const dayOfWeek = timeline.getDayOfWeek(log);

      const isOffHours = timeline.isOffHours(
        log,
        config.temporal.offHours.startHour,
        config.temporal.offHours.endHour,
      );

      const isBusinessDay =
        config.temporal.offHours.businessDays.includes(dayOfWeek);

      // Alert if off-hours AND not a business day
      if (isOffHours && !isBusinessDay) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "OFF_HOURS_ADMIN_ACCESS",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.75,
            title: "Off-Hours Admin Access",
            summary: `Admin user accessing admin endpoints at ${hour}:00 on non-business day`,
            log_references: [log.id],
            affected_entities: {
              username: log.metadata?.user_id || "unknown",
              admin_user: true,
              hour,
              day_of_week: dayOfWeek,
            },
            evidence: {
              timestamp: log.timestamp,
              endpoint: log.endpoint,
              hour,
              day_of_week: dayOfWeek,
              is_business_day: isBusinessDay,
              is_off_hours: isOffHours,
            },
            metadata: {
              rule_id: "temp_2_1",
              rule_version: "1.0",
            },
            recommendation:
              "Verify with user. Check for unusual admin activities. Investigate if unauthorized.",
          }),
        );
      }
    }

    return findings;
  },
};
