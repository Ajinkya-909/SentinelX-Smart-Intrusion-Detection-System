"""
End-to-end tests for the complete ML analysis pipeline.
Tests realistic scenarios and data flows.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestEndToEndPipeline:
    """Test suite for end-to-end pipeline scenarios"""
    
    def test_normal_traffic_analysis(self):
        """Test analysis of normal user traffic"""
        request = {
            "vectors": [
                {
                    "entity": "ip:10.0.0.5",
                    "failedLoginAttempts": 0,
                    "totalRequests": 50,
                    "requestVelocity": 5.0,
                    "errorRate": 0.02,
                    "entropySrcPorts": 0.2,
                    "uniqueEndpoints": 3,
                    "authSuccessRate": 1.0,
                    "httpErrorCount": 1,
                    "avgResponseTime": 300,
                },
                {
                    "entity": "user:alice",
                    "loginTimeConcentration": 0.3,
                    "uniqueIPs": 1,
                    "avgSessionDuration": 2000,
                    "totalDataTransferred": 10000000,
                    "concurrentSessions": 1,
                    "uniqueResources": 20,
                    "uniqueEndpoints": 15,
                    "successfulLogins": 100,
                    "failedLoginAttempts": 0,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["statistics"]["anomaliesDetected"] <= 1
    
    def test_brute_force_attack_detection(self):
        """Test detection of brute force attack"""
        request = {
            "vectors": [
                {
                    "entity": "ip:192.168.1.100",
                    "failedLoginAttempts": 500,  # Many failed attempts
                    "totalRequests": 1000,
                    "requestVelocity": 100.0,  # High velocity
                    "errorRate": 0.85,
                    "entropySrcPorts": 0.95,
                    "uniqueEndpoints": 1,  # Single endpoint
                    "authSuccessRate": 0.02,  # Low success rate
                    "httpErrorCount": 850,
                    "avgResponseTime": 50,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        # Should detect anomaly
        assert len(data["results"]) > 0
        result = data["results"][0]
        assert result["risk"] in ["CRITICAL", "HIGH"]
    
    def test_data_exfiltration_detection(self):
        """Test detection of data exfiltration"""
        request = {
            "vectors": [
                {
                    "entity": "user:bob",
                    "loginTimeConcentration": 0.1,  # Unusual login time
                    "uniqueIPs": 1,
                    "avgSessionDuration": 3600,  # Long session
                    "totalDataTransferred": 5000000000,  # Huge data transfer
                    "concurrentSessions": 1,
                    "uniqueResources": 100,  # Many resources accessed
                    "uniqueEndpoints": 50,
                    "successfulLogins": 1,
                    "failedLoginAttempts": 0,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) > 0
    
    def test_insider_threat_detection(self):
        """Test detection of insider threat behavior"""
        request = {
            "vectors": [
                {
                    "entity": "user:charlie",
                    "loginTimeConcentration": 0.9,  # Always same time
                    "uniqueIPs": 5,  # Multiple IPs (unusual)
                    "avgSessionDuration": 500,
                    "totalDataTransferred": 100000000,  # Large transfers
                    "concurrentSessions": 3,  # Multiple concurrent
                    "uniqueResources": 50,  # Many resources
                    "uniqueEndpoints": 40,
                    "successfulLogins": 80,
                    "failedLoginAttempts": 0,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
    
    def test_port_scanning_detection(self):
        """Test detection of port scanning activity"""
        request = {
            "vectors": [
                {
                    "entity": "ip:172.16.0.50",
                    "failedLoginAttempts": 0,
                    "totalRequests": 5000,  # Many requests
                    "requestVelocity": 500.0,  # Very high velocity
                    "errorRate": 0.95,  # High error rate
                    "entropySrcPorts": 0.99,  # High port diversity
                    "uniqueEndpoints": 200,  # Many endpoints
                    "authSuccessRate": 0.0,  # No auth
                    "httpErrorCount": 4750,
                    "avgResponseTime": 100,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) > 0
    
    def test_mixed_normal_and_anomalous(self):
        """Test analysis with mix of normal and anomalous traffic"""
        request = {
            "vectors": [
                # Normal IP
                {
                    "entity": "ip:10.0.0.1",
                    "failedLoginAttempts": 1,
                    "totalRequests": 60,
                    "requestVelocity": 6.0,
                    "errorRate": 0.01,
                    "entropySrcPorts": 0.15,
                    "uniqueEndpoints": 4,
                    "authSuccessRate": 0.99,
                    "httpErrorCount": 1,
                    "avgResponseTime": 280,
                },
                # Anomalous IP
                {
                    "entity": "ip:203.0.113.50",
                    "failedLoginAttempts": 300,
                    "totalRequests": 800,
                    "requestVelocity": 80.0,
                    "errorRate": 0.9,
                    "entropySrcPorts": 0.95,
                    "uniqueEndpoints": 1,
                    "authSuccessRate": 0.05,
                    "httpErrorCount": 720,
                    "avgResponseTime": 40,
                },
                # Normal User
                {
                    "entity": "user:diane",
                    "loginTimeConcentration": 0.4,
                    "uniqueIPs": 1,
                    "avgSessionDuration": 1800,
                    "totalDataTransferred": 50000000,
                    "concurrentSessions": 1,
                    "uniqueResources": 15,
                    "uniqueEndpoints": 10,
                    "successfulLogins": 50,
                    "failedLoginAttempts": 1,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) >= 3
        assert data["statistics"]["totalVectors"] == 3
        
        # Check that anomalous cases are detected
        risks = [r["risk"] for r in data["results"]]
        assert any(risk in ["CRITICAL", "HIGH"] for risk in risks)
    
    def test_session_based_anomaly(self):
        """Test session-level anomaly detection"""
        request = {
            "vectors": [
                {
                    "entity": "session:sess_12345",
                    "requestsPerSecond": 200.0,  # Extreme velocity
                    "uniqueEndpoints": 150,
                    "avgResponseTime": 20,
                    "errorCount": 100,
                    "sessionDuration": 60,
                    "resourceCount": 200,
                    "dataTransferred": 1000000000,  # Huge data
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) > 0
    
    def test_response_contains_actionable_reasons(self):
        """Test that findings contain actionable reasons"""
        request = {
            "vectors": [
                {
                    "entity": "ip:192.168.50.50",
                    "failedLoginAttempts": 200,
                    "totalRequests": 500,
                    "requestVelocity": 50.0,
                    "errorRate": 0.80,
                    "entropySrcPorts": 0.90,
                    "uniqueEndpoints": 2,
                    "authSuccessRate": 0.10,
                    "httpErrorCount": 400,
                    "avgResponseTime": 60,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        data = response.json()
        
        result = data["results"][0]
        assert len(result["reasons"]) > 0
        
        for reason in result["reasons"]:
            assert isinstance(reason, str)
            assert len(reason) > 0
    
    def test_multiple_attack_vectors(self):
        """Test system response to multiple attack vectors simultaneously"""
        request = {
            "vectors": [
                # Brute force attempt
                {
                    "entity": "ip:malicious1",
                    "failedLoginAttempts": 400,
                    "totalRequests": 800,
                    "requestVelocity": 80.0,
                    "errorRate": 0.95,
                    "entropySrcPorts": 0.98,
                    "uniqueEndpoints": 1,
                    "authSuccessRate": 0.02,
                    "httpErrorCount": 760,
                    "avgResponseTime": 30,
                },
                # Port scanner
                {
                    "entity": "ip:malicious2",
                    "failedLoginAttempts": 0,
                    "totalRequests": 3000,
                    "requestVelocity": 300.0,
                    "errorRate": 0.99,
                    "entropySrcPorts": 0.99,
                    "uniqueEndpoints": 300,
                    "authSuccessRate": 0.0,
                    "httpErrorCount": 2970,
                    "avgResponseTime": 50,
                },
                # Data exfiltration user
                {
                    "entity": "user:malicious",
                    "loginTimeConcentration": 0.05,
                    "uniqueIPs": 1,
                    "avgSessionDuration": 7200,
                    "totalDataTransferred": 10000000000,
                    "concurrentSessions": 1,
                    "uniqueResources": 200,
                    "uniqueEndpoints": 100,
                    "successfulLogins": 10,
                    "failedLoginAttempts": 0,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["results"]) >= 3
        assert data["statistics"]["anomaliesDetected"] >= 2
    
    def test_statistical_consistency(self):
        """Test that statistics are consistent with results"""
        request = {
            "vectors": [
                {
                    "entity": f"ip:10.0.0.{i}",
                    "failedLoginAttempts": 5 + i,
                    "totalRequests": 100 + i * 10,
                    "requestVelocity": 10.0 + i,
                    "errorRate": 0.05 + i * 0.01,
                    "entropySrcPorts": 0.3 + i * 0.05,
                    "uniqueEndpoints": 5,
                    "authSuccessRate": 0.95,
                    "httpErrorCount": 2,
                    "avgResponseTime": 250,
                }
                for i in range(10)
            ]
        }
        
        response = client.post("/analyze", json=request)
        data = response.json()
        
        stats = data["statistics"]
        assert stats["totalVectors"] == 10
        
        # Count risks from results
        risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for result in data["results"]:
            risk_counts[result["risk"]] += 1
        
        # Verify counts match statistics
        assert risk_counts["CRITICAL"] == stats["criticalCount"]
        assert risk_counts["HIGH"] == stats["highCount"]
        assert risk_counts["MEDIUM"] == stats["mediumCount"]
        assert risk_counts["LOW"] == stats["lowCount"]


class TestErrorRecovery:
    """Test suite for error handling and recovery"""
    
    def test_graceful_handling_of_missing_optional_fields(self):
        """Test that missing optional fields are handled gracefully"""
        request = {
            "vectors": [
                {
                    "entity": "ip:192.168.1.1",
                    "failedLoginAttempts": 5,
                    # Other fields missing
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        # Should either succeed with defaults or return proper error
        assert response.status_code in [200, 400, 422]
    
    def test_extreme_values_handling(self):
        """Test handling of extreme values"""
        request = {
            "vectors": [
                {
                    "entity": "ip:192.168.1.1",
                    "failedLoginAttempts": 999999,
                    "totalRequests": 999999,
                    "requestVelocity": 999999.0,
                    "errorRate": 1.0,
                    "entropySrcPorts": 1.0,
                    "uniqueEndpoints": 1000,
                    "authSuccessRate": 0.0,
                    "httpErrorCount": 999999,
                    "avgResponseTime": 999999,
                }
            ]
        }
        
        response = client.post("/analyze", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
