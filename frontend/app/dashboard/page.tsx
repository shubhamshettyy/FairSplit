"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { listSessions } from "@/lib/api";
import { SplitSession } from "@/lib/types";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { ListView } from "@/components/dashboard/ListView";
import { SessionDetailModal } from "@/components/dashboard/SessionDetailModal";
import { getIsoDateParts } from "@/lib/date";

type View = "calendar" | "list";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SplitSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("calendar");
  const [modalSession, setModalSession] = useState<SplitSession | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listSessions();
        setSessions(data);
      } catch { /* keep usable */ }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const filteredSessions = sessions.filter((s) => {
    if (view === "list") return true;
    const parts = getIsoDateParts(s.created_at);
    if (!parts) return false;
    return parts.year === year && parts.month - 1 === month;
  });

  const monthTotal = filteredSessions.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.total, 0), 0
  );

  const openSession = useCallback((id: string) => {
    setModalSession(null);
    router.push(`/split/${id}`);
  }, [router]);

  const startSplitOnDate = useCallback((dateIso: string) => {
    router.push(`/split/new?date=${dateIso}`);
  }, [router]);

  return (
    <main className="app-page">
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 className="app-title">Dashboard</h1>
          <p className="app-subtitle" style={{ marginTop: 2 }}>
            {view === "calendar" ? `${MONTH_NAMES[month]} ${year}` : "All sessions"}
            {!loading && sessions.length > 0 && (
              <span style={{ marginLeft: 8, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "var(--accent)" }}>
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monthTotal)}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <motion.button
            onClick={() => router.push("/split/new")}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn btn-accent"
            style={{ gap: 6, fontSize: 12 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New split
          </motion.button>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* View toggle */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 100,
            padding: "3px 4px",
          }}
        >
          {(["calendar", "list"] as const).map((v) => (
            <motion.button
              key={v}
              onClick={() => setView(v)}
              whileTap={{ scale: 0.95 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 100,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "var(--accent-fg)" : "var(--text-2)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {v === "calendar" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              )}
              {v === "calendar" ? "Calendar" : "List"}
            </motion.button>
          ))}
        </div>

        {/* Month navigation (only in calendar mode) */}
        {view === "calendar" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <motion.button
              onClick={goToday}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-2)",
                cursor: "pointer",
                marginRight: 4,
              }}
            >
              Today
            </motion.button>
            <motion.button
              onClick={prevMonth}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 120, textAlign: "center" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <motion.button
              onClick={nextMonth}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ display: "inline-flex", color: "var(--accent)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </motion.div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>Loading sessions...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {view === "calendar" ? (
              <CalendarView
                sessions={filteredSessions}
                year={year}
                month={month}
                onSessionClick={setModalSession}
                onDateDoubleClick={startSplitOnDate}
              />
            ) : (
              <ListView
                sessions={filteredSessions}
                onSessionClick={setModalSession}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <SessionDetailModal
        session={modalSession}
        onClose={() => setModalSession(null)}
        onOpen={openSession}
      />
    </main>
  );
}
