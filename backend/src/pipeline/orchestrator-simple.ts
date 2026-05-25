import { JobStageEnum } from "../types/db.types";
import { JobStatusEnum, JobOutcomeEnum } from "../types/db.types";
import { preprocessorService } from "./preprocessor/preprocessor.service";
import { parserService } from "./parser/parser.service";
import { normalizerService } from "./normalizer/normalizer.service";
import { analyzerService } from "./analyzers/analyzer.service";
import { insightsOrchestrator } from "./insights/insights.orchestrator";
import { jobService } from "../services/jobs/job.service";
import { typeDetectorService } from "./type-detector/type-detector.service";
import { checkpointService } from "./checkpoint/checkpoint.service";
import { prisma } from "../config/db";

/**
 * SIMPLIFIED PIPELINE ORCHESTRATOR
 *
 * 4 CHECKPOINTS ONLY:
 * 1. UPLOADED - File received
 * 2. NORMALIZED - (preprocessing + type_detection + parsing + normalization bundled)
 * 3. ANALYZED - (all analyzers bundled)
 * 4. INSIGHTS - (insights generation)
 *
 * RESUMABLE: Checks lastCompletedStage and skips completed stages
 */

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

    // ✅ CHECK CHECKPOINT: Where should we start?
    const lastCompletedStage =
      await checkpointService.getLastCompletedStage(jobId);
    console.log(
      `[ORCHESTRATOR] Last completed stage: ${lastCompletedStage || "NONE"}`,
    );

    let batchCount = 0;
    let totalLinesProcessed = 0;
    let detectionResult: any = null;
    let insightsGenerationFailed = false;

    // =====================================================
    // CHECKPOINT 1: UPLOADED (already done)
    // =====================================================
    if (lastCompletedStage === JobStageEnum.UPLOADED) {
      console.log(`[ORCHESTRATOR] ⏭️  Skipping UPLOADED (already done)`);
    } else if (lastCompletedStage === null) {
      // First time - mark as uploaded
      await checkpointService.markStageComplete(jobId, JobStageEnum.UPLOADED);
    }

    // =====================================================
    // CHECKPOINT 2: NORMALIZED
    // Bundle: preprocessing + type_detection + parsing + normalization
    // =====================================================
    if (!lastCompletedStage || lastCompletedStage === JobStageEnum.UPLOADED) {
      console.log(`[ORCHESTRATOR] 🔄 CHECKPOINT 2: NORMALIZING...`);

      // Delete pre-existing normalized logs to avoid duplication
      const deletedCount = await prisma.normalized_logs.deleteMany({
        where: { job_id: jobId },
      });
      if (deletedCount.count > 0) {
        console.log(
          `[ORCHESTRATOR] 🗑️  Deleted ${deletedCount.count} pre-existing normalized logs`,
        );
      }

      try {
        // Process through all batches: preprocess → type detect → parse → normalize
        for await (const batch of preprocessorService.preprocess(filePath)) {
          batchCount++;
          console.log(
            `[ORCHESTRATOR] 📦 Batch #${batchCount}: ${batch.metadata.lineCount} lines`,
          );

          // Type detection on first batch only
          if (batchCount === 1) {
            console.log(`[ORCHESTRATOR] 🔍 Type detection (first batch)...`);
            detectionResult = await typeDetectorService.detect(batch.rawLines);
            await typeDetectorService.updateDetectionMetadata(
              jobId,
              detectionResult,
            );
            console.log(
              `[ORCHESTRATOR] ✅ Detected: ${detectionResult.detectedType}`,
            );
          }

          // Parse batch
          console.log(`[ORCHESTRATOR] 📊 Parsing batch #${batchCount}...`);
          const parsedLogs = await parserService.parseBatch(
            batch.rawLines,
            detectionResult.detectedType,
          );

          // Normalize batch
          console.log(`[ORCHESTRATOR] 🔄 Normalizing batch #${batchCount}...`);
          const normalizationResult = await normalizerService.normalize(
            jobId,
            parsedLogs,
            detectionResult,
          );

          if (normalizationResult.success) {
            totalLinesProcessed +=
              normalizationResult.stats.successfullyNormalized;
            console.log(
              `[ORCHESTRATOR] ✓ Batch normalized: ${normalizationResult.stats.successfullyNormalized} logs`,
            );
          } else {
            throw new Error(`Normalization failed for batch #${batchCount}`);
          }
        }

        // Mark NORMALIZED checkpoint
        await checkpointService.markStageComplete(
          jobId,
          JobStageEnum.NORMALIZED,
        );
        await jobService.updateJobStage(jobId, JobStageEnum.NORMALIZED, 40);
        console.log(
          `[ORCHESTRATOR] ✅ CHECKPOINT 2 COMPLETE: ${totalLinesProcessed} logs normalized`,
        );
      } catch (error) {
        console.error(`[ORCHESTRATOR] ❌ NORMALIZED stage failed:`, error);
        throw error;
      }
    } else {
      console.log(`[ORCHESTRATOR] ⏭️  Skipping NORMALIZED (already done)`);
    }

    // =====================================================
    // CHECKPOINT 3: ANALYZED
    // Bundle: all analyzers (rule, correlation, ml, etc.)
    // =====================================================
    if (
      !lastCompletedStage ||
      lastCompletedStage === JobStageEnum.UPLOADED ||
      lastCompletedStage === JobStageEnum.NORMALIZED
    ) {
      console.log(`[ORCHESTRATOR] 🔄 CHECKPOINT 3: ANALYZING...`);

      // Delete pre-existing analyzer findings to avoid duplication
      const deletedFindings = await prisma.analyzer_findings.deleteMany({
        where: { job_id: jobId },
      });
      if (deletedFindings.count > 0) {
        console.log(
          `[ORCHESTRATOR] 🗑️  Deleted ${deletedFindings.count} pre-existing findings`,
        );
      }

      try {
        console.log(`[ORCHESTRATOR] 📊 Running all analyzers...`);
        await analyzerService.analyze(jobId);

        await checkpointService.markStageComplete(jobId, JobStageEnum.ANALYZED);
        await jobService.updateJobStage(jobId, JobStageEnum.ANALYZED, 70);
        console.log(
          `[ORCHESTRATOR] ✅ CHECKPOINT 3 COMPLETE: Analysis finished`,
        );
      } catch (error) {
        console.error(`[ORCHESTRATOR] ❌ ANALYZED stage failed:`, error);
        throw error;
      }
    } else {
      console.log(`[ORCHESTRATOR] ⏭️  Skipping ANALYZED (already done)`);
    }

    // =====================================================
    // CHECKPOINT 4: INSIGHTS
    // Bundle: insights generation
    // =====================================================
    if (
      !lastCompletedStage ||
      lastCompletedStage === JobStageEnum.UPLOADED ||
      lastCompletedStage === JobStageEnum.NORMALIZED ||
      lastCompletedStage === JobStageEnum.ANALYZED
    ) {
      console.log(`[ORCHESTRATOR] 🔄 CHECKPOINT 4: GENERATING INSIGHTS...`);

      // Delete pre-existing insights to avoid duplication
      const deletedInsights = await prisma.insights.deleteMany({
        where: { job_id: jobId },
      });
      if (deletedInsights.count > 0) {
        console.log(
          `[ORCHESTRATOR] 🗑️  Deleted ${deletedInsights.count} pre-existing insights`,
        );
      }

      try {
        console.log(`[ORCHESTRATOR] 💡 Generating insights...`);
        const insightsResult =
          await insightsOrchestrator.generateCompleteInsights(jobId);

        await checkpointService.markStageComplete(
          jobId,
          JobStageEnum.INSIGHTS_GENERATED,
        );
        await jobService.updateJobStage(
          jobId,
          JobStageEnum.INSIGHTS_GENERATED,
          100,
        );
        console.log(
          `[ORCHESTRATOR] ✅ CHECKPOINT 4 COMPLETE: Insights generated`,
        );

        // Mark job as COMPLETED
        await jobService.updateJobStatus(jobId, JobStatusEnum.COMPLETED);

        return {
          success: true,
          jobId,
          lastStage: JobStageEnum.INSIGHTS_GENERATED,
          insights: insightsResult,
        };
      } catch (error) {
        console.error(`[ORCHESTRATOR] ❌ INSIGHTS stage failed:`, error);
        throw error;
      }
    } else {
      console.log(`[ORCHESTRATOR] ⏭️  Skipping INSIGHTS (already done)`);
      // Retrieve existing insights
      const insights = await prisma.insights.findMany({
        where: { job_id: jobId },
      });

      return {
        success: true,
        jobId,
        lastStage: JobStageEnum.INSIGHTS_GENERATED,
        insights,
      };
    }
  } catch (error) {
    console.error(`[ORCHESTRATOR] ❌ Pipeline failed for job ${jobId}:`, error);
    await jobService.updateJobStatus(jobId, JobStatusEnum.FAILED);

    throw error;
  }
};
