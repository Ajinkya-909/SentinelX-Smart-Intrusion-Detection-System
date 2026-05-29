import { dashboardRepository } from "@/repositories/dashboard.repository";
import {
  DashboardResponse,
  SeverityDistributionItem,
  TimelinePoint,
} from "@/types/dashboard.types";

class DashboardService {
  async getDashboard(userId: string): Promise<DashboardResponse> {
    const [
      overview,
      totalLogsProcessed,
      severityData,
      recentJobs,
      completedJobs,
      jobCounts,
      timelineJobs,
    ] = await Promise.all([
      dashboardRepository.getOverview(userId),
      dashboardRepository.getTotalLogsProcessed(userId),
      dashboardRepository.getSeverityDistribution(userId),
      dashboardRepository.getRecentJobs(userId),
      dashboardRepository.getCompletedJobs(userId),
      dashboardRepository.getJobCounts(userId),
      dashboardRepository.getJobsTimeline(userId),
    ]);

    const severityDistribution: SeverityDistributionItem[] = severityData.map(
      (item) => ({
        severity: item.severity,
        count: item._count.severity,
      }),
    );

    const successRate =
      jobCounts.totalJobs === 0
        ? 0
        : Number(
            ((jobCounts.completedJobs / jobCounts.totalJobs) * 100).toFixed(2),
          );

    let averageProcessingTimeSeconds = 0;

    // Filter valid jobs to prevent crash on missing timestamps
    const validJobs = completedJobs.filter(
      (job) => job.created_at && job.updated_at,
    );

    if (validJobs.length > 0) {
      const totalTime = validJobs.reduce(
        (sum, job) =>
          sum +
          Math.floor(
            (job.updated_at!.getTime() - job.created_at!.getTime()) / 1000,
          ),
        0,
      );
      // FIX: Divide by validJobs.length, not completedJobs.length
      averageProcessingTimeSeconds = Math.floor(totalTime / validJobs.length);
    }

    const timelineMap = new Map<string, number>();

    timelineJobs.forEach((job) => {
      if (job.created_at) {
        // FIX: Added '!' to guarantee to TS that index [0] exists
        const date = job.created_at.toISOString().split("T")[0]!;

        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      }
    });

    const timeline: TimelinePoint[] = Array.from(timelineMap.entries()).map(
      ([date, jobs]) => ({
        date,
        jobs,
      }),
    );

    return {
      overview,
      // FIX: Flattened to match DashboardResponse type
      totalLogsProcessed,
      severityDistribution,
      analytics: {
        successRate,
        averageProcessingTimeSeconds,
      },
      // FIX: Added fallbacks for Prisma nullable fields
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        jobName: job.job_name || "Untitled Job",
        fileName: job.file_name,
        status: job.status,
        outcome: job.outcome || null,
        progress: job.progress ?? 0,
        createdAt: job.created_at || new Date(),
        updatedAt: job.updated_at || new Date(),
      })),
      timeline,
    };
  }
}

export const dashboardService = new DashboardService();
