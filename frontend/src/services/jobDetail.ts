import api from "./api";
import {
  Job,
  JobStatus,
  JobMetadata,
  JobDetailResponse,
  ProcessingState,
  ErrorState,
} from "../types/job";

/**
 * Job Detail Service
 * Handles API calls specifically for the /jobs/:id detail page
 * PHASE 1 & 2: Service layer for job detail operations
 */

/**
 * Transform API response from snake_case to camelCase
 * API returns: id, job_name, file_name, file_size, created_at, updated_at, etc.
 * Types expect: jobId, jobName, fileName, fileSize, createdAt, updatedAt, etc.
 */
function transformApiResponse(data: any): Job {
  const processingMetadata = data.processing_metadata
    ? {
        detectedType: data.processing_metadata.detectedType,
        confidence: data.processing_metadata.confidence,
        parser: data.processing_metadata.parser,
        encoding: data.processing_metadata.encoding,
        patterns: data.processing_metadata.patterns,
      }
    : null;

  return {
    jobId: data.id || data.jobId,
    userId: data.user_id || data.userId,
    jobName: data.job_name || data.jobName,
    fileName: data.file_name || data.fileName,
    fileSize: data.file_size || data.fileSize,
    status: data.status,
    lastCompletedStage: data.current_stage || data.lastCompletedStage,
    progress: data.progress,
    errorMessage: data.error_message || data.errorMessage,
    outcome: data.outcome,
    severity: data.severity,
    processingMetadata: processingMetadata,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    deletedAt: data.deleted_at || data.deletedAt,
  };
}

export const jobDetailService = {
  /**
   * Fetch complete job details
   * @param jobId - The ID of the job to fetch
   * @returns - Complete job detail information
   */
  async fetchJobDetail(jobId: string): Promise<Job> {
    const response = await api.get<any>(`/jobs/${jobId}`);
    return transformApiResponse(response.data);
  },

  /**
   * Poll job status (used during PROCESSING state)
   * @param jobId - The ID of the job to check
   * @returns - Current job status and progress
   */
  async pollJobStatus(jobId: string): Promise<JobStatus> {
    const response = await api.get<JobStatus>(`/jobs/${jobId}/status`);
    return response.data;
  },

  /**
   * Retry a failed job
   * @param jobId - The ID of the job to retry
   * @returns - Updated job information
   */
  async retryFailedJob(jobId: string): Promise<Job> {
    const response = await api.post<any>(`/jobs/${jobId}/retry`);
    return transformApiResponse(response.data);
  },

  /**
   * Delete a job
   * @param jobId - The ID of the job to delete
   * @returns - Void on success
   */
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },

  /**
   * Reanalyze a completed job
   * @param jobId - The ID of the job to reanalyze
   * @returns - Updated job information (status will be PROCESSING)
   */
  async reanalyzeJob(jobId: string): Promise<Job> {
    const response = await api.post<any>(`/jobs/${jobId}/reanalyze`);
    return transformApiResponse(response.data);
  },

  /**
   * Download the raw log file
   * @param jobId - The ID of the job
   * @returns - Blob of the file
   */
  async downloadRawLog(jobId: string): Promise<Blob> {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/jobs/${jobId}/file`,
      {
        method: "GET",
        headers,
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  },

  // =========================================================================
  // Helper functions for state mapping
  // =========================================================================

  /**
   * Map JobStatus to ProcessingState UI data
   * Translates API response to UI-friendly format
   */
  mapToProcessingState(status: JobStatus): ProcessingState {
    const stageMap: Record<string, string> = {
      UPLOADED: "Uploaded",
      NORMALIZING: "Normalizing",
      ANALYZING: "Analyzing",
      INSIGHTS: "Generating Insights",
    };

    return {
      stage: stageMap[status.lastCompletedStage || "UPLOADED"] || "Processing",
      progress: status.progress || 0,
      message: `Step ${((status.progress || 0) / 25) | 0}/4 in progress...`,
    };
  },

  /**
   * Map Job to ErrorState UI data
   * Translates API response to error UI format
   */
  mapToErrorState(job: Job): ErrorState {
    return {
      errorMessage: job.errorMessage || "Analysis failed. Please try again.",
      timestamp: job.updatedAt,
      recoverable: true, // All failures are recoverable via retry
    };
  },

  /**
   * Map Job to JobMetadata for completed state
   * Extracts relevant metadata for display
   */
  mapToJobMetadata(job: Job): JobMetadata {
    return {
      jobId: job.jobId,
      fileName: job.fileName,
      fileSize: job.fileSize,
      jobName: job.jobName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      severity: job.severity,
      outcome: job.outcome,
    };
  },

  /**
   * Determine if job is in a final state (not processing)
   */
  isFinalState(status: Job["status"]): boolean {
    return status === "COMPLETED" || status === "FAILED";
  },

  /**
   * Determine if user can perform actions on the job
   */
  canPerformActions(status: Job["status"]): boolean {
    return status !== "PROCESSING";
  },
};

export default jobDetailService;
