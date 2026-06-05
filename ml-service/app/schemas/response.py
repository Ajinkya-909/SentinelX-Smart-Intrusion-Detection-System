"""
Response schemas for ML analysis endpoint.
Defines the structure of results returned to backend.
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class FeatureContribution(BaseModel):
    """Top anomalous feature with contribution details"""
    feature: str = Field(..., description="Feature name")
    value: float = Field(..., description="Feature value")
    expectedRange: Optional[List[float]] = Field(None, description="Expected range [min, max]")
    anomalyRatio: float = Field(..., description="How far from normal (0-1)")


class MLResult(BaseModel):
    """Individual ML analysis result for one entity"""
    entity: str = Field(..., description="Entity identifier (ip, user, or session)")
    anomalyScore: float = Field(..., description="Anomaly score 0-1, higher = more anomalous")
    anomalyDecision: int = Field(..., description="-1 = anomaly, 1 = normal")
    risk: str = Field(..., description="Risk level: CRITICAL, HIGH, MEDIUM, LOW")
    confidence: float = Field(..., description="Confidence in prediction 0-1")
    
    featureContributions: Dict[str, float] = Field(
        ...,
        description="Top contributing features and their values"
    )
    topAnomalousFeatures: List[FeatureContribution] = Field(
        ...,
        description="Top anomalous features details"
    )
    
    reasons: List[str] = Field(
        ...,
        description="Human-readable explanations for anomaly"
    )
    detectionMethod: str = Field(
        ...,
        description="ML algorithm used: IsolationForest, DBSCAN, or Hybrid"
    )
    
    timestamp: str = Field(..., description="Analysis timestamp ISO 8601")

    model_config = {
        "json_schema_extra": {
            "example": {
                "entity": "ip:192.168.1.1",
                "anomalyScore": 0.93,
                "anomalyDecision": -1,
                "risk": "CRITICAL",
                "confidence": 0.93,
                "featureContributions": {
                    "failedLoginAttempts": 82,
                    "requestCount": 450,
                    "errorRate": 0.71
                },
                "topAnomalousFeatures": [
                    {
                        "feature": "failedLoginAttempts",
                        "value": 82,
                        "anomalyRatio": 0.95
                    }
                ],
                "reasons": [
                    "Excessive failed login attempts (82 in timeframe)",
                    "Abnormally high request velocity (450 requests)",
                    "High error rate indicating resource exhaustion"
                ],
                "detectionMethod": "IsolationForest",
                "timestamp": "2026-05-24T10:30:00Z"
            }
        }
    }


class AnalysisStats(BaseModel):
    """Summary statistics of analysis"""
    totalVectors: int = Field(..., description="Total feature vectors analyzed")
    anomaliesDetected: int = Field(..., description="Total anomalies found")
    criticalCount: int = Field(..., description="Count of CRITICAL risk findings")
    highCount: int = Field(..., description="Count of HIGH risk findings")
    mediumCount: int = Field(..., description="Count of MEDIUM risk findings")
    lowCount: int = Field(..., description="Count of LOW risk findings")
    avgAnomalyScore: float = Field(..., description="Average anomaly score across all vectors")


class AnalysisResponse(BaseModel):
    """Response from /analyze endpoint"""
    status: str = Field(..., description="success or error")
    model: str = Field(..., description="ML model used: IsolationForest, DBSCAN, or Hybrid")
    analysisId: str = Field(..., description="Unique analysis run ID")
    timestamp: str = Field(..., description="Analysis timestamp ISO 8601")
    vectorsProcessed: int = Field(..., description="Number of vectors analyzed")
    
    results: List[MLResult] = Field(..., description="Analysis results for each entity")
    
    statistics: Optional[AnalysisStats] = Field(
        None,
        description="Summary statistics"
    )
    
    error: Optional[str] = Field(None, description="Error message if status=error")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "success",
                "model": "IsolationForest",
                "analysisId": "analysis-uuid-123",
                "timestamp": "2026-05-24T10:30:00Z",
                "vectorsProcessed": 5,
                "results": [
                    {
                        "entity": "ip:192.168.1.1",
                        "anomalyScore": 0.93,
                        "anomalyDecision": -1,
                        "risk": "CRITICAL",
                        "confidence": 0.93,
                        "featureContributions": {"failedLoginAttempts": 82},
                        "topAnomalousFeatures": [],
                        "reasons": ["Excessive failed login attempts"],
                        "detectionMethod": "IsolationForest",
                        "timestamp": "2026-05-24T10:30:00Z"
                    }
                ],
                "statistics": {
                    "totalVectors": 5,
                    "anomaliesDetected": 1,
                    "criticalCount": 1,
                    "highCount": 0,
                    "mediumCount": 0,
                    "lowCount": 0,
                    "avgAnomalyScore": 0.45
                }
            }
        }
    }
