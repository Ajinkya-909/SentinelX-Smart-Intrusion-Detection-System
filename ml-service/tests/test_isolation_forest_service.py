"""
Unit tests for Isolation Forest service.
Tests anomaly detection using Isolation Forest algorithm.
"""

import pytest
import numpy as np
from typing import List, Dict

from app.services.isolation_forest_service import isolation_forest_service
from app.schemas.response import MLResult


class TestIsolationForestService:
    """Test suite for IsolationForestService"""
    
    @pytest.fixture
    def sample_vectors(self):
        """Create sample feature vectors for testing"""
        return [
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
                "timestamp": "2026-05-25T10:00:00Z"
            },
            {
                "entity": "ip:192.168.1.2",
                "failedLoginAttempts": 82,  # Anomalous
                "totalRequests": 450,
                "requestVelocity": 45.0,
                "errorRate": 0.71,
                "entropySrcPorts": 0.9,
                "uniqueEndpoints": 1,
                "authSuccessRate": 0.05,
                "httpErrorCount": 32,
                "avgResponseTime": 50,
                "timestamp": "2026-05-25T10:00:00Z"
            },
            {
                "entity": "ip:192.168.1.3",
                "failedLoginAttempts": 3,
                "totalRequests": 95,
                "requestVelocity": 9.5,
                "errorRate": 0.02,
                "entropySrcPorts": 0.25,
                "uniqueEndpoints": 4,
                "authSuccessRate": 0.98,
                "httpErrorCount": 1,
                "avgResponseTime": 280,
                "timestamp": "2026-05-25T10:00:00Z"
            }
        ]
    
    @pytest.fixture
    def feature_names(self):
        """List of feature names"""
        return [
            "failedLoginAttempts", "totalRequests", "requestVelocity", "errorRate",
            "entropySrcPorts", "uniqueEndpoints", "authSuccessRate", "httpErrorCount",
            "avgResponseTime"
        ]
    
    def test_analyze_basic(self, sample_vectors, feature_names):
        """Test basic analysis with normal vectors"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        assert len(results) == 3
        assert all(isinstance(r, MLResult) for r in results)
        assert all(0 <= r.anomalyScore <= 1 for r in results)
    
    def test_analyze_detects_anomalies(self, sample_vectors, feature_names):
        """Test that anomalies are properly detected"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],  # Should be anomaly
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        # Second vector should have higher anomaly score
        assert results[1].anomalyScore > results[0].anomalyScore
        assert results[1].anomalyScore > results[2].anomalyScore
    
    def test_analyze_risk_levels(self, sample_vectors, feature_names):
        """Test risk level assignment"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        # Check risk levels are valid
        for result in results:
            assert result.risk in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    
    def test_analyze_feature_contributions(self, sample_vectors, feature_names):
        """Test feature contribution tracking"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        # Check feature contributions exist
        for result in results:
            assert len(result.featureContributions) > 0
            assert len(result.topAnomalousFeatures) > 0
    
    def test_analyze_confidence_scores(self, sample_vectors, feature_names):
        """Test confidence score generation"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        # Check confidence scores
        for result in results:
            assert 0 <= result.confidence <= 1
    
    def test_analyze_reasons_provided(self, sample_vectors, feature_names):
        """Test that reasons are provided for anomalies"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert len(result.reasons) > 0
            assert all(isinstance(r, str) for r in result.reasons)
    
    def test_analyze_detection_method(self, sample_vectors, feature_names):
        """Test detection method is set correctly"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert result.detectionMethod == "IsolationForest"
    
    def test_analyze_entities_match(self, sample_vectors, feature_names):
        """Test that result entities match input vectors"""
        X_scaled = np.array([
            [0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25],
            [0.9, 0.9, 0.9, 0.71, 0.9, 0.1, 0.05, 0.9, 0.5],
            [0.05, 0.19, 0.29, 0.02, 0.25, 0.4, 0.98, 0.11, 0.28]
        ])
        
        results = isolation_forest_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for i, result in enumerate(results):
            assert result.entity == sample_vectors[i]["entity"]
    
    def test_analyze_empty_vectors(self, feature_names):
        """Test error handling with empty vectors"""
        with pytest.raises(Exception):
            isolation_forest_service.analyze([], feature_names, np.array([]))
    
    def test_analyze_single_vector(self, sample_vectors, feature_names):
        """Test analysis with single vector"""
        X_scaled = np.array([[0.1, 0.2, 0.3, 0.05, 0.3, 0.5, 0.95, 0.2, 0.25]])
        
        results = isolation_forest_service.analyze(
            [sample_vectors[0]], feature_names, X_scaled
        )
        
        assert len(results) == 1
        assert results[0].entity == sample_vectors[0]["entity"]
    
    def test_analyze_many_vectors(self, sample_vectors, feature_names):
        """Test analysis with many vectors"""
        # Create 100 vectors
        vectors = []
        X_data = []
        
        for i in range(100):
            vectors.append({
                "entity": f"ip:192.168.1.{i}",
                "failedLoginAttempts": 5 + (i % 10),
                "totalRequests": 100 + (i * 2),
                "requestVelocity": 10.5 + (i * 0.1),
                "errorRate": 0.05 + (i * 0.001),
                "entropySrcPorts": 0.3 + (i * 0.002),
                "uniqueEndpoints": 5,
                "authSuccessRate": 0.95,
                "httpErrorCount": 2,
                "avgResponseTime": 250,
                "timestamp": "2026-05-25T10:00:00Z"
            })
            X_data.append([
                (5 + i % 10) / 100,
                (100 + i * 2) / 1000,
                10.5 + i * 0.1,
                0.05 + i * 0.001,
                0.3 + i * 0.002,
                5 / 10,
                0.95,
                2 / 100,
                250 / 1000
            ])
        
        X_scaled = np.array(X_data)
        results = isolation_forest_service.analyze(vectors, feature_names, X_scaled)
        
        assert len(results) == 100
        assert all(isinstance(r, MLResult) for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
