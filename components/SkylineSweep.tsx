"use client";
/**
 * components/SkylineSweep.tsx — Sci-fi Phase 4c.
 *
 * Day-complete cinematic. When the user crosses 0 → 100% for the first
 * time today, a horizontal amber beam scans across the timeline from
 * left to right, leaving a fading glow trail. The beam is the
 * "construction-complete scanner" — the moment the architect's day is
 * finished.
 *
 * Runs as an overlay sibling to Fireworks (already exists from M4a).
 * Driven by the same `active` prop pattern. Self-contained CSS; the
 * parent's celebration timer handles the 1700ms window.
 *
 * Respects prefers-reduced-motion via the existing PRM block in
 * globals.css (.scifi-skyline-beam).
 */

interface Props {
  /** When true, the sweep is rendered + playing. */
  active: boolean;
}

export function SkylineSweep({ active }: Props): React.JSX.Element | null {
  if (!active) return null;
  return (
    <div
      data-testid="skyline-sweep"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 38, // above timeline (10), below sheet (50)
        overflow: "hidden",
      }}
    >
      {/* Vertical beam scanning horizontally — implemented as a wide
          gradient bar swept across the viewport via translateX. */}
      <div
        className="scifi-skyline-beam"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "180px",
          left: "-180px",
          background:
            "linear-gradient(90deg, transparent 0%, var(--accent-glow) 35%, var(--accent) 50%, var(--accent-glow) 65%, transparent 100%)",
          filter: "blur(6px)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}
