"use client";
// DayCompleteCard — M7d new component (plan.md § Components > DayCompleteCard).
// PRM-only "Day complete." text card. Renders for 2000ms under PRM when active.
// Renders null when active===false (gating is controlled by the parent).
// Semantic: role="status" + aria-live="polite" for a single polite AT announcement.
// Visual: fixed center-screen, pointer-events:none, z-index:50 (matches Fireworks layer).
// Reduced-motion: CSS keyframe (day-complete-fade) fades out over 400ms at 1600ms in.

interface Props {
  active: boolean;
}

export function DayCompleteCard({ active }: Props) {
  if (!active) return null;

  return (
    <div
      data-testid="day-complete-card"
      role="status"
      aria-live="polite"
      className="day-complete-card"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-24)",
          color: "var(--ink)",
          textAlign: "center",
          padding: "24px 32px",
          background: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--card-edge)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        Day complete.
      </div>
    </div>
  );
}
