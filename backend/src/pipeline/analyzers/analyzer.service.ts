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
  async analyze(jobId: string): Promise<any[]> {
    const analysisStartTime = Date.now();

    try {
      logger.info(
        `[ANALYZER SERVICE] Fetching normalized logs from DB for job ${jobId}`,
      );

      // ===== STEP 1: FETCH NORMALIZED LOGS FROM DATABASE =====
      // This ensures logs have IDs (auto-generated in DB)
      const normalizedLogs = await prisma.normalized_logs.findMany({
        where: { job_id: jobId },
        orderBy: { timestamp: "asc" },
      });

      logger.info(
        `[ANALYZER SERVICE] Fetched ${normalizedLogs.length} logs from database`,
      );

      if (normalizedLogs.length === 0) {
        logger.warn(`[ANALYZER SERVICE] No normalized logs found for job`);
        return [];
      }

      // ===== STEP 2: VALIDATE LOGS =====
      logger.info(`[ANALYZER SERVICE] Validating logs...`);

      const validLogs = normalizedLogs.filter(
        (log) => log.job_id && log.timestamp,
      );

      if (validLogs.length === 0) {
        logger.warn(`[ANALYZER SERVICE] No valid logs to analyze`);
        return [];
      }

      logger.info(
        `[ANALYZER SERVICE] Validated ${validLogs.length} logs (skipped ${normalizedLogs.length - validLogs.length})`,
      );

      // ===== STEP 2: EXECUTE ORCHESTRATOR =====
      logger.info(`[ANALYZER SERVICE] Executing analyzer orchestrator...`);

      const orchestrator = new AnalyzerOrchestrator();
      const findings = await orchestrator.orchestrate(jobId, validLogs as any);

      logger.info(
        `[ANALYZER SERVICE] Orchestrator returned ${findings.length} findings`,
      );

      // ===== STEP 3: VALIDATE FINDINGS =====
      logger.info(
        `[ANALYZER SERVICE] Validating ${findings.length} findings...`,
      );

      const validatedFindings = this.validateFindings(findings);

      logger.info(
        `[ANALYZER SERVICE] Validated ${validatedFindings.valid.length} valid findings, skipped ${validatedFindings.invalid.length}`,
      );

      if (validatedFindings.invalid.length > 0) {
        logger.warn(
          `[ANALYZER SERVICE] Skipped ${validatedFindings.invalid.length} invalid findings`,
        );
      }

      // ===== STEP 4: CONVERT TO DB FORMAT & ADD FINGERPRINT =====
      logger.info(`[ANALYZER SERVICE] Converting findings to DB format...`);

      const findingsForDb = validatedFindings.valid.map((finding) =>
        this.convertFindingToDbFormat(finding),
      );

      // ===== STEP 5: PERSIST FINDINGS =====
      logger.info(
        `[ANALYZER SERVICE] Persisting ${findingsForDb.length} findings to DB...`,
      );

      const insertionResult =
        await pipelineRepository.insertAnalyzerFindings(findingsForDb);

      logger.info(
        `[ANALYZER SERVICE] Insertion: ${insertionResult.total_inserted} inserted, ${insertionResult.total_skipped} skipped`,
      );

      const analysisTime = Date.now() - analysisStartTime;
      logger.info(`[ANALYZER SERVICE] Complete in ${analysisTime}ms`);

      // Return inserted findings to orchestrator
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
};

export default analyzerService;
