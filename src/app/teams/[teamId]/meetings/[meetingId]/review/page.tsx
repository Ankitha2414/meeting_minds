"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  User,
  ArrowLeft,
  Save,
} from "lucide-react";
import { StagedExtractionReview, ResolvedActionItem } from "@/services/extraction/types";

interface Member {
  id: string;
  name: string;
}

export default function ReviewCanvasPage({
  params,
}: {
  params: Promise<{ teamId: string; meetingId: string }>;
}) {
  const { teamId, meetingId } = use(params);
  const router = useRouter();

  const [staged, setStaged] = useState<StagedExtractionReview | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load team members for assignee dropdown
    fetch(`/api/teams/${teamId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          const members: Member[] = data.members.map((m: any) => ({
            id: m.user.id,
            name: m.user.name,
          }));
          setTeamMembers(members);

          // 2. Load staged review from sessionStorage & reconcile assignees with freshly fetched roster
          const savedStaged = sessionStorage.getItem(`meetingmind_review_${meetingId}`);
          if (savedStaged) {
            try {
              const parsed: StagedExtractionReview = JSON.parse(savedStaged);
              // Reconcile assignees: if rawAssignee matches a newly available team member, auto-resolve
              const reconciledActions = parsed.actions.map((act) => {
                if (act.assigneeId) return act;
                if (!act.rawAssignee) return act;
                const query = act.rawAssignee.toLowerCase().trim();
                const cleanQuery = query
                  .replace(/^(dr\.|mr\.|mrs\.|ms\.)\s+/i, "")
                  .replace(/\s*[-–—:]\s*.*$/, "")
                  .replace(/\s*\(.*?\)\s*$/, "")
                  .trim();
                const match = members.find((m) => {
                  const mName = m.name.toLowerCase().trim();
                  return mName === query || mName === cleanQuery;
                });
                if (match) {
                  return {
                    ...act,
                    assigneeId: match.id,
                    assigneeName: match.name,
                    isAssigneeUnresolved: false,
                    warningNote: act.warningNote?.replace(/.*not found in the team roster.*/i, "").trim() || undefined,
                  };
                }
                return act;
              });

              setStaged({ ...parsed, actions: reconciledActions });
            } catch {
              setError("Failed to parse draft review.");
            }
          } else {
            setError("No draft extraction in session. Please run extraction from the meeting transcript page.");
          }
        }
      })
      .catch(() => {
        setError("Failed to load team roster.");
      });
  }, [teamId, meetingId]);

  const handleActionChange = (
    tempId: string,
    field: "description" | "assigneeId" | "deadline",
    value: string
  ) => {
    if (!staged) return;

    const updatedActions = staged.actions.map((act) => {
      if (act.tempId !== tempId) return act;

      if (field === "assigneeId") {
        const matched = teamMembers.find((m) => m.id === value);
        return {
          ...act,
          assigneeId: value || null,
          assigneeName: matched ? matched.name : null,
          isAssigneeUnresolved: !value,
          warningNote: !value ? "Assignee is unresolved. Please select a team member." : undefined,
        };
      }

      if (field === "deadline") {
        return {
          ...act,
          deadline: value || null,
          isDeadlineAmbiguous: !value,
          warningNote: !value ? "Deadline is unresolved. Please select a calendar date." : undefined,
        };
      }

      return {
        ...act,
        [field]: value,
      };
    });

    setStaged({ ...staged, actions: updatedActions });
  };

  const handleAddAction = () => {
    if (!staged) return;
    const newId = `manual-action-${Date.now()}`;
    const newAction: ResolvedActionItem = {
      tempId: newId,
      description: "",
      rawAssignee: null,
      assigneeId: null,
      assigneeName: null,
      rawDeadline: null,
      deadline: null,
      isAssigneeUnresolved: true,
      isDeadlineAmbiguous: true,
      warningNote: "Please select an assignee and a calendar deadline.",
    };
    setStaged({ ...staged, actions: [...staged.actions, newAction] });
  };

  const handleDeleteAction = (tempId: string) => {
    if (!staged) return;
    setStaged({
      ...staged,
      actions: staged.actions.filter((a) => a.tempId !== tempId),
    });
  };

  const handleDecisionChange = (index: number, text: string) => {
    if (!staged) return;
    const updated = [...staged.decisions];
    updated[index] = text;
    setStaged({ ...staged, decisions: updated });
  };

  const handleAddDecision = () => {
    if (!staged) return;
    setStaged({ ...staged, decisions: [...staged.decisions, ""] });
  };

  const handleDeleteDecision = (index: number) => {
    if (!staged) return;
    setStaged({
      ...staged,
      decisions: staged.decisions.filter((_, i) => i !== index),
    });
  };

  const unresolvedAssignees = staged
    ? staged.actions.filter((a) => !a.assigneeId || a.isAssigneeUnresolved)
    : [];
  const unresolvedDeadlines = staged
    ? staged.actions.filter((a) => !a.deadline || a.isDeadlineAmbiguous)
    : [];
  const hasUnresolvedItems = unresolvedAssignees.length > 0 || unresolvedDeadlines.length > 0;

  const handleConfirmAndSave = async () => {
    if (!staged) return;
    setError(null);

    // Rule 7 & 8: Do not allow unresolved assignees or deadlines to be silently saved as confirmed
    if (hasUnresolvedItems) {
      const messages: string[] = [];
      if (unresolvedAssignees.length > 0) {
        messages.push(
          `${unresolvedAssignees.length} task${unresolvedAssignees.length > 1 ? "s require" : " requires"} an assignee from the team roster`
        );
      }
      if (unresolvedDeadlines.length > 0) {
        messages.push(
          `${unresolvedDeadlines.length} task${unresolvedDeadlines.length > 1 ? "s require" : " requires"} an exact calendar deadline`
        );
      }
      setError(
        `Cannot confirm commitments: ${messages.join(" and ")}. All tasks must have a designated team member and calendar deadline before saving to the board.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Validate that descriptions are not empty
    const filteredActions = staged.actions
      .filter((a) => a.description.trim().length > 0)
      .map((a) => ({
        description: a.description.trim(),
        assigneeId: a.assigneeId,
        deadline: a.deadline,
      }));

    if (filteredActions.length === 0) {
      setError("Please include at least one action item with a description.");
      return;
    }

    const filteredDecisions = staged.decisions.filter((d) => d.trim().length > 0);

    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: filteredActions,
          decisions: filteredDecisions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to commit confirmed items.");
        setSaving(false);
        return;
      }

      // Clear draft session storage
      sessionStorage.removeItem(`meetingmind_review_${meetingId}`);

      // Return to meeting board
      router.push(`/teams/${teamId}/meetings/${meetingId}`);
    } catch {
      setError("An unexpected error occurred while saving.");
      setSaving(false);
    }
  };

  if (error && !staged) {
    return (
      <>
        <Navbar />
        <main className="main-content" style={{ maxWidth: "600px", padding: "4rem 1rem", textAlign: "center" }}>
          <div className="card">
            <AlertTriangle size={36} color="var(--status-pending)" style={{ margin: "0 auto 1rem" }} />
            <h2>{error}</h2>
            <Link
              href={`/teams/${teamId}/meetings/${meetingId}`}
              className="btn btn-secondary"
              style={{ marginTop: "1.5rem" }}
            >
              Back to Meeting
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!staged) {
    return (
      <>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading review canvas...
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="main-content">
        {/* Top Bar Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <Link
            href={`/teams/${teamId}/meetings/${meetingId}`}
            className="btn btn-ghost"
            style={{ fontSize: "0.85rem", gap: "0.4rem" }}
          >
            <ArrowLeft size={16} />
            <span>Discard & Return to Meeting</span>
          </Link>

          <button
            onClick={handleConfirmAndSave}
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: "0.75rem 1.75rem",
              fontSize: "0.95rem",
              opacity: hasUnresolvedItems ? 0.75 : 1,
            }}
            title={hasUnresolvedItems ? "Please resolve all assignees and deadlines before saving" : "Save confirmed commitments"}
          >
            <Save size={18} />
            <span>{saving ? "Saving to Database..." : "Confirm & Save to Board"}</span>
          </button>
        </div>

        {/* Human-in-the-Loop Staging Banner */}
        <div className="staging-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Sparkles size={22} color="var(--brand-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                AI Extraction Review Canvas (Draft — Not Yet Saved)
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Edit, reassign, or delete suggestions before explicit confirmation. Nothing is persisted until you click Confirm.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {unresolvedAssignees.length > 0 && (
              <span className="badge badge-pending">
                {unresolvedAssignees.length} Unresolved Assignee{unresolvedAssignees.length === 1 ? "" : "s"}
              </span>
            )}
            {unresolvedDeadlines.length > 0 && (
              <span className="badge badge-pending">
                {unresolvedDeadlines.length} Unresolved Deadline{unresolvedDeadlines.length === 1 ? "" : "s"}
              </span>
            )}
            {!hasUnresolvedItems && (
              <span className="badge badge-completed" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                ✓ All Items Resolved
              </span>
            )}
          </div>
        </div>

        {/* Clear Validation Alert Banner */}
        {hasUnresolvedItems && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                Action Required Before Saving
              </div>
              <div style={{ fontSize: "0.875rem", lineHeight: 1.5, color: "#fef3c7" }}>
                All action items must have a confirmed team member and an exact calendar deadline before saving to the board.
                {unresolvedAssignees.length > 0 && (
                  <div style={{ marginTop: "0.25rem" }}>
                    • <strong>{unresolvedAssignees.length} unassigned task{unresolvedAssignees.length > 1 ? "s" : ""}:</strong> Select a team member from the roster. If an employee was not found, add them to the team roster first or select an existing member.
                  </div>
                )}
                {unresolvedDeadlines.length > 0 && (
                  <div style={{ marginTop: "0.25rem" }}>
                    • <strong>{unresolvedDeadlines.length} unresolved deadline{unresolvedDeadlines.length > 1 ? "s" : ""}:</strong> Open-ended expressions (such as "Before next meeting") must be assigned an exact calendar date.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="alert-warning"
            style={{
              background: "rgba(244, 63, 94, 0.12)",
              borderColor: "rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Action Items Table */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2>Extracted Action Items ({staged.actions.length})</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Assign to known team members or select from roster. Verify calendar deadlines.
              </p>
            </div>

            <button onClick={handleAddAction} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
              <Plus size={16} />
              <span>Add Action Item</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "42%" }}>Action Description</th>
                  <th style={{ width: "28%" }}>Assignee</th>
                  <th style={{ width: "20%" }}>Deadline (YYYY-MM-DD)</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {staged.actions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No action items suggested. Click "Add Action Item" to create one manually.
                    </td>
                  </tr>
                ) : (
                  staged.actions.map((act) => (
                    <tr
                      key={act.tempId}
                      style={{
                        background:
                          !act.assigneeId || !act.deadline
                            ? "rgba(245, 158, 11, 0.04)"
                            : undefined,
                      }}
                    >
                      {/* Description */}
                      <td>
                        <input
                          type="text"
                          className="input-field"
                          value={act.description}
                          onChange={(e) => handleActionChange(act.tempId, "description", e.target.value)}
                          placeholder="Task description..."
                          style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                        />
                        {act.warningNote && (
                          <div style={{ fontSize: "0.75rem", color: "var(--status-pending)", marginTop: "0.25rem" }}>
                            ⚠️ {act.warningNote}
                          </div>
                        )}
                      </td>

                      {/* Assignee Selection */}
                      <td>
                        <select
                          className="select-field"
                          value={act.assigneeId || ""}
                          onChange={(e) => handleActionChange(act.tempId, "assigneeId", e.target.value)}
                          style={{
                            fontSize: "0.875rem",
                            padding: "0.5rem 0.75rem",
                            borderColor: !act.assigneeId ? "#f43f5e" : undefined,
                            borderWidth: !act.assigneeId ? "2px" : undefined,
                          }}
                        >
                          <option value="">-- Select Team Member --</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        {!act.assigneeId && (
                          <div style={{ fontSize: "0.75rem", color: "#fb7185", marginTop: "0.25rem", fontWeight: 500 }}>
                            {act.rawAssignee
                              ? `Mentioned: "${act.rawAssignee}" (Not in roster - please select member)`
                              : "⚠️ Unassigned - please select a team member"}
                          </div>
                        )}
                      </td>

                      {/* Deadline Date Picker */}
                      <td>
                        <input
                          type="date"
                          className="input-field"
                          value={act.deadline || ""}
                          onChange={(e) => handleActionChange(act.tempId, "deadline", e.target.value)}
                          style={{
                            fontSize: "0.875rem",
                            padding: "0.5rem 0.75rem",
                            borderColor: !act.deadline ? "#f43f5e" : undefined,
                            borderWidth: !act.deadline ? "2px" : undefined,
                          }}
                        />
                        {!act.deadline && (
                          <div style={{ fontSize: "0.75rem", color: "#fb7185", marginTop: "0.25rem", fontWeight: 500 }}>
                            {act.rawDeadline
                              ? `Raw: "${act.rawDeadline}" — select exact date`
                              : "⚠️ Date required"}
                          </div>
                        )}
                      </td>

                      {/* Delete */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteAction(act.tempId)}
                          className="btn btn-ghost"
                          style={{ color: "#fb7185", padding: "0.4rem" }}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Meeting Decisions */}
        <div style={{ marginBottom: "3rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2>Meeting Decisions ({staged.decisions.length})</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Key architectural, product, or organizational decisions agreed during the meeting.
              </p>
            </div>

            <button onClick={handleAddDecision} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
              <Plus size={16} />
              <span>Add Decision</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {staged.decisions.length === 0 ? (
              <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                No key decisions extracted. Click "Add Decision" if commitments or standards were finalized.
              </div>
            ) : (
              staged.decisions.map((decision, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "var(--bg-secondary)",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ color: "var(--status-completed)", fontWeight: 700 }}>#{idx + 1}</span>
                  <input
                    type="text"
                    className="input-field"
                    value={decision}
                    onChange={(e) => handleDecisionChange(idx, e.target.value)}
                    placeholder="Describe decision..."
                    style={{ flex: 1, padding: "0.45rem 0.75rem", fontSize: "0.875rem" }}
                  />
                  <button
                    onClick={() => handleDeleteDecision(idx)}
                    className="btn btn-ghost"
                    style={{ color: "#fb7185", padding: "0.4rem" }}
                    title="Remove decision"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div
          style={{
            position: "sticky",
            bottom: "1rem",
            background: "rgba(18, 25, 41, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {hasUnresolvedItems ? (
              <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                ⚠️ Resolve all assignees and deadlines above before confirming.
              </span>
            ) : (
              <span>Ready to finalize? Confirmed tasks will be tracked on your Person & Meeting boards.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link
              href={`/teams/${teamId}/meetings/${meetingId}`}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              onClick={handleConfirmAndSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                padding: "0.75rem 2rem",
                opacity: hasUnresolvedItems ? 0.75 : 1,
              }}
            >
              <CheckCircle size={18} />
              <span>{saving ? "Saving..." : "Confirm & Save Everything"}</span>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
