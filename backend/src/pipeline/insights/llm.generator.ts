/**
 * LLM Insights Generator (Master Prompt Architecture)
 * Uses a single, strict JSON-enforced API call to generate all insights simultaneously.
 * Eliminates API rate limits and token exhaustion.
 */

import logger from "@/config/logger";
import { llmConfig } from "@/config/llm.config";
import { insightValidators } from "@/validators/insight.validator";
import {
  InsightRecord,
  ActivityTimelineInsightData,
} from "@/types/insight.types";
import {
  buildMasterContext,
  masterInsightPrompt,
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
      logger.info("[LLM GENERATOR] ✅ Gemini API key found and is being used");
    } else {
      logger.warn("[LLM GENERATOR] ❌ Gemini API key not found");
    }
    return hasApiKey;
  },

  /**
   * Generate AI insights using a Single Master LLM Call
   */
  async generateAIInsights(
    request: LLMInsightGenerationRequest,
  ): Promise<LLMInsightGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info(`[LLM GENERATOR] Starting Unified AI insight generation for job ${request.jobId}`);

      if (!this.isAvailable()) {
        logger.warn("[LLM GENERATOR] ❌ Gemini API not configured - LLM insights generation SKIPPED");
        return {
          jobId: request.jobId,
          generatedInsights: [],
          failedInsights: [{ insightType: "all", reason: "LLM API key not configured" }],
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 1. Build the Unified Context & Prompt
      logger.info(`[LLM GENERATOR] Building Master Prompt Context...`);
      const context = buildMasterContext(request.findings, request.timelineData);
      // masterInsightPrompt is a static template string; append the context below it
      const prompt = `${masterInsightPrompt}\n\n${context}`;

      const generatedInsights: InsightRecord[] = [];
      const failedInsights: Array<{ insightType: string; reason: string }> = [];
      const expectedTypes = ["OVERVIEW", "THREAT_SUMMARY", "RECOMMENDATION", "ATTACK_PATTERN", "ANOMALY_SUMMARY"];

      try {
        // 2. Make the Single API Call
        logger.info(`[LLM GENERATOR] 📤 Sending Master Request to Gemini API...`);
        const responseText = await this.callGeminiWithRetry(prompt);
        
        // 3. Parse the Master JSON Object
        const masterData = JSON.parse(responseText);
        logger.info(`[LLM GENERATOR] ✅ Successfully parsed Master JSON response`);

        // 4. Map the 5 sections to individual InsightRecords
        for (const insightType of expectedTypes) {
          if (!masterData[insightType]) {
            logger.warn(`[LLM GENERATOR] Missing ${insightType} in Master JSON response`);
            failedInsights.push({ insightType, reason: "Missing in LLM response payload" });
            continue;
          }

          const insightData = masterData[insightType];

          // Validate individual insight data against existing schemas
          const validation = insightValidators.validateInsightData(insightType, insightData);

          if (!validation.valid) {
            logger.warn(`[LLM GENERATOR] Validation failed for ${insightType}: ${JSON.stringify(validation.errors)}`);
            failedInsights.push({
              insightType,
              reason: `Validation failed: ${validation.errors?.[0]?.message || "Unknown schema error"}`,
            });
            continue;
          }

          // Build the final insight record
          generatedInsights.push({
            job_id: request.jobId,
            insight_type: insightType,
            title: this.getTitleForInsightType(insightType),
            description: this.getDescriptionForInsightType(insightType),
            data: insightData,
            generated_by: "LLM",
            model_name: llmConfig.gemini.model,
            generation_version: "3.0-unified", // Upgraded version tracking
            is_visible: true,
            display_order: this.getDisplayOrder(insightType),
          });
          
          logger.info(`[LLM GENERATOR] ✨ Mapped and validated ${insightType} successfully`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : `${error}`;
        logger.error(`[LLM GENERATOR] ❌ Master generation failed: ${errorMsg}`);
        failedInsights.push({
          insightType: "ALL_LLM",
          reason: `Master Call Failed: ${errorMsg}`
        });
      }

      const executionTime = Date.now() - startTime;
      logger.info(`[LLM GENERATOR] 🏁 Complete: ${generatedInsights.length}/${expectedTypes.length} insights mapped in ${executionTime}ms`);

      return {
        jobId: request.jobId,
        generatedInsights,
        failedInsights,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error(`[LLM GENERATOR] Fatal error in AI pipeline: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  },

  /**
   * Call Gemini API with Native JSON Enforcement
   */
  async callGemini(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `${llmConfig.gemini.endpoint}/${llmConfig.gemini.model}:generateContent?key=${llmConfig.gemini.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: llmConfig.behavior.temperature,
              topP: llmConfig.behavior.topP,
              topK: llmConfig.behavior.topK,
              maxOutputTokens: 8000, // Increased to accommodate 5 insights at once
              responseMimeType: "application/json", // STRICT JSON ENFORCEMENT
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid or empty Gemini response structure");
      }

      let text = data.candidates[0].content.parts[0].text;

      // Fallback clean-up just in case the API hallucinates markdown despite MimeType
      if (text.includes("```json")) {
        text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      } else if (text.includes("```")) {
        text = text.replace(/```\n?/g, "").trim();
      }

      return text;
    } catch (error) {
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
        lastError = error instanceof Error ? error : new Error(`${error}`);

        if (attempt < llmConfig.gemini.maxRetries) {
          const delayMs = llmConfig.gemini.retryDelayMs * attempt;
          logger.warn(`[LLM GENERATOR] Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  },

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

  getDescriptionForInsightType(type: string): string {
    const descriptions: Record<string, string> = {
      OVERVIEW: "AI-generated executive summary of the security posture",
      THREAT_SUMMARY: "Comprehensive threat assessment with classification and immediate concerns",
      RECOMMENDATION: "Prioritized remediation recommendations from AI analysis",
      ATTACK_PATTERN: "Identified attack patterns and likely attacker objectives",
      ANOMALY_SUMMARY: "Analysis of anomalous security behavior",
    };
    return descriptions[type] || "";
  },

  getDisplayOrder(type: string): number {
    const order: Record<string, number> = {
      OVERVIEW: 3,
      THREAT_SUMMARY: 4,
      RECOMMENDATION: 10,
      ATTACK_PATTERN: 11,
      ANOMALY_SUMMARY: 12,  
    };
    return order[type] ?? 99;
  },
};