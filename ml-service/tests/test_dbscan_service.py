"""
Unit tests for DBSCAN service.
Tests clustering-based anomaly detection using DBSCAN.
"""

import pytest
import numpy as np

from app.services.dbscan_service import dbscan_service
from app.schemas.response import MLResult


class TestDBSCANService:
    """Test suite for DBSCANService"""
    
    @pytest.fixture
    def sample_vectors(self):
        """Create sample feature vectors for testing"""
        return [
            {
                "entity": "session:xyz1",
                "requestsPerSecond": 5,
                "uniqueEndpoints": 4,
                "avgResponseTime": 250,
                "errorCount": 0,
                "sessionDuration": 600,
                "resourceCount": 10,
                "dataTransferred": 1024000,
                "timestamp": "2026-05-25T10:00:00Z"
            },
            {
                "entity": "session:xyz2",
                "requestsPerSecond": 4,
                "uniqueEndpoints": 3,
                "avgResponseTime": 240,
                "errorCount": 1,
                "sessionDuration": 580,
                "resourceCount": 9,
                "dataTransferred": 1000000,
                "timestamp": "2026-05-25T10:00:00Z"
            },
            {
                "entity": "session:xyz3",
                "requestsPerSecond": 95,  # Anomalous
                "uniqueEndpoints": 1,
                "avgResponseTime": 50,
                "errorCount": 25,
                "sessionDuration": 120,
                "resourceCount": 1,
                "dataTransferred": 10000000,
                "timestamp": "2026-05-25T10:00:00Z"
            }
        ]
    
    @pytest.fixture
    def feature_names(self):
        """List of feature names"""
        return [
            "requestsPerSecond", "uniqueEndpoints", "avgResponseTime",
            "errorCount", "sessionDuration", "resourceCount", "dataTransferred"
        ]
    
    def test_analyze_basic(self, sample_vectors, feature_names):
        """Test basic DBSCAN analysis"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]  # Anomalous
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        assert len(results) == 3
        assert all(isinstance(r, MLResult) for r in results)
        assert all(0 <= r.anomalyScore <= 1 for r in results)
    
    def test_analyze_detects_outliers(self, sample_vectors, feature_names):
        """Test that outliers are detected"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]  # Anomalous
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        # Third vector should be outlier with high anomaly score
        assert results[2].anomalyScore > results[0].anomalyScore
        assert results[2].anomalyScore > results[1].anomalyScore
    
    def test_analyze_risk_levels(self, sample_vectors, feature_names):
        """Test risk level assignment"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert result.risk in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    
    def test_analyze_feature_contributions(self, sample_vectors, feature_names):
        """Test feature contribution tracking"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert len(result.featureContributions) > 0
            assert len(result.topAnomalousFeatures) >= 0
    
    def test_analyze_confidence_scores(self, sample_vectors, feature_names):
        """Test confidence score generation"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert 0 <= result.confidence <= 1
    
    def test_analyze_reasons_provided(self, sample_vectors, feature_names):
        """Test that reasons are provided"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert len(result.reasons) > 0
            assert all(isinstance(r, str) for r in result.reasons)
    
    def test_analyze_detection_method(self, sample_vectors, feature_names):
        """Test detection method is set correctly"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for result in results:
            assert result.detectionMethod == "DBSCAN"
    
    def test_analyze_entities_match(self, sample_vectors, feature_names):
        """Test that result entities match input vectors"""
        X_scaled = np.array([
            [0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1],
            [0.04, 0.3, 0.24, 0.01, 0.58, 0.09, 0.1],
            [0.95, 0.1, 0.05, 0.25, 0.12, 0.01, 1.0]
        ])
        
        results = dbscan_service.analyze(sample_vectors, feature_names, X_scaled)
        
        for i, result in enumerate(results):
            assert result.entity == sample_vectors[i]["entity"]
    
    def test_analyze_single_vector(self, sample_vectors, feature_names):
        """Test analysis with single vector"""
        X_scaled = np.array([[0.05, 0.4, 0.25, 0.0, 0.6, 0.1, 0.1]])
        
        results = dbscan_service.analyze(
            [sample_vectors[0]], feature_names, X_scaled
        )
        
        assert len(results) == 1
        assert results[0].entity == sample_vectors[0]["entity"]
    
    def test_analyze_clustered_data(self, feature_names):
        """Test analysis with clear clusters"""
        # Two clusters and one outlier
        vectors = [
            {"entity": f"s{i}", **{}} for i in range(20)
        ]
        
        # Create data with clear clusters
        X_scaled = np.vstack([
            np.random.normal(0.1, 0.02, (10, 7)),  # Cluster 1
            np.random.normal(0.8, 0.02, (10, 7))   # Cluster 2
        ])
        
        results = dbscan_service.analyze(vectors, feature_names, X_scaled)
        
        assert len(results) == 20
        assert all(isinstance(r, MLResult) for r in results)
    
    def test_analyze_many_vectors(self, sample_vectors, feature_names):
        """Test analysis with many vectors"""
        vectors = []
        X_data = []
        
        for i in range(100):
            vectors.append({
                "entity": f"session:xyz{i}",
                "requestsPerSecond": 5 + (i % 10),
                "uniqueEndpoints": 4,
                "avgResponseTime": 250,
                "errorCount": 0,
                "sessionDuration": 600,
                "resourceCount": 10,
                "dataTransferred": 1024000,
                "timestamp": "2026-05-25T10:00:00Z"
            })
            X_data.append([
                (5 + i % 10) / 100,
                0.4,
                0.25,
                0.0,
                0.6,
                0.1,
                0.1
            ])
        
        X_scaled = np.array(X_data)
        results = dbscan_service.analyze(vectors, feature_names, X_scaled)
        
        assert len(results) == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
