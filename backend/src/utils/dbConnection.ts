import { createConnection } from "net";
import "dotenv/config";

/**
 * Check if Docker PostgreSQL is running by attempting a connection
 * to localhost:5432 with a 2-second timeout
 */
async function isDockerPostgresRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({
      host: "localhost",
      port: 5432,
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
 * Get the appropriate database connection string based on availability
 * Priority:
 * 1. Docker PostgreSQL (if running)
 * 2. Neon Online PostgreSQL
 * 3. Default/Fallback connection
 */
export async function getDatabaseUrl(): Promise<string> {
  const dockerUrl = process.env.DOCKER_DATABASE_URL;
  const neonUrl = process.env.NEON_DATABASE_URL;
  const defaultUrl = process.env.DEFAULT_DATABASE_URL;

  // Priority 1: Check if Docker is running
  if (dockerUrl) {
    try {
      const isRunning = await isDockerPostgresRunning();
      if (isRunning) {
        console.log("✅ Using Docker PostgreSQL");
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
    "No database URL configured! Set DOCKER_DATABASE_URL, NEON_DATABASE_URL, or DEFAULT_DATABASE_URL",
  );
}
