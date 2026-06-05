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
   * Orchestrate complete insights generation for a job.
   * Combines deterministic (rule-based) insights with LLM-generated insights.
   *
   * Flow:
   * 1. Load source data ONCE (findings + logs) — prevents double DB round-trip
   * 2. Generate deterministic insights from that data
   * 3. Pass the same findings (with evidence) to the LLM generator
   * 4. Combine and persist all insights together
   */
  async generateCompleteInsights(
    jobId: string,
  ): Promise<InsightsOrchestrationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[INSIGHTS ORCHESTRATOR] Starting complete insights generation for job ${jobId}`,
      );

      // ===== STEP 1: LOAD SOURCE DATA ONCE =====
      // Load findings (with evidence + detected_at) and normalized logs in
      // parallel. Both the deterministic generator and LLM generator use this
      // same data — no second DB call anywhere in this flow.
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 1: Loading source data...`);
      const sourceData = await insightsService.loadInsightSourceData(jobId);
      const { findings, normalizedLogs } = sourceData;

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Source data loaded: ${findings.length} findings, ${normalizedLogs.length} logs`,
      );

      // ===== STEP 2: GENERATE DETERMINISTIC INSIGHTS =====
      logger.info(
        `[INSIGHTS ORCHESTRATOR] Step 2: Generating deterministic insights...`,
      );

      const deterministicResult = await insightsService.generateInsightsForJob(
        jobId,
        sourceData, // pass pre-loaded data — no re-fetch
      );

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Generated ${deterministicResult.deterministic_insights_generated} deterministic insights`,
      );

      // Pull the activity timeline out of deterministic results so we can pass
      // it to the LLM as part of the security context.
      const activityTimeline = deterministicResult.insights.find(
        (i) => i.insight_type === "ACTIVITY_TIMELINE",
      )?.data as any;

      // ===== STEP 3: GENERATE LLM INSIGHTS =====
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 3: Generating LLM insights...`);

      // Calculate successful and failed logins from normalized logs
      const failedLoginCount = normalizedLogs.filter(
        (log) =>
          log.event_type === "LOGIN_FAILED" ||
          log.event_type === "AUTH_FAILURE" ||
          log.metadata?.security?.authSuccess === false
      ).length;

      const successfulLoginCount = normalizedLogs.filter(
        (log) =>
          log.event_type === "AUTH_SUCCESS" ||
          log.event_type === "LOGIN_SUCCESS" ||
          log.event_type === "SESSION_START" ||
          log.metadata?.security?.authSuccess === true
      ).length;

      let llmInsights: InsightRecord[] = [];
      const failedInsights: Array<{ type: string; reason: string }> = [];

      if (llmInsightsGenerator.isAvailable()) {
        try {
          const llmResult = await llmInsightsGenerator.generateAIInsights({
            jobId,
            // FIX: `findings` now includes the `evidence` field (loaded in
            // loadFindingsWithReferences). buildMasterContext reads f.evidence
            // to inject forensic data into the LLM prompt, which is what drives
            // specific, evidence-backed insights instead of generic hallucinations.
            findings,
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
            successfulLoginCount,
            failedLoginCount,
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
            `[INSIGHTS ORCHESTRATOR] LLM insight generation failed: ${error instanceof Error ? error.message : error
            }`,
          );
          failedInsights.push({
            type: "LLM_GENERATION",
            reason: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        logger.warn(
          `[INSIGHTS ORCHESTRATOR] LLM not available — skipping LLM insight generation`,
        );
        failedInsights.push({
          type: "LLM_AVAILABILITY",
          reason: "LLM API key not configured",
        });
      }

      // ===== STEP 4: COMBINE & PERSIST =====
      logger.info(`[INSIGHTS ORCHESTRATOR] Step 4: Persisting all insights...`);

      const allInsights = [...deterministicResult.insights, ...llmInsights];
      const persistenceResult = await insightsService.persistInsights(allInsights);

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Persisted ${persistenceResult.total_persisted} insights (${persistenceResult.total_skipped} skipped)`,
      );

      // ===== STEP 5: BUILD RESULT =====
      const executionTime = Date.now() - startTime;

      logger.info(
        `[INSIGHTS ORCHESTRATOR] Complete in ${executionTime}ms — ${allInsights.length} total insights`,
      );

      return {
        jobId,
        deterministic_insights: deterministicResult.insights,
        llm_insights: llmInsights,
        failed_insights: [
          ...failedInsights,
          ...deterministicResult.validation_errors,
        ],
        total_insights: persistenceResult.total_persisted,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error(
        `[INSIGHTS ORCHESTRATOR] Error in insights generation: ${error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },
};