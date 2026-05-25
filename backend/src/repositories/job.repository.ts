import { prisma } from "../config/db";
import {
  Job,
  JobStatusEnum,
  JobStageEnum,
  JobOutcomeEnum,
  DetectionResult,
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

  /**
   * Update job with type detection metadata
   * Called from typeDetectorService after detecting log format
   * @param jobId - UUID of the job
   * @param metadata - DetectionResult containing detected type, parser, confidence, encoding
   * @returns - The updated Job object
   */
  async updateDetectionMetadata(
    jobId: string,
    metadata: DetectionResult,
  ): Promise<Job> {
    const updatedJob = await prisma.jobs.update({
      where: { id: jobId },
      data: {
        processing_metadata: metadata as unknown as any,
        last_completed_stage: JobStageEnum.TYPE_DETECTED,
      },
    });
    return updatedJob as Job;
  },

  /**
   * Fetch type detection metadata for a job
   * Called from parserService to get detected log type and parser strategy
   * @param jobId - UUID of the job
   * @returns - DetectionResult if exists, null otherwise
   */
  async getDetectionMetadata(jobId: string): Promise<DetectionResult | null> {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      select: { processing_metadata: true },
    });
    return (job?.processing_metadata as unknown as DetectionResult) || null;
  },

  /**
   * Prepare job for reanalysis
   * Resets checkpoint to NORMALIZED and clears old findings/insights
   * @param jobId - UUID of the job
   * @returns - The updated Job object
   */
  async prepareForReanalysis(jobId: string): Promise<Job> {
    // Use transaction to ensure all-or-nothing
    const [updatedJob] = await prisma.$transaction([
      // Reset checkpoint to NORMALIZED
      prisma.jobs.update({
        where: { id: jobId },
        data: {
          last_completed_stage: JobStageEnum.NORMALIZED,
          retry_count: 0, // Reset retries for fresh analysis
        },
      }),
      // Delete old analyzer findings
      prisma.analyzer_findings.deleteMany({
        where: { job_id: jobId },
      }),
      // Delete old insights
      prisma.insights.deleteMany({
        where: { job_id: jobId },
      }),
    ]);

    return updatedJob as Job;
  },
};

export { jobRepository };
