"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Users, Plus, ArrowRight, ShieldCheck, User } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    meetings: number;
    members: number;
  };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = () => {
    fetch("/api/teams")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.teams) setTeams(data.teams);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create team");
        setCreating(false);
        return;
      }

      setTeamName("");
      setShowCreateModal(false);
      setCreating(false);
      loadTeams();
    } catch {
      setError("An unexpected error occurred");
      setCreating(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1>
              Your <span className="gradient-text">Teams</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Select a team to view meetings, extract action items, and manage members.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: "0.75rem 1.25rem" }}
          >
            <Plus size={18} />
            <span>Create Team</span>
          </button>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "3rem 0", textAlign: "center" }}>
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              maxWidth: "600px",
              margin: "3rem auto",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--brand-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Users size={28} />
            </div>
            <h2>No teams yet</h2>
            <p style={{ color: "var(--text-muted)", margin: "0.75rem 0 1.5rem" }}>
              Create your first team to start organizing meetings and extracting commitments with AI.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ padding: "0.75rem 1.5rem" }}
            >
              <Plus size={18} />
              <span>Create Your First Team</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="card card-interactive"
                style={{
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "180px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "rgba(99, 102, 241, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--brand-primary)",
                      }}
                    >
                      <Users size={20} />
                    </div>
                    <span className="badge badge-in-progress" style={{ fontSize: "0.7rem" }}>
                      Active
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>{team.name}</h3>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <span>{team._count.meetings} meetings</span>
                    <span>•</span>
                    <span>{team._count.members} members</span>
                  </div>
                  <ArrowRight size={16} color="var(--brand-primary)" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
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
            <div className="card" style={{ maxWidth: "460px", width: "100%", padding: "2rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Create New Team</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                You will become the Organizer of this team with authority to approve AI extractions and invite members.
              </p>

              {error && (
                <div
                  className="alert-warning"
                  style={{
                    background: "rgba(244, 63, 94, 0.12)",
                    borderColor: "rgba(244, 63, 94, 0.3)",
                    color: "#fb7185",
                    marginBottom: "1rem",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateTeam}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-team-name">
                    Team Name
                  </label>
                  <input
                    id="new-team-name"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Core Engineering, Product Design"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? "Creating..." : "Create Team"}
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
