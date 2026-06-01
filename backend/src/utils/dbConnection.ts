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
 * Get the appropriate database connection string based on availability
 * Priority:
 * 1. Docker PostgreSQL (if running)
 * 2. Neon Online PostgreSQL
 * 3. Default/Fallback connection
 */
export async function getDatabaseUrl(): Promise<string> {
  const useDocker = process.env.USE_DOCKER === "true";
  const dockerUrl = process.env.DOCKER_DATABASE_URL;
  const neonUrl = process.env.NEON_DATABASE_URL;
  const defaultUrl = process.env.DEFAULT_DATABASE_URL;

  if (useDocker) {
    if (!dockerUrl) {
      throw new Error(
        "❌ USE_DOCKER is set to true, but DOCKER_DATABASE_URL is not configured!"
      );
    }

    try {
      const urlObj = new URL(dockerUrl);
      const host = urlObj.hostname;
      const port = parseInt(urlObj.port || "5432", 10);

      console.log(`🔌 [DOCKER MODE] Verifying connection to PostgreSQL at ${host}:${port}...`);
      const isRunning = await checkConnectionWithRetry(host, port, 5, 2000);
      if (!isRunning) {
        throw new Error(`Could not establish connection to PostgreSQL at ${host}:${port} after 5 attempts.`);
      }

      console.log(`✅ [DOCKER MODE] Using Docker PostgreSQL at ${host}:${port}`);
      return dockerUrl;
    } catch (error: any) {
      throw new Error(
        `❌ Database connection failed in docker-only mode: ${error.message}`
      );
    }
  }

  // Priority 1: Check if Docker is running (fast check, no retries)
  if (dockerUrl) {
    try {
      const urlObj = new URL(dockerUrl);
      const host = urlObj.hostname;
      const port = parseInt(urlObj.port || "5432", 10);
      
      const isRunning = await checkConnection(host, port);
      if (isRunning) {
        console.log(`✅ Using Docker PostgreSQL at ${host}:${port}`);
        return dockerUrl;
      }
    } catch (error) {
      console.log("⚠️  Docker check failed, trying Neon");
    }
  }

  // Priority 2: Use Neon if available
  if (neonUrl) {
    console.log("🌐 Using Neon Online PostgreSQL");
    return neonUrl;
  }

  // Priority 3: Use default
  if (defaultUrl) {
    console.log("📋 Using Default PostgreSQL");
    return defaultUrl;
  }

  throw new Error(
    "No database URL configured! Set DOCKER_DATABASE_URL, NEON_DATABASE_URL, or DEFAULT_DATABASE_URL"
  );
}
