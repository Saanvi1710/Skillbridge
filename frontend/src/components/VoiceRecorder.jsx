import { useState, useRef, useEffect } from "react"
import { transcribeAudio, extractSkills, saveProfile } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

const STEPS = {
  IDLE: "idle",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  EXTRACTING: "extracting",
  DONE: "done"
}

function WaveAnimation({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "32px" }}>
      {[0,1,2,3,4,5,6].map(i => (
        <div key={i} style={{
          width: "3px",
          borderRadius: "999px",
          background: active ? "#f97316" : "#374151",
          height: active ? `${12 + Math.sin(i * 0.9) * 12}px` : "6px",
          animation: active ? `wave 1s ease-in-out ${i * 0.1}s infinite alternate` : "none",
          transition: "height 0.3s ease"
        }} />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.6); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 14px rgba(249,115,22,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .skill-tag { animation: fadeUp 0.4s ease forwards; opacity: 0; }
        .profile-card { animation: fadeUp 0.5s ease forwards; }
      `}</style>
    </div>
  )
}

function SkillTag({ label, color, delay }) {
  return (
    <span className="skill-tag" style={{
      animationDelay: `${delay}ms`,
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 500,
      letterSpacing: "0.02em",
      background: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`
    }}>
      {label}
    </span>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: "#111827",
      border: "1px solid #1f2937",
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }}>
      <span style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <span style={{ fontSize: "18px", fontWeight: 600, color: "#f9fafb" }}>{value}</span>
      </div>
    </div>
  )
}

export default function VoiceRecorder() {
  const [step, setStep] = useState(STEPS.IDLE)
  const [transcript, setTranscript] = useState("")
  const [profile, setProfile] = useState(null)
  const [basicDetails, setBasicDetails] = useState({ name: "", age: "", gender: "", phone: "", city: "", allow_contact: true })
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [savedProfileId, setSavedProfileId] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (step === STEPS.RECORDING) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingTime(0)
    }
    return () => clearInterval(timerRef.current)
  }, [step])

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setBasicDetails(prev => ({ ...prev, name: user.user_metadata.full_name }))
    }
  }, [user])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

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
      setSavedProfileId(null)
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
      setStep(STEPS.TRANSCRIBING)
      const { transcript: text } = await transcribeAudio(audioBlob)
      setTranscript(text)
      setStep(STEPS.EXTRACTING)
      const extracted = await extractSkills(text)
      setProfile(extracted)
      setStep(STEPS.DONE)
    } catch {
      setError("Something went wrong. Please try again.")
      setStep(STEPS.IDLE)
    }
  }

  const handleSave = async () => {
    if (!basicDetails.name || !basicDetails.phone || !basicDetails.city) {
      setError("Please fill in your Name, Phone Number, and City before saving.")
      return
    }
    if (basicDetails.phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.")
      return
    }
    setError("")
    try {
      const result = await saveProfile({
        transcript,
        ...profile,
        name: basicDetails.name || undefined,
        age: basicDetails.age ? parseInt(basicDetails.age, 10) : undefined,
        gender: basicDetails.gender || undefined,
        phone: basicDetails.phone || undefined,
        city: basicDetails.city || undefined,
        allow_contact: basicDetails.allow_contact,
        user_id: user?.id
      })
      setSavedProfileId(result.profile_id)
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
    setSavedProfileId(null)
  }

  const isProcessing = step === STEPS.TRANSCRIBING || step === STEPS.EXTRACTING

  const skillColors = { bg: "#1e3a5f", text: "#93c5fd", border: "#1d4ed8" }
  const toolColors = { bg: "#1a2e1a", text: "#86efac", border: "#166534" }
  const domainColors = { bg: "#2d1b4e", text: "#c4b5fd", border: "#6d28d9" }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#f9fafb",
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 16px 48px"
    }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ width: "100%", maxWidth: "480px", paddingTop: "48px", marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px"
          }}>🎙</div>
          <span style={{ fontSize: "20px", fontWeight: 600, fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.02em" }}>SkillBridge</span>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Speak your experience in any language. Get a job-ready profile instantly.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Main Record Area */}
        {step !== STEPS.DONE && (
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "20px",
            padding: "32px 24px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            {/* Record Button */}
            <button
              onClick={step === STEPS.RECORDING ? stopRecording : startRecording}
              disabled={isProcessing}
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                border: "none",
                cursor: isProcessing ? "not-allowed" : "pointer",
                background: step === STEPS.RECORDING
                  ? "#f97316"
                  : isProcessing
                    ? "#1f2937"
                    : "#f97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                animation: step === STEPS.RECORDING ? "pulse-ring 1.5s ease infinite" : "none",
                transition: "all 0.2s ease",
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              {step === STEPS.IDLE && "🎙"}
              {step === STEPS.RECORDING && "⏹"}
              {isProcessing && (
                <div style={{
                  width: "24px", height: "24px",
                  border: "2px solid #374151",
                  borderTop: "2px solid #f97316",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }} />
              )}
            </button>

            {/* Wave / Status */}
            {step === STEPS.RECORDING && <WaveAnimation active={true} />}
            {step === STEPS.IDLE && <WaveAnimation active={false} />}

            {/* Status Text */}
            <div style={{ textAlign: "center" }}>
              {step === STEPS.IDLE && (
                <>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#e5e7eb", margin: "0 0 4px" }}>
                    Tap to start speaking
                  </p>
                  <p style={{ fontSize: "13px", color: "#4b5563", margin: 0 }}>
                    Hindi, English, or mix both — we understand
                  </p>
                </>
              )}
              {step === STEPS.RECORDING && (
                <>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#f97316", margin: "0 0 4px" }}>
                    Recording {formatTime(recordingTime)}
                  </p>
                  <p style={{ fontSize: "13px", color: "#4b5563", margin: 0 }}>
                    Describe your work, skills, experience
                  </p>
                </>
              )}
              {step === STEPS.TRANSCRIBING && (
                <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
                  Transcribing your voice...
                </p>
              )}
              {step === STEPS.EXTRACTING && (
                <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
                  Extracting your skills with AI...
                </p>
              )}
            </div>

            {/* Hint */}
            {step === STEPS.IDLE && (
              <div style={{
                background: "#0a0f1a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "12px 16px",
                width: "100%"
              }}>
                <p style={{ fontSize: "12px", color: "#4b5563", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Try saying</p>
                <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>
                  "Main 8 saal se plumbing kaam karta hoon, pipes fitting aur water tank repair mera main kaam hai..."
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#2d0a0a",
            border: "1px solid #7f1d1d",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#fca5a5"
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "16px"
          }}>
            <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              What you said
            </p>
            <p style={{ fontSize: "14px", color: "#d1d5db", margin: 0, lineHeight: 1.7 }}>{transcript}</p>
          </div>
        )}

        {/* Profile Card */}
        {profile && step === STEPS.DONE && (
          <div className="profile-card" style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "16px"
          }}>
            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", flexShrink: 0
              }}>
                {profile.work_domains?.[0]?.[0] || "👤"}
              </div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#f9fafb", margin: "0 0 2px" }}>
                  {profile.name || "Professional Profile"}
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  {profile.work_domains?.[0] || "Skilled Worker"}
                </p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span style={{
                  fontSize: "11px", padding: "4px 10px", borderRadius: "999px",
                  background: "#052e16", color: "#4ade80", border: "1px solid #166534"
                }}>
                  ✓ Profile Ready
                </span>
              </div>
            </div>

            {/* Summary */}
            <p style={{
              fontSize: "14px", color: "#9ca3af", lineHeight: 1.7,
              margin: "0 0 20px",
              paddingBottom: "20px",
              borderBottom: "1px solid #1e293b"
            }}>
              {profile.summary}
            </p>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <StatCard
                label="Experience"
                value={`${profile.years_experience?.total || "—"} yrs`}
                icon="⏱"
              />
              <StatCard
                label="Skills Found"
                value={profile.skills?.length || 0}
                icon="🎯"
              />
            </div>

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Skills
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {profile.skills.map((s, i) => (
                    <SkillTag key={i} label={s} color={skillColors} delay={i * 60} />
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {profile.tools_used?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Tools & Equipment
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {profile.tools_used.map((t, i) => (
                    <SkillTag key={i} label={t} color={toolColors} delay={i * 60} />
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages_spoken?.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Languages
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {profile.languages_spoken.map((l, i) => (
                    <SkillTag key={i} label={l} color={domainColors} delay={i * 60} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Follow-up question */}
        {profile?.needs_more_info && profile?.followup_question && step === STEPS.DONE && (
          <div style={{
            background: "#0c1a2e",
            border: "1px solid #1e3a5f",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start"
          }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>🤔</span>
            <div>
              <p style={{ fontSize: "12px", color: "#3b82f6", margin: "0 0 4px", fontWeight: 500 }}>
                Tell us more to improve your profile
              </p>
              <p style={{ fontSize: "13px", color: "#93c5fd", margin: 0, lineHeight: 1.6 }}>
                {profile.followup_question}
              </p>
            </div>
          </div>
        )}

        {/* Basic Details Form */}
        {step === STEPS.DONE && (
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px", color: "#f9fafb" }}>Basic Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>Full Name</label>
                <input 
                  type="text" 
                  value={basicDetails.name}
                  onChange={(e) => setBasicDetails({...basicDetails, name: e.target.value})}
                  placeholder="Enter your name"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#030712", border: "1px solid #1e293b", color: "#fff", fontSize: "14px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>Age</label>
                  <input 
                    type="number" 
                    value={basicDetails.age}
                    onChange={(e) => setBasicDetails({...basicDetails, age: e.target.value})}
                    placeholder="e.g. 28"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#030712", border: "1px solid #1e293b", color: "#fff", fontSize: "14px" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>Gender</label>
                  <select 
                    value={basicDetails.gender}
                    onChange={(e) => setBasicDetails({...basicDetails, gender: e.target.value})}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#030712", border: "1px solid #1e293b", color: "#fff", fontSize: "14px", appearance: "none" }}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={basicDetails.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (val.length <= 10) setBasicDetails({...basicDetails, phone: val})
                    }}
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#030712", border: "1px solid #1e293b", color: "#fff", fontSize: "14px" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>City / Location</label>
                  <input 
                    type="text" 
                    value={basicDetails.city}
                    onChange={(e) => setBasicDetails({...basicDetails, city: e.target.value})}
                    placeholder="e.g. Mumbai"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#030712", border: "1px solid #1e293b", color: "#fff", fontSize: "14px" }}
                  />
                </div>
              </div>
              
              {/* Consent Checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginTop: "4px" }}>
                <input 
                  type="checkbox" 
                  checked={basicDetails.allow_contact}
                  onChange={(e) => setBasicDetails({...basicDetails, allow_contact: e.target.checked})}
                  style={{ marginTop: "3px", accentColor: "#f97316" }}
                />
                <span style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
                  Allow verified employers to contact me by phone. (Your number remains hidden on your public profile).
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {step === STEPS.DONE && !saved && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              Save Profile
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid #1e293b",
                cursor: "pointer",
                background: "#0f172a",
                color: "#9ca3af",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s"
              }}
            >
              Record Again
            </button>
          </div>
        )}

        {/* Post-Save Actions */}
        {step === STEPS.DONE && saved && (
          <div style={{
            background: "#052e16",
            border: "1px solid #166534",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px",
            textAlign: "center"
          }}>
            <h3 style={{ fontSize: "18px", color: "#4ade80", margin: "0 0 16px" }}>🎉 Profile Saved Successfully!</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => navigate(`/jobs/${savedProfileId}`)}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
                  fontSize: "15px", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s"
                }}
                onMouseOver={e => e.target.style.opacity = "0.9"}
                onMouseOut={e => e.target.style.opacity = "1"}
              >
                🔍 Find Matching Jobs
              </button>
              <button
                onClick={() => navigate(`/profile/${savedProfileId}`)}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #1e293b",
                  background: "#0f172a", color: "#f9fafb",
                  fontSize: "15px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s"
                }}
                onMouseOver={e => e.target.style.background = "#1e293b"}
                onMouseOut={e => e.target.style.background = "#0f172a"}
              >
                👁️ View Public Profile
              </button>
              <button
                onClick={reset}
                style={{
                  width: "100%", padding: "10px", border: "none", background: "transparent",
                  color: "#9ca3af", fontSize: "13px", cursor: "pointer", marginTop: "8px"
                }}
              >
                + Record Another Profile
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "#1f2937", marginTop: "32px" }}>
          Built for informal workers across India
        </p>
      </div>
    </div>
  )
}
