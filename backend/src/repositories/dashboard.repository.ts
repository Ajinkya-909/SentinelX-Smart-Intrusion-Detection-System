import { prisma } from "../config/db";

export const dashboardRepository = {
  /**
   * Overview KPI Cards
   */
  async getOverview(userId: string) {
    const [
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
    ] = await Promise.all([
      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
        },
      }),

      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
          status: "COMPLETED",
        },
      }),

      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
          status: "FAILED",
        },
      }),

      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
          status: "PROCESSING",
        },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
    };
  },

  /**
   * Total normalized logs processed
   */
  async getTotalLogsProcessed(userId: string) {
    return prisma.normalized_logs.count({
      where: {
        jobs: {
          user_id: userId,
          deleted_at: null,
        },
      },
    });
  },

  /**
   * Threat severity distribution
   */
  async getSeverityDistribution(userId: string) {
    return prisma.analyzer_findings.groupBy({
      by: ["severity"],

      where: {
        jobs: {
          user_id: userId,
          deleted_at: null,
        },
      },

      _count: {
        severity: true,
      },
    });
  },

  /**
   * Last 5 jobs
   */
  async getRecentJobs(userId: string, limit = 5) {
    return prisma.jobs.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },

      orderBy: {
        created_at: "desc",
      },

      take: limit,

      select: {
        id: true,
        job_name: true,
        file_name: true,
        status: true,
        outcome: true,
        progress: true,
        created_at: true,
        updated_at: true,
      },
    });
  },

  /**
   * Analytics calculations source
   */
  async getCompletedJobs(userId: string) {
    return prisma.jobs.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        status: "COMPLETED",
      },

      select: {
        created_at: true,
        updated_at: true,
      },
    });
  },

  /**
   * Success rate source
   */
  async getJobCounts(userId: string) {
    const [totalJobs, completedJobs] = await Promise.all([
      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
        },
      }),

      prisma.jobs.count({
        where: {
          user_id: userId,
          deleted_at: null,
          status: "COMPLETED",
        },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
    };
  },

  /**
   * Activity timeline
   */
  async getJobsTimeline(userId: string) {
    return prisma.jobs.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },

      select: {
        created_at: true,
      },

      orderBy: {
        created_at: "asc",
      },
    });
  },
};