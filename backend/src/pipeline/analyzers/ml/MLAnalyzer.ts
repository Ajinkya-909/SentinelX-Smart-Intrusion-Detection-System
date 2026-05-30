import { AnalysisContext } from "../shared/context/AnalysisContext";

/**
 * Extract username from log
 */
export function extractUsername(log: any): string | null {
  // FIX: Read from the new nested context mapping
  return log.metadata?.actor?.username || null;
}

/**
 * Minimal ML analyzer class (placeholder)
 * This provides the exported symbols expected by the public index
 */
export class MLAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<any[]> {
    // No-op placeholder: feature extraction and client calls live elsewhere.
    return [];
  }
}

export const mlAnalyzer = new MLAnalyzer();