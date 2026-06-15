import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ["GROQ_API_KEY"] = "test_groq_key"
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_SERVICE_KEY"] = "test_service_key"
os.environ["SUPABASE_JWT_SECRET"] = "test_jwt_secret"

from main import app
from deps import verify_token, get_supabase

def mock_verify_token():
    return "test-user-id"

def mock_get_supabase():
    mock_client = MagicMock()
    mock_client.table.return_value = mock_client
    mock_client.select.return_value = mock_client
    mock_client.insert.return_value = mock_client
    mock_client.upsert.return_value = mock_client
    mock_client.update.return_value = mock_client
    mock_client.delete.return_value = mock_client
    mock_client.eq.return_value = mock_client
    mock_client.order.return_value = mock_client
    return mock_client

@pytest.fixture
def authed_client():
    app.dependency_overrides[verify_token] = mock_verify_token
    app.dependency_overrides[get_supabase] = mock_get_supabase
    with TestClient(app) as client:
        yield client
    app.dependency_overrides = {}

@pytest.fixture
def unauthed_client():
    app.dependency_overrides[get_supabase] = mock_get_supabase
    with TestClient(app) as client:
        yield client
    app.dependency_overrides = {}

@pytest.fixture
def sample_profile_payload():
    return {
        "transcript": "Hello I am a plumber",
        "skills": ["Plumbing", "Pipe Fitting"],
        "years_experience": {"total": 5, "breakdown": {}},
        "tools_used": ["Wrench"],
        "work_domains": ["Construction"],
        "languages_spoken": ["English"],
        "summary": "Experienced plumber.",
        "name": "John Doe",
        "age": 30,
        "gender": "Male",
        "city": "Mumbai",
        "phone": "9999999999",
        "allow_contact": True
    }

@pytest.fixture
def sample_match_request():
    return {
        "skills": ["Plumbing"],
        "summary": "Experienced plumber.",
        "work_domains": ["Construction"],
        "city": "Mumbai"
    }
