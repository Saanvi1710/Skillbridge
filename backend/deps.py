import os
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

# Standard OAuth2 Bearer token
security = HTTPBearer()

def get_supabase() -> Client:
    """Returns a Supabase client using the Service Role Key (bypasses RLS)"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Missing Supabase Service Key or URL in environment")
    return create_client(url, key)

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Verifies the Supabase JWT securely via Supabase Auth and returns the user_id"""
    token = credentials.credentials
    supabase = get_supabase()
    
    try:
        # This handles ECC, RS256, and HS256 automatically without needing the secret
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
