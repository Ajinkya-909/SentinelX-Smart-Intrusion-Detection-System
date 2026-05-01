/**
 * Queue and Worker-Related Type Definitions
 * Covers background job queue, worker tasks, and async operations
 */

import { JobStageEnum, Job } from './db.types';
import { StageExecutionResult } from './pipeline.types';

// ==========================================
// QUEUE JOB STRUCTURES
// ==========================================

/**
 * Job payload in the queue
 * Minimal data passed to workers
 */
export interface QueuedJobPayload {
  job_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  last_completed_stage: JobStageEnum | null;
  retry_count: number;
  timestamp: number;          // When enqueued
}

/**
 * Queue job wrapper
 */
export interface QueueJob {
  id: string;                  // Unique queue job ID (separate from job_id)
  job_id: string;              // Reference to jobs table
  payload: QueuedJobPayload;
  status: QueueJobStatus;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error?: string;
}

/**
 * Queue job status
 */
export enum QueueJobStatus {
  PENDING = 'PENDING',         // Waiting to be picked up
  PROCESSING = 'PROCESSING',   // Currently being processed
  COMPLETED = 'COMPLETED',     // Successfully completed
  FAILED = 'FAILED',           // Failed after max retries
  RETRY = 'RETRY',            // Queued for retry
}

// ==========================================
// QUEUE OPERATIONS
// ==========================================

/**
 * Request to enqueue a job
 */
export interface EnqueueJobRequest {
  job_id: string;
  priority?: number;           // Optional: higher = more important
  delay_ms?: number;           // Optional: delay before processing
}

/**
 * Response from enqueue
 */
export interface EnqueueJobResponse {
  queue_id: string;
  job_id: string;
  status: QueueJobStatus;
  position_in_queue: number;
  estimated_processing_time_ms: number;
}

/**
 * Dequeue/pick job request
 */
export interface DequeueJobRequest {
  worker_id: string;
  max_jobs?: number;           // How many jobs to pick
}

/**
 * Dequeued job for worker
 */
export interface DequeuedJob {
  queue_job_id: string;
  job: Job;
  payload: QueuedJobPayload;
}

/**
 * Dequeue response (can be multiple jobs)
 */
export interface DequeueJobResponse {
  worker_id: string;
  jobs: DequeuedJob[];
  picked_at: Date;
}

// ==========================================
// WORKER MANAGEMENT
// ==========================================

/**
 * Worker registration
 */
export interface WorkerRegistration {
  worker_id: string;
  hostname: string;
  process_id: number;
  started_at: Date;
  version: string;
}

/**
 * Worker heartbeat
 */
export interface WorkerHeartbeat {
  worker_id: string;
  timestamp: Date;
  is_alive: boolean;
  current_job_id?: string;
}

/**
 * Worker status
 */
export enum WorkerStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}

/**
 * Worker info
 */
export interface WorkerInfo {
  worker_id: string;
  status: WorkerStatus;
  jobs_processed: number;
  jobs_failed: number;
  average_job_duration_ms: number;
  current_job_id?: string;
  last_heartbeat: Date;
}

// ==========================================
// JOB EXECUTION & COMPLETION
// ==========================================

/**
 * Mark job as started
 */
export interface MarkJobStartedInput {
  queue_job_id: string;
  worker_id: string;
}

/**
 * Report stage completion
 */
export interface ReportStageCompletionInput {
  queue_job_id: string;
  stage: JobStageEnum;
  result: StageExecutionResult;
  data?: Record<string, any>;
}

export interface ReportStageCompletionResponse {
  job_id: string;
  stage: JobStageEnum;
  next_stage?: JobStageEnum;
  should_continue: boolean;
}

/**
 * Report job completion
 */
export interface ReportJobCompletionInput {
  queue_job_id: string;
  final_stage: JobStageEnum;
  success: boolean;
  error_message?: string;
}

export interface ReportJobCompletionResponse {
  job_id: string;
  status: string;           // Final status
  completed_at: Date;
}

/**
 * Request job retry
 */
export interface RequestJobRetryInput {
  queue_job_id: string;
  reason: string;
  failed_stage?: JobStageEnum;
  should_reset_stage: boolean;
}

export interface RequestJobRetryResponse {
  job_id: string;
  retry_count: number;
  is_final_retry: boolean;
  queue_job_id?: string;    // New queue ID for retry
}

// ==========================================
// JOB MONITORING
// ==========================================

/**
 * Queue statistics
 */
export interface QueueStatistics {
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  average_wait_time_ms: number;
  average_processing_time_ms: number;
}

/**
 * Worker pool statistics
 */
export interface WorkerPoolStatistics {
  total_workers: number;
  online_workers: number;
  idle_workers: number;
  processing_workers: number;
  total_jobs_processed: number;
  total_jobs_failed: number;
}

/**
 * Job progress event (for real-time updates)
 */
export interface JobProgressEvent {
  job_id: string;
  queue_job_id: string;
  stage: JobStageEnum;
  progress: number;          // 0-100
  timestamp: Date;
  worker_id?: string;
}

/**
 * Job completion event
 */
export interface JobCompletionEvent {
  job_id: string;
  queue_job_id: string;
  success: boolean;
  final_stage: JobStageEnum;
  completion_time_ms: number;
  timestamp: Date;
  error?: string;
}

// ==========================================
// QUEUE CONFIGURATION
// ==========================================

/**
 * Queue configuration
 */
export interface QueueConfig {
  max_concurrent_jobs: number;
  max_job_attempts: number;
  job_timeout_ms: number;
  heartbeat_interval_ms: number;
  worker_ttl_ms: number;        // Time to live for worker
  priority_levels: number;
}

/**
 * Queue health check
 */
export interface QueueHealthCheck {
  is_healthy: boolean;
  status: string;
  timestamp: Date;
  queue_size: number;
  dead_letter_queue_size: number;
  last_error?: string;
}
