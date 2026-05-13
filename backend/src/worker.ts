import dotenv from "dotenv";
import { prisma } from "./config/db";
import { startWorker } from "./workers/job.worker";

dotenv.config({
  path: "./.env",
});

const startWorkerProcess = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    await startWorker();

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
