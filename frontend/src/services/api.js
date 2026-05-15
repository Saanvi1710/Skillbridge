const BASE_URL = import.meta.env.VITE_API_URL

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append("file", audioBlob, "recording.webm")

  const response = await fetch(`${BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) throw new Error("Transcription failed")
  return response.json()
}

export async function extractSkills(transcript) {
  const response = await fetch(`${BASE_URL}/extract-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript })
  })

  if (!response.ok) throw new Error("Extraction failed")
  return response.json()
}

export async function saveProfile(profileData) {
  const response = await fetch(`${BASE_URL}/save-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData)
  })

  if (!response.ok) throw new Error("Save failed")
  return response.json()
}

export async function getJobMatches(skills, summary) {
  const response = await fetch(`${BASE_URL}/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills, summary })
  })
  if (!response.ok) throw new Error("Matching failed")
  return response.json()
}