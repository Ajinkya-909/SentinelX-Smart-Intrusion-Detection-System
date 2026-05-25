import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { ApiResponse } from "@/utils/api-response";
import { ApiError } from "@/utils/api-error";
import { uploadService } from "@/services/jobs/upload.service";
import { jobService } from "@/services/jobs/job.service";
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

  if (!file) {
    throw new ApiError(400, UPLOAD_ERRORS.NO_FILE);
  }

  const job = await uploadService.uploadAndCreateJob(file, userId);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        job_id: job.id,
        status: job.status,
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
          status: "REPROCESSING",
          message: "Job re-enqueued for analysis from normalized logs",
        },
        "Job reanalysis initiated",
      ),
    );
  },
);
