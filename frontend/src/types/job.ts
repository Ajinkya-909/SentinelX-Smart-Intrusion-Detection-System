export interface DetectionResult {
  detectedType: string;
  confidence: number;
  parser: string;
  encoding: string;
  patterns: {
    matched: string[];
    analysis: Record<string, number>;
  };
}

export interface Job {
  jobId: string;
  userId?: string;
  fileName: string;
  fileSize?: number;
  jobName?: string;
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  lastCompletedStage?: string;
  progress?: number;
  errorMessage?: string;
  outcome?: "SUCCESS" | "WARNING" | null;
  severity?: string;
  processingMetadata?: DetectionResult | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

export interface JobListResponse {
  jobs: Job[];
  pagination: Pagination;
}

export interface JobListParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// PHASE 2: Job Detail Types (for /jobs/:id route)
// ============================================================================

/**
 * JobStatus represents the response from GET /jobs/:id/status
 * Used for polling during PROCESSING state
 */
export interface JobStatus {
  jobId: string;
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  lastCompletedStage?: string;
  progress?: number; // 0-100 percentage
  errorMessage?: string;
  updatedAt?: string;
}

/**
 * JobMetadata contains detailed information about a completed job
 * Derived from GET /jobs/:id response
 */
export interface JobMetadata {
  jobId: string;
  fileName: string;
  fileSize?: number; // in bytes
  jobName?: string;
  createdAt?: string;
  updatedAt?: string;
  duration?: number; // in milliseconds or seconds
  severity?: string; // e.g., "CRITICAL", "HIGH", "MEDIUM", "LOW"
  outcome?: "SUCCESS" | "WARNING" | null;
  totalEventsProcessed?: number;
  threatCount?: number;
}

/**
 * JobDetailResponse represents the full response from GET /jobs/:id
 * This is what the JobDetail page works with
 */
export interface JobDetailResponse extends Job {
  // Extended fields for detailed job view
  metadata?: JobMetadata;
  duration?: number;
  totalEventsProcessed?: number;
  threatCount?: number;
}

/**
 * Processing state UI data
 * Shows current stage and progress during analysis
 */
export interface ProcessingState {
  stage: string; // "UPLOADED", "NORMALIZING", "ANALYZING", "INSIGHTS"
  progress: number; // 0-100
  message?: string; // Human-readable message
}

/**
 * Error state UI data
 * Shows when job has failed
 */
export interface ErrorState {
  errorMessage: string;
  errorCode?: string;
  timestamp?: string;
  recoverable: boolean; // Can user retry?
}
