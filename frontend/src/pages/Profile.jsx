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
    background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)", fontSize: "var(--font-sm)", outline: "none",
    fontFamily: "'DM Sans', sans-serif"
  }
  const labelStyle = {
    display: "block", fontSize: "var(--font-xs)", color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px"
  }

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", marginBottom: "var(--space-md)"
    }}>
      <p style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-md)", display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit Contact Details
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
              background: form.allow_contact ? "var(--accent-primary)" : "var(--bg-surface-secondary)",
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
          <span style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>
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
            background: saving ? "var(--bg-surface-secondary)" : "var(--accent-primary)",
            border: "none", borderRadius: "var(--radius-md)", color: "#fff",
            fontSize: "var(--font-sm)", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => { if(!saving) e.target.style.background = "var(--accent-primary-hover)" }}
          onMouseOut={(e) => { if(!saving) e.target.style.background = "var(--accent-primary)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "10px 18px", minHeight: "var(--touch-target)", background: "transparent",
            border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)", fontSize: "var(--font-sm)", cursor: "pointer"
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
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>Loading profile...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: "var(--radius-md)", padding: "var(--space-md) var(--space-lg)", color: "#fca5a5", fontFamily: "DM Sans, sans-serif" }}>
        ⚠ {error}
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>Profile not found.</p>
    </div>
  )

  const skills = profile.raw_skills?.skills || []
  const tools = profile.tools_used || []
  const domains = profile.work_domains || []
  const isOwner = !!user   // backend already 403s non-owners; if we can fetch it, we own it

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-lg) 0", borderBottom: "1px solid var(--border-subtle)", marginBottom: "var(--space-xl)"
        }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}
            onClick={() => navigate(user ? "/dashboard" : "/")}
          >
            <div style={{
              width: "28px", height: "28px", borderRadius: "var(--radius-sm)",
              background: "var(--accent-primary)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
            </div>
            <span style={{ fontWeight: 600 }}>SkillBridge</span>
          </div>

          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                  border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)", fontSize: "var(--font-sm)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Edit Contact
              </button>
            )}
            <button onClick={copyLink} style={{
              padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: copied ? "#052e16" : "transparent",
              border: `1px solid ${copied ? "#166534" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-sm)", color: copied ? "#4ade80" : "var(--text-muted)",
              fontSize: "var(--font-sm)", cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share Profile
                </>
              )}
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

        {/* Profile Header & Summary */}
        <div style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "var(--radius-sm)",
              background: "var(--accent-primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "4px" }}>
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {profile.name || "Skilled Professional"}
                  </h1>
                  <p style={{ fontSize: "16px", color: "var(--text-secondary)", margin: "4px 0 0", fontWeight: 500 }}>
                    {domains[0] || "Professional Worker"}
                  </p>
                </div>
                <span style={{
                  fontSize: "11px", padding: "4px 10px", borderRadius: "var(--radius-full)",
                  background: "var(--bg-surface-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)",
                  display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Voice Verified
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: "12px" }}>
                {profile.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {profile.city}
                  </span>
                )}
                {profile.years_experience?.total && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {profile.years_experience.total} yrs exp
                  </span>
                )}
                {profile.age && (
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    {profile.age} years old
                  </span>
                )}
                {profile.gender && (
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    • {profile.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
            {profile.generated_summary}
          </p>
        </div>

        {/* Details Grid (Skills & Tools) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginBottom: "40px" }}>
          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h2 style={{ fontSize: "14px", color: "var(--text-primary)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Skills
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "14px",
                    background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)"
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {tools.length > 0 && (
            <div>
              <h2 style={{ fontSize: "14px", color: "var(--text-primary)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Tools & Equipment
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {tools.map((t, i) => (
                  <span key={i} style={{
                    padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "14px",
                    background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)"
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA — only for non-owners / public visitors */}
        {!isOwner && (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "var(--space-lg)", textAlign: "center", marginTop: "var(--space-sm)"
          }}>
            <p style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", margin: "0 0 var(--space-md)" }}>
              Want your own profile like this?
            </p>
            <button
              onClick={() => navigate("/login")}
              onMouseOver={(e) => e.target.style.background = "var(--accent-primary-hover)"}
              onMouseOut={(e) => e.target.style.background = "var(--accent-primary)"}
              style={{
                padding: "10px var(--space-lg)", minHeight: "var(--touch-target)",
                background: "var(--accent-primary)",
                border: "none", borderRadius: "var(--radius-md)", color: "#fff",
                fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer",
                transition: "background 0.2s"
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
              onMouseOver={(e) => e.target.style.background = "var(--accent-primary-hover)"}
              onMouseOut={(e) => e.target.style.background = "var(--accent-primary)"}
              style={{
                flex: 1, padding: "12px", minHeight: "var(--touch-target)",
                background: "var(--accent-primary)",
                border: "none", borderRadius: "var(--radius-md)", color: "#fff",
                fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              Find Matching Jobs →
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "12px 18px", minHeight: "var(--touch-target)", background: "transparent",
                border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)", fontSize: "var(--font-sm)", cursor: "pointer"
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