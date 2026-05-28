import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { ApiResponse } from "@/utils/api-response";
import { ApiError } from "@/utils/api-error";
import { uploadService } from "@/services/jobs/upload.service";
import { jobService } from "@/services/jobs/job.service";
import { fileService } from "@/services/files/file.service";
import { UPLOAD_ERRORS } from "@/constants/upload.constants";
import {
  getProgressByStage,
  getNextStageFromCompleted,
} from "@/types/job.types";
import { JobStatusEnum } from "@/types/db.types";
import { enqueueJob } from "@/queue/job.queue";
import { prisma } from "@/config/db";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const file = req.file;
  const jobName = (req as any).jobName;

  if (!file) {
    throw new ApiError(400, UPLOAD_ERRORS.NO_FILE);
  }

  const job = await uploadService.uploadAndCreateJob(file, userId, jobName);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        job_id: job.id,
        status: job.status,
        job_name: job.job_name,
        file_name: job.file_name,
        file_size: Number(job.file_size),
        created_at: job.created_at,
      },
      "File uploaded successfully. Job created.",
    ),
  );
});

export const getJobStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    const job = await jobService.getJobById(jobId);

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    const currentStage = getNextStageFromCompleted(job.last_completed_stage);
    const progress =
      job.progress || getProgressByStage(job.last_completed_stage);

    const response: any = {
      jobId: job.id,
      jobName: job.job_name,
      status: job.status,
      currentStage,
      progress,
      lastUpdated: job.updated_at,
    };

    if (job.status === JobStatusEnum.FAILED && job.error_message) {
      response.error = job.error_message;
    }

    return res
      .status(200)
      .json(new ApiResponse(200, response, "Job status retrieved"));
  },
);

export const reanalyzeJob = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    // Get job
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    // Verify user owns this job
    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    // Check if normalized logs exist
    const normalizedCount = await prisma.normalized_logs.count({
      where: { job_id: jobId },
    });
    if (normalizedCount === 0) {
      throw new ApiError(
        400,
        "Cannot reanalyze: normalized logs do not exist. Job must be at least NORMALIZED.",
      );
    }

    // Prepare for reanalysis (reset checkpoint, clear findings/insights)
    const preparedJob = await jobService.reanalyzeJob(jobId);

    // Re-enqueue to main queue (similar to upload)
    try {
      await enqueueJob({
        job_id: jobId,
        user_id: userId,
        file_path: preparedJob.file_path,
        file_name: preparedJob.file_name,
        last_completed_stage: preparedJob.last_completed_stage,
        retry_count: preparedJob.retry_count || 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      throw new ApiError(500, "Failed to requeue job for reanalysis");
    }

    return res.status(202).json(
      new ApiResponse(
        202,
        {
          jobId,
          jobName: job.job_name,
          status: "REPROCESSING",
          message: "Job re-enqueued for analysis from normalized logs",
        },
        "Job reanalysis initiated",
      ),
    );
  },
);

/**
 * List all jobs for the authenticated user (dashboard view)
 * Supports pagination with limit and offset query parameters
 */
export const listUserJobs = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 100)
      : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    const response = await jobService.getJobsByUserId(userId, limit, offset);

    // Transform the response to match API spec
    const formattedJobs = response.jobs.map((job) => ({
      jobId: job.id,
      jobName: job.job_name,
      fileName: job.file_name,
      status: job.status,
      severity: job.status === JobStatusEnum.COMPLETED ? "HIGH" : undefined,
      createdAt: job.created_at,
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          jobs: formattedJobs,
          pagination: {
            limit: response.limit,
            offset: response.offset,
            total: response.total_count,
          },
        },
        "User jobs retrieved successfully",
      ),
    );
  },
);

/**
 * Get detailed analysis results and insights for a completed job
 * Returns threats, findings, and generated insights
 */
export const getJobResults = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 100)
      : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    // If job is still processing
    if (job.status === JobStatusEnum.PROCESSING) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "PROCESSING",
            message: "Results not ready yet",
            progress: job.progress || 0,
          },
          "Job is still processing",
        ),
      );
    }

    // If job failed
    if (job.status === JobStatusEnum.FAILED) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "FAILED",
            error: job.error_message || "Analysis failed",
          },
          "Job failed during analysis",
        ),
      );
    }

    // Get findings and insights for completed job
    const results = await jobService.getJobResults(jobId, limit, offset);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { jobId, jobName: job.job_name, ...results },
          "Job results retrieved successfully",
        ),
      );
  },
);

/**
 * Delete a job and all associated data (DB records and stored file)
 */
export const deleteJobEndpoint = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to delete this job");
    }

    // Delete job (cascade deletes related records)
    await jobService.deleteJob(jobId);

    // Clean up file
    try {
      await fileService.deleteFile(job.file_path);
    } catch (error) {
      // Log error but don't fail the response
      console.error(`Failed to delete file for job ${jobId}:`, error);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { jobId, jobName: job.job_name, message: "Job deleted successfully" },
          "Job and associated data deleted",
        ),
      );
  },
);

/**
 * Retry a job from the upload stage
 * Resets job to UPLOADED state, clears all pipeline outputs (normalized logs, findings, insights)
 * Keeps original file intact and re-queues for complete reprocessing
 */
export const retryJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const jobId = req.params.id as string;

  if (!jobId) {
    throw new ApiError(400, "Job ID is required");
  }

  // Get job and verify it exists
  const job = await jobService.getJobById(jobId);
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Verify user owns this job
  if (job.user_id !== userId) {
    throw new ApiError(403, "Unauthorized to access this job");
  }

  // Verify file still exists
  const fileExists = await fileService.fileExists(job.file_path);
  if (!fileExists) {
    throw new ApiError(400, "Cannot retry: original file no longer exists");
  }

  // Reset job to UPLOADED state and clear pipeline data
  const resetJob = await jobService.retryJob(jobId);

  // Re-enqueue to job queue (same as upload flow)
  try {
    await enqueueJob({
      job_id: jobId,
      user_id: userId,
      file_path: resetJob.file_path,
      file_name: resetJob.file_name,
      last_completed_stage: resetJob.last_completed_stage,
      retry_count: resetJob.retry_count || 0,
      timestamp: Date.now(),
    });
  } catch (error) {
    throw new ApiError(500, "Failed to requeue job for retry");
  }

  return res.status(202).json(
    new ApiResponse(
      202,
      {
        jobId,
        jobName: resetJob.job_name,
        status: "UPLOADED",
        message: "Job reset to initial state and re-queued for processing",
      },
      "Job retry initiated",
    ),
  );
});

/**
 * Get complete job information
 * Returns all job details: metadata, status, stage, progress, error messages, etc.
 */
export const getCompleteJobInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    // Get current stage
    const currentStage = getNextStageFromCompleted(job.last_completed_stage);

    // Format response with all job information
    const jobInfo = {
      id: job.id,
      user_id: job.user_id,
      job_name: job.job_name,
      file_name: job.file_name,
      file_size: Number(job.file_size),
      status: job.status,
      current_stage: currentStage,
      progress: job.progress || 0,
      outcome: job.outcome || null,
      error_message: job.error_message || null,
      retry_count: job.retry_count || 0,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, jobInfo, "Complete job information retrieved"),
      );
  },
);

/**
 * Get ONLY insights for a job from insights table
 * Returns insights with pagination support
 */
export const getJobInsights = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 100)
      : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    // If job is still processing
    if (job.status === JobStatusEnum.PROCESSING) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "PROCESSING",
            message: "Insights not ready yet",
            progress: job.progress || 0,
            insights: [],
          },
          "Job is still processing",
        ),
      );
    }

    // If job failed
    if (job.status === JobStatusEnum.FAILED) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "FAILED",
            error: job.error_message || "Analysis failed",
            insights: [],
          },
          "Job failed during analysis",
        ),
      );
    }

    // Get insights from database
    const insightsResult = await jobService.getJobInsights(
      jobId,
      limit,
      offset,
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { jobId, jobName: job.job_name, ...insightsResult },
          "Job insights retrieved successfully",
        ),
      );
  },
);

/**
 * Get ONLY analyzer findings (threats) for a job from analyzer_findings table
 * Returns findings with pagination support
 */
export const getJobFindings = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 100)
      : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to access this job");
    }

    // If job is still processing
    if (job.status === JobStatusEnum.PROCESSING) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "PROCESSING",
            message: "Findings not ready yet",
            progress: job.progress || 0,
            findings: [],
          },
          "Job is still processing",
        ),
      );
    }

    // If job failed
    if (job.status === JobStatusEnum.FAILED) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            jobId,
            jobName: job.job_name,
            status: "FAILED",
            error: job.error_message || "Analysis failed",
            findings: [],
          },
          "Job failed during analysis",
        ),
      );
    }

    // Get findings from database
    const findingsResult = await jobService.getJobFindings(
      jobId,
      limit,
      offset,
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { jobId, jobName: job.job_name, ...findingsResult },
          "Job findings retrieved successfully",
        ),
      );
  },
);

/**
 * Download raw log file that was uploaded by user
 * Returns file as attachment for download
 */
export const downloadJobFile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const jobId = req.params.id as string;

    if (!jobId) {
      throw new ApiError(400, "Job ID is required");
    }

    // Get job and verify user ownership
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.user_id !== userId) {
      throw new ApiError(403, "Unauthorized to download this file");
    }

    // Download file using file service
    try {
      const fileStream = await fileService.downloadFile(job.file_path);

      // Set response headers for file download
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${job.file_name}"`,
      );
      res.setHeader("Content-Length", job.file_size.toString());

      // Pipe file to response
      fileStream.pipe(res);

      // Handle stream errors
      fileStream.on("error", (error) => {
        console.error(`File download error for job ${jobId}:`, error);
        if (!res.headersSent) {
          throw new ApiError(500, "Failed to download file");
        }
      });
    } catch (error) {
      console.error(`Download failed for job ${jobId}:`, error);
      throw new ApiError(500, "Failed to download file");
    }
  },
);
