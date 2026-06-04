import { useEffect, useRef, useCallback, useState } from "react";
import jobDetailService from "../services/jobDetail";
import { Job, JobStatus } from "../types/job";

/**
 * PHASE 8: Polling & Data Fetching Logic
 * Custom hook for managing job detail fetching and polling
 * Handles status polling during PROCESSING, smart polling strategy
 */

export interface UseFetchJobDetailReturn {
  job: Job | null;
  status: JobStatus | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  refetch: () => Promise<void>;
}

export const useFetchJobDetail = (jobId: string): UseFetchJobDetailReturn => {
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs to manage polling interval and prevent race conditions
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch full job details
   * Called on component mount and after actions (retry, reanalyze)
   */
  const fetchJobDetail = useCallback(async (showLoader = true): Promise<void> => {
    if (!jobId) return;

    try {
      if (showLoader) setIsLoading(true);
      setError(null);

      const jobData = await jobDetailService.fetchJobDetail(jobId);

      if (!isMountedRef.current) return;

      setJob(jobData);
      setIsLoading(false);

      // Determine if we need to start polling
      if (jobData.status === "UPLOADED" || jobData.status === "PROCESSING") {
        setIsPolling(true);
      } else {
        setIsPolling(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch job details";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [jobId]);

  /**
   * Poll job status
   * Only active when job is in PROCESSING state
   * Polling interval: 3000ms (3 seconds)
   */
  const pollStatus = useCallback(async (): Promise<void> => {
    if (!jobId) return;

    try {
      const statusData = await jobDetailService.pollJobStatus(jobId);

      if (!isMountedRef.current) return;

      setStatus(statusData);

      // Update job status from polling response
      setJob((prevJob) => {
        if (!prevJob) return null;

        return {
          ...prevJob,

          // Only overwrite if backend actually returned a value
          status: statusData.status ?? prevJob.status,

          progress:
            statusData.progress !== undefined
              ? statusData.progress
              : prevJob.progress,

          errorMessage:
            statusData.errorMessage !== undefined
              ? statusData.errorMessage
              : prevJob.errorMessage,

          lastCompletedStage:
            statusData.lastCompletedStage !== undefined
              ? statusData.lastCompletedStage
              : prevJob.lastCompletedStage,

          updatedAt:
            statusData.updatedAt !== undefined
              ? statusData.updatedAt
              : prevJob.updatedAt,
        };
      });

      // Stop polling if job is no longer processing, and fetch full final job detail
      if (statusData.status === "COMPLETED" || statusData.status === "FAILED") {
        setIsPolling(false);
        fetchJobDetail(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : "Failed to poll job status";
      setError(errorMessage);

      // Don't stop polling on error - continue trying
      // (user might have lost connection temporarily)
    }
  }, [jobId, fetchJobDetail]);

  /**
   * Manage polling interval
   * Starts polling when job is UPLOADED/PROCESSING, stops otherwise
   */
  useEffect(() => {
    if (!isPolling || !jobId) {
      // Clear existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling with 2-second interval
    pollingIntervalRef.current = setInterval(() => {
      pollStatus();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, jobId, pollStatus]);

  /**
   * Initial fetch on component mount or when jobId changes
   */
  useEffect(() => {
    isMountedRef.current = true;

    fetchJobDetail();

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [jobId, fetchJobDetail]);

  /**
   * Manual refetch function
   * Can be called from UI to manually refresh data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchJobDetail();
  }, [fetchJobDetail]);

  return {
    job,
    status,
    isLoading,
    error,
    isPolling,
    refetch,
  };
};

export default useFetchJobDetail;
