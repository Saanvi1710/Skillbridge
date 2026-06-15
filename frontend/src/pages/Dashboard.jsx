import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../services/supabase"
import ConfirmModal from "../components/ConfirmModal"

// Format a date string as "15 Jun 2026"
function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedCount, setArchivedCount] = useState(0)
  const [error, setError] = useState(null)
  const [deleteModalId, setDeleteModalId] = useState(null)
  const navigate = useNavigate()

  // ── Fetch ──────────────────────────────────────────────
  const fetchProfiles = async (archived = showArchived) => {
    setError(null)
    const { data, error: sbError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", archived)
      .order("created_at", { ascending: false })

    if (sbError) {
      console.error(sbError)
      setError(sbError.message || "Failed to load profiles")
    }
    setProfiles(data || [])
    setLoading(false)
  }

  const fetchArchivedCount = async () => {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", true)
    setArchivedCount(count || 0)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchProfiles(showArchived)
    fetchArchivedCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  // ── Actions ────────────────────────────────────────────
  const handleArchive = async (e, profileId) => {
    e.stopPropagation()
    const { error: sbError } = await supabase
      .from("profiles")
      .update({ is_archived: true })
      .eq("id", profileId)
    if (sbError) { setError(sbError.message || "Failed to archive profile"); return }
    fetchProfiles(showArchived)
    fetchArchivedCount()
  }

  const handleRestore = async (e, profileId) => {
    e.stopPropagation()
    const { error: sbError } = await supabase
      .from("profiles")
      .update({ is_archived: false })
      .eq("id", profileId)
    if (sbError) { setError(sbError.message || "Failed to restore profile"); return }
    fetchProfiles(showArchived)
    fetchArchivedCount()
  }

  const handleDelete = (e, profileId) => {
    e.stopPropagation()
    setDeleteModalId(profileId)
  }

  const confirmDelete = async () => {
    if (!deleteModalId) return
    const { error: sbError } = await supabase.from("profiles").delete().eq("id", deleteModalId)
    if (sbError) { setError(sbError.message || "Failed to delete profile"); return }
    setDeleteModalId(null)
    fetchProfiles(showArchived)
    fetchArchivedCount()
  }

  const confirmArchive = async () => {
    if (!deleteModalId) return
    const { error: sbError } = await supabase
      .from("profiles")
      .update({ is_archived: true })
      .eq("id", deleteModalId)
    if (sbError) { setError(sbError.message || "Failed to archive profile"); return }
    setDeleteModalId(null)
    fetchProfiles(showArchived)
    fetchArchivedCount()
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#030712", color: "#f9fafb",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{
        maxWidth: "480px", margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-lg) 0", borderBottom: "1px solid #1e293b", marginBottom: "var(--space-xl)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ fontSize: "var(--font-lg)" }}>🎙</span>
          <span style={{ fontWeight: 600, fontSize: "var(--font-base)" }}>SkillBridge</span>
        </div>
        <button onClick={handleSignOut} style={{
          padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
          border: "1px solid #1e293b", borderRadius: "var(--radius-sm)",
          color: "#6b7280", fontSize: "var(--font-sm)", cursor: "pointer"
        }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <p style={{ fontSize: "var(--font-xs)", color: "#4b5563", margin: "0 0 4px" }}>Welcome back</p>
          <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 600, margin: "0 0 4px" }}>
            {showArchived ? "Archived Profiles" : "Your Profiles"}
          </h1>
          <p style={{ fontSize: "var(--font-sm)", color: "#6b7280", margin: 0 }}>
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        {/* New Profile Button — only in active view */}
        {!showArchived && (
          <button onClick={() => navigate("/record")} style={{
            width: "100%", padding: "var(--space-md)", minHeight: "var(--touch-target)",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none", borderRadius: "var(--radius-md)", color: "#fff",
            fontSize: "var(--font-base)", fontWeight: 600, cursor: "pointer", marginBottom: "var(--space-lg)"
          }}>
            + Create New Profile
          </button>
        )}

        {/* Error Banner */}
        {error && (
          <div style={{
            background: "#2d0a0a", border: "1px solid #7f1d1d",
            borderRadius: "12px", padding: "14px 16px", marginBottom: "20px",
            color: "#fca5a5", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px"
          }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {/* Profiles List */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#4b5563", fontSize: "var(--font-sm)" }}>Loading...</p>
        ) : profiles.length === 0 ? (
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: "var(--radius-lg)", padding: "var(--space-xl)", textAlign: "center"
          }}>
            <p style={{ fontSize: "var(--font-2xl)", margin: "0 0 var(--space-md)" }}>{showArchived ? "📦" : "🎙"}</p>
            <p style={{ fontSize: "var(--font-base)", fontWeight: 500, color: "#e5e7eb", margin: "0 0 6px" }}>
              {showArchived ? "No archived profiles" : "No profiles yet"}
            </p>
            <p style={{ fontSize: "var(--font-sm)", color: "#4b5563", margin: 0 }}>
              {showArchived
                ? "Archived profiles will appear here"
                : "Record your first voice profile to get started"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/profile/${p.id}`)}
                style={{
                  background: "#0f172a",
                  border: `1px solid ${p.is_archived ? "#374151" : "#1e293b"}`,
                  borderRadius: "var(--radius-lg)", padding: "var(--space-md) var(--space-lg)", cursor: "pointer",
                  opacity: p.is_archived ? 0.75 : 1
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-md)" }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "2px" }}>
                      <p style={{ fontSize: "var(--font-base)", fontWeight: 500, color: "#f9fafb", margin: 0 }}>
                        {p.work_domains?.[0] || "Skilled Worker"}
                      </p>
                      {p.is_archived && (
                        <span style={{
                          fontSize: "var(--font-xs)", padding: "2px var(--space-sm)", borderRadius: "var(--radius-full)",
                          background: "#1f2937", color: "#6b7280", border: "1px solid #374151"
                        }}>Archived</span>
                      )}
                    </div>
                    <p style={{ fontSize: "var(--font-xs)", color: "#4b5563", margin: "0 0 6px" }}>
                      {formatDate(p.created_at)}
                      {p.years_experience?.total ? ` · ${p.years_experience.total} yrs exp` : ""}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {(p.raw_skills?.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} style={{
                          fontSize: "var(--font-xs)", padding: "3px 10px", borderRadius: "var(--radius-full)",
                          background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8"
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", flexShrink: 0 }}>
                    {p.is_archived ? (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, p.id)}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                            border: "1px solid #166534", borderRadius: "var(--radius-sm)",
                            color: "#4ade80", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                            border: "1px solid #7f1d1d", borderRadius: "var(--radius-sm)",
                            color: "#f87171", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${p.id}`) }}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)",
                            background: "linear-gradient(135deg, #f97316, #ea580c)",
                            border: "none", borderRadius: "var(--radius-sm)", color: "#fff",
                            fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          Find Jobs
                        </button>
                        <button
                          onClick={(e) => handleArchive(e, p.id)}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                            border: "1px solid #374151", borderRadius: "var(--radius-sm)",
                            color: "#6b7280", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          Archive
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
                            border: "1px solid #7f1d1d", borderRadius: "var(--radius-sm)",
                            color: "#f87171", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archive toggle at bottom */}
        <div style={{ marginTop: "var(--space-xl)", textAlign: "center" }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{
              padding: "var(--space-sm) var(--space-lg)", minHeight: "var(--touch-target)", background: "transparent",
              border: "1px solid #1e293b", borderRadius: "var(--radius-sm)",
              color: showArchived ? "#f97316" : "#6b7280",
              fontSize: "var(--font-sm)", cursor: "pointer"
            }}
          >
            {showArchived
              ? "← Back to active profiles"
              : `Show archived${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
          </button>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!deleteModalId} 
        onClose={() => setDeleteModalId(null)}
        onArchive={confirmArchive}
        onDelete={confirmDelete}
      />
    </div>
  )
}