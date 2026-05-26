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

/**
 * Custom validation middleware for user update
 * Ensures at least one field is provided and password validation rules are met
 */
export const validateUserUpdateData = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { first_name, last_name, current_password, new_password } = req.body;

  // Check if at least one field is provided
  const hasFirstName = first_name && first_name.trim().length > 0;
  const hasLastName = last_name && last_name.trim().length > 0;
  const hasPasswordUpdate = new_password && new_password.trim().length > 0;

  if (!hasFirstName && !hasLastName && !hasPasswordUpdate) {
    throw new ApiError(
      422,
      "At least one field (first_name, last_name, or new_password) must be provided to update",
    );
  }

  // If new_password is provided, current_password must also be provided
  if (
    hasPasswordUpdate &&
    (!current_password || current_password.trim().length === 0)
  ) {
    throw new ApiError(422, "Current password is required to update password");
  }

  next();
};
