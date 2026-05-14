from fastapi import APIRouter, UploadFile, File, HTTPException
from groq import Groq
import os
import tempfile

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            content = await file.read()
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

    except Exception as e:
        print(f"FULL ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))