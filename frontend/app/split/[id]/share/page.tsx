"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { createShareToken } from "@/lib/api";

export default function SessionSharePage() {
  const params = useParams<{ id: string }>();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const generate = async () => {
    setError("");
    try {
      const token = await createShareToken(params.id);
      const fullUrl = `${window.location.origin}/share/${token}`;
      setUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate share link");
    }
  };

  return (
    <main className="app-page" style={{ maxWidth: 560 }}>
      <div style={{ textAlign: "center", paddingTop: 40 }}>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Create share link</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
          Generate a read-only link to share this split with others.
        </p>
        <motion.button
          onClick={generate}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-accent"
          style={{ gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Generate link
        </motion.button>
        {!!url && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-dim)",
              fontSize: 13,
              color: "var(--accent)",
              wordBreak: "break-all",
            }}
          >
            {url}
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Link copied to clipboard</p>
          </motion.div>
        )}
        {!!error && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>{error}</p>
        )}
      </div>
    </main>
  );
}
