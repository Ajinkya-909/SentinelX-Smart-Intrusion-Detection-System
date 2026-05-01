/**
 * Pipeline-Related Type Definitions
 * Covers stage execution, data transformation, and processing logic
 */

import { JobStageEnum, NormalizedLog, Insight } from './db.types';

// ==========================================
// PIPELINE STAGE EXECUTION
// ==========================================

/**
 * Base pipeline stage context
 * Passed to each stage executor
 */
export interface PipelineStageContext {
  job_id: string;
  current_stage: JobStageEnum;
  user_id: string;
  file_path: string;
  max_retries: number;
}

/**
 * Stage execution result
 */
export interface StageExecutionResult {
  stage: JobStageEnum;
  success: boolean;
  output?: unknown;        // Stage-specific output
  error?: string;
  execution_time_ms: number;
  checkpoint_updated: boolean;
}

// ==========================================
// STAGE 1: PARSING
// ==========================================

/**
 * Raw log entry before parsing
 */
export interface RawLogEntry {
  timestamp: string | number;
  level?: string;
  message: string;
  [key: string]: any;        // Additional fields
}

/**
 * Structured log after parsing
 */
export interface ParsedLogEntry {
  timestamp: Date;
  source: string;
  event_type: string;
  ip_address?: string;
  severity: string;
  metadata: Record<string, any>;
}

/**
 * Parse stage input
 */
export interface ParseStageInput {
  context: PipelineStageContext;
  raw_file_path: string;
}

/**
 * Parse stage output
 */
export interface ParseStageOutput {
  stage: JobStageEnum;
  parsed_file_path: string;
  total_entries_parsed: number;
  parsed_logs: ParsedLogEntry[];
  errors_encountered: ParseError[];
}

/**
 * Parse stage error
 */
export interface ParseError {
  line_number?: number;
  raw_data: string;
  error_message: string;
}

// ==========================================
// STAGE 2: NORMALIZATION
// ==========================================

/**
 * Normalization rules per log type
 */
export interface NormalizationRule {
  log_type: string;
  field_mappings: Record<string, string>;
  required_fields: string[];
  severity_mapping?: Record<string, string>;
}

/**
 * Normalization stage input
 */
export interface NormalizeStageInput {
  context: PipelineStageContext;
  parsed_logs: ParsedLogEntry[];
}

/**
 * Normalized log output
 */
export interface NormalizedLogOutput extends Omit<NormalizedLog, 'id' | 'created_at'> {
  // Inherits all NormalizedLog fields except id and created_at
}

/**
 * Normalization stage output
 */
export interface NormalizeStageOutput {
  stage: JobStageEnum;
  total_logs_normalized: number;
  normalized_logs: NormalizedLogOutput[];
  normalization_errors: NormalizationError[];
  stored_in_db: boolean;
}

/**
 * Normalization error
 */
export interface NormalizationError {
  parsed_log: ParsedLogEntry;
  error_message: string;
  field_causing_error?: string;
}

// ==========================================
// STAGE 3: ANALYSIS
// ==========================================

/**
 * Analysis types
 */
export enum AnalysisType {
  RULE_BASED = 'RULE_BASED',
  TYPE_SPECIFIC = 'TYPE_SPECIFIC',
  GENERIC = 'GENERIC',
  ML_BASED = 'ML_BASED',
}

/**
 * Single analysis result
 */
export interface AnalysisResult {
  analysis_type: AnalysisType;
  rule_id?: string;
  matched: boolean;
  severity?: string;
  description?: string;
  data: Record<string, any>;
}

/**
 * Log analysis record
 */
export interface LogAnalysis {
  log_id: string;
  normalized_log: NormalizedLogOutput;
  rule_based_results: AnalysisResult[];
  type_specific_results: AnalysisResult[];
  generic_results: AnalysisResult[];
  ml_results?: AnalysisResult[];
  aggregated_severity?: string;
}

/**
 * Analysis stage input
 */
export interface AnalyzeStageInput {
  context: PipelineStageContext;
  normalized_logs: NormalizedLogOutput[];
}

/**
 * Analysis stage output
 */
export interface AnalyzeStageOutput {
  stage: JobStageEnum;
  total_logs_analyzed: number;
  log_analyses: LogAnalysis[];
  analysis_errors: AnalysisError[];
  ml_status: MLAnalysisStatus;
}

/**
 * Analysis error
 */
export interface AnalysisError {
  log_id: string;
  error_message: string;
  analysis_type?: AnalysisType;
  is_critical: boolean;
}

/**
 * ML Analysis status
 */
export interface MLAnalysisStatus {
  requested: boolean;
  completed: boolean;
  error?: string;
  processing_time_ms?: number;
}

// ==========================================
// STAGE 4: INSIGHTS GENERATION
// ==========================================

/**
 * Insight generation input
 */
export interface InsightsStageInput {
  context: PipelineStageContext;
  log_analyses: LogAnalysis[];
}

/**
 * Generated insight
 */
export interface GeneratedInsight extends Omit<Insight, 'id' | 'created_at'> {
  // Inherits all Insight fields except id and created_at
}

/**
 * Insights stage output
 */
export interface InsightsStageOutput {
  stage: JobStageEnum;
  total_insights_generated: number;
  insights: GeneratedInsight[];
  threat_summary?: ThreatSummary;
  stored_in_db: boolean;
}

/**
 * Threat summary from all insights
 */
export interface ThreatSummary {
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_threats: number;
  top_threats: string[];
}

/**
 * Insight generation error
 */
export interface InsightGenerationError {
  analysis_record_id?: string;
  error_message: string;
}

// ==========================================
// PIPELINE PRE-STAGE CHECKS
// ==========================================

/**
 * Pre-stage validation input
 */
export interface PreStageCheckInput {
  job_id: string;
  target_stage: JobStageEnum;
  last_completed_stage: JobStageEnum | null;
}

/**
 * Pre-stage validation result
 */
export interface PreStageCheckResult {
  can_execute: boolean;
  reason?: string;
  skip_if_output_exists: boolean;
  required_artifacts_present: boolean;
}

// ==========================================
// PIPELINE FAILURE & RECOVERY
// ==========================================

/**
 * Pipeline failure context
 */
export interface PipelineFailureContext {
  job_id: string;
  failed_stage: JobStageEnum;
  error: string;
  error_code?: string;
  retry_count: number;
  is_retriable: boolean;
}

/**
 * Idempotency check result
 */
export interface IdempotencyCheckResult {
  output_exists: boolean;
  output_valid: boolean;
  can_skip_stage: boolean;
  existing_output?: unknown;
}

// ==========================================
// PIPELINE STATISTICS
// ==========================================

/**
 * Stage execution statistics
 */
export interface StageStatistics {
  stage: JobStageEnum;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  success_rate: number;
}

/**
 * Pipeline metrics
 */
export interface PipelineMetrics {
  job_id: string;
  total_execution_time_ms: number;
  stage_metrics: Record<JobStageEnum, StageStatistics>;
  bottleneck_stage?: JobStageEnum;
}
