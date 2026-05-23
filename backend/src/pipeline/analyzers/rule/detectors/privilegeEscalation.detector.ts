import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { slidingWindow } from "../../shared/utils/slidingWindow.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 5: Privilege Escalation Attempt
 *
 * Triggers when:
 * - User with role ≠ 'admin'
 * - Request to endpoint matching /admin/* OR /api/admin/*
 * - Response code: 401 OR 403
 * - 3+ such attempts
 * - WITHIN 10 minutes
 */
export const privilegeEscalationDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Find all non-admin users trying to access admin endpoints
    const adminAccessAttempts = ctx.logs.filter((log) => {
      const isAdmin = log.metadata?.role === "admin";
      const isAdminEndpoint =
        log.endpoint?.includes("/admin") ||
        log.endpoint?.includes("/api/admin");
      const isAccessDenied = log.status_code === 401 || log.status_code === 403;

      return !isAdmin && isAdminEndpoint && isAccessDenied;
    });

    if (adminAccessAttempts.length === 0) return findings;

    // Group by user
    const byUser = new Map<string, typeof adminAccessAttempts>();
    for (const log of adminAccessAttempts) {
      const userId = log.metadata?.user_id || "unknown";
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(log);
    }

    // Check each user
    for (const [userId, logs] of byUser) {
      const count = slidingWindow.countInWindow(
        logs,
        config.privileEscalation.windowMinutes * 60,
      );

      if (count >= config.privileEscalation.adminAccessAttempts) {
        const endpoints = new Set(logs.map((log) => log.endpoint));

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "PRIVILEGE_ESCALATION_ATTEMPT",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.88,
            title: "Privilege Escalation Attempt",
            summary:
              "Non-admin user repeatedly attempted to access admin endpoints",
            log_references: logs.map((log) => log.id),
            affected_entities: {
              username: userId,
              user_role: "user",
              target_endpoints: Array.from(endpoints),
            },
            evidence: {
              failed_attempts: count,
              endpoints_targeted: endpoints.size,
              response_codes: [401, 403],
              time_window_minutes: config.privileEscalation.windowMinutes,
            },
            metadata: {
              rule_id: "rule_3_1",
              rule_version: "1.0",
              trigger_threshold: config.privileEscalation.adminAccessAttempts,
              actual_count: count,
            },
            recommendation:
              "Log security event. Monitor user for further suspicious activity. Consider temporary account lockout.",
          }),
        );
      }
    }

    return findings;
  },
};

