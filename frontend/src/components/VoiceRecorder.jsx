import { useState, useRef } from "react"
import { transcribeAudio, extractSkills, saveProfile } from "../services/api"

const STEPS = {
  IDLE: "idle",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  EXTRACTING: "extracting",
  DONE: "done"
}

export default function VoiceRecorder() {
  const [step, setStep] = useState(STEPS.IDLE)
  const [transcript, setTranscript] = useState("")
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
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
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" })
        await processAudio(audioBlob)
      }

      mediaRecorder.current.start()
      setStep(STEPS.RECORDING)
      setError("")
      setProfile(null)
      setSaved(false)
    } catch {
      setError("Microphone access denied. Please allow microphone in browser settings.")
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setStep(STEPS.TRANSCRIBING)
  }

  const processAudio = async (audioBlob) => {
    try {
      // Step 1: Transcribe
      setStep(STEPS.TRANSCRIBING)
      const { transcript: text } = await transcribeAudio(audioBlob)
      setTranscript(text)

      // Step 2: Extract skills
      setStep(STEPS.EXTRACTING)
      const extracted = await extractSkills(text)
      setProfile(extracted)
      setStep(STEPS.DONE)

    } catch (err) {
      setError("Something went wrong. Please try again.")
      setStep(STEPS.IDLE)
    }
  }

  const handleSave = async () => {
    try {
      await saveProfile({ transcript, ...profile })
      setSaved(true)
    } catch {
      setError("Failed to save profile.")
    }
  }

  const reset = () => {
    setStep(STEPS.IDLE)
    setTranscript("")
    setProfile(null)
    setError("")
    setSaved(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-lg mx-auto pt-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">SkillBridge</h1>
          <p className="text-gray-400">Speak your experience. Get a professional profile.</p>
        </div>

        {/* Record Button */}
        {step !== STEPS.DONE && (
          <div className="flex flex-col items-center mb-8">
            <button
              onClick={step === STEPS.RECORDING ? stopRecording : startRecording}
              disabled={step === STEPS.TRANSCRIBING || step === STEPS.EXTRACTING}
              className={`w-28 h-28 rounded-full font-semibold text-sm transition-all duration-200 mb-4
                ${step === STEPS.RECORDING ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}
                ${step === STEPS.IDLE ? "bg-blue-600 hover:bg-blue-700" : ""}
                ${step === STEPS.TRANSCRIBING || step === STEPS.EXTRACTING ? "bg-gray-600 cursor-not-allowed" : ""}
              `}
            >
              {step === STEPS.IDLE && "Record"}
              {step === STEPS.RECORDING && "Stop"}
              {step === STEPS.TRANSCRIBING && "..."}
              {step === STEPS.EXTRACTING && "..."}
            </button>

            <p className="text-gray-400 text-sm">
              {step === STEPS.IDLE && "Press to start speaking"}
              {step === STEPS.RECORDING && "Recording... press stop when done"}
              {step === STEPS.TRANSCRIBING && "Transcribing your voice..."}
              {step === STEPS.EXTRACTING && "Extracting your skills..."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-500 rounded-lg p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">What you said</p>
            <p className="text-gray-200 text-sm leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Profile Card */}
        {profile && step === STEPS.DONE && (
          <div className="bg-gray-800 rounded-xl p-5 mb-4">
            <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide">Your Profile</p>

            {/* Summary */}
            <p className="text-white text-sm leading-relaxed mb-4">{profile.summary}</p>

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="bg-blue-600/30 text-blue-300 text-xs px-3 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {profile.years_experience?.total > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Experience</p>
                <p className="text-white text-sm">{profile.years_experience.total} years</p>
              </div>
            )}

            {/* Tools */}
            {profile.tools_used?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Tools</p>
                <div className="flex flex-wrap gap-2">
                  {profile.tools_used.map((tool, i) => (
                    <span key={i} className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            {profile.work_domains?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Work Areas</p>
                <div className="flex flex-wrap gap-2">
                  {profile.work_domains.map((domain, i) => (
                    <span key={i} className="bg-green-600/30 text-green-300 text-xs px-3 py-1 rounded-full">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {step === STEPS.DONE && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saved}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-green-400 text-white py-3 rounded-xl font-medium text-sm transition-colors"
            >
              {saved ? "Saved ✓" : "Save Profile"}
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium text-sm transition-colors"
            >
              Record Again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}