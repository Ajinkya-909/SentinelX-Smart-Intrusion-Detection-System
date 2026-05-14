import { JobStageEnum } from "../types/db.types";
import { parserService } from "./parser/parser.service";
import { normalizerService } from "./normalizer/normalizer.service";
import { analyzerService } from "./analyzers/analyzer.service";
import { insightsService } from "./insights/insights.service";
import { jobService } from "../services/jobs/job.service";

export const executeOrchestrator = async (
  jobId: string,
  filePath: string,
): Promise<{
  success: boolean;
  jobId: string;
  lastStage: JobStageEnum;
  insights: any;
}> => {
  try {
    console.log(`[ORCHESTRATOR] Starting pipeline for job ${jobId}`);

    // STAGE 1: PARSE (25%)
    const parsedLogs = await parserService.parse(jobId, filePath);
    await jobService.updateJobStage(jobId, JobStageEnum.PARSE, 25);

    // STAGE 2: NORMALIZE (50%)
    const normalizedLogs = await normalizerService.normalize(jobId, parsedLogs);
    await jobService.updateJobStage(jobId, JobStageEnum.NORMALIZE, 50);

    // STAGE 3: ANALYZE (75%)
    const findings = await analyzerService.analyze(jobId, normalizedLogs);
    await jobService.updateJobStage(jobId, JobStageEnum.ANALYZE, 75);

    // STAGE 4: INSIGHTS (100%)
    const insights = await insightsService.generateInsights(jobId, findings);
    await jobService.updateJobStage(jobId, JobStageEnum.INSIGHTS, 100);

    return {
      success: true,
      jobId,
      lastStage: JobStageEnum.INSIGHTS,
      insights,
    };
  } catch (error) {
    console.error(
      `[ORCHESTRATOR ERROR] Pipeline failed for job ${jobId}:`,
      error,
    );
    throw error;
  }
};
