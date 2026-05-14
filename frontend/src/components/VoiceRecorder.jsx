import { useState, useRef } from "react"
import { transcribeAudio } from "../services/api"

export default function VoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" })
        setLoading(true)
        setError("")
        try {
          const result = await transcribeAudio(audioBlob)
          setTranscript(result.transcript)
        } catch (err) {
          setError("Transcription failed. Check your OpenAI key.")
        } finally {
          setLoading(false)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.current.start()
      setRecording(true)
    } catch (err) {
      setError("Microphone access denied.")
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">SkillBridge</h1>
        <p className="text-gray-400 text-center mb-8">
          Speak your work experience. We'll build your profile.
        </p>

        {/* Record Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={`w-24 h-24 rounded-full text-white font-semibold text-sm transition-all duration-200 ${
              recording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50`}
          >
            {recording ? "Stop" : "Record"}
          </button>
        </div>

        {/* Status */}
        <p className="text-center text-sm text-gray-400 mb-6">
          {recording && "Recording... speak now"}
          {loading && "Transcribing..."}
          {!recording && !loading && !transcript && "Press to start speaking"}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-500 rounded-lg p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Transcript</p>
            <p className="text-white leading-relaxed">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  )
}