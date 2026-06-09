from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from groq import Groq
import os
import tempfile
from deps import verify_token
from limiter import limiter

router = APIRouter()

@router.post("/transcribe")
@limiter.limit("5/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...), user_id: str = Depends(verify_token)):
    MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
    valid_types = ["audio/webm", "video/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "application/octet-stream"]
    if file.content_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only audio files are allowed.")
        
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
            print(f"FILE SIZE: {len(content)} bytes")
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                prompt="This is a worker describing their job experience. May include trade names, tool names, and Indian names. Preserve English technical terms as-is.",
                response_format="verbose_json"
            )

        os.unlink(tmp_path)
        return {
            "transcript": response.text,
            "language": response.language
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"FULL ERROR: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred during transcription.")