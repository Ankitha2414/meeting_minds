"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  Calendar,
  Users,
  Plus,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Member {
  id: string;
  role: "ORGANIZER" | "MEMBER";
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface MeetingItem {
  id: string;
  title: string;
  meetingDate: string;
  _count: {
    actionItems: number;
    decisions: number;
  };
}

interface TeamData {
  id: string;
  name: string;
  members: Member[];
  meetings: MeetingItem[];
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [userRole, setUserRole] = useState<"ORGANIZER" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(true);

  // New Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  // Add Member state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"MEMBER" | "ORGANIZER">("MEMBER");
  const [addingMember, setAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTeam = () => {
    fetch(`/api/teams/${teamId}`)
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.team) {
          setTeam(data.team);
          setUserRole(data.currentUserRole);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;
    setCreatingMeeting(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingTitle.trim(),
          meetingDate,
          attendeeIds: selectedAttendees,
        }),
      });

      if (res.ok) {
        setMeetingTitle("");
        setSelectedAttendees([]);
        setShowMeetingModal(false);
        loadTeam();
      }
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    setAddingMember(true);
    setMemberMessage(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMemberMessage({ type: "error", text: data.error || "Failed to add member" });
      } else {
        setMemberMessage({ type: "success", text: "Member added successfully" });
        setNewMemberEmail("");
        loadTeam();
      }
    } catch {
      setMemberMessage({ type: "error", text: "Unexpected network error" });
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading team details...
        </div>
      </>
    );
  }

  if (!team) {
    return (
      <>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <h2>Team not found or access denied.</h2>
          <Link href="/teams" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
            Back to Teams
          </Link>
        </div>
      </>
    );
  }

  const isOrganizer = userRole === "ORGANIZER";

  return (
    <>
      <Navbar />
      <main className="main-content">
        {/* Team Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h1>{team.name}</h1>
              <span
                className={`badge ${isOrganizer ? "badge-in-progress" : "badge-completed"}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              >
                {isOrganizer ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                Your Role: {userRole}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {team.members.length} member{team.members.length === 1 ? "" : "s"} • {team.meetings.length} meeting
              {team.meetings.length === 1 ? "" : "s"}
            </p>
          </div>

          {isOrganizer && (
            <button onClick={() => setShowMeetingModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>New Meeting</span>
            </button>
          )}
        </div>

        {/* Two Column Grid: Meetings and Members */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}>
          {/* Meetings Section */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <h2>Meetings</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {team.meetings.length} recorded
              </span>
            </div>

            {team.meetings.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "3rem 1.5rem",
                  color: "var(--text-muted)",
                }}
              >
                <Calendar size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                <h3>No meetings yet</h3>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  {isOrganizer
                    ? "Create a meeting to paste notes and extract commitments."
                    : "No meetings have been scheduled yet by the organizer."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {team.meetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/teams/${teamId}/meetings/${m.id}`}
                    className="card card-interactive"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1.25rem 1.5rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--brand-primary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {m.meetingDate.split("T")[0]}
                      </div>
                      <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{m.title}</h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "1rem",
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>{m._count.actionItems} action items</span>
                        <span>•</span>
                        <span>{m._count.decisions} decisions</span>
                      </div>
                    </div>
                    <ArrowRight size={18} color="var(--brand-primary)" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Members & Invite Section */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <h2>Team Roster</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {team.members.length} members
              </span>
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {team.members.map((mem) => (
                  <div
                    key={mem.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.75rem",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{mem.user.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{mem.user.email}</div>
                    </div>
                    <span
                      className={`badge ${mem.role === "ORGANIZER" ? "badge-in-progress" : "badge-completed"}`}
                      style={{ fontSize: "0.65rem" }}
                    >
                      {mem.role}
                    </span>
                  </div>
                ))}
              </div>

              {isOrganizer && (
                <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                  <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Add Member to Team</h4>

                  {memberMessage && (
                    <div
                      className="alert-warning"
                      style={{
                        background:
                          memberMessage.type === "success"
                            ? "var(--status-completed-bg)"
                            : "var(--status-overdue-bg)",
                        borderColor:
                          memberMessage.type === "success"
                            ? "var(--status-completed-border)"
                            : "var(--status-overdue-border)",
                        color:
                          memberMessage.type === "success"
                            ? "var(--status-completed)"
                            : "var(--status-overdue)",
                        marginBottom: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      {memberMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleAddMember}>
                    <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="member@team.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        required
                        style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <select
                        className="select-field"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as any)}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem", width: "120px" }}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ORGANIZER">Organizer</option>
                      </select>
                      <button
                        type="submit"
                        className="btn btn-secondary"
                        disabled={addingMember}
                        style={{ flex: 1, fontSize: "0.85rem" }}
                      >
                        {addingMember ? "Adding..." : "Add Member"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Create Meeting Modal */}
        {showMeetingModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: "1rem",
            }}
          >
            <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "2rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Create New Meeting</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Set up a dated meeting to store transcripts and extract commitments.
              </p>

              <form onSubmit={handleCreateMeeting}>
                <div className="form-group">
                  <label className="form-label" htmlFor="meeting-title">
                    Meeting Title
                  </label>
                  <input
                    id="meeting-title"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sprint 24 Planning, Architecture Sync"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="meeting-date">
                    Meeting Date
                  </label>
                  <input
                    id="meeting-date"
                    type="date"
                    className="input-field"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attendees from Team</label>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    {team.members.map((mem) => {
                      const isSelected = selectedAttendees.includes(mem.user.id);
                      return (
                        <label
                          key={mem.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            background: isSelected ? "rgba(99, 102, 241, 0.15)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttendees([...selectedAttendees, mem.user.id]);
                              } else {
                                setSelectedAttendees(selectedAttendees.filter((id) => id !== mem.user.id));
                              }
                            }}
                          />
                          <span>{mem.user.name}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            ({mem.user.email})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creatingMeeting}>
                    {creatingMeeting ? "Creating..." : "Save Meeting"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
