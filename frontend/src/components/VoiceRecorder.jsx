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
          background: active ? "var(--accent-primary)" : "var(--bg-surface-secondary)",
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
      background: "var(--bg-base)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }}>
      <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "var(--text-secondary)", display: "flex" }}>{icon}</span>
        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecordingTime(0)
    }
    return () => clearInterval(timerRef.current)
  }, [step])

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
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
        allow_contact: basicDetails.allow_contact
      })
      setSavedProfileId(result.profile_id)
      setSaved(true)
    } catch (err) {
      setError(err.message || "Failed to save profile.")
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
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 16px 48px"
    }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ width: "100%", maxWidth: "480px", paddingTop: "48px", marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "var(--accent-primary)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
          </div>
          <span style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em" }}>SkillBridge</span>
        </div>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          Speak your experience in any language. Get a job-ready profile instantly.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Main Record Area */}
        {step !== STEPS.DONE && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
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
                  ? "var(--accent-primary)"
                  : isProcessing
                    ? "var(--bg-surface-secondary)"
                    : "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              {step === STEPS.IDLE && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>}
              {step === STEPS.RECORDING && <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"/></svg>}
              {isProcessing && (
                <div style={{
                  width: "24px", height: "24px",
                  border: "2px solid var(--border-subtle)",
                  borderTop: "2px solid var(--accent-primary)",
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
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    Tap to start speaking
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                    Hindi, English, or mix both — we understand
                  </p>
                </>
              )}
              {step === STEPS.RECORDING && (
                <>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--accent-primary)", margin: "0 0 4px" }}>
                    Recording {formatTime(recordingTime)}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                    Describe your work, skills, experience
                  </p>
                </>
              )}
              {step === STEPS.TRANSCRIBING && (
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  Transcribing your voice...
                </p>
              )}
              {step === STEPS.EXTRACTING && (
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  Extracting your skills with AI...
                </p>
              )}
            </div>

            {/* Hint */}
            {step === STEPS.IDLE && (
              <div style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "12px 16px",
                width: "100%"
              }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Try saying</p>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>
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
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "16px"
          }}>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              What you said
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: 0, lineHeight: 1.7 }}>{transcript}</p>
          </div>
        )}

        {/* Profile Card */}
        {profile && step === STEPS.DONE && (
          <div className="profile-card" style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            marginBottom: "16px"
          }}>
            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: "var(--accent-primary)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>
                  {profile.name || "Professional Profile"}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  {profile.work_domains?.[0] || "Skilled Worker"}
                </p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span style={{
                  fontSize: "11px", padding: "4px 10px", borderRadius: "999px",
                  background: "var(--bg-surface-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)",
                  display: "inline-flex", alignItems: "center", gap: "4px"
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Voice Verified
                </span>
              </div>
            </div>

            {/* Summary */}
            <p style={{
              fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6,
              margin: "0 0 16px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)"
            }}>
              {profile.summary}
            </p>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <StatCard
                label="Experience"
                value={`${profile.years_experience?.total || "—"} yrs`}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
              />
              <StatCard
                label="Skills Found"
                value={profile.skills?.length || 0}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>}
              />
            </div>

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start"
          }}>
            <span style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: "2px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-primary)", margin: "0 0 4px", fontWeight: 500 }}>
                Tell us more to improve your profile
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                {profile.followup_question}
              </p>
            </div>
          </div>
        )}

        {/* Basic Details Form */}
        {step === STEPS.DONE && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px", color: "var(--text-primary)" }}>Basic Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Full Name</label>
                <input 
                  type="text" 
                  value={basicDetails.name}
                  onChange={(e) => setBasicDetails({...basicDetails, name: e.target.value})}
                  placeholder="Enter your name"
                  style={{ width: "100%", padding: "10px 14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: "var(--font-sm)" }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Age</label>
                  <input 
                    type="number" 
                    value={basicDetails.age}
                    onChange={(e) => setBasicDetails({...basicDetails, age: e.target.value})}
                    placeholder="e.g. 28"
                    style={{ width: "100%", padding: "10px 14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: "var(--font-sm)" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Gender</label>
                  <select 
                    value={basicDetails.gender}
                    onChange={(e) => setBasicDetails({...basicDetails, gender: e.target.value})}
                    style={{ width: "100%", padding: "10px 14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: "var(--font-sm)", appearance: "none" }}
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
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={basicDetails.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (val.length <= 10) setBasicDetails({...basicDetails, phone: val})
                    }}
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    style={{ width: "100%", padding: "10px 14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: "var(--font-sm)" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>City / Location</label>
                  <input 
                    type="text" 
                    value={basicDetails.city}
                    onChange={(e) => setBasicDetails({...basicDetails, city: e.target.value})}
                    placeholder="e.g. Mumbai"
                    style={{ width: "100%", padding: "10px 14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: "var(--font-sm)" }}
                  />
                </div>
              </div>
              
              {/* Consent Checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginTop: "4px" }}>
                <input 
                  type="checkbox" 
                  checked={basicDetails.allow_contact}
                  onChange={(e) => setBasicDetails({...basicDetails, allow_contact: e.target.checked})}
                  style={{ marginTop: "3px", accentColor: "var(--accent-primary)" }}
                />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
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
                minHeight: "var(--touch-target)",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                background: "var(--accent-primary)",
                color: "#fff",
                fontSize: "var(--font-sm)",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
              onMouseOver={e => e.target.style.background = "var(--accent-primary-hover)"}
              onMouseOut={e => e.target.style.background = "var(--accent-primary)"}
            >
              Save Profile
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "14px",
                minHeight: "var(--touch-target)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                fontSize: "var(--font-sm)",
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
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            marginBottom: "24px",
            textAlign: "center"
          }}>
            <h3 style={{ fontSize: "18px", color: "#4ade80", margin: "0 0 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Profile Saved Successfully!
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => navigate(`/jobs/${savedProfileId}`)}
                style={{
                  width: "100%", padding: "14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", border: "none",
                  background: "var(--accent-primary)", color: "#fff",
                  fontSize: "var(--font-base)", fontWeight: 600, cursor: "pointer", transition: "background 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
                onMouseOver={e => e.target.style.background = "var(--accent-primary-hover)"}
                onMouseOut={e => e.target.style.background = "var(--accent-primary)"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Find Matching Jobs
              </button>
              <button
                onClick={() => navigate(`/profile/${savedProfileId}`)}
                style={{
                  width: "100%", padding: "14px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)", color: "var(--text-primary)",
                  fontSize: "var(--font-base)", fontWeight: 500, cursor: "pointer", transition: "background 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
                onMouseOver={e => e.target.style.background = "var(--bg-surface-secondary)"}
                onMouseOut={e => e.target.style.background = "var(--bg-surface)"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                View Public Profile
              </button>
              <button
                onClick={reset}
                style={{
                  width: "100%", padding: "10px", minHeight: "var(--touch-target)", border: "none", background: "transparent",
                  color: "var(--text-secondary)", fontSize: "var(--font-sm)", cursor: "pointer", marginTop: "8px"
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
