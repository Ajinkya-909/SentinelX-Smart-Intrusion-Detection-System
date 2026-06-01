import { createConnection } from "net";
import "dotenv/config";

/**
 * Check if a host:port is accepting TCP connections
 */
async function checkConnection(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({
      host,
      port,
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
 * Check connection with optional retries and delays
 */
async function checkConnectionWithRetry(
  host: string,
  port: number,
  retries = 5,
  delayMs = 2000
): Promise<boolean> {
  for (let i = 1; i <= retries; i++) {
    const isRunning = await checkConnection(host, port);
    if (isRunning) {
      return true;
    }
    if (i < retries) {
      console.log(
        `⏳ Connection to ${host}:${port} not ready yet. Retrying in ${delayMs / 1000}s... (Attempt ${i}/${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * Get the appropriate Redis connection URL based on availability
 * Priority:
 * 1. Docker Redis (if running)
 * 2. Upstash Redis (online)
 * 3. Default/Fallback Redis
 */
export async function getRedisUrl(): Promise<string> {
  const useDocker = process.env.USE_DOCKER === "true";
  const dockerUrl = process.env.DOCKER_REDIS_URL;
  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  const defaultUrl = process.env.DEFAULT_REDIS_URL;

  if (useDocker) {
    if (!dockerUrl) {
      throw new Error(
        "❌ USE_DOCKER is set to true, but DOCKER_REDIS_URL is not configured!"
      );
    }

    try {
      const urlObj = new URL(dockerUrl);
      const host = urlObj.hostname;
      const port = parseInt(urlObj.port || "6379", 10);

      console.log(`🔌 [DOCKER MODE] Verifying connection to Redis at ${host}:${port}...`);
      const isRunning = await checkConnectionWithRetry(host, port, 5, 2000);
      if (!isRunning) {
        throw new Error(`Could not establish connection to Redis at ${host}:${port} after 5 attempts.`);
      }

      console.log(`✅ [DOCKER MODE] Using Docker Redis at ${host}:${port}`);
      return dockerUrl;
    } catch (error: any) {
      throw new Error(
        `❌ Redis connection failed in docker-only mode: ${error.message}`
      );
    }
  }

  // Priority 1: Check if Docker Redis is running (fast check, no retries)
  if (dockerUrl) {
    try {
      const urlObj = new URL(dockerUrl);
      const host = urlObj.hostname;
      const port = parseInt(urlObj.port || "6379", 10);
      
      const isRunning = await checkConnection(host, port);
      if (isRunning) {
        console.log(`✅ Using Docker Redis at ${host}:${port}`);
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
    "No Redis URL configured! Set DOCKER_REDIS_URL, UPSTASH_REDIS_URL, or DEFAULT_REDIS_URL"
  );
}
