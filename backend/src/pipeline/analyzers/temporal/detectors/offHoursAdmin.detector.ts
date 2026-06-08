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

    const findingsMap = new Map<string, any>();

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
        const ip = log.ip_address || "unknown";
        const key = `${username}_${ip}_${hour}_${dayOfWeek}`;

        if (!findingsMap.has(key)) {
          findingsMap.set(key, {
            username: log.metadata?.actor?.username || "unknown",
            ip,
            hour,
            dayOfWeek,
            isBusinessDay,
            isOffHours,
            endpoint: log.metadata?.action?.endpoint,
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
          finding_type: "OFF_HOURS_ADMIN_ACCESS",
          severity: FindingSeverity.MEDIUM,
          confidence: 0.85,
          title: "Off-Hours Admin Access",
          summary: `Admin-level activity detected from ${entry.ip} for ${entry.username} at ${entry.hour}:00 on a ${entry.isBusinessDay ? 'business day' : 'non-business day'} (${entry.logs.length} requests).`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            username: entry.username,
            source_ip: entry.ip,
            target_endpoint: entry.endpoint,
          },
          evidence: {
            first_timestamp: entry.logs[0].timestamp,
            last_timestamp: entry.logs[entry.logs.length - 1].timestamp,
            occurrences: entry.logs.length,
            hour: entry.hour,
            day_of_week: entry.dayOfWeek,
            is_business_day: entry.isBusinessDay,
            is_off_hours: entry.isOffHours,
          },
          metadata: { rule_id: "temp_2_1" },
          recommendation: "Verify this activity with the administrator. If unauthorized, revoke session tokens and investigate for lateral movement.",
        }),
      );
    }

    return findings;
  },
};