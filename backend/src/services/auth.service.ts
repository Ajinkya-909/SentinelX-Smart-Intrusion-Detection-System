import { userRepository } from "@/repositories";
import { CreateUserInput } from "@/types/db.types";
import { ApiError } from "@/utils/api-error";
import { asyncHandler } from "@/utils/async-handler";
import { generateJWTToken } from "@/utils/jwt";
import bcrypt from "bcrypt";
import { NextFunction } from "express";
import jwt from "jsonwebtoken";

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const registerUserService = async (
  email: string,
  password: string,
  first_name: string,
  last_name: string,
) => {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  const password_hash = await hashPassword(password);

  const user = await userRepository.create({
    email,
    password_hash,
    first_name,
    last_name,
  });

  const token = generateJWTToken(
    user.id,
    user.email!,
    user.first_name!,
    user.last_name!,
  );

  return {
    user: {
      id: user.id,
      email: user.email!,
      first_name: user.first_name!,
      last_name: user.last_name!,
    },
    token,
  };
};

export const loginuserService = async (email: string, password: string) => {
  const existingUser = await userRepository.findByEmailForAuth(email);
  if (!existingUser) {
    throw new ApiError(401, "Invalid login credentials");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    existingUser.password_hash,
  );
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid login credentials");
  }

  const token = generateJWTToken(
    existingUser.id,
    existingUser.email!,
    existingUser.first_name!,
    existingUser.last_name!,
  );

  return {
    user: {
      id: existingUser.id,
      email: existingUser.email!,
      first_name: existingUser.first_name!,
      last_name: existingUser.last_name!,
    },
    token,
  };
};

export const updateUserService = async (
  tokenUserId: string,
  userId: string,
  updateData: {
    first_name?: string;
    last_name?: string;
    current_password?: string;
    new_password?: string;
  },
) => {
  if (tokenUserId !== userId) {
    throw new ApiError(
      403,
      "Unauthorized: You can only update your own account",
    );
  }

  const existingUser = await userRepository.findById(userId);
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  // If updating password, validate current password
  if (updateData.new_password) {
    const isPasswordValid = await bcrypt.compare(
      updateData.current_password!,
      existingUser.password_hash,
    );
    if (!isPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }
  }

  // Prepare update data
  const updatePayload: any = {};
  if (updateData.first_name) {
    updatePayload.first_name = updateData.first_name;
  }
  if (updateData.last_name) {
    updatePayload.last_name = updateData.last_name;
  }
  if (updateData.new_password) {
    updatePayload.password_hash = await hashPassword(updateData.new_password);
  }

  const updatedUser = await userRepository.update(userId, updatePayload);

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email!,
      first_name: updatedUser.first_name!,
      last_name: updatedUser.last_name!,
    },
    message: "User information updated successfully",
  };
};

export const deletUserService = async (
  tokenUserId: string,
  paramUserId: string,
) => {
  if (tokenUserId !== paramUserId) {
    throw new ApiError(
      403,
      "Unauthorized: You can only delete your own account",
    );
  }

  const existingUser = await userRepository.findById(paramUserId);
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const deletedUser = await userRepository.delete(paramUserId);

  return {
    id: deletedUser.id,
    email: deletedUser.email,
    message: "Account deleted successfully",
  };
};
