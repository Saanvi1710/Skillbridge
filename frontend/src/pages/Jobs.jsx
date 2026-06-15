import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getJobMatches, authFetch, BASE_URL } from "../services/api"

export default function Jobs() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const itemsPerPage = 10

  const [searchType, setSearchType] = useState("local") // "local" or "anywhere"

  const fetchJobs = async (profileData, locationType) => {
    setLoading(true)
    setError(null)
    const skills = profileData.raw_skills?.skills || []
    const summary = profileData.generated_summary || ""
    const work_domains = profileData.work_domains || []
    const city = locationType === "local" && profileData.city ? profileData.city : null
    
    try {
      const { matches } = await getJobMatches(skills, summary, work_domains, city)
      setJobs(matches)
    } catch (e) {
      setError(e.message || "Failed to fetch matching jobs.")
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    authFetch(`${BASE_URL}/profile/${profileId}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        // Auto-select "anywhere" if user has no city
        if (!data.city) {
          setSearchType("anywhere")
          fetchJobs(data, "anywhere")
        } else {
          fetchJobs(data, "local")
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile.")
        setLoading(false)
      })
  }, [profileId])

  const handleToggle = (type) => {
    if (type === searchType || !profile) return
    setSearchType(type)
    fetchJobs(profile, type)
  }

  const sourceLabel = (source) => {
    switch (source) {
      case "adzuna": return { text: "Adzuna", bg: "#1a1a2e", color: "#818cf8", border: "#3730a3" }
      case "jooble": return { text: "Jooble", bg: "#1a2e1a", color: "#86efac", border: "#166534" }
      case "jsearch": return { text: "JSearch", bg: "#0f172a", color: "#38bdf8", border: "#0284c7" }
      default: return { text: "SkillBridge", bg: "#2d1b0e", color: "#fdba74", border: "#92400e" }
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{
        maxWidth: "480px", margin: "0 auto",
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
          <span style={{ fontWeight: 600 }}>SkillBridge</span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button onClick={() => navigate(`/profile/${profileId}`)} style={{
            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
            border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)", fontSize: "var(--font-sm)", cursor: "pointer"
          }}>View Profile</button>
          <button onClick={() => navigate("/dashboard")} style={{
            padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
            border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)", fontSize: "var(--font-sm)", cursor: "pointer"
          }}>Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 600, margin: "0 0 6px" }}>
            Matching Jobs
          </h1>
          <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", margin: 0 }}>
            Matches your skills
          </p>
        </div>

        {/* Location Toggle */}
        {profile?.city && (
          <div style={{
            display: "flex", background: "var(--bg-surface)", borderRadius: "var(--radius-md)",
            padding: "4px", marginBottom: "var(--space-lg)", border: "1px solid var(--border-subtle)"
          }}>
            <button
              onClick={() => handleToggle("local")}
              style={{
                flex: 1, padding: "var(--space-sm) 0", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", border: "none",
                background: searchType === "local" ? "var(--bg-surface-secondary)" : "transparent",
                color: searchType === "local" ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "var(--font-sm)", fontWeight: searchType === "local" ? 600 : 500,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Only in {profile.city}
            </button>
            <button
              onClick={() => handleToggle("anywhere")}
              style={{
                flex: 1, padding: "var(--space-sm) 0", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)", border: "none",
                background: searchType === "anywhere" ? "var(--bg-surface-secondary)" : "transparent",
                color: searchType === "anywhere" ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "var(--font-sm)", fontWeight: searchType === "anywhere" ? 600 : 500,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Anywhere in India
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div style={{
            background: "#2d0a0a", border: "1px solid #7f1d1d",
            borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: "20px",
            color: "#fca5a5", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px"
          }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Real-time indicator */}
        {!loading && jobs.length > 0 && jobs[0].source !== "skillbridge" && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 14px", marginBottom: "var(--space-md)",
            background: "#0c1a2e", border: "1px solid #1e3a5f",
            borderRadius: "var(--radius-md)"
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#4ade80", boxShadow: "0 0 6px #4ade80",
              animation: "pulse-dot 2s ease infinite"
            }} />
            <span style={{ fontSize: "var(--font-xs)", color: "#93c5fd" }}>
              Live results from real job platforms
            </span>
            <style>{`
              @keyframes pulse-dot {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
            `}</style>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{
              width: "36px", height: "36px", margin: "0 auto var(--space-md)",
              border: "3px solid var(--border-subtle)", borderTop: "3px solid var(--accent-primary)",
              borderRadius: "50%", animation: "spin 0.8s linear infinite"
            }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", margin: 0 }}>
              Searching real job platforms...
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "var(--font-xs)", margin: "6px 0 0" }}>
              Checking Adzuna, Jooble & more
            </p>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : jobs.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No matches found. Try recording a more detailed profile.</p>
        ) : (
          <div style={{
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden"
          }}>
            {jobs.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((job, idx) => {
              const src = sourceLabel(job.source)
              const globalIdx = (page - 1) * itemsPerPage + idx
              const isLast = idx === jobs.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1
              
              return (
                <div key={job.id || idx} style={{
                  background: globalIdx === 0 ? "rgba(37, 99, 235, 0.05)" : "var(--bg-surface)",
                  borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                  padding: "20px 24px",
                  position: "relative",
                  transition: "background 0.2s"
                }}>
                  {globalIdx === 0 && (
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "var(--accent-primary)" }} />
                  )}

                  {/* Title + Match Score */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px", lineHeight: 1.3 }}>
                        {globalIdx === 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-primary)" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                        {job.title}
                      </p>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                        {job.company} · {job.location}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "12px", padding: "4px 10px", borderRadius: "var(--radius-full)",
                      background: job.match_score > 70 ? "#052e16" : "var(--bg-surface-secondary)",
                      color: job.match_score > 70 ? "#4ade80" : "var(--text-primary)",
                      border: `1px solid ${job.match_score > 70 ? "#166534" : "var(--border-subtle)"}`,
                      flexShrink: 0, fontWeight: 600
                    }}>
                      {job.match_score}% match
                    </span>
                  </div>

                  {/* Skill Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                    {(job.skills || []).map((s, i) => (
                      <span key={i} style={{
                        fontSize: "12px", padding: "4px 10px", borderRadius: "var(--radius-full)",
                        background: "var(--bg-surface-secondary)", color: "var(--text-secondary)"
                      }}>{s}</span>
                    ))}
                  </div>

                  {/* Bottom row: type + source + apply */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "12px", padding: "4px 10px", borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-secondary)", color: "var(--text-primary)"
                      }}>{job.type}</span>
                      <span style={{
                        fontSize: "11px", padding: "4px 10px", borderRadius: "var(--radius-sm)",
                        background: src.bg, color: src.color,
                        border: `1px solid ${src.border}`
                      }}>{src.text}</span>
                    </div>
                    {job.apply_url ? (
                      <a
                        href={job.apply_url.toLowerCase().startsWith("javascript:") ? "#" : job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "8px 16px", minHeight: "var(--touch-target)", display: "inline-flex", alignItems: "center",
                          background: "var(--accent-primary)",
                          border: "none", borderRadius: "var(--radius-sm)",
                          color: "#fff", fontSize: "13px", fontWeight: 600,
                          cursor: "pointer", textDecoration: "none",
                          transition: "background 0.2s"
                        }}
                        onMouseOver={e => e.target.style.background = "var(--accent-primary-hover)"}
                        onMouseOut={e => e.target.style.background = "var(--accent-primary)"}
                      >Apply →</a>
                    ) : (
                      <button style={{
                        padding: "8px 16px", minHeight: "var(--touch-target)", background: "transparent",
                        border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer"
                      }}>Apply →</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && jobs.length > itemsPerPage && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: "var(--space-lg)", padding: "var(--space-md)",
            background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)"
          }}>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); }}
              disabled={page === 1}
              style={{
                padding: "6px 12px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)",
                background: "transparent", color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "none", cursor: page === 1 ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: "var(--font-sm)"
              }}
            >
              &lt; Prev
            </button>
            
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
              {Array.from({ length: Math.ceil(jobs.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => { setPage(p); }}
                  style={{
                    minWidth: "var(--touch-target)", minHeight: "var(--touch-target)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    background: page === p ? "var(--accent-primary)" : "transparent",
                    color: page === p ? "#fff" : "var(--text-secondary)",
                    border: page === p ? "none" : "1px solid var(--border-subtle)",
                    cursor: page === p ? "default" : "pointer",
                    fontWeight: 600, fontSize: "var(--font-sm)",
                    transition: "all 0.2s"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setPage(p => Math.min(Math.ceil(jobs.length / itemsPerPage), p + 1)); }}
              disabled={page === Math.ceil(jobs.length / itemsPerPage)}
              style={{
                padding: "6px 12px", minHeight: "var(--touch-target)", borderRadius: "var(--radius-sm)",
                background: "transparent", color: page === Math.ceil(jobs.length / itemsPerPage) ? "var(--text-muted)" : "var(--text-secondary)",
                border: "none", cursor: page === Math.ceil(jobs.length / itemsPerPage) ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: "var(--font-sm)"
              }}
            >
              Next &gt;
            </button>
          </div>
        )}


      </div>
    </div>
  )
}
