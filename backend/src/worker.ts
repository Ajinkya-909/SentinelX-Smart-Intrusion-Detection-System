import dotenv from "dotenv";
import { initializePrisma } from "./config/db";
import { initializeRedis } from "./config/redis";
import { initializeQueue } from "./queue";
import { startWorker } from "./workers/job.worker";
import { initializeRecoveryQueue } from "./queue/recovery-queue";

dotenv.config({
  path: "./.env",
});

const startWorkerProcess = async () => {
  try {
    // Initialize Prisma with smart database detection
    const prisma = await initializePrisma();
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Initialize Redis with smart URL detection
    try {
      await initializeRedis();
      // Initialize job queue after Redis is ready
      initializeQueue();
      // Initialize recovery queue after Redis is ready
      initializeRecoveryQueue();
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

    await startWorker();
    console.log("[WORKER] ✅ Main worker started and listening for jobs");

    console.log(
      "[WORKER] ✅ Recovery worker started and listening for failed jobs",
    );

    process.on("SIGINT", async () => {
      console.log("\n[WORKER] Shutting down gracefully...");
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Worker failed to start:", error);
    process.exit(1);
  }
};

startWorkerProcess();
