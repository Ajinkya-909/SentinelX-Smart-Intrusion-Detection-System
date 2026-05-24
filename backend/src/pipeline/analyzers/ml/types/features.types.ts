/**
 * ML Feature Vector Types
 *
 * These are the data structures sent to FastAPI for ML analysis.
 * They represent compressed behavioral intelligence extracted from
 * the AnalysisContext.
 */

/**
 * IP Feature Vector
 * Captures behavioral patterns of an IP address
 */
export interface IpFeatureVector {
  entity: string; // "ip:{ip_address}"

  // Request patterns
  requestCount: number;
  uniqueEndpointsAccessed: number;
  avgRequestIntervalSeconds: number;
  maxRequestIntervalSeconds: number;
  minRequestIntervalSeconds: number;
  requestBurstSize: number; // max requests in 1-minute window

  // Authentication behavior
  failedLoginAttempts: number;
  successfulLoginCount: number;
  authFailureRatio: number; // failed / (failed + successful)
  loginAttemptsPerMinute: number;

  // Error patterns
  errorCount: number;
  errorRate: number; // errorCount / requestCount
  uniqueErrorTypes: number;
  http4xxCount: number; // client errors
  http5xxCount: number; // server errors

  // Access patterns
  endpointConcentration: number; // 0-1: how focused requests are on few endpoints
  protocolDiversity: number; // 0-1: diversity of protocols/methods used
  userAgentCount: number;
  uniqueUserAgents: number;

  // Temporal patterns
  timeOfDayEntropy: number; // 0-1: randomness of access times
  accessTimeConsistency: number; // 0-1: how consistent the access pattern is
  hoursActive: number; // number of distinct hours IP was active

  // Payload patterns
  avgResponseSizeBytes: number;
  maxResponseSizeBytes: number;
  largeResponseCount: number; // responses > 1MB
  payloadAnomalies: number; // count of suspicious payloads

  // Metadata
  timestamp: string; // ISO 8601
  jobId: string;
}

/**
 * User Feature Vector
 * Captures behavioral patterns of a user/username
 */
export interface UserFeatureVector {
  entity: string; // "user:{username}"

  // Login behavior
  loginAttempts: number;
  failedLogins: number;
  successfulLogins: number;
  loginFailureRatio: number;
  distinctIpsUsed: number; // how many different IPs logged in as this user
  geographicDiversityScore: number; // 0-1: diversity of login locations (if geo data available)

  // Access patterns
  totalRequests: number;
  distinctEndpointsAccessed: number;
  endpointAccessConcentration: number; // 0-1: how focused on specific endpoints
  uniqueSessionsCount: number;
  avgSessionDuration: number; // seconds

  // Privilege access
  adminAccessAttempts: number;
  privilegeEscalationAttempts: number;
  criticalResourceAccesses: number;

  // Error patterns
  userErrorRate: number;
  httpErrorCount: number;
  uniqueErrorTypes: number;

  // Temporal patterns
  firstActivityTime: string; // ISO 8601
  lastActivityTime: string; // ISO 8601
  hoursActive: number;
  nightTimeAccessCount: number; // accesses between 22:00-06:00
  weekendActivityLevel: number; // 0-1: activity on weekends

  // Data access patterns
  totalDataTransferred: number; // bytes
  avgDataPerRequest: number;
  largeDataTransferCount: number; // transfers > 100MB
  downloadToUploadRatio: number;

  // Session anomalies
  avgSessionsPerDay: number;
  maxSessionsInOneHour: number;
  longSessionCount: number; // sessions > 1 hour
  concurrentSessionCount: number;

  // Metadata
  timestamp: string; // ISO 8601
  jobId: string;
}

/**
 * Session Feature Vector
 * Captures behavioral patterns within a session
 */
export interface SessionFeatureVector {
  entity: string; // "session:{sessionId}"

  // Session basics
  sessionId: string;
  username: string;
  ipAddress: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  durationSeconds: number;

  // Request behavior within session
  requestCount: number;
  requestsPerMinute: number;
  maxRequestsInOneMinute: number;
  avgTimeBetweenRequests: number; // seconds
  requestIntervalVariance: number; // 0-1: consistency of request timing

  // Resource access
  uniqueEndpointsAccessed: number;
  endpointAccessPattern: number; // 0-1: concentration of accesses
  resourcesModified: number; // POST/PUT/DELETE requests
  dataUploadedBytes: number;
  dataDownloadedBytes: number;

  // Error patterns
  errorCount: number;
  errorRate: number;
  failedAuthAttemptsInSession: number;
  http4xxCount: number;
  http5xxCount: number;

  // Temporal patterns
  timeOfDayScore: number; // 0-1: how normal is the time of day
  isNightTime: boolean;
  isWeekend: boolean;
  sessionSpanHours: number;

  // Protocol patterns
  methodDiversity: number; // 0-1: diversity of HTTP methods used
  protocolChanges: number; // how many times protocol changed

  // Anomaly indicators
  payloadAnomalyCount: number;
  suspiciousEventCount: number;
  criticalResourceAccessCount: number;

  // Metadata
  timestamp: string; // ISO 8601
  jobId: string;
}

/**
 * Union type for all feature vectors
 */
export type FeatureVector =
  | IpFeatureVector
  | UserFeatureVector
  | SessionFeatureVector;

/**
 * Request payload sent to FastAPI ML endpoints
 */
export interface MLAnalysisRequest {
  vectors: FeatureVector[];
  modelConfig?: {
    contamination?: number; // for Isolation Forest
    eps?: number; // for DBSCAN
    minSamples?: number; // for DBSCAN
  };
}

/**
 * Individual ML result from analysis
 */
export interface MLAnalysisResult {
  entity: string;
  anomalyScore: number; // 0.0 to 1.0, higher = more anomalous
  anomalyDecision: -1 | 1; // -1 = anomaly, 1 = normal (sklearn convention)
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number; // 0.0 to 1.0

  // Feature contributions
  featureContributions: Record<string, number>; // top contributing features
  topAnomalousFeatures: Array<{
    feature: string;
    value: number;
    expectedRange?: [number, number];
    anomalyRatio: number; // how far from normal
  }>;

  // Human-readable explanations
  reasons: string[];
  detectionMethod: "IsolationForest" | "DBSCAN" | "Hybrid";

  // Metadata
  timestamp: string;
}

/**
 * Response from FastAPI ML service
 */
export interface MLAnalysisResponse {
  status: "success" | "error";
  model: "IsolationForest" | "DBSCAN" | "Hybrid";
  analysisId: string;
  timestamp: string;
  vectorsProcessed: number;

  results: MLAnalysisResult[];

  // Summary statistics
  statistics?: {
    totalVectors: number;
    anomaliesDetected: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgAnomalyScore: number;
  };

  error?: string;
}
