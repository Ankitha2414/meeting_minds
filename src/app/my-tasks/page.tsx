"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  CheckSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Bell,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { isPast, parseISO } from "date-fns";

interface TaskItem {
  id: string;
  description: string;
  deadline?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  meeting: {
    id: string;
    title: string;
    meetingDate: string;
    team: {
      id: string;
      name: string;
    };
  };
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadTasks = () => {
    fetch("/api/action-items?assignedToMe=true")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.items) setTasks(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/action-items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadTasks();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Handler for sending/demonstrating a test overdue notification
  const handleTriggerTestReminder = async () => {
    setShowPreviewModal(true);
    setReminderStatus("Preparing reminder dispatch...");

    const sampleTitle = tasks[0]?.description || "Complete the updated dashboard UI design";
    const sampleDeadline = tasks[0]?.deadline ? tasks[0].deadline.split("T")[0] : "2026-11-18";

    // 1. Request native browser notification permission if supported
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
          // Native desktop notification dispatch
          const notif = new Notification("MeetingMind: Task Overdue", {
            body: `"${sampleTitle}" was due on ${sampleDeadline}. Please update your progress.`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: "meetingmind-overdue-test",
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
          };

          setReminderStatus("✅ Native notification displayed on your desktop!");
        } else {
          setReminderStatus("⚠️ Browser notification permission was blocked or dismissed.");
        }
      } catch (err: any) {
        setReminderStatus("⚠️ Browser notification error: " + err.message);
      }
    }

    // 2. Call backend test endpoint to verify FCM & server-side dispatch
    try {
      const res = await fetch("/api/jobs/test-reminder", { method: "POST" });
      const data = await res.json();
      if (data.fcmSent) {
        setReminderStatus("✅ Live Firebase Cloud Messaging (FCM) push notification dispatched to your registered device!");
      }
    } catch {
      // Ignored if local
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.meeting.team.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterOverdue) {
      if (t.status === "COMPLETED" || !t.deadline) return false;
      const dStr = t.deadline.split("T")[0];
      return isPast(parseISO(`${dStr}T23:59:59`));
    }

    return true;
  });

  const pendingList = filteredTasks.filter((t) => t.status === "PENDING");
  const inProgressList = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const completedList = filteredTasks.filter((t) => t.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1>
              My <span className="gradient-text">Tasks</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Action items assigned to you across all meetings and teams.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={handleTriggerTestReminder}
              className="btn btn-secondary"
              style={{
                fontSize: "0.85rem",
                padding: "0.5rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                borderColor: "rgba(244, 63, 94, 0.4)",
                color: "#fda4af",
              }}
              title="Test how an overdue push reminder appears"
            >
              <Bell size={16} />
              <span>Send Test Overdue Reminder</span>
            </button>

            <span className="badge badge-in-progress" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
              {tasks.filter((t) => t.status !== "COMPLETED").length} Open Commitments
            </span>
          </div>
        </div>

        {/* Test Reminder Preview Modal / Card */}
        {showPreviewModal && (
          <div
            style={{
              background: "rgba(18, 25, 41, 0.95)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem 1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#fb7185" }}>
                <Bell size={18} />
                <span>Overdue Reminder Message Appearance</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="btn btn-ghost"
                style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem" }}
              >
                Dismiss Preview
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              This is the exact push notification triggered by the scheduled job when an open commitment passes its deadline:
            </p>

            {/* Notification UI Mockup */}
            <div
              style={{
                maxWidth: "460px",
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                gap: "1rem",
                boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--brand-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <CheckSquare size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f8fafc" }}>
                    MeetingMind: Task Overdue
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>now</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "0.3rem", lineHeight: 1.4 }}>
                  "{tasks[0]?.description || "Complete the updated dashboard UI design"}" was due on {tasks[0]?.deadline ? tasks[0].deadline.split("T")[0] : "2026-11-18"}. Please update your progress.
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--brand-primary)", marginTop: "0.4rem", fontWeight: 600 }}>
                  👉 Click to open /my-tasks
                </div>
              </div>
            </div>

            {reminderStatus && (
              <div style={{ fontSize: "0.8rem", color: "#93c5fd", marginTop: "0.75rem" }}>
                {reminderStatus}
              </div>
            )}
          </div>
        )}

        {/* Filters Toolbar */}
        <div
          className="card"
          style={{
            padding: "0.85rem 1.25rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="input-field"
              placeholder="Search by task description, meeting, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-md)",
                background: filterOverdue ? "rgba(244, 63, 94, 0.15)" : "transparent",
                border: filterOverdue ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid transparent",
                color: filterOverdue ? "#fb7185" : "var(--text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={filterOverdue}
                onChange={(e) => setFilterOverdue(e.target.checked)}
              />
              <AlertTriangle size={14} />
              <span>Show Overdue Only</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading your tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <CheckCircle size={36} color="var(--status-completed)" style={{ margin: "0 auto 1rem" }} />
            <h2>No tasks found</h2>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
              {filterOverdue
                ? "No overdue action items. You are completely caught up!"
                : "No action items have been assigned to you yet."}
            </p>
          </div>
        ) : (
          <div className="board-grid">
            {/* PENDING */}
            <div className="board-column">
              <div className="column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock size={16} color="var(--status-pending)" />
                  <span style={{ fontWeight: 700 }}>Pending</span>
                </div>
                <span className="badge badge-pending">{pendingList.length}</span>
              </div>
              <div className="task-list">
                {pendingList.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>

            {/* IN PROGRESS */}
            <div className="board-column">
              <div className="column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckSquare size={16} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 700 }}>In Progress</span>
                </div>
                <span className="badge badge-in-progress">{inProgressList.length}</span>
              </div>
              <div className="task-list">
                {inProgressList.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>

            {/* COMPLETED */}
            <div className="board-column">
              <div className="column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle size={16} color="var(--status-completed)" />
                  <span style={{ fontWeight: 700 }}>Completed</span>
                </div>
                <span className="badge badge-completed">{completedList.length}</span>
              </div>
              <div className="task-list">
                {completedList.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: TaskItem;
  onStatusChange: (id: string, s: string) => void;
}) {
  let isOverdue = false;
  let deadlineFormatted = "No deadline";

  if (task.deadline) {
    const dStr = task.deadline.split("T")[0];
    isOverdue = task.status !== "COMPLETED" && isPast(parseISO(`${dStr}T23:59:59`));
    deadlineFormatted = dStr;
  }

  return (
    <div
      className="card"
      style={{
        padding: "1rem",
        borderLeft: isOverdue ? "3px solid var(--status-overdue)" : undefined,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
        {task.meeting.team.name} • {task.meeting.title}
      </div>

      <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4, marginBottom: "0.75rem" }}>
        {task.description}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          marginTop: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Calendar size={13} color={isOverdue ? "var(--status-overdue)" : "var(--text-muted)"} />
          <span style={{ color: isOverdue ? "var(--status-overdue)" : "var(--text-secondary)", fontWeight: isOverdue ? 700 : 400 }}>
            {deadlineFormatted}
            {isOverdue && " (Overdue)"}
          </span>
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="select-field"
          style={{
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            width: "auto",
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  );
}
