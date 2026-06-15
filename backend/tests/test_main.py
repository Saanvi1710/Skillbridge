import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "SkillBridge API is running"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_unauthenticated_transcribe():
    # Attempting to transcribe without auth should return 401
    response = client.post("/transcribe")
    assert response.status_code == 401

def test_unauthenticated_extract():
    # Attempting to extract without auth should return 401
    response = client.post("/extract-skills")
    assert response.status_code == 401

def test_unauthenticated_profile_access():
    # Trying to access a profile without auth should return 401
    response = client.get("/profile/some-uuid")
    assert response.status_code == 401
