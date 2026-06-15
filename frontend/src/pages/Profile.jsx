import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { authFetch } from "../services/api"

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    authFetch(`/profile/${id}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch((err) => { setError(err.message || "Failed to load profile."); setLoading(false) })
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#4b5563", fontFamily: "DM Sans, sans-serif" }}>Loading profile...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: "12px", padding: "16px 24px", color: "#fca5a5", fontFamily: "DM Sans, sans-serif" }}>
        ⚠ {error}
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#4b5563", fontFamily: "DM Sans, sans-serif" }}>Profile not found.</p>
    </div>
  )

  const skills = profile.raw_skills?.skills || []
  const tools = profile.tools_used || []
  const domains = profile.work_domains || []

  return (
    <div style={{
      minHeight: "100vh", background: "#030712", color: "#f9fafb",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0", borderBottom: "1px solid #1e293b", marginBottom: "32px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => navigate("/")}>
            <span>🎙</span>
            <span style={{ fontWeight: 600 }}>SkillBridge</span>
          </div>
          <button onClick={copyLink} style={{
            padding: "6px 14px", background: copied ? "#052e16" : "transparent",
            border: `1px solid ${copied ? "#166534" : "#1e293b"}`,
            borderRadius: "8px", color: copied ? "#4ade80" : "#6b7280",
            fontSize: "13px", cursor: "pointer", transition: "all 0.2s"
          }}>
            {copied ? "✓ Copied" : "Share Profile"}
          </button>
        </div>

        {/* Profile Header */}
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: "20px", padding: "24px", marginBottom: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", flexShrink: 0
            }}>
              {domains[0]?.[0] || "👤"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: "#f9fafb" }}>
                  {profile.name || "Skilled Professional"}
                </h1>
                {profile.age && (
                  <span style={{ fontSize: "12px", padding: "2px 8px", background: "#1f2937", borderRadius: "999px", color: "#d1d5db" }}>
                    {profile.age} yrs
                  </span>
                )}
                {profile.gender && (
                  <span style={{ fontSize: "12px", padding: "2px 8px", background: "#1f2937", borderRadius: "999px", color: "#d1d5db" }}>
                    {profile.gender}
                  </span>
                )}
                {profile.city && (
                  <span style={{ fontSize: "12px", padding: "2px 8px", background: "#1f2937", borderRadius: "999px", color: "#d1d5db" }}>
                    📍 {profile.city}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 4px", fontWeight: 500 }}>
                {domains[0] || "Professional Worker"}
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                {profile.years_experience?.total
                  ? `${profile.years_experience.total} years experience`
                  : "Experienced professional"}
              </p>
            </div>
          </div>

          <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.7, margin: 0 }}>
            {profile.generated_summary}
          </p>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: "16px", padding: "20px", marginBottom: "12px"
          }}>
            <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Skills
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {skills.map((s, i) => (
                <span key={i} style={{
                  padding: "5px 12px", borderRadius: "999px", fontSize: "13px",
                  background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8"
                }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {tools.length > 0 && (
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: "16px", padding: "20px", marginBottom: "12px"
          }}>
            <p style={{ fontSize: "11px", color: "#4b5563", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Tools & Equipment
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tools.map((t, i) => (
                <span key={i} style={{
                  padding: "5px 12px", borderRadius: "999px", fontSize: "13px",
                  background: "#1a2e1a", color: "#86efac", border: "1px solid #166534"
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{
          background: "#0c1a2e", border: "1px solid #1e3a5f",
          borderRadius: "16px", padding: "20px", textAlign: "center", marginTop: "8px"
        }}>
          <p style={{ fontSize: "14px", color: "#93c5fd", margin: "0 0 12px" }}>
            Want your own profile like this?
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "10px 24px",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              border: "none", borderRadius: "10px", color: "#fff",
              fontSize: "14px", fontWeight: 600, cursor: "pointer"
            }}
          >
            Create Free Profile →
          </button>
        </div>
      </div>
    </div>
  )
}