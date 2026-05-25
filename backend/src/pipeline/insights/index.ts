/**
 * Insights Pipeline Module
 * Complete insights generation orchestration
 *
 * Exports:
 * - insightsService: Deterministic insights generation
 * - insightsOrchestrator: Main orchestrator combining deterministic + LLM
 * - llmInsightsGenerator: LLM-driven insight generation
 */

export { insightsService } from "./insights.service";
export { insightsOrchestrator } from "./insights.orchestrator";
export { llmInsightsGenerator } from "./llm.generator";
