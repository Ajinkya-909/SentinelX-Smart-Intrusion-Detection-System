/**
 * ML Analyzer Module
 */

export { MLAnalyzer, mlAnalyzer } from "./MLAnalyzer";
export { MLClient, mlClient } from "./MLClient";

// Feature extractors
import { extractIpFeatures } from "./features/buildIpFeatures";
import { extractUserFeatures, extractUsername } from "./features/buildUserFeatures";
import { extractSessionFeatures } from "./features/buildSessionFeatures";

// Re-export them with the names expected by MLAnalyzer
export const buildIpFeatures = extractIpFeatures;
export const buildUserFeatures = extractUserFeatures;
export const buildSessionFeatures = extractSessionFeatures;
export { extractUsername };

// Types
export * from "./types/features.types";

// Configuration
export { mlConfig } from "./config/ml.config";