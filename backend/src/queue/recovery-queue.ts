import { Queue, Worker } from "bullmq";
import { getRedis } from "../config/redis";
import { jobService } from "../services/jobs/job.service";

/**
 * FAILURE RECOVERY QUEUE
 * When a worker fails processing a job, push it here
 * Recovery queue reinserts job back to main queue with incremented retry_count
 * Main worker checks retry_count >= 2 and marks FAILED if exceeded
 */

let recoveryQueue: Queue | null = null;
let recoveryWorker: Worker | null = null;

/**
 * Initialize recovery queue and worker
 * Must be called after Redis is initialized
 */
export function initializeRecoveryQueue() {
  recoveryQueue = new Queue("recovery-queue", {
    connection: getRedis() as any,
    defaultJobOptions: {
      attempts: 1,
      backoff: {
        type: "fixed",
        delay: 5000, // Wait 5sec before retry
      },
    },
  });

  recoveryWorker = new Worker(
    "recovery-queue",
    async (job) => {
      const { jobId, filePath } = job.data;

      console.log(`[RECOVERY] 🔄 Requeuing job ${jobId}...`);

      try {
        // Increment retry count in DB
        await jobService.updateJobRetryCount(jobId);

        // Re-insert to main queue
        const { getJobQueue } = await import("./index");
        const mainQueue = getJobQueue();

        await mainQueue.add(
          "processLogs",
          {
            job_id: jobId,
            file_path: filePath,
            file_name: "",
          },
          {
            jobId: `${jobId}-retry`,
            attempts: 1,
            backoff: {
              type: "fixed",
              delay: 10000, // 10sec before retry
            },
          },
        );

        console.log(`[RECOVERY] ✅ Job ${jobId} requeued to main queue`);
      } catch (error) {
        console.error(`[RECOVERY] ❌ Failed to requeue job ${jobId}:`, error);
        throw error;
      }
    },
    { connection: getRedis() as any },
  );

  recoveryWorker.on("completed", (job) => {
    console.log(`[RECOVERY] ✅ Recovery job completed: ${job.id}`);
  });

  recoveryWorker.on("failed", (job, error) => {
    console.error(
      `[RECOVERY] ❌ Recovery job failed: ${job?.id}`,
      error.message,
    );
  });

  console.log("[RECOVERY] ✅ Recovery queue and worker initialized");
}

/**
 * Get recovery queue instance
 * Returns null if not initialized
 */
export function getRecoveryQueue(): Queue | null {
  return recoveryQueue;
}

/**
 * Get recovery worker instance
 * Returns null if not initialized
 */
export function getRecoveryWorker(): Worker | null {
  return recoveryWorker;
}

/**
 * Push a failed job to recovery queue
 */
export const pushToRecoveryQueue = async (
  jobId: string,
  filePath: string,
): Promise<void> => {
  if (!recoveryQueue) {
    console.warn(
      "[RECOVERY] ⚠️ Recovery queue not initialized, cannot push job",
    );
    return;
  }

  try {
    await recoveryQueue.add(
      "recover-job",
      { jobId, filePath },
      {
        jobId: `recovery-${jobId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    console.log(`[RECOVERY] 📤 Job ${jobId} pushed to recovery queue`);
  } catch (error) {
    console.error(`[RECOVERY] Error pushing job ${jobId} to recovery:`, error);
  }
};
