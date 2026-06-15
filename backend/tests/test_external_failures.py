import httpx
from unittest.mock import patch, MagicMock

@patch("routes.transcribe.Groq")
def test_groq_transcribe_down(MockGroq, authed_client):
    mock_client = MockGroq.return_value
    mock_client.audio.transcriptions.create.side_effect = Exception("Groq is down")
    
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(b"0" * 1024)
        f.close()
        try:
            with open(f.name, "rb") as audio:
                response = authed_client.post("/transcribe", files={"file": ("test.webm", audio, "audio/webm")})
                assert response.status_code == 500
        finally:
            os.unlink(f.name)

@patch("routes.extract.Groq")
def test_groq_extract_returns_bad_json(MockGroq, authed_client):
    mock_client = MockGroq.return_value
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "This is not json"
    mock_client.chat.completions.create.return_value = mock_completion
    
    response = authed_client.post("/extract-skills", json={"transcript": "Valid transcript 10 chars"})
    assert response.status_code == 502
    assert "Failed to parse" in response.json()["detail"]

@patch("routes.extract.Groq")
def test_groq_extract_timeout(MockGroq, authed_client):
    mock_client = MockGroq.return_value
    mock_client.chat.completions.create.side_effect = TimeoutError("Groq timeout")
    
    response = authed_client.post("/extract-skills", json={"transcript": "Valid transcript 10 chars"})
    assert response.status_code == 500

@patch("routes.extract.os.getenv")
def test_groq_key_missing(mock_getenv, authed_client):
    mock_getenv.return_value = None
    response = authed_client.post("/extract-skills", json={"transcript": "Valid transcript 10 chars"})
    assert response.status_code == 503

@patch("services.job_fetcher.fetch_adzuna_jobs")
@patch("services.job_fetcher.fetch_jooble_jobs")
@patch("services.job_fetcher.fetch_jsearch_jobs")
def test_all_job_apis_down(mock_jsearch, mock_jooble, mock_adzuna, authed_client, sample_match_request):
    mock_jsearch.side_effect = httpx.TimeoutException("Timeout")
    mock_jooble.side_effect = httpx.TimeoutException("Timeout")
    mock_adzuna.side_effect = httpx.TimeoutException("Timeout")
    
    response = authed_client.post("/match-jobs", json=sample_match_request)
    assert response.status_code == 200
    assert response.json()["matches"] == []

@patch("services.job_fetcher.fetch_adzuna_jobs")
@patch("services.job_fetcher.fetch_jooble_jobs")
@patch("services.job_fetcher.fetch_jsearch_jobs")
def test_partial_job_api_failure(mock_jsearch, mock_jooble, mock_adzuna, authed_client, sample_match_request):
    mock_jsearch.side_effect = httpx.TimeoutException("Timeout")
    mock_jooble.return_value = [{"id": 1, "match_score": 90.0, "title": "Job 1", "company": "Co 1", "location": "In", "type": "FT", "source": "jooble", "description": "", "apply_url": "", "skills": []}]
    mock_adzuna.side_effect = httpx.TimeoutException("Timeout")
    
    # We also mock _score_jobs to just return what it got
    with patch("services.matcher._score_jobs", side_effect=lambda jobs, *args: jobs):
        response = authed_client.post("/match-jobs", json=sample_match_request)
        assert response.status_code == 200
        assert len(response.json()["matches"]) == 1
        assert response.json()["matches"][0]["title"] == "Job 1"
