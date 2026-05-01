/**
 * API Request/Response Type Definitions
 * Defines all HTTP API contracts and data structures
 */

import {
  JobStatusEnum,
  JobStageEnum,
  JobOutcomeEnum,
  User,
  Job,
  NormalizedLog,
  Insight,
} from './db.types';

// ==========================================
// COMMON API STRUCTURES
// ==========================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;                    // Error code (e.g., JOB_NOT_FOUND)
  message: string;                 // Human-readable message
  details?: Record<string, any>;   // Additional error details
  status_code: number;             // HTTP status code
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ==========================================
// AUTHENTICATION & USER
// ==========================================

/**
 * User registration request
 */
export interface AuthSignupRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

/**
 * User login request
 */
export interface AuthLoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;              // Seconds
}

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// FILE UPLOAD & JOB CREATION
// ==========================================

/**
 * Upload file request metadata
 */
export interface UploadFileRequest {
  user_id: string;
  file_name: string;
  file_size: bigint;
  file_path: string;               // Where file is stored
}

/**
 * Upload file response
 */
export interface UploadFileResponse {
  job_id: string;
  file_name: string;
  file_size: number;
  status: JobStatusEnum;
  progress: number;
  created_at: string;
  message: string;
}

// ==========================================
// JOB STATUS & DETAILS
// ==========================================

/**
 * Get job status request
 */
export interface GetJobStatusRequest {
  job_id: string;
}

/**
 * Job status response - detailed
 */
export interface JobStatusDetailedResponse {
  job_id: string;
  file_name: string;
  file_size: number;
  status: JobStatusEnum;
  last_completed_stage: JobStageEnum | null;
  current_stage: JobStageEnum | null;
  progress: number;                // 0-100
  outcome: JobOutcomeEnum | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  estimated_time_remaining?: number; // In milliseconds
}

/**
 * Job list item (for list responses)
 */
export interface JobListItemResponse {
  job_id: string;
  file_name: string;
  file_size: number;
  status: JobStatusEnum;
  progress: number;
  outcome: JobOutcomeEnum | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get jobs list request
 */
export interface GetJobsListRequest {
  user_id: string;
  page?: number;
  page_size?: number;
  status?: JobStatusEnum;
  sort_by?: 'created_at' | 'updated_at' | 'file_name';
  sort_order?: 'asc' | 'desc';
}

/**
 * Get jobs list response
 */
export interface GetJobsListResponse {
  jobs: JobListItemResponse[];
  pagination: PaginationMeta;
}

// ==========================================
// LOGS & INSIGHTS
// ==========================================

/**
 * Get normalized logs request
 */
export interface GetNormalizedLogsRequest {
  job_id: string;
  page?: number;
  page_size?: number;
  filter?: {
    severity?: string;
    event_type?: string;
    ip_address?: string;
    timestamp_from?: string;      // ISO 8601
    timestamp_to?: string;        // ISO 8601
  };
}

/**
 * Normalized log response item
 */
export interface NormalizedLogResponse {
  id: string;
  job_id: string;
  timestamp: string;              // ISO 8601
  source: string | null;
  event_type: string | null;
  ip_address: string | null;
  severity: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

/**
 * Get normalized logs response
 */
export interface GetNormalizedLogsResponse {
  logs: NormalizedLogResponse[];
  pagination: PaginationMeta;
}

/**
 * Get insights request
 */
export interface GetInsightsRequest {
  job_id: string;
  page?: number;
  page_size?: number;
  filter?: {
    type?: string;
    severity?: string;
  };
}

/**
 * Insight response item
 */
export interface InsightResponse {
  id: string;
  job_id: string;
  type: string;
  title: string | null;
  severity: string | null;
  data: Record<string, any> | null;
  created_at: string;
}

/**
 * Get insights response
 */
export interface GetInsightsResponse {
  insights: InsightResponse[];
  pagination: PaginationMeta;
  threat_summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// ==========================================
// JOB OPERATIONS
// ==========================================

/**
 * Retry job request
 */
export interface RetryJobRequest {
  job_id: string;
  reset_stage?: boolean;           // Reset to start or resume?
}

/**
 * Retry job response
 */
export interface RetryJobResponse {
  job_id: string;
  status: JobStatusEnum;
  retry_count: number;
  message: string;
}

/**
 * Delete job request
 */
export interface DeleteJobRequest {
  job_id: string;
  soft_delete?: boolean;          // Default: true
}

/**
 * Delete job response
 */
export interface DeleteJobResponse {
  job_id: string;
  deleted_at: string;
  message: string;
}

// ==========================================
// DASHBOARD & ANALYTICS
// ==========================================

/**
 * Get dashboard statistics request
 */
export interface GetDashboardStatsRequest {
  user_id: string;
}

/**
 * Dashboard statistics response
 */
export interface DashboardStatsResponse {
  summary: {
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    processing_jobs: number;
    success_rate: number;         // Percentage
  };
  recent_jobs: JobListItemResponse[];
  threat_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  processing_speed: {
    average_parse_time_ms: number;
    average_normalize_time_ms: number;
    average_analyze_time_ms: number;
    average_insights_time_ms: number;
  };
}

/**
 * Get threat analysis report
 */
export interface GetThreatAnalysisRequest {
  job_id: string;
}

/**
 * Threat analysis report
 */
export interface ThreatAnalysisReportResponse {
  job_id: string;
  file_name: string;
  total_events: number;
  threat_count: number;
  critical_threats: Array<{
    insight_id: string;
    title: string;
    description: string;
    affected_ips: string[];
    timestamp: string;
  }>;
  top_threat_types: Array<{ type: string; count: number }>;
  affected_ip_ranges: string[];
  generated_at: string;
}

// ==========================================
// WEBSOCKET / REAL-TIME EVENTS
// ==========================================

/**
 * WebSocket event types
 */
export enum WebSocketEventType {
  JOB_STATUS_UPDATE = 'job_status_update',
  JOB_PROGRESS = 'job_progress',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  STAGE_COMPLETED = 'stage_completed',
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  job_id: string;
  timestamp: string;
  data: T;
}

/**
 * Job progress update event
 */
export interface JobProgressEventData {
  stage: JobStageEnum;
  progress: number;                // 0-100
  estimated_time_remaining_ms?: number;
}

/**
 * Job completion event
 */
export interface JobCompletionEventData {
  status: JobStatusEnum;
  outcome: JobOutcomeEnum | null;
  total_processing_time_ms: number;
  insights_count: number;
}

/**
 * Stage completion event
 */
export interface StageCompletionEventData {
  stage: JobStageEnum;
  next_stage?: JobStageEnum;
  execution_time_ms: number;
}

// ==========================================
// ERROR RESPONSES
// ==========================================

/**
 * Common error response codes
 */
export enum ApiErrorCode {
  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Job errors
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_NOT_FOUND_FOR_USER = 'JOB_NOT_FOUND_FOR_USER',
  JOB_ALREADY_PROCESSING = 'JOB_ALREADY_PROCESSING',
  JOB_CANNOT_BE_RETRIED = 'JOB_CANNOT_BE_RETRIED',
  JOB_INVALID_STATE = 'JOB_INVALID_STATE',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',

  // Processing errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  PIPELINE_ERROR = 'PIPELINE_ERROR',
  ML_SERVICE_UNAVAILABLE = 'ML_SERVICE_UNAVAILABLE',

  // General errors
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiError {
  code: 'VALIDATION_ERROR';
  validation_errors: Array<{
    field: string;
    message: string;
  }>;
}
