"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SplitSession } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { formatIsoDateLabel } from "@/lib/date";

interface SessionDetailModalProps {
  session: SplitSession | null;
  onClose: () => void;
  onOpen: (sessionId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function SessionDetailModal({ session, onClose, onOpen }: SessionDetailModalProps) {
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session, onClose]);

  const itemRows = session?.items.filter((i) => i.category === "item" || i.category === "discount") ?? [];
  const chargeRows = session?.items.filter((i) => i.category === "tax" || i.category === "fee" || i.category === "tip") ?? [];
  const grandTotal = session?.items.reduce((s, i) => s + i.total, 0) ?? 0;

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              boxShadow: "var(--shadow-lg)",
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>
                    {session.name || "Untitled receipt"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                    {formatIsoDateLabel(session.created_at)}
                  </p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "var(--text)", margin: 0, flexShrink: 0 }}>
                  {formatCurrency(grandTotal)}
                </p>
              </div>

              {/* People pills */}
              {session.people.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {session.people.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px 3px 3px",
                        borderRadius: 100,
                        background: `${p.color}14`,
                        border: `1px solid ${p.color}25`,
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--text-2)",
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: p.color,
                          color: "#fff",
                          fontSize: 8,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {getInitials(p.name)}
                      </div>
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {itemRows.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{item.name}</span>
                    {item.quantity > 1 && (
                      <span style={{ color: "var(--muted)", marginLeft: 4, fontSize: 11 }}>x{item.quantity}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "var(--text-2)", flexShrink: 0, marginLeft: 8 }}>
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}

              {chargeRows.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", padding: "12px 0 6px" }}>
                    Taxes & Fees
                  </div>
                  {chargeRows.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "5px 0",
                        fontSize: 12,
                        color: "var(--text-2)",
                      }}
                    >
                      <span>{item.name}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <motion.button
                onClick={() => onOpen(session.session_id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-accent"
                style={{ flex: 1, gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open session
              </motion.button>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-ghost"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
