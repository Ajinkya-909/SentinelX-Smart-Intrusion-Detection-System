import jwt from "jsonwebtoken";
import { userRepository } from "@/repositories";
import { ApiError } from "@/utils/api-error";

export const generateJWTToken = (
  id: string,
  email: string,
  first_name: string,
  last_name: string,
): string => {
  const token = jwt.sign(
    { id, first_name, last_name, email },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "5d" },
  );
  return token;
};

export const verifyToken = async (token: string) => {
  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { id: string };
    const user = await userRepository.findById(decodedToken.id);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    return user;
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
};
