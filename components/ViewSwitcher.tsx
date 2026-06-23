"use client";
/**
 * ViewSwitcher — M9c: Day·Week·Month·Year segmented control.
 * M9d: Week segment enabled (live: true).
 * M9e: Year segment enabled (live: true). All four segments now live.
 * Resolves SG-m9c-02, SG-m9c-05; AC #8 (M9d, M9e).
 *
 * Props: { view: "day" | "month" | "week" | "year"; onSelect: (...) => void }
 *
 * Accessibility:
 *   - container: role="tablist" aria-label="Calendar view"
 *   - all four segments: role="tab" aria-selected
 *   - R7-ROOT-M8/M9-P1: arrow-key navigation (Left/Right cycles) per WAI-ARIA
 *     Authoring Practices for tablist. Roving tabIndex: only the active tab
 *     has tabIndex={0}; inactive tabs are tabIndex={-1}.
 *
 * Design tokens: --accent (active bg), --bg (active text), --ink-dim (inactive)
 * ADR-031: segments ≥ 44px tall.
 */

import { useRef, useState } from "react";

type ViewName = "day" | "month" | "week" | "year";

type ViewSwitcherProps = {
  view: ViewName;
  onSelect: (view: ViewName) => void;
};

type Segment = { label: string; value: ViewName };

const SEGMENTS: Segment[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export function ViewSwitcher({ view, onSelect }: ViewSwitcherProps) {
  // R7-ROOT-M8/M9-P1: arrow-key handler. Cycles within the four segments;
  // Home/End jump to ends. Per WAI-ARIA tablist authoring guide.
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Sci-fi Phase 2b — track which tab is currently rippling. The
  // `data-rippling` attribute on the clicked button triggers the CSS
  // animation; we clear it after ~400ms so a second click on the same
  // tab still fires (CSS animations only restart on attribute flip).
  const [ripplingIndex, setRipplingIndex] = useState<number | null>(null);
  function fireRipple(idx: number) {
    setRipplingIndex(idx);
    window.setTimeout(() => setRipplingIndex(null), 420);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = SEGMENTS.findIndex((s) => s.value === view);
    let nextIndex = currentIndex;
    if (e.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? SEGMENTS.length - 1 : currentIndex - 1;
    } else if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % SEGMENTS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = SEGMENTS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextSeg = SEGMENTS[nextIndex];
    onSelect(nextSeg.value);
    // Focus the new active tab after the selection commits.
    queueMicrotask(() => buttonsRef.current[nextIndex]?.focus());
  }

  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      onKeyDown={handleKeyDown}
      className="flex w-full"
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-12)",
      }}
    >
      {SEGMENTS.map((seg, idx) => {
        // All four segments are live — Day, Week, Month, Year
        const isActive = view === seg.value;
        return (
          <button
            key={seg.value}
            ref={(el) => {
              buttonsRef.current[idx] = el;
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => {
              fireRipple(idx);
              onSelect(seg.value);
            }}
            data-rippling={ripplingIndex === idx ? "true" : undefined}
            className="scifi-tab-ripple flex-1"
            style={{
              minHeight: "44px",
              background: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "var(--bg)" : "var(--ink-dim)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "inherit",
              transition: "background var(--motion-tap, 100ms ease-out)",
            }}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
