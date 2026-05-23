import { IAnalyzer } from "../shared/interfaces/Analyzer.interface.js";
import { AnalyzerFinding } from "../shared/findings/Finding.types.js";
import { AnalysisContext } from "../shared/context/AnalysisContext.js";
import logger from "../../../config/logger.js";

// Import all 5 detectors
import { requestSpikeDetector } from "./detectors/requestSpike.detector.js";
import { errorRateSpikeDetector } from "./detectors/errorRateSpike.detector.js";
import { dataTransferSpikeDetector } from "./detectors/dataTransferSpike.detector.js";
import { endpointDiversitySpikeDetector } from "./detectors/endpointDiversitySpike.detector.js";
import { criticalEventSpikeDetector } from "./detectors/criticalEventSpike.detector.js";

/**
 * STATISTICAL ANALYZER
 *
 * Orchestrates 5 detectors for anomaly-based threat detection:
 * 1. Request Spike - Volume anomalies
 * 2. Error Rate Spike - Error ratio anomalies
 * 3. Data Transfer Spike - Data exfiltration indicators
 * 4. Endpoint Diversity Spike - Scanning/reconnaissance patterns
 * 5. Critical Event Spike - System health degradation
 *
 * Uses statistical baselines (mean, stddev, z-score) to detect anomalies
 */
export class StatisticalAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[STATISTICAL ANALYZER] Starting analysis");

      // Execute all detectors in parallel
      const detectorResults = await Promise.all([
        this.executeDetector("Request Spike", requestSpikeDetector, ctx),
        this.executeDetector("Error Rate Spike", errorRateSpikeDetector, ctx),
        this.executeDetector(
          "Data Transfer Spike",
          dataTransferSpikeDetector,
          ctx,
        ),
        this.executeDetector(
          "Endpoint Diversity Spike",
          endpointDiversitySpikeDetector,
          ctx,
        ),
        this.executeDetector(
          "Critical Event Spike",
          criticalEventSpikeDetector,
          ctx,
        ),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[STATISTICAL ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`,
      );

      return findings;
    } catch (error) {
      logger.error(
        `[STATISTICAL ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`,
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
        `[STATISTICAL ANALYZER] ${name} detector: ${findings.length} findings (${executionTime}ms)`,
      );

      return { findings };
    } catch (error) {
      logger.error(
        `[STATISTICAL ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { findings: [] };
    }
  }
}

// Export singleton instance
export const statisticalAnalyzer = new StatisticalAnalyzer();
