import { AnalyzerFinding } from "../findings/Finding.types";
import { AnalysisContext } from "../context/AnalysisContext";

export interface IAnalyzer {
  analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]>;
}

