import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getJobMatches } from "../services/api"

export default function Jobs() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const itemsPerPage = 10

  const [searchType, setSearchType] = useState("local") // "local" or "anywhere"

  const fetchJobs = async (profileData, locationType) => {
    setLoading(true)
    const skills = profileData.raw_skills?.skills || []
    const summary = profileData.generated_summary || ""
    const work_domains = profileData.work_domains || []
    const city = locationType === "local" && profileData.city ? profileData.city : null
    
    try {
      const { matches } = await getJobMatches(skills, summary, work_domains, city)
      setJobs(matches)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/profile/${profileId}`)
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
      .catch(() => setLoading(false))
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
      minHeight: "100vh", background: "#030712", color: "#f9fafb",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px 48px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{
        maxWidth: "480px", margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 0", borderBottom: "1px solid #1e293b", marginBottom: "32px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🎙</span>
          <span style={{ fontWeight: 600 }}>SkillBridge</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate(`/profile/${profileId}`)} style={{
            padding: "6px 14px", background: "transparent",
            border: "1px solid #1e293b", borderRadius: "8px",
            color: "#93c5fd", fontSize: "13px", cursor: "pointer"
          }}>View Profile</button>
          <button onClick={() => navigate("/dashboard")} style={{
            padding: "6px 14px", background: "transparent",
            border: "1px solid #1e293b", borderRadius: "8px",
            color: "#6b7280", fontSize: "13px", cursor: "pointer"
          }}>Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 6px" }}>
            Matching Jobs
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            Ranked by AI similarity to your profile
          </p>
        </div>

        {/* Location Toggle */}
        {profile?.city && (
          <div style={{
            display: "flex", background: "#0f172a", borderRadius: "10px",
            padding: "4px", marginBottom: "20px", border: "1px solid #1e293b"
          }}>
            <button
              onClick={() => handleToggle("local")}
              style={{
                flex: 1, padding: "8px 0", borderRadius: "8px", border: "none",
                background: searchType === "local" ? "#1e293b" : "transparent",
                color: searchType === "local" ? "#f9fafb" : "#6b7280",
                fontSize: "13px", fontWeight: searchType === "local" ? 600 : 500,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Only in {profile.city}
            </button>
            <button
              onClick={() => handleToggle("anywhere")}
              style={{
                flex: 1, padding: "8px 0", borderRadius: "8px", border: "none",
                background: searchType === "anywhere" ? "#1e293b" : "transparent",
                color: searchType === "anywhere" ? "#f9fafb" : "#6b7280",
                fontSize: "13px", fontWeight: searchType === "anywhere" ? 600 : 500,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Anywhere in India
            </button>
          </div>
        )}

        {/* Real-time indicator */}
        {!loading && jobs.length > 0 && jobs[0].source !== "skillbridge" && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 14px", marginBottom: "16px",
            background: "#0c1a2e", border: "1px solid #1e3a5f",
            borderRadius: "12px"
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#4ade80", boxShadow: "0 0 6px #4ade80",
              animation: "pulse-dot 2s ease infinite"
            }} />
            <span style={{ fontSize: "12px", color: "#93c5fd" }}>
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
              width: "36px", height: "36px", margin: "0 auto 16px",
              border: "3px solid #1e293b", borderTop: "3px solid #f97316",
              borderRadius: "50%", animation: "spin 0.8s linear infinite"
            }} />
            <p style={{ color: "#4b5563", fontSize: "14px", margin: 0 }}>
              Searching real job platforms...
            </p>
            <p style={{ color: "#374151", fontSize: "12px", margin: "6px 0 0" }}>
              Checking Adzuna, Jooble & more
            </p>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : jobs.length === 0 ? (
          <p style={{ textAlign: "center", color: "#4b5563" }}>No matches found. Try recording a more detailed profile.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {jobs.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((job, idx) => {
              const src = sourceLabel(job.source)
              const globalIdx = (page - 1) * itemsPerPage + idx
              return (
                <div key={job.id || idx} style={{
                  background: "#0f172a",
                  border: `1px solid ${idx === 0 ? "#f97316" : "#1e293b"}`,
                  borderRadius: "16px", padding: "16px 20px"
                }}>
                  {/* Title + Match Score */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#f9fafb", margin: "0 0 2px" }}>
                        {globalIdx === 0 && <span style={{ color: "#f97316" }}>⭐ </span>}
                        {job.title}
                      </p>
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                        {job.company} · {job.location}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "12px", padding: "4px 10px", borderRadius: "999px",
                      background: job.match_score > 70 ? "#052e16" : "#0c1a2e",
                      color: job.match_score > 70 ? "#4ade80" : "#60a5fa",
                      border: `1px solid ${job.match_score > 70 ? "#166534" : "#1e3a5f"}`,
                      flexShrink: 0, fontWeight: 600
                    }}>
                      {job.match_score}% match
                    </span>
                  </div>

                  {/* Skill Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                    {(job.skills || []).map((s, i) => (
                      <span key={i} style={{
                        fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                        background: "#1e293b", color: "#9ca3af"
                      }}>{s}</span>
                    ))}
                  </div>

                  {/* Bottom row: type + source + apply */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                        background: "#0c1a2e", color: "#60a5fa"
                      }}>{job.type}</span>
                      <span style={{
                        fontSize: "10px", padding: "3px 8px", borderRadius: "999px",
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
                          padding: "6px 16px",
                          background: "linear-gradient(135deg, #f97316, #ea580c)",
                          border: "none", borderRadius: "8px",
                          color: "#fff", fontSize: "12px", fontWeight: 600,
                          cursor: "pointer", textDecoration: "none",
                          transition: "opacity 0.2s"
                        }}
                        onMouseOver={e => e.target.style.opacity = "0.85"}
                        onMouseOut={e => e.target.style.opacity = "1"}
                      >Apply →</a>
                    ) : (
                      <button style={{
                        padding: "6px 16px", background: "transparent",
                        border: "1px solid #1e293b", borderRadius: "8px",
                        color: "#9ca3af", fontSize: "12px", cursor: "pointer"
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
            marginTop: "24px", padding: "16px",
            background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b"
          }}>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); }}
              disabled={page === 1}
              style={{
                padding: "6px 12px", borderRadius: "6px",
                background: "transparent", color: page === 1 ? "#4b5563" : "#9ca3af",
                border: "none", cursor: page === 1 ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: "14px"
              }}
            >
              &lt; Prev
            </button>
            
            <div style={{ display: "flex", gap: "6px" }}>
              {Array.from({ length: Math.ceil(jobs.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => { setPage(p); }}
                  style={{
                    width: "32px", height: "32px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "6px",
                    background: page === p ? "#f97316" : "transparent",
                    color: page === p ? "#fff" : "#9ca3af",
                    border: page === p ? "none" : "1px solid #1e293b",
                    cursor: page === p ? "default" : "pointer",
                    fontWeight: 600, fontSize: "14px",
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
                padding: "6px 12px", borderRadius: "6px",
                background: "transparent", color: page === Math.ceil(jobs.length / itemsPerPage) ? "#4b5563" : "#9ca3af",
                border: "none", cursor: page === Math.ceil(jobs.length / itemsPerPage) ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: "14px"
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