"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { AssignmentTable } from "@/components/assign/AssignmentTable";
import { PeopleInput } from "@/components/people/PeopleInput";
import { ItemReviewTable } from "@/components/review/ItemReviewTable";
import { ExportPanel } from "@/components/summary/ExportPanel";
import { PersonCard } from "@/components/summary/PersonCard";
import { useSplitSession } from "@/hooks/useSplitSession";
import { getSummary } from "@/lib/api";
import { SummaryResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const STEPS = ["Review", "People", "Assign", "Summary", "Finish"] as const;
const STEP_ICONS = [
  <svg key="r" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  <svg key="p" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  <svg key="a" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  <svg key="s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  <svg key="f" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
];

export default function SplitSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const { session, loading, error, saveState, setItems, setPeople, setChargeSplitMode, setName } = useSplitSession(sessionId);
  const [editingName, setEditingName] = useState(false);

  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (step !== 3 || !sessionId) return;
    const loadSummary = async () => {
      setSummaryLoading(true);
      try { setSummary(await getSummary(sessionId)); } finally { setSummaryLoading(false); }
    };
    void loadSummary();
  }, [step, sessionId]);

  const screen = useMemo(() => {
    if (!session) return null;
    if (step === 0) return <ItemReviewTable items={session.items} onChange={setItems} />;
    if (step === 1) return <PeopleInput people={session.people} onChange={setPeople} />;
    if (step === 2) {
      return (
        <AssignmentTable
          items={session.items}
          people={session.people}
          chargeSplitMode={session.charge_split_mode}
          onChange={setItems}
        />
      );
    }
    if (step === 3) {
      if (!summary || summaryLoading) {
        return (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ display: "inline-flex", marginBottom: 12, color: "var(--accent)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </motion.div>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>Calculating split...</p>
          </div>
        );
      }
      return (
        <div>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {summary.people.map((person) => (
              <PersonCard key={person.person_id} summary={person} />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            <span>Grand total: <strong style={{ color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>{formatCurrency(summary.grand_total)}</strong></span>
            {summary.unassigned_total > 0 && (
              <span>Unassigned: <strong style={{ color: "var(--accent)", fontFamily: "'DM Mono', monospace" }}>{formatCurrency(summary.unassigned_total)}</strong></span>
            )}
          </div>
          <ExportPanel summary={summary} />
        </div>
      );
    }
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent-dim)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>All done!</h2>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
          Your split session is saved. You can start a new split or return to the summary anytime.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <motion.button
            onClick={() => router.push("/dashboard")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-accent"
            style={{ gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Dashboard
          </motion.button>
          <motion.button
            onClick={() => router.push("/split/new")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-ghost"
            style={{ gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New split
          </motion.button>
          <motion.button
            onClick={() => setStep(3)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-ghost"
          >
            Back to summary
          </motion.button>
        </div>
      </div>
    );
  }, [session, step, summary, summaryLoading, setItems, setPeople, sessionId, router]);

  if (loading) {
    return (
      <main className="app-page" style={{ textAlign: "center", paddingTop: 80 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-flex", color: "var(--accent)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        </motion.div>
        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>Loading session...</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="app-page" style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "var(--danger)", fontSize: 15 }}>{error ?? "Session not found"}</p>
        <motion.button
          onClick={() => router.push("/dashboard")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn btn-ghost"
          style={{ marginTop: 16 }}
        >
          Back to dashboard
        </motion.button>
      </main>
    );
  }

  return (
    <main className="app-page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <motion.button
          onClick={() => router.push("/dashboard")}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            flexShrink: 0,
          }}
          title="Back to dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              autoFocus
              value={session.name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="app-input"
              style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.4rem)", fontWeight: 700, padding: "4px 8px", width: "100%" }}
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              style={{
                fontSize: "clamp(1.3rem, 2.8vw, 1.7rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title="Click to rename"
            >
              {session.name || "Untitled receipt"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, verticalAlign: "middle", opacity: 0.5 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </h1>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={saveState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 8px",
                borderRadius: 20,
                background: saveState === "saving" ? "var(--accent-dim)" : saveState === "error" ? "var(--danger-bg)" : "var(--surface-2)",
                color: saveState === "saving" ? "var(--accent)" : saveState === "error" ? "var(--danger)" : "var(--muted)",
              }}
            >
              {saveState === "saving" && "Saving..."}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Step navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {STEPS.map((label, idx) => {
          const active = step === idx;
          const completed = idx < step;
          return (
            <motion.button
              key={label}
              onClick={() => setStep(idx)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 100,
                border: active ? "none" : `1px solid ${completed ? "var(--accent)" : "var(--border)"}40`,
                background: active ? "var(--accent)" : completed ? "var(--accent-dim)" : "var(--surface)",
                color: active ? "var(--accent-fg)" : completed ? "var(--accent)" : "var(--text-2)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
                boxShadow: active ? "0 2px 12px rgba(245,158,11,0.30)" : "none",
              }}
            >
              {STEP_ICONS[idx]}
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Split mode toggle — only relevant on Assign step */}
      {step === 2 && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 100,
            padding: "4px 6px",
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, padding: "0 6px" }}>Tax split:</span>
          {(["equal", "prorated"] as const).map((mode) => (
            <motion.button
              key={mode}
              onClick={() => setChargeSplitMode(mode)}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "5px 12px",
                borderRadius: 100,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: session.charge_split_mode === mode ? "var(--accent)" : "transparent",
                color: session.charge_split_mode === mode ? "var(--accent-fg)" : "var(--text-2)",
                transition: "background 0.15s, color 0.15s",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </motion.button>
          ))}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons — hidden on the Finish step which has its own actions */}
      {step < 4 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <motion.button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-ghost"
            style={{ opacity: step === 0 ? 0.35 : 1, gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </motion.button>
          <motion.button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-accent"
            style={{ gap: 6 }}
          >
            {step === 3 ? "Finish" : "Continue"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.button>
        </div>
      )}
    </main>
  );
}
