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
