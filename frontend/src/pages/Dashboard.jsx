import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../services/supabase"

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    setProfiles(data || [])
    setLoading(false)
  }

  const handleDelete = async (e, profileId) => {
    e.stopPropagation()

    const confirm = window.confirm("Delete this profile?")
    if (!confirm) return

    await supabase.from("profiles").delete().eq("id", profileId)

    fetchProfiles()
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "#f9fafb",
        fontFamily: "'DM Sans', sans-serif",
        padding: "0 16px 48px"
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0",
          borderBottom: "1px solid #1e293b",
          marginBottom: "32px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>🎙</span>
          <span style={{ fontWeight: 600, fontSize: "16px" }}>
            SkillBridge
          </span>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            padding: "6px 14px",
            background: "transparent",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            color: "#6b7280",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <p
            style={{
              fontSize: "12px",
              color: "#4b5563",
              margin: "0 0 4px"
            }}
          >
            Welcome back
          </p>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              margin: "0 0 4px"
            }}
          >
            Your Profiles
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: 0
            }}
          >
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        {/* New Profile Button */}
        <button
          onClick={() => navigate("/record")}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none",
            borderRadius: "14px",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "24px"
          }}
        >
          + Create New Profile
        </button>

        {/* Profiles List */}
        {loading ? (
          <p
            style={{
              textAlign: "center",
              color: "#4b5563",
              fontSize: "14px"
            }}
          >
            Loading...
          </p>
        ) : profiles.length === 0 ? (
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "16px",
              padding: "32px",
              textAlign: "center"
            }}
          >
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🎙</p>

            <p
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "#e5e7eb",
                margin: "0 0 6px"
              }}
            >
              No profiles yet
            </p>

            <p
              style={{
                fontSize: "13px",
                color: "#4b5563",
                margin: 0
              }}
            >
              Record your first voice profile to get started
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {profiles.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "16px 20px",
                  cursor: "pointer"
                }}
                onClick={() => navigate(`/profile/${p.id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#f9fafb",
                        margin: "0 0 4px"
                      }}
                    >
                      {p.work_domains?.[0] || "Skilled Worker"}
                    </p>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        margin: "0 0 8px"
                      }}
                    >
                      {p.years_experience?.total
                        ? `${p.years_experience.total} years experience`
                        : "Experience not specified"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px"
                      }}
                    >
                      {(p.raw_skills?.skills || [])
                        .slice(0, 3)
                        .map((s, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "11px",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              background: "#1e3a5f",
                              color: "#93c5fd",
                              border: "1px solid #1d4ed8"
                            }}
                          >
                            {s}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center"
                    }}
                  >
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      style={{
                        padding: "4px 10px",
                        background: "transparent",
                        border: "1px solid #7f1d1d",
                        borderRadius: "6px",
                        color: "#f87171",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      Delete
                    </button>

                    <span
                      style={{
                        fontSize: "18px",
                        color: "#374151"
                      }}
                    >
                      →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}