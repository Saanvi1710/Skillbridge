import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{
      minHeight: "100vh", background: "#030712", color: "#f9fafb",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🎙</span>
            <span style={{ fontWeight: 600 }}>SkillBridge</span>
          </div>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            style={{
              padding: "8px 16px", background: "transparent",
              border: "1px solid #1e293b", borderRadius: "8px",
              color: "#9ca3af", fontSize: "13px", cursor: "pointer"
            }}
          >
            {user ? "Dashboard" : "Login"}
          </button>
        </div>

        {/* Hero */}
        <div style={{ paddingTop: "60px", paddingBottom: "48px" }}>
          <div style={{
            display: "inline-block", padding: "4px 12px",
            background: "#0c1a2e", border: "1px solid #1e3a5f",
            borderRadius: "999px", fontSize: "12px", color: "#60a5fa",
            marginBottom: "20px"
          }}>
            Built for India's 450M informal workers
          </div>

          <h1 style={{
            fontSize: "36px", fontWeight: 700,
            fontFamily: "'DM Serif Display', serif",
            lineHeight: 1.2, margin: "0 0 16px",
            letterSpacing: "-0.02em"
          }}>
            Your skills deserve<br />
            <span style={{ color: "#f97316" }}>a proper profile</span>
          </h1>

          <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: 1.7, margin: "0 0 36px" }}>
            Speak in Hindi, English, or your own language. We turn your experience into a professional profile — no typing, no forms.
          </p>

          <button
            onClick={() => navigate(user ? "/record" : "/login")}
            style={{
              width: "100%", padding: "16px",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              border: "none", borderRadius: "14px", color: "#fff",
              fontSize: "16px", fontWeight: 600, cursor: "pointer",
              marginBottom: "12px"
            }}
          >
            Create Your Profile — Free
          </button>
          <p style={{ fontSize: "12px", color: "#374151", textAlign: "center", margin: 0 }}>
            No email needed. Just sign in with Google.
          </p>
        </div>

        {/* How it works */}
        <div style={{ paddingBottom: "48px" }}>
          <p style={{ fontSize: "12px", color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "20px" }}>
            How it works
          </p>
          {[
            { icon: "🎙", title: "Speak your experience", desc: "Talk about your work in any language for 1-2 minutes" },
            { icon: "🤖", title: "AI extracts your skills", desc: "We identify skills, experience, tools and build your profile" },
            { icon: "📋", title: "Share with employers", desc: "Get a professional profile link you can send to anyone" }
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: "16px", alignItems: "flex-start",
              marginBottom: "20px"
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "#0f172a", border: "1px solid #1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", flexShrink: 0
              }}>{step.icon}</div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#e5e7eb", margin: "0 0 4px" }}>{step.title}</p>
                <p style={{ fontSize: "13px", color: "#4b5563", margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}