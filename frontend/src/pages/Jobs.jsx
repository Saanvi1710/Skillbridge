import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getJobMatches } from "../services/api"

export default function Jobs() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/profile/${profileId}`)
      .then(r => r.json())
      .then(async (data) => {
        setProfile(data)
        const skills = data.raw_skills?.skills || []
        const summary = data.generated_summary || ""
        const { matches } = await getJobMatches(skills, summary)
        setJobs(matches)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profileId])

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
        <button onClick={() => navigate("/dashboard")} style={{
          padding: "6px 14px", background: "transparent",
          border: "1px solid #1e293b", borderRadius: "8px",
          color: "#6b7280", fontSize: "13px", cursor: "pointer"
        }}>Dashboard</button>
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

        {loading ? (
          <p style={{ textAlign: "center", color: "#4b5563" }}>Finding best matches...</p>
        ) : jobs.length === 0 ? (
          <p style={{ textAlign: "center", color: "#4b5563" }}>No matches found. Try recording a more detailed profile.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {jobs.map((job, idx) => (
              <div key={job.id} style={{
                background: "#0f172a",
                border: `1px solid ${idx === 0 ? "#f97316" : "#1e293b"}`,
                borderRadius: "16px", padding: "16px 20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "#f9fafb", margin: "0 0 2px" }}>
                      {idx === 0 && <span style={{ color: "#f97316" }}>⭐ </span>}
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

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {(job.skills || []).map((s, i) => (
                    <span key={i} style={{
                      fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                      background: "#1e293b", color: "#9ca3af"
                    }}>{s}</span>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                    background: "#0c1a2e", color: "#60a5fa"
                  }}>{job.type}</span>
                  <button style={{
                    padding: "6px 16px", background: "transparent",
                    border: "1px solid #1e293b", borderRadius: "8px",
                    color: "#9ca3af", fontSize: "12px", cursor: "pointer"
                  }}>Apply →</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <span
            onClick={() => navigate(`/profile/${profileId}`)}
            style={{ fontSize: "13px", color: "#4b5563", cursor: "pointer", textDecoration: "underline" }}
          >
            View your public profile →
          </span>
        </div>
      </div>
    </div>
  )
}