import logging

import numpy as np
from services.job_fetcher import fetch_real_jobs

logger = logging.getLogger("skillbridge.matcher")

# ── Lazy-loaded model ──────────────────────────────────
_model = None


def _get_model():
    """Lazy-load SentenceTransformer so cold-start doesn't block import."""
    global _model
    if _model is None:
        logger.info("Loading SentenceTransformer model (first request)…")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded successfully")
    return _model


def _score_jobs(jobs: list, profile_text: str, top_k: int) -> list:
    """Score a list of jobs against a profile using cosine similarity."""
    if not jobs:
        return []

    model = _get_model()

    job_texts = [f"{j['title']} {j.get('description', '')}" for j in jobs]
    job_embeddings = model.encode(job_texts, convert_to_numpy=True)
    profile_embedding = model.encode([profile_text], convert_to_numpy=True)

    # Cosine similarity — guard against zero-norm vectors
    profile_norm_val = np.linalg.norm(profile_embedding)
    if profile_norm_val == 0:
        logger.warning("Profile embedding has zero norm — cannot score jobs")
        return []

    job_norms = np.linalg.norm(job_embeddings, axis=1, keepdims=True)
    # Replace any zero norms with 1.0 to avoid division by zero
    job_norms = np.where(job_norms == 0, 1.0, job_norms)

    profile_norm = profile_embedding / profile_norm_val
    jobs_norm = job_embeddings / job_norms
    similarities = np.dot(jobs_norm, profile_norm.T).flatten()

    # Get top_k matches
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        raw_score = max(0.0, float(similarities[idx]))

        # Strict threshold: drop jobs that are completely irrelevant (raw score < 0.30)
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


async def match_jobs(
    profile_skills: list,
    profile_summary: str,
    work_domains: list = None,
    top_k: int = 50,
    city: str = None,
):
    """
    Main matching function:
    1. Fetch real jobs from Adzuna + Jooble + JSearch
    2. Score them against the profile using SentenceTransformer
    3. Return empty list if APIs return nothing
    """
    profile_text = f"{profile_summary} {' '.join(profile_skills)}"
    work_domains = work_domains or []

    # Fetch real jobs from APIs
    real_jobs = await fetch_real_jobs(profile_skills, profile_summary, work_domains, city)

    logger.info("Fetched %d real jobs", len(real_jobs))

    if not real_jobs:
        return []

    return _score_jobs(real_jobs, profile_text, top_k)