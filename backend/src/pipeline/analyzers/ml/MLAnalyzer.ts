import { AnalysisContext } from "../shared/context/AnalysisContext";
import { AnalyzerFinding } from "../shared/findings/Finding.types";
import { FindingSeverity } from "../shared/findings/FindingSeverity";
import { createFinding } from "../shared/findings/createFinding";
import { mlClient } from "./MLClient";
import logger from "../../../config/logger";

// CORRECTED IMPORTS: Matching the actual exported function names
import { extractIpFeatures } from "./features/buildIpFeatures";
import { extractSessionFeatures } from "./features/buildSessionFeatures";
import { extractUserFeatures } from "./features/buildUserFeatures";
import { FeatureVector } from "./types/features.types";

/**
 * Extract username from log
 */
export function extractUsername(log: any): string | null {
  return log.metadata?.actor?.username || null;
}

export class MLAnalyzer {
  async analyze(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    try {
      logger.info(`[ML ANALYZER] Starting feature extraction for context...`);

      const allVectors: FeatureVector[] = [];

      // 1. Build Feature Vectors from the Context
      // Iterate through the entity timelines built by your orchestrator
      if (
        ctx.entityTimelines &&
        typeof ctx.entityTimelines.entries === "function"
      ) {
        for (const [entityId, logs] of ctx.entityTimelines.entries()) {
          if (entityId.startsWith("ip:") || entityId.startsWith("ip_")) {
            const ip = entityId.replace(/^ip[:_]/, "");
            allVectors.push(extractIpFeatures(ip, logs, ctx));
          } else if (
            entityId.startsWith("user:") ||
            entityId.startsWith("user_")
          ) {
            const user = entityId.replace(/^user[:_]/, "");
            allVectors.push(extractUserFeatures(user, logs, ctx));
          } else if (
            entityId.startsWith("session:") ||
            entityId.startsWith("session_")
          ) {
            // Assuming logs here represent a session object or array
            // Adjust if your session object structure is different
            const sessionObj = {
              sessionId: entityId.replace(/^session[:_]/, ""),
              events: logs,
            };
            allVectors.push(extractSessionFeatures(sessionObj, ctx));
          }
        }
      }

      if (allVectors.length === 0) {
        logger.info(
          `[ML ANALYZER] No vectors generated. Skipping ML analysis.`,
        );
        return [];
      }

      // 2. Send to FastAPI via the ML Client
      logger.info(
        `[ML ANALYZER] Sending ${allVectors.length} vectors to FastAPI...`,
      );
      const response = await mlClient.analyze(allVectors);

      if (!response || response.status !== "success") {
        logger.warn(`[ML ANALYZER] Analysis returned no valid response.`);
        return [];
      }

      // 3. Map the ML anomalies back to standard AnalyzerFindings
      // Using 'result: any' to bypass the strict type checking on MLAnalysisResult
      const findings: AnalyzerFinding[] = response.results.map(
        (result: any) => {
          const score = typeof result.score === "number" ? result.score : 0.0;
          const entityId =
            result.entity_id || result.entityId || "unknown_entity";
          const algorithm =
            result.algorithm || result.model_name || "multi_model_ensemble";
          const details = result.details || {};
          const entityType =
            result.entity_type || result.entityType || "system";
          const logs = Array.isArray(result.related_log_ids)
            ? result.related_log_ids
            : Array.isArray(result.log_ids)
              ? result.log_ids
              : [];

          // Determine severity based on the anomaly score
          const severity =
            score >= 0.9
              ? FindingSeverity.CRITICAL
              : score >= 0.75
                ? FindingSeverity.HIGH
                : FindingSeverity.MEDIUM;

          return createFinding({
            jobId: ctx.jobId,
            analyzer: "ml",
            finding_type: "ANOMALOUS_BEHAVIOR",
            severity: severity,
            confidence: score,
            title: `ML Anomaly Detected: ${entityId}`,
            summary: `Machine learning models detected anomalous behavior for ${entityType} ${entityId}.`,
            description: `Machine learning models detected anomalous behavior for ${entityType} ${entityId} with an anomaly score of ${score.toFixed(2)}.`,
            log_references: logs,
            affected_entities: {
              entity_id: entityId,
              entity_type: entityType,
            },
            evidence: {
              score: score,
              algorithm: algorithm,
              details: details,
              related_log_ids: logs,
            },
            metadata: {
              score: score,
              algorithm: algorithm,
              details: details,
              entityType: entityType,
            },
            recommendation: `Review ${entityType} ${entityId} activity for suspicious patterns and validate the model signal against raw logs.`,
          });
        },
      );

      logger.info(
        `[ML ANALYZER] Generated ${findings.length} findings from ML anomalies.`,
      );
      return findings;
    } catch (error) {
      logger.error(
        `[ML ANALYZER ERROR] ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}

export const mlAnalyzer = new MLAnalyzer();
