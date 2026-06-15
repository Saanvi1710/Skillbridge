import { useEffect, useRef } from "react"

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onArchive, 
  onDelete 
}) {
  const overlayRef = useRef(null)
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && cancelBtnRef.current) {
      cancelBtnRef.current.focus()
    }
  }, [isOpen])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "var(--space-md)"
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)"
        }}
      >
        <h2 
          id="modal-title"
          style={{ 
            fontSize: "var(--font-xl)", 
            fontWeight: 600, 
            color: "#f9fafb", 
            margin: 0 
          }}
        >
          Delete Profile?
        </h2>
        
        <p 
          id="modal-desc"
          style={{ 
            fontSize: "var(--font-sm)", 
            color: "#9ca3af", 
            margin: 0, 
            lineHeight: 1.6 
          }}
        >
          This action permanently deletes the profile and cannot be undone. 
          <br /><br />
          If you only want to remove it from your dashboard, consider using 
          <strong style={{ color: "#d1d5db" }}> Archive</strong> instead. 
          Archived profiles can be restored later and retain their share links.
        </p>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "var(--space-sm)", 
          marginTop: "var(--space-sm)" 
        }}>
          <button
            onClick={onArchive}
            style={{
              padding: "12px var(--space-md)",
              minHeight: "var(--touch-target)",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "var(--radius-sm)",
              color: "#f9fafb",
              fontSize: "var(--font-sm)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.target.style.background = "#334155"}
            onMouseOut={e => e.target.style.background = "#1e293b"}
          >
            Archive Instead
          </button>
          
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              ref={cancelBtnRef}
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px var(--space-md)",
                minHeight: "var(--touch-target)",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: "var(--radius-sm)",
                color: "#9ca3af",
                fontSize: "var(--font-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "color 0.2s"
              }}
              onMouseOver={e => e.target.style.color = "#f9fafb"}
              onMouseOut={e => e.target.style.color = "#9ca3af"}
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              style={{
                flex: 1,
                padding: "12px var(--space-md)",
                minHeight: "var(--touch-target)",
                background: "#7f1d1d",
                border: "1px solid #991b1b",
                borderRadius: "var(--radius-sm)",
                color: "#fca5a5",
                fontSize: "var(--font-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={e => e.target.style.background = "#991b1b"}
              onMouseOut={e => e.target.style.background = "#7f1d1d"}
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
