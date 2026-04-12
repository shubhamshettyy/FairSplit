"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SplitSession } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getIsoDateKey } from "@/lib/date";

interface CalendarViewProps {
  sessions: SplitSession[];
  year: number;
  month: number;
  onSessionClick: (session: SplitSession) => void;
  onDateDoubleClick: (dateIso: string) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({ sessions, year, month, onSessionClick, onDateDoubleClick }: CalendarViewProps) {
  const { weeks, sessionsByDate } = useMemo(() => {
    const map: Record<string, SplitSession[]> = {};
    sessions.forEach((s) => {
      const key = getIsoDateKey(s.created_at);
      if (!key) return;
      (map[key] ??= []).push(s);
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7; // Mon=1

    const cells: (number | null)[] = [];
    for (let i = 1; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const wks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) wks.push(cells.slice(i, i + 7));

    return { weeks: wks, sessionsByDate: map };
  }, [sessions, year, month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <>
      <style>{`
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--surface);
          box-shadow: var(--shadow);
        }
        .cal-header-cell {
          padding: 10px 4px;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted);
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
        }
        .cal-cell {
          min-height: 90px;
          padding: 6px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          vertical-align: top;
          transition: background 0.15s;
          position: relative;
        }
        .cal-cell:nth-child(7n) { border-right: none; }
        .cal-cell.empty { background: var(--surface-2); opacity: 0.5; pointer-events: none; }
        .cal-cell.future { opacity: 0.4; }
        .cal-cell:not(.empty):not(.future) { cursor: default; }
        .cal-cell:hover:not(.empty):not(.future) { background: var(--surface-2); }
        .cal-day-num {
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .cal-day-num.today {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent);
          color: var(--accent-fg);
          font-weight: 700;
          font-size: 11px;
        }
        .cal-session-chip {
          display: block;
          width: 100%;
          padding: 4px 6px;
          margin-bottom: 3px;
          border-radius: 6px;
          background: var(--accent-dim);
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: background 0.15s;
        }
        .cal-session-chip:hover {
          background: rgba(245,158,11,0.22);
        }
        .cal-session-chip .chip-name {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
        }
        .cal-session-chip .chip-total {
          font-size: 10px;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          color: var(--accent-hover);
        }
      `}</style>

      <div className="cal-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="cal-header-cell">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="cal-cell empty" />;

          const cellDate = new Date(year, month, day);
          const key = isoDateKey(cellDate);
          const daySessions = sessionsByDate[key] ?? [];
          const isToday = isCurrentMonth && today.getDate() === day;
          const isFuture = cellDate.setHours(0,0,0,0) > new Date().setHours(0,0,0,0);

          return (
            <div
              key={key}
              className={`cal-cell${isFuture ? " future" : ""}`}
              onDoubleClick={isFuture ? undefined : () => onDateDoubleClick(key)}
              title={isFuture ? "" : "Double-click to start a split on this date"}
            >
              <div className={`cal-day-num${isToday ? " today" : ""}`}>{day}</div>
              {daySessions.slice(0, 3).map((s) => (
                <motion.button
                  key={s.session_id}
                  className="cal-session-chip"
                  onClick={() => onSessionClick(s)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="chip-name">{s.name || "Untitled"}</div>
                  <div className="chip-total">{formatCurrency(s.items.reduce((a, it) => a + it.total, 0))}</div>
                </motion.button>
              ))}
              {daySessions.length > 3 && (
                <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 4 }}>
                  +{daySessions.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
