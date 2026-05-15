from sentence_transformers import SentenceTransformer
import numpy as np

# Load once when server starts — not on every request
model = SentenceTransformer('all-MiniLM-L6-v2')

JOBS = [
    { "id": 1, "title": "Electrician", "company": "BuildRight Contractors", "location": "Pune", "type": "Full-time",
      "description": "Electrical wiring, fitting, meter installation, circuit breaker maintenance, residential and commercial electrical work" },
    { "id": 2, "title": "Plumber", "company": "UrbanFix Services", "location": "Mumbai", "type": "Contract",
      "description": "Plumbing installation, pipe fitting, water tank repair, drainage systems, bathroom fitting" },
    { "id": 3, "title": "Carpenter", "company": "HomeMakers Pvt Ltd", "location": "Pune", "type": "Full-time",
      "description": "Furniture making, wood finishing, carpentry, door and window fitting, cabinet installation" },
    { "id": 4, "title": "Painter", "company": "ColorCraft", "location": "Nashik", "type": "Contract",
      "description": "Wall painting, surface preparation, colour mixing, waterproofing, texture painting" },
    { "id": 5, "title": "AC Technician", "company": "CoolTech HVAC", "location": "Pune", "type": "Full-time",
      "description": "AC repair, HVAC maintenance, electrical wiring, cooling systems, installation and servicing" },
    { "id": 6, "title": "Welder", "company": "MetalWorks India", "location": "Aurangabad", "type": "Full-time",
      "description": "Arc welding, metal fabrication, MIG welding, structural welding, equipment maintenance" },
    { "id": 7, "title": "Masonry Worker", "company": "SolidBuild", "location": "Pune", "type": "Contract",
      "description": "Bricklaying, concrete work, plastering, tile fixing, construction and renovation" },
    { "id": 8, "title": "Driver", "company": "FastMove Logistics", "location": "Mumbai", "type": "Full-time",
      "description": "Commercial vehicle driving, route planning, vehicle maintenance, delivery operations, logistics" },
    { "id": 9, "title": "Security Guard", "company": "SafeGuard Services", "location": "Pune", "type": "Full-time",
      "description": "Premises security, surveillance, access control, patrolling, emergency response" },
    { "id": 10, "title": "Cook / Kitchen Staff", "company": "FoodFirst Hotels", "location": "Mumbai", "type": "Full-time",
      "description": "Food preparation, cooking, kitchen management, hygiene maintenance, menu planning" },
]

# Pre-compute job embeddings once at startup
job_texts = [f"{j['title']} {j['description']}" for j in JOBS]
job_embeddings = model.encode(job_texts, convert_to_numpy=True)

def match_jobs(profile_skills: list, profile_summary: str, top_k: int = 5):
    # Build a rich profile text for embedding
    profile_text = f"{profile_summary} {' '.join(profile_skills)}"
    
    # Encode the profile
    profile_embedding = model.encode([profile_text], convert_to_numpy=True)
    
    # Cosine similarity
    profile_norm = profile_embedding / np.linalg.norm(profile_embedding)
    jobs_norm = job_embeddings / np.linalg.norm(job_embeddings, axis=1, keepdims=True)
    similarities = np.dot(jobs_norm, profile_norm.T).flatten()
    
    # Get top_k matches
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        job = JOBS[idx].copy()
        job["match_score"] = round(float(similarities[idx]) * 100, 1)  # percentage
        job["skills"] = job["description"].split(", ")[:4]  # show first 4 as tags
        results.append(job)
    
    return results