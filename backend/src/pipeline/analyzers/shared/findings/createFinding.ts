import { AnalyzerFinding, FindingType } from "./Finding.types";
import { FindingSeverity } from "./FindingSeverity";

export interface CreateFindingParams {
  jobId: string;
  analyzer: "rule" | "statistical" | "temporal" | "correlation" | "ml";
  finding_type: FindingType;
  severity: FindingSeverity;
  confidence: number;
  title: string;
  summary: string;
  description?: string;
  log_references: string[];
  affected_entities: Record<string, any>;
  evidence: Record<string, any>;
  metadata?: Record<string, any>;
  recommendation: string;
}

export const createFinding = (params: CreateFindingParams): AnalyzerFinding => {
  const confidence = Math.min(Math.max(params.confidence, 0), 1); // clamp 0-1

  return {
    jobId: params.jobId,
    analyzer: params.analyzer,
    finding_type: params.finding_type,
    severity: params.severity,
    confidence,
    title: params.title,
    summary: params.summary,
    description: params.description || undefined,
    log_references: params.log_references,
    affected_entities: params.affected_entities,
    evidence: params.evidence,
    metadata: params.metadata || {},
    recommendation: params.recommendation,
    timestamp: new Date(),
    createdAt: new Date(),
  };
};
