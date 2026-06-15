import asyncio
import json
import logging
import os

import httpx
from groq import Groq

logger = logging.getLogger("skillbridge.job_fetcher")

# ─────────────────────────────────────────────────
# 1. Smart keyword generation using Groq
# ─────────────────────────────────────────────────


def _generate_search_queries_sync(skills: list, summary: str, work_domains: list) -> list[str]:
    """
    Uses Groq LLM to convert extracted skills into 2-3 effective
    job search keywords suitable for job board APIs.
    Synchronous — must be called via asyncio.to_thread().
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        logger.warning("GROQ_API_KEY not set — falling back to raw skills as keywords")
        return _fallback_queries(skills, work_domains)

    client = Groq(api_key=groq_key)

    skills_str = ", ".join(skills) if skills else "general labor"
    domains_str = ", ".join(work_domains) if work_domains else ""

    prompt = f"""You are a job search assistant for blue-collar and informal workers in India.

A worker has these skills: {skills_str}
Work domains: {domains_str}
Summary: {summary}

Generate exactly 3 simple job search keywords/phrases that would find relevant jobs on job boards.
These should be common job titles or trade names, NOT skill descriptions.

Examples:
- Skills: "stitching, garment alteration, sewing machine" → ["tailor", "garment worker", "seamstress"]
- Skills: "wiring, circuit repair, meter installation" → ["electrician", "electrical technician", "wireman"]
- Skills: "driving, route planning, delivery" → ["driver", "delivery boy", "transport"]

Return ONLY a JSON array of 3 strings, nothing else. No markdown, no explanation.
Example: ["keyword1", "keyword2", "keyword3"]"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You only respond with a valid JSON array of strings. No explanation."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=100,
        )
        raw = response.choices[0].message.content.strip()
        clean = raw.replace("```json", "").replace("```", "").strip()
        queries = json.loads(clean)
        if isinstance(queries, list) and len(queries) > 0:
            return queries[:3]
    except Exception as e:
        logger.warning("Keyword generation failed: %s", e)

    return _fallback_queries(skills, work_domains)


def _fallback_queries(skills: list, work_domains: list) -> list[str]:
    """Deterministic fallback when LLM is unavailable."""
    if work_domains:
        return work_domains[:2]
    if skills:
        return skills[:2]
    return ["helper", "worker"]


# ─────────────────────────────────────────────────
# 2. Adzuna API
# ─────────────────────────────────────────────────

async def fetch_adzuna_jobs(query: str, location: str = "") -> list[dict]:
    """Fetch jobs from Adzuna API (India)."""
    app_id = os.getenv("ADZUNA_APP_ID", "")
    app_key = os.getenv("ADZUNA_APP_KEY", "")

    if not app_id or not app_key or app_id.startswith("your_"):
        return []

    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "results_per_page": 20,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.adzuna.com/v1/api/jobs/in/search/1",
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("results", []):
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company", {}).get("display_name", "Unknown"),
                "location": item.get("location", {}).get("display_name", "India"),
                "type": (
                    item.get("contract_time", "Full-time")
                    .replace("full_time", "Full-time")
                    .replace("part_time", "Part-time")
                ),
                "description": item.get("description", "")[:300],
                "apply_url": item.get("redirect_url", ""),
                "source": "adzuna",
            })
        logger.info("Adzuna: %d jobs for '%s'", len(jobs), query)
        return jobs
    except httpx.TimeoutException:
        logger.warning("Adzuna timeout for '%s'", query)
        return []
    except httpx.HTTPStatusError as e:
        logger.warning("Adzuna HTTP %d for '%s'", e.response.status_code, query)
        return []
    except Exception as e:
        logger.warning("Adzuna error for '%s': %s", query, e)
        return []


# ─────────────────────────────────────────────────
# 3. Jooble API
# ─────────────────────────────────────────────────

async def fetch_jooble_jobs(query: str, location: str = "India") -> list[dict]:
    """Fetch jobs from Jooble API."""
    api_key = os.getenv("JOOBLE_API_KEY", "")

    if not api_key or api_key.startswith("your_"):
        return []

    payload = {
        "keywords": query,
        "location": location,
        "page": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://jooble.org/api/{api_key}",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("jobs", []):
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company", "Unknown"),
                "location": item.get("location", "India"),
                "type": item.get("type", "Full-time") or "Full-time",
                "description": item.get("snippet", "")[:300],
                "apply_url": item.get("link", ""),
                "source": "jooble",
            })
        logger.info("Jooble: %d jobs for '%s'", len(jobs), query)
        return jobs
    except httpx.TimeoutException:
        logger.warning("Jooble timeout for '%s'", query)
        return []
    except httpx.HTTPStatusError as e:
        logger.warning("Jooble HTTP %d for '%s'", e.response.status_code, query)
        return []
    except Exception as e:
        logger.warning("Jooble error for '%s': %s", query, e)
        return []


# ─────────────────────────────────────────────────
# 3.5. JSearch API (RapidAPI)
# ─────────────────────────────────────────────────

async def fetch_jsearch_jobs(query: str, location: str = "India") -> list[dict]:
    """Fetch jobs from JSearch API (aggregates Google Jobs)."""
    api_key = os.getenv("RAPIDAPI_KEY", "")

    if not api_key or api_key.startswith("your_"):
        return []

    search_query = f"{query} in {location}" if location else f"{query} in India"

    headers = {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": api_key,
    }

    params = {
        "query": search_query,
        "page": "1",
        "num_pages": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://jsearch.p.rapidapi.com/search",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

        jobs = []
        for item in data.get("data", []):
            jobs.append({
                "title": item.get("job_title", ""),
                "company": item.get("employer_name", "Unknown"),
                "location": (
                    f"{item.get('job_city', '')} {item.get('job_state', '')}".strip() or "India"
                ),
                "type": (
                    (item.get("job_employment_type") or "Full-time")
                    .capitalize()
                    .replace("_", "-")
                ),
                "description": item.get("job_description", "")[:300],
                "apply_url": item.get("job_apply_link", ""),
                "source": "jsearch",
            })
        logger.info("JSearch: %d jobs for '%s'", len(jobs), query)
        return jobs
    except httpx.TimeoutException:
        logger.warning("JSearch timeout for '%s'", query)
        return []
    except httpx.HTTPStatusError as e:
        logger.warning("JSearch HTTP %d for '%s'", e.response.status_code, query)
        return []
    except Exception as e:
        logger.warning("JSearch error for '%s': %s", query, e)
        return []


# ─────────────────────────────────────────────────
# 4. Deduplication
# ─────────────────────────────────────────────────

def deduplicate_jobs(jobs: list[dict]) -> list[dict]:
    """Remove duplicate jobs based on title + company combination."""
    seen = set()
    unique = []
    for job in jobs:
        key = (job["title"].lower().strip(), job["company"].lower().strip())
        if key not in seen:
            seen.add(key)
            unique.append(job)
    return unique


# ─────────────────────────────────────────────────
# 5. Main orchestrator
# ─────────────────────────────────────────────────

async def fetch_real_jobs(skills: list, summary: str, work_domains: list, city: str = None) -> list[dict]:
    """
    Main entry point:
    1. Generate smart search keywords from user skills (async-safe)
    2. Query Adzuna + Jooble + JSearch in parallel for each keyword
    3. Deduplicate and return unified list
    """
    # Step 1: Generate search queries — wrapped in to_thread because Groq SDK is sync
    queries = await asyncio.to_thread(
        _generate_search_queries_sync, skills, summary, work_domains
    )
    logger.info("Generated search queries: %s", queries)

    # Use city if provided, otherwise default to India
    search_location = city if city else ""
    jooble_jsearch_location = city if city else "India"

    # Step 2: Fetch from APIs for each query (in parallel)
    tasks = []
    for q in queries:
        tasks.append(fetch_adzuna_jobs(q, location=search_location))
        tasks.append(fetch_jooble_jobs(q, location=jooble_jsearch_location))
        tasks.append(fetch_jsearch_jobs(q, location=jooble_jsearch_location))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Step 3: Collect all jobs, skipping errors
    all_jobs = []
    for i, result in enumerate(results):
        if isinstance(result, list):
            all_jobs.extend(result)
        elif isinstance(result, Exception):
            logger.warning("Job fetch task %d failed: %s", i, result)

    # Step 4: Deduplicate
    unique_jobs = deduplicate_jobs(all_jobs)
    logger.info("Total unique jobs fetched: %d", len(unique_jobs))

    return unique_jobs
