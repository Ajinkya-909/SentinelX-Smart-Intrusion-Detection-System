import { createHash } from "crypto";
import logger from "../../config/logger";
import pipelineRepository from "../../repositories/pipeline.repository";
import { jobRepository } from "../../repositories";
import { prisma } from "../../config/db";
import { AnalyzerOrchestrator } from "./orchestrator/AnalyzerOrchestrator";

/**
 * ANALYZER SERVICE (Pipeline Version)
 *
 * Fetches normalized logs from DB and executes analyzers
 *
 * Responsibilities:
 * - Fetch normalized logs from database (WITH IDs)
 * - Validate logs
 * - Orchestrate analyzer execution (26 detectors)
 * - Validate findings before persistence
 * - Persist valid findings to database
 * - Handle errors gracefully (skip invalid findings)
 * - Return findings to orchestrator
 */

export const analyzerService = {
  /**
   * Phase 3: Analyze normalized logs using a Sliding Window approach
   * @param jobId - UUID of the job
   * @returns Array of analyzer findings
   */
  async analyze(jobId: string): Promise<any[]> {
    const analysisStartTime = Date.now();

    try {
      logger.info(
        `[ANALYZER SERVICE] Starting sliding window analysis for job ${jobId}`,
      );

      let totalLogsProcessed = 0;
      let batchCount = 0;
      let totalInserted = 0;

      // ===== STEP 1: SLIDING WINDOW LOOP =====
      // Consumes chunks from the generator built in Phase 2
      for await (const windowLogs of this.fetchLogsInWindows(jobId, 15000, 1000)) {
        batchCount++;
        logger.info(
          `[ANALYZER SERVICE] 📦 Processing Window #${batchCount} (${windowLogs.length} logs)`,
        );

        // Validate logs for this specific window
        const validLogs = windowLogs.filter(
          (log) => log.job_id && log.timestamp,
        );

        if (validLogs.length === 0) {
          logger.warn(
            `[ANALYZER SERVICE] No valid logs in Window #${batchCount}, skipping.`,
          );
          continue;
        }

        // Execute orchestrator ON THIS WINDOW ONLY
        // This keeps the Event Loop free and RAM usage strictly capped
        const orchestrator = new AnalyzerOrchestrator();
        const windowFindings = await orchestrator.orchestrate(
          jobId,
          validLogs as any,
        );

        logger.info(
          `[ANALYZER SERVICE] Window #${batchCount} generated ${windowFindings.length} findings`,
        );

        totalLogsProcessed += validLogs.length;

        if (windowFindings.length > 0) {
          // ===== STEP 2: VALIDATE WINDOW FINDINGS =====
          logger.info(`[ANALYZER SERVICE] Validating Window #${batchCount} findings...`);
          const validatedFindings = this.validateFindings(windowFindings, jobId);

          if (validatedFindings.invalid.length > 0) {
            logger.warn(
              `[ANALYZER SERVICE] Skipped ${validatedFindings.invalid.length} invalid findings`,
            );
          }

          // ===== STEP 3: CONVERT TO DB FORMAT =====
          let findingsForDb = validatedFindings.valid.map((finding) =>
            this.convertFindingToDbFormat(finding, jobId),
          );

          // ===== STEP 4: DEDUPLICATE WINDOW FINDINGS =====
          const uniqueFindingsMap = new Map<string, any>();
          for (const finding of findingsForDb) {
            if (!uniqueFindingsMap.has(finding.fingerprint)) {
              uniqueFindingsMap.set(finding.fingerprint, finding);
            }
          }
          const uniqueFindingsForDb = Array.from(uniqueFindingsMap.values());
          const duplicatesRemoved = findingsForDb.length - uniqueFindingsForDb.length;
          logger.info(
            `[ANALYZER SERVICE] Deduplication complete. Removed ${duplicatesRemoved} duplicate boundary findings.`,
          );

          // ===== STEP 5: PERSIST WINDOW FINDINGS =====
          if (uniqueFindingsForDb.length > 0) {
            logger.info(
              `[ANALYZER SERVICE] Persisting ${uniqueFindingsForDb.length} unique findings from Window #${batchCount} to DB...`,
            );

            const insertionResult =
              await pipelineRepository.insertAnalyzerFindings(uniqueFindingsForDb);
              
            totalInserted += insertionResult.total_inserted;
            logger.info(
              `[ANALYZER SERVICE] Window #${batchCount} Insertion: ${insertionResult.total_inserted} inserted, ${insertionResult.total_skipped} skipped`,
            );
          }
        }
      }

      logger.info(
        `[ANALYZER SERVICE] All windows processed. Total logs scanned: ${totalLogsProcessed}. Total findings inserted: ${totalInserted}`,
      );

      const analysisTime = Date.now() - analysisStartTime;
      logger.info(`[ANALYZER SERVICE] Complete in ${analysisTime}ms`);

      return [];
    } catch (error) {
      logger.error(
        `[ANALYZER SERVICE] Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  },

  /**
   * Validate findings - remove invalid ones
   * @param findings - Array of findings from orchestrator
   * @param correctJobId - The definitive jobId provided by the orchestrator
   * @returns Object with valid and invalid findings
   */
  validateFindings(findings: any[], correctJobId: string): {
    valid: any[];
    invalid: { finding: any; reason: string }[];
  } {
    const valid = [];
    const invalid = [];

    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

    for (const finding of findings) {
      // FIX 1 (Applied): Force the authoritative jobId onto the finding
      // to prevent "undefined" string bugs when an analyzer forgets to set it.
      finding.job_id = correctJobId;
      finding.jobId = correctJobId;

      // Check required fields
      if (
        !finding.job_id ||
        !finding.analyzer ||
        !finding.finding_type ||
        !finding.severity
      ) {
        invalid.push({
          finding,
          reason: "Missing required fields",
        });
        continue;
      }

      // Check severity
      if (!validSeverities.includes(finding.severity)) {
        invalid.push({
          finding,
          reason: `Invalid severity: ${finding.severity}`,
        });
        continue;
      }

      // Check confidence (0-1)
      if (
        finding.confidence !== undefined &&
        (finding.confidence < 0 || finding.confidence > 1)
      ) {
        invalid.push({
          finding,
          reason: `Confidence out of range: ${finding.confidence}`,
        });
        continue;
      }

      valid.push(finding);
    }

    return { valid, invalid };
  },

  /**
   * Convert finding to database format with fingerprint
   * @param finding - Analyzer finding from orchestrator
   * @param correctJobId - The definitive jobId provided by the orchestrator
   * @returns AnalyzerFindingInput ready for database
   */
  convertFindingToDbFormat(finding: any, correctJobId: string) {
    // Filter out undefined values from log_references (normalized logs don't have id field until persisted)
    const logReferences = (finding.log_references || []).filter(
      (ref: any) => ref !== undefined && ref !== null,
    );

    // FIX 2 (CORRECTED): Build fingerprint from full, untruncated content.
    //
    // Previous bug: .substring(0, 50) and .substring(0, 100) were applied BEFORE
    // hashing. For UUID-based log IDs, the first 100 chars of two different reference
    // arrays are often identical, causing the deduplication map to collapse genuinely
    // different findings into one and silently drop the second.
    //
    // The anchor for identity is:
    //   - analyzer + finding_type  → what kind of finding
    //   - affected_entities (full) → who/what it targets
    //   - first 10 log IDs         → which event cluster triggered it (bounded but complete)
    //
    // Using the first 10 log references is intentional: findings from two overlapping
    // windows that detected the same attack will share the same starting logs and
    // therefore produce the same fingerprint (correct deduplication). Findings for
    // different attacks — even of the same type on the same entity — will differ in
    // their earliest logs and produce different fingerprints (correct separation).
    const entityStr  = JSON.stringify(finding.affected_entities || {});
    const logRefStr  = JSON.stringify(logReferences.slice(0, 10));

    const fingerprintString = `${finding.analyzer}_${finding.finding_type}_${entityStr}_${logRefStr}`;
    const fingerprint = this.hashFingerprint(fingerprintString);

    return {
      job_id: correctJobId,
      fingerprint,
      analyzer: finding.analyzer,
      analyzer_version: finding.analyzer_version || "1.0",
      finding_type: finding.finding_type,
      category: finding.category || finding.analyzer,
      severity: finding.severity,
      confidence: finding.confidence || 0.6,
      title: finding.title,
      summary: finding.summary,
      recommendation: finding.recommendation,
      log_references: logReferences.length > 0 ? logReferences : null,
      affected_entities: finding.affected_entities || {},
      evidence: finding.evidence || {},
      metadata: finding.metadata || {},
    };
  },

  /**
   * Cryptographic fingerprint using SHA-256 (truncated to 16 hex chars / 64 bits).
   *
   * Previous bug: the hand-rolled djb2-style hash was 32-bit (≈4.3B values).
   * With tens of thousands of findings across many sliding windows, the birthday
   * paradox made hash collisions statistically likely — two completely different
   * findings would hash to the same value and one would be silently dropped by the
   * deduplication map before it ever reached the database.
   *
   * SHA-256 truncated to 64 bits gives a collision probability of effectively zero
   * at any realistic finding volume (you would need ~4 billion findings before the
   * probability exceeds 0.01%).
   */
  hashFingerprint(str: string): string {
    return createHash("sha256").update(str).digest("hex").substring(0, 16);
  },

  /**
   * Phase 2: Sliding Window Fetcher
   * Fetches logs in overlapping windows to preserve temporal attack sequences.
   * * @param jobId - UUID of the job
   * @param windowSize - How many logs to process at once (e.g., 5000)
   * @param overlap - How many logs to overlap to catch boundary attacks (e.g., 500)
   */
  async *fetchLogsInWindows(
    jobId: string,
    windowSize: number = 5000,
    overlap: number = 500,
  ) {
    let cursorId: string | undefined = undefined;
    let hasMore = true;
    let iteration = 0;

    logger.info(
      `[ANALYZER SERVICE] Initializing sliding window fetcher (Window: ${windowSize}, Overlap: ${overlap})`,
    );

    while (hasMore) {
      // Fetch the specific window of logs
      const windowLogs = await pipelineRepository.getNormalizedLogsWindowCursor(
        jobId,
        windowSize,
        cursorId,
      );

      if (windowLogs.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(
        `[ANALYZER SERVICE] Fetched window #${iteration + 1} (${windowLogs.length} logs, cursor: ${cursorId || "start"})`,
      );

      // Yield the current window to the orchestrator loop
      yield windowLogs;

      // Determine if we need to keep fetching
      if (windowLogs.length < windowSize) {
        // We hit the end of the database table
        hasMore = false;
      } else {
        // Calculate the log that starts the overlap for the next window
        const overlapStartLog = windowLogs[windowSize - overlap - 1];
        if (!overlapStartLog) {
            hasMore = false;
            break;
        }
        cursorId = overlapStartLog.id;
        iteration++;
      }
    }
  },
};

export default analyzerService; 