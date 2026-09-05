import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement(
        "div",
        { style: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" } },
        React.createElement(
          "div",
          { style: { maxWidth: 480, width: "100%", background: "white", borderRadius: 24, border: "1px solid #fecaca", padding: 32, textAlign: "center" } },
          React.createElement("h2", { style: { fontSize: 20, fontWeight: 900, marginBottom: 8 } }, "Something went wrong"),
          React.createElement("p", { style: { fontSize: 12, color: "#64748b", marginBottom: 16 } }, "An error occurred while loading this page. Please reload."),
          React.createElement("button", {
            onClick: function() { window.location.reload(); },
            style: { padding: "10px 24px", background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: "pointer", marginRight: 8 }
          }, "Reload Page"),
          React.createElement("a", {
            href: "/",
            style: { padding: "10px 24px", background: "#f1f5f9", color: "#1e293b", borderRadius: 12, fontWeight: 700, fontSize: 12, textDecoration: "none" }
          }, "Back to Dashboard")
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
