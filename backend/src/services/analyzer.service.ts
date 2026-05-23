import logger from "../config/logger";
import pipelineRepository from "../repositories/pipeline.repository";
import { jobRepository } from "../repositories";
import { prisma } from "../config/db";
import { JobStageEnum } from "../types/db.types";

// Import analyzer orchestrator
import { AnalyzerOrchestrator } from "../pipeline/analyzers/orchestrator/AnalyzerOrchestrator.js";

/**
 * ANALYZER SERVICE
 *
 * Responsibilities:
 * - Load normalized logs for a job
 * - Validate logs
 * - Orchestrate analyzer execution
 * - Validate findings before persistence
 * - Persist valid findings to database
 * - Handle errors gracefully (skip invalid findings, don't block entire process)
 * - Update job status
 */

export const analyzerService = {
  /**
   * Execute complete analyzer pipeline for a job
   * @param jobId - UUID of the job
   * @returns Object with execution results and summary
   */
  async analyzeJob(jobId: string) {
    const pipelineStartTime = Date.now();

    try {
      logger.info(`[ANALYZER SERVICE] Starting analysis for job ${jobId}`);

      // ===== STEP 1: LOAD NORMALIZED LOGS =====
      logger.info(`[ANALYZER SERVICE] Loading normalized logs...`);

      const normalizedLogs = await prisma.normalized_logs.findMany({
        where: { job_id: jobId },
        orderBy: { timestamp: "asc" },
      });

      if (normalizedLogs.length === 0) {
        logger.warn(
          `[ANALYZER SERVICE] No normalized logs found for job ${jobId}`,
        );
        return {
          success: false,
          error: "No normalized logs found",
          total_logs: 0,
          findings_count: 0,
          execution_time_ms: Date.now() - pipelineStartTime,
        };
      }

      logger.info(
        `[ANALYZER SERVICE] Loaded ${normalizedLogs.length} normalized logs`,
      );

      // ===== STEP 2: VALIDATE LOGS =====
      logger.info(`[ANALYZER SERVICE] Validating logs...`);

      const invalidLogs = normalizedLogs.filter(
        (log) => !log.job_id || !log.timestamp,
      );
      if (invalidLogs.length > 0) {
        logger.warn(
          `[ANALYZER SERVICE] Found ${invalidLogs.length} invalid logs, skipping them`,
        );
      }

      const validLogs = normalizedLogs.filter(
        (log) => log.job_id && log.timestamp,
      );

      if (validLogs.length === 0) {
        logger.error(`[ANALYZER SERVICE] All logs are invalid, cannot proceed`);
        return {
          success: false,
          error: "All logs are invalid",
          total_logs: normalizedLogs.length,
          findings_count: 0,
          execution_time_ms: Date.now() - pipelineStartTime,
        };
      }

      // ===== STEP 3: EXECUTE ORCHESTRATOR =====
      logger.info(`[ANALYZER SERVICE] Executing analyzer orchestrator...`);

      const orchestrator = new AnalyzerOrchestrator();
      const findings = await orchestrator.orchestrate(jobId, validLogs as any);

      logger.info(
        `[ANALYZER SERVICE] Orchestrator returned ${findings.length} findings`,
      );

      // ===== STEP 4: VALIDATE FINDINGS =====
      logger.info(
        `[ANALYZER SERVICE] Validating ${findings.length} findings...`,
      );

      const validatedFindings = this.validateFindings(findings);

      logger.info(
        `[ANALYZER SERVICE] Validated ${validatedFindings.valid.length} valid findings, skipped ${validatedFindings.invalid.length}`,
      );

      if (validatedFindings.invalid.length > 0) {
        logger.warn(
          `[ANALYZER SERVICE] Skipped invalid findings: ${validatedFindings.invalid
            .map((f) => f.reason)
            .join(", ")}`,
        );
      }

      // ===== STEP 5: CONVERT TO DB FORMAT & ADD FINGERPRINT =====
      logger.info(
        `[ANALYZER SERVICE] Converting findings to repository format...`,
      );

      const findingsForDb = validatedFindings.valid.map((finding) =>
        this.convertFindingToDbFormat(finding),
      );

      logger.info(
        `[ANALYZER SERVICE] Ready to persist ${findingsForDb.length} findings`,
      );

      // ===== STEP 6: PERSIST FINDINGS =====
      logger.info(`[ANALYZER SERVICE] Persisting findings to database...`);

      const insertionResult =
        await pipelineRepository.insertAnalyzerFindings(findingsForDb);

      logger.info(
        `[ANALYZER SERVICE] Insertion result: ${insertionResult.total_inserted} inserted, ${insertionResult.total_skipped} skipped`,
      );

      // ===== STEP 7: UPDATE JOB STATUS =====
      logger.info(`[ANALYZER SERVICE] Updating job status to ANALYZED...`);

      await jobRepository.updateJob(jobId, {
        status: "PROCESSING",
        last_completed_stage: JobStageEnum.ANALYZED,
        progress: 75,
      });

      const executionTime = Date.now() - pipelineStartTime;

      logger.info(
        `[ANALYZER SERVICE] Complete. Execution time: ${executionTime}ms`,
      );

      return {
        success: true,
        total_logs: validLogs.length,
        findings_count: insertionResult.total_inserted,
        skipped_findings: insertionResult.total_skipped,
        execution_time_ms: executionTime,
        summary: await pipelineRepository.getFindingsSummary(jobId),
      };
    } catch (error) {
      logger.error(
        `[ANALYZER SERVICE] Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Mark job as failed
      await jobRepository.updateJob(jobId, {
        status: "FAILED",
        error_message: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },

  /**
   * Validate findings - remove invalid ones, keep valid ones
   * Invalid reasons: missing required fields, invalid severity, invalid confidence
   *
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
          reason: `Missing required fields (jobId=${finding.jobId}, analyzer=${finding.analyzer}, finding_type=${finding.finding_type}, severity=${finding.severity})`,
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

      // All checks passed
      valid.push(finding);
    }

    return { valid, invalid };
  },

  /**
   * Convert finding to database format with fingerprint hash
   * @param finding - Analyzer finding from orchestrator
   * @returns AnalyzerFindingInput ready for database
   */
  convertFindingToDbFormat(finding: any): AnalyzerFindingInput {
    // Generate fingerprint hash for deduplication
    // Format: analyzer_finding_type_affected_entity_hash
    const fingerprintString = `${finding.analyzer}_${
      finding.finding_type
    }_${JSON.stringify(finding.affected_entities).substring(0, 50)}`;
    const fingerprint = this.hashFingerprint(fingerprintString);

    return {
      job_id: finding.jobId,
      fingerprint,
      analyzer: finding.analyzer,
      analyzer_version: "1.0",
      finding_type: finding.finding_type,
      category: finding.analyzer, // Use analyzer name as category
      severity: finding.severity,
      confidence: finding.confidence || 0.6,
      title: finding.title,
      summary: finding.summary,
      recommendation: finding.recommendation,
      log_references: finding.log_references || [],
      affected_entities: finding.affected_entities || {},
      evidence: finding.evidence || {},
      metadata: finding.metadata || {},
    };
  },

  /**
   * Simple hash function for fingerprint generation
   * @param str - String to hash
   * @returns Hash string
   */
  hashFingerprint(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  },
};

export default analyzerService;
