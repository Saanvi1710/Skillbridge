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
      minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .profile-list-container {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .profile-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background 0.2s;
        }
        .profile-list-item:last-child {
          border-bottom: none;
        }
        .profile-list-item:hover {
          background: var(--bg-surface-secondary);
        }
        .profile-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .profile-identity {
          min-width: 140px;
          flex-shrink: 0;
        }
        .profile-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          color: var(--text-secondary);
          font-size: 13px;
          flex-shrink: 0;
        }
        .profile-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex: 1;
        }
        .profile-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
          margin-left: 16px;
        }
        
        @media (max-width: 800px) {
          .profile-list-container {
            background: transparent;
            border: none;
            border-radius: 0;
            overflow: visible;
          }
          .profile-list-item {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            margin-bottom: 12px;
          }
          .profile-list-item:last-child {
            margin-bottom: 0;
            border-bottom: 1px solid var(--border-subtle);
          }
          .profile-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            width: 100%;
            margin-bottom: 16px;
          }
          .profile-meta {
            flex-wrap: wrap;
          }
          .profile-actions {
            width: 100%;
            justify-content: flex-end;
            margin-left: 0;
          }
        }
      `}</style>

      {/* Nav */}
      <div style={{
        maxWidth: "800px", margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-lg) 0", borderBottom: "1px solid var(--border-subtle)", marginBottom: "var(--space-xl)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "var(--radius-sm)",
            background: "var(--accent-primary)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: "var(--font-base)" }}>SkillBridge</span>
        </div>
        <button onClick={handleSignOut} style={{
          padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
          border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
          color: "var(--text-muted)", fontSize: "var(--font-sm)", cursor: "pointer"
        }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <p style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)", margin: "0 0 4px" }}>Welcome back</p>
          <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 600, margin: "0 0 4px" }}>
            {showArchived ? "Archived Profiles" : "Your Profiles"}
          </h1>
          <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", margin: 0 }}>
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        {/* New Profile Button — only in active view */}
        {!showArchived && (
          <button
            onClick={() => navigate("/record")}
            onMouseOver={(e) => e.target.style.background = "var(--accent-primary-hover)"}
            onMouseOut={(e) => e.target.style.background = "var(--accent-primary)"}
            style={{
              width: "100%", padding: "var(--space-md)", minHeight: "var(--touch-target)",
              background: "var(--accent-primary)",
              border: "none", borderRadius: "var(--radius-md)", color: "#fff",
              fontSize: "var(--font-base)", fontWeight: 600, cursor: "pointer", marginBottom: "var(--space-lg)",
              transition: "background 0.2s"
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
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>Loading...</p>
        ) : profiles.length === 0 ? (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "var(--space-xl)", textAlign: "center"
          }}>
            <div style={{ margin: "0 auto var(--space-md)", width: "48px", height: "48px", color: "var(--text-muted)" }}>
              {showArchived ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              )}
            </div>
            <p style={{ fontSize: "var(--font-base)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 6px" }}>
              {showArchived ? "No archived profiles" : "No profiles yet"}
            </p>
            <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", margin: 0 }}>
              {showArchived
                ? "Archived profiles will appear here"
                : "Record your first voice profile to get started"}
            </p>
          </div>
        ) : (
          <div className="profile-list-container">
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/profile/${p.id}`)}
                className="profile-list-item"
                style={{ opacity: p.is_archived ? 0.75 : 1 }}
              >
                <div className="profile-info">
                  {/* Identity */}
                  <div className="profile-identity">
                    <p style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                      {p.work_domains?.[0] || "Skilled Worker"}
                    </p>
                    {p.is_archived ? (
                      <span style={{
                        fontSize: "10px", padding: "2px 8px", borderRadius: "var(--radius-full)",
                        background: "var(--bg-surface-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)",
                        textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-block"
                      }}>Archived</span>
                    ) : (
                      <span style={{
                        fontSize: "10px", padding: "2px 8px", borderRadius: "var(--radius-full)",
                        background: "var(--bg-surface-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)",
                        textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-block"
                      }}>Share-Ready</span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="profile-meta">
                    {p.city && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {p.city}
                      </div>
                    )}
                    {p.years_experience?.total && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {p.years_experience.total} yrs
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formatDate(p.created_at)}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="profile-skills">
                    {(p.raw_skills?.skills || []).slice(0, 3).map((s, i) => (
                      <span key={i} style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "var(--radius-full)",
                        background: "var(--bg-surface-secondary)", color: "var(--text-secondary)"
                      }}>{s}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="profile-actions">
                  {p.is_archived ? (
                    <>
                      <button
                        onClick={(e) => handleRestore(e, p.id)}
                        style={{
                          padding: "6px 12px", minHeight: "32px", background: "transparent",
                          border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        Restore
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        style={{
                          padding: "6px 12px", minHeight: "32px", background: "transparent",
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
                          padding: "6px 12px", minHeight: "32px",
                          background: "var(--accent-primary)",
                          border: "none", borderRadius: "var(--radius-sm)", color: "#fff",
                          fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        Find Jobs
                      </button>
                      <button
                        onClick={(e) => handleArchive(e, p.id)}
                        style={{
                          padding: "6px 12px", minHeight: "32px", background: "transparent",
                          border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
                          color: "var(--text-secondary)", fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        Archive
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        style={{
                          padding: "6px 12px", minHeight: "32px", background: "transparent",
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
            ))}
          </div>
        )}

        {/* Archive toggle at bottom */}
        <div style={{ marginTop: "var(--space-xl)", textAlign: "center" }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{
              padding: "var(--space-sm) var(--space-lg)", minHeight: "var(--touch-target)", background: "transparent",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
              color: showArchived ? "var(--accent-primary)" : "var(--text-muted)",
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