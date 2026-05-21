# SkillBridge 

> Voice-to-profile AI tool for informal workers across India.

Speak your work experience in Hindi, English, or Hinglish — SkillBridge transcribes your voice, extracts your skills using AI, and generates a professional profile with job matches. No typing. No forms. No literacy required.

---

## The Problem

India has 450M+ informal workers — electricians, plumbers, carpenters, drivers — with years of real experience but no way to present it to formal employers. Existing job platforms assume literacy and prior digital experience. SkillBridge removes that barrier.

---

## Demo Flow

1. Sign in with Google
2. Record your voice describing your work experience
3. AI transcribes and extracts structured skills
4. Get a shareable professional profile
5. See jobs ranked by semantic similarity to your profile

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React (Vite) | UI framework |
| React Router | Client-side routing |
| Tailwind CSS | Styling |
| Supabase JS | Auth + database client |
| Web Audio API | In-browser voice recording |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| Groq Whisper (whisper-large-v3) | Multilingual speech-to-text |
| LLaMA 3.3 70B (via Groq) | Skill extraction + profile generation |
| sentence-transformers (all-MiniLM-L6-v2) | Semantic job matching via cosine similarity |
| Supabase (PostgreSQL) | Database + Auth |
| Python-dotenv | Environment config |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | Database + Google OAuth |
| Render | Backend hosting |
| Vercel | Frontend hosting |
| GitHub | Version control |

---

## ML Pipeline
Voice Input
↓
Groq Whisper — multilingual STT (Hindi/English/Hinglish)
↓
LLaMA 3.3 70B — structured skill extraction via prompt engineering
↓
sentence-transformers — profile embedding (384-dim vector)
↓
Cosine similarity against job embeddings → ranked matches

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in your keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.development   # fill in your keys
npm run dev
```

### Environment Variables

**Backend** — get these from:
- `GROQ_API_KEY` → [console.groq.com](https://console.groq.com)
- `SUPABASE_URL` + `SUPABASE_KEY` → [supabase.com](https://supabase.com) → Project Settings → API
- `ANTHROPIC_API_KEY` → [console.anthropic.com](https://console.anthropic.com)

**Frontend** — same Supabase credentials + your backend URL

---

## Project Structure
skillbridge/
├── backend/
│   ├── main.py                 # FastAPI app + CORS config
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── transcribe.py       # Whisper STT endpoint
│   │   ├── extract.py          # LLaMA skill extraction
│   │   └── profile.py          # Save, fetch, match profiles
│   └── services/
│       └── matcher.py          # Semantic job matching (ML)
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx     # Home page
│       │   ├── Login.jsx       # Google OAuth
│       │   ├── Dashboard.jsx   # User's saved profiles
│       │   ├── Record.jsx      # Voice recording page
│       │   ├── Jobs.jsx        # AI job matches
│       │   └── Profile.jsx     # Public shareable profile
│       ├── components/
│       │   ├── VoiceRecorder.jsx   # Core recording + profile UI
│       │   └── ProtectedRoute.jsx  # Auth guard
│       ├── context/
│       │   └── AuthContext.jsx     # Google OAuth state
│       └── services/
│           ├── api.js              # Backend API calls
│           └── supabase.js         # Supabase client
└── README.md
---

## Tradeoffs Made

- **Groq over OpenAI** — zero cost, same Whisper model, acceptable latency
- **LLaMA 3.3 over GPT-4** — free tier sufficient for structured JSON extraction
- **Embedding similarity over keyword matching** — better recall for semantically related skills (e.g. "bijli ka kaam" → matches Electrician)
- **No RLS in development** — disabled to avoid silent auth failures during hackathon build; would enable pre-production

---

## Built for

ML Empowerment Build Challenge — addressing economic mobility for India's informal workforce.
