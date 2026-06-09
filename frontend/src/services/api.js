import { supabase } from "./supabase"

const BASE_URL = import.meta.env.VITE_API_URL

/**
 * Authenticated fetch wrapper — attaches the Supabase JWT
 * as a Bearer token to all requests.
 */
async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  })
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append("file", audioBlob, "recording.webm")

  const response = await authFetch(`${BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) throw new Error("Transcription failed")
  return response.json()
}

export async function extractSkills(transcript) {
  const response = await authFetch(`${BASE_URL}/extract-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript })
  })

  if (!response.ok) throw new Error("Extraction failed")
  return response.json()
}

export async function saveProfile(profileData) {
  const response = await authFetch(`${BASE_URL}/save-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData)
  })

  if (!response.ok) throw new Error("Save failed")
  return response.json()
}

export async function getJobMatches(skills, summary, work_domains = [], city = null) {
  const response = await authFetch(`${BASE_URL}/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills, summary, work_domains, city })
  })
  if (!response.ok) throw new Error("Matching failed")
  return response.json()
}