import jwt from "jsonwebtoken";
import { userRepository } from "@/repositories";
import { ApiError } from "@/utils/api-error";

export const generateJWTToken = (
  id: string,
  email: string,
  first_name: string,
  last_name: string,
): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  const token = jwt.sign({ id, first_name, last_name, email }, secret, {
    expiresIn: "5d",
  });
  return token;
};

export const verifyToken = async (token: string) => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    const decodedToken = jwt.verify(token, secret) as { id: string };
    const user = await userRepository.findById(decodedToken.id);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // Return only safe fields (no password_hash, created_at, updated_at)
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
};
