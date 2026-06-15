import logging

import numpy as np
from services.job_fetcher import fetch_real_jobs

logger = logging.getLogger("skillbridge.matcher")

# ── Lazy-loaded model ──────────────────────────────────
_model = None


def _tokenize(text: str) -> set:
    """Simple tokenizer for Jaccard similarity."""
    import re
    text = text.lower()
    words = re.findall(r'\w+', text)
    return set(words)

def _score_jobs(jobs: list, profile_text: str, top_k: int) -> list:
    """Score a list of jobs against a profile using pure Python Jaccard similarity."""
    if not jobs:
        return []

    profile_tokens = _tokenize(profile_text)
    if not profile_tokens:
        logger.warning("Profile has no tokens to match.")
        return []

    similarities = []
    for i, job in enumerate(jobs):
        job_text = f"{job.get('title', '')} {job.get('description', '')}"
        job_tokens = _tokenize(job_text)
        
        if not job_tokens:
            similarities.append((i, 0.0))
            continue
            
        intersection = len(profile_tokens.intersection(job_tokens))
        union = len(profile_tokens.union(job_tokens))
        score = intersection / union if union > 0 else 0.0
        similarities.append((i, score))

    # Sort by score descending
    similarities.sort(key=lambda x: x[1], reverse=True)
    results = []
    for idx, score in similarities[:top_k]:
        raw_score = score
        # Strict threshold: drop jobs that are completely irrelevant (raw score < 0.05 for jaccard)
        if raw_score < 0.05:
            continue

        job = jobs[idx].copy()

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