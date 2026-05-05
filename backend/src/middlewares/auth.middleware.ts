import jwt from "jsonwebtoken";
import { userRepository } from "@/repositories";
import { asyncHandler } from "@/utils/async-handler";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/api-error";
import dotenv from "dotenv";
import { verifyToken } from "@/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    const user = await verifyToken(token);
    req.user = user;
    next();
  },
);
