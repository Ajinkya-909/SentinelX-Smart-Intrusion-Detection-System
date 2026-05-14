/**
 * Pipeline Service
 * Entry point for pipeline execution
 * Manages job state, orchestrator execution, and DB updates
 */

import { jobService } from "../jobs/job.service";
import { executeOrchestrator } from "@/pipeline/orchestrator";
import { JobStatusEnum, JobStageEnum } from "../../types/db.types";
import { ApiError } from "../../utils/api-error";

export const pipelineService = {
  /**
   * Main pipeline entry point
   * Called from worker to start processing a job
   * 
   * Execution flow:
   * 1. Fetch job from DB
   * 2. Execute orchestrator (all stages)
   * 3. Update job status/stage/progress after each stage
   * 4. Mark job COMPLETED on success
   * 5. Mark job FAILED on error
   */
  async run(jobId: string): Promise<void> {
    console.log(`[PIPELINE SERVICE] Starting pipeline execution for job ${jobId}`);

    try {
      // ========== FETCH JOB ==========
      const job = await jobService.getJobById(jobId);
      if (!job) {
        throw new ApiError(404, `Job ${jobId} not found`);
      }

      console.log(`[PIPELINE SERVICE] Job found: ${job.file_name} (${job.file_path})`);

      // ========== VALIDATE JOB STATE ==========
      if (job.status !== JobStatusEnum.PROCESSING) {
        throw new ApiError(
          400,
          `Job must be in PROCESSING state. Current: ${job.status}`,
        );
      }

      // ========== EXECUTE ORCHESTRATOR ==========
      // This runs all pipeline stages in sequence
      const result = await executeOrchestrator(jobId, job.file_path);

      // ========== UPDATE JOB: COMPLETION ==========
      console.log(`[PIPELINE SERVICE] Orchestrator completed for job ${jobId}`);
      
      // Mark job as COMPLETED and set final stage
      await jobService.updateJobStage(
        jobId,
        JobStageEnum.INSIGHTS,
        100, // 100% progress
      );

      await jobService.markJobCompleted(jobId);

      console.log(
        `[PIPELINE SERVICE] Job ${jobId} marked as COMPLETED`,
      );
    } catch (error) {
      // ========== ERROR HANDLING ==========
      console.error(
        `[PIPELINE SERVICE ERROR] Pipeline failed for job ${jobId}:`,
        error,
      );

      try {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown pipeline error";
        
        // Mark job as FAILED
        await jobService.markJobFailed(jobId, errorMessage);
        
        console.log(
          `[PIPELINE SERVICE] Job ${jobId} marked as FAILED`,
        );
      } catch (markError) {
        console.error(
          `[PIPELINE SERVICE ERROR] Failed to mark job as failed:`,
          markError,
        );
      }

      // Re-throw for caller (worker) to handle
      throw error;
    }
  },
};
