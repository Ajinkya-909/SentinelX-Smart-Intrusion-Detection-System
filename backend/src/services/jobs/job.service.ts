import { jobRepository } from "@/repositories/job.repository";
import {
  Job,
  JobStatusEnum,
  JobStageEnum,
  JobOutcomeEnum,
} from "../../types/db.types";
import {
  JobUploadRequest,
  JobListResponse,
  getProgressByStage,
} from "../../types/job.types";
import { userRepository } from "@/repositories";
import { ApiError } from "@/utils/api-error";

const jobService = {
  async createJob(input: JobUploadRequest): Promise<Job> {
    const { user_id, file_path, file_size, file_name } = input;

    const existingUser = await userRepository.findById(user_id);
    if (!existingUser) {
      throw new ApiError(404, "User not found");
    }

    if (file_size > 100 * 1024 * 1024) {
      throw new ApiError(413, "File exceeds maximum size of 100MB");
    }

    if (!file_path) {
      throw new ApiError(400, "File path is required");
    }

    const job = await jobRepository.createJob({
      user_id,
      file_name,
      file_path,
      file_size,
    });

    return job;
  },

  async getJobById(jobId: string): Promise<Job | null> {
    const job = await jobRepository.getJobById(jobId);
    return job;
  },

  async getJobsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<JobListResponse> {
    const response = await jobRepository.getJobsByUserId(userId, limit, offset);
    return response;
  },

  async updateJobStatus(jobId: string, status: JobStatusEnum): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);

    if (!job) throw new ApiError(404, "Job not found");

    const updatedJob = await jobRepository.updateJob(jobId, { status });
    return updatedJob;
  },

  async updateJobStage(
    jobId: string,
    lastCompletedStage: JobStageEnum,
    progress?: number,
  ): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const updatedJob = await jobRepository.updateJob(jobId, {
      last_completed_stage: lastCompletedStage,
      progress: progress || getProgressByStage(lastCompletedStage),
    });
    return updatedJob;
  },

  async markJobFailed(jobId: string, errorMessage: string): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const updatedJob = await jobRepository.updateJob(jobId, {
      status: JobStatusEnum.FAILED,
      error_message: errorMessage,
    });
    return updatedJob;
  },

  async markJobCompleted(jobId: string): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const updatedJob = await jobRepository.updateJob(jobId, {
      status: JobStatusEnum.COMPLETED,
      last_completed_stage: JobStageEnum.INSIGHTS_GENERATED,
    });
    return updatedJob;
  },

  async incrementRetryCount(jobId: string): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const updatedJob = await jobRepository.updateJob(jobId, {
      retry_count: (job.retry_count || 0) + 1,
    });
    return updatedJob;
  },

  async deleteJob(jobId: string): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const deletedJob = await jobRepository.deleteJob(jobId);
    return deletedJob;
  },

  async markJobCompletedWithOutcome(
    jobId: string,
    outcome: JobOutcomeEnum,
  ): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const updatedJob = await jobRepository.updateJob(jobId, {
      status: JobStatusEnum.COMPLETED,
      outcome: outcome,
      last_completed_stage: JobStageEnum.INSIGHTS_GENERATED,
    });
    return updatedJob;
  },
};

export { jobService };
