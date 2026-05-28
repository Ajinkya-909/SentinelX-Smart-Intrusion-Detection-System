import rateLimit from "express-rate-limit";
import { Request } from "express";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Job rate limiter - 2 requests per minute per user
export const jobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Maximum 2 job requests per minute
  message:
    "Too many job requests. You can request a maximum of 2 jobs per minute. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting if user is not authenticated
    return !req.user;
  },
});
