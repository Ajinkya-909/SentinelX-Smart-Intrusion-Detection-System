/**
 * LLM Insights Generator
 * Orchestrates LLM calls to Gemini for AI-driven insight generation
 */

import logger from "@/config/logger";
import { llmConfig } from "@/config/llm.config";
import { insightValidators } from "@/validators/insight.validator";
import {
  InsightRecord,
  ActivityTimelineInsightData,
} from "@/types/insight.types";
import { buildLLMContext, batchInsightPrompt } from "./llm.prompts";

// ==========================================
// TYPES
// ==========================================

interface LLMInsightGenerationRequest {
  jobId: string;
  findings: any[];
  timelineData: ActivityTimelineInsightData;
  insightTypes?: string[];
}

interface LLMInsightGenerationResult {
  jobId: string;
  generatedInsights: InsightRecord[];
  failedInsights: Array<{
    insightType: string;
    reason: string;
  }>;
  executionTimeMs: number;
}

// ==========================================
// LLM INSIGHTS GENERATOR SERVICE
// ==========================================

export const llmInsightsGenerator = {
  /**
   * Check if LLM is available (API key configured)
   */
  isAvailable(): boolean {
    return !!llmConfig.gemini.apiKey;
  },

  /**
   * Generate AI insights using LLM (BATCHED - Single API Call)
   * All 5 insight types generated in a single Gemini call for efficiency
   */
  async generateAIInsights(
    request: LLMInsightGenerationRequest,
  ): Promise<LLMInsightGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[LLM GENERATOR] Starting AI insight generation for job ${request.jobId}`,
      );

      if (!this.isAvailable()) {
        logger.warn("[LLM GENERATOR] LLM API key not configured - skipping");
        return {
          jobId: request.jobId,
          generatedInsights: [],
          failedInsights: [
            { insightType: "all", reason: "LLM API key not configured" },
          ],
          executionTimeMs: Date.now() - startTime,
        };
      }

      const insightTypes = request.insightTypes || [
        "OVERVIEW",
        "THREAT_SUMMARY",
        "RECOMMENDATION",
        "ATTACK_PATTERN",
        "ANOMALY_SUMMARY",
      ];

      // Build context
      const context = buildLLMContext(request.findings, request.timelineData);

      // ✨ OPTIMIZATION: Single batch call instead of 5 parallel calls
      logger.info(
        `[LLM GENERATOR] Making batched call for ${insightTypes.length} insight types...`,
      );

      const batchPrompt = batchInsightPrompt(
        context,
        request.findings,
        insightTypes,
      );

      // Call Gemini once with all insight types
      const response = await this.callGeminiWithRetry(batchPrompt);

      // Parse batch response
      let batchResponse: any;
      try {
        batchResponse = JSON.parse(response);
      } catch (parseError) {
        logger.error(
          `[LLM GENERATOR] Failed to parse batch response: ${parseError}`,
        );
        throw new Error(`Invalid batch JSON response from LLM`);
      }

      // Extract individual insights from batch response
      const generatedInsights: InsightRecord[] = [];
      const failedInsights: Array<{ insightType: string; reason: string }> = [];

      if (!batchResponse.insights) {
        throw new Error("Batch response missing 'insights' object");
      }

      // Process each insight type from batch response
      for (const insightType of insightTypes) {
        try {
          const insightData =
            batchResponse.insights[this.normalizeInsightTypeKey(insightType)];

          if (!insightData) {
            logger.warn(
              `[LLM GENERATOR] No data for ${insightType} in batch response`,
            );
            failedInsights.push({
              insightType,
              reason: "No data in batch response",
            });
            continue;
          }

          // Validate insight data
          const validation = insightValidators.validateInsightData(
            insightType,
            insightData,
          );

          if (!validation.valid) {
            logger.warn(
              `[LLM GENERATOR] Validation failed for ${insightType}: ${JSON.stringify(
                validation.errors,
              )}`,
            );
            failedInsights.push({
              insightType,
              reason: `Validation failed: ${validation.errors?.[0] || "Unknown"}`,
            });
            continue;
          }

          // Build insight record
          const insight: InsightRecord = {
            job_id: request.jobId,
            insight_type: insightType,
            title: this.getTitleForInsightType(insightType),
            description: this.getDescriptionForInsightType(insightType),
            data: insightData,
            generated_by: "LLM",
            model_name: llmConfig.gemini.model,
            generation_version: "1.0",
            is_visible: true,
            display_order: this.getDisplayOrder(insightType),
          };

          generatedInsights.push(insight);
          logger.info(`[LLM GENERATOR] Successfully extracted ${insightType}`);
        } catch (error) {
          failedInsights.push({
            insightType,
            reason: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[LLM GENERATOR] ✨ Batch complete: ${generatedInsights.length}/${insightTypes.length} insights generated in ${executionTime}ms`,
      );

      return {
        jobId: request.jobId,
        generatedInsights,
        failedInsights,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error(
        `[LLM GENERATOR] Error generating AI insights: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Normalize insight type key for batch response
   * Converts OVERVIEW -> overview, THREAT_SUMMARY -> threat_summary, etc.
   */
  normalizeInsightTypeKey(type: string): string {
    return type
      .toLowerCase()
      .replace(/_/g, "_")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("_")
      .toLowerCase();
  },

  /**
   * Call Gemini API
   * Returns the text response from the model
   */
  async callGemini(prompt: string): Promise<string> {
    try {
      logger.debug("[LLM GENERATOR] Calling Gemini API...");

      const response = await fetch(
        `${llmConfig.gemini.endpoint}/${llmConfig.gemini.model}:generateContent?key=${llmConfig.gemini.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: llmConfig.behavior.temperature,
              topP: llmConfig.behavior.topP,
              topK: llmConfig.behavior.topK,
              maxOutputTokens: llmConfig.behavior.maxOutputTokens,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`,
        );
      }

      const data = await response.json();

      // Extract text from response
      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content ||
        !data.candidates[0].content.parts[0]
      ) {
        throw new Error("Invalid Gemini response structure");
      }

      const text = data.candidates[0].content.parts[0].text;

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      logger.debug("[LLM GENERATOR] Received response from Gemini");
      return text;
    } catch (error) {
      logger.error(
        `[LLM GENERATOR] Gemini API call failed: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Retry logic for transient LLM failures
   */
  async callGeminiWithRetry(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= llmConfig.gemini.maxRetries; attempt++) {
      try {
        return await this.callGemini(prompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < llmConfig.gemini.maxRetries) {
          const delayMs = llmConfig.gemini.retryDelayMs * attempt;
          logger.warn(
            `[LLM GENERATOR] Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  },

  /**
   * Get title for insight type
   */
  getTitleForInsightType(type: string): string {
    const titles: Record<string, string> = {
      OVERVIEW: "Executive Security Summary",
      THREAT_SUMMARY: "Comprehensive Threat Assessment",
      RECOMMENDATION: "Security Remediation Actions",
      ATTACK_PATTERN: "Attack Pattern Analysis",
      ANOMALY_SUMMARY: "Behavioral Anomaly Report",
    };
    return titles[type] || type;
  },

  /**
   * Get description for insight type
   */
  getDescriptionForInsightType(type: string): string {
    const descriptions: Record<string, string> = {
      OVERVIEW: "AI-generated executive summary of the security posture",
      THREAT_SUMMARY:
        "Comprehensive threat assessment with classification and immediate concerns",
      RECOMMENDATION:
        "Prioritized remediation recommendations from AI analysis",
      ATTACK_PATTERN:
        "Identified attack patterns and likely attacker objectives",
      ANOMALY_SUMMARY: "Analysis of anomalous security behavior",
    };
    return descriptions[type] || "";
  },

  /**
   * Get display order for insight type
   */
  getDisplayOrder(type: string): number {
    const order: Record<string, number> = {
      KPI: 1,
      OVERVIEW: 2,
      THREAT_SUMMARY: 3,
      SEVERITY_DISTRIBUTION: 4,
      TOP_ATTACKERS: 5,
      ACTIVITY_TIMELINE: 6,
      RECOMMENDATION: 7,
      ATTACK_PATTERN: 8,
      ANOMALY_SUMMARY: 9,
    };
    return order[type] ?? 10;
  },
};
