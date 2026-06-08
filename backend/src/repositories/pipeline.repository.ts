import { prisma } from "../config/db";
import logger from "../config/logger";

/**
 * Analyzer Finding interface matching prisma schema
 */
export interface AnalyzerFindingInput {
  job_id: string;
  fingerprint: string; // Hash for deduplication
  analyzer: string; // "rule", "statistical", "temporal", "correlation"
  analyzer_version?: string;
  finding_type: string;
  category?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  confidence?: number;
  title?: string;
  summary?: string;
  recommendation?: string;
  log_references?: any;
  affected_entities?: any;
  evidence?: any;
  metadata?: any;
}

const pipelineRepository = {
  /**
   * Insert analyzer findings in bulk
   * Handles deduplication via fingerprint uniqueness constraint
   * Invalid findings are skipped (omitted)
   *
   * @param findings - Array of AnalyzerFindingInput to insert
   * @returns Object with insertion stats
   */
  async insertAnalyzerFindings(findings: AnalyzerFindingInput[]) {
    logger.info(
      `[PIPELINE REPO] Inserting ${findings.length} analyzer findings`,
    );

    const skippedFindings = [];
    let successCount = 0;
    let errorCount = 0;
    const validFindings = [];

    // Filter and prepare valid findings
    for (const finding of findings) {
      try {
        // Validate required fields
        if (!finding.job_id || !finding.fingerprint || !finding.analyzer) {
          logger.warn(
            `[PIPELINE REPO] Skipping finding: missing required fields (job_id=${finding.job_id}, fingerprint=${finding.fingerprint}, analyzer=${finding.analyzer})`,
          );
          skippedFindings.push({
            finding,
            reason: "Missing required fields",
          });
          errorCount++;
          continue;
        }

        // Validate severity
        const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
        if (!validSeverities.includes(finding.severity)) {
          logger.warn(
            `[PIPELINE REPO] Skipping finding: invalid severity '${finding.severity}'`,
          );
          skippedFindings.push({
            finding,
            reason: `Invalid severity: ${finding.severity}`,
          });
          errorCount++;
          continue;
        }

        // Validate confidence (0-1 range)
        if (
          finding.confidence !== undefined &&
          (finding.confidence < 0 || finding.confidence > 1)
        ) {
          logger.warn(
            `[PIPELINE REPO] Skipping finding: confidence out of range (${finding.confidence})`,
          );
          skippedFindings.push({
            finding,
            reason: `Confidence out of range: ${finding.confidence}`,
          });
          errorCount++;
          continue;
        }

        validFindings.push({
          job_id: finding.job_id,
          fingerprint: finding.fingerprint,
          analyzer: finding.analyzer,
          analyzer_version: finding.analyzer_version || null,
          finding_type: finding.finding_type,
          category: finding.category || null,
          severity: finding.severity,
          confidence: finding.confidence || null,
          title: finding.title || null,
          summary: finding.summary || null,
          recommendation: finding.recommendation || null,
          log_references: finding.log_references || null,
          affected_entities: finding.affected_entities || null,
          evidence: finding.evidence || null,
          metadata: finding.metadata || null,
        });
      } catch (error) {
        logger.error(
          `[PIPELINE REPO] Error processing finding: ${error instanceof Error ? error.message : String(error)}`,
        );
        skippedFindings.push({
          finding,
          reason: error instanceof Error ? error.message : String(error),
        });
        errorCount++;
      }
    }

    try {
      const BATCH_SIZE = 5_000;
      for (let i = 0; i < validFindings.length; i += BATCH_SIZE) {
        const chunk = validFindings.slice(i, i + BATCH_SIZE);
        await prisma.analyzer_findings.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        successCount += chunk.length;
      }
    } catch (error) {
      logger.error(
        `[PIPELINE REPO] Error inserting findings batch: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    logger.info(
      `[PIPELINE REPO] Insertion complete: ${successCount} inserted, ${errorCount} skipped`,
    );

    return {
      total_requested: findings.length,
      total_inserted: successCount,
      total_skipped: errorCount,
      inserted_findings: [],
      skipped_findings: skippedFindings,
    };
  },

  /**
   * Get findings by job ID
   * @param jobId - UUID of the job
   * @returns Array of analyzer findings
   */
  async getFindings(jobId: string): Promise<any[]> {
    const findings = await prisma.analyzer_findings.findMany({
      where: { job_id: jobId },
      orderBy: { severity: "asc" }, // CRITICAL first
    });
    return findings;
  },

  /**
   * Get findings filtered by severity
   * @param jobId - UUID of the job
   * @param severity - Severity level filter
   * @returns Array of findings
   */
  async getFindingsBySeverity(
    jobId: string,
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
  ) {
    const findings = await prisma.analyzer_findings.findMany({
      where: {
        job_id: jobId,
        severity,
      },
    });
    return findings;
  },

  /**
   * Get critical findings count for a job
   * @param jobId - UUID of the job
   * @returns Count of critical findings
   */
  async getCriticalFindingsCount(jobId: string): Promise<number> {
    return await prisma.analyzer_findings.count({
      where: {
        job_id: jobId,
        severity: "CRITICAL",
      },
    });
  },

  /**
   * Get findings summary for a job
   * @param jobId - UUID of the job
   * @returns Summary with counts by severity
   */
  async getFindingsSummary(jobId: string) {
    const findings = await prisma.analyzer_findings.findMany({
      where: { job_id: jobId },
    });

    const summary = {
      total: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of findings) {
      switch (finding.severity) {
        case "CRITICAL":
          summary.critical++;
          break;
        case "HIGH":
          summary.high++;
          break;
        case "MEDIUM":
          summary.medium++;
          break;
        case "LOW":
          summary.low++;
          break;
        case "INFO":
          summary.info++;
          break;
      }
    }

    return summary;
  },

  /**
   * Fetches a paginated window of normalized logs for analysis using OFFSET
   * @deprecated Use getNormalizedLogsWindowCursor instead for large files
   * @param jobId - UUID of the job
   * @param take - Number of logs to fetch (window size)
   * @param skip - Number of logs to skip (offset)
   */
  async getNormalizedLogsWindow(jobId: string, take: number, skip: number) {
    return await prisma.normalized_logs.findMany({
      where: { job_id: jobId },
      // Deterministic ordering prevents overlap windows from returning logs
      // in different sequences when timestamps are identical.
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      take: take,
      skip: skip,
    });
  },

  /**
   * Fetches a paginated window of normalized logs using efficient cursor pagination
   * @param jobId - UUID of the job
   * @param take - Number of logs to fetch (window size)
   * @param cursorId - The ID of the log to start *after*
   */
  async getNormalizedLogsWindowCursor(jobId: string, take: number, cursorId?: string) {
    return await prisma.normalized_logs.findMany({
      where: { job_id: jobId },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      take: take,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    });
  },
};

export default pipelineRepository;
