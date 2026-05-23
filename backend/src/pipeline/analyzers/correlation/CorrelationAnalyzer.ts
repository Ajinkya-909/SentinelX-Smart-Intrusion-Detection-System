import { IAnalyzer } from "../shared/interfaces/Analyzer.interface.js";
import { AnalyzerFinding } from "../shared/findings/Finding.types.js";
import { AnalysisContext } from "../shared/context/AnalysisContext.js";
import logger from "../../../config/logger.js";

// Import all 5 detectors
import { reconExploitationChainDetector } from "./detectors/reconExploitationChain.detector.js";
import { dataExfiltrationChainDetector } from "./detectors/dataExfiltrationChain.detector.js";
import { lateralMovementDetector } from "./detectors/lateralMovement.detector.js";
import { privilegeEscalationChainDetector } from "./detectors/privilegeEscalationChain.detector.js";
import { sessionHijackingDetector } from "./detectors/sessionHijacking.detector.js";

/**
 * CORRELATION ANALYZER
 *
 * Orchestrates 5 detectors for multi-step attack chain detection:
 * 1. Recon → Exploitation - Failed attempts followed by successful exploit
 * 2. Data Exfiltration Chain - Access pattern followed by large data transfer
 * 3. Lateral Movement - Single attacker accessing multiple user accounts
 * 4. Privilege Escalation Chain - Failed priv-esc followed by successful admin operation
 * 5. Session Hijacking - Concurrent sessions from different IPs/browsers
 *
 * Most advanced analyzer: detects sophisticated multi-step attacks
 */
export class CorrelationAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[CORRELATION ANALYZER] Starting analysis");

      // Execute all detectors in parallel
      const detectorResults = await Promise.all([
        this.executeDetector(
          "Recon → Exploitation",
          reconExploitationChainDetector,
          ctx,
        ),
        this.executeDetector(
          "Data Exfiltration",
          dataExfiltrationChainDetector,
          ctx,
        ),
        this.executeDetector("Lateral Movement", lateralMovementDetector, ctx),
        this.executeDetector(
          "Privilege Escalation",
          privilegeEscalationChainDetector,
          ctx,
        ),
        this.executeDetector(
          "Session Hijacking",
          sessionHijackingDetector,
          ctx,
        ),
      ]);

      // Flatten and collect findings
      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[CORRELATION ANALYZER] Complete. Found ${findings.length} findings in ${executionTime}ms`,
      );

      return findings;
    } catch (error) {
      logger.error(
        `[CORRELATION ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`,
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
        `[CORRELATION ANALYZER] ${name} detector: ${findings.length} findings (${executionTime}ms)`,
      );

      return { findings };
    } catch (error) {
      logger.error(
        `[CORRELATION ANALYZER] ${name} detector failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { findings: [] };
    }
  }
}

// Export singleton instance
export const correlationAnalyzer = new CorrelationAnalyzer();
