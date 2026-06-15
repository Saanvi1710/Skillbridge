from unittest.mock import patch
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app

client = TestClient(app)

def test_missing_auth_header():
    # Attempt to hit a protected route
    response = client.post("/extract-skills", json={"transcript": "test transcript long enough"})
    assert response.status_code in (401, 403)
    assert response.json()["detail"] == "Not authenticated"

def test_malformed_bearer_token():
    response = client.post("/extract-skills", headers={"Authorization": "Bearer "}, json={"transcript": "test transcript long enough"})
    assert response.status_code == 401

@patch("deps.get_supabase")
def test_expired_token(mock_get_supabase):
    mock_supabase = mock_get_supabase.return_value
    mock_supabase.auth.get_user.side_effect = Exception("Expired token")
    
    response = client.post("/extract-skills", headers={"Authorization": "Bearer expired_token"}, json={"transcript": "test transcript long enough"})
    assert response.status_code == 401
    assert "Invalid authentication credentials" in response.json()["detail"]

@patch("deps.get_supabase")
def test_valid_token_passes(mock_get_supabase):
    mock_supabase = mock_get_supabase.return_value
    class MockUser:
        id = "test-user-id"
    class MockUserResponse:
        user = MockUser()
    mock_supabase.auth.get_user.return_value = MockUserResponse()
    
    # Send request with invalid body to check if auth passes and validation kicks in
    response = client.post("/extract-skills", headers={"Authorization": "Bearer valid_token"}, json={"transcript": ""})
    assert response.status_code == 422 # Because transcript length < 10, meaning auth passed
