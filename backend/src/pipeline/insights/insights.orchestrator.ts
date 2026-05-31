/**
 * Insights Orchestrator
 * Orchestrates complete insights generation: deterministic + LLM
 *
 * Location: /pipeline/insights/ (part of pipeline orchestration)
 */

import logger from "@/config/logger";
import { insightsService } from "./insights.service";
import { llmInsightsGenerator } from "./llm.generator";
import { InsightRecord } from "@/types/insight.types";

// ==========================================
// TYPES
// ==========================================

interface InsightsOrchestrationResult {
  jobId: string;
  deterministic_insights: InsightRecord[];
  llm_insights: InsightRecord[];
  failed_insights: Array<{
    type: string;
    reason: string;
  }>;
  total_insights: number;
  executionTimeMs: number;
}

// ==========================================
// INSIGHTS ORCHESTRATOR
// ==========================================

export const insightsOrchestrator = {
  /**
   * Orchestrate complete insights generation for a job
   * Combines deterministic + LLM insights
   */
  async generateCompleteInsights(
    jobId: string,
  ): Promise<InsightsOrchestrationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[INSIGHTS ORCHESTRATOR] Starting complete insights generation for job ${jobId}`,
      );

      // ===== STEP 1: GENERATE DETERMINISTIC INSIGHTS =====
      logger.info(
        `[INSIGHTS ORCHESTRATOR] Step 1: Generating deterministic insights...`,
      );

      const sourceData = await insightsService.loadInsightSourceData(jobId);
      const deterministicResult = await insightsService.generateInsightsForJob(
        jobId,
        sourceData,
      );

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Generated ${deterministicResult.deterministic_insights_generated} deterministic insights`,
      );

      // ===== STEP 2: BUILD AI CONTEXT =====
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 2: Building AI context...`);

      const { findings, normalizedLogs } = sourceData;

      const activityTimeline = deterministicResult.insights.find(
        (i) => i.insight_type === "ACTIVITY_TIMELINE",
      )?.data as any;

      const context = await insightsService.buildAIContext(
        jobId,
        findings,
        normalizedLogs,
        activityTimeline,
      );

      logger.info(
        `[INSIGHTS ORCHESTRATOR] AI context built with ${findings.length} findings and ${normalizedLogs.length} logs`,
      );

      // ===== STEP 3: GENERATE LLM INSIGHTS =====
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 3: Generating LLM insights...`);

      let llmInsights: InsightRecord[] = [];
      const failedInsights: Array<{ type: string; reason: string }> = [];

      if (llmInsightsGenerator.isAvailable()) {
        try {
          const llmResult = await llmInsightsGenerator.generateAIInsights({
            jobId,
            findings: findings,
            timelineData: activityTimeline || {
              points: [],
              total_events: 0,
              time_range: {
                start: new Date().toISOString(),
                end: new Date().toISOString(),
              },
            },
            insightTypes: [
              "OVERVIEW",
              "THREAT_SUMMARY",
              "RECOMMENDATION",
              "ATTACK_PATTERN",
              "ANOMALY_SUMMARY",
            ],
          });

          llmInsights = llmResult.generatedInsights;

          if (llmResult.failedInsights.length > 0) {
            failedInsights.push(
              ...llmResult.failedInsights.map((f) => ({
                type: f.insightType,
                reason: f.reason,
              })),
            );
          }

          logger.info(
            `[INSIGHTS ORCHESTRATOR] Generated ${llmInsights.length} LLM insights`,
          );
        } catch (error) {
          logger.error(
            `[INSIGHTS ORCHESTRATOR] LLM insight generation failed: ${
              error instanceof Error ? error.message : error
            }`,
          );
          failedInsights.push({
            type: "LLM_GENERATION",
            reason: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        logger.warn(
          `[INSIGHTS ORCHESTRATOR] LLM not available - skipping LLM insight generation`,
        );
        failedInsights.push({
          type: "LLM_AVAILABILITY",
          reason: "LLM API key not configured",
        });
      }

      // ===== STEP 4: COMBINE & PERSIST INSIGHTS =====
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 4: Persisting all insights...`);

      const allInsights = [...deterministicResult.insights, ...llmInsights];

      const persistenceResult =
        await insightsService.persistInsights(allInsights);

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Persisted ${persistenceResult.total_persisted} insights`,
      );

      // ===== STEP 5: BUILD FINAL RESULT =====
      const executionTime = Date.now() - startTime;

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Complete insights generation finished in ${executionTime}ms`,
      );

      return {
        jobId,
        deterministic_insights: deterministicResult.insights,
        llm_insights: llmInsights,
        failed_insights: [
          ...failedInsights,
          ...deterministicResult.validation_errors,
        ],
        total_insights: allInsights.length,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error(
        `[INSIGHTS ORCHESTRATOR] Error in insights generation: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },
};
