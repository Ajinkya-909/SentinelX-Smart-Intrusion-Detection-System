import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { jobService } from "../services/jobs/job.service";
import { pipelineService } from "../services/pipeline/pipeline.service";
import { pushToRecoveryQueue } from "../queue/recovery-queue";
import { QueuedJobPayload } from "../types/queue.types";
import { JobStatusEnum } from "../types/db.types";

export const startWorker = async () => {
  const worker = new Worker<QueuedJobPayload>(
    "sentinelx-main-queue",
    async (job: Job<QueuedJobPayload>) => {
      const payload: QueuedJobPayload = job.data;
      let jobRecord: any = null;

      console.log(`\n[JOB] 📨 Processing: ${payload.file_name}`);

      try {
        jobRecord = await jobService.getJobById(payload.job_id);

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

        // Check retry count from DB
        const currentRetryCount = jobRecord?.retry_count || 0;

        if (currentRetryCount >= 2) {
          // Max retries reached - mark as FAILED
          console.error(
            `[JOB ERROR] ❌ Job ${payload.job_id} failed after 2 retries. Marking as FAILED.`,
          );
          await jobService.updateJobStatus(
            payload.job_id,
            JobStatusEnum.FAILED,
          );
        } else {
          // Retry available - push to recovery queue
          try {
            console.log(
              `[JOB ERROR] 🔄 Job ${payload.job_id} retry #${currentRetryCount + 1}/2. Queuing for retry...`,
            );
            await pushToRecoveryQueue(
              payload.job_id,
              jobRecord?.file_path || "",
            );
          } catch (recoveryError) {
            console.error(`[JOB ERROR] Failed to queue retry:`, recoveryError);
            await jobService.updateJobStatus(
              payload.job_id,
              JobStatusEnum.FAILED,
            );
          }
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
