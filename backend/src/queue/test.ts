/**
 * Complete Queue Test
 * Single file that shows:
 * 1. Jobs being added
 * 2. Jobs being picked up by worker
 * 3. Jobs being processed through stages
 * 4. Jobs being completed
 * 
 * Run: npx ts-node src/queue/test.ts
 */

import { jobQueue } from "./index";
import { QueueEvents } from "bullmq";
import { Worker } from "bullmq";
import { getRedis } from "../config/redis";
import { processJob } from "./job";

async function runTest() {
  console.log("\n========================================");
  console.log("   🚀 Queue System Test Started");
  console.log("========================================\n");

  // ===== SETUP QUEUE EVENTS =====
  const queueEvents = new QueueEvents("sentinelx-main-queue", {
    connection: getRedis(),
  });

  // ===== QUEUE EVENT LISTENERS =====
  queueEvents.on("waiting", ({ jobId }) => {
    console.log(`📥 [QUEUE] Job waiting: ${jobId}`);
  });

  queueEvents.on("active", ({ jobId, prev }) => {
    console.log(
      `🔄 [QUEUE] Job activated: ${jobId} (previous status: ${prev})`
    );
  });

  queueEvents.on("completed", ({ jobId, returnvalue }) => {
    console.log(`✔️  [QUEUE] Job completed: ${jobId}`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ [QUEUE] Job failed: ${jobId} - ${failedReason}`);
  });

  queueEvents.on("progress", ({ jobId, data }) => {
    console.log(`⏳ [QUEUE] Job progress: ${jobId} - ${JSON.stringify(data)}`);
  });

  // ===== SETUP WORKER =====
  const worker = new Worker(
    "sentinelx-main-queue",
    async (job) => {
      console.log(
        `\n⚙️  [WORKER] Processing job: ${job.data.jobId} (Queue ID: ${job.id})`
      );
      await processJob(job.data);
      console.log(`✅ [WORKER] Job ${job.data.jobId} completed!\n`);
    },
    {
      connection: getRedis(),
    }
  );

  // ===== WORKER EVENT LISTENERS =====
  worker.on("completed", (job) => {
    console.log(`👷 [WORKER] Finished: ${job.data.jobId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `👷 [WORKER] Failed to process ${job?.data.jobId}: ${err.message}`
    );
  });

  // ===== ADD JOBS =====
  console.log("📤 Adding jobs to queue...\n");

  const jobs = [
    {
      jobId: "job-001",
      fileName: "access.log",
      filePath: "/uploads/access.log",
    },
    { jobId: "job-002", fileName: "error.log", filePath: "/uploads/error.log" },
    {
      jobId: "job-003",
      fileName: "security.log",
      filePath: "/uploads/security.log",
    },
  ];

  for (const job of jobs) {
    await jobQueue.add("process-log", job);
  }

  // ===== WAIT FOR PROCESSING =====
  console.log("\n⏳ Waiting for all jobs to complete...\n");

  // Check when all jobs are done
  let processed = 0;
  const totalJobs = jobs.length;

  // Wait for jobs to be processed
  worker.on("completed", () => {
    processed++;
    if (processed === totalJobs) {
      console.log("\n========================================");
      console.log("   ✅ All Jobs Processed Successfully!");
      console.log("========================================\n");

      // Cleanup
      setTimeout(async () => {
        await worker.close();
        await queueEvents.close();
        await jobQueue.close();
        process.exit(0);
      }, 1000);
    }
  });
}

// Run the test
runTest().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
