import { createConnection } from "net";
import "dotenv/config";

/**
 * Check if Docker Redis is running on localhost:6379
 */
async function isDockerRedisRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({
      host: "localhost",
      port: 6379,
      timeout: 2000,
    });

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => {
      resolve(false);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Get the appropriate Redis connection URL based on availability
 * Priority:
 * 1. Docker Redis (if running on localhost:6379)
 * 2. Upstash Redis (online)
 * 3. Default/Fallback Redis
 */
export async function getRedisUrl(): Promise<string> {
  const dockerUrl = process.env.DOCKER_REDIS_URL;
  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  const defaultUrl = process.env.DEFAULT_REDIS_URL;

  // Priority 1: Check if Docker Redis is running
  if (dockerUrl) {
    try {
      const isRunning = await isDockerRedisRunning();
      if (isRunning) {
        console.log("✅ Using Docker Redis");
        return dockerUrl;
      }
    } catch (error) {
      console.log("⚠️  Docker Redis check failed, trying Upstash");
    }
  }

  // Priority 2: Use Upstash if available
  if (upstashUrl) {
    console.log("☁️ Using Upstash Redis");
    return upstashUrl;
  }

  // Priority 3: Use default
  if (defaultUrl) {
    console.log("📋 Using Default Redis");
    return defaultUrl;
  }

  throw new Error(
    "No Redis URL configured! Set DOCKER_REDIS_URL, UPSTASH_REDIS_URL, or DEFAULT_REDIS_URL",
  );
}
