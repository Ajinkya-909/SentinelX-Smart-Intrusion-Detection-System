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
   * Analyze normalized logs for a job
   * @param jobId - UUID of the job
   * @returns Array of analyzer findings
   */
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
      const masterFindings: any[] = [];

      // ===== STEP 1: SLIDING WINDOW LOOP =====
      // Consumes chunks from the generator built in Phase 2
      for await (const windowLogs of this.fetchLogsInWindows(jobId)) {
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

        // Push window findings to the master array
        masterFindings.push(...windowFindings);
        totalLogsProcessed += validLogs.length;
      }

      logger.info(
        `[ANALYZER SERVICE] All windows processed. Total logs scanned (including overlaps): ${totalLogsProcessed}. Total raw findings: ${masterFindings.length}`,
      );

      if (masterFindings.length === 0) {
        return [];
      }

      // ===== STEP 2: VALIDATE MASTER FINDINGS =====
      logger.info(
        `[ANALYZER SERVICE] Validating ${masterFindings.length} raw findings...`,
      );
      const validatedFindings = this.validateFindings(masterFindings);

      if (validatedFindings.invalid.length > 0) {
        logger.warn(
          `[ANALYZER SERVICE] Skipped ${validatedFindings.invalid.length} invalid findings`,
        );
      }

      // ===== STEP 3: CONVERT TO DB FORMAT =====
      logger.info(`[ANALYZER SERVICE] Converting findings to DB format...`);
      let findingsForDb = validatedFindings.valid.map((finding) =>
        this.convertFindingToDbFormat(finding),
      );

      // ===== STEP 4: DEDUPLICATION (OVERLAPPING WINDOW FIX) =====
      logger.info(`[ANALYZER SERVICE] Deduplicating overlapping findings...`);

      const uniqueFindingsMap = new Map<string, any>();

      for (const finding of findingsForDb) {
        // Use the fingerprint generated in convertFindingToDbFormat
        if (!uniqueFindingsMap.has(finding.fingerprint)) {
          uniqueFindingsMap.set(finding.fingerprint, finding);
        }
        // If it already exists, it's a boundary duplicate and is safely ignored
      }

      const uniqueFindingsForDb = Array.from(uniqueFindingsMap.values());
      const duplicatesRemoved =
        findingsForDb.length - uniqueFindingsForDb.length;

      logger.info(
        `[ANALYZER SERVICE] Deduplication complete. Removed ${duplicatesRemoved} duplicate boundary findings.`,
      );

      // ===== STEP 5: PERSIST FINDINGS =====
      logger.info(
        `[ANALYZER SERVICE] Persisting ${uniqueFindingsForDb.length} unique findings to DB...`,
      );

      // IMPORTANT: Passing uniqueFindingsForDb to prevent DB constraint errors
      const insertionResult =
        await pipelineRepository.insertAnalyzerFindings(uniqueFindingsForDb);

      logger.info(
        `[ANALYZER SERVICE] Insertion: ${insertionResult.total_inserted} inserted, ${insertionResult.total_skipped} skipped`,
      );
      const analysisTime = Date.now() - analysisStartTime;
      logger.info(`[ANALYZER SERVICE] Complete in ${analysisTime}ms`);

      return insertionResult.inserted_findings || [];
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
   * @returns Object with valid and invalid findings
   */
  validateFindings(findings: any[]): {
    valid: any[];
    invalid: { finding: any; reason: string }[];
  } {
    const valid = [];
    const invalid = [];

    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

    for (const finding of findings) {
      // Check required fields
      if (
        !finding.jobId ||
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
   * @returns AnalyzerFindingInput ready for database
   */
  convertFindingToDbFormat(finding: any) {
    // Generate fingerprint for deduplication
    const fingerprintString = `${finding.analyzer}_${
      finding.finding_type
    }_${JSON.stringify(finding.affected_entities || {}).substring(0, 50)}`;
    const fingerprint = this.hashFingerprint(fingerprintString);

    // Filter out undefined values from log_references (normalized logs don't have id field until persisted)
    const logReferences = (finding.log_references || []).filter(
      (ref: any) => ref !== undefined && ref !== null,
    );

    return {
      job_id: finding.jobId,
      fingerprint,
      analyzer: finding.analyzer,
      analyzer_version: "1.0",
      finding_type: finding.finding_type,
      category: finding.analyzer,
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
   * Simple hash function for fingerprint
   * @param str - String to hash
   * @returns Hash string
   */
  hashFingerprint(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
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
    let skip = 0;
    let hasMore = true;
    let iteration = 0;

    logger.info(
      `[ANALYZER SERVICE] Initializing sliding window fetcher (Window: ${windowSize}, Overlap: ${overlap})`,
    );

    while (hasMore) {
      // Fetch the specific window of logs
      const windowLogs = await pipelineRepository.getNormalizedLogsWindow(
        jobId,
        windowSize,
        skip,
      );

      if (windowLogs.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(
        `[ANALYZER SERVICE] Fetched window #${iteration + 1} (${windowLogs.length} logs, skip: ${skip})`,
      );

      // Yield the current window to the orchestrator loop
      yield windowLogs;

      // Determine if we need to keep fetching
      if (windowLogs.length < windowSize) {
        // We hit the end of the database table
        hasMore = false;
      } else {
        // Calculate the skip for the next window to ensure overlap
        iteration++;
        skip = iteration * (windowSize - overlap);
      }
    }
  },
};

export default analyzerService;
