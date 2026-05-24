/**
 * ML Analyzer
 *
 * Orchestrates ML-based threat detection by:
 * 1. Extracting behavioral features from AnalysisContext (IP, User, Session)
 * 2. Sending feature vectors to FastAPI ML service
 * 3. Receiving anomaly scores and results
 * 4. Converting ML results to SentinelX findings
 *
 * ML Analyzer is the 5th analyzer in the orchestrator, alongside:
 * - Rule Analyzer
 * - Statistical Analyzer
 * - Temporal Analyzer
 * - Correlation Analyzer
 */

import { IAnalyzer } from "../shared/interfaces/Analyzer.interface";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { AnalysisContext } from "../shared/context/AnalysisContext";
import { createFinding } from "../shared/findings/createFinding";
import { mlClient } from "./MLClient";
import { MLAnalysisResult, FeatureVector } from "./types/features.types";
import { buildIpFeatures } from "./features/buildIpFeatures";
import { buildUserFeatures } from "./features/buildUserFeatures";
import { buildSessionFeatures } from "./features/buildSessionFeatures";
import { mlConfig } from "./config/ml.config";
import logger from "../../../config/logger";

/**
 * ML ANALYZER
 *
 * Detects anomalous behaviors using machine learning.
 * Complements hard-coded detectors by finding novel attack patterns.
 */
export class MLAnalyzer implements IAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const startTime = Date.now();
    const findings: AnalyzerFinding[] = [];

    try {
      logger.info("[ML ANALYZER] Starting ML-based analysis");

      // ===== STEP 1: EXTRACT FEATURES =====
      logger.info("[ML ANALYZER] Extracting behavioral features...");

      const ipFeatures = mlConfig.features.ip.enabled
        ? buildIpFeatures(ctx)
        : [];

      const userFeatures = mlConfig.features.user.enabled
        ? buildUserFeatures(ctx)
        : [];

      const sessionFeatures = mlConfig.features.session.enabled
        ? buildSessionFeatures(ctx)
        : [];

      const allFeatures: FeatureVector[] = [
        ...ipFeatures,
        ...userFeatures,
        ...sessionFeatures,
      ];

      logger.info(
        `[ML ANALYZER] Extracted ${allFeatures.length} feature vectors (IP: ${ipFeatures.length}, User: ${userFeatures.length}, Session: ${sessionFeatures.length})`,
      );

      if (allFeatures.length === 0) {
        logger.warn("[ML ANALYZER] No feature vectors to analyze");
        return findings;
      }

      // ===== STEP 2: SEND TO ML SERVICE FOR ANALYSIS =====
      logger.info(
        "[ML ANALYZER] Sending vectors to ML service for analysis...",
      );

      const mlResults = await mlClient.analyze(allFeatures);

      if (!mlResults) {
        logger.warn("[ML ANALYZER] ML service returned no results");
        return findings;
      }

      logger.info(
        `[ML ANALYZER] ML analysis complete. Detected ${mlResults.results.length} anomalies (${mlResults.model})`,
      );

      // ===== STEP 3: CONVERT ML RESULTS TO FINDINGS =====
      logger.info("[ML ANALYZER] Converting ML results to findings...");

      for (const result of mlResults.results) {
        const findings_from_result = this.convertMLResultToFindings(
          result,
          ctx,
        );
        findings.push(...findings_from_result);
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        `[ML ANALYZER] Complete. Generated ${findings.length} findings in ${executionTime}ms`,
      );

      return findings;
    } catch (error) {
      logger.error(
        `[ML ANALYZER] Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return findings;
    }
  }

  /**
   * Convert a single ML result to one or more SentinelX findings
   */
  private convertMLResultToFindings(
    result: MLAnalysisResult,
    ctx: AnalysisContext,
  ): AnalyzerFinding[] {
    const findings: AnalyzerFinding[] = [];

    // Only create findings for actual anomalies (anomaly_decision = -1)
    if (result.anomalyDecision !== -1) {
      return findings;
    }

    // Only create findings if risk is above LOW
    if (result.risk === "LOW") {
      return findings;
    }

    // Map risk to severity
    const severity = result.risk;
    const confidence = Math.min(result.anomalyScore * 1.25, 1.0); // Slight boost for ML findings

    // Extract entity information
    const { entityType, entityValue } = parseEntity(result.entity);
    const affected_entities: Record<string, any> = {};
    let log_references: string[] = [];

    // Find relevant logs for this entity
    if (entityType === "ip") {
      affected_entities.ip_address = entityValue;
      log_references = ctx.logs
        .filter((log) => log.ip_address === entityValue)
        .map((log) => log.id);
    } else if (entityType === "user") {
      affected_entities.username = entityValue;
      log_references = ctx.logs
        .filter((log) => extractUsername(log) === entityValue)
        .map((log) => log.id);
    } else if (entityType === "session") {
      affected_entities.session_id = entityValue;
      const session = ctx.sessions.find((s) => s.sessionId === entityValue);
      if (session) {
        log_references = session.events?.map((e: any) => e.id) || [];
      }
    }

    // Build evidence object
    const evidence = {
      anomalyScore: result.anomalyScore,
      detectionMethod: result.detectionMethod,
      topAnomalousFeatures: result.topAnomalousFeatures,
      featureContributions: result.featureContributions,
    };

    // Build title and summary
    const title = `ML-Detected Anomaly: ${entityType.toUpperCase()} ${entityValue}`;
    const summary = `ML algorithm detected anomalous behavior (${result.detectionMethod}) with score ${(result.anomalyScore * 100).toFixed(1)}%`;

    // Build description with reasons
    const description = result.reasons.join("\n");

    // Build recommendation
    const recommendation = this.buildRecommendation(result);

    // Create the finding
    const finding = createFinding({
      jobId: ctx.jobId,
      analyzer: "ml",
      finding_type: "ANOMALOUS_BEHAVIOR",
      severity,
      confidence,
      title,
      summary,
      description,
      log_references,
      affected_entities,
      evidence,
      metadata: {
        anomaly_score: result.anomalyScore,
        detection_method: result.detectionMethod,
        risk_level: result.risk,
        feature_count: Object.keys(result.featureContributions).length,
      },
      recommendation,
    });

    findings.push(finding);

    return findings;
  }

  /**
   * Build a recommendation based on ML findings
   */
  private buildRecommendation(result: MLAnalysisResult): string {
    const riskLevel = result.risk;

    const baseRecommendations: Record<string, string> = {
      CRITICAL:
        "Immediate investigation required. Consider temporarily blocking this entity and reviewing all access logs. Escalate to security team.",
      HIGH: "Investigate the anomalous behavior promptly. Review affected resources and verify all changes made by this entity.",
      MEDIUM:
        "Monitor this entity's behavior closely. Review recent activities and consider enabling additional alerts.",
      LOW: "Track for patterns. Investigate if similar anomalies are detected in the future.",
    };

    const baseRec =
      baseRecommendations[riskLevel] || "Investigate the detected anomaly.";

    // Add feature-specific recommendations
    const topFeatures = result.topAnomalousFeatures
      .slice(0, 2)
      .map((f) => f.feature)
      .join(", ");

    return `${baseRec} Specific anomalies in: ${topFeatures}.`;
  }
}

/**
 * Parse entity string (e.g., "ip:192.168.1.1" -> { entityType: "ip", entityValue: "192.168.1.1" })
 */
function parseEntity(entityString: string): {
  entityType: string;
  entityValue: string;
} {
  const parts = entityString.split(":");
  if (parts.length === 2) {
    return { entityType: parts[0], entityValue: parts[1] };
  }
  return { entityType: "unknown", entityValue: entityString };
}

/**
 * Extract username from log
 */
function extractUsername(log: any): string | null {
  return (
    log.username ||
    log.user ||
    log.metadata?.username ||
    log.metadata?.user ||
    log.metadata?.userId ||
    null
  );
}

// Export singleton instance
export const mlAnalyzer = new MLAnalyzer();
