import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { authFetch, BASE_URL, updateContactDetails } from "../services/api"
import { useAuth } from "../context/AuthContext"

// ── Inline edit panel ──────────────────────────────────
function ContactEditPanel({ profileId, initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    phone: "",           // always blank — phone is private, user re-enters to update
    city: initial.city || "",
    allow_contact: initial.allow_contact !== false  // default true
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Only send phone if the user actually typed something
      const payload = {
        name: form.name.trim() || undefined,
        city: form.city.trim() || undefined,
        allow_contact: form.allow_contact,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {})
      }
      await updateContactDetails(profileId, payload)
      onSave()
    } catch (err) {
      setSaveError(err.message || "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px var(--space-md)", boxSizing: "border-box",
    background: "#0f172a", border: "1px solid #374151", borderRadius: "var(--radius-sm)",
    color: "#f9fafb", fontSize: "var(--font-sm)", outline: "none",
    fontFamily: "'DM Sans', sans-serif"
  }
  const labelStyle = {
    display: "block", fontSize: "var(--font-xs)", color: "#4b5563",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px"
  }

  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e3a5f",
      borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", marginBottom: "var(--space-md)"
    }}>
      <p style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "#93c5fd", margin: "0 0 var(--space-md)" }}>
        ✏ Edit Contact Details
      </p>

      {saveError && (
        <div style={{
          background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: "var(--radius-sm)",
          padding: "10px var(--space-md)", marginBottom: "14px", color: "#fca5a5", fontSize: "var(--font-sm)"
        }}>
          ⚠ {saveError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label htmlFor="contact-name" style={labelStyle}>Name</label>
          <input
            id="contact-name"
            style={inputStyle}
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="contact-city" style={labelStyle}>City</label>
          <input
            id="contact-city"
            style={inputStyle}
            value={form.city}
            onChange={e => set("city", e.target.value)}
            placeholder="Your city"
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" style={labelStyle}>Phone (leave blank to keep unchanged)</label>
          <input
            id="contact-phone"
            style={inputStyle}
            type="tel"
            value={form.phone}
            onChange={e => set("phone", e.target.value)}
            placeholder="Enter new phone number to update"
            maxLength={20}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            role="switch"
            aria-checked={form.allow_contact}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                set("allow_contact", !form.allow_contact)
              }
            }}
            onClick={() => set("allow_contact", !form.allow_contact)}
            style={{
              width: "40px", height: "22px", borderRadius: "var(--radius-full)", border: "none",
              background: form.allow_contact ? "#f97316" : "#374151",
              cursor: "pointer", position: "relative", flexShrink: 0,
              transition: "background 0.2s"
            }}
          >
            <span style={{
              position: "absolute", top: "3px",
              left: form.allow_contact ? "20px" : "3px",
              width: "16px", height: "16px", borderRadius: "50%",
              background: "#fff", transition: "left 0.2s"
            }} />
          </button>
          <span style={{ fontSize: "var(--font-sm)", color: "#9ca3af" }}>
            Allow employers to contact me
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "10px", minHeight: "var(--touch-target)",
            background: saving ? "#374151" : "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none", borderRadius: "var(--radius-md)", color: "#fff",
            fontSize: "var(--font-sm)", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "10px 18px", minHeight: "var(--touch-target)", background: "transparent",
            border: "1px solid #374151", borderRadius: "var(--radius-md)",
            color: "#6b7280", fontSize: "var(--font-sm)", cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main Profile page ──────────────────────────────────
export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const loadProfile = () => {
    setLoading(true)
    authFetch(`${BASE_URL}/profile/${id}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(err => { setError(err.message || "Failed to load profile."); setLoading(false) })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveContact = () => {
    setEditMode(false)
    loadProfile()   // re-fetch to show updated name/city
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#4b5563", fontFamily: "DM Sans, sans-serif" }}>Loading profile...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: "var(--radius-md)", padding: "var(--space-md) var(--space-lg)", color: "#fca5a5", fontFamily: "DM Sans, sans-serif" }}>
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
  const isOwner = !!user   // backend already 403s non-owners; if we can fetch it, we own it

  return (
    <div style={{
      minHeight: "100vh", background: "#030712", color: "#f9fafb",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-lg) 0", borderBottom: "1px solid #1e293b", marginBottom: "var(--space-xl)"
        }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}
            onClick={() => navigate(user ? "/dashboard" : "/")}
          >
            <span>🎙</span>
            <span style={{ fontWeight: 600 }}>SkillBridge</span>
          </div>

          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                  border: "1px solid #1e3a5f", borderRadius: "var(--radius-sm)",
                  color: "#93c5fd", fontSize: "var(--font-sm)", cursor: "pointer"
                }}
              >
                Edit Contact
              </button>
            )}
            <button onClick={copyLink} style={{
              padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: copied ? "#052e16" : "transparent",
              border: `1px solid ${copied ? "#166534" : "#1e293b"}`,
              borderRadius: "var(--radius-sm)", color: copied ? "#4ade80" : "#6b7280",
              fontSize: "var(--font-sm)", cursor: "pointer", transition: "all 0.2s"
            }}>
              {copied ? "✓ Copied" : "Share Profile"}
            </button>
          </div>
        </div>

        {/* Inline edit panel */}
        {editMode && (
          <ContactEditPanel
            profileId={id}
            initial={{ name: profile.name, city: profile.city, allow_contact: true }}
            onSave={handleSaveContact}
            onCancel={() => setEditMode(false)}
          />
        )}

        {/* Profile Header */}
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: "var(--radius-xl)", padding: "var(--space-lg)", marginBottom: "var(--space-md)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "var(--space-md)" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "var(--font-xl)", flexShrink: 0
            }}>
              {domains[0]?.[0] || "👤"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 600, margin: 0, color: "#f9fafb" }}>
                  {profile.name || "Skilled Professional"}
                </h1>
                {profile.age && (
                  <span style={{ fontSize: "var(--font-xs)", padding: "2px var(--space-sm)", background: "#1f2937", borderRadius: "var(--radius-full)", color: "#d1d5db" }}>
                    {profile.age} yrs
                  </span>
                )}
                {profile.gender && (
                  <span style={{ fontSize: "var(--font-xs)", padding: "2px var(--space-sm)", background: "#1f2937", borderRadius: "var(--radius-full)", color: "#d1d5db" }}>
                    {profile.gender}
                  </span>
                )}
                {profile.city && (
                  <span style={{ fontSize: "var(--font-xs)", padding: "2px var(--space-sm)", background: "#1f2937", borderRadius: "var(--radius-full)", color: "#d1d5db" }}>
                    📍 {profile.city}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "var(--font-sm)", color: "#9ca3af", margin: "0 0 4px", fontWeight: 500 }}>
                {domains[0] || "Professional Worker"}
              </p>
              <p style={{ fontSize: "var(--font-sm)", color: "#6b7280", margin: 0 }}>
                {profile.years_experience?.total
                  ? `${profile.years_experience.total} years experience`
                  : "Experienced professional"}
              </p>
            </div>
          </div>

          <p style={{ fontSize: "var(--font-sm)", color: "#9ca3af", lineHeight: 1.7, margin: 0 }}>
            {profile.generated_summary}
          </p>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", marginBottom: "var(--space-md)"
          }}>
            <p style={{ fontSize: "var(--font-xs)", color: "#4b5563", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Skills
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
              {skills.map((s, i) => (
                <span key={i} style={{
                  padding: "5px var(--space-md)", borderRadius: "var(--radius-full)", fontSize: "var(--font-sm)",
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
            borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", marginBottom: "var(--space-md)"
          }}>
            <p style={{ fontSize: "var(--font-xs)", color: "#4b5563", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Tools & Equipment
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
              {tools.map((t, i) => (
                <span key={i} style={{
                  padding: "5px var(--space-md)", borderRadius: "var(--radius-full)", fontSize: "var(--font-sm)",
                  background: "#1a2e1a", color: "#86efac", border: "1px solid #166534"
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA — only for non-owners / public visitors */}
        {!isOwner && (
          <div style={{
            background: "#0c1a2e", border: "1px solid #1e3a5f",
            borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", textAlign: "center", marginTop: "var(--space-sm)"
          }}>
            <p style={{ fontSize: "var(--font-sm)", color: "#93c5fd", margin: "0 0 var(--space-md)" }}>
              Want your own profile like this?
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "10px var(--space-lg)", minHeight: "var(--touch-target)",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "none", borderRadius: "var(--radius-md)", color: "#fff",
                fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer"
              }}
            >
              Create Free Profile →
            </button>
          </div>
        )}

        {/* Owner footer nav */}
        {isOwner && (
          <div style={{ display: "flex", gap: "10px", marginTop: "var(--space-md)" }}>
            <button
              onClick={() => navigate(`/jobs/${id}`)}
              style={{
                flex: 1, padding: "12px", minHeight: "var(--touch-target)",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "none", borderRadius: "var(--radius-md)", color: "#fff",
                fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer"
              }}
            >
              Find Matching Jobs →
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "12px 18px", minHeight: "var(--touch-target)", background: "transparent",
                border: "1px solid #1e293b", borderRadius: "var(--radius-md)",
                color: "#6b7280", fontSize: "var(--font-sm)", cursor: "pointer"
              }}
            >
              Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}