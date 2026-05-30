import { DetectorResult } from "./nginx.detector";
import { BaseDetector, MicroPattern } from "./base.detector";

export class GenericDetector extends BaseDetector {
  protected readonly logType = "GENERIC";
  protected readonly parserName = "genericParser";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasBasicTimestamp",
      // Catches almost any date/time fragment
      regex: /\b(?:\d{2,4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}:\d{2}:\d{2})\b/,
      weight: 1
    },
    {
      name: "hasWords",
      // Literally just checks if there are words (filters out pure binary/garbage)
      regex: /[a-zA-Z]{3,}/,
      weight: 1
    }
  ];

  /**
   * OVERRIDE: We hard-cap the generic detector at 25% confidence.
   * It is the fallback of fallbacks and must NEVER outscore a real detector.
   */
  public analyze(lines: string[]): DetectorResult {
    const result = super.analyze(lines);
    
    // Cap confidence at 0.25 max
    if (result.confidence > 0.25) {
      result.confidence = 0.25;
    }
    
    return result;
  }
}

export const genericDetector = new GenericDetector();