import dotenv from "dotenv";
import app from "./app";
import { initializePrisma } from "./config/db";
import { initializeRedis } from "./config/redis";
import { initializeQueue } from "./queue";
import { initializeRecoveryQueue } from "./queue/recovery-queue";
import { startWorker } from "./workers/job.worker";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize Prisma with smart database detection
    const prisma = await initializePrisma();

    // Test the connection
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");

    // Initialize Redis with smart URL detection
    try {
      await initializeRedis();
      // Initialize job queue after Redis is ready
      initializeQueue();

      // Start inline worker unless explicitly using a separate worker process
      // In cloud environments like Railway without shared volumes, this ensures
      // the worker has access to the local uploaded files in /app/storage
      const shouldRunWorker =
        process.env.SEPARATE_WORKER !== "true" &&
        process.env.ENABLE_INLINE_WORKER !== "false";

      if (shouldRunWorker) {
        initializeRecoveryQueue();
        await startWorker();
        console.log("[WORKER] ✅ Inline worker initialized and listening for jobs");
      }
    } catch (error) {
      if (process.env.USE_DOCKER === "true") {
        console.error("❌ Redis initialization failed in docker-only mode:", error);
        throw error;
      }
      console.warn(
        "⚠️  Redis initialization failed, continuing without Redis:",
        error,
      );
    }

    app.listen(port, () => {
      console.log(`🚀 App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
