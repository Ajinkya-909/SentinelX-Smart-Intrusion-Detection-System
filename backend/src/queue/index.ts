import { Queue } from "bullmq";
import { getRedis } from "../config/redis";

let jobQueue: Queue | null = null;

/**
 * Initialize the job queue - call after Redis is initialized
 */
export const initializeQueue = (): Queue => {
  if (jobQueue) {
    return jobQueue;
  }

  jobQueue = new Queue("sentinelx-main-queue", {
    connection: getRedis(),
  });

  return jobQueue;
};

/**
 * Get the initialized job queue
 */
export const getJobQueue = (): Queue => {
  if (!jobQueue) {
    throw new Error(
      "Job queue not initialized! Call initializeQueue() after Redis is ready.",
    );
  }
  return jobQueue;
};
