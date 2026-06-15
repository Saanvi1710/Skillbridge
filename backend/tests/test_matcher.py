import json
import os
import pytest
from unittest.mock import patch
import numpy as np

from services.matcher import _score_jobs
from services.job_fetcher import deduplicate_jobs

# Mock the sentence transformer for deterministic behavior
class MockSentenceTransformer:
    def __init__(self, model_name):
        pass
    
    def encode(self, texts, convert_to_numpy=True):
        embeddings = []
        for text in texts:
            text_lower = text.lower()
            # Fake logic: map strings to vectors so similar words have similar vectors
            vector = [0.0, 0.0, 0.0]
            if "plumb" in text_lower or "pipe" in text_lower:
                vector[0] = 1.0
            if "tailor" in text_lower or "stitching" in text_lower or "garment" in text_lower:
                vector[1] = 1.0
            if "software" in text_lower or "java" in text_lower:
                vector[2] = 1.0
            
            # If no keywords matched, use a zero vector
            if sum(vector) == 0:
                vector = [0.0, 0.0, 0.0]
                
            embeddings.append(vector)
        return np.array(embeddings)

@pytest.fixture
def mock_model():
    with patch("services.matcher._get_model", return_value=MockSentenceTransformer("mock")):
        yield

def test_plumber_ranks_plumbing_first(mock_model):
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert len(results) > 0
    titles = [job["title"] for job in results]
    assert "Plumber" in titles
    assert "Plumbing Helper" in titles

def test_irrelevant_jobs_filtered(mock_model):
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    # The Software Engineer job should have a very low score and be filtered out
    titles = [job["title"] for job in results]
    assert "Software Engineer" not in titles

def test_tailor_ranks_tailoring_first(mock_model):
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "tailor_delhi.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert len(results) > 0
    titles = [job["title"] for job in results]
    assert "Tailor" in titles
    assert "Delivery Driver" not in titles

def test_empty_jobs_returns_empty(mock_model):
    results = _score_jobs([], "some profile", top_k=10)
    assert results == []

def test_score_is_deterministic(mock_model):
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results1 = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    results2 = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert results1 == results2

def test_match_score_range(mock_model):
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    for res in results:
        assert 0 <= res["match_score"] <= 100

def test_deduplication():
    jobs = [
        {"title": "Plumber", "company": "ABC"},
        {"title": " Plumber ", "company": "abc"},
        {"title": "Electrician", "company": "XYZ"}
    ]
    unique = deduplicate_jobs(jobs)
    assert len(unique) == 2
    assert unique[0]["title"] == "Plumber"
    assert unique[1]["title"] == "Electrician"
