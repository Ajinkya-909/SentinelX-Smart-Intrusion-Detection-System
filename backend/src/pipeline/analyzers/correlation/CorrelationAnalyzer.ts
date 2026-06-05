import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import logger from "../../../config/logger";

// Import the 5 "Chain" detectors + new Brute Force Campaign detector
import { reconExploitationChainDetector } from "./detectors/reconExploitationChain.detector";
import { dataExfiltrationChainDetector } from "./detectors/dataExfiltrationChain.detector";
import { lateralMovementDetector } from "./detectors/lateralMovement.detector";
import { privilegeEscalationChainDetector } from "./detectors/privilegeEscalationChain.detector";
import { sessionHijackingDetector } from "./detectors/sessionHijacking.detector";
import { bruteForceCampaignDetector } from "./detectors/bruteForceCampaign.detector";

export class CorrelationAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[CORRELATION ANALYZER] Starting Kill Chain analysis");

      const detectorResults = await Promise.all([
        this.executeDetector("Recon → Exploit", reconExploitationChainDetector, ctx),
        this.executeDetector("Data Exfiltration", dataExfiltrationChainDetector, ctx),
        this.executeDetector("Lateral Movement", lateralMovementDetector, ctx),
        this.executeDetector("Privilege Escalation Chain", privilegeEscalationChainDetector, ctx),
        this.executeDetector("Session Hijacking", sessionHijackingDetector, ctx),
        this.executeDetector("Brute-Force Campaign", bruteForceCampaignDetector, ctx),
      ]);

      for (const result of detectorResults) {
        findings.push(...result.findings);
      }

      logger.info(`[CORRELATION ANALYZER] Finished. Generated ${findings.length} attack chain findings in ${Date.now() - startTime}ms`);
      return findings;
    } catch (error) {
      logger.error(`[CORRELATION ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeDetector(name: string, detector: any, ctx: AnalysisContext) {
    try {
      const findings = await detector.detect(ctx);
      return { findings };
    } catch (error) {
      logger.error(`[CORRELATION ANALYZER] ${name} detector failed: ${error}`);
      return { findings: [] };
    }
  }
}

export const correlationAnalyzer = new CorrelationAnalyzer();