import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { jobService } from "../services/jobs/job.service";
import { QueuedJobPayload } from "../types/queue.types";
import { JobStatusEnum } from "../types/db.types";

export const startWorker = async () => {
  const worker = new Worker<QueuedJobPayload>(
    "sentinelx-main-queue",
    async (job: Job<QueuedJobPayload>) => {
      const payload: QueuedJobPayload = job.data;

      console.log(
        `[WORKER] Processing job: ${payload.job_id} (User: ${payload.user_id})`,
      );

      try {
        const jobRecord = await jobService.getJobById(payload.job_id);

        if (!jobRecord) {
          throw new Error(`Job ${payload.job_id} not found in database`);
        }

        console.log(
          `[WORKER] Job status: ${jobRecord.status}, Last stage: ${jobRecord.last_completed_stage}`,
        );

        await jobService.updateJobStatus(
          payload.job_id,
          JobStatusEnum.PROCESSING,
        );

        console.log(
          `[WORKER] Job ${payload.job_id} marked as PROCESSING. Ready for pipeline execution.`,
        );

        return {
          success: true,
          jobId: payload.job_id,
          message: "Job ready for pipeline",
        };
      } catch (error) {
        console.error(
          `[WORKER ERROR] Failed to process job ${payload.job_id}:`,
          error,
        );

        try {
          await jobService.markJobFailed(
            payload.job_id,
            error instanceof Error ? error.message : "Unknown error",
          );
        } catch (markError) {
          console.error(
            `[WORKER ERROR] Failed to mark job as failed:`,
            markError,
          );
        }

        throw error;
      }
    },
    {
      connection: getRedis(),
    },
  );

  worker.on("error", (err) => {
    console.error("[WORKER ERROR]", err);
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(`[WORKER] Job ${job.id} failed:`, err?.message);
    }
  });

  worker.on("completed", (job) => {
    console.log(`[WORKER] Job ${job.id} completed`);
  });

  console.log("[WORKER] Started and listening for jobs...");
};
