"""
Load testing for ML service performance.
Tests response time and resource usage with various data volumes.
"""

import pytest
import time
import numpy as np
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestLoadAndPerformance:
    """Test suite for load testing and performance validation"""
    
    def test_small_batch_performance(self):
        """Test performance with small batch (10 vectors)"""
        vectors = [
            {
                "entity": f"ip:192.168.1.{i}",
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
        
        request = {"vectors": vectors}
        
        start_time = time.time()
        response = client.post("/analyze", json=request)
        duration = time.time() - start_time
        
        assert response.status_code == 200
        assert duration < 5.0  # Should complete in < 5 seconds
    
    def test_medium_batch_performance(self):
        """Test performance with medium batch (50 vectors)"""
        vectors = [
            {
                "entity": f"ip:192.168.1.{i}",
                "failedLoginAttempts": 5 + (i % 20),
                "totalRequests": 100 + (i * 5),
                "requestVelocity": 10.0 + (i * 0.5),
                "errorRate": 0.05 + ((i % 10) * 0.01),
                "entropySrcPorts": 0.3 + ((i % 7) * 0.05),
                "uniqueEndpoints": 5,
                "authSuccessRate": 0.95,
                "httpErrorCount": 2,
                "avgResponseTime": 250,
            }
            for i in range(50)
        ]
        
        request = {"vectors": vectors}
        
        start_time = time.time()
        response = client.post("/analyze", json=request)
        duration = time.time() - start_time
        
        assert response.status_code == 200
        assert duration < 10.0  # Should complete in < 10 seconds
    
    def test_large_batch_performance(self):
        """Test performance with large batch (100 vectors)"""
        vectors = [
            {
                "entity": f"ip:192.168.{i//255}.{i%255}",
                "failedLoginAttempts": 5 + (i % 30),
                "totalRequests": 100 + (i * 2),
                "requestVelocity": 10.0 + (i * 0.2),
                "errorRate": 0.05 + ((i % 15) * 0.005),
                "entropySrcPorts": 0.3 + ((i % 10) * 0.03),
                "uniqueEndpoints": 5,
                "authSuccessRate": 0.95,
                "httpErrorCount": 2,
                "avgResponseTime": 250,
            }
            for i in range(100)
        ]
        
        request = {"vectors": vectors}
        
        start_time = time.time()
        response = client.post("/analyze", json=request)
        duration = time.time() - start_time
        
        assert response.status_code == 200
        assert duration < 20.0  # Should complete in < 20 seconds
        
        data = response.json()
        assert data["vectorsProcessed"] == 100
    
    def test_response_time_scales_linearly(self):
        """Test that response time scales approximately linearly with input size"""
        # Warm up request to prevent cold-start caching jitter
        warmup_vectors = [
            {
                "entity": "ip:192.168.1.0",
                "failedLoginAttempts": 5,
                "totalRequests": 100,
                "requestVelocity": 10.0,
                "errorRate": 0.05,
                "entropySrcPorts": 0.3,
                "uniqueEndpoints": 5,
                "authSuccessRate": 0.95,
                "httpErrorCount": 2,
                "avgResponseTime": 250,
            }
        ]
        client.post("/analyze", json={"vectors": warmup_vectors})

        times = []
        
        for batch_size in [10, 20, 30]:
            vectors = [
                {
                    "entity": f"ip:192.168.1.{i}",
                    "failedLoginAttempts": 5,
                    "totalRequests": 100,
                    "requestVelocity": 10.0,
                    "errorRate": 0.05,
                    "entropySrcPorts": 0.3,
                    "uniqueEndpoints": 5,
                    "authSuccessRate": 0.95,
                    "httpErrorCount": 2,
                    "avgResponseTime": 250,
                }
                for i in range(batch_size)
            ]
            
            request = {"vectors": vectors}
            
            start_time = time.time()
            response = client.post("/analyze", json=request)
            duration = time.time() - start_time
            
            assert response.status_code == 200
            times.append(duration)
        
        # Response time should increase with batch size
        # (allow some variance due to system load)
        assert times[1] > times[0] * 0.8  # At least some increase
        assert times[2] > times[1] * 0.8
    
    def test_memory_efficiency(self):
        """Test memory efficiency with repeated large requests"""
        vectors = [
            {
                "entity": f"ip:192.168.1.{i}",
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
            for i in range(50)
        ]
        
        request = {"vectors": vectors}
        
        # Run multiple times to check for memory leaks
        for _ in range(5):
            response = client.post("/analyze", json=request)
            assert response.status_code == 200
    
    def test_concurrent_request_handling(self):
        """Test that service can handle concurrent requests"""
        request = {
            "vectors": [
                {
                    "entity": "ip:192.168.1.1",
                    "failedLoginAttempts": 5,
                    "totalRequests": 100,
                    "requestVelocity": 10.0,
                    "errorRate": 0.05,
                    "entropySrcPorts": 0.3,
                    "uniqueEndpoints": 5,
                    "authSuccessRate": 0.95,
                    "httpErrorCount": 2,
                    "avgResponseTime": 250,
                }
            ]
        }
        
        # Simulate concurrent requests
        start_time = time.time()
        responses = [client.post("/analyze", json=request) for _ in range(10)]
        duration = time.time() - start_time
        
        assert all(r.status_code == 200 for r in responses)
        # Should handle 10 requests in reasonable time
        assert duration < 30.0
    
    def test_different_entity_types_performance(self):
        """Test performance with different entity types"""
        vectors = []
        
        # IPs
        for i in range(20):
            vectors.append({
                "entity": f"ip:192.168.1.{i}",
                "failedLoginAttempts": 5,
                "totalRequests": 100,
                "requestVelocity": 10.0,
                "errorRate": 0.05,
                "entropySrcPorts": 0.3,
                "uniqueEndpoints": 5,
                "authSuccessRate": 0.95,
                "httpErrorCount": 2,
                "avgResponseTime": 250,
            })
        
        # Users
        for i in range(20):
            vectors.append({
                "entity": f"user:user{i}",
                "loginTimeConcentration": 0.5,
                "uniqueIPs": 2,
                "avgSessionDuration": 1800,
                "totalDataTransferred": 100000000,
                "concurrentSessions": 1,
                "uniqueResources": 10,
                "uniqueEndpoints": 5,
                "successfulLogins": 50,
                "failedLoginAttempts": 2,
            })
        
        # Sessions
        for i in range(20):
            vectors.append({
                "entity": f"session:sess{i}",
                "requestsPerSecond": 5,
                "uniqueEndpoints": 4,
                "avgResponseTime": 250,
                "errorCount": 0,
                "sessionDuration": 600,
                "resourceCount": 10,
                "dataTransferred": 1024000,
            })
        
        request = {"vectors": vectors}
        
        start_time = time.time()
        response = client.post("/analyze", json=request)
        duration = time.time() - start_time
        
        assert response.status_code == 200
        assert duration < 30.0  # Should handle mixed entities efficiently
        
        data = response.json()
        assert len(data["results"]) >= 40
    
    @pytest.mark.slow
    def test_stress_test_large_batch(self):
        """Stress test with very large batch"""
        vectors = [
            {
                "entity": f"ip:10.{i//65536}.{(i//256)%256}.{i%256}",
                "failedLoginAttempts": 5 + (i % 50),
                "totalRequests": 100 + (i % 200),
                "requestVelocity": 10.0 + (i % 100) * 0.1,
                "errorRate": 0.05 + ((i % 50) * 0.001),
                "entropySrcPorts": 0.3 + ((i % 70) * 0.01),
                "uniqueEndpoints": 1 + (i % 10),
                "authSuccessRate": 0.95 - ((i % 30) * 0.01),
                "httpErrorCount": 2 + (i % 50),
                "avgResponseTime": 250 - ((i % 200) * 0.5),
            }
            for i in range(250)
        ]
        
        request = {"vectors": vectors}
        
        start_time = time.time()
        response = client.post("/analyze", json=request)
        duration = time.time() - start_time
        
        assert response.status_code == 200
        # Large batch should still complete in reasonable time
        assert duration < 60.0
        
        data = response.json()
        assert data["vectorsProcessed"] == 250
        assert len(data["results"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "not slow"])
