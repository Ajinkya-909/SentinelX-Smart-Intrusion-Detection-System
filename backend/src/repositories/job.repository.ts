import { prisma } from "../config/db";
import {
  Job,
  JobStatusEnum,
  JobStageEnum,
  JobOutcomeEnum,
} from "../types/db.types";
import {
  JobUploadRequest,
  JobUpdateInput,
  JobListResponse,
} from "../types/job.types";

const jobRepository = {
  /**
   * Create a new job from file upload
   * @param input - JobUploadRequest containing file metadata and user_id
   * @returns - The created Job with auto-generated id, timestamps, default status=UPLOADED, progress=0
   */
  async createJob(input: JobUploadRequest): Promise<Job> {
    const job = await prisma.jobs.create({
      data: {
        user_id: input.user_id,
        file_name: input.file_name,
        file_path: input.file_path,
        file_size: input.file_size,
      },
    });
    return job as Job;
  },

  /**
   * Fetch a single job by ID
   * @param jobId - UUID of the job
   * @returns - Job object if found, null otherwise
   */
  async getJobById(jobId: string): Promise<Job | null> {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
    });
    return job as Job | null;
  },

  /**
   * Fetch all jobs for a specific user with pagination
   * @param userId - UUID of the user
   * @param limit - Maximum number of jobs to return (optional)
   * @param offset - Number of jobs to skip (optional)
   * @returns - Paginated list of jobs with total count
   */
  async getJobsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<JobListResponse> {
    const pageSize = limit || 10;
    const pageOffset = offset || 0;

    const [jobs, total_count] = await Promise.all([
      prisma.jobs.findMany({
        where: { user_id: userId },
        take: pageSize,
        skip: pageOffset,
      }),
      prisma.jobs.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      jobs: jobs as Job[],
      total_count,
      limit: pageSize,
      offset: pageOffset,
    };
  },

  /**
   * Update job with only the provided fields
   * Used by pipeline at each stage to update: status, lastCompletedStage, progress, outcome, error_message, retry_count
   * @param jobId - UUID of the job to update
   * @param updates - Partial Job object with only fields to update
   * @returns - The updated full Job object
   */
  async updateJob(jobId: string, updates: JobUpdateInput): Promise<Job> {
    const newJob = await prisma.jobs.update({
      where: { id: jobId },
      data: updates,
    });
    return newJob as Job;
  },

  /**
   * Delete a job by ID
   * @param jobId - UUID of the job to delete
   * @returns - The deleted Job object
   */
  async deleteJob(jobId: string): Promise<Job> {
    const deletedJob = await prisma.jobs.delete({
      where: { id: jobId },
    });
    return deletedJob as Job;
  },
};

export { jobRepository };
