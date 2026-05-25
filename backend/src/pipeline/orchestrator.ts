import { JobStageEnum } from "../types/db.types";
import { JobStatusEnum, JobOutcomeEnum } from "../types/db.types";
import { preprocessorService } from "./preprocessor/preprocessor.service";
import { parserService } from "./parser/parser.service";
import { normalizerService } from "./normalizer/normalizer.service";
import { analyzerService } from "./analyzers/analyzer.service";
import { insightsOrchestrator } from "../services/insights/insights.orchestrator";
import { jobService } from "../services/jobs/job.service";
import { typeDetectorService } from "./type-detector/type-detector.service";

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

    // ================================================
    // STREAMING PIPELINE: Process each batch through all stages
    // This prevents loading entire file into memory
    // ================================================

    let batchCount = 0;
    let totalLinesProcessed = 0;
    let detectionResult: any = null;
    let insightsGenerationFailed = false;

    // Iterate through batches from preprocessing
    for await (const batch of preprocessorService.preprocess(filePath)) {
      batchCount++;

      console.log(
        `\n[ORCHESTRATOR] 📦 Processing Batch #${batch.batchNumber}: ${batch.metadata.lineCount} lines`,
      );

      // ================================================
      // STAGE 1: TYPE DETECTION (Only on first batch)
      // ================================================
      if (batchCount === 1) {
        console.log(
          `[ORCHESTRATOR] 🔍 STAGE 1/5: TYPE DETECTION (first batch only)...`,
        );
        const startTypeDetectTime = Date.now();

        // Run detection on first batch only
        detectionResult = await typeDetectorService.detect(batch.rawLines);

        // Store detection metadata to database
        await typeDetectorService.updateDetectionMetadata(
          jobId,
          detectionResult,
        );

        const typeDetectTime = Date.now() - startTypeDetectTime;
        await jobService.updateJobStage(jobId, JobStageEnum.TYPE_DETECTED, 20);
        console.log(
          `[ORCHESTRATOR] ✅ TYPE DETECTION completed in ${typeDetectTime}ms - Detected: ${detectionResult.detectedType} (${Math.round(detectionResult.confidence * 100)}% confidence)`,
        );
      }

      // ================================================
      // STAGE 2: PARSE (Each batch)
      // ================================================
      console.log(
        `[ORCHESTRATOR] 📊 STAGE 2/5: PARSING batch #${batchCount}...`,
      );
      const startParseTime = Date.now();
      const parsedLogs = await parserService.parseBatch(
        batch.rawLines,
        detectionResult.detectedType,
      );
      const parseTime = Date.now() - startParseTime;
      console.log(
        `[ORCHESTRATOR]   ✓ Parse: ${parsedLogs.length}/${batch.metadata.lineCount} logs parsed (${parseTime}ms)`,
      );

      // ================================================
      // STAGE 3: NORMALIZE (Each batch)
      // ================================================
      console.log(
        `[ORCHESTRATOR] 🔄 STAGE 3/5: NORMALIZING batch #${batchCount}...`,
      );
      const startNormalizeTime = Date.now();
      const normalizationResult = await normalizerService.normalize(
        jobId,
        parsedLogs,
        detectionResult,
      );
      const normalizeTime = Date.now() - startNormalizeTime;

      if (normalizationResult.success) {
        await jobService.updateJobStage(jobId, JobStageEnum.NORMALIZED, 40);
        console.log(
          `[ORCHESTRATOR]   ✓ Normalize: ${normalizationResult.stats.successfullyNormalized} logs normalized, ${normalizationResult.failedCount} failed (${normalizeTime}ms)`,
        );
      } else {
        throw new Error(
          `Normalization failed: ${JSON.stringify(normalizationResult)}`,
        );
      }

      // ================================================
      // STAGE 4: ANALYZE (Each batch)
      // ================================================
      console.log(
        `[ORCHESTRATOR] 🔍 STAGE 4/5: ANALYZING batch #${batchCount}...`,
      );
      const startAnalyzeTime = Date.now();
      await analyzerService.analyze(jobId);
      const analyzeTime = Date.now() - startAnalyzeTime;
      console.log(`[ORCHESTRATOR]   ✓ Analyze: completed (${analyzeTime}ms)`);

      totalLinesProcessed += batch.metadata.lineCount;

      // Update progress
      const progressPercent = Math.min(
        95,
        Math.round((totalLinesProcessed / batch.totalProcessedSoFar) * 95),
      );
      await jobService.updateJobStage(
        jobId,
        JobStageEnum.ANALYZED,
        progressPercent,
      );

      console.log(
        `[ORCHESTRATOR] ✅ Batch #${batchCount} complete - Total lines processed: ${totalLinesProcessed}`,
      );
    }

    // ================================================
    // STAGE 5: INSIGHTS GENERATION (After all batches)
    // ================================================
    console.log(`[ORCHESTRATOR] 💡 STAGE 5/5: GENERATING COMPLETE INSIGHTS...`);
    const startInsightsTime = Date.now();

    try {
      const insightsResult =
        await insightsOrchestrator.generateCompleteInsights(jobId);
      const insightsTime = Date.now() - startInsightsTime;

      console.log(
        `[ORCHESTRATOR]   ✓ Deterministic Insights: ${insightsResult.deterministic_insights.length}`,
      );
      console.log(
        `[ORCHESTRATOR]   ✓ LLM Insights: ${insightsResult.llm_insights.length}`,
      );
      console.log(
        `[ORCHESTRATOR]   ✓ Total Insights: ${insightsResult.total_insights} (${insightsTime}ms)`,
      );

      if (insightsResult.failed_insights.length > 0) {
        console.warn(
          `[ORCHESTRATOR]   ⚠ Failed Insights: ${insightsResult.failed_insights.length}`,
        );
        insightsGenerationFailed = true;
      }
    } catch (error) {
      console.error(
        `[ORCHESTRATOR] ❌ Insights generation error: ${
          error instanceof Error ? error.message : error
        }`,
      );
      insightsGenerationFailed = true;
      // Don't fail the entire pipeline if insights generation fails
      // Insights are supplementary to the main analysis
    }

    // ================================================
    // PIPELINE COMPLETE: Mark job as completed
    // ================================================
    await jobService.updateJobStage(
      jobId,
      JobStageEnum.INSIGHTS_GENERATED,
      100,
    );

    // Determine job outcome based on whether insights generation had failures
    const jobOutcome = insightsGenerationFailed
      ? JobOutcomeEnum.WARNING
      : JobOutcomeEnum.SUCCESS;

    await jobService.markJobCompletedWithOutcome(jobId, jobOutcome);

    console.log(
      `\n========== [ORCHESTRATOR] Pipeline COMPLETED for job ${jobId} ==========`,
    );
    console.log(`[ORCHESTRATOR] Job Outcome: ${jobOutcome}`);
    console.log(
      `[ORCHESTRATOR] Summary: ${batchCount} batches | ${totalLinesProcessed} total logs processed\n`,
    );

    return {
      success: true,
      jobId,
      lastStage: JobStageEnum.INSIGHTS_GENERATED,
      insights: null,
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
