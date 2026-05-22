"use client";
// NowTag — M7b: tiny presentational badge for the "active right now" block.
// Renders a <span data-testid="now-tag" aria-label="Now" /> with NOW text.
// Positioned absolute top-right inside its parent (the TimelineBlock outer div).
// Non-interactive: pointer-events none, no tabindex, no onClick.
// Design: var(--accent) fill, var(--bg) text — WCAG AAA ~14.7:1 (SG-m7b-02).
// Pure: no state, no effect, no clock. Used only when isActive === true.

interface Props {
  className?: string;
}

export function NowTag({ className }: Props) {
  return (
    <span
      data-testid="now-tag"
      aria-label="Now"
      className={className}
      style={{
        position: "absolute",
        top: "4px",
        right: "4px",
        background: "var(--accent)",
        color: "var(--bg)",
        borderRadius: "4px",
        padding: "2px 6px",
        font: `600 var(--fs-10) var(--font-ui)`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      NOW
    </span>
  );
}
