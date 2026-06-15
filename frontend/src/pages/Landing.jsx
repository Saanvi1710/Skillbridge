import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)",
      fontFamily: "'DM Sans', sans-serif", padding: "0 16px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-lg) 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
            <span style={{ fontWeight: 600 }}>SkillBridge</span>
          </div>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            style={{
              padding: "var(--space-sm) var(--space-md)", minHeight: "var(--touch-target)", background: "transparent",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)", fontSize: "var(--font-sm)", cursor: "pointer"
            }}
          >
            {user ? "Dashboard" : "Login"}
          </button>
        </div>

        {/* Hero */}
        <div style={{ paddingTop: "60px", paddingBottom: "var(--space-xl)" }}>
          <div style={{
            display: "inline-block", padding: "4px 12px",
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "999px", fontSize: "12px", color: "var(--text-secondary)",
            marginBottom: "20px"
          }}>
            Built for India's 450M informal workers
          </div>

          <h1 style={{
            fontSize: "36px", fontWeight: 700,
            lineHeight: 1.2, margin: "0 0 16px",
            letterSpacing: "-0.02em"
          }}>
            Your skills deserve<br />
            <span style={{ color: "var(--accent-primary)" }}>a proper profile</span>
          </h1>

          <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 36px" }}>
            Speak in Hindi, English, or your own language. We turn your experience into a professional profile — no typing, no forms.
          </p>

          <button
            onClick={() => navigate(user ? "/record" : "/login")}
            onMouseOver={(e) => e.target.style.background = "var(--accent-primary-hover)"}
            onMouseOut={(e) => e.target.style.background = "var(--accent-primary)"}
            style={{
              width: "100%", padding: "var(--space-md)", minHeight: "var(--touch-target)",
              background: "var(--accent-primary)",
              border: "none", borderRadius: "var(--radius-md)", color: "#fff",
              fontSize: "var(--font-base)", fontWeight: 600, cursor: "pointer",
              marginBottom: "var(--space-sm)", transition: "background 0.2s"
            }}
          >
            Create Your Profile — Free
          </button>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
            No email needed. Just sign in with Google.
          </p>
        </div>

        {/* How it works */}
        <div style={{ paddingBottom: "48px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "20px" }}>
            How it works
          </p>
          {[
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>, 
              title: "Speak your experience", 
              desc: "Talk about your work in any language for 1-2 minutes" 
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>, 
              title: "We organize your skills", 
              desc: "Our system identifies your skills, tools, and experience from your voice" 
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, 
              title: "Share with employers", 
              desc: "Get a professional profile link you can send directly to contractors" 
            }
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: "16px", alignItems: "flex-start",
              marginBottom: "20px"
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)", flexShrink: 0
              }}>{step.icon}</div>
              <div>
                <p style={{ fontSize: "var(--font-sm)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 4px" }}>{step.title}</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}