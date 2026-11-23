import Link from "next/link";
import { CheckSquare, ArrowRight, Shield, Sparkles, Clock, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          padding: "1.5rem 3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--brand-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "var(--brand-glow)",
            }}
          >
            <CheckSquare size={20} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.03em" }}>
            Meeting<span className="gradient-text">Mind</span>
          </span>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/login" className="btn btn-secondary">
            Sign In
          </Link>
          <Link href="/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "5rem 2rem",
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 1rem",
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "var(--radius-full)",
            color: "var(--brand-primary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "1.75rem",
          }}
        >
          <Sparkles size={16} />
          <span>Strict Human-in-the-Loop AI Task Extraction</span>
        </div>

        <h1 style={{ fontSize: "3.5rem", lineHeight: 1.15, marginBottom: "1.5rem" }}>
          Turn Unstructured Meeting Notes into{" "}
          <span className="gradient-text">Verifiable Commitments</span>
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: "760px",
            marginBottom: "2.5rem",
          }}
        >
          Extract action items, owners, deadlines, and key decisions from rough transcripts in a single AI call. Review and approve suggestions before they reach your team's persistent task board.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}>
            <span>Start Tracking Meetings</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn btn-secondary" style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}>
            <span>Existing Team Login</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            marginTop: "5rem",
            textAlign: "left",
            width: "100%",
          }}
        >
          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Single-Call Extraction</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Runs one deterministic LLM request with structured JSON output via hosted OpenAI, local Ollama, or LM Studio.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--status-completed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Shield size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Review & Edit Staging</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Zero unverified AI output is persisted. Organizers review, edit assignees, and approve commitments.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(244, 63, 94, 0.12)",
                color: "var(--status-overdue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Overdue Tracking & FCM</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Scheduled worker checks open past-due tasks and sends push reminders with strict daily deduplication.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
