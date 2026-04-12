"use client";

import { motion } from "framer-motion";

interface ImagePreviewGridProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function ImagePreviewGrid({ files, onRemove }: ImagePreviewGridProps) {
  if (!files.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
      {files.map((file, idx) => (
        <motion.div
          key={`${file.name}-${idx}`}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.06, type: "spring", stiffness: 400, damping: 25 }}
          style={{
            position: "relative",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            background: "var(--surface)",
          }}
        >
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
          />
          <motion.button
            type="button"
            onClick={() => onRemove(idx)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              backdropFilter: "blur(8px)",
            }}
          >
            ×
          </motion.button>
          <div style={{ padding: "6px 8px" }}>
            <p style={{
              fontSize: 11,
              color: "var(--muted)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {file.name}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
