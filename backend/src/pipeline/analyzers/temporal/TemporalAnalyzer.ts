import { IAnalyzer } from "../shared/interfaces/Analyzer.interface.js";
import { AnalyzerFinding } from "../shared/findings/Finding.types.js";
import { AnalysisContext } from "../shared/context/AnalysisContext.js";
import logger from "../../../config/logger.js";

// Import all 6 detectors
import { rapidBurstDetector } from "./detectors/rapidBurst.detector.js";
import { reconnaissanceBurstDetector } from "./detectors/reconnaissanceBurst.detector.js";
import { offHoursAdminDetector } from "./detectors/offHoursAdmin.detector.js";
import { midnightAccessDetector } from "./detectors/midnightAccess.detector.js";
import { longSessionDetector } from "./detectors/longSession.detector.js";
import { abnormalIntervalsDetector } from "./detectors/abnormalIntervals.detector.js";

/**
 * TEMPORAL ANALYZER
 *
 * Orchestrates 6 detectors for time-based threat detection:
 * 1. Rapid Burst - High-volume attacks in short time
 * 2. Reconnaissance Burst - Systematic scanning patterns
 * 3. Off-Hours Admin Access - Unauthorized admin activities
 * 4. Midnight Access - Suspicious login times
 * 5. Long Session - Extended session persistence
 * 6. Abnormal Intervals - Bot/automated behavior
 *
 * Uses timing patterns and intervals to detect attacks
 */
export class TemporalAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[TEMPORAL ANALYZER] Starting analysis");

      // Execute all detectors in parallel
      const detectorResults = await Promise.all([
        this.executeDetector("Rapid Burst", rapidBurstDetector, ctx),
        this.executeDetector(
          "Reconnaissance Burst",
          reconnaissanceBurstDetector,
          ctx,
        ),
        this.executeDetector("Off-Hours Admin", offHoursAdminDetector, ctx),
        this.executeDetector("Midnight Access", midnightAccessDetector, ctx),
        this.executeDetector("Long Session", longSessionDetector, ctx),
        this.executeDetector(
          "Abnormal Intervals",
          abnormalIntervalsDetector,
          ctx,
        ),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[TEMPORAL ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`,
      );

      return findings;
    } catch (error) {
      logger.error(
        `[TEMPORAL ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async executeDetector(
    name: string,
    detector: any,
    ctx: AnalysisContext,
  ): Promise<{ findings: AnalyzerFinding[] }> {
    const startTime = Date.now();

    try {
      const findings = await detector.detect(ctx);
      const executionTime = Date.now() - startTime;

      logger.debug(
        `[TEMPORAL ANALYZER] ${name} detector: ${findings.length} findings (${executionTime}ms)`,
      );

      return { findings };
    } catch (error) {
      logger.error(
        `[TEMPORAL ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { findings: [] };
    }
  }
}

// Export singleton instance
export const temporalAnalyzer = new TemporalAnalyzer();
