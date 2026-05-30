import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import logger from "../../../config/logger";

// Import all 5 context-aware detectors
import { requestSpikeDetector } from "./detectors/requestSpike.detector";
import { errorRateSpikeDetector } from "./detectors/errorRateSpike.detector";
import { dataTransferSpikeDetector } from "./detectors/dataTransferSpike.detector";
import { endpointDiversitySpikeDetector } from "./detectors/endpointDiversitySpike.detector";
import { criticalEventSpikeDetector } from "./detectors/criticalEventSpike.detector";

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
        this.executeDetector("Data Transfer Spike", dataTransferSpikeDetector, ctx),
        this.executeDetector("Endpoint Diversity", endpointDiversitySpikeDetector, ctx),
        this.executeDetector("Critical Event Spike", criticalEventSpikeDetector, ctx),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(`[STATISTICAL ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`);

      return findings;
    } catch (error) {
      logger.error(`[STATISTICAL ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeDetector(name: string, detector: any, ctx: AnalysisContext): Promise<{ findings: AnalyzerFinding[] }> {
    const startTime = Date.now();
    try {
      const findings = await detector.detect(ctx);
      logger.debug(`[STATISTICAL ANALYZER] ${name} detector: ${findings.length} findings (${Date.now() - startTime}ms)`);
      return { findings };
    } catch (error) {
      logger.error(`[STATISTICAL ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`);
      return { findings: [] };
    }
  }
}

export const statisticalAnalyzer = new StatisticalAnalyzer();