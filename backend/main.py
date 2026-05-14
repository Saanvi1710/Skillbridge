from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client
from routes.transcribe import router as transcribe_router
from routes.extract import router as extract_router
import os

load_dotenv()

app = FastAPI(title="SkillBridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app.include_router(transcribe_router)
app.include_router(extract_router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SkillBridge API is running"}

@app.get("/test-db")
def test_db():
    result = supabase.table("users").select("*").execute()
    return {"status": "db connected", "rows": len(result.data)}