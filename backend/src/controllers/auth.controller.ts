import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import {
  deletUserService,
  loginuserService,
  registerUserService,
} from "@/services/auth.service";
import { ApiResponse } from "@/utils/api-response";

interface UserDeleteParams {
  userId: string;
}

export const userSignup = asyncHandler(async (req: Request, res: Response) => {
  const { first_name, last_name, password, email } = req.body;
  const result = await registerUserService(
    email,
    password,
    first_name,
    last_name,
  );

  return res
    .status(201)
    .cookie("token", result.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(201, result as any, "User registered successfully"));
});

export const userLogin = asyncHandler(async (req: Request, res: Response) => {
  const { password, email } = req.body;
  const result = await loginuserService(email, password);

  return res
    .status(200)
    .cookie("token", result.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, result as any, "User logged in successfully"));
});

export const userUserDelete = asyncHandler(
  async (req: Request<UserDeleteParams>, res: Response) => {
    const userIdFromToken = req.user!.id; 
    const userIdFromParams = req.params.userId;

    const result = await deletUserService(userIdFromToken, userIdFromParams);

    return res
      .status(204)
      .clearCookie("token")
      .json(new ApiResponse(204, result as any, "User deleted successfully"));
  },
);
