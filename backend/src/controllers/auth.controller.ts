import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import {
  deleteUserService,
  loginuserService,
  registerUserService,
  updateUserService,
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
    .json(new ApiResponse(201, result, "User registered successfully"));
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
    .json(new ApiResponse(200, result, "User logged in successfully"));
});

export const userUserDelete = asyncHandler(
  async (req: Request<UserDeleteParams>, res: Response) => {
    const userIdFromToken = req.user!.id;
    const userIdFromParams = req.params.userId;

    const result = await deleteUserService(userIdFromToken, userIdFromParams);

    return res
      .status(200)
      .clearCookie("token")
      .json(new ApiResponse(200, result, "User deleted successfully"));
  },
);

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user!;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        "User data retrieved successfully",
      ),
    );
  },
);

export const userLogout = asyncHandler(async (req: Request, res: Response) => {
  return res
    .status(200)
    .clearCookie("token")
    .json(
      new ApiResponse(200, { success: true }, "User logged out successfully"),
    );
});

export const userUpdate = asyncHandler(
  async (req: Request<{ userId: string }>, res: Response) => {
    const userIdFromToken = req.user!.id;
    const userIdFromParams = req.params.userId;
    const { first_name, last_name, current_password, new_password } = req.body;

    const result = await updateUserService(userIdFromToken, userIdFromParams, {
      first_name,
      last_name,
      current_password,
      new_password,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result.user, result.message));
  },
);
