"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DropZone } from "@/components/upload/DropZone";
import { ImagePreviewGrid } from "@/components/upload/ImagePreviewGrid";
import { parseReceipt } from "@/lib/api";

export default function NewSplitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFilesSelected = (newFiles: File[]) => {
    setError("");
    setFiles((prev) => [...prev, ...newFiles].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const localTodayIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const onParse = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    try {
      const effectiveDate = dateParam ?? localTodayIso();
      const data = await parseReceipt(files, effectiveDate);
      router.push(`/split/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parsing failed, try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-page">
      {/* Back to dashboard */}
      <div style={{ marginBottom: 20 }}>
        <motion.button
          onClick={() => router.push("/dashboard")}
          whileHover={{ x: -2 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--muted)",
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </motion.button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "var(--accent-dim)",
            borderRadius: 100,
            padding: "6px 14px",
            marginBottom: 16,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--accent-hover)",
            letterSpacing: "0.02em",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          New Split
        </motion.div>
        <h1 className="app-title" style={{ marginBottom: 8 }}>Upload a receipt</h1>
        <p className="app-subtitle" style={{ maxWidth: 420, margin: "0 auto" }}>
          Drop your receipt screenshots and we'll extract every line item automatically.
        </p>
        {dateParam && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              padding: "5px 12px",
              borderRadius: 100,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-2)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(dateParam + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <DropZone onFilesSelected={onFilesSelected} maxFiles={3} />
        <ImagePreviewGrid files={files} onRemove={removeFile} />

        <AnimatePresence>
          {!!error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onParse}
          disabled={loading || files.length === 0}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn btn-accent"
          style={{
            width: "100%",
            marginTop: 20,
            padding: "12px 0",
            fontSize: 15,
            opacity: loading || files.length === 0 ? 0.45 : 1,
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                style={{ display: "inline-flex" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </motion.span>
              Parsing receipt...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Parse receipt
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "color-mix(in oklab, var(--bg) 68%, transparent)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "min(520px, 100%)",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-lg)",
                padding: "22px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-dim)", display: "grid", placeItems: "center", color: "var(--accent)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </motion.div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Parsing your receipt</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>Reading rows, prices, taxes, fees, and tips...</p>
                </div>
              </div>

              <div style={{ position: "relative", height: 104, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 10, display: "grid", gap: 7 }}>
                  {[58, 72, 44, 66, 49, 75].map((w, idx) => (
                    <div key={idx} style={{ height: 7, width: `${w}%`, borderRadius: 99, background: "var(--border-md)" }} />
                  ))}
                </div>
                <motion.div
                  initial={{ x: "-120%" }}
                  animate={{ x: "120%" }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    top: -20,
                    bottom: -20,
                    width: 120,
                    background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 35%, transparent), transparent)",
                    filter: "blur(6px)",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
