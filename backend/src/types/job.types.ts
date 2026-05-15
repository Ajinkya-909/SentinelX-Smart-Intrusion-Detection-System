/**
 * Job-Related Type Definitions
 * Covers job operations, state management, and lifecycle tracking
 */

import { job_stage_enum } from "@/generated/prisma/enums";
import { Job, JobStatusEnum, JobStageEnum, JobOutcomeEnum } from "./db.types";

// ==========================================
// JOB STATE MANAGEMENT
// ==========================================

/**
 * Current derived state of a job
 * Shows where the job is in the pipeline
 */
export interface JobCurrentState {
  status: JobStatusEnum; // Current lifecycle status
  last_completed_stage: JobStageEnum | null; // Last successfully completed stage
  current_stage: JobStageEnum | null; // Derived: next stage to execute
  is_processing: boolean; // Whether job is actively processing
  progress: number; // Progress percentage
  can_retry: boolean; // Whether job can be retried
}

// ==========================================
// JOB CREATION & UPLOAD
// ==========================================

/**
 * Request to create a job from file upload
 * Used by: repository.createJob()
 */
export interface JobUploadRequest {
  file_path: string; // Where file is stored
  file_name: string; // Original filename
  file_size: bigint; // File size in bytes
  user_id: string; // User who uploaded
}

/**
 * Input for updating a job
 * Specifies which fields can be updated during pipeline execution
 * Used by: repository.updateJob()
 */
export type JobUpdateInput = Partial<
  Pick<
    Job,
    | "status"
    | "last_completed_stage"
    | "progress"
    | "outcome"
    | "error_message"
    | "retry_count"
  >
>;

/**
 * Response after job creation
 */
export interface JobUploadResponse {
  job_id: string;
  status: JobStatusEnum;
  file_name: string;
  file_size: number;
  created_at: Date;
}

// ==========================================
// JOB STATUS & PROGRESS TRACKING
// ==========================================

/**
 * Job status response
 */
export interface JobStatusResponse {
  job_id: string;
  status: JobStatusEnum;
  last_completed_stage: JobStageEnum | null;
  current_stage: JobStageEnum | null;
  outcome: JobOutcomeEnum | null;
  progress: number;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// JOB RETRY
// ==========================================

/**
 * Retry job request
 */
export interface RetryJobRequest {
  job_id: string;
}

// ==========================================
// JOB QUERY & FILTERING
// ==========================================

/**
 * Query parameters for job filtering
 */
export interface JobQueryParams {
  user_id?: string;
  status?: JobStatusEnum;
  created_after?: Date;
  created_before?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Paginated job list response
 */
export interface JobListResponse {
  jobs: Job[];
  total_count: number;
  limit: number;
  offset: number;
}

// ==========================================
// JOB STATISTICS & ANALYTICS
// ==========================================

/**
 * Job statistics for a user
 */
export interface JobStatistics {
  user_id: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  processing_jobs: number;
  success_rate: number; // Percentage of successful jobs
  average_processing_time: number; // In milliseconds
}

// ==========================================
// BATCH JOB OPERATIONS
// ==========================================

/**
 * Batch update jobs
 */
export interface BatchUpdateJobsInput {
  job_ids: string[];
  update: Partial<
    Pick<Job, "status" | "last_completed_stage" | "progress" | "outcome">
  >;
}

/**
 * Result of batch operation
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors?: Array<{ job_id: string; error: string }>;
}

export const PROGRESS_BY_STAGE: Record<JobStageEnum, number> = {
  [JobStageEnum.UPLOADED]: 0,
  [JobStageEnum.PREPROCESSED]: 5,
  [JobStageEnum.TYPE_DETECTED]: 10,
  [JobStageEnum.PARSED]: 25,
  [JobStageEnum.NORMALIZED]: 50,
  [JobStageEnum.ANALYZED]: 75,
  [JobStageEnum.INSIGHTS_GENERATED]: 100,
  [JobStageEnum.COMPLETED]: 100,
};

export function getProgressByStage(stage: JobStageEnum | null): number {
  if (!stage) return 0;
  return PROGRESS_BY_STAGE[stage];
}

export function getNextStageFromCompleted(
  lastCompletedStage: JobStageEnum | null,
): JobStageEnum | null {
  const stageOrder: JobStageEnum[] = [
    JobStageEnum.UPLOADED,
    JobStageEnum.PREPROCESSED,
    JobStageEnum.TYPE_DETECTED,
    JobStageEnum.PARSED,
    JobStageEnum.NORMALIZED,
    JobStageEnum.ANALYZED,
    JobStageEnum.INSIGHTS_GENERATED,
    JobStageEnum.COMPLETED,
  ];

  if (!lastCompletedStage) {
    return JobStageEnum.UPLOADED;
  }

  const currentIndex = stageOrder.indexOf(lastCompletedStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return null;
  }

  return stageOrder[currentIndex + 1]!;
}
