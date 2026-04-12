"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SplitSession } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getIsoDateKey } from "@/lib/date";

interface ListViewProps {
  sessions: SplitSession[];
  onSessionClick: (session: SplitSession) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function dateLabel(dateStr: string): string {
  const dKey = getIsoDateKey(dateStr);
  if (!dKey) return "Unknown date";
  const d = new Date(`${dKey}T12:00:00Z`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = getIsoDateKey(today.toISOString()) || "";
  const yKey = getIsoDateKey(yesterday.toISOString()) || "";
  if (dKey === todayKey) return "Today";
  if (dKey === yKey) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function dateKey(dateStr: string): string {
  return getIsoDateKey(dateStr) || "unknown";
}

export function ListView({ sessions, onSessionClick }: ListViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; sessions: SplitSession[] }>();
    sessions.forEach((s) => {
      const k = dateKey(s.created_at);
      if (!map.has(k)) map.set(k, { label: dateLabel(s.created_at), sessions: [] });
      map.get(k)!.sessions.push(s);
    });
    return Array.from(map.values());
  }, [sessions]);

  if (!sessions.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--surface-2)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>No sessions yet. Upload a receipt to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {grouped.map((group) => (
        <div key={group.label}>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            {group.label}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.sessions.map((s, i) => {
              const total = s.items.reduce((a, it) => a + it.total, 0);
              const itemCount = s.items.filter((it) => it.category === "item").length;
              return (
                <motion.button
                  key={s.session_id}
                  onClick={() => onSessionClick(s)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ x: 2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "var(--accent-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name || "Untitled receipt"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>
                      {s.people.length > 0 && (
                        <div style={{ display: "flex", marginLeft: 2 }}>
                          {s.people.slice(0, 4).map((p, j) => (
                            <div
                              key={p.id}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: p.color,
                                color: "#fff",
                                fontSize: 7,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1.5px solid var(--surface)",
                                marginLeft: j > 0 ? -5 : 0,
                                zIndex: 4 - j,
                                position: "relative",
                              }}
                              title={p.name}
                            >
                              {getInitials(p.name)}
                            </div>
                          ))}
                          {s.people.length > 4 && (
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: "var(--surface-3)",
                                color: "var(--muted)",
                                fontSize: 7,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1.5px solid var(--surface)",
                                marginLeft: -5,
                              }}
                            >
                              +{s.people.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "var(--text)", margin: 0, flexShrink: 0 }}>
                    {formatCurrency(total)}
                  </p>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
