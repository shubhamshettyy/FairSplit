"use client";

import { toPng } from "html-to-image";
import { useState } from "react";
import { motion } from "framer-motion";
import { SummaryResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ExportPanelProps {
  summary: SummaryResponse;
}

export function ExportPanel({ summary }: ExportPanelProps) {
  const [status, setStatus] = useState<string>("");
  const [pngUrl, setPngUrl] = useState<string>("");

  const copyText = async () => {
    const lines: string[] = [`FairSplit — ${new Date().toLocaleDateString()}`, ""];
    summary.people.forEach((p) => {
      lines.push(`${p.name} owes ${formatCurrency(p.total_owed)}`);
      p.items.forEach((item) => {
        lines.push(`  · ${item.name} (×${item.quantity}): ${formatCurrency(item.total / Math.max(item.assignees.length, 1))}`);
      });
      lines.push(`  · Tax/Fee share: ${formatCurrency(p.tax_and_fees_share)}`);
      lines.push("");
    });
    lines.push(`Grand total: ${formatCurrency(summary.grand_total)}`);
    if (summary.unassigned_total > 0) lines.push(`Unassigned: ${formatCurrency(summary.unassigned_total)}`);
    lines.push("", "Pay via Venmo / Zelle");
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus("Copied to clipboard");
    setTimeout(() => setStatus(""), 2500);
  };

  const saveImage = async () => {
    const node = document.getElementById("summary-export-capture");
    try {
      if (!node) { setStatus("Export target not found"); return; }
      const dataUrl = await toPng(node, { backgroundColor: "#0f172a", pixelRatio: 2, cacheBust: true });
      setPngUrl(dataUrl);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "fairsplit-summary.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus("PNG saved");
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      setStatus(err instanceof Error ? `Export failed: ${err.message}` : "Export failed");
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <motion.button onClick={copyText} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-ghost" style={{ gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy text
        </motion.button>
        <motion.button onClick={saveImage} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-accent" style={{ gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PNG
        </motion.button>
      </div>

      {!!status && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 12, color: "var(--accent)", marginTop: 8, fontWeight: 500 }}
        >
          {status}
        </motion.p>
      )}
      {!!pngUrl && (
        <a href={pngUrl} download="fairsplit-summary.png" style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, display: "inline-block", textDecoration: "underline" }}>
          Download PNG manually
        </a>
      )}

      <div
        id="summary-export-capture"
        style={{
          marginTop: 16,
          width: 390,
          maxWidth: "100%",
          background: "#0f172a",
          color: "#e5e7eb",
          padding: 20,
          borderRadius: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Export preview</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>FairSplit</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>{new Date().toLocaleDateString()}</div>
        {summary.people.map((p) => (
          <div key={p.person_id} style={{ marginBottom: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <span style={{ fontWeight: 700, fontSize: 16, fontFamily: "'DM Mono', monospace" }}>{formatCurrency(p.total_owed)}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
              Subtotal {formatCurrency(p.subtotal)} · Tax/Fee {formatCurrency(p.tax_and_fees_share)}
            </div>
            {p.items.map((item) => (
              <div key={item.id} style={{ fontSize: 11, marginBottom: 2, display: "flex", justifyContent: "space-between" }}>
                <span>{item.name} ×{item.quantity}</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{formatCurrency(item.total / Math.max(item.assignees.length, 1))}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
          Grand total: {formatCurrency(summary.grand_total)}
          {summary.unassigned_total > 0 && ` · Unassigned: ${formatCurrency(summary.unassigned_total)}`}
        </div>
      </div>
    </div>
  );
}
