from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
import os
import json

router = APIRouter()

class TranscriptInput(BaseModel):
    transcript: str

@router.post("/extract-skills")
async def extract_skills(data: TranscriptInput):
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
        raise HTTPException(status_code=500, detail=f"JSON parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))