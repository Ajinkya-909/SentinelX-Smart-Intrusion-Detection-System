import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import logger from "../../../config/logger";

// Import all 10 detectors
import { bruteForceDetector } from "./detectors/bruteForce.detector";
import { rapidAuthVelocityDetector } from "./detectors/rapidAuthVelocity.detector";
import { accountTakeoverDetector } from "./detectors/accountTakeover.detector";
import { impossibleVelocityDetector } from "./detectors/impossibleVelocity.detector";
import { privilegeEscalationDetector } from "./detectors/privilegeEscalation.detector";
import { sqlInjectionDetector } from "./detectors/sqlInjection.detector";
import { xssDetector } from "./detectors/xss.detector";
import { pathTraversalDetector } from "./detectors/pathTraversal.detector";
import { scannerBotDetector } from "./detectors/scannerBot.detector";
import { maliciousUploadDetector } from "./detectors/maliciousUpload.detector";

/**
 * RULE ANALYZER
 *
 * Orchestrates 10 detectors for pattern-based threat detection:
 * 1. Brute Force Authentication
 * 2. Rapid Auth Velocity
 * 3. Account Takeover Indicators
 * 4. Impossible IP Velocity
 * 5. Privilege Escalation Attempts
 * 6. SQL Injection Patterns
 * 7. XSS Patterns
 * 8. Path Traversal Attempts
 * 9. Scanner/Bot Detection
 * 10. Malicious File Uploads
 */
export class RuleAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[RULE ANALYZER] Starting analysis");

      // Execute all detectors in parallel
      const detectorResults = await Promise.all([
        this.executeDetector("Brute Force", bruteForceDetector, ctx),
        this.executeDetector(
          "Rapid Auth Velocity",
          rapidAuthVelocityDetector,
          ctx,
        ),
        this.executeDetector("Account Takeover", accountTakeoverDetector, ctx),
        this.executeDetector(
          "Impossible Velocity",
          impossibleVelocityDetector,
          ctx,
        ),
        this.executeDetector(
          "Privilege Escalation",
          privilegeEscalationDetector,
          ctx,
        ),
        this.executeDetector("SQL Injection", sqlInjectionDetector, ctx),
        this.executeDetector("XSS", xssDetector, ctx),
        this.executeDetector("Path Traversal", pathTraversalDetector, ctx),
        this.executeDetector("Scanner Bot", scannerBotDetector, ctx),
        this.executeDetector("Malicious Upload", maliciousUploadDetector, ctx),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[RULE ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`,
      );

      return findings;
    } catch (error) {
      logger.error(
        `[RULE ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`,
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
        `[RULE ANALYZER] ${name} detector: ${findings.length} findings (${executionTime}ms)`,
      );

      return { findings };
    } catch (error) {
      logger.error(
        `[RULE ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { findings: [] };
    }
  }
}

// Export singleton instance
export const ruleAnalyzer = new RuleAnalyzer();
