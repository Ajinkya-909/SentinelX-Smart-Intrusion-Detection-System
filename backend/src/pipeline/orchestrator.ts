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
    console.log(
      `\n========== [ORCHESTRATOR] Starting pipeline for job ${jobId} ==========`,
    );
    console.log(`[ORCHESTRATOR] File path: ${filePath}\n`);

    // STAGE 4: PARSE (25%)
    console.log(`[ORCHESTRATOR] 📊 STAGE 1/4: PARSING logs...`);
    const startParseTime = Date.now();
    const parsedLogs = await parserService.parse(jobId, filePath);
    const parseTime = Date.now() - startParseTime;
    await jobService.updateJobStage(jobId, JobStageEnum.PARSED, 25);
    console.log(
      `[ORCHESTRATOR] ✅ PARSE completed in ${parseTime}ms - ${parsedLogs?.length || 0} logs parsed\n`,
    );

    // STAGE 5: NORMALIZE (50%)
    console.log(`[ORCHESTRATOR] 🔄 STAGE 2/4: NORMALIZING logs...`);
    const startNormalizeTime = Date.now();
    const normalizedLogs = await normalizerService.normalize(jobId, parsedLogs);
    const normalizeTime = Date.now() - startNormalizeTime;
    await jobService.updateJobStage(jobId, JobStageEnum.NORMALIZED, 50);
    console.log(
      `[ORCHESTRATOR] ✅ NORMALIZE completed in ${normalizeTime}ms - ${normalizedLogs?.length || 0} logs normalized\n`,
    );

    // STAGE 6: ANALYZE (75%)
    console.log(`[ORCHESTRATOR] 🔍 STAGE 3/4: ANALYZING logs...`);
    const startAnalyzeTime = Date.now();
    const findings = await analyzerService.analyze(jobId, normalizedLogs);
    const analyzeTime = Date.now() - startAnalyzeTime;
    await jobService.updateJobStage(jobId, JobStageEnum.ANALYZED, 75);
    console.log(
      `[ORCHESTRATOR] ✅ ANALYZE completed in ${analyzeTime}ms - ${findings?.length || 0} findings detected\n`,
    );

    // STAGE 7: INSIGHTS (100%)
    console.log(`[ORCHESTRATOR] 💡 STAGE 4/4: GENERATING INSIGHTS...`);
    const startInsightsTime = Date.now();
    const insights = await insightsService.generateInsights(jobId, findings);
    const insightsTime = Date.now() - startInsightsTime;
    await jobService.updateJobStage(
      jobId,
      JobStageEnum.INSIGHTS_GENERATED,
      100,
    );
    console.log(
      `[ORCHESTRATOR] ✅ INSIGHTS completed in ${insightsTime}ms - ${insights?.length || 0} insights generated\n`,
    );

    console.log(
      `========== [ORCHESTRATOR] Pipeline COMPLETED for job ${jobId} ==========\n`,
    );

    return {
      success: true,
      jobId,
      lastStage: JobStageEnum.INSIGHTS_GENERATED,
      insights,
    };
  } catch (error) {
    console.error(
      `\n❌ [ORCHESTRATOR ERROR] Pipeline failed for job ${jobId}:`,
      error instanceof Error ? error.message : error,
    );
    if (error instanceof Error) {
      console.error(`[ORCHESTRATOR STACK TRACE]:\n${error.stack}\n`);
    }
    throw error;
  }
};
