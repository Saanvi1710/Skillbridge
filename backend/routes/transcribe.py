import logging
import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from groq import Groq
from pydantic import BaseModel

from deps import verify_token
from limiter import limiter

logger = logging.getLogger("skillbridge.transcribe")

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
VALID_AUDIO_TYPES = frozenset([
    "audio/webm", "video/webm", "audio/mp4", "audio/mpeg",
    "audio/ogg", "audio/wav", "application/octet-stream",
])


# ── Response model ─────────────────────────────────────
class TranscriptionResponse(BaseModel):
    transcript: str
    language: str


@router.post("/transcribe", response_model=TranscriptionResponse)
@limiter.limit("5/minute")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
):
    if file.content_type not in VALID_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Only audio files are allowed.",
        )

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        logger.error("GROQ_API_KEY not configured")
        raise HTTPException(status_code=503, detail="Transcription service is unavailable.")

    client = Groq(api_key=groq_key)
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp_path = tmp.name
            size = 0
            while chunk := await file.read(1024 * 1024):  # read 1 MB chunks
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail="File too large. Maximum size is 10 MB.",
                    )
                tmp.write(chunk)

        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        with open(tmp_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                prompt=(
                    "This is a worker describing their job experience. "
                    "May include trade names, tool names, and Indian names. "
                    "Preserve English technical terms as-is."
                ),
                response_format="verbose_json",
            )

        logger.info("Transcription completed for user %s (%d bytes)", user_id[:8], size)
        return TranscriptionResponse(transcript=response.text, language=response.language)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Transcription failed for user %s", user_id[:8])
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during transcription.",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)