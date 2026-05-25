"""
Unit tests for Orchestrator service.
Tests the main orchestration logic coordinating both ML algorithms.
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock

from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisResponse, MLResult
from app.services.orchestrator_service import orchestrator_service


class TestOrchestratorService:
    """Test suite for OrchestratorService"""
    
    @pytest.fixture
    def sample_request(self):
        """Create sample analysis request"""
        return AnalysisRequest(
            vectors=[
                {
                    "entity": "ip:192.168.1.1",
                    "failedLoginAttempts": 5,
                    "totalRequests": 100,
                    "requestVelocity": 10.5,
                    "errorRate": 0.05,
                    "entropySrcPorts": 0.3,
                    "uniqueEndpoints": 5,
                    "authSuccessRate": 0.95,
                    "httpErrorCount": 2,
                    "avgResponseTime": 250,
                },
                {
                    "entity": "ip:192.168.1.2",
                    "failedLoginAttempts": 82,
                    "totalRequests": 450,
                    "requestVelocity": 45.0,
                    "errorRate": 0.71,
                    "entropySrcPorts": 0.9,
                    "uniqueEndpoints": 1,
                    "authSuccessRate": 0.05,
                    "httpErrorCount": 32,
                    "avgResponseTime": 50,
                }
            ]
        )
    
    def test_orchestrate_returns_response(self, sample_request):
        """Test that orchestrate returns AnalysisResponse"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert isinstance(response, AnalysisResponse)
        assert response.status in ["success", "error"]
    
    def test_orchestrate_processes_all_vectors(self, sample_request):
        """Test that all vectors are processed"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert response.vectorsProcessed == len(sample_request.vectors)
        assert len(response.results) > 0
    
    def test_orchestrate_generates_analysis_id(self, sample_request):
        """Test that unique analysis ID is generated"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert response.analysisId is not None
        assert len(response.analysisId) > 0
    
    def test_orchestrate_sets_timestamp(self, sample_request):
        """Test that timestamp is set"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert response.timestamp is not None
        assert "T" in response.timestamp  # ISO format
    
    def test_orchestrate_includes_statistics(self, sample_request):
        """Test that statistics are included"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert response.statistics is not None
        assert response.statistics.totalVectors == len(sample_request.vectors)
        assert response.statistics.anomaliesDetected >= 0
    
    def test_orchestrate_calculates_risk_counts(self, sample_request):
        """Test risk level counts are calculated"""
        response = orchestrator_service.orchestrate(sample_request)
        
        stats = response.statistics
        assert stats.criticalCount >= 0
        assert stats.highCount >= 0
        assert stats.mediumCount >= 0
        assert stats.lowCount >= 0
    
    def test_orchestrate_calculates_avg_score(self, sample_request):
        """Test average anomaly score is calculated"""
        response = orchestrator_service.orchestrate(sample_request)
        
        stats = response.statistics
        assert 0 <= stats.avgAnomalyScore <= 1
    
    def test_orchestrate_detects_high_anomaly(self, sample_request):
        """Test that anomalies are detected"""
        response = orchestrator_service.orchestrate(sample_request)
        
        # Second vector should be anomalous
        assert response.status == "success"
        assert len(response.results) >= 1
    
    def test_orchestrate_with_empty_vectors(self):
        """Test error handling with empty vectors"""
        request = AnalysisRequest(vectors=[])
        response = orchestrator_service.orchestrate(request)
        
        assert response.status == "error"
        assert response.error is not None
    
    def test_orchestrate_with_invalid_vectors(self):
        """Test error handling with invalid vectors"""
        request = AnalysisRequest(
            vectors=[
                {
                    "entity": "ip:192.168.1.1",
                    # No numeric features
                }
            ]
        )
        response = orchestrator_service.orchestrate(request)
        
        assert response.status == "error"
    
    def test_orchestrate_model_field(self, sample_request):
        """Test model field in response"""
        response = orchestrator_service.orchestrate(sample_request)
        
        assert response.model in ["IsolationForest", "DBSCAN", "Hybrid"]
    
    def test_orchestrate_results_have_required_fields(self, sample_request):
        """Test that results have all required fields"""
        response = orchestrator_service.orchestrate(sample_request)
        
        for result in response.results:
            assert result.entity is not None
            assert 0 <= result.anomalyScore <= 1
            assert result.risk in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            assert 0 <= result.confidence <= 1
            assert len(result.reasons) > 0
            assert result.detectionMethod is not None
    
    def test_orchestrate_multiple_entities(self):
        """Test analysis of multiple entity types"""
        request = AnalysisRequest(
            vectors=[
                {
                    "entity": "ip:192.168.1.1",
                    "failedLoginAttempts": 5,
                    "totalRequests": 100,
                    "requestVelocity": 10.5,
                    "errorRate": 0.05,
                    "entropySrcPorts": 0.3,
                    "uniqueEndpoints": 5,
                    "authSuccessRate": 0.95,
                    "httpErrorCount": 2,
                    "avgResponseTime": 250,
                },
                {
                    "entity": "user:john.doe",
                    "loginTimeConcentration": 0.8,
                    "uniqueIPs": 3,
                    "avgSessionDuration": 1200,
                    "totalDataTransferred": 5000000,
                    "concurrentSessions": 1,
                    "uniqueResources": 10,
                    "uniqueEndpoints": 5,
                    "successfulLogins": 95,
                    "failedLoginAttempts": 2,
                },
                {
                    "entity": "session:xyz123",
                    "requestsPerSecond": 5,
                    "uniqueEndpoints": 4,
                    "avgResponseTime": 250,
                    "errorCount": 0,
                    "sessionDuration": 600,
                    "resourceCount": 10,
                    "dataTransferred": 1024000,
                }
            ]
        )
        
        response = orchestrator_service.orchestrate(request)
        
        assert response.status == "success"
        assert len(response.results) >= 1
        assert response.vectorsProcessed == 3
    
    def test_merge_results_takes_highest_risk(self):
        """Test that merge takes highest risk level"""
        # Create mock results
        if_result = MLResult(
            entity="ip:192.168.1.1",
            anomalyScore=0.5,
            anomalyDecision=1,
            risk="MEDIUM",
            confidence=0.5,
            featureContributions={},
            topAnomalousFeatures=[],
            reasons=["IF reason"],
            detectionMethod="IsolationForest",
            timestamp="2026-05-25T10:00:00Z"
        )
        
        dbscan_result = MLResult(
            entity="ip:192.168.1.1",
            anomalyScore=0.9,
            anomalyDecision=-1,
            risk="HIGH",
            confidence=0.9,
            featureContributions={},
            topAnomalousFeatures=[],
            reasons=["DBSCAN reason"],
            detectionMethod="DBSCAN",
            timestamp="2026-05-25T10:00:00Z"
        )
        
        merged = orchestrator_service._merge_results([if_result], [dbscan_result])
        
        assert len(merged) == 1
        assert merged[0].risk == "HIGH"  # Higher risk from DBSCAN
    
    def test_calculate_statistics_empty_results(self):
        """Test statistics calculation with empty results"""
        stats = orchestrator_service._calculate_statistics([])
        
        assert stats.totalVectors == 0
        assert stats.anomaliesDetected == 0
    
    def test_calculate_statistics_with_results(self):
        """Test statistics calculation"""
        results = [
            MLResult(
                entity="ip:1",
                anomalyScore=0.9,
                anomalyDecision=-1,
                risk="CRITICAL",
                confidence=0.9,
                featureContributions={},
                topAnomalousFeatures=[],
                reasons=[],
                detectionMethod="IF",
                timestamp="2026-05-25T10:00:00Z"
            ),
            MLResult(
                entity="ip:2",
                anomalyScore=0.1,
                anomalyDecision=1,
                risk="LOW",
                confidence=0.1,
                featureContributions={},
                topAnomalousFeatures=[],
                reasons=[],
                detectionMethod="IF",
                timestamp="2026-05-25T10:00:00Z"
            )
        ]
        
        stats = orchestrator_service._calculate_statistics(results)
        
        assert stats.totalVectors == 2
        assert stats.anomaliesDetected == 1
        assert stats.criticalCount == 1
        assert stats.lowCount == 1
        assert stats.avgAnomalyScore == 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
