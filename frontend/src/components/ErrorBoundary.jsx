import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#f9fafb", background: "#030712", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h2>Oops! Something went wrong.</h2>
          <p style={{ color: "#9ca3af" }}>We're working on fixing the issue.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", padding: "10px 20px", background: "#f97316", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
