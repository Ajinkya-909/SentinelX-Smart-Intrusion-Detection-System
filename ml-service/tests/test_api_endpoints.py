"""
Integration tests for FastAPI endpoints.
Tests the /health and /analyze endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestHealthEndpoint:
    """Test suite for /health endpoint"""
    
    def test_health_endpoint_returns_200(self):
        """Test that health endpoint returns 200 OK"""
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_endpoint_structure(self):
        """Test health response structure"""
        response = client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert "service" in data
        assert "timestamp" in data
    
    def test_health_endpoint_status_healthy(self):
        """Test that health status is healthy"""
        response = client.get("/health")
        data = response.json()
        
        assert data["status"] == "healthy"
    
    def test_health_endpoint_service_name(self):
        """Test service name in health response"""
        response = client.get("/health")
        data = response.json()
        
        assert "sentinelx-ml-service" in data["service"].lower()


class TestAnalyzeEndpoint:
    """Test suite for /analyze endpoint"""
    
    @pytest.fixture
    def valid_request(self):
        """Create valid analysis request"""
        return {
            "vectors": [
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
        }
    
    def test_analyze_valid_request(self, valid_request):
        """Test analyze endpoint with valid request"""
        response = client.post("/analyze", json=valid_request)
        assert response.status_code == 200
    
    def test_analyze_response_structure(self, valid_request):
        """Test analyze response structure"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        assert "status" in data
        assert "model" in data
        assert "analysisId" in data
        assert "timestamp" in data
        assert "vectorsProcessed" in data
        assert "results" in data
        assert "statistics" in data
    
    def test_analyze_success_status(self, valid_request):
        """Test successful analysis status"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        assert data["status"] == "success"
    
    def test_analyze_results_count(self, valid_request):
        """Test results count matches vectors"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        assert len(data["results"]) >= 1
        assert data["vectorsProcessed"] == len(valid_request["vectors"])
    
    def test_analyze_result_structure(self, valid_request):
        """Test individual result structure"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        for result in data["results"]:
            assert "entity" in result
            assert "anomalyScore" in result
            assert "risk" in result
            assert "confidence" in result
            assert "reasons" in result
            assert "detectionMethod" in result
    
    def test_analyze_risk_levels_valid(self, valid_request):
        """Test risk levels are valid"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        valid_risks = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        for result in data["results"]:
            assert result["risk"] in valid_risks
    
    def test_analyze_anomaly_scores_range(self, valid_request):
        """Test anomaly scores are in valid range"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        
        for result in data["results"]:
            assert 0 <= result["anomalyScore"] <= 1
            assert 0 <= result["confidence"] <= 1
    
    def test_analyze_statistics_structure(self, valid_request):
        """Test statistics structure"""
        response = client.post("/analyze", json=valid_request)
        data = response.json()
        stats = data["statistics"]
        
        assert "totalVectors" in stats
        assert "anomaliesDetected" in stats
        assert "criticalCount" in stats
        assert "highCount" in stats
        assert "mediumCount" in stats
        assert "lowCount" in stats
        assert "avgAnomalyScore" in stats
    
    def test_analyze_empty_vectors(self):
        """Test error handling with empty vectors"""
        request = {"vectors": []}
        response = client.post("/analyze", json=request)
        
        assert response.status_code == 400
    
    def test_analyze_invalid_json(self):
        """Test error handling with invalid JSON"""
        response = client.post(
            "/analyze",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code >= 400
    
    def test_analyze_missing_vectors_field(self):
        """Test error handling with missing vectors field"""
        request = {"someOtherField": []}
        response = client.post("/analyze", json=request)
        
        assert response.status_code >= 400
    
    def test_analyze_with_single_vector(self):
        """Test analyze with single vector"""
        request = {
            "vectors": [
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
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) >= 1
    
    def test_analyze_multiple_entity_types(self):
        """Test analyze with multiple entity types"""
        request = {
            "vectors": [
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
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
    
    def test_analyze_response_has_analysis_id(self, valid_request):
        """Test that response has unique analysis ID"""
        response1 = client.post("/analyze", json=valid_request)
        response2 = client.post("/analyze", json=valid_request)
        
        id1 = response1.json()["analysisId"]
        id2 = response2.json()["analysisId"]
        
        assert id1 != id2


class TestRootEndpoint:
    """Test suite for root endpoint"""
    
    def test_root_endpoint_returns_200(self):
        """Test that root endpoint returns 200"""
        response = client.get("/")
        assert response.status_code == 200
    
    def test_root_endpoint_has_service_info(self):
        """Test root endpoint response structure"""
        response = client.get("/")
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "status" in data


class TestEndpointIntegration:
    """Test suite for endpoint integration"""
    
    def test_health_then_analyze(self):
        """Test health check followed by analysis"""
        health = client.get("/health")
        assert health.status_code == 200
        
        request = {
            "vectors": [
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
                }
            ]
        }
        
        analyze = client.post("/analyze", json=request)
        assert analyze.status_code == 200
    
    def test_concurrent_requests(self):
        """Test service handles concurrent requests"""
        request = {
            "vectors": [
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
                }
            ]
        }
        
        responses = [client.post("/analyze", json=request) for _ in range(5)]
        
        assert all(r.status_code == 200 for r in responses)
        assert len(set(r.json()["analysisId"] for r in responses)) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
