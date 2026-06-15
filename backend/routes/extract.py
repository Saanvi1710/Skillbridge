import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from groq import Groq
from pydantic import BaseModel, Field

from deps import verify_token
from limiter import limiter

logger = logging.getLogger("skillbridge.extract")

router = APIRouter()


# ── Request / Response models ──────────────────────────
class TranscriptInput(BaseModel):
    transcript: str = Field(..., min_length=10, max_length=10000)


class YearsExperience(BaseModel):
    total: Optional[int] = 0
    breakdown: Optional[dict] = {}


class ExtractionResponse(BaseModel):
    name: Optional[str] = None
    skills: list[str] = []
    years_experience: YearsExperience = YearsExperience()
    tools_used: list[str] = []
    work_domains: list[str] = []
    languages_spoken: list[str] = []
    summary: str = ""
    needs_more_info: bool = False
    followup_question: Optional[str] = None


@router.post("/extract-skills", response_model=ExtractionResponse)
@limiter.limit("5/minute")
async def extract_skills(
    request: Request,
    data: TranscriptInput,
    user_id: str = Depends(verify_token),
):
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        logger.error("GROQ_API_KEY not configured")
        raise HTTPException(status_code=503, detail="Skill extraction service is unavailable.")

    client = Groq(api_key=groq_key)

    prompt = f"""You are helping informal workers in India create professional profiles.

A worker has described their experience. Extract structured information from it.

Worker's words: "{data.transcript}"

Return ONLY a JSON object with this exact structure, no explanation, no markdown:
{{
  "name": null,
  "skills": ["skill1", "skill2"],
  "years_experience": {{"total": 0, "breakdown": {{}}}},
  "tools_used": ["tool1", "tool2"],
  "work_domains": ["domain1"],
  "languages_spoken": ["Hindi", "English"],
  "summary": "2-3 sentence professional summary in English",
  "needs_more_info": false,
  "followup_question": null
}}

Rules:
- skills must be specific and in English (e.g. "Electrical Wiring" not "bijli ka kaam")
- years_experience.total should be a number
- summary should sound professional, suitable for a job application
- translate all skills to English
- return ONLY the JSON, nothing else"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a skill extraction assistant. You only respond with valid JSON, no explanation, no markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=1000,
        )

        raw = response.choices[0].message.content
        clean = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)

        # Validate and coerce through the response model so the frontend
        # always gets a predictable shape, even if the LLM omits fields.
        result = ExtractionResponse(**parsed)
        logger.info("Extraction completed for user %s — %d skills found", user_id[:8], len(result.skills))
        return result

    except json.JSONDecodeError:
        logger.warning("LLM returned unparseable JSON for user %s", user_id[:8])
        raise HTTPException(status_code=502, detail="Failed to parse extraction results. Please try again.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Skill extraction failed for user %s", user_id[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during skill extraction.",
        )