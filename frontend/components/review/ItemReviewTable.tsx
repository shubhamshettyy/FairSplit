"use client";

import { motion } from "framer-motion";
import { ReceiptItem } from "@/lib/types";
import { formatCurrency, uid } from "@/lib/utils";

interface ItemReviewTableProps {
  items: ReceiptItem[];
  onChange: (items: ReceiptItem[]) => void;
}

const CATEGORIES: { value: ReceiptItem["category"]; label: string }[] = [
  { value: "item", label: "Item" },
  { value: "tax", label: "Tax" },
  { value: "fee", label: "Fee" },
  { value: "tip", label: "Tip" },
  { value: "discount", label: "Discount" },
];

export function ItemReviewTable({ items, onChange }: ItemReviewTableProps) {
  const updateRow = <K extends keyof ReceiptItem>(index: number, key: K, value: ReceiptItem[K]) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    if (key === "unit_price" || key === "quantity") {
      const qty = Number(next[index].quantity || 0);
      const price = Number(next[index].unit_price || 0);
      next[index].total = Number((qty * price).toFixed(2));
    }
    onChange(next);
  };

  const removeRow = (index: number) => onChange(items.filter((_, i) => i !== index));

  const addRow = () => {
    onChange([
      ...items,
      { id: uid(), name: "", quantity: 1, unit_price: 0, total: 0, category: "item", assignees: [] },
    ]);
  };

  return (
    <>
      <style>{`
        .review-wrap {
          background: var(--surface);
          border-radius: 18px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          overflow-x: auto;
        }
        .review-table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          font-family: 'DM Sans', sans-serif;
        }
        .review-table thead tr {
          border-bottom: 1.5px solid var(--border);
        }
        .review-table th {
          padding: 12px 16px;
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          background: var(--surface-2);
          text-align: left;
        }
        .review-table th:first-child { border-radius: 18px 0 0 0; }
        .review-table th:last-child  { border-radius: 0 18px 0 0; }
        .review-table th.r { text-align: right; }
        .review-table th.c { text-align: center; }
        .review-row {
          border-top: 1px solid var(--border);
          transition: background 0.15s;
        }
        .review-row:hover { background: var(--surface-2); }
        .review-row td { vertical-align: middle; padding: 10px 16px; }
        .review-row td.r { text-align: right; }
        .review-row td.c { text-align: center; }
        .review-row td.total-col {
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          font-size: 13px;
          color: var(--text-2);
          text-align: right;
          white-space: nowrap;
        }
        .review-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border);
        }
      `}</style>

      <div className="review-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>Item</th>
              <th className="r" style={{ width: 80 }}>Qty</th>
              <th className="r" style={{ width: 110 }}>Unit Price</th>
              <th className="r" style={{ width: 90 }}>Total</th>
              <th className="c" style={{ width: 100 }}>Category</th>
              <th className="c" style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <motion.tr
                key={item.id}
                className="review-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <td>
                  <input
                    value={item.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    className="app-input"
                    style={{ fontSize: 13 }}
                  />
                </td>
                <td className="r">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateRow(i, "quantity", Number(e.target.value))}
                    className="app-input"
                    style={{ width: 60, textAlign: "right", fontSize: 13 }}
                  />
                </td>
                <td className="r">
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateRow(i, "unit_price", Number(e.target.value))}
                    className="app-input"
                    style={{ width: 90, textAlign: "right", fontSize: 13 }}
                  />
                </td>
                <td className="total-col">{formatCurrency(item.total)}</td>
                <td className="c">
                  <select
                    value={item.category}
                    onChange={(e) => updateRow(i, "category", e.target.value as ReceiptItem["category"])}
                    className="app-select"
                    style={{ width: "100%" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </td>
                <td className="c">
                  <motion.button
                    onClick={() => removeRow(i)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--danger-bg)",
                      color: "var(--danger)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                    title="Delete row"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <div className="review-footer">
          <motion.button
            onClick={addRow}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-ghost"
            style={{ gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add row
          </motion.button>
        </div>
      </div>
    </>
  );
}
