from sentence_transformers import SentenceTransformer
import numpy as np
from services.job_fetcher import fetch_real_jobs

# Load once when server starts — not on every request
model = SentenceTransformer('all-MiniLM-L6-v2')


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
        raw_score = max(0.0, float(similarities[idx]))
        
        # Strict threshold: drop jobs that are completely irrelevant (raw score < 0.30)
        # 0.30 raw score translates to exactly a ~54.7% boosted score.
        if raw_score < 0.30:
            continue
            
        job = jobs[int(idx)].copy()
        
        # Boost raw cosine similarity score for human readability
        boosted_score = (raw_score ** 0.5) * 100
        
        job["match_score"] = round(boosted_score, 1)
        # Extract skill tags from description
        desc = job.get("description", "")
        job["skills"] = [s.strip() for s in desc.split(",")[:4]] if desc else []
        if "id" not in job:
            job["id"] = int(idx) + 1
        results.append(job)

    return results


async def match_jobs(profile_skills: list, profile_summary: str, work_domains: list = None, top_k: int = 50, city: str = None):
    """
    Main matching function:
    1. Fetch real jobs from Adzuna + Jooble
    2. Score them against the profile using SentenceTransformer
    3. Fall back to hardcoded jobs if APIs return nothing
    """
    profile_text = f"{profile_summary} {' '.join(profile_skills)}"
    work_domains = work_domains or []

    # Fetch real jobs from APIs
    real_jobs = await fetch_real_jobs(profile_skills, profile_summary, work_domains, city)

    print(f"[matcher] Fetched {len(real_jobs)} real jobs.")
    
    if not real_jobs:
        return []
        
    return _score_jobs(real_jobs, profile_text, top_k)