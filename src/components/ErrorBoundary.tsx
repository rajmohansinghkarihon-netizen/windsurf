import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PunamIDE Error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1e1e2e",
          color: "#cdd6f4",
          fontFamily: "system-ui, sans-serif",
          padding: 32,
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: 24, marginBottom: 16, color: "#f38ba8" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#a6adc8", maxWidth: 500, marginBottom: 24 }}>
            PunamIDE encountered an unexpected error. Your files are safe.
          </p>
          <pre style={{
            fontSize: 12,
            color: "#f38ba8",
            background: "#181825",
            padding: 16,
            borderRadius: 8,
            maxWidth: 600,
            overflow: "auto",
            marginBottom: 24,
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#89b4fa",
              color: "#1e1e2e",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload PunamIDE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
