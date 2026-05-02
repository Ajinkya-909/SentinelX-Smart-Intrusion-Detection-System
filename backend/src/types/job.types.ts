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
