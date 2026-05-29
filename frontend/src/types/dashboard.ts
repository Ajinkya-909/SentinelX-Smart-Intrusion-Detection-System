export interface DashboardOverview {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
}

export interface SeverityDistributionItem {
  severity: string;
  count: number;
}

export interface RecentJob {
  id: string;
  jobName: string;
  fileName: string;
  status: string;
  outcome: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardAnalytics {
  successRate: number;
  averageProcessingTimeSeconds: number;
}

export interface TimelinePoint {
  date: string;
  jobs: number;
}

export interface DashboardResponse {
  overview: DashboardOverview;
  totalLogsProcessed: number;
  severityDistribution: SeverityDistributionItem[];
  analytics: DashboardAnalytics;
  recentJobs: RecentJob[];
  timeline: TimelinePoint[];
}