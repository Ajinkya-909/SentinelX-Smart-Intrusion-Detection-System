import { userRepository } from "@/repositories";
import { CreateUserInput } from "@/types/db.types";
import { ApiError } from "@/utils/api-error";
import { asyncHandler } from "@/utils/async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateJWTToken = (
  userId: string,
  email: string,
  first_name: string,
  last_name: string,
): string => {
  const token = jwt.sign(
    { userId, first_name, last_name, email },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "5d" },
  );
  return token;
};

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
