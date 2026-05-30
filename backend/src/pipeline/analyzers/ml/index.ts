/**
 * ML Analyzer Module
 *
 * Exports all ML-related components:
 * - MLAnalyzer: The main analyzer class
 * - MLClient: HTTP client for FastAPI communication
 * - Feature extractors: buildIpFeatures, buildUserFeatures, buildSessionFeatures
 * - Types and configuration
 */

export { MLClient, mlClient } from "./MLClient";
// Feature extractors
import { extractIpFeatures } from "./features/buildIpFeatures";
import { extractUserFeatures, extractUsername } from "./features/buildUserFeatures";
import { extractSessionFeatures } from "./features/buildSessionFeatures";

export const buildIpFeatures = extractIpFeatures;
export const buildUserFeatures = extractUserFeatures;
export const buildSessionFeatures = extractSessionFeatures;
export { extractUsername };

// Types
export * from "./types/features.types";

// Configuration
export { mlConfig } from "./config/ml.config";
