# SkillBridge Production Deployment Guide

This document provides complete instructions for deploying the SkillBridge platform to production environments using Vercel (Frontend) and Render (Backend).

## 1. Backend Deployment (Render)

The backend is an asynchronous FastAPI application. It is configured to run via `uvicorn` using the exact settings provided in the declarative `render.yaml` file.

### Steps
1. Connect your GitHub repository to Render and create a **Blueprint Instance** (or a standard Web Service).
2. Point Render to `backend/render.yaml` if using Blueprints, OR set the following manually:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Python Version**: `3.11.0` (using `PYTHON_VERSION` env var)
3. **Environment Variables**: You MUST provide all the following keys in Render's environment dashboard:
   - `GROQ_API_KEY`: Groq language model API key
   - `JOOBLE_API_KEY`: Jooble Jobs API key
   - `ADZUNA_APP_ID`: Adzuna Application ID
   - `ADZUNA_APP_KEY`: Adzuna Application Key
   - `RAPIDAPI_KEY`: RapidAPI Hub Key
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase Service Role Key (NEVER expose to frontend)
   - `SUPABASE_JWT_SECRET`: JWT Secret from Supabase (for token verification)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g., `https://skillbridge-app.vercel.app`)

### Verification
Once deployed, check:
- `https://your-api.onrender.com/health` (Should return `{"status": "healthy"}`)
- `https://your-api.onrender.com/ready` (Should return `{"status": "ready"}`)

---

## 2. Frontend Deployment (Vercel)

The frontend is a React application built with Vite, utilizing React Router for client-side navigation.

### Steps
1. Connect your GitHub repository to Vercel and create a new project.
2. Set the **Framework Preset** to Vite. Vercel will automatically configure build steps.
3. The root directory should point to `frontend`.
4. The `vercel.json` file handles all the necessary routing rewrites, so deep linking will work out-of-the-box.
5. **Environment Variables**: Add the following securely in Vercel project settings:
   - `VITE_API_URL`: The URL of your Render backend (e.g., `https://skillbridge-api.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_KEY`: Your Supabase ANON Key (safe to expose publicly)

### Fail-Fast Startup
If any critical environment variables are missing during deployment or locally, the app will instantly crash on mount with a clear console error describing which variables are missing, instead of failing silently later.

---

## 3. Post-Deployment Verification (Smoke Testing)

After both frontend and backend are live, manually verify these critical flows:
1. **Application Load**: Verify the landing page loads without error.
2. **Login Flow**: Complete the authentication flow and confirm routing to the dashboard.
3. **Profile Creation**: Record a test audio profile and ensure skills are correctly extracted and saved.
4. **Profile Sharing**: Open the generated public profile slug in an Incognito window and verify the profile appears properly.
5. **Job Matching**: Ensure jobs appear on the Dashboard/Jobs view based on the extracted profile skills.

*Note: All API responses now include an `X-Request-ID` header. Include this ID when checking backend server logs on Render to trace errors quickly.*
