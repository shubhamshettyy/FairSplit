"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChargeSplitMode, Person, ReceiptItem } from "@/lib/types";
import { computePersonSubtotal, computeUnassignedTotal, formatCurrency } from "@/lib/utils";
import { PersonColumnHeader } from "./PersonColumnHeader";
import { StickyTotalsBar } from "./StickyTotalsBar";

interface AssignmentTableProps {
  items: ReceiptItem[];
  people: Person[];
  chargeSplitMode: ChargeSplitMode;
  onChange: (items: ReceiptItem[]) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function AvatarToggle({
  person,
  checked,
  onToggle,
}: {
  person: Person;
  checked: boolean;
  onToggle: () => void;
}) {
  const initials = getInitials(person.name);
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      title={`${checked ? "Remove" : "Add"} ${person.name}`}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: checked ? "none" : `2px solid ${person.color}44`,
        background: checked ? person.color : `${person.color}18`,
        color: checked ? "#fff" : `${person.color}`,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.03em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: checked
          ? `0 0 0 3px ${person.color}33, 0 4px 12px ${person.color}44`
          : "none",
        transition: "background 0.18s, box-shadow 0.18s, border-color 0.18s, color 0.18s",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {checked ? (
          <motion.svg
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 25 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3 8.5L6.5 12L13 5"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : (
          <motion.span
            key="init"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ lineHeight: 1 }}
          >
            {initials}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function AssignmentTable({ items, people, chargeSplitMode, onChange }: AssignmentTableProps) {
  const itemRows = items.filter((i) => i.category === "item" || i.category === "discount");
  const chargeRows = items.filter((i) => i.category === "tax" || i.category === "fee" || i.category === "tip");

  const toggle = (itemId: string, personId: string, checked: boolean) => {
    const next = items.map((item) => {
      if (item.id !== itemId) return item;
      const assignees = new Set(item.assignees);
      if (checked) assignees.add(personId);
      else assignees.delete(personId);
      return { ...item, assignees: Array.from(assignees) };
    });
    onChange(next);
  };

  const setColumn = (personId: string, value: boolean) => {
    const next = items.map((item) => {
      if (!(item.category === "item" || item.category === "discount")) return item;
      const assignees = new Set(item.assignees);
      if (value) assignees.add(personId);
      else assignees.delete(personId);
      return { ...item, assignees: Array.from(assignees) };
    });
    onChange(next);
  };

  const subtotals = Object.fromEntries(people.map((p) => [p.id, computePersonSubtotal(p, items)]));

  return (
    <>
      <style>{`
        .assign-table-wrap {
          background: var(--surface);
          border-radius: 18px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          overflow-x: auto;
          margin-bottom: 6rem;
        }
        .assign-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          font-family: 'DM Sans', sans-serif;
        }
        .assign-table thead tr {
          border-bottom: 1.5px solid var(--border);
        }
        .assign-table th {
          padding: 0;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
          background: var(--surface-2);
        }
        .assign-table th:first-child {
          border-radius: 18px 0 0 0;
        }
        .assign-table th:last-child {
          border-radius: 0 18px 0 0;
        }
        .assign-table th.col-item { padding: 14px 20px; text-align: left; }
        .assign-table th.col-qty  { padding: 14px 12px; text-align: right; }
        .assign-table th.col-price { padding: 14px 20px; text-align: right; }

        .assign-row {
          border-top: 1px solid rgba(0,0,0,0.05);
          transition: background 0.15s;
        }
        .assign-row:hover {
          background: var(--surface-2);
        }
        .assign-row.unassigned {
          background: linear-gradient(90deg, var(--unassigned-bg) 0%, transparent 60px);
        }
        .assign-row.unassigned:hover {
          background: linear-gradient(90deg, var(--unassigned-bg-hover) 0%, var(--surface-2) 60px);
        }
        .assign-row td { vertical-align: middle; }
        .assign-row td.col-item {
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          max-width: 240px;
        }
        .assign-row td.col-item .item-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .assign-row td.col-item .unassigned-badge {
          display: inline-block;
          margin-top: 3px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--accent-hover);
          background: var(--unassigned-bg-hover);
          border-radius: 4px;
          padding: 1px 6px;
        }
        .assign-row td.col-qty {
          padding: 14px 12px;
          text-align: right;
          font-size: 13px;
          color: var(--muted);
          font-family: 'DM Mono', monospace;
        }
        .assign-row td.col-price {
          padding: 14px 20px;
          text-align: right;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
        }
        .assign-row td.col-avatar {
          padding: 10px 12px;
          text-align: center;
        }
        .charges-divider td {
          padding: 10px 20px 6px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          border-top: 1.5px dashed var(--border);
          background: var(--surface-2);
        }
        .charge-row {
          border-top: 1px solid rgba(0,0,0,0.04);
          opacity: 0.85;
        }
        .charge-row td { vertical-align: middle; }
        .charge-row td.col-item {
          padding: 12px 20px;
          font-size: 13.5px;
          font-weight: 400;
          color: var(--text-2);
        }
        .charge-row td.col-qty {
          padding: 12px;
          text-align: right;
          color: var(--muted);
          font-size: 13px;
        }
        .charge-row td.col-price {
          padding: 12px 20px;
          text-align: right;
          font-size: 13px;
          color: var(--text-2);
          font-family: 'DM Mono', monospace;
        }
        .charge-row td.col-avatar {
          padding: 10px 12px;
          text-align: center;
        }
        .charge-split-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--muted);
          background: var(--surface-2);
          border-radius: 20px;
          padding: 3px 8px;
        }
      `}</style>

      <div className="assign-table-wrap">
        <table className="assign-table">
          <thead>
            <tr>
              <th className="col-item">Item</th>
              <th className="col-qty">Qty</th>
              <th className="col-price">Price</th>
              {people.map((person) => (
                <PersonColumnHeader
                  key={person.id}
                  person={person}
                  subtotal={subtotals[person.id] ?? 0}
                  onAll={() => setColumn(person.id, true)}
                  onNone={() => setColumn(person.id, false)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {itemRows.map((item) => {
              const unassigned = item.assignees.length === 0;
              return (
                <tr key={item.id} className={`assign-row${unassigned ? " unassigned" : ""}`}>
                  <td className="col-item">
                    <div className="item-name">{item.name}</div>
                    {unassigned && <div className="unassigned-badge">Unassigned</div>}
                  </td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-price">{formatCurrency(item.total)}</td>
                  {people.map((person) => {
                    const checked = item.assignees.includes(person.id);
                    return (
                      <td key={person.id} className="col-avatar">
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <AvatarToggle
                            person={person}
                            checked={checked}
                            onToggle={() => toggle(item.id, person.id, !checked)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!!chargeRows.length && (
              <tr className="charges-divider">
                <td colSpan={3 + people.length}>Taxes &amp; Fees</td>
              </tr>
            )}
            {chargeRows.map((item) => (
              <tr key={item.id} className="charge-row">
                <td className="col-item">{item.name}</td>
                <td className="col-qty">—</td>
                <td className="col-price">{formatCurrency(item.total)}</td>
                {people.map((person) => (
                  <td key={person.id} className="col-avatar">
                    <span className="charge-split-pill">
                      {chargeSplitMode === "equal" ? "÷ equal" : "prorated"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <StickyTotalsBar
        people={people}
        totalsByPerson={subtotals}
        unassignedTotal={computeUnassignedTotal(items)}
      />
    </>
  );
}
