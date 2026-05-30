import { DetectorResult } from "./nginx.detector"; // Reusing existing interface

export interface MicroPattern {
  name: string;
  regex: RegExp;
  weight: number;      // How much this pattern contributes to the confidence
  isCritical?: boolean; // If true and missing, severely penalizes the score
}

export abstract class BaseDetector {
  protected abstract readonly logType: string;
  protected abstract readonly parserName: string;
  protected abstract readonly patterns: MicroPattern[];

  /**
   * Analyzes an array of lines and calculates a heuristic confidence score.
   */
  public analyze(lines: string[]): DetectorResult {
    if (!lines || lines.length === 0) {
      return this.buildResult(0, []);
    }

    let totalScore = 0;
    const matchedPatternNames = new Set<string>();
    
    // Calculate the maximum possible score a single line could achieve
    const maxLineScore = this.patterns.reduce((sum, p) => sum + p.weight, 0);
    const maxTotalScore = maxLineScore * lines.length;

    for (const line of lines) {
      let lineScore = 0;
      let missedCritical = false;

      for (const pattern of this.patterns) {
        if (pattern.regex.test(line)) {
          lineScore += pattern.weight;
          matchedPatternNames.add(pattern.name);
        } else if (pattern.isCritical) {
          missedCritical = true;
        }
      }

      // If a critical pattern (like an HTTP verb for a web log) is entirely missing,
      // apply a 50% penalty to whatever score this line accumulated.
      if (missedCritical) {
        lineScore = lineScore * 0.5;
      }

      totalScore += lineScore;
    }

    // Normalize confidence between 0.0 and 1.0
    const confidence = totalScore / maxTotalScore;

    return this.buildResult(confidence, Array.from(matchedPatternNames));
  }

  private buildResult(confidence: number, matched: string[]): DetectorResult {
    // Optional: Set a baseline. If it's below 15%, we just call it 0% to reduce noise.
    const finalConfidence = confidence > 0.15 ? confidence : 0;

    return {
      type: this.logType,
      confidence: finalConfidence,
      parser: this.parserName,
      matched,
      analysis: {} // Used by the orchestrator for debugging
    };
  }
}