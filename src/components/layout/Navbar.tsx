"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CheckSquare, Users, LogOut, Calendar, Bell } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      style={{
        background: "rgba(15, 21, 35, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0.85rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
        <Link
          href="/teams"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
            color: "var(--text-primary)",
            fontWeight: 800,
            fontSize: "1.2rem",
            letterSpacing: "-0.03em",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--brand-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
            }}
          >
            <CheckSquare size={18} />
          </div>
          <span>
            Meeting<span className="gradient-text">Mind</span>
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/teams"
            className={`btn ${pathname.startsWith("/teams") ? "btn-secondary" : "btn-ghost"}`}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.9rem" }}
          >
            <Users size={16} />
            <span>Teams</span>
          </Link>
          <Link
            href="/my-tasks"
            className={`btn ${pathname === "/my-tasks" ? "btn-secondary" : "btn-ghost"}`}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.9rem" }}
          >
            <CheckSquare size={16} />
            <span>My Tasks</span>
          </Link>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {user ? (
          <>
            <div style={{ textAlign: "right", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user.name}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              title="Sign Out"
              style={{ padding: "0.5rem", borderRadius: "8px" }}
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
