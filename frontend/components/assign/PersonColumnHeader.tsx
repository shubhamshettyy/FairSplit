"use client";

import { motion } from "framer-motion";
import { Person } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PersonColumnHeaderProps {
  person: Person;
  subtotal: number;
  onAll: () => void;
  onNone: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PersonColumnHeader({ person, subtotal, onAll, onNone }: PersonColumnHeaderProps) {
  const initials = getInitials(person.name);

  return (
    <th style={{ padding: "12px 8px", textAlign: "center", minWidth: 72 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: person.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.03em",
            boxShadow: `0 2px 10px ${person.color}55`,
          }}
        >
          {initials}
        </motion.div>

        {/* Name */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "none",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 64,
          }}
        >
          {person.name}
        </span>

        {/* Subtotal */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--muted)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {formatCurrency(subtotal)}
        </span>

        {/* All / None */}
        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
          <button
            onClick={onAll}
            style={{
              background: `${person.color}18`,
              border: "none",
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 10,
              fontWeight: 600,
              color: person.color,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = `${person.color}30`)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = `${person.color}18`)}
          >
            All
          </button>
          <button
            onClick={onNone}
            style={{
              background: "var(--surface-2)",
              border: "none",
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-2)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "var(--surface-3)")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "var(--surface-2)")}
          >
            None
          </button>
        </div>
      </div>
    </th>
  );
}
