#!/usr/bin/env python
"""
Test runner script for SentinelX ML Service.
Runs all tests with proper configuration and reporting.
"""

import subprocess
import sys
import os


def run_tests():
    """Run all tests with coverage reporting"""
    
    print("=" * 70)
    print("SentinelX ML Service - Test Suite Runner")
    print("=" * 70)
    
    # Determine project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Change to project root
    os.chdir(project_root)
    
    # Test configurations - use -m pytest to ensure pytest module is found
    test_configs = [
        {
            "name": "Unit Tests",
            "command": [sys.executable, "-m", "pytest", 
                       "tests/test_isolation_forest_service.py", 
                       "tests/test_dbscan_service.py",
                       "tests/test_preprocessing_service.py",
                       "tests/test_orchestrator_service.py",
                       "-v", "--tb=short"]
        },
        {
            "name": "Integration Tests (API)",
            "command": [sys.executable, "-m", "pytest", "tests/test_api_endpoints.py", "-v", "--tb=short"]
        },
        {
            "name": "End-to-End Tests",
            "command": [sys.executable, "-m", "pytest", "tests/test_e2e_pipeline.py", "-v", "--tb=short"]
        },
        {
            "name": "Performance Tests",
            "command": [sys.executable, "-m", "pytest", "tests/test_load_performance.py", "-v", "--tb=short", "-m", "not slow"]
        },
    ]
    
    results = {}
    
    for config in test_configs:
        print(f"\n{'=' * 70}")
        print(f"Running: {config['name']}")
        print(f"{'=' * 70}\n")
        
        try:
            result = subprocess.run(config["command"], capture_output=False)
            results[config["name"]] = "PASSED" if result.returncode == 0 else "FAILED"
        except Exception as e:
            print(f"Error running {config['name']}: {e}")
            results[config["name"]] = "ERROR"
    
    # Print summary
    print(f"\n{'=' * 70}")
    print("Test Summary")
    print(f"{'=' * 70}")
    
    for name, status in results.items():
        status_symbol = "✓" if status == "PASSED" else "✗"
        print(f"{status_symbol} {name}: {status}")
    
    # Overall result
    all_passed = all(status == "PASSED" for status in results.values())
    
    print(f"\n{'=' * 70}")
    if all_passed:
        print("All tests PASSED ✓")
        return 0
    else:
        print("Some tests FAILED ✗")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
