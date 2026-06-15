import { supabase } from "./supabase"

const BASE_URL = import.meta.env.VITE_API_URL

/**
 * Authenticated fetch wrapper — attaches the Supabase JWT
 * as a Bearer token to all requests.
 */
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errData = await response.json()
        errorMessage = errData.detail || errorMessage
      } catch (e) {
        // Fallback to generic message if not JSON
      }
      throw new Error(errorMessage)
    }

    return response
  } catch (error) {
    console.error(`API call failed for ${url}:`, error.message)
    throw error
  }
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append("file", audioBlob, "recording.webm")

  const response = await authFetch(`${BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  })
  return response.json()
}

export async function extractSkills(transcript) {
  const response = await authFetch(`${BASE_URL}/extract-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript })
  })
  return response.json()
}

export async function saveProfile(profileData) {
  const response = await authFetch(`${BASE_URL}/save-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData)
  })
  return response.json()
}

export async function getJobMatches(skills, summary, work_domains = [], city = null) {
  const response = await authFetch(`${BASE_URL}/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills, summary, work_domains, city })
  })
  return response.json()
}