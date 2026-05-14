import { ApiError } from "@/utils/api-error";
import { fileService } from "../files/file.service";
import { jobService } from "./job.service";
import { JobUploadRequest } from "@/types/job.types";
import { Job } from "@/types/db.types";
import { enqueueJob } from "@/queue/job.queue";

const uploadService = {
  async uploadAndCreateJob(
    file: Express.Multer.File,
    userId: string,
  ): Promise<Job> {
    const savedFile = await fileService.checkFile(file);

    let job: Job;
    try {
      job = await jobService.createJob({
        user_id: userId,
        file_path: savedFile.path,
        file_name: savedFile.originalName,
        file_size: BigInt(savedFile.size),
      });
    } catch (error) {
      console.error("Job creation failed, cleaning up uploaded file...", error);
      try {
        await fileService.deleteFile(savedFile.path);
      } catch (deleteError) {
        console.error(
          "Failed to cleanup file after job creation error",
          deleteError,
        );
      }

      throw new ApiError(500, "Failed to create job after file upload");
    }

    try {
      await enqueueJob({
        job_id: job.id,
        user_id: userId,
        file_path: job.file_path,
        file_name: job.file_name,
        last_completed_stage: job.last_completed_stage,
        retry_count: job.retry_count || 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        "Failed to enqueue job after creation, cleaning up...",
        error,
      );
      try {
        await fileService.deleteFile(savedFile.path);
      } catch (deleteError) {
        console.error("Failed to cleanup file after queue error", deleteError);
      }

      // Delete the orphaned job row
      try {
        await jobService.deleteJob(job.id);
      } catch (deleteJobError) {
        console.error(
          "Failed to cleanup job record after queue error",
          deleteJobError,
        );
      }

      throw new ApiError(500, "Failed to queue job for processing");
    }

    return job;
  },

  async getFileForProcessing(jobId: string): Promise<string> {
    return await fileService.getFilePath(jobId);
  },

  async cleanupFailedUpload(filePath: string, jobId: string): Promise<void> {
    try {
      const exists = await fileService.fileExists(filePath);
      if (exists) {
        await fileService.deleteFile(filePath);
        console.log(`Cleaned up failed upload: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup file for job ${jobId}`, error);
      // Still throw so caller knows cleanup failed
      throw error;
    }
  },
};

export { uploadService };
