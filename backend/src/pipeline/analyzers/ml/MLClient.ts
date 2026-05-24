/**
 * ML Client
 *
 * Handles HTTP communication with the FastAPI ML service.
 * Responsible for sending feature vectors and receiving ML analysis results.
 */

import { mlConfig } from "./config/ml.config";
import {
  MLAnalysisRequest,
  MLAnalysisResponse,
  FeatureVector,
} from "./types/features.types";
import logger from "../../../config/logger";

export class MLClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor() {
    this.baseUrl = mlConfig.fastapi.baseUrl;
    this.timeout = mlConfig.fastapi.timeout;
    this.retries = mlConfig.fastapi.retries;

    logger.info(
      `[ML CLIENT] Initialized with baseUrl: ${this.baseUrl}, timeout: ${this.timeout}ms`,
    );
  }

  /**
   * Check ML service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${mlConfig.fastapi.endpoints.health}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const isHealthy = response.status === 200;

      if (isHealthy) {
        logger.info("[ML CLIENT] Health check passed");
      } else {
        logger.warn(
          `[ML CLIENT] Health check returned status ${response.status}`,
        );
      }

      return isHealthy;
    } catch (error) {
      logger.error(
        `[ML CLIENT] Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Analyze vectors with FastAPI orchestrator
   *
   * FastAPI internally decides which models to run (Isolation Forest, DBSCAN, etc.)
   * Backend just sends feature vectors and receives analysis results
   */
  async analyze(vectors: FeatureVector[]): Promise<MLAnalysisResponse | null> {
    if (vectors.length === 0) {
      logger.warn("[ML CLIENT] No vectors provided for analysis");
      return null;
    }

    const payload: MLAnalysisRequest = {
      vectors,
      modelConfig: {
        contamination: mlConfig.isolationForest.contamination,
        eps: mlConfig.dbscan.eps,
        minSamples: mlConfig.dbscan.minSamples,
      },
    };

    return this.sendRequest(
      mlConfig.fastapi.endpoints.analyze,
      payload,
      "ML Analysis",
    );
  }

  /**
   * Send request to ML service with retry logic
   *
   * FastAPI /analyze endpoint is the only interface exposed.
   * Internal orchestration at FastAPI decides which models to execute.
   */
  private async sendRequest(
    endpoint: string,
    payload: MLAnalysisRequest,
    algorithmName: string,
  ): Promise<MLAnalysisResponse | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        logger.debug(
          `[ML CLIENT] Sending ${algorithmName} request (attempt ${attempt + 1}/${this.retries + 1}) with ${payload.vectors.length} vectors`,
        );

        const startTime = Date.now();
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const executionTime = Date.now() - startTime;
        const data: MLAnalysisResponse = await response.json();

        if (response.status === 200 && data.status === "success") {
          logger.info(
            `[ML CLIENT] ${algorithmName} analysis completed successfully in ${executionTime}ms. Results: ${data.results.length} anomalies detected`,
          );

          return data;
        } else {
          logger.error(
            `[ML CLIENT] ${algorithmName} analysis returned error: ${data.error}`,
          );
          lastError = new Error(`ML service error: ${data.error}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(
            `[ML CLIENT] ${algorithmName} request failed (attempt ${attempt + 1}): ${lastError.message}. Retrying in ${backoffMs}ms...`,
          );
          await this.delay(backoffMs);
        } else {
          logger.error(
            `[ML CLIENT] ${algorithmName} request failed after ${this.retries + 1} attempts: ${lastError.message}`,
          );
        }
      }
    }

    // Handle fallback behavior
    if (mlConfig.fallback.skipOnServiceDown) {
      logger.warn("[ML CLIENT] ML service unavailable, skipping ML analysis");
      return null;
    } else {
      throw lastError || new Error("Unknown error in ML analysis");
    }
  }

  /**
   * Utility: delay for backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const mlClient = new MLClient();
