"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getSharedSession, getSharedSummary } from "@/lib/api";
import { PersonCard } from "@/components/summary/PersonCard";
import { SplitSession, SummaryResponse } from "@/lib/types";

export default function SharedSummaryPage() {
  const params = useParams<{ token: string }>();
  const [session, setSession] = useState<SplitSession | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const shared = await getSharedSession(params.token);
        setSession(shared);
        const data = await getSharedSummary(params.token);
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load shared split");
      }
    };
    void load();
  }, [params.token]);

  if (error) {
    return (
      <main className="app-page" style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "var(--danger)", fontSize: 15 }}>{error}</p>
      </main>
    );
  }

  if (!session || !summary) {
    return (
      <main className="app-page" style={{ textAlign: "center", paddingTop: 80 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-flex", color: "var(--accent)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        </motion.div>
        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>Loading shared split...</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-2)",
            borderRadius: 100,
            padding: "5px 12px",
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Shared split
        </div>
        <h1 className="app-title" style={{ marginBottom: 4 }}>FairSplit</h1>
        <p className="app-subtitle">Read-only shared summary</p>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {summary.people.map((person) => (
          <PersonCard key={person.person_id} summary={person} />
        ))}
      </div>
    </main>
  );
}
