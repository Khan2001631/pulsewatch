"""
Health Check Endpoint Tests.

This file contains assertions verifying that the application's base health check 
endpoint (/health) is fully functional and returns the correct response payload.
"""

from fastapi.testclient import TestClient

def test_health_endpoint(client: TestClient) -> None:
    """
    Test that the /health route is functional.
    
    Verifies:
    1. HTTP response status code is 200 (OK).
    2. Response body contains the expected JSON structure and keys.
    """
    # 1. Dispatch a GET request to the health endpoint
    response = client.get("/health")
    
    # 2. Assert that the status code is exactly 200
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    
    # 3. Assert that the response body is exactly the expected JSON format
    expected_payload = {
        "status": "healthy",
        "app": "PulseWatch"
    }
    assert response.json() == expected_payload, f"Expected {expected_payload}, got {response.json()}"
