/**
 * Database Model Type Definitions
 * Represents PostgreSQL table structures and their TypeScript equivalents
 */

// Import Prisma-generated enum types (source of truth)
import {
  job_status_enum,
  job_stage_enum,
  job_outcome_enum,
} from "@/generated/prisma/enums";

// ==========================================
// ENUM TYPES (Using Prisma-generated enums)
// ==========================================

/**
 * Job Lifecycle Status
 * Type alias for Prisma-generated job_status_enum
 */
export type JobStatusEnum = job_status_enum;
export const JobStatusEnum = {
  UPLOADED: "UPLOADED" as const,
  PROCESSING: "PROCESSING" as const,
  COMPLETED: "COMPLETED" as const,
  FAILED: "FAILED" as const,
};

/**
 * Pipeline Execution Stages
 * Type alias for Prisma-generated job_stage_enum
 */
export type JobStageEnum = job_stage_enum;
export const JobStageEnum = {
  UPLOADED: "UPLOADED" as const,
  PREPROCESSED: "PREPROCESSED" as const,
  TYPE_DETECTED: "TYPE_DETECTED" as const,
  PARSED: "PARSED" as const,
  NORMALIZED: "NORMALIZED" as const,
  ANALYZED: "ANALYZED" as const,
  INSIGHTS_GENERATED: "INSIGHTS_GENERATED" as const,
  COMPLETED: "COMPLETED" as const,
};

/**
 * Job Result Outcome
 * Type alias for Prisma-generated job_outcome_enum
 */
export type JobOutcomeEnum = job_outcome_enum;
export const JobOutcomeEnum = {
  SUCCESS: "SUCCESS" as const,
  WARNING: "WARNING" as const,
};

// ==========================================
// DETECTION RESULT TYPE
// ==========================================

/**
 * Type Detection Result
 * Metadata about detected log format and parser strategy
 * Stored in jobs.processing_metadata
 */
export interface DetectionResult {
  detectedType: string; // NGINX_ACCESS, SYSLOG, JSON, CSV, GENERIC, etc
  confidence: number; // 0-1 (e.g., 0.85 = 85% confidence)
  parser: string; // Parser strategy to use (e.g., "nginxParserV1", "syslogParserV1")
  encoding: string; // Detected encoding (utf8, utf16le, etc)
  patterns: {
    matched: string[]; // Which patterns matched (for debugging)
    analysis: Record<string, number>; // Confidence per detector type
  };
}

// ==========================================
// USER TABLE
// ==========================================

export interface User {
  id: string; // UUID
  email: string; // Unique email
  password_hash: string; // Hashed password
  first_name: string | null; // Optional first name
  last_name: string | null; // Optional last name
  created_at: Date; // Record creation timestamp
  updated_at: Date; // Record last update timestamp

  // ==========================================
  // RELATIONS
  // ==========================================
  jobs?: Job[]; // One-to-many: User has many Jobs
}

/**
 * User Input Types
 * Define what data is sent TO the repository
 */
export interface CreateUserInput {
  email: string; // Required: unique email
  password_hash: string; // Required: bcrypt hashed password
  first_name?: string; // Optional: first name
  last_name?: string; // Optional: last name
}

export interface UpdateUserInput {
  email?: string; // Optional: update email
  password_hash?: string; // Optional: update password
  first_name?: string; // Optional: update first name
  last_name?: string; // Optional: update last name
}

// ==========================================
// JOBS TABLE
// ==========================================

/**
 * Job Model - Central control entity of SentinelX
 * Tracks upload lifecycle, processing pipeline state, and progress
 */
export interface Job {
  id: string; // UUID
  user_id: string; // Foreign key to users table
  file_path: string; // File storage path (disk/cloud)
  file_name: string; // Original uploaded file name
  job_name: string | null; // Custom job name provided by user (optional)
  file_size: bigint; // File size in bytes
  status: JobStatusEnum; // Current lifecycle status
  last_completed_stage: JobStageEnum | null; // Last successfully completed stage
  outcome: JobOutcomeEnum | null; // Final outcome (only when COMPLETED)
  progress: number; // Progress percentage (0-100)
  retry_count: number; // Number of retry attempts
  error_message: string | null; // Failure reason if status = FAILED
  processing_metadata: DetectionResult | null; // Type detection result from Stage 3
  created_at: Date; // Job creation timestamp
  updated_at: Date; // Last update timestamp
  deleted_at: Date | null; // Soft delete timestamp

  // ==========================================
  // RELATIONS
  // ==========================================
  users?: User; // Many-to-one: Job belongs to User
  insights?: Insight[]; // One-to-many: Job has many Insights
  normalized_logs?: NormalizedLog[]; // One-to-many: Job has many NormalizedLogs
}

// ==========================================
// NORMALIZED LOGS TABLE
// ==========================================

/**
 * Normalized Log - Structured log entry after parsing and normalization
 * One-to-many relationship with Job
 */
export interface NormalizedLog {
  id: string; // UUID
  job_id: string; // Foreign key to jobs table
  timestamp: Date; // Event timestamp
  source: string | null; // Log source system
  event_type: string | null; // Type of event
  ip_address: string | null; // Source IP address
  severity: string | null; // Log severity level
  metadata: Record<string, any> | null; // JSONB - flexible structured data
  created_at: Date; // Record creation timestamp

  // ==========================================
  // RELATIONS
  // ==========================================
  jobs?: Job; // Many-to-one: NormalizedLog belongs to Job
}

// ==========================================
// INSIGHTS TABLE
// ==========================================

/**
 * Insight - Final analysis result, user-facing
 * One-to-many relationship with Job
 */
export interface Insight {
  id: string; // UUID
  job_id: string; // Foreign key to jobs table
  type: string; // Insight type/category
  title: string | null; // Short summary title
  severity: string | null; // Severity level (e.g., CRITICAL, HIGH, MEDIUM, LOW)
  data: Record<string, any> | null; // JSONB - structured insight data
  created_at: Date; // Record creation timestamp

  // ==========================================
  // RELATIONS
  // ==========================================
  jobs?: Job; // Many-to-one: Insight belongs to Job
}
