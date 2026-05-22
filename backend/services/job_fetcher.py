import httpx
import os
import json
from groq import Groq

# ─────────────────────────────────────────────────
# 1. Smart keyword generation using Groq
# ─────────────────────────────────────────────────

def generate_search_queries(skills: list, summary: str, work_domains: list) -> list[str]:
    """
    Uses Groq LLM to convert extracted skills into 2-3 effective
    job search keywords suitable for job board APIs.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=100
        )
        raw = response.choices[0].message.content.strip()
        clean = raw.replace("```json", "").replace("```", "").strip()
        queries = json.loads(clean)
        if isinstance(queries, list) and len(queries) > 0:
            return queries[:3]
    except Exception as e:
        print(f"[job_fetcher] Keyword generation failed: {e}")

    # Fallback: use work_domains or first skill as search term
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
        print("[job_fetcher] Adzuna API keys not configured, skipping")
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
                "type": item.get("contract_time", "Full-time").replace("full_time", "Full-time").replace("part_time", "Part-time"),
                "description": item.get("description", "")[:300],
                "apply_url": item.get("redirect_url", ""),
                "source": "adzuna",
            })
        print(f"[job_fetcher] Adzuna returned {len(jobs)} jobs for '{query}'")
        return jobs
    except Exception as e:
        print(f"[job_fetcher] Adzuna error for '{query}': {e}")
        return []


# ─────────────────────────────────────────────────
# 3. Jooble API
# ─────────────────────────────────────────────────

async def fetch_jooble_jobs(query: str, location: str = "India") -> list[dict]:
    """Fetch jobs from Jooble API."""
    api_key = os.getenv("JOOBLE_API_KEY", "")

    if not api_key or api_key.startswith("your_"):
        print("[job_fetcher] Jooble API key not configured, skipping")
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
        print(f"[job_fetcher] Jooble returned {len(jobs)} jobs for '{query}'")
        return jobs
    except Exception as e:
        print(f"[job_fetcher] Jooble error for '{query}': {e}")
        return []


# ─────────────────────────────────────────────────
# 3.5. JSearch API (RapidAPI)
# ─────────────────────────────────────────────────

async def fetch_jsearch_jobs(query: str, location: str = "India") -> list[dict]:
    """Fetch jobs from JSearch API (aggregates Google Jobs)."""
    api_key = os.getenv("RAPIDAPI_KEY", "")

    if not api_key or api_key.startswith("your_"):
        print("[job_fetcher] RapidAPI key not configured, skipping JSearch")
        return []

    # JSearch expects a single query string like "Plumber in Mumbai, India"
    search_query = f"{query} in {location}" if location else f"{query} in India"

    headers = {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": api_key,
    }

    params = {
        "query": search_query,
        "page": "1",
        "num_pages": "1"
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
                "location": f"{item.get('job_city', '')} {item.get('job_state', '')}".strip() or "India",
                "type": item.get("job_employment_type", "Full-time").capitalize().replace("_", "-"),
                "description": item.get("job_description", "")[:300],
                "apply_url": item.get("job_apply_link", ""),
                "source": "jsearch",
            })
        print(f"[job_fetcher] JSearch returned {len(jobs)} jobs for '{query}'")
        return jobs
    except Exception as e:
        print(f"[job_fetcher] JSearch error for '{query}': {e}")
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

async def fetch_real_jobs(skills: list, summary: str, work_domains: list) -> list[dict]:
    """
    Main entry point:
    1. Generate smart search keywords from user skills
    2. Query Adzuna + Jooble in parallel for each keyword
    3. Deduplicate and return unified list
    """
    import asyncio

    # Step 1: Generate search queries
    queries = generate_search_queries(skills, summary, work_domains)
    print(f"[job_fetcher] Generated search queries: {queries}")

    # Step 2: Fetch from APIs for each query (in parallel)
    tasks = []
    for q in queries:
        tasks.append(fetch_adzuna_jobs(q))
        tasks.append(fetch_jooble_jobs(q))
        tasks.append(fetch_jsearch_jobs(q))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Step 3: Collect all jobs, skipping errors
    all_jobs = []
    for result in results:
        if isinstance(result, list):
            all_jobs.extend(result)

    # Step 4: Deduplicate
    unique_jobs = deduplicate_jobs(all_jobs)
    print(f"[job_fetcher] Total unique jobs fetched: {len(unique_jobs)}")

    return unique_jobs
