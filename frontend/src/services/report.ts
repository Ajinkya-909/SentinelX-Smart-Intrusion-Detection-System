// src/services/report.ts
import api from './api';
import { InsightsResponse } from '../types/insight'; // Adjust this import based on your exact types file location

/**
 * Fetches ONLY the generated insights for a job.
 * Useful for rendering the main visual dashboard.
 */
export const getJobInsights = async (
  jobId: string,
  limit: number = 50,
  offset: number = 0
): Promise<InsightsResponse> => {
  // Construct the query string natively
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  const response = await api.get<InsightsResponse>(`/jobs/${jobId}/insights?${queryParams.toString()}`);
  
  // ApiService returns { data, statusCode, message, success }. We extract .data
  return response.data; 
};

/**
 * Fetches ONLY the raw analyzer findings (threats).
 * Useful for the detailed data grid/table section.
 */
export const getJobFindings = async (
  jobId: string,
  limit: number = 50,
  offset: number = 0
) => {
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<any>(`/jobs/${jobId}/findings?${queryParams.toString()}`);
  return response.data;
};

/**
 * Fetches BOTH insights and threats in one comprehensive payload.
 * Useful if you want to load everything on the initial page load.
 */
export const getJobResults = async (
  jobId: string,
  limit: number = 50,
  offset: number = 0
) => {
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<any>(`/jobs/${jobId}/results?${queryParams.toString()}`);
  return response.data;
};