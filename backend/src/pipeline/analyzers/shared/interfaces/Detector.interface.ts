import { AnalyzerFinding } from "../findings/Finding.types.js";
import { AnalysisContext } from "../context/AnalysisContext.js";

export interface IDetector {
  detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]>;
}
