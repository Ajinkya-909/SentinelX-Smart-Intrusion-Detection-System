import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { registerUserService } from "@/services/auth.service";
import { ApiResponse } from "@/utils/api-response";

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
      maxAge: 5 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(201, result as any, "User registered successfully"));
});
