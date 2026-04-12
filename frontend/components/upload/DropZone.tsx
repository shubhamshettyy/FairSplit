"use client";

import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";

const ACCEPTED = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export function DropZone({ onFilesSelected, maxFiles = 3 }: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxFiles,
    maxSize: 10 * 1024 * 1024,
    onDrop: (acceptedFiles) => onFilesSelected(acceptedFiles),
  });

  return (
    <motion.div
      {...getRootProps()}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      style={{
        background: isDragActive ? "var(--accent-dim)" : "var(--surface)",
        borderColor: isDragActive ? "var(--accent)" : "var(--border-md)",
        borderWidth: 2,
        borderStyle: "dashed",
        borderRadius: "var(--radius)",
        boxShadow: isDragActive ? "var(--shadow-lg)" : "var(--shadow)",
        cursor: "pointer",
        padding: "48px 24px",
        textAlign: "center",
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <input {...getInputProps()} />
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
        <motion.div
          animate={isDragActive ? { y: [-4, 0], scale: [1.08, 1] } : {}}
          transition={{ repeat: isDragActive ? Infinity : 0, repeatType: "reverse", duration: 0.6 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: isDragActive ? "var(--accent)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDragActive ? "var(--accent-fg)" : "var(--muted)"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </motion.div>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
        {isDragActive ? "Drop images here" : "Drop receipt screenshots here"}
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
        JPEG, PNG, WEBP up to 10 MB each (max 3 images)
      </p>
      <div
        style={{
          marginTop: 16,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--accent-dim)",
          color: "var(--accent-hover)",
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 20,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        or click to browse
      </div>
    </motion.div>
  );
}
