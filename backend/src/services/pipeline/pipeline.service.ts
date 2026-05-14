import { jobService } from "../jobs/job.service";
import { executeOrchestrator } from "@/pipeline/orchestrator";
import { JobStatusEnum, JobStageEnum } from "../../types/db.types";
import { ApiError } from "../../utils/api-error";

export const pipelineService = {
  async run(jobId: string): Promise<void> {
    console.log(
      `[PIPELINE SERVICE] Starting pipeline execution for job ${jobId}`,
    );

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

      await jobService.updateJobStage(jobId, JobStageEnum.INSIGHTS, 100);
      await jobService.markJobCompleted(jobId);

      console.log(`[PIPELINE SERVICE] Job ${jobId} marked as COMPLETED`);
    } catch (error) {
      console.error(
        `[PIPELINE SERVICE ERROR] Pipeline failed for job ${jobId}:`,
        error,
      );

      try {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown pipeline error";
        await jobService.markJobFailed(jobId, errorMessage);
        console.log(`[PIPELINE SERVICE] Job ${jobId} marked as FAILED`);
      } catch (markError) {
        console.error(
          `[PIPELINE SERVICE ERROR] Failed to mark job as failed:`,
          markError,
        );
      }

      throw error;
    }
  },
};
