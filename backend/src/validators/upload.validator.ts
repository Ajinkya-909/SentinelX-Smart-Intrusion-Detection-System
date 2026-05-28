import { Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/api-error";

export const validateUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check if file was uploaded
  if (!req.file) {
    throw new ApiError(400, "No file provided. Please upload a file.");
  }

  // Check file size (sanity check)
  if (!req.file.size || req.file.size === 0) {
    throw new ApiError(400, "Uploaded file is empty");
  }

  // Check file path
  if (!req.file.path) {
    throw new ApiError(500, "File storage failed");
  }

  // Validate and extract job_name from form fields
  const jobName = req.body.jobName as string | undefined;
  if (jobName !== undefined && jobName !== null) {
    // Trim and validate job_name if provided
    const trimmedJobName = (jobName as string).trim();
    if (trimmedJobName && trimmedJobName.length > 255) {
      throw new ApiError(400, "Job name must not exceed 255 characters");
    }
    (req as any).jobName = trimmedJobName || null;
  } else {
    (req as any).jobName = null;
  }

  // File validation passed, attach to request for controller
  (req as any).uploadedFile = req.file;

  next();
};
