import os
import logging
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

logger = logging.getLogger("skillbridge.deps")

# Standard OAuth2 Bearer token
security = HTTPBearer()

# ── Singleton Supabase client ──────────────────────────
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Returns a Supabase client using the Service Role Key (bypasses RLS).
    Uses a module-level singleton to avoid re-creating the client on every request."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_KEY not set")
        raise ValueError("Missing Supabase Service Key or URL in environment")

    _supabase_client = create_client(url, key)
    logger.info("Supabase client initialised")
    return _supabase_client


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Verifies the Supabase JWT securely via Supabase Auth and returns the user_id."""
    token = credentials.credentials
    supabase = get_supabase()

    try:
        # This handles ECC, RS256, and HS256 automatically without needing the secret
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_response.user.id
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Token verification failed: %s", type(exc).__name__)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
