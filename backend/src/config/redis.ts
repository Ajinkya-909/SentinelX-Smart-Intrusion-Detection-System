import IORedis from "ioredis";
import { getRedisUrl } from "../utils/redisConnection";
import "dotenv/config";

let redis: IORedis | null = null;

/**
 * Initialize Redis connection with smart URL detection
 * This should be called once at application startup
 */
export const initializeRedis = async (): Promise<IORedis> => {
  if (redis) {
    return redis;
  }

  try {
    const redisUrl = await getRedisUrl();

    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis error:", err);
    });

    return redis;
  } catch (error) {
    console.error("❌ Failed to initialize Redis:", error);
    throw error;
  }
};

/**
 * Get the initialized Redis client
 * Make sure initializeRedis() has been called first
 */
export const getRedis = (): IORedis => {
  if (!redis) {
    throw new Error(
      "Redis not initialized! Call initializeRedis() first in your app startup.",
    );
  }
  return redis;
};
