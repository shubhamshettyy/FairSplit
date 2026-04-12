"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Person } from "@/lib/types";
import { uid, withNextPersonColor } from "@/lib/utils";

interface PeopleInputProps {
  people: Person[];
  onChange: (people: Person[]) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PeopleInput({ people, onChange }: PeopleInputProps) {
  const [name, setName] = useState("");

  const addPerson = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...people, { id: uid(), name: trimmed, color: withNextPersonColor(people.length) }]);
    setName("");
  };

  const removePerson = (id: string) => onChange(people.filter((p) => p.id !== id));

  return (
    <div className="card" style={{ padding: "24px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
        Who is splitting this?
      </h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPerson()}
          placeholder="Enter a name and press Enter"
          className="app-input"
          style={{ flex: 1 }}
        />
        <motion.button
          onClick={addPerson}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-accent"
          style={{ gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Add
        </motion.button>
      </div>

      <AnimatePresence>
        {!!people.length && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20, overflow: "hidden" }}
          >
            {people.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px 5px 5px",
                  borderRadius: 100,
                  background: `${p.color}14`,
                  border: `1px solid ${p.color}30`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: p.color,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: "0.03em",
                    boxShadow: `0 2px 8px ${p.color}44`,
                  }}
                >
                  {getInitials(p.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{p.name}</span>
                <motion.button
                  onClick={() => removePerson(p.id)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ×
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
