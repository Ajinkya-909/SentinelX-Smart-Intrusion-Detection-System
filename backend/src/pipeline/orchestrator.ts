import { JobStageEnum } from "../types/db.types";
import { preprocessorService } from "./preprocessor/preprocessor.service";
import { parserService } from "./parser/parser.service";
import { normalizerService } from "./normalizer/normalizer.service";
import { analyzerService } from "./analyzers/analyzer.service";
import { insightsService } from "./insights/insights.service";
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
    const allInsights: any[] = [];

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
      const findings = await analyzerService.analyze(jobId);
      const analyzeTime = Date.now() - startAnalyzeTime;
      console.log(
        `[ORCHESTRATOR]   ✓ Analyze: ${findings?.length || 0} findings detected (${analyzeTime}ms)`,
      );

      // ================================================
      // STAGE 5: INSIGHTS GENERATION (Each batch)
      // ================================================
      console.log(
        `[ORCHESTRATOR] 💡 STAGE 5/5: GENERATING INSIGHTS for batch #${batchCount}...`,
      );
      const startInsightsTime = Date.now();
      const batchInsights = await insightsService.generateInsights(
        jobId,
        findings,
      );
      const insightsTime = Date.now() - startInsightsTime;
      console.log(
        `[ORCHESTRATOR]   ✓ Insights: ${batchInsights?.length || 0} insights generated (${insightsTime}ms)`,
      );

      // Accumulate insights from all batches
      if (batchInsights) {
        allInsights.push(...batchInsights);
      }

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
    // PIPELINE COMPLETE
    // ================================================
    await jobService.updateJobStage(
      jobId,
      JobStageEnum.INSIGHTS_GENERATED,
      100,
    );

    console.log(
      `\n========== [ORCHESTRATOR] Pipeline COMPLETED for job ${jobId} ==========`,
    );
    console.log(
      `[ORCHESTRATOR] Summary: ${batchCount} batches | ${totalLinesProcessed} total logs | ${allInsights.length} insights generated\n`,
    );

    return {
      success: true,
      jobId,
      lastStage: JobStageEnum.INSIGHTS_GENERATED,
      insights: allInsights,
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
