import { AnalyzerFinding } from "../findings/Finding.types";
import { AnalysisContext } from "../context/AnalysisContext";

export interface IDetector {
  detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]>;
}
