/**
 * Job-Related Type Definitions
 * Covers job operations, state management, and lifecycle tracking
 */

import { Job, JobStatusEnum, JobStageEnum, JobOutcomeEnum } from './db.types';

// ==========================================
// JOB STATE MANAGEMENT
// ==========================================

/**
 * Current derived state of a job
 * Shows where the job is in the pipeline
 */
export interface JobCurrentState {
  status: JobStatusEnum;                    // Current lifecycle status
  last_completed_stage: JobStageEnum | null; // Last successfully completed stage
  current_stage: JobStageEnum | null;       // Derived: next stage to execute
  is_processing: boolean;                   // Whether job is actively processing
  progress: number;                         // Progress percentage
  can_retry: boolean;                       // Whether job can be retried
}

/**
 * Determine the next stage after last completed stage
 */
export type DeriveNextStageResult = JobStageEnum | null;

// ==========================================
// JOB CREATION & UPLOAD
// ==========================================

/**
 * Request to create a job from file upload
 */
export interface JobUploadRequest {
  file_path: string;    // Where file is stored
  file_name: string;    // Original filename
  file_size: bigint;    // File size in bytes
  user_id: string;      // User who uploaded
}

/**
 * Response after job creation
 */
export interface JobUploadResponse {
  job_id: string;
  status: JobStatusEnum;
  file_name: string;
  file_size: bigint;
  created_at: Date;
}

// ==========================================
// JOB STATUS & PROGRESS TRACKING
// ==========================================

/**
 * Request to get job status
 */
export interface JobStatusRequest {
  job_id: string;
}

/**
 * Detailed job status response
 */
export interface JobStatusResponse {
  job_id: string;
  status: JobStatusEnum;
  last_completed_stage: JobStageEnum | null;
  current_stage: JobStageEnum | null;
  progress: number;
  outcome: JobOutcomeEnum | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Job progress update
 */
export interface JobProgressUpdate {
  job_id: string;
  progress: number;        // 0-100
  stage?: JobStageEnum;   // Optional: update completed stage
  status?: JobStatusEnum; // Optional: update status
}

// ==========================================
// JOB FAILURE & ERROR HANDLING
// ==========================================

/**
 * Job error context
 */
export interface JobError {
  job_id: string;
  stage: JobStageEnum;
  error_message: string;
  error_code?: string;
  retry_count: number;
  is_retriable: boolean;
}

/**
 * Mark job as failed
 */
export interface MarkJobFailedInput {
  job_id: string;
  error_message: string;
  is_retriable: boolean;
}

/**
 * Retry job
 */
export interface RetryJobInput {
  job_id: string;
  max_retries?: number;
}

export interface RetryJobResponse {
  job_id: string;
  retry_count: number;
  next_stage: JobStageEnum | null;
}

// ==========================================
// JOB COMPLETION
// ==========================================

/**
 * Mark job as completed
 */
export interface CompleteJobInput {
  job_id: string;
  outcome: JobOutcomeEnum;
  final_stage: JobStageEnum;
}

export interface CompleteJobResponse {
  job_id: string;
  status: JobStatusEnum;
  outcome: JobOutcomeEnum;
  completed_at: Date;
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
  success_rate: number;        // Percentage of successful jobs
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
  update: Partial<Pick<Job, 'status' | 'last_completed_stage' | 'progress' | 'outcome'>>;
}

/**
 * Result of batch operation
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors?: Array<{ job_id: string; error: string }>;
}
