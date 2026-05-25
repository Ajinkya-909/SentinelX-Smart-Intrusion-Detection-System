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
    return !!llmConfig.gemini.apiKey;
  },

  /**
   * Generate AI insights using LLM
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

      // Generate insights in parallel
      const generatedInsights: InsightRecord[] = [];
      const failedInsights: Array<{ insightType: string; reason: string }> = [];

      // Generate each insight type
      const promises = insightTypes.map(async (insightType) => {
        try {
          const insight = await this.generateInsightType(
            insightType,
            request.jobId,
            context,
            request.findings,
          );

          if (insight) {
            generatedInsights.push(insight);
          }
        } catch (error) {
          failedInsights.push({
            insightType,
            reason: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      await Promise.all(promises);

      logger.info(
        `[LLM GENERATOR] Generated ${generatedInsights.length} AI insights, ${failedInsights.length} failed`,
      );

      return {
        jobId: request.jobId,
        generatedInsights,
        failedInsights,
        executionTimeMs: Date.now() - startTime,
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
   * Generate a specific insight type
   */
  async generateInsightType(
    insightType: string,
    jobId: string,
    context: string,
    findings: any[],
  ): Promise<InsightRecord | null> {
    try {
      logger.info(`[LLM GENERATOR] Generating ${insightType} insight...`);

      let prompt = "";
      let expectedDataStructure: string = "";

      // Select prompt based on insight type
      switch (insightType) {
        case "OVERVIEW":
          prompt = overviewPrompt(context, findings);
          expectedDataStructure = "overview";
          break;
        case "THREAT_SUMMARY":
          prompt = threatSummaryPrompt(context, findings);
          expectedDataStructure = "threat_summary";
          break;
        case "RECOMMENDATION":
          prompt = recommendationPrompt(context, findings);
          expectedDataStructure = "recommendation";
          break;
        case "ATTACK_PATTERN":
          prompt = attackPatternPrompt(context, findings);
          expectedDataStructure = "attack_pattern";
          break;
        case "ANOMALY_SUMMARY":
          prompt = anomalySummaryPrompt(context, findings);
          expectedDataStructure = "anomaly_summary";
          break;
        default:
          logger.warn(`[LLM GENERATOR] Unknown insight type: ${insightType}`);
          return null;
      }

      // Call LLM
      const response = await this.callGemini(prompt);

      // Parse and validate response
      let insightData: any;
      try {
        insightData = JSON.parse(response);
      } catch (parseError) {
        logger.error(
          `[LLM GENERATOR] Failed to parse LLM response for ${insightType}: ${parseError}`,
        );
        throw new Error(
          `Invalid JSON response from LLM: ${response.substring(0, 200)}`,
        );
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
        throw new Error(
          `Validation failed: ${validation.errors?.[0]?.message || "Unknown error"}`,
        );
      }

      // Build insight record
      const insight: InsightRecord = {
        job_id: jobId,
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

      logger.info(`[LLM GENERATOR] Successfully generated ${insightType}`);
      return insight;
    } catch (error) {
      logger.error(
        `[LLM GENERATOR] Error generating ${insightType}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
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
