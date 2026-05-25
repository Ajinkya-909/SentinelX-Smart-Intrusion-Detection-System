/**
 * LLM Insights Generator (Refactored)
 * Individual API calls per insight type for maximum reliability
 * One failure doesn't cascade to all insights
 */

import logger from "@/config/logger";
import { llmConfig } from "@/config/llm.config";
import { insightValidators } from "@/validators/insight.validator";
import {
  InsightRecord,
  ActivityTimelineInsightData,
} from "@/types/insight.types";
import {
  buildLLMContext,
  overviewPrompt,
  threatSummaryPrompt,
  recommendationPrompt,
  attackPatternPrompt,
  anomalySummaryPrompt,
} from "./llm.prompts";

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
    const hasApiKey = !!llmConfig.gemini.apiKey;
    if (hasApiKey) {
      console.log("[LLM GENERATOR] ✅ Gemini API key found and is being used");
      logger.info("[LLM GENERATOR] ✅ Gemini API key found and is being used");
    } else {
      console.log("[LLM GENERATOR] ❌ Gemini API key not found");
      logger.warn("[LLM GENERATOR] ❌ Gemini API key not found");
    }
    return hasApiKey;
  },

  /**
   * Generate AI insights using LLM
   * Individual API call per insight type for reliability
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
        console.log(
          "[LLM GENERATOR] ❌ Gemini API not configured - LLM insights generation SKIPPED",
        );
        logger.warn(
          "[LLM GENERATOR] ❌ Gemini API not configured - LLM insights generation SKIPPED",
        );
        return {
          jobId: request.jobId,
          generatedInsights: [],
          failedInsights: [
            { insightType: "all", reason: "LLM API key not configured" },
          ],
          executionTimeMs: Date.now() - startTime,
        };
      }

      console.log(
        "[LLM GENERATOR] ✅ Gemini API is available - proceeding with LLM insight generation",
      );
      logger.info(
        "[LLM GENERATOR] ✅ Gemini API is available - proceeding with LLM insight generation",
      );

      const insightTypes = request.insightTypes || [
        "OVERVIEW",
        "THREAT_SUMMARY",
        "RECOMMENDATION",
        "ATTACK_PATTERN",
        "ANOMALY_SUMMARY",
      ];

      // Build context once (reused for all insights)
      const context = buildLLMContext(request.findings, request.timelineData);

      const generatedInsights: InsightRecord[] = [];
      const failedInsights: Array<{ insightType: string; reason: string }> = [];

      // Process each insight type with individual API call
      for (const insightType of insightTypes) {
        try {
          console.log(
            `[LLM GENERATOR] 📤 Generating ${insightType} insight...`,
          );
          logger.info(`[LLM GENERATOR] Generating ${insightType} insight`);

          let prompt = "";
          switch (insightType) {
            case "OVERVIEW":
              prompt = overviewPrompt(context, request.findings);
              break;
            case "THREAT_SUMMARY":
              prompt = threatSummaryPrompt(context, request.findings);
              break;
            case "RECOMMENDATION":
              prompt = recommendationPrompt(context, request.findings);
              break;
            case "ATTACK_PATTERN":
              prompt = attackPatternPrompt(context, request.findings);
              break;
            case "ANOMALY_SUMMARY":
              prompt = anomalySummaryPrompt(context, request.findings);
              break;
            default:
              throw new Error(`Unknown insight type: ${insightType}`);
          }

          // Call Gemini for this specific insight
          const responseText = await this.callGeminiWithRetry(prompt);
          const insightData = JSON.parse(responseText);

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
            generation_version: "2.0", // New individual-call version
            is_visible: true,
            display_order: this.getDisplayOrder(insightType),
          };

          generatedInsights.push(insight);
          console.log(
            `[LLM GENERATOR] ✅ ${insightType} generated successfully`,
          );
          logger.info(
            `[LLM GENERATOR] ✅ ${insightType} generated successfully`,
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[LLM GENERATOR] ❌ Failed to generate ${insightType}: ${errorMsg}`,
          );
          logger.warn(
            `[LLM GENERATOR] Failed to generate ${insightType}: ${errorMsg}`,
          );
          failedInsights.push({
            insightType,
            reason: errorMsg,
          });
          // Continue to next insight type instead of failing
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(
        `[LLM GENERATOR] ✨ Complete: ${generatedInsights.length}/${insightTypes.length} insights generated in ${executionTime}ms`,
      );
      logger.info(
        `[LLM GENERATOR] ✨ Complete: ${generatedInsights.length}/${insightTypes.length} insights generated in ${executionTime}ms`,
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
   * Call Gemini API for a single insight
   * Simple, focused JSON response for high reliability
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
              responseMimeType: "application/json",
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

      let text = data.candidates[0].content.parts[0].text;

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      // Clean response: remove markdown code blocks if present
      if (text.includes("```json")) {
        text = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      } else if (text.includes("```")) {
        text = text.replace(/```\n?/g, "").trim();
      }

      console.log("[LLM GENERATOR] ✅ Received response from Gemini");
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
          console.log(
            `[LLM GENERATOR] ⏳ Retrying in ${delayMs}ms (attempt ${attempt}/${llmConfig.gemini.maxRetries})...`,
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
      ALERT: 2,
      OVERVIEW: 3,
      THREAT_SUMMARY: 4,
      SEVERITY_DISTRIBUTION: 5,
      TOP_ATTACKERS: 6,
      ACTIVITY_TIMELINE: 7,
      THREAT_TIMELINE: 8,
      GEO_ANALYSIS: 9,
      RECOMMENDATION: 10,
      ATTACK_PATTERN: 11,
      ANOMALY_SUMMARY: 12,
    };
    return order[type] ?? 99;
  },
};
