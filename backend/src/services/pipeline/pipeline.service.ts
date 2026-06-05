import { jobService } from "../jobs/job.service";
import { executeOrchestrator } from "@/pipeline/orchestrator-simple";
import { JobStatusEnum } from "../../types/db.types";
import { ApiError } from "../../utils/api-error";

export const pipelineService = {
  async run(jobId: string): Promise<void> {
    try {
      const job = await jobService.getJobById(jobId);
      if (!job) {
        throw new ApiError(404, `Job ${jobId} not found`);
      }

      if (job.status !== JobStatusEnum.PROCESSING) {
        throw new ApiError(
          400,
          `Job must be in PROCESSING state. Current: ${job.status}`,
        );
      }

      await executeOrchestrator(jobId, job.file_path);
    } catch (error) {
      // FIX: Do NOT mark the job as FAILED here. The worker (job.worker.ts)
      // is the single authority that decides whether to retry or mark FAILED.
      // Previously, markJobFailed() here would set status=FAILED before the
      // worker's retry logic could evaluate retry_count, breaking recovery.
      const errorMessage =
        error instanceof Error ? error.message : "Unknown pipeline error";
      console.error(`[PIPELINE SERVICE] Pipeline error for job ${jobId}: ${errorMessage}`);

      throw error;
    }
  },
};
