/**
 * LLM Configuration
 * Configuration for Gemini API and other LLM settings
 */

export const llmConfig = {
  // Gemini API
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
  },

  // LLM behavior
  behavior: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  },

  // Context size limits
  contextLimits: {
    maxFindings: 100,
    maxNormalizedLogs: 500,
    maxLogCharsPerFinding: 1000,
  },

  // Enable/disable LLM features
  features: {
    generateOverview: true,
    generateThreatSummary: true,
    generateRecommendations: true,
    generateAttackPatterns: true,
    generateAnomalySummary: true,
  },

  // Validation
  validation: {
    strictMode: true,
    requireAllMandatoryInsights: false, // Allow partial generation
  },
};

/**
 * Validate LLM configuration on startup
 */
export const validateLLMConfig = (): void => {
  if (!llmConfig.gemini.apiKey) {
    console.warn(
      "[LLM CONFIG] GEMINI_API_KEY not set - LLM features will be disabled",
    );
  }
};
