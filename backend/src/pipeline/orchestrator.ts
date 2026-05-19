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
    // STAGE 0/6: PREPROCESS (16%)
    // ================================================
    console.log(`[ORCHESTRATOR] 🧹 STAGE 0/6: PREPROCESSING logs...`);
    const startPreprocessTime = Date.now();

    let totalPreprocessedLines = 0;
    const preprocessedBatches = [];

    // Iterate through batches from preprocessing generator
    for await (const batch of preprocessorService.preprocess(filePath)) {
      totalPreprocessedLines += batch.metadata.lineCount;

      // Log batch information
      console.log(
        `[ORCHESTRATOR] 📦 Batch #${batch.batchNumber}: ${batch.metadata.lineCount} lines | ${Math.round(batch.metadata.estimatedSizeBytes / 1024)}KB | Corrupt: ${batch.metadata.linesRemovedAsCorrupt} | Empty: ${batch.metadata.emptyLinesRemoved}`,
      );

      // Log sample of preprocessed data (first 3 lines of first batch for visualization)
      if (batch.batchNumber === 1) {
        console.log(
          `[ORCHESTRATOR] 📋 Sample preprocessed lines from Batch #1:`,
        );
        batch.rawLines.slice(0, 3).forEach((line, idx) => {
          console.log(
            `  [${idx + 1}] ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}`,
          );
        });
        console.log(
          `  ... and ${batch.metadata.lineCount - 3} more lines in this batch\n`,
        );
      }

      // Store batch for type detection (next stage)
      preprocessedBatches.push(batch);
    }

    const preprocessTime = Date.now() - startPreprocessTime;
    await jobService.updateJobStage(jobId, JobStageEnum.PREPROCESSED, 16);
    console.log(
      `[ORCHESTRATOR] ✅ PREPROCESS completed in ${preprocessTime}ms - ${totalPreprocessedLines} total logs preprocessed across ${preprocessedBatches.length} batches\n`,
    );

    // ================================================
    // STAGE 1/6: TYPE DETECTION (33%)
    // ================================================
    console.log(`[ORCHESTRATOR] 🔍 STAGE 1/6: TYPE DETECTION...`);
    const startTypeDetectTime = Date.now();

    // Get first batch for type detection
    const firstBatch = preprocessedBatches[0];
    if (!firstBatch) {
      throw new Error(
        "[ORCHESTRATOR] No preprocessed batches found for type detection",
      );
    }

    // Run detection on first batch only
    const detectionResult = await typeDetectorService.detect(
      firstBatch.rawLines,
    );

    // Store detection metadata to database
    await typeDetectorService.updateDetectionMetadata(jobId, detectionResult);

    const typeDetectTime = Date.now() - startTypeDetectTime;
    await jobService.updateJobStage(jobId, JobStageEnum.TYPE_DETECTED, 33);
    console.log(
      `[ORCHESTRATOR] ✅ TYPE DETECTION completed in ${typeDetectTime}ms - Detected: ${detectionResult.detectedType} (${Math.round(detectionResult.confidence * 100)}% confidence)\n`,
    );

    // ================================================
    // STAGE 2/6: PARSE (50%)
    // ================================================
    console.log(`[ORCHESTRATOR] 📊 STAGE 2/6: PARSING logs...`);
    const startParseTime = Date.now();
    const parsedLogs = await parserService.parse(jobId, filePath);
    const parseTime = Date.now() - startParseTime;
    await jobService.updateJobStage(jobId, JobStageEnum.PARSED, 50);
    console.log(
      `[ORCHESTRATOR] ✅ PARSE completed in ${parseTime}ms - ${parsedLogs?.length || 0} logs parsed\n`,
    );

    // ================================================
    // STAGE 3/6: NORMALIZE (66%)
    // ================================================
    console.log(`[ORCHESTRATOR] 🔄 STAGE 3/6: NORMALIZING logs...`);
    const startNormalizeTime = Date.now();
    const normalizedLogs = await normalizerService.normalize(jobId, parsedLogs);
    const normalizeTime = Date.now() - startNormalizeTime;
    await jobService.updateJobStage(jobId, JobStageEnum.NORMALIZED, 66);
    console.log(
      `[ORCHESTRATOR] ✅ NORMALIZE completed in ${normalizeTime}ms - ${normalizedLogs?.length || 0} logs normalized\n`,
    );

    // ================================================
    // STAGE 4/6: ANALYZE (83%)
    // ================================================
    console.log(`[ORCHESTRATOR] 🔍 STAGE 4/6: ANALYZING logs...`);
    const startAnalyzeTime = Date.now();
    const findings = await analyzerService.analyze(jobId, normalizedLogs);
    const analyzeTime = Date.now() - startAnalyzeTime;
    await jobService.updateJobStage(jobId, JobStageEnum.ANALYZED, 83);
    console.log(
      `[ORCHESTRATOR] ✅ ANALYZE completed in ${analyzeTime}ms - ${findings?.length || 0} findings detected\n`,
    );

    // ================================================
    // STAGE 5/6: INSIGHTS GENERATION (100%)
    // ================================================
    console.log(`[ORCHESTRATOR] 💡 STAGE 5/6: GENERATING INSIGHTS...`);
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
