import logging
import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from supabase import Client

from deps import get_supabase, verify_token
from limiter import limiter
from services.matcher import match_jobs

logger = logging.getLogger("skillbridge.profile")

router = APIRouter()

# ── Shared constraints ─────────────────────────────────
MAX_LIST_ITEMS = 50
MAX_ITEM_LENGTH = 200


def _validate_string_list(v: list[str], field_name: str) -> list[str]:
    """Enforce item count and per-item length on string lists."""
    if len(v) > MAX_LIST_ITEMS:
        raise ValueError(f"{field_name} cannot have more than {MAX_LIST_ITEMS} items")
    return [item[:MAX_ITEM_LENGTH] for item in v]


# ── Request models ─────────────────────────────────────
class ProfileData(BaseModel):
    transcript: str = Field(..., max_length=10000)
    skills: list[str]
    years_experience: dict
    tools_used: list[str]
    work_domains: list[str]
    languages_spoken: list[str]
    summary: str = Field(..., max_length=2000)
    name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = Field(None, ge=10, le=120)
    gender: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    allow_contact: Optional[bool] = True

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v):
        return _validate_string_list(v, "skills")

    @field_validator("tools_used")
    @classmethod
    def validate_tools(cls, v):
        return _validate_string_list(v, "tools_used")

    @field_validator("work_domains")
    @classmethod
    def validate_domains(cls, v):
        return _validate_string_list(v, "work_domains")

    @field_validator("languages_spoken")
    @classmethod
    def validate_languages(cls, v):
        return _validate_string_list(v, "languages_spoken")


class MatchRequest(BaseModel):
    skills: list[str]
    summary: str = Field(..., max_length=5000)
    work_domains: Optional[list[str]] = []
    city: Optional[str] = None

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v):
        return _validate_string_list(v, "skills")


# ── Response models ────────────────────────────────────
class SaveProfileResponse(BaseModel):
    success: bool
    profile_id: str
    share_slug: str


class JobMatch(BaseModel):
    id: int | str
    title: str
    company: str
    location: str
    type: str
    description: str = ""
    apply_url: str = ""
    source: str = ""
    match_score: float
    skills: list[str] = []


class MatchJobsResponse(BaseModel):
    matches: list[JobMatch]


# ── Helpers ────────────────────────────────────────────
def _strip_internal_fields(data: dict) -> dict:
    """Remove fields that should never be sent to clients."""
    data.pop("user_id", None)
    return data


# ── Routes ─────────────────────────────────────────────
@router.post("/save-profile", response_model=SaveProfileResponse)
@limiter.limit("10/minute")
async def save_profile(
    request: Request,
    data: ProfileData,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
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
                "preferred_language": "en",
            }).execute()
        except Exception:
            logger.warning("User upsert failed for %s, continuing", user_id[:8])

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

        # Generate random slug for public sharing
        slug = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        supabase.table("profile_shares").insert({
            "profile_id": profile_id,
            "slug": slug,
        }).execute()

        logger.info("Profile saved: %s for user %s", profile_id[:8], user_id[:8])
        return SaveProfileResponse(success=True, profile_id=profile_id, share_slug=slug)

    except HTTPException:
        raise
    except Exception:
        logger.exception("save-profile failed for user %s", user_id[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while saving the profile.",
        )


@router.get("/profile/{profile_id}")
@limiter.limit("30/minute")
async def get_profile(
    request: Request,
    profile_id: str,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    try:
        result = supabase.table("profiles").select("*").eq("id", profile_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        profile_data = result.data[0]
        if profile_data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this profile")

        # Get user details (EXCLUDE PHONE for public privacy)
        user_result = (
            supabase.table("users")
            .select("name, age, gender, city")
            .eq("id", profile_data["user_id"])
            .execute()
        )
        if user_result.data:
            profile_data["name"] = user_result.data[0].get("name")
            profile_data["age"] = user_result.data[0].get("age")
            profile_data["gender"] = user_result.data[0].get("gender")
            profile_data["city"] = user_result.data[0].get("city")

        # Strip internal fields before returning
        return _strip_internal_fields(profile_data)

    except HTTPException:
        raise
    except Exception:
        logger.exception("get-profile failed for %s", profile_id[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while retrieving the profile.",
        )


@router.post("/match-jobs", response_model=MatchJobsResponse)
@limiter.limit("10/minute")
async def get_job_matches(
    request: Request,
    req: MatchRequest,
    user_id: str = Depends(verify_token),
):
    try:
        matches = await match_jobs(
            profile_skills=req.skills,
            profile_summary=req.summary,
            work_domains=req.work_domains,
            city=req.city,
        )
        logger.info("Job matching returned %d results for user %s", len(matches), user_id[:8])
        return MatchJobsResponse(matches=matches)
    except HTTPException:
        raise
    except Exception:
        logger.exception("match-jobs failed for user %s", user_id[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during job matching.",
        )


@router.get("/share/{slug}")
@limiter.limit("30/minute")
async def get_shared_profile(
    request: Request,
    slug: str,
    supabase: Client = Depends(get_supabase),
):
    try:
        share_result = (
            supabase.table("profile_shares")
            .select("profile_id, is_active")
            .eq("slug", slug)
            .execute()
        )
        if not share_result.data or not share_result.data[0].get("is_active"):
            raise HTTPException(status_code=404, detail="Shared profile not found or inactive")

        profile_id = share_result.data[0]["profile_id"]
        result = supabase.table("profiles").select("*").eq("id", profile_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        profile_data = result.data[0]

        # Get user details safely (EXCLUDE PHONE)
        user_result = (
            supabase.table("users")
            .select("name, age, gender, city")
            .eq("id", profile_data["user_id"])
            .execute()
        )
        if user_result.data:
            profile_data["name"] = user_result.data[0].get("name")
            profile_data["age"] = user_result.data[0].get("age")
            profile_data["gender"] = user_result.data[0].get("gender")
            profile_data["city"] = user_result.data[0].get("city")

        # Strip internal fields before returning
        return _strip_internal_fields(profile_data)

    except HTTPException:
        raise
    except Exception:
        logger.exception("share-profile failed for slug %s", slug[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while retrieving the shared profile.",
        )