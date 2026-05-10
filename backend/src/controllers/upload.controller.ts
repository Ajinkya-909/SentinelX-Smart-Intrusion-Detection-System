import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { ApiResponse } from "@/utils/api-response";
import { ApiError } from "@/utils/api-error";
import { jobService } from "@/services/job.service";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, "No file uploaded");
  }

  const filePath = file.path;
  const fileName = file.originalname;
  const fileSize = BigInt(file.size);

  const job = await jobService.createJob({
    user_id: userId,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
  });

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
