"""
Pytest Shared Configuration and Fixtures Module.

This file (conftest.py) exists to define shared fixtures, hooks, and plugins
available to all test files in the tests/ directory structure.
Pytest automatically loads this module when it starts running.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

@pytest.fixture(scope="session")
def client() -> TestClient:
    """
    FastAPI TestClient Fixture.
    
    A fixture is a function that returns a setup value (or context) to be used by test cases.
    By naming a test parameter 'client', Pytest automatically resolves and executes this 
    fixture, injecting its returned value into the test function.
    
    TestClient runs our FastAPI app in an in-memory process, allowing us to perform
    simulated HTTP requests using standard HTTP verbs (.get, .post, etc.) and check responses
    without running a physical socket server.
    
    - scope="session": Ensures the TestClient is created only once per entire test suite run,
      speeding up test execution.
    """
    # Create and return a TestClient instance bound to our FastAPI app
    with TestClient(app) as test_client:
        yield test_client
