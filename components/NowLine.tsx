"use client";
// NowLine — presentational amber horizontal rule for the current time.
// Position: absolute within the Timeline hour-grid column.
// Uses HOUR_HEIGHT_PX from lib/timeOffset (single source of truth — never hardcode the px value).
// No transition on top: NowLine always snaps to new position.
// When useNow() ticks every 60s, the top value updates immediately (ADR-023).
// Honors prefers-reduced-motion by design: no transition defined at all.
// R1-NIT-3: z-10 keeps NowLine above the EmptyState card (z-0). Previous
// comment referenced "SG-m1-10" but tests.md never defined that ID; the
// rationale is the z-stack contract, not a spec line.

import { timeToOffsetPx, HOUR_HEIGHT_PX } from "@/lib/timeOffset";

interface Props {
  now: string;
  "data-testid"?: string;
}

export function NowLine({ now, "data-testid": testId = "now-line" }: Props) {
  const topPx = timeToOffsetPx(now, HOUR_HEIGHT_PX);

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={`Now ${now}`}
      className="pointer-events-none absolute right-0 left-0 z-10 h-[1px]"
      style={{
        top: `${topPx}px`,
        // z-10 keeps now-line above EmptyState card (z-0). No `transition`
        // here — top snaps instantly (plan.md § Decisions: NowLine absolute
        // positioning).
        background: "var(--accent)",
        transform: "translateY(-1px)",
        // M7b: larger halo — inner 6px + outer soft 12px at 0.45 alpha (SG-m7b-03).
        // Static (no keyframe) — the active-block pulse provides the temporal heartbeat.
        // Under prefers-reduced-motion this halo is unchanged (box-shadow is not motion).
        boxShadow: "0 0 6px var(--accent), 0 0 12px rgba(251, 191, 36, 0.45)",
      }}
    />
  );
}
