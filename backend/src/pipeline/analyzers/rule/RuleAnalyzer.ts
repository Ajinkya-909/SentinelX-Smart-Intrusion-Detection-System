import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import logger from "../../../config/logger";

// Import existing (but updated) detectors
import { sqlInjectionDetector } from "./detectors/sqlInjection.detector";
import { xssDetector } from "./detectors/xss.detector";
import { bruteForceDetector } from "./detectors/bruteForce.detector";
import { pathTraversalDetector } from "./detectors/pathTraversal.detector";
// ... (import your other existing detectors)

// Import NEW Context-Aware Detectors
import { suricataDetector } from "./detectors/suricata.detector";

export class RuleAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[RULE ANALYZER] Starting analysis");

      // Execute detectors in parallel
      const detectorResults = await Promise.all([
        // 1. The Premium Intel (Fast-Track)
        this.executeDetector("Suricata IDS", suricataDetector, ctx),
        
        // 2. Web Payload Inspections
        this.executeDetector("SQL Injection", sqlInjectionDetector, ctx),
        this.executeDetector("XSS", xssDetector, ctx),
        this.executeDetector("Path Traversal", pathTraversalDetector, ctx),
        
        // 3. Authentication & Rules
        this.executeDetector("Brute Force", bruteForceDetector, ctx),
        // ... (call your other detectors)
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(`[RULE ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`);

      return findings;
    } catch (error) {
      logger.error(`[RULE ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeDetector(name: string, detector: any, ctx: AnalysisContext): Promise<{ findings: AnalyzerFinding[] }> {
    const startTime = Date.now();
    try {
      const findings = await detector.detect(ctx);
      logger.debug(`[RULE ANALYZER] ${name} detector: ${findings.length} findings (${Date.now() - startTime}ms)`);
      return { findings };
    } catch (error) {
      logger.error(`[RULE ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`);
      return { findings: [] };
    }
  }
}

export const ruleAnalyzer = new RuleAnalyzer();