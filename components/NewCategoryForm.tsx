"use client";
// NewCategoryForm — new for M2 (plan.md § Components — New-category inline form):
// - Name <Input> (required, non-blank)
// - 12-color palette as 4×3 grid (role="radiogroup" + role="radio" per swatch)
// - Swatches use CSS vars --cat-1..--cat-12 (NOT inline hex)
// - "Done" button: aria-disabled until Name is non-blank AND color is picked (SG-m2-11)
// - On Done: calls onCreate({ id: uuid(), name, color })
// - "Cancel" returns view to block form (via onCancel prop)

import { useState } from "react";
import { uuid } from "@/lib/uuid";
import type { Category } from "@/lib/types";

// 12-color palette per SG-m2-01
const PALETTE: { index: number; varName: string }[] = Array.from(
  { length: 12 },
  (_, i) => ({ index: i + 1, varName: `var(--cat-${i + 1})` }),
);

// Hex values corresponding to var(--cat-N) — used only for the onCreate color value
// These must match app/globals.css SG-m2-01 hexes.
const PALETTE_HEX: string[] = [
  "#34d399", // cat-1
  "#c4b5fd", // cat-2
  "#fbbf24", // cat-3
  "#94a3b8", // cat-4
  "#fb7185", // cat-5
  "#fb923c", // cat-6
  "#a3e635", // cat-7
  "#2dd4bf", // cat-8
  "#38bdf8", // cat-9
  "#818cf8", // cat-10
  "#e879f9", // cat-11
  "#d4a373", // cat-12
];

interface Props {
  onCreate: (category: Pick<Category, "id" | "name" | "color">) => void;
  onCancel: () => void;
}

export function NewCategoryForm({ onCreate, onCancel }: Props) {
  const [name, setName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const isValid = name.trim().length > 0 && selectedIndex !== null;

  function handleDone() {
    if (!isValid || selectedIndex === null) return;
    onCreate({
      id: uuid(),
      name: name.trim(),
      color: PALETTE_HEX[selectedIndex - 1] ?? "#34d399",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Name input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label
          htmlFor="new-category-name"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-12)",
            color: "var(--ink-dim)",
          }}
        >
          Name
        </label>
        <input
          id="new-category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          style={{
            height: "44px",
            borderRadius: "8px",
            border: "1px solid var(--ink-dim)",
            background: "var(--bg-elev)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            padding: "0 12px",
            width: "100%",
          }}
        />
      </div>

      {/* 12-color palette — 4×3 grid */}
      <div
        role="radiogroup"
        aria-label="Color"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      >
        {PALETTE.map(({ index, varName }) => {
          const selected = selectedIndex === index;
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-label={`Color ${index}`}
              aria-checked={selected}
              onClick={() => setSelectedIndex(index)}
              style={{
                height: "44px",
                borderRadius: "8px",
                border: selected
                  ? "3px solid var(--ink)"
                  : "2px solid transparent",
                background: varName,
                cursor: "pointer",
                outline: selected ? "2px solid var(--accent)" : "none",
                outlineOffset: "2px",
              }}
            />
          );
        })}
      </div>

      {/* Done + Cancel buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          aria-disabled={isValid ? "false" : "true"}
          onClick={handleDone}
          style={{
            flex: 1,
            height: "44px",
            borderRadius: "8px",
            border: "none",
            background: isValid ? "var(--accent)" : "var(--ink-dim)",
            color: "var(--bg)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            cursor: isValid ? "pointer" : "not-allowed",
            opacity: isValid ? 1 : 0.6,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Done
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            height: "44px",
            borderRadius: "8px",
            border: "1px solid var(--ink-dim)",
            background: "transparent",
            color: "var(--ink-dim)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            cursor: "pointer",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
