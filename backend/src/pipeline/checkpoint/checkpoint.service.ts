import { prisma } from "../../config/db";
import { JobStageEnum } from "../../types/db.types";

/**
 * Simple checkpoint service - tracks which stage a job last completed
 * Allows pipeline to resume from last checkpoint instead of restarting
 */

export const checkpointService = {
  /**
   * Get the last completed stage for a job
   */
  async getLastCompletedStage(jobId: string): Promise<JobStageEnum | null> {
    try {
      const job = await prisma.jobs.findUnique({
        where: { id: jobId },
        select: { last_completed_stage: true },
      });
      return job?.last_completed_stage as JobStageEnum | null;
    } catch (error) {
      console.error(
        `[CHECKPOINT] Error reading last stage for job ${jobId}:`,
        error,
      );
      return null;
    }
  },

  /**
   * Update the last completed stage checkpoint
   */
  async markStageComplete(
    jobId: string,
    stage: JobStageEnum,
  ): Promise<boolean> {
    try {
      await prisma.jobs.update({
        where: { id: jobId },
        data: {
          last_completed_stage: stage,
        },
      });
      console.log(
        `[CHECKPOINT] ✅ Job ${jobId} marked complete at stage: ${stage}`,
      );
      return true;
    } catch (error) {
      console.error(
        `[CHECKPOINT] Error updating stage for job ${jobId}:`,
        error,
      );
      return false;
    }
  },

  /**
   * Clear checkpoint data when reanalyzing
   * Resets to NORMALIZED so pipeline starts from ANALYZED stage
   */
  async resetToNormalizedForReanalysis(jobId: string): Promise<boolean> {
    try {
      await prisma.jobs.update({
        where: { id: jobId },
        data: {
          last_completed_stage: JobStageEnum.NORMALIZED,
        },
      });
      console.log(
        `[CHECKPOINT] 🔄 Job ${jobId} reset to NORMALIZED for reanalysis`,
      );
      return true;
    } catch (error) {
      console.error(
        `[CHECKPOINT] Error resetting job ${jobId} for reanalysis:`,
        error,
      );
      return false;
    }
  },

  /**
   * Clear all checkpoint data for a fresh start
   */
  async resetCheckpoint(jobId: string): Promise<boolean> {
    try {
      await prisma.jobs.update({
        where: { id: jobId },
        data: {
          last_completed_stage: null,
        },
      });
      console.log(`[CHECKPOINT] 🔄 Job ${jobId} checkpoint cleared`);
      return true;
    } catch (error) {
      console.error(
        `[CHECKPOINT] Error clearing checkpoint for job ${jobId}:`,
        error,
      );
      return false;
    }
  },
};
