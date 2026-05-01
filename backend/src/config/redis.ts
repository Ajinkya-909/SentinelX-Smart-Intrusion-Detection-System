import IORedis from "ioredis";

let redis: IORedis | null = null;

export const getRedis = () => {
  if (!redis) {
    redis = new IORedis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });

    redis.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  return redis;
};