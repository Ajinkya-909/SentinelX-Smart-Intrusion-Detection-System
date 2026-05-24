import {
  AnalysisContext,
  NormalizedLog,
} from "../shared/context/AnalysisContext";
import { buildAnalysisContext } from "../shared/context/buildAnalysisContext";
import {
  AnalyzerFinding,
  AnalyzerResult,
} from "../shared/findings/Finding.types";
import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import logger from "../../../config/logger";
import { ruleAnalyzer } from "../rule/RuleAnalyzer";
import { statisticalAnalyzer } from "../statistical/StatisticalAnalyzer";
import { temporalAnalyzer } from "../temporal/TemporalAnalyzer";
import { correlationAnalyzer } from "../correlation/CorrelationAnalyzer";
import { mlAnalyzer } from "../ml/MLAnalyzer";

/**
 * Analyzer Orchestrator
 * Coordinates all 5 analyzers and collects findings
 *
 * Responsibilities:
 * - Load normalized logs
 * - Build analysis context (ONCE)
 * - Execute all analyzers in parallel
 * - Collect findings
 * - Return findings to pipeline
 *
 * DOES NOT persist findings - that's the pipeline's job
 */
export class AnalyzerOrchestrator {
  private ruleAnalyzer: IAnalyzer | null = null;
  private statisticalAnalyzer: IAnalyzer | null = null;
  private temporalAnalyzer: IAnalyzer | null = null;
  private correlationAnalyzer: IAnalyzer | null = null;
  private mlAnalyzer: IAnalyzer | null = null;

  constructor() {
    // Register analyzers
    this.ruleAnalyzer = ruleAnalyzer;
    this.statisticalAnalyzer = statisticalAnalyzer;
    this.temporalAnalyzer = temporalAnalyzer;
    this.correlationAnalyzer = correlationAnalyzer;
    this.mlAnalyzer = mlAnalyzer;
  }

  /**
   * Register analyzers (dependency injection)
   */
  registerAnalyzer(
    name: "rule" | "statistical" | "temporal" | "correlation" | "ml",
    analyzer: IAnalyzer,
  ) {
    switch (name) {
      case "rule":
        this.ruleAnalyzer = analyzer;
        break;
      case "statistical":
        this.statisticalAnalyzer = analyzer;
        break;
      case "temporal":
        this.temporalAnalyzer = analyzer;
        break;
      case "correlation":
        this.correlationAnalyzer = analyzer;
        break;
      case "ml":
        this.mlAnalyzer = analyzer;
        break;
    }
  }

  /**
   * Main orchestration method
   * This is called by the pipeline
   */
  async orchestrate(
    jobId: string,
    normalizedLogs: NormalizedLog[],
  ): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();

    try {
      logger.info(`[ANALYZER ORCHESTRATOR] Starting analysis for job ${jobId}`);
      logger.info(
        `[ANALYZER ORCHESTRATOR] Processing ${normalizedLogs.length} normalized logs`,
      );

      // ===== STEP 1: BUILD ANALYSIS CONTEXT =====
      logger.info(`[ANALYZER ORCHESTRATOR] Building analysis context...`);
      const analysisContext = buildAnalysisContext(normalizedLogs, jobId);
      logger.info(
        `[ANALYZER ORCHESTRATOR] Analysis context built. Indexes: ${analysisContext.entityTimelines.size} entities, ${analysisContext.timeBuckets.size} time buckets`,
      );

      // ===== STEP 2: EXECUTE ANALYZERS IN PARALLEL =====
      logger.info(
        `[ANALYZER ORCHESTRATOR] Executing 5 analyzers in parallel...`,
      );

      const analyzerPromises: Promise<AnalyzerResult>[] = [];

      if (this.ruleAnalyzer) {
        analyzerPromises.push(
          this.executeAnalyzer("rule", this.ruleAnalyzer, analysisContext),
        );
      }

      if (this.statisticalAnalyzer) {
        analyzerPromises.push(
          this.executeAnalyzer(
            "statistical",
            this.statisticalAnalyzer,
            analysisContext,
          ),
        );
      }

      if (this.temporalAnalyzer) {
        analyzerPromises.push(
          this.executeAnalyzer(
            "temporal",
            this.temporalAnalyzer,
            analysisContext,
          ),
        );
      }

      if (this.correlationAnalyzer) {
        analyzerPromises.push(
          this.executeAnalyzer(
            "correlation",
            this.correlationAnalyzer,
            analysisContext,
          ),
        );
      }

      if (this.mlAnalyzer) {
        analyzerPromises.push(
          this.executeAnalyzer("ml", this.mlAnalyzer, analysisContext),
        );
      }

      const analyzerResults = await Promise.all(analyzerPromises);

      // ===== STEP 3: COLLECT AND LOG FINDINGS =====
      const allFindings: AnalyzerFinding[] = [];
      let totalFindingsCount = 0;

      for (const result of analyzerResults) {
        if (result.status === "success") {
          allFindings.push(...result.findings);
          totalFindingsCount += result.findings.length;
          logger.info(
            `[ANALYZER ORCHESTRATOR] ${result.analyzer.toUpperCase()} analyzer: ${result.findings.length} findings (${result.executionTime}ms)`,
          );
        } else {
          logger.error(
            `[ANALYZER ORCHESTRATOR] ${result.analyzer.toUpperCase()} analyzer failed: ${result.error}`,
          );
        }
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[ANALYZER ORCHESTRATOR] Complete. Total findings: ${totalFindingsCount}, Time: ${executionTime}ms`,
      );

      return allFindings;
    } catch (error) {
      logger.error(
        `[ANALYZER ORCHESTRATOR] Fatal error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Execute single analyzer with error handling
   */
  private async executeAnalyzer(
    name: "rule" | "statistical" | "temporal" | "correlation" | "ml",
    analyzer: IAnalyzer,
    context: AnalysisContext,
  ): Promise<AnalyzerResult> {
    const startTime = Date.now();

    try {
      const findings = await analyzer.analyze(context);
      const executionTime = Date.now() - startTime;

      return {
        analyzer: name,
        findings,
        executionTime,
        status: "success",
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        analyzer: name,
        findings: [],
        executionTime,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const analyzerOrchestrator = new AnalyzerOrchestrator();
