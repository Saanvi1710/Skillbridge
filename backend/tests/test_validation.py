import tempfile
from unittest.mock import patch
from tests.conftest import authed_client, sample_profile_payload

def test_extract_empty_transcript(authed_client):
    response = authed_client.post("/extract-skills", json={"transcript": ""})
    assert response.status_code == 422
    assert "transcript" in response.text

def test_extract_missing_field(authed_client):
    response = authed_client.post("/extract-skills", json={})
    assert response.status_code == 422

def test_save_profile_age_out_of_range(authed_client, sample_profile_payload):
    payload = sample_profile_payload.copy()
    payload["age"] = 999
    response = authed_client.post("/save-profile", json=payload)
    assert response.status_code == 422
    assert "age" in response.text

def test_save_profile_skills_too_many(authed_client, sample_profile_payload):
    payload = sample_profile_payload.copy()
    payload["skills"] = ["Skill"] * 51
    response = authed_client.post("/save-profile", json=payload)
    assert response.status_code == 422
    assert "skills" in response.text

def test_save_profile_transcript_too_long(authed_client, sample_profile_payload):
    payload = sample_profile_payload.copy()
    payload["transcript"] = "A" * 15000
    response = authed_client.post("/save-profile", json=payload)
    assert response.status_code == 422

def test_match_jobs_empty_skills(authed_client):
    # Empty skills is technically valid, should return empty array
    with patch("routes.profile.match_jobs", return_value=[]):
        response = authed_client.post("/match-jobs", json={"skills": [], "summary": "Valid summary."})
        assert response.status_code == 200
        assert response.json()["matches"] == []

def test_transcribe_wrong_content_type(authed_client):
    files = {"file": ("test.txt", b"hello text", "text/plain")}
    response = authed_client.post("/transcribe", files=files)
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

def test_transcribe_empty_file(authed_client):
    files = {"file": ("test.webm", b"", "audio/webm")}
    response = authed_client.post("/transcribe", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_transcribe_oversized_file(authed_client):
    import os
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(b"0" * (11 * 1024 * 1024))
        f.flush()
        f.close()
        try:
            with open(f.name, "rb") as audio:
                files = {"file": ("test.webm", audio, "audio/webm")}
                response = authed_client.post("/transcribe", files=files)
                assert response.status_code == 400
                assert "too large" in response.json()["detail"]
        finally:
            os.unlink(f.name)
