import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { timeline } from "../../shared/utils/timeline.util.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 5: Long Session
 *
 * Triggers when:
 * - Session duration exceeds baseline by 3x multiplier
 * - Indicates potential persistence/backdoor behavior
 */
export const longSessionDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.sessions.length === 0) return findings;

    // Calculate session durations
    const durations: number[] = [];
    for (const session of ctx.sessions) {
      const durationSeconds =
        (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      durations.push(durationSeconds);
    }

    if (durations.length < 2) return findings;

    // Calculate baseline
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const threshold = avgDuration * config.temporal.session.durationMultiplier;

    // Find long sessions
    for (const session of ctx.sessions) {
      const durationSeconds =
        (session.endTime.getTime() - session.startTime.getTime()) / 1000;

      if (durationSeconds >= threshold) {
        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "temporal",
            finding_type: "LONG_SESSION",
            severity: FindingSeverity.MEDIUM,
            confidence: 0.72,
            title: "Abnormally Long Session Detected",
            summary: `User ${session.userId} maintained active session for ${Math.round(durationSeconds / 3600)} hours`,
            log_references: session.events.slice(0, 30).map((log) => log.id),
            affected_entities: {
              username: session.userId,
              session_id: session.sessionId,
              duration_seconds: durationSeconds,
            },
            evidence: {
              session_duration_hours: Math.round(durationSeconds / 3600),
              session_start: session.startTime.toISOString(),
              session_end: session.endTime.toISOString(),
              baseline_duration_seconds: Math.round(avgDuration),
              multiplier:
                Math.round((durationSeconds / avgDuration) * 100) / 100,
            },
            metadata: {
              rule_id: "temp_2_3",
              rule_version: "1.0",
              threshold_multiplier: config.temporal.session.durationMultiplier,
            },
            recommendation:
              "Check for persistence mechanism. Review session activity. Verify with user.",
          }),
        );
      }
    }

    return findings;
  },
};
