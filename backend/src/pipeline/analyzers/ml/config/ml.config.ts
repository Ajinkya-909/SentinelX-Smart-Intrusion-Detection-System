/**
 * ML Service Configuration
 *
 * Configuration for ML-related settings, FastAPI endpoint URLs,
 * and ML algorithm parameters.
 */

export const mlConfig = {
  // ===== FASTAPI ENDPOINTS =====
  fastapi: {
    baseUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
    endpoints: {
      health: "/health",
      analyze: "/analyze", // SINGLE endpoint - FastAPI orchestrates internally which models to run
    },
    timeout: 30000, // 30 seconds for ML analysis
    retries: 2,
  },

  // ===== ISOLATION FOREST CONFIGURATION =====
  isolationForest: {
    enabled: true,
    contamination: 0.05, // expect ~5% of data to be anomalous
    randomState: 42,
    nEstimators: 100,

    // Scoring thresholds
    thresholds: {
      critical: 0.8,
      high: 0.6,
      medium: 0.4,
      low: 0.2,
    },

    // Confidence boost for ML findings (ML detects novel patterns)
    confidenceBoost: 1.0, // multiply anomaly score by this (capped at 1.0)
  },

  // ===== DBSCAN CONFIGURATION =====
  dbscan: {
    enabled: true,
    eps: 0.3, // maximum distance between samples in cluster
    minSamples: 5, // minimum samples to form core point
    metric: "euclidean",

    // Risk mapping for DBSCAN outliers
    riskMapping: {
      corePoint: "LOW", // part of dense cluster - normal
      borderPoint: "MEDIUM", // edge of cluster - transitional
      noisePoint: "HIGH", // outlier/noise point - anomalous
    },
  },

  // ===== FEATURE EXTRACTION =====
  features: {
    ip: {
      enabled: true,
      includeFeatures: [
        "requestCount",
        "uniqueEndpointsAccessed",
        "avgRequestIntervalSeconds",
        "failedLoginAttempts",
        "errorRate",
        "authFailureRatio",
        "endpointConcentration",
        "timeOfDayEntropy",
        "hoursActive",
        "http5xxCount",
        "maxRequestIntervalSeconds",
      ],
    },

    user: {
      enabled: true,
      includeFeatures: [
        "failedLogins",
        "loginFailureRatio",
        "distinctIpsUsed",
        "adminAccessAttempts",
        "privilegeEscalationAttempts",
        "hoursActive",
        "nightTimeAccessCount",
        "totalDataTransferred",
        "downloadToUploadRatio",
        "longSessionCount",
      ],
    },

    session: {
      enabled: true,
      includeFeatures: [
        "durationSeconds",
        "requestsPerMinute",
        "maxRequestsInOneMinute",
        "errorRate",
        "failedAuthAttemptsInSession",
        "resourcesModified",
        "isNightTime",
        "methodDiversity",
        "payloadAnomalyCount",
        "suspiciousEventCount",
      ],
    },
  },

  // ===== ML FINDING MAPPING =====
  findings: {
    findingTypeMappings: {
      isolationForest: "ANOMALOUS_BEHAVIOR",
      dbscan: "BEHAVIORAL_OUTLIER",
      hybrid: "PATTERN_DEVIATION",
    },

    // Risk level to severity mapping
    riskToSeverity: {
      CRITICAL: "CRITICAL",
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    },

    // Confidence calculation
    confidenceCalculation: "min(anomalyScore * 1.25, 1.0)",
  },

  // ===== LOGGING & MONITORING =====
  logging: {
    enabled: true,
    logMLRequests: true,
    logMLResponses: true,
    logFeatureExtraction: false, // verbose, disable in production
  },

  // ===== BATCH PROCESSING =====
  batch: {
    maxVectorsPerRequest: 10000, // split large batches to avoid overwhelming ML service
    parallelRequests: 2, // how many concurrent requests to ML service
  },

  // ===== FALLBACK & ERROR HANDLING =====
  fallback: {
    // If ML service is unavailable, should we still process?
    skipOnServiceDown: false, // true = skip ML findings, false = error out

    // Default anomaly score if ML service fails
    defaultAnomalyScore: 0.3,
  },

  // ===== FEATURE SCALING =====
  scaling: {
    enabled: true,
    method: "StandardScaler", // StandardScaler or MinMaxScaler
  },
};

// Type for ML config
export type MLConfig = typeof mlConfig;
