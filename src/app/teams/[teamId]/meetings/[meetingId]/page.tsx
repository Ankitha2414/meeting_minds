"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  Calendar,
  Sparkles,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

interface MeetingData {
  id: string;
  title: string;
  meetingDate: string;
  team: {
    id: string;
    name: string;
    members: Array<{
      user: { id: string; name: string; email: string };
    }>;
  };
  attendees: Array<{
    user: { id: string; name: string; email: string };
  }>;
  transcripts: Array<{
    id: string;
    rawText: string;
    source: "PASTE" | "FILE";
    fileName?: string;
    createdAt: string;
  }>;
  actionItems: Array<{
    id: string;
    description: string;
    deadline?: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    assignee?: { id: string; name: string; email: string };
  }>;
  decisions: Array<{
    id: string;
    decisionText: string;
    createdAt: string;
  }>;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; meetingId: string }>;
}) {
  const { teamId, meetingId } = use(params);
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"ORGANIZER" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "transcript">("board");

  // Transcript state
  const [transcriptText, setTranscriptText] = useState("");
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const loadMeeting = () => {
    fetch(`/api/meetings/${meetingId}`)
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.meeting) {
          setMeeting(data.meeting);
          setCurrentUserRole(data.currentUserRole);
          if (data.meeting.transcripts?.length > 0) {
            setTranscriptText(data.meeting.transcripts[0].rawText);
          } else {
            setActiveTab("transcript");
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  const handleSaveTranscript = async () => {
    if (!transcriptText.trim()) return;
    setSavingTranscript(true);
    setExtractError(null);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: transcriptText.trim(),
          source: "PASTE",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setExtractError(data.error || "Failed to save transcript");
      } else {
        loadMeeting();
      }
    } catch {
      setExtractError("Error saving transcript");
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setTranscriptText(content);
        // Save automatically
        await fetch(`/api/meetings/${meetingId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: content,
            source: "FILE",
            fileName: file.name,
          }),
        });
        loadMeeting();
      }
    };
    reader.readAsText(file);
  };

  const handleExtractCommitments = async () => {
    if (!transcriptText.trim()) {
      setExtractError("Please paste or upload meeting transcript text first.");
      return;
    }

    setExtracting(true);
    setExtractError(null);

    try {
      // Ensure latest transcript text is saved first
      await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: transcriptText.trim(), source: "PASTE" }),
      });

      const res = await fetch(`/api/meetings/${meetingId}/extract`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || "Extraction failed");
        setExtracting(false);
        return;
      }

      // Store staged review in session storage and navigate to review canvas
      sessionStorage.setItem(
        `meetingmind_review_${meetingId}`,
        JSON.stringify(data.stagedReview)
      );

      router.push(`/teams/${teamId}/meetings/${meetingId}/review`);
    } catch (err: any) {
      setExtractError(err.message || "Failed to connect to extraction engine");
      setExtracting(false);
    }
  };

  const handleStatusChange = async (actionItemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/action-items/${actionItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadMeeting();
      }
    } catch (e) {
      console.error("Status update failed:", e);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading meeting...
        </div>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <h2>Meeting not found or access denied.</h2>
          <Link href={`/teams/${teamId}`} className="btn btn-secondary" style={{ marginTop: "1rem" }}>
            Back to Team
          </Link>
        </div>
      </>
    );
  }

  const isOrganizer = currentUserRole === "ORGANIZER";
  const dateFormatted = meeting.meetingDate.split("T")[0];

  const pendingItems = meeting.actionItems.filter((a) => a.status === "PENDING");
  const inProgressItems = meeting.actionItems.filter((a) => a.status === "IN_PROGRESS");
  const completedItems = meeting.actionItems.filter((a) => a.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main className="main-content">
        {/* Breadcrumb Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            marginBottom: "1rem",
          }}
        >
          <Link href="/teams" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Teams
          </Link>
          <ChevronRight size={14} />
          <Link href={`/teams/${teamId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            {meeting.team.name}
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: "var(--text-primary)" }}>{meeting.title}</span>
        </div>

        {/* Meeting Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "2rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h1>{meeting.title}</h1>
              <span className="badge badge-pending">
                <Calendar size={12} />
                {dateFormatted}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>Attendees ({meeting.attendees.length}):</span>
              {meeting.attendees.length > 0 ? (
                meeting.attendees.map((a) => (
                  <span
                    key={a.user.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {a.user.name}
                  </span>
                ))
              ) : (
                <span style={{ color: "var(--text-muted)" }}>All team members</span>
              )}
            </div>
          </div>

          {/* Quick Extract Action Button for Organizer */}
          {isOrganizer && (
            <button
              onClick={handleExtractCommitments}
              disabled={extracting}
              className="btn btn-primary"
              style={{ padding: "0.75rem 1.25rem", boxShadow: "var(--brand-glow)" }}
            >
              <Sparkles size={18} />
              <span>{extracting ? "Extracting Commitments..." : "Extract with AI"}</span>
            </button>
          )}
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "0.5rem",
          }}
        >
          <button
            onClick={() => setActiveTab("board")}
            className={`btn ${activeTab === "board" ? "btn-secondary" : "btn-ghost"}`}
            style={{ fontWeight: 700 }}
          >
            <CheckCircle size={16} />
            <span>Meeting Board ({meeting.actionItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`btn ${activeTab === "transcript" ? "btn-secondary" : "btn-ghost"}`}
            style={{ fontWeight: 700 }}
          >
            <FileText size={16} />
            <span>Transcript & AI Ingestion</span>
          </button>
        </div>

        {extractError && (
          <div
            className="alert-warning"
            style={{
              background: "rgba(244, 63, 94, 0.12)",
              borderColor: "rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              marginBottom: "1.5rem",
            }}
          >
            <AlertCircle size={18} />
            <span>{extractError}</span>
          </div>
        )}

        {/* BOARD VIEW */}
        {activeTab === "board" && (
          <div>
            {/* Confirmed Decisions Section */}
            {meeting.decisions.length > 0 && (
              <div
                className="card"
                style={{
                  marginBottom: "2rem",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <CheckCircle size={18} color="var(--status-completed)" />
                  <h3 style={{ fontSize: "1.05rem" }}>Key Meeting Decisions ({meeting.decisions.length})</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {meeting.decisions.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: "0.65rem 1rem",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "var(--radius-md)",
                        borderLeft: "3px solid var(--status-completed)",
                        fontSize: "0.9rem",
                      }}
                    >
                      {d.decisionText}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items Swimlanes */}
            {meeting.actionItems.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <Clock size={36} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <h3>No action items confirmed yet</h3>
                <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 1.5rem" }}>
                  Switch to the "Transcript & AI Ingestion" tab to paste meeting notes and trigger AI extraction.
                </p>
                <button onClick={() => setActiveTab("transcript")} className="btn btn-secondary">
                  Go to Transcript Ingestion
                </button>
              </div>
            ) : (
              <div className="board-grid">
                {/* PENDING COLUMN */}
                <div className="board-column">
                  <div className="column-header">
                    <span style={{ color: "var(--status-pending)" }}>PENDING</span>
                    <span className="badge badge-pending">{pendingItems.length}</span>
                  </div>
                  {pendingItems.map((item) => (
                    <ActionCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>

                {/* IN PROGRESS COLUMN */}
                <div className="board-column">
                  <div className="column-header">
                    <span style={{ color: "#38bdf8" }}>IN PROGRESS</span>
                    <span className="badge badge-in-progress">{inProgressItems.length}</span>
                  </div>
                  {inProgressItems.map((item) => (
                    <ActionCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>

                {/* COMPLETED COLUMN */}
                <div className="board-column">
                  <div className="column-header">
                    <span style={{ color: "var(--status-completed)" }}>COMPLETED</span>
                    <span className="badge badge-completed">{completedItems.length}</span>
                  </div>
                  {completedItems.map((item) => (
                    <ActionCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRANSCRIPT & INGESTION VIEW */}
        {activeTab === "transcript" && (
          <div style={{ maxWidth: "880px" }}>
            <div className="card" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <h3>Meeting Transcript or Rough Notes</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Paste raw text or upload a .txt file. The single AI extraction call will isolate tasks, assignees, deadlines, and decisions.
                  </p>
                </div>

                <label className="btn btn-secondary" style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                  <Upload size={16} />
                  <span>Upload .txt</span>
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div className="form-group">
                <textarea
                  className="textarea-field"
                  rows={14}
                  placeholder={`Paste meeting notes here. Example:

Eshwari agreed to finalize the API schema by Friday.
Ankita will configure the PostgreSQL connection and run Prisma migrations tomorrow.
Decision: The team will use Next.js App Router for frontend and API routes.`}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {transcriptText.length.toLocaleString()} characters
                </span>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={handleSaveTranscript}
                    disabled={savingTranscript || !transcriptText.trim()}
                    className="btn btn-secondary"
                  >
                    {savingTranscript ? "Saving..." : "Save Transcript"}
                  </button>

                  {isOrganizer ? (
                    <button
                      onClick={handleExtractCommitments}
                      disabled={extracting || !transcriptText.trim()}
                      className="btn btn-primary"
                    >
                      <Sparkles size={16} />
                      <span>{extracting ? "Running AI Extraction..." : "Extract with AI"}</span>
                    </button>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                      Only team organizers can initiate extraction.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function ActionCard({
  item,
  onStatusChange,
}: {
  item: {
    id: string;
    description: string;
    deadline?: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    assignee?: { id: string; name: string; email: string };
  };
  onStatusChange: (id: string, status: string) => void;
}) {
  const deadlineStr = item.deadline ? item.deadline.split("T")[0] : null;
  const isOverdue =
    deadlineStr && item.status !== "COMPLETED"
      ? isPast(parseISO(`${deadlineStr}T23:59:59`))
      : false;

  return (
    <div
      className="card"
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        background: "var(--bg-elevated)",
      }}
    >
      <div style={{ fontSize: "0.925rem", fontWeight: 500, color: "var(--text-primary)" }}>
        {item.description}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {item.assignee ? (
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>👤 {item.assignee.name}</span>
          ) : (
            <span style={{ color: "var(--status-pending)" }}>⚠️ Unassigned</span>
          )}
        </div>

        {deadlineStr && (
          <span
            className={`badge ${isOverdue ? "badge-overdue" : "badge-pending"}`}
            style={{ fontSize: "0.7rem" }}
          >
            {isOverdue ? "Overdue: " : "Due: "}
            {deadlineStr}
          </span>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
        <select
          className="select-field"
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value)}
          style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  );
}
