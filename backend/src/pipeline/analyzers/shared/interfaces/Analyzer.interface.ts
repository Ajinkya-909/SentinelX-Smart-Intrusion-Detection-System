import { AnalyzerFinding } from "../findings/Finding.types.js";
import { AnalysisContext } from "../context/AnalysisContext.js";

export interface IAnalyzer {
  analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]>;
}
