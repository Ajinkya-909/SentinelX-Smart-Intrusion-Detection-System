import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { ApiResponse } from "@/utils/api-response";
import { ApiError } from "@/utils/api-error";
import { uploadService } from "@/services/jobs/upload.service";
import { UPLOAD_ERRORS } from "@/constants/upload.constants";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, UPLOAD_ERRORS.NO_FILE);
  }

  // Orchestrate upload workflow (file + job + cleanup on error)
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
