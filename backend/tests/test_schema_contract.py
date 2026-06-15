import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routes.profile import SaveProfileResponse, JobMatch, MatchJobsResponse
from routes.extract import ExtractionResponse
from routes.transcribe import TranscriptionResponse

def test_save_profile_response_has_profile_id():
    schema = SaveProfileResponse.model_json_schema()
    assert "profile_id" in schema["properties"]
    assert "profile_id" in schema["required"]

def test_match_response_has_matches_array():
    schema = MatchJobsResponse.model_json_schema()
    assert schema["properties"]["matches"]["type"] == "array"

def test_job_match_has_all_frontend_fields():
    schema = JobMatch.model_json_schema()
    required_by_frontend = {"title", "company", "location", "type", "match_score", "apply_url", "source", "skills"}
    assert required_by_frontend.issubset(set(schema["properties"].keys()))

def test_extraction_response_has_all_frontend_fields():
    schema = ExtractionResponse.model_json_schema()
    required_by_frontend = {"skills", "summary", "work_domains", "tools_used", "years_experience"}
    assert required_by_frontend.issubset(set(schema["properties"].keys()))

def test_transcription_response_shape():
    schema = TranscriptionResponse.model_json_schema()
    assert set(schema["required"]) == {"transcript", "language"}
