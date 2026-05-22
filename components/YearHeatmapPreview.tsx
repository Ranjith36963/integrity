"use client";
/**
 * components/YearHeatmapPreview.tsx — M7e: year heatmap preview overlay.
 *
 * Rendered by <BrandMarkLongPress> on 600 ms long-press of the brand mark.
 * Composes <MonthCell> from M9e directly (SG-m7e-02 — composition over modification).
 *
 * Props: { state: AppState }
 * Reads: monthScore(state, year, monthIndex) — pure, clock-free (ADR-046).
 * Year derived from state.currentDate (clock-free per ADR-046).
 *
 * A11y: role="dialog" + aria-modal="true" + aria-label="Year heatmap preview"
 *        Grid wrapper: aria-hidden="true" (peek-only — release closes)
 * z-index: 40 (above dock z-20, below sheet z-50 — SG-m7e-04)
 * No new CSS custom property. No year-view module imported (SG-m7e-02).
 */

import type { AppState } from "@/lib/types";
import { yearMonths } from "@/lib/yearGrid";
import { monthScore } from "@/lib/history";
import { MonthCell } from "./MonthCell";

type YearHeatmapPreviewProps = {
  state: AppState;
  prefersReducedMotion?: boolean; // passed from BrandMarkLongPress for PRM opacity-fade test
};

export function YearHeatmapPreview({
  state,
  prefersReducedMotion: _prefersReducedMotion = false,
}: YearHeatmapPreviewProps) {
  // Derive year from state.currentDate (ADR-046 — no clock read)
  const year = parseInt(state.currentDate.slice(0, 4), 10);
  const months = yearMonths(year);

  return (
    <div
      data-testid="year-heatmap-preview"
      role="dialog"
      aria-modal="true"
      aria-label="Year heatmap preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        background: "color-mix(in srgb, var(--bg) 90%, transparent)",
      }}
    >
      {/* Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          padding: "24px 16px",
          maxWidth: "430px",
          width: "100%",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-14)",
            color: "var(--ink-dim)",
          }}
        >
          This year&apos;s heatmap
        </span>
        {/* 3×4 grid of MonthCells — aria-hidden because peek-only */}
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            width: "100%",
            transform: "scale(0.85)",
            transformOrigin: "center center",
          }}
        >
          {months.map((m) => (
            <div
              key={m.monthIndex}
              data-month-index={m.monthIndex}
              style={{ width: "100%" }}
            >
              <MonthCell
                year={m.year}
                monthIndex={m.monthIndex}
                name={m.name}
                score={monthScore(state, m.year, m.monthIndex)}
                isCurrentMonth={
                  m.year === year &&
                  m.monthIndex ===
                    parseInt(state.currentDate.slice(5, 7), 10) - 1
                }
                onOpen={() => {}} // no-op — preview is peek-only (SG-m7e-02)
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
