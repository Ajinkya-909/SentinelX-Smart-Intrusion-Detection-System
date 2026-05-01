/**
 * Database Model Type Definitions
 * Represents PostgreSQL table structures and their TypeScript equivalents
 */

// ==========================================
// ENUM TYPES (Matching PostgreSQL Enums)
// ==========================================

/**
 * Job Lifecycle Status
 * Represents the current state of a job in the system
 */
export enum JobStatusEnum {
  UPLOADED = 'UPLOADED',      // Initial state after file upload
  PROCESSING = 'PROCESSING',  // Job is being processed by pipeline
  COMPLETED = 'COMPLETED',    // All stages completed successfully
  FAILED = 'FAILED',          // Job failed at some stage
}

/**
 * Pipeline Execution Stages
 * Represents checkpoints in the processing pipeline
 */
export enum JobStageEnum {
  PARSE = 'PARSE',           // Raw log parsing stage
  NORMALIZE = 'NORMALIZE',   // Log normalization stage
  ANALYZE = 'ANALYZE',       // Analysis stage
  INSIGHTS = 'INSIGHTS',     // Insights generation stage
}

/**
 * Job Result Outcome
 * Final quality indicator (only set when status = COMPLETED)
 */
export enum JobOutcomeEnum {
  SUCCESS = 'SUCCESS',       // Full success, all stages completed without issues
  WARNING = 'WARNING',       // Partial success with warnings (e.g., ML failure)
}

// ==========================================
// USER TABLE
// ==========================================

export interface User {
  id: string;                    // UUID
  email: string;                 // Unique email
  password_hash: string;         // Hashed password
  first_name: string | null;     // Optional first name
  last_name: string | null;      // Optional last name
  created_at: Date;              // Record creation timestamp
  updated_at: Date;              // Record last update timestamp
}

export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

// ==========================================
// JOBS TABLE
// ==========================================

/**
 * Job Model - Central control entity of SentinelX
 * Tracks upload lifecycle, processing pipeline state, and progress
 */
export interface Job {
  id: string;                           // UUID
  user_id: string;                      // Foreign key to users table
  file_path: string;                    // File storage path (disk/cloud)
  file_name: string;                    // Original uploaded file name
  file_size: bigint;                    // File size in bytes
  status: JobStatusEnum;                // Current lifecycle status
  last_completed_stage: JobStageEnum | null;  // Last successfully completed stage
  outcome: JobOutcomeEnum | null;       // Final outcome (only when COMPLETED)
  progress: number;                     // Progress percentage (0-100)
  retry_count: number;                  // Number of retry attempts
  error_message: string | null;         // Failure reason if status = FAILED
  created_at: Date;                     // Job creation timestamp
  updated_at: Date;                     // Last update timestamp
  deleted_at: Date | null;              // Soft delete timestamp
}

/**
 * Job creation input - subset of Job fields
 */
export type CreateJobInput = Omit<
  Job,
  'id' | 'status' | 'last_completed_stage' | 'outcome' | 'progress' | 'retry_count' | 'error_message' | 'created_at' | 'updated_at' | 'deleted_at'
>;

/**
 * Job update input - partial subset of Job fields
 */
export type UpdateJobInput = Partial<
  Omit<Job, 'id' | 'created_at' | 'updated_at'>
>;

/**
 * Job with read-only metadata
 */
export interface JobWithMetadata extends Job {
  current_stage?: JobStageEnum; // Derived from last_completed_stage
  is_retriable?: boolean;       // Whether job can be retried
}

// ==========================================
// NORMALIZED LOGS TABLE
// ==========================================

/**
 * Normalized Log - Structured log entry after parsing and normalization
 * One-to-many relationship with Job
 */
export interface NormalizedLog {
  id: string;                    // UUID
  job_id: string;                // Foreign key to jobs table
  timestamp: Date;               // Event timestamp
  source: string | null;         // Log source system
  event_type: string | null;     // Type of event
  ip_address: string | null;     // Source IP address
  severity: string | null;       // Log severity level
  metadata: Record<string, any> | null;  // JSONB - flexible structured data
  created_at: Date;              // Record creation timestamp
}

export type CreateNormalizedLogInput = Omit<NormalizedLog, 'id' | 'created_at'>;
export type CreateNormalizedLogBatchInput = CreateNormalizedLogInput[];

/**
 * Normalized Log Query Result - for database queries
 */
export interface NormalizedLogQueryResult extends NormalizedLog {
  // metadata is already included as Record<string, any>
}

// ==========================================
// INSIGHTS TABLE
// ==========================================

/**
 * Insight - Final analysis result, user-facing
 * One-to-many relationship with Job
 */
export interface Insight {
  id: string;                    // UUID
  job_id: string;                // Foreign key to jobs table
  type: string;                  // Insight type/category
  title: string | null;          // Short summary title
  severity: string | null;       // Severity level (e.g., CRITICAL, HIGH, MEDIUM, LOW)
  data: Record<string, any> | null;     // JSONB - structured insight data
  created_at: Date;              // Record creation timestamp
}

export type CreateInsightInput = Omit<Insight, 'id' | 'created_at'>;
export type CreateInsightBatchInput = CreateInsightInput[];

/**
 * Insight Query Result - for database queries
 */
export interface InsightQueryResult extends Insight {
  // data is already included as Record<string, any>
}

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * Bulk insert result
 */
export interface BulkInsertResult {
  inserted_count: number;
  failed_count: number;
  errors?: Array<{ index: number; error: string }>;
}
