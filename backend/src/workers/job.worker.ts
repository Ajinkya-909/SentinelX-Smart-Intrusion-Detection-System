import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { jobService } from "../services/jobs/job.service";
import { pipelineService } from "../services/pipeline/pipeline.service";
import { QueuedJobPayload } from "../types/queue.types";
import { JobStatusEnum } from "../types/db.types";

export const startWorker = async () => {
  const worker = new Worker<QueuedJobPayload>(
    "sentinelx-main-queue",
    async (job: Job<QueuedJobPayload>) => {
      const payload: QueuedJobPayload = job.data;

      console.log(`\n[JOB] 📨 Processing: ${payload.file_name}`);

      try {
        const jobRecord = await jobService.getJobById(payload.job_id);

        if (!jobRecord) {
          throw new Error(`Job ${payload.job_id} not found in database`);
        }

        // Update job status to PROCESSING
        await jobService.updateJobStatus(
          payload.job_id,
          JobStatusEnum.PROCESSING,
        );

        // Execute pipeline (handles all stages)
        await pipelineService.run(payload.job_id);

        console.log(`[JOB] ✅ Completed: ${payload.job_id}\n`);

        return {
          success: true,
          jobId: payload.job_id,
          message: "Job pipeline execution completed",
        };
      } catch (error) {
        console.error(
          `[JOB ERROR] ❌ Failed: ${error instanceof Error ? error.message : error}`,
        );

        try {
          await jobService.markJobFailed(
            payload.job_id,
            error instanceof Error ? error.message : "Unknown error",
          );
        } catch (markError) {
          console.error("[JOB ERROR] Failed to mark job as failed");
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

  console.log("[WORKER] ✅ Initialized and listening...");
};
