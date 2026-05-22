from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
import os
from typing import Optional, List
from services.matcher import match_jobs

router = APIRouter()

class ProfileData(BaseModel):
    transcript: str
    skills: List[str]
    years_experience: dict
    tools_used: List[str]
    work_domains: List[str]
    languages_spoken: List[str]
    summary: str
    name: Optional[str] = None
    user_id: Optional[str] = None  # from logged-in user

@router.post("/save-profile")
async def save_profile(data: ProfileData):
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    try:
        user_id = data.user_id

        # If no user_id passed, create anonymous user
        if not user_id:
            user_result = supabase.table("users").insert({
                "name": data.name or "Anonymous",
                "preferred_language": "hi"
            }).execute()
            user_id = user_result.data[0]["id"]

        # Save profile linked to user
        profile_result = supabase.table("profiles").insert({
            "user_id": user_id,
            "raw_skills": {"skills": data.skills},
            "generated_summary": data.summary,
            "years_experience": data.years_experience,
            "tools_used": data.tools_used,
            "work_domains": data.work_domains,
        }).execute()

        profile_id = profile_result.data[0]["id"]
        return {"success": True, "profile_id": profile_id, "user_id": user_id}

    except Exception as e:
        print(f"SAVE ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{profile_id}")
async def get_profile(profile_id: str):
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    try:
        result = supabase.table("profiles").select("*").eq("id", profile_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/match-jobs")
async def get_job_matches(data: dict):
    try:
        skills = data.get("skills", [])
        summary = data.get("summary", "")
        work_domains = data.get("work_domains", [])
        matches = await match_jobs(skills, summary, work_domains)
        return {"matches": matches}
    except Exception as e:
        print(f"MATCH ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))