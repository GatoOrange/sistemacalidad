import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, componentStack: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack || "" });
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      const header = err.name || "Error";
      const msg = err.message || String(err) || "(sin mensaje)";
      const stack = err.stack || "";
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#080a0c",
            color: "#e8e6e3",
            fontFamily: "Inter, system-ui, sans-serif",
            padding: "2rem",
          }}
        >
          <div style={{ maxWidth: 560, width: "100%" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Algo sali&#243; mal
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#f87171", marginBottom: "0.25rem", fontWeight: 600 }}>
              {header}
            </p>
            <p style={{ fontSize: "0.875rem", color: "#98969a", marginBottom: "1rem" }}>
              {msg}
            </p>
            {stack && (
              <pre
                style={{
                  fontSize: "0.65rem",
                  color: "#6b7280",
                  textAlign: "left",
                  background: "#111",
                  padding: "0.75rem",
                  borderRadius: 6,
                  overflow: "auto",
                  maxHeight: 200,
                  marginBottom: "1rem",
                  wordBreak: "break-all",
                }}
              >
                {stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Recargar p&#225;gina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
