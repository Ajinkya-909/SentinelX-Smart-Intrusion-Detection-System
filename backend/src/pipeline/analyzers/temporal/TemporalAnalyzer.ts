import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import logger from "../../../config/logger";

// Import all 6 context-aware detectors
import { rapidBurstDetector } from "./detectors/rapidBurst.detector";
import { reconnaissanceBurstDetector } from "./detectors/reconnaissanceBurst.detector";
import { offHoursAdminDetector } from "./detectors/offHoursAdmin.detector";
import { midnightAccessDetector } from "./detectors/midnightAccess.detector";
import { longSessionDetector } from "./detectors/longSession.detector";
import { abnormalIntervalsDetector } from "./detectors/abnormalIntervals.detector";

/**
 * TEMPORAL ANALYZER
 *
 * Orchestrates 6 detectors for time-based threat detection:
 * 1. Rapid Burst - Volumetric attacks (DDoS)
 * 2. Reconnaissance Burst - Systematic scanning patterns
 * 3. Off-Hours Admin Access - Unauthorized admin activities
 * 4. Midnight Access - Suspicious login times
 * 5. Long Session - Extended session persistence (Hijacking)
 * 6. Abnormal Intervals - Bot/automated behavior (Beaconing)
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
        this.executeDetector("Reconnaissance Burst", reconnaissanceBurstDetector, ctx),
        this.executeDetector("Off-Hours Admin", offHoursAdminDetector, ctx),
        this.executeDetector("Midnight Access", midnightAccessDetector, ctx),
        this.executeDetector("Long Session", longSessionDetector, ctx),
        this.executeDetector("Abnormal Intervals", abnormalIntervalsDetector, ctx),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(`[TEMPORAL ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`);

      return findings;
    } catch (error) {
      logger.error(`[TEMPORAL ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeDetector(name: string, detector: any, ctx: AnalysisContext): Promise<{ findings: AnalyzerFinding[] }> {
    const startTime = Date.now();
    try {
      const findings = await detector.detect(ctx);
      logger.debug(`[TEMPORAL ANALYZER] ${name} detector: ${findings.length} findings (${Date.now() - startTime}ms)`);
      return { findings };
    } catch (error) {
      logger.error(`[TEMPORAL ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`);
      return { findings: [] };
    }
  }
}

export const temporalAnalyzer = new TemporalAnalyzer();