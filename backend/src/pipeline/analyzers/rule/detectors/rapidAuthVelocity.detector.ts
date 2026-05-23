import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { slidingWindow } from "../../shared/utils/slidingWindow.util";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 2: Rapid Authentication Velocity
 *
 * Triggers when:
 * - 10+ authentication attempts
 * - FROM same source (IP + user_id combination)
 * - WITHIN 30 seconds
 */
export const rapidAuthVelocityDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.authEvents.length === 0) return findings;

    // Group by IP + User combination
    const byCombo = new Map<string, typeof ctx.authEvents>();
    for (const log of ctx.authEvents) {
      const userId = log.metadata?.user_id || "unknown";
      const key = `${userId}|${log.ip_address}`;

      if (!byCombo.has(key)) {
        byCombo.set(key, []);
      }
      byCombo.get(key)!.push(log);
    }

    for (const [combo, logs] of byCombo) {
      const count = slidingWindow.countInWindow(
        logs,
        config.bruteForce.rapidWindow,
      );

      if (count >= config.bruteForce.rapidThreshold) {
        const [userId, ip] = combo.split("|");

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "rule",
            finding_type: "RAPID_AUTH_VELOCITY",
            severity: FindingSeverity.MEDIUM_HIGH,
            confidence: 0.85,
            title: "Rapid Authentication Attempts Detected",
            summary: "High-speed authentication attempts detected",
            log_references: logs.map((log) => log.id),
            affected_entities: {
              username: userId,
              ip_address: ip,
              attempt_count: count,
            },
            evidence: {
              attempts_in_window: count,
              time_window_seconds: config.bruteForce.rapidWindow,
              interval_avg_ms:
                config.bruteForce.rapidWindow > 0
                  ? (config.bruteForce.rapidWindow * 1000) / count
                  : 0,
            },
            metadata: {
              rule_id: "rule_1_2",
              rule_version: "1.0",
              trigger_threshold: config.bruteForce.rapidThreshold,
              actual_count: count,
            },
            recommendation:
              "Investigate user account. Apply temporary lockout if pattern continues.",
          }),
        );
      }
    }

    return findings;
  },
};

