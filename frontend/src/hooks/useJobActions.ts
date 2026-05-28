import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import jobDetailService from "../services/jobDetail";
import { Job } from "../types/job";

/**
 * PHASE 8: Action Handlers & Side Effects
 * Custom hook for managing job detail actions (retry, delete, reanalyze, download)
 * Handles loading states, error handling, and side effects (navigation, etc.)
 */

export interface ActionState {
  isLoading: boolean;
  error: string | null;
}

export interface UseJobActionsReturn {
  // Action handlers
  handleRetry: (jobId: string) => Promise<void>;
  handleDelete: (jobId: string) => Promise<void>;
  handleReanalyze: (jobId: string) => Promise<void>;
  handleDownload: (jobId: string, fileName: string) => Promise<void>;

  // State
  retryState: ActionState;
  deleteState: ActionState;
  reanalyzeState: ActionState;
  downloadState: ActionState;

  // Utility
  isAnyLoading: boolean;
  clearErrors: () => void;
}

export const useJobActions = (): UseJobActionsReturn => {
  const navigate = useNavigate();

  // Individual action states
  const [retryState, setRetryState] = useState<ActionState>({
    isLoading: false,
    error: null,
  });
  const [deleteState, setDeleteState] = useState<ActionState>({
    isLoading: false,
    error: null,
  });
  const [reanalyzeState, setReanalyzeState] = useState<ActionState>({
    isLoading: false,
    error: null,
  });
  const [downloadState, setDownloadState] = useState<ActionState>({
    isLoading: false,
    error: null,
  });

  /**
   * Retry a failed job
   * Flow:
   * 1. Call POST /jobs/:id/retry
   * 2. Job returns with status "UPLOADED" (reset state)
   * 3. Navigate back to /jobs/:id (will auto-fetch and start polling)
   * 4. Component will see PROCESSING status and poll for completion
   */
  const handleRetry = useCallback(
    async (jobId: string): Promise<void> => {
      setRetryState({ isLoading: true, error: null });

      try {
        await jobDetailService.retryFailedJob(jobId);

        // Retry successful - navigate back to job detail to see updated status
        // The component will auto-fetch and see status as UPLOADED/PROCESSING
        navigate(`/jobs/${jobId}`);

        setRetryState({ isLoading: false, error: null });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to retry job";
        setRetryState({ isLoading: false, error: errorMessage });
        throw err;
      }
    },
    [navigate],
  );

  /**
   * Delete a job permanently
   * Flow:
   * 1. Call DELETE /jobs/:id
   * 2. Job is permanently deleted (cascade deletion of all related data)
   * 3. Navigate to /jobs (job list page)
   * 4. Component shows success state
   */
  const handleDelete = useCallback(
    async (jobId: string): Promise<void> => {
      setDeleteState({ isLoading: true, error: null });

      try {
        await jobDetailService.deleteJob(jobId);

        // Delete successful - navigate to jobs list
        navigate("/jobs", { replace: true });
        setDeleteState({ isLoading: false, error: null });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete job";
        setDeleteState({ isLoading: false, error: errorMessage });
        throw err;
      }
    },
    [navigate],
  );

  /**
   * Reanalyze a completed job with updated analyzer algorithms
   * Flow:
   * 1. Call POST /jobs/:id/reanalyze
   * 2. Job is re-enqueued with status "REPROCESSING" (actually PROCESSING)
   * 3. Navigate back to job detail
   * 4. Component will auto-fetch and see PROCESSING status
   * 5. Component will poll /jobs/:id/status until completion
   *
   * Note: Reanalyze bypasses parsing/normalization and only re-executes analysis
   * Precondition: Job must have reached at least NORMALIZED stage
   */
  const handleReanalyze = useCallback(
    async (jobId: string): Promise<void> => {
      setReanalyzeState({ isLoading: true, error: null });

      try {
        await jobDetailService.reanalyzeJob(jobId);

        // Reanalyze successful - navigate back to job detail
        // Component will auto-fetch and see PROCESSING status
        navigate(`/jobs/${jobId}`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to reanalyze job";
        setReanalyzeState({ isLoading: false, error: errorMessage });
        throw err;
      }
    },
    [navigate],
  );

  /**
   * Download the raw log file as attachment
   * Flow:
   * 1. Call GET /jobs/:id/file (returns Blob, NOT JSON)
   * 2. Create download link from Blob
   * 3. Programmatically trigger download
   * 4. Clean up object URL
   *
   * Note: Browser handles the actual download via <a> tag click
   */
  const handleDownload = useCallback(
    async (jobId: string, fileName: string): Promise<void> => {
      setDownloadState({ isLoading: true, error: null });

      try {
        const blob = await jobDetailService.downloadRawLog(jobId);

        // Create object URL from blob
        const objectUrl = URL.createObjectURL(blob);

        // Create temporary anchor element and trigger download
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName || `job-${jobId}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up object URL to free memory
        URL.revokeObjectURL(objectUrl);

        setDownloadState({ isLoading: false, error: null });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to download file";
        setDownloadState({ isLoading: false, error: errorMessage });
        throw err;
      }
    },
    [],
  );

  /**
   * Utility: Clear all errors
   */
  const clearErrors = useCallback(() => {
    setRetryState((prev) => ({ ...prev, error: null }));
    setDeleteState((prev) => ({ ...prev, error: null }));
    setReanalyzeState((prev) => ({ ...prev, error: null }));
    setDownloadState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Utility: Check if any action is in progress
   */
  const isAnyLoading =
    retryState.isLoading ||
    deleteState.isLoading ||
    reanalyzeState.isLoading ||
    downloadState.isLoading;

  return {
    handleRetry,
    handleDelete,
    handleReanalyze,
    handleDownload,
    retryState,
    deleteState,
    reanalyzeState,
    downloadState,
    isAnyLoading,
    clearErrors,
  };
};

export default useJobActions;
