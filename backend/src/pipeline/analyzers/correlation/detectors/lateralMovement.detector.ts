import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 3: Lateral Movement
 *
 * Detects attack chain:
 * - Single attacker (by IP) compromises multiple user accounts
 * - Or single user (by ID) accesses from multiple IPs
 * - Within 1 hour
 */
export const lateralMovementDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length < 2) return findings;

    // Check if single IP is accessing many different users
    for (const [ipKey, logs] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      const ip = ipKey.replace("ip_", "");

      // Get all users accessed from this IP within time window
      const users = new Set<string>();
      const recentLogs = logs.filter((log) => {
        const now = new Date();
        const logTime = new Date(log.timestamp);
        const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;
        return diffSeconds <= config.correlation.lateralMovementWindow;
      });

      for (const log of recentLogs) {
        const userId = log.metadata?.user_id;
        if (userId) users.add(userId);
      }

      // If single IP accessing 3+ user accounts, it's lateral movement
      if (users.size >= 3) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "correlation",
            finding_type: "LATERAL_MOVEMENT",
            severity: FindingSeverity.HIGH,
            confidence: 0.88,
            title: "Lateral Movement Detected",
            summary: `IP ${ip} accessed ${users.size} different user accounts`,
            log_references: recentLogs.slice(0, 30).map((log) => log.id),
            affected_entities: {
              attacker_ip: ip,
              compromised_users: Array.from(users),
              user_count: users.size,
            },
            evidence: {
              unique_users_accessed: users.size,
              total_requests: recentLogs.length,
              time_window_seconds: config.correlation.lateralMovementWindow,
            },
            metadata: {
              rule_id: "corr_2_1",
              rule_version: "1.0",
              window_seconds: config.correlation.lateralMovementWindow,
            },
            recommendation:
              "CRITICAL: Block attacker IP. Reset passwords for compromised users. Activate incident response.",
          }),
        );
      }
    }

    return findings;
  },
};
