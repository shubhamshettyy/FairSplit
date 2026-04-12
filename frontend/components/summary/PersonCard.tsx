"use client";

import { PersonSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PersonCardProps {
  summary: PersonSummary;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PersonCard({ summary }: PersonCardProps) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: summary.color,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "0.03em",
            boxShadow: `0 3px 12px ${summary.color}44`,
            flexShrink: 0,
          }}
        >
          {getInitials(summary.name)}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.2 }}>
            {summary.name}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, marginTop: 2 }}>
            Subtotal {formatCurrency(summary.subtotal)} · Tax/Fee {formatCurrency(summary.tax_and_fees_share)}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: summary.color,
              margin: 0,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(summary.total_owed)}
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        {summary.items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              padding: "4px 0",
              color: "var(--text-2)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
              {item.name} <span style={{ color: "var(--muted)" }}>×{item.quantity}</span>
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, flexShrink: 0 }}>
              {formatCurrency(item.total / Math.max(item.assignees.length, 1))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
