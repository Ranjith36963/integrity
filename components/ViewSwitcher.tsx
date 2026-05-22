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
 *   - all four segments: role="tab" aria-selected (no segment is disabled)
 *
 * Design tokens: --accent (active bg), --bg (active text), --ink-dim (inactive)
 * ADR-031: segments ≥ 44px tall.
 */

type ViewSwitcherProps = {
  view: "day" | "month" | "week" | "year";
  onSelect: (view: "day" | "month" | "week" | "year") => void;
};

type Segment = { label: string; value: "day" | "week" | "month" | "year" };

const SEGMENTS: Segment[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export function ViewSwitcher({ view, onSelect }: ViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className="flex w-full"
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-12)",
      }}
    >
      {SEGMENTS.map((seg) => {
        // All four segments are live — Day, Week, Month, Year
        const isActive = view === seg.value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(seg.value)}
            className="flex-1"
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
