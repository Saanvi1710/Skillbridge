from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from supabase import Client
import os
from deps import get_supabase, verify_token
from limiter import limiter
from typing import Optional, List
from services.matcher import match_jobs

router = APIRouter()

class ProfileData(BaseModel):
    transcript: str = Field(..., max_length=10000)
    skills: List[str]
    years_experience: dict
    tools_used: List[str]
    work_domains: List[str]
    languages_spoken: List[str]
    summary: str = Field(..., max_length=2000)
    name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = None
    gender: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    allow_contact: Optional[bool] = True
    user_id: Optional[str] = None  # from logged-in user

class MatchRequest(BaseModel):
    skills: List[str]
    summary: str
    work_domains: Optional[List[str]] = []
    city: Optional[str] = None

@router.post("/save-profile")
@limiter.limit("10/minute")
async def save_profile(request: Request, data: ProfileData, user_id: str = Depends(verify_token), supabase: Client = Depends(get_supabase)):
    try:
        # Ensure user exists in public.users and update details
        try:
            supabase.table("users").upsert({
                "id": user_id,
                "name": data.name or "User",
                "age": data.age,
                "gender": data.gender,
                "phone": data.phone,
                "city": data.city,
                "allow_contact": data.allow_contact,
                "preferred_language": "en"
            }).execute()
        except Exception as db_err:
            print(f"[profile] DB upsert failed for user, continuing anyway.")

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
        print(f"[profile] /save-profile encountered an error.")
        raise HTTPException(status_code=500, detail="An internal error occurred while saving the profile.")

@router.get("/profile/{profile_id}")
@limiter.limit("30/minute")
async def get_profile(request: Request, profile_id: str, supabase: Client = Depends(get_supabase)):
    try:
        # Get profile
        result = supabase.table("profiles").select("*").eq("id", profile_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile_data = result.data[0]
        
        # Get user details (EXCLUDE PHONE for public privacy)
        user_result = supabase.table("users").select("name, age, gender, city").eq("id", profile_data["user_id"]).execute()
        if user_result.data:
            profile_data["name"] = user_result.data[0].get("name")
            profile_data["age"] = user_result.data[0].get("age")
            profile_data["gender"] = user_result.data[0].get("gender")
            profile_data["city"] = user_result.data[0].get("city")
            
        return profile_data
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[profile] /profile/id encountered an error.")
        raise HTTPException(status_code=500, detail="An internal error occurred while retrieving the profile.")
    
@router.post("/match-jobs")
@limiter.limit("10/minute")
async def get_job_matches(request: Request, req: MatchRequest, user_id: str = Depends(verify_token)):
    try:
        matches = await match_jobs(
            profile_skills=req.skills,
            profile_summary=req.summary,
            work_domains=req.work_domains,
            city=req.city
        )
        return {"matches": matches}
    except Exception as e:
        print(f"[profile] /match-jobs encountered an error.")
        raise HTTPException(status_code=500, detail="An internal error occurred during job matching.")