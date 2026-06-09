from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from groq import Groq
import os
import json
from deps import verify_token
from limiter import limiter

router = APIRouter()

class TranscriptInput(BaseModel):
    transcript: str = Field(..., max_length=10000)

@router.post("/extract-skills")
@limiter.limit("5/minute")
async def extract_skills(request: Request, data: TranscriptInput, user_id: str = Depends(verify_token)):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
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
                    "content": "You are a skill extraction assistant. You only respond with valid JSON, no explanation, no markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=1000
        )

        raw = response.choices[0].message.content
        clean = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        return parsed

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse extraction results.")
    except Exception as e:
        print(f"[extract] /extract-skills encountered an error.")
        raise HTTPException(status_code=500, detail="An internal error occurred during skill extraction.")