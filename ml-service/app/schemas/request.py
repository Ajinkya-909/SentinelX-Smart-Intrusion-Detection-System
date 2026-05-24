"""
Request schemas for ML analysis endpoint.
Validates incoming feature vectors from backend.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FeatureVector(BaseModel):
    """
    Feature vector for a single entity (IP, User, or Session).
    Can be any entity type - validation done at schema level.
    """
    entity: str = Field(..., description="Entity identifier (e.g., 'ip:192.168.1.1', 'user:john')")
    
    # All features are optional (different entity types have different features)
    requestCount: Optional[float] = None
    uniqueEndpointsAccessed: Optional[float] = None
    avgRequestIntervalSeconds: Optional[float] = None
    maxRequestIntervalSeconds: Optional[float] = None
    minRequestIntervalSeconds: Optional[float] = None
    requestBurstSize: Optional[float] = None
    
    failedLoginAttempts: Optional[float] = None
    successfulLoginCount: Optional[float] = None
    authFailureRatio: Optional[float] = None
    loginAttemptsPerMinute: Optional[float] = None
    
    errorCount: Optional[float] = None
    errorRate: Optional[float] = None
    uniqueErrorTypes: Optional[float] = None
    http4xxCount: Optional[float] = None
    http5xxCount: Optional[float] = None
    
    endpointConcentration: Optional[float] = None
    protocolDiversity: Optional[float] = None
    userAgentCount: Optional[float] = None
    uniqueUserAgents: Optional[float] = None
    
    timeOfDayEntropy: Optional[float] = None
    accessTimeConsistency: Optional[float] = None
    hoursActive: Optional[float] = None
    
    avgResponseSizeBytes: Optional[float] = None
    maxResponseSizeBytes: Optional[float] = None
    largeResponseCount: Optional[float] = None
    payloadAnomalies: Optional[float] = None
    
    # User-specific features
    distinctIpsUsed: Optional[float] = None
    geographicDiversityScore: Optional[float] = None
    totalRequests: Optional[float] = None
    distinctEndpointsAccessed: Optional[float] = None
    endpointAccessConcentration: Optional[float] = None
    uniqueSessionsCount: Optional[float] = None
    avgSessionDuration: Optional[float] = None
    adminAccessAttempts: Optional[float] = None
    privilegeEscalationAttempts: Optional[float] = None
    criticalResourceAccesses: Optional[float] = None
    userErrorRate: Optional[float] = None
    httpErrorCount: Optional[float] = None
    nightTimeAccessCount: Optional[float] = None
    weekendActivityLevel: Optional[float] = None
    totalDataTransferred: Optional[float] = None
    avgDataPerRequest: Optional[float] = None
    largeDataTransferCount: Optional[float] = None
    downloadToUploadRatio: Optional[float] = None
    avgSessionsPerDay: Optional[float] = None
    maxSessionsInOneHour: Optional[float] = None
    longSessionCount: Optional[float] = None
    concurrentSessionCount: Optional[float] = None
    
    # Session-specific features
    durationSeconds: Optional[float] = None
    requestsPerMinute: Optional[float] = None
    maxRequestsInOneMinute: Optional[float] = None
    avgTimeBetweenRequests: Optional[float] = None
    requestIntervalVariance: Optional[float] = None
    endpointAccessPattern: Optional[float] = None
    resourcesModified: Optional[float] = None
    dataUploadedBytes: Optional[float] = None
    dataDownloadedBytes: Optional[float] = None
    failedAuthAttemptsInSession: Optional[float] = None
    timeOfDayScore: Optional[float] = None
    isNightTime: Optional[bool] = None
    isWeekend: Optional[bool] = None
    sessionSpanHours: Optional[float] = None
    methodDiversity: Optional[float] = None
    protocolChanges: Optional[float] = None
    payloadAnomalyCount: Optional[float] = None
    suspiciousEventCount: Optional[float] = None
    criticalResourceAccessCount: Optional[float] = None
    
    timestamp: Optional[str] = None
    jobId: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "entity": "ip:192.168.1.1",
                "requestCount": 450,
                "failedLoginAttempts": 82,
                "uniqueEndpointsAccessed": 18,
                "errorRate": 0.71,
                "authFailureRatio": 0.34,
                "hoursActive": 8,
                "timestamp": "2026-05-24T10:30:00Z",
                "jobId": "job-123"
            }
        }


class AnalysisRequest(BaseModel):
    """Request payload for /analyze endpoint"""
    vectors: List[FeatureVector] = Field(..., description="List of feature vectors to analyze")
    modelConfig: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional model configuration (contamination, eps, minSamples)"
    )

    class Config:
        schema_extra = {
            "example": {
                "vectors": [
                    {
                        "entity": "ip:192.168.1.1",
                        "requestCount": 450,
                        "failedLoginAttempts": 82,
                    }
                ],
                "modelConfig": {
                    "contamination": 0.05,
                    "eps": 0.3,
                    "minSamples": 5
                }
            }
        }
