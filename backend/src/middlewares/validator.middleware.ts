import { ApiError } from "@/utils/api-error";
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors: any[] = [];
  errors.array().forEach((err) =>
    extractedErrors.push({
      [err.type]: err.msg,
    }),
  );
  throw new ApiError(422, "Recieved data is not valid", extractedErrors);
};
