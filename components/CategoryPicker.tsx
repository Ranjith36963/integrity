"use client";
// CategoryPicker — new for M2 (plan.md § Components — Category picker):
// - Renders existing categories as chips (role="radiogroup", single-select via selectedCategoryId)
// - "+ New" chip: plain <button>, calls onRequestNewCategory()
// - "Skip" chip: plain <button>, calls onSkip() (sets categoryId=null)
// - Zero categories: only "+ New" and "Skip" visible
// - Each category chip has data-category-id={id} for disambiguation (AC #30 — two same-name)

import type { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  onSkip: () => void;
  onRequestNewCategory: () => void;
}

export function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  onSkip,
  onRequestNewCategory,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {categories.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Category"
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
        >
          {categories.map((cat) => {
            const selected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={cat.name}
                data-category-id={cat.id}
                onClick={() => onSelect(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  minHeight: "44px",
                  borderRadius: "9999px",
                  border: selected
                    ? `1px solid ${cat.color}`
                    : "1px solid var(--ink-dim)",
                  background: selected ? `${cat.color}22` : "transparent",
                  color: selected ? cat.color : "var(--ink-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: cat.color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Actions row: Skip + + New */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: "8px 16px",
            minHeight: "44px",
            borderRadius: "9999px",
            border: "1px solid var(--ink-dim)",
            background: "transparent",
            color: "var(--ink-dim)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-12)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onRequestNewCategory}
          style={{
            padding: "8px 16px",
            minHeight: "44px",
            borderRadius: "9999px",
            border: "1px solid var(--ink-dim)",
            background: "transparent",
            color: "var(--ink-dim)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-12)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          + New
        </button>
      </div>
    </div>
  );
}
