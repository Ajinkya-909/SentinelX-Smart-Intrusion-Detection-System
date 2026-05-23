import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { slidingWindow } from "../../shared/utils/slidingWindow.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 1: Brute Force Authentication Attack
 *
 * Triggers when:
 * - 50+ failed authentication attempts
 * - FROM same IP OR same user
 * - WITHIN 5 minutes
 */
export const bruteForceDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.failedAuthEvents.length === 0) return findings;

    // Check by IP
    const failedByIp = grouping.groupByIp(ctx.failedAuthEvents);
    for (const [ip, logs] of failedByIp) {
      const count = slidingWindow.countInWindow(
        logs,
        config.bruteForce.windowSeconds,
      );

      if (count >= config.bruteForce.threshold) {
        const confidence = Math.min(
          0.99,
          0.95 +
            (count > 100 ? 0.02 : 0) +
            (count > 200 ? 0.01 : 0) -
            (config.bruteForce.windowSeconds < 120 ? 0.05 : 0),
        );

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "BRUTE_FORCE_AUTH",
            severity: FindingSeverity.HIGH,
            confidence,
            title: "Brute Force Attack Detected",
            summary: `Multiple failed authentication attempts detected from ${ip}`,
            log_references: logs.map((log) => log.id),
            affected_entities: {
              ip_address: ip,
              attempt_count: count,
              unique_passwords_tried: new Set(
                logs.map((log) => log.metadata?.password_attempted || ""),
              ).size,
            },
            evidence: {
              failed_attempts: count,
              time_window_seconds: config.bruteForce.windowSeconds,
              first_attempt: logs[0]?.timestamp || new Date().toISOString(),
              last_attempt:
                logs[logs.length - 1]?.timestamp || new Date().toISOString(),
              event_type: "auth_failed",
            },
            metadata: {
              rule_id: "rule_1_1",
              rule_version: "1.0",
              trigger_threshold: config.bruteForce.threshold,
              actual_count: count,
            },
            recommendation:
              "Block IP address immediately. Reset user password. Review account for compromise.",
          }),
        );
      }
    }

    // Check by User
    const failedByUser = grouping.groupByUser(ctx.failedAuthEvents);
    for (const [userId, logs] of failedByUser) {
      const count = slidingWindow.countInWindow(
        logs,
        config.bruteForce.windowSeconds,
      );

      if (count >= config.bruteForce.threshold) {
        const confidence = Math.min(
          0.99,
          0.95 +
            (count > 100 ? 0.02 : 0) +
            (count > 200 ? 0.01 : 0) -
            (config.bruteForce.windowSeconds < 120 ? 0.05 : 0),
        );

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "BRUTE_FORCE_AUTH",
            severity: FindingSeverity.HIGH,
            confidence,
            title: "Brute Force Attack Detected",
            summary: `Multiple failed authentication attempts detected for user ${userId}`,
            log_references: logs.map((log) => log.id),
            affected_entities: {
              username: userId,
              attempt_count: count,
              unique_passwords_tried: new Set(
                logs.map((log) => log.metadata?.password_attempted || ""),
              ).size,
            },
            evidence: {
              failed_attempts: count,
              time_window_seconds: config.bruteForce.windowSeconds,
              first_attempt: logs[0]?.timestamp || new Date().toISOString(),
              last_attempt:
                logs[logs.length - 1]?.timestamp || new Date().toISOString(),
              event_type: "auth_failed",
            },
            metadata: {
              rule_id: "rule_1_1",
              rule_version: "1.0",
              trigger_threshold: config.bruteForce.threshold,
              actual_count: count,
            },
            recommendation:
              "Reset user password immediately. Enable MFA. Review account activity for compromise.",
          }),
        );
      }
    }

    return findings;
  },
};

