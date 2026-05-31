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
import { buildMasterContext, masterInsightPrompt } from "./llm.prompts";

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
// HELPERS
// ==========================================

/**
 * Extract a severity value from parsed LLM insight data.
 *
 * FIX: The previous version never set `severity` on generated InsightRecords,
 * causing all LLM insights to have null severity in the database.
 *
 * Each LLM insight type stores severity under a different field name:
 * - OVERVIEW        → threat_level
 * - THREAT_SUMMARY  → overall_threat_classification
 * - ATTACK_PATTERN  → severity
 * - ANOMALY_SUMMARY → severity
 * - RECOMMENDATION  → has no top-level severity (use highest priority instead)
 */
function deriveSeverityFromInsightData(
  insightType: string,
  data: any,
): NonNullable<InsightRecord["severity"]> {
  const validSeverities = new Set([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "INFO",
  ]);

  const candidates: string[] = [];

  switch (insightType) {
    case "OVERVIEW":
      candidates.push(data.threat_level);
      break;
    case "THREAT_SUMMARY":
      candidates.push(data.overall_threat_classification);
      break;
    case "ATTACK_PATTERN":
    case "ANOMALY_SUMMARY":
      candidates.push(data.severity);
      break;
    case "RECOMMENDATION": {
      // No top-level severity field — derive from the highest priority recommendation
      const priorityOrder: Record<string, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };
      const recs: any[] = data.recommendations || [];
      const highest = recs.reduce<string | null>((best, rec) => {
        const p = (rec.priority || "").toUpperCase();
        if (!best) return p;
        return (priorityOrder[p] ?? 0) > (priorityOrder[best] ?? 0) ? p : best;
      }, null);
      candidates.push(highest ?? "MEDIUM");
      break;
    }
  }

  // Return the first candidate that is a valid severity value
  for (const candidate of candidates) {
    const upper = (candidate || "").toUpperCase();
    if (validSeverities.has(upper)) {
      return upper as NonNullable<InsightRecord["severity"]>;
    }
  }

  return "MEDIUM"; // safe default
}

// ==========================================
// LLM INSIGHTS GENERATOR SERVICE
// ==========================================

export const llmInsightsGenerator = {
  /**
   * Check if LLM is available (API key configured).
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
   * Generate AI insights using a single master LLM call.
   * All 5 insight types are returned in one JSON response to avoid rate limits.
   */
  async generateAIInsights(
    request: LLMInsightGenerationRequest,
  ): Promise<LLMInsightGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[LLM GENERATOR] Starting unified AI insight generation for job ${request.jobId}`,
      );

      if (!this.isAvailable()) {
        logger.warn(
          "[LLM GENERATOR] ❌ Gemini API not configured — LLM insights generation SKIPPED",
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

      // Build the unified context string and combine with the schema prompt.
      // buildMasterContext now receives findings that include the `evidence` field,
      // so the LLM will see the actual forensic data from each analyzer.
      logger.info(`[LLM GENERATOR] Building master prompt context...`);
      const context = buildMasterContext(
        request.findings,
        request.timelineData,
      );
      const prompt = `${masterInsightPrompt}\n\n${context}`;

      const generatedInsights: InsightRecord[] = [];
      const failedInsights: Array<{ insightType: string; reason: string }> = [];
      const expectedTypes = [
        "OVERVIEW",
        "THREAT_SUMMARY",
        "RECOMMENDATION",
        "ATTACK_PATTERN",
        "ANOMALY_SUMMARY",
      ];

      try {
        logger.info(
          `[LLM GENERATOR] 📤 Sending master request to Gemini API...`,
        );
        const responseText = await this.callGeminiWithRetry(prompt);

        const masterData = JSON.parse(responseText);
        logger.info(
          `[LLM GENERATOR] ✅ Successfully parsed master JSON response`,
        );

        for (const insightType of expectedTypes) {
          if (!masterData[insightType]) {
            logger.warn(
              `[LLM GENERATOR] Missing ${insightType} in master JSON response`,
            );
            failedInsights.push({
              insightType,
              reason: "Missing in LLM response payload",
            });
            continue;
          }

          const insightData = masterData[insightType];

          // Validate the parsed data against the existing Zod schema
          const validation = insightValidators.validateInsightData(
            insightType,
            insightData,
          );

          if (!validation.valid) {
            logger.warn(
              `[LLM GENERATOR] Validation failed for ${insightType}: ${JSON.stringify(validation.errors)}`,
            );
            failedInsights.push({
              insightType,
              reason: `Validation failed: ${
                validation.errors?.[0]?.message || "Unknown schema error"
              }`,
            });
            continue;
          }

          // FIX: Derive the top-level severity from the insight data.
          // Previously, severity was never set, resulting in null severity for
          // all LLM-generated insights in the database.
          const severity = deriveSeverityFromInsightData(
            insightType,
            insightData,
          );

          generatedInsights.push({
            job_id: request.jobId,
            insight_type: insightType,
            title: this.getTitleForInsightType(insightType),
            description: this.getDescriptionForInsightType(insightType),
            severity, // FIX: was missing entirely
            data: insightData,
            generated_by: "LLM",
            model_name: llmConfig.gemini.model,
            generation_version: "3.0-unified",
            is_visible: true,
            display_order: this.getDisplayOrder(insightType),
          });

          logger.info(
            `[LLM GENERATOR] ✨ Mapped and validated ${insightType} (severity: ${severity})`,
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : `${error}`;
        logger.error(
          `[LLM GENERATOR] ❌ Master generation failed: ${errorMsg}`,
        );
        failedInsights.push({
          insightType: "ALL_LLM",
          reason: `Master call failed: ${errorMsg}`,
        });
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[LLM GENERATOR] 🏁 Complete: ${generatedInsights.length}/${expectedTypes.length} insights in ${executionTime}ms`,
      );

      return {
        jobId: request.jobId,
        generatedInsights,
        failedInsights,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error(
        `[LLM GENERATOR] Fatal error: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Call the Gemini API with native JSON mode enforced via responseMimeType.
   */
  async callGemini(prompt: string): Promise<string> {
    const response = await fetch(
      `${llmConfig.gemini.endpoint}/${llmConfig.gemini.model}:generateContent?key=${llmConfig.gemini.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // NOTE: Lower temperature (0.1–0.2) is strongly recommended for
            // strict JSON schema output. Update llm.config.ts:
            //   behavior.temperature = 0.15
            // High temperature increases the chance of the model deviating from
            // field names and enum constraints, which causes validation failures.
            temperature: llmConfig.behavior.temperature,
            topP: llmConfig.behavior.topP,
            topK: llmConfig.behavior.topK,
            maxOutputTokens: 8000,
            responseMimeType: "application/json",
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
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
        `Gemini API error: ${response.status} — ${errorData.error?.message || "Unknown error"}`,
      );
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid or empty Gemini response structure");
    }

    let text: string = data.candidates[0].content.parts[0].text;

    // Fallback strip in case the model wraps output in markdown despite the MIME type
    if (text.includes("```json")) {
      text = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    } else if (text.includes("```")) {
      text = text.replace(/```\n?/g, "").trim();
    }

    return text;
  },

  /**
   * Retry wrapper for transient Gemini API failures.
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
          logger.warn(
            `[LLM GENERATOR] Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
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
