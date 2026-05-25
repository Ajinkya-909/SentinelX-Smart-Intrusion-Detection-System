"""
Pytest configuration and shared fixtures.
"""

import pytest
import numpy as np
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def test_client():
    """Create test client for FastAPI"""
    return TestClient(app)


@pytest.fixture
def sample_feature_vector():
    """Sample feature vector for testing"""
    return {
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
    }


@pytest.fixture
def sample_anomalous_vector():
    """Sample anomalous feature vector"""
    return {
        "entity": "ip:192.168.1.100",
        "failedLoginAttempts": 200,
        "totalRequests": 500,
        "requestVelocity": 50.0,
        "errorRate": 0.80,
        "entropySrcPorts": 0.90,
        "uniqueEndpoints": 2,
        "authSuccessRate": 0.10,
        "httpErrorCount": 400,
        "avgResponseTime": 60,
        "timestamp": "2026-05-25T10:00:00Z"
    }


@pytest.fixture
def sample_numpy_array():
    """Sample numpy array for ML operations"""
    return np.array([
        [1.0, 10.0, 100.0],
        [2.0, 20.0, 200.0],
        [3.0, 30.0, 300.0]
    ])


@pytest.fixture
def feature_names():
    """Standard feature names for testing"""
    return [
        "failedLoginAttempts",
        "totalRequests",
        "requestVelocity",
        "errorRate",
        "entropySrcPorts",
        "uniqueEndpoints",
        "authSuccessRate",
        "httpErrorCount",
        "avgResponseTime"
    ]


# Pytest configuration
def pytest_configure(config):
    """Pytest configuration hook"""
    config.addinivalue_line(
        "markers",
        "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers",
        "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers",
        "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers",
        "slow: mark test as slow"
    )
