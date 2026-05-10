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

  // File validation passed, attach to request for controller
  (req as any).uploadedFile = req.file;

  next();
};
