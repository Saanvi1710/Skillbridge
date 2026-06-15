import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from deps import get_supabase
from limiter import limiter
from routes.extract import router as extract_router
from routes.profile import router as profile_router
from routes.transcribe import router as transcribe_router

load_dotenv()

# ── Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("skillbridge")

# ── Sentry (optional) ─────────────────────────────────
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
        logger.info("Sentry initialised")
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed — skipping")

# ── App ────────────────────────────────────────────────
app = FastAPI(title="SkillBridge API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Global exception handler ──────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ── Security headers middleware ───────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://skillbridge-app.vercel.app",  # add your vercel URL later
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(transcribe_router)
app.include_router(extract_router)
app.include_router(profile_router)


@app.get("/")
def home():
    return {"status": "ok", "message": "SkillBridge API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/ready")
def ready_check(supabase=Depends(get_supabase)):
    try:
        supabase.table("users").select("id").limit(1).execute()
        return {"status": "ready"}
    except Exception:
        logger.warning("Readiness check failed — database unreachable")
        return Response(status_code=503, content="Service Unavailable")