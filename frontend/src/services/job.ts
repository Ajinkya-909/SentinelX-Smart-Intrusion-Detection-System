import api from "./api";
import { Job, JobListResponse, JobListParams } from "../types/job";

export const jobService = {
  /**
   * Fetch all jobs for the current user with pagination
   * @param params - Pagination parameters (limit, offset)
   * @returns - List of jobs with pagination metadata
   */
  async listJobs(params?: JobListParams): Promise<JobListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = `/jobs${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<JobListResponse>(endpoint);
    return response.data;
  },

  /**
   * Get complete information for a specific job
   * @param jobId - The ID of the job
   * @returns - Complete job information
   */
  async getJobById(jobId: string): Promise<Job> {
    const response = await api.get<Job>(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get job status
   * @param jobId - The ID of the job
   * @returns - Job status information
   */
  async getJobStatus(jobId: string): Promise<Job> {
    const response = await api.get<Job>(`/jobs/${jobId}/status`);
    return response.data;
  },

  /**
   * Delete a job
   * @param jobId - The ID of the job to delete
   * @returns - Deletion confirmation
   */
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },

  /**
   * Retry a failed job
   * @param jobId - The ID of the job to retry
   * @returns - Updated job information
   */
  async retryJob(jobId: string): Promise<Job> {
    const response = await api.post<Job>(`/jobs/${jobId}/retry`);
    return response.data;
  },

  /**
   * Reanalyze a completed job
   * @param jobId - The ID of the job to reanalyze
   * @returns - Updated job information
   */
  async reanalyzeJob(jobId: string): Promise<Job> {
    const response = await api.post<Job>(`/jobs/${jobId}/reanalyze`);
    return response.data;
  },
};

export default jobService;
