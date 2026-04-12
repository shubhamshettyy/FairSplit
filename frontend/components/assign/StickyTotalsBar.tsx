"use client";

import { Person } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface StickyTotalsBarProps {
  people: Person[];
  totalsByPerson: Record<string, number>;
  unassignedTotal: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function StickyTotalsBar({ people, totalsByPerson, unassignedTotal }: StickyTotalsBarProps) {
  return (
    <>
      <style>{`
        .totals-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid var(--glass-border);
          box-shadow: var(--shadow-lg);
          padding: 10px 20px;
        }
        .totals-inner {
          margin: 0 auto;
          max-width: 1080px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .person-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          border-radius: 100px;
          padding: 5px 12px 5px 5px;
          transition: transform 0.15s;
        }
        .person-pill:hover { transform: translateY(-1px); }
        .person-pill-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          letter-spacing: 0.03em;
        }
        .person-pill-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-2);
        }
        .person-pill-amount {
          font-size: 12px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
        }
        .unassigned-pill {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--unassigned-bg);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
        }
        .unassigned-pill strong {
          font-family: 'DM Mono', monospace;
          font-weight: 700;
          color: var(--accent);
        }
      `}</style>
      <div className="totals-bar">
        <div className="totals-inner">
          {people.map((person) => {
            const initials = getInitials(person.name);
            const amount = totalsByPerson[person.id] ?? 0;
            return (
              <div key={person.id} className="person-pill" style={{ background: `${person.color}14` }}>
                <div className="person-pill-avatar" style={{ background: person.color, boxShadow: `0 2px 8px ${person.color}44` }}>
                  {initials}
                </div>
                <span className="person-pill-name">{person.name}</span>
                <span className="person-pill-amount" style={{ color: person.color }}>{formatCurrency(amount)}</span>
              </div>
            );
          })}
          {unassignedTotal > 0 && (
            <div className="unassigned-pill">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <span>Unassigned</span>
              <strong>{formatCurrency(unassignedTotal)}</strong>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
