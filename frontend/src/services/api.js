const BASE_URL = "http://localhost:8000"

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