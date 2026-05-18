"use client";
/**
 * ViewSwitcher — M9c: Day·Week·Month·Year segmented control.
 * M9d: Week segment enabled (live: true). Year remains disabled.
 * Resolves SG-m9c-02, SG-m9c-05; AC #8 (M9d).
 *
 * Props: { view: "day" | "month" | "week"; onSelect: (view: "day" | "month" | "week") => void }
 *
 * Accessibility:
 *   - container: role="tablist" aria-label="Calendar view"
 *   - live segments (Day, Week, Month): role="tab" aria-selected
 *   - disabled segment (Year only): aria-disabled="true", disabled (out of tab order)
 *
 * Design tokens: --accent (active bg), --bg (active text), --ink-dim (inactive/disabled)
 * ADR-031: segments ≥ 44px tall.
 */

type ViewSwitcherProps = {
  view: "day" | "month" | "week";
  onSelect: (view: "day" | "month" | "week") => void;
};

type Segment =
  | { label: "Day"; value: "day"; live: true }
  | { label: "Week"; value: "week"; live: true }
  | { label: "Month"; value: "month"; live: true }
  | { label: "Year"; value: "year"; live: false };

const SEGMENTS: Segment[] = [
  { label: "Day", value: "day", live: true },
  { label: "Week", value: "week", live: true },
  { label: "Month", value: "month", live: true },
  { label: "Year", value: "year", live: false },
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
        if (!seg.live) {
          // Disabled segment — Year only (M9d: Week is now live)
          return (
            <button
              key={seg.value}
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              disabled
              type="button"
              className="flex-1"
              style={{
                minHeight: "44px",
                color: "var(--ink-dim)",
                opacity: 0.5,
                background: "transparent",
                border: "none",
                cursor: "not-allowed",
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
            >
              {seg.label}
            </button>
          );
        }

        // Live segment — Day, Week, or Month
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
