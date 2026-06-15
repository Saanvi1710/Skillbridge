import logging
import os
import time
import uuid

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
    req_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error on %s %s (ID: %s)", request.method, request.url.path, req_id)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later.", "request_id": req_id},
    )


# ── Security headers and Tracing middleware ───────────────────────
@app.middleware("http")
async def add_security_headers_and_tracing(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    logger.info("Request started: %s %s (ID: %s)", request.method, request.url.path, request_id)
    
    try:
        response: Response = await call_next(request)
    except Exception as exc:
        execution_time = time.time() - start_time
        logger.error("Request failed: %s %s (ID: %s) - Time: %.4fs", 
                     request.method, request.url.path, request_id, execution_time)
        raise exc
        
    execution_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    logger.info("Request completed: %s %s (ID: %s) - Status: %s - Time: %.4fs", 
                request.method, request.url.path, request_id, response.status_code, execution_time)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    expose_headers=["X-Request-ID"]
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
    failed_services = []
    
    # 1. Check Env Vars
    if not os.getenv("GROQ_API_KEY"):
        failed_services.append("groq")
        
    # 2. Check Supabase
    try:
        supabase.table("users").select("id").limit(1).execute()
    except Exception:
        logger.warning("Readiness check failed — database unreachable")
        failed_services.append("supabase")
        
    if failed_services:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "failed": failed_services}
        )
        
    return {"status": "ready"}