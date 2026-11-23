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

          <span className="badge badge-in-progress" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
            {tasks.filter((t) => t.status !== "COMPLETED").length} Open Commitments
          </span>
        </div>

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
                <span style={{ color: "var(--status-pending)" }}>PENDING</span>
                <span className="badge badge-pending">{pendingList.length}</span>
              </div>
              {pendingList.map((item) => (
                <PersonTaskCard key={item.id} task={item} onStatusChange={handleStatusChange} />
              ))}
            </div>

            {/* IN PROGRESS */}
            <div className="board-column">
              <div className="column-header">
                <span style={{ color: "#38bdf8" }}>IN PROGRESS</span>
                <span className="badge badge-in-progress">{inProgressList.length}</span>
              </div>
              {inProgressList.map((item) => (
                <PersonTaskCard key={item.id} task={item} onStatusChange={handleStatusChange} />
              ))}
            </div>

            {/* COMPLETED */}
            <div className="board-column">
              <div className="column-header">
                <span style={{ color: "var(--status-completed)" }}>COMPLETED</span>
                <span className="badge badge-completed">{completedList.length}</span>
              </div>
              {completedList.map((item) => (
                <PersonTaskCard key={item.id} task={item} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function PersonTaskCard({
  task,
  onStatusChange,
}: {
  task: TaskItem;
  onStatusChange: (id: string, status: string) => void;
}) {
  const deadlineStr = task.deadline ? task.deadline.split("T")[0] : null;
  const isOverdue =
    deadlineStr && task.status !== "COMPLETED"
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
      <div style={{ fontSize: "0.925rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {task.description}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <div>
          Meeting:{" "}
          <Link
            href={`/teams/${task.meeting.team.id}/meetings/${task.meeting.id}`}
            style={{ color: "var(--brand-primary)", textDecoration: "none" }}
          >
            {task.meeting.title}
          </Link>
        </div>
        <div>Team: {task.meeting.team.name}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
        {deadlineStr ? (
          <span className={`badge ${isOverdue ? "badge-overdue" : "badge-pending"}`} style={{ fontSize: "0.7rem" }}>
            {isOverdue ? "Overdue: " : "Due: "}
            {deadlineStr}
          </span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>No deadline</span>
        )}

        <select
          className="select-field"
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          style={{ width: "auto", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  );
}
