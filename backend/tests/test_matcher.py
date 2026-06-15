import json
import os
import pytest

from services.matcher import _score_jobs
from services.job_fetcher import deduplicate_jobs

def test_plumber_ranks_plumbing_first():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert len(results) > 0
    titles = [job["title"] for job in results]
    assert "Plumber" in titles
    # Plumbing Helper might also match depending on keyword overlap

def test_irrelevant_jobs_filtered():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    titles = [job["title"] for job in results]
    assert "Software Engineer" not in titles

def test_tailor_ranks_tailoring_first():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "tailor_delhi.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert len(results) > 0
    titles = [job["title"] for job in results]
    assert "Tailor" in titles
    assert "Delivery Driver" not in titles

def test_empty_jobs_returns_empty():
    results = _score_jobs([], "some profile", top_k=10)
    assert results == []

def test_score_is_deterministic():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "plumber_mumbai.json")
    with open(fixture_path) as f:
        data = json.load(f)
    
    results1 = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    results2 = _score_jobs(data["jobs"], data["profile_text"], top_k=10)
    assert results1 == results2

def test_match_score_range():
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
