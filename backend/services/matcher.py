from sentence_transformers import SentenceTransformer
import numpy as np
from services.job_fetcher import fetch_real_jobs

# Load once when server starts — not on every request
model = SentenceTransformer('all-MiniLM-L6-v2')

# ─────────────────────────────────────────────────
# Hardcoded fallback jobs (used when APIs fail)
# ─────────────────────────────────────────────────
FALLBACK_JOBS = [
    { "id": 1, "title": "Electrician", "company": "BuildRight Contractors", "location": "Pune", "type": "Full-time",
      "description": "Electrical wiring, fitting, meter installation, circuit breaker maintenance, residential and commercial electrical work",
      "apply_url": "", "source": "skillbridge" },
    { "id": 2, "title": "Plumber", "company": "UrbanFix Services", "location": "Mumbai", "type": "Contract",
      "description": "Plumbing installation, pipe fitting, water tank repair, drainage systems, bathroom fitting",
      "apply_url": "", "source": "skillbridge" },
    { "id": 3, "title": "Carpenter", "company": "HomeMakers Pvt Ltd", "location": "Pune", "type": "Full-time",
      "description": "Furniture making, wood finishing, carpentry, door and window fitting, cabinet installation",
      "apply_url": "", "source": "skillbridge" },
    { "id": 4, "title": "Painter", "company": "ColorCraft", "location": "Nashik", "type": "Contract",
      "description": "Wall painting, surface preparation, colour mixing, waterproofing, texture painting",
      "apply_url": "", "source": "skillbridge" },
    { "id": 5, "title": "AC Technician", "company": "CoolTech HVAC", "location": "Pune", "type": "Full-time",
      "description": "AC repair, HVAC maintenance, electrical wiring, cooling systems, installation and servicing",
      "apply_url": "", "source": "skillbridge" },
    { "id": 6, "title": "Welder", "company": "MetalWorks India", "location": "Aurangabad", "type": "Full-time",
      "description": "Arc welding, metal fabrication, MIG welding, structural welding, equipment maintenance",
      "apply_url": "", "source": "skillbridge" },
    { "id": 7, "title": "Masonry Worker", "company": "SolidBuild", "location": "Pune", "type": "Contract",
      "description": "Bricklaying, concrete work, plastering, tile fixing, construction and renovation",
      "apply_url": "", "source": "skillbridge" },
    { "id": 8, "title": "Driver", "company": "FastMove Logistics", "location": "Mumbai", "type": "Full-time",
      "description": "Commercial vehicle driving, route planning, vehicle maintenance, delivery operations, logistics",
      "apply_url": "", "source": "skillbridge" },
    { "id": 9, "title": "Security Guard", "company": "SafeGuard Services", "location": "Pune", "type": "Full-time",
      "description": "Premises security, surveillance, access control, patrolling, emergency response",
      "apply_url": "", "source": "skillbridge" },
    { "id": 10, "title": "Cook / Kitchen Staff", "company": "FoodFirst Hotels", "location": "Mumbai", "type": "Full-time",
      "description": "Food preparation, cooking, kitchen management, hygiene maintenance, menu planning",
      "apply_url": "", "source": "skillbridge" },
]

# Pre-compute fallback embeddings once at startup
_fallback_texts = [f"{j['title']} {j['description']}" for j in FALLBACK_JOBS]
_fallback_embeddings = model.encode(_fallback_texts, convert_to_numpy=True)


def _score_jobs(jobs: list, profile_text: str, top_k: int) -> list:
    """Score a list of jobs against a profile using cosine similarity."""
    if not jobs:
        return []

    job_texts = [f"{j['title']} {j.get('description', '')}" for j in jobs]
    job_embeddings = model.encode(job_texts, convert_to_numpy=True)

    profile_embedding = model.encode([profile_text], convert_to_numpy=True)

    # Cosine similarity
    profile_norm = profile_embedding / np.linalg.norm(profile_embedding)
    jobs_norm = job_embeddings / np.linalg.norm(job_embeddings, axis=1, keepdims=True)
    similarities = np.dot(jobs_norm, profile_norm.T).flatten()

    # Get top_k matches
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        job = jobs[int(idx)].copy()
        
        # Boost raw cosine similarity score for human readability
        raw_score = max(0.0, float(similarities[idx]))
        boosted_score = (raw_score ** 0.5) * 100
        
        job["match_score"] = round(boosted_score, 1)
        # Extract skill tags from description
        desc = job.get("description", "")
        job["skills"] = [s.strip() for s in desc.split(",")[:4]] if desc else []
        if "id" not in job:
            job["id"] = int(idx) + 1
        results.append(job)

    return results


async def match_jobs(profile_skills: list, profile_summary: str, work_domains: list = None, top_k: int = 50):
    """
    Main matching function:
    1. Fetch real jobs from Adzuna + Jooble
    2. Score them against the profile using SentenceTransformer
    3. Fall back to hardcoded jobs if APIs return nothing
    """
    profile_text = f"{profile_summary} {' '.join(profile_skills)}"
    work_domains = work_domains or []

    # Try fetching real jobs
    real_jobs = await fetch_real_jobs(profile_skills, profile_summary, work_domains)

    if real_jobs and len(real_jobs) >= 3:
        # Score real jobs
        print(f"[matcher] Scoring {len(real_jobs)} real jobs")
        return _score_jobs(real_jobs, profile_text, top_k)
    else:
        # Fallback: use hardcoded jobs
        print(f"[matcher] No real jobs found, using fallback ({len(real_jobs)} real jobs returned)")
        # Combine any real jobs we did get with fallback
        combined = real_jobs + FALLBACK_JOBS
        return _score_jobs(combined, profile_text, top_k)