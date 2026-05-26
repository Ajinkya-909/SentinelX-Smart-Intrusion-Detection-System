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

  async updateJobRetryCount(jobId: string): Promise<Job> {
    const job = await jobRepository.getJobById(jobId);
    if (!job) throw new ApiError(404, "Job not found");

    const newRetryCount = (job.retry_count || 0) + 1;
    const updatedJob = await jobRepository.updateJob(jobId, {
      retry_count: newRetryCount,
    });
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

  async reanalyzeJob(jobId: string): Promise<Job> {
    // Get job and verify it exists
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    // Verify job has normalized logs (can't reanalyze if not normalized yet)
    // This check will be done in controller, but adding for safety

    // Prepare for reanalysis: reset checkpoint, clear old findings/insights
    const preparedJob = await jobRepository.prepareForReanalysis(jobId);

    return preparedJob;
  },

  async getJobResults(
    jobId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    // Get job details
    const job = await jobRepository.getJobById(jobId);
    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    // Get findings and insights
    const findings = await jobRepository.getFindings(jobId, limit, offset);
    const insights = await jobRepository.getInsights(jobId, limit, offset);

    // Calculate metrics
    const totalFindings = await jobRepository.countFindings(jobId);
    const criticalFindings = await jobRepository.countFindingsBySeverity(
      jobId,
      "CRITICAL",
    );
    const highFindings = await jobRepository.countFindingsBySeverity(
      jobId,
      "HIGH",
    );

    // Determine overall severity
    let overallSeverity = "LOW";
    if (criticalFindings > 0) overallSeverity = "CRITICAL";
    else if (highFindings > 0) overallSeverity = "HIGH";

    // Helper function to parse JSON fields - Prisma returns them as objects or strings
    const parseJsonField = (field: any): any => {
      if (!field) return undefined;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    // Transform findings to threats format
    const threats = findings.map((finding) => {
      const affectedEntities = parseJsonField(finding.affected_entities);
      const metadata = parseJsonField(finding.metadata);
      const logReferences = parseJsonField(finding.log_references);

      return {
        id: finding.id,
        type: finding.finding_type,
        severity: finding.severity,
        message: finding.title || finding.summary,
        timestamp: finding.detected_at,
        source: affectedEntities ? affectedEntities[0] : "unknown",
        user: metadata ? metadata.user : undefined,
        logRefs: logReferences || [],
        recommendation: finding.recommendation,
        confidence: finding.confidence,
      };
    });

    return {
      status: "COMPLETED",
      summary: `Security analysis completed. ${totalFindings} threats detected.`,
      severity: overallSeverity,
      metrics: {
        totalFindings,
        criticalFindings,
        highFindings,
      },
      threats,
      insights: insights.map((insight) => {
        const insightData = parseJsonField(insight.data);
        return {
          id: insight.id,
          type: insight.insight_type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          data: insightData || {},
        };
      }),
      outcome: job.outcome || "SUCCESS",
    };
  },

  async getJobInsights(
    jobId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    // Get insights from database
    const insights = await jobRepository.getInsights(jobId, limit, offset);
    const totalInsights = await jobRepository.countInsights(jobId);

    // Helper function to parse JSON fields
    const parseJsonField = (field: any): any => {
      if (!field) return undefined;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    // Transform insights
    const formattedInsights = insights.map((insight) => {
      const insightData = parseJsonField(insight.data);
      return {
        id: insight.id,
        type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        priority_score: insight.priority_score,
        confidence_score: insight.confidence_score,
        data: insightData || {},
        is_visible: insight.is_visible,
        created_at: insight.created_at,
        updated_at: insight.updated_at,
      };
    });

    return {
      status: "COMPLETED",
      insights: formattedInsights,
      pagination: {
        limit,
        offset,
        total: totalInsights,
      },
    };
  },

  async getJobFindings(
    jobId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    // Get findings from database
    const findings = await jobRepository.getFindings(jobId, limit, offset);
    const totalFindings = await jobRepository.countFindings(jobId);

    // Helper function to parse JSON fields
    const parseJsonField = (field: any): any => {
      if (!field) return undefined;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    // Transform findings
    const formattedFindings = findings.map((finding) => {
      const affectedEntities = parseJsonField(finding.affected_entities);
      const metadata = parseJsonField(finding.metadata);
      const logReferences = parseJsonField(finding.log_references);
      const evidence = parseJsonField(finding.evidence);

      return {
        id: finding.id,
        fingerprint: finding.fingerprint,
        analyzer: finding.analyzer,
        analyzer_version: finding.analyzer_version,
        finding_type: finding.finding_type,
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        title: finding.title,
        summary: finding.summary,
        recommendation: finding.recommendation,
        log_references: logReferences || [],
        affected_entities: affectedEntities || [],
        evidence: evidence || {},
        metadata: metadata || {},
        status: finding.status,
        detected_at: finding.detected_at,
        created_at: finding.created_at,
        updated_at: finding.updated_at,
      };
    });

    return {
      status: "COMPLETED",
      findings: formattedFindings,
      pagination: {
        limit,
        offset,
        total: totalFindings,
      },
    };
  },

  async retryJob(jobId: string): Promise<Job> {
    return await jobRepository.prepareForRetry(jobId);
  },
};

export { jobService };
