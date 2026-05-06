"use client";
// NowLine — presentational amber horizontal rule for the current time.
// Position: absolute within the Timeline hour-grid column.
// Uses HOUR_HEIGHT_PX from lib/timeOffset (single source of truth — never hardcode the px value).
// No transition on top: NowLine always snaps to new position.
// When useNow() ticks every 60s, the top value updates immediately (ADR-023).
// Honors prefers-reduced-motion by design: no transition defined at all.
// SG-m1-10: z-index set to z-10 to stay above the EmptyState card (z-0).

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
      className="pointer-events-none absolute left-0 right-0 z-10 h-[1px]"
      style={{
        top: `${topPx}px`,
        // SG-m1-10: z-10 keeps now-line above EmptyState card (z-0).
        // Comment: no `transition` here — top snaps instantly (plan.md § Decisions: NowLine absolute positioning).
        background: "var(--accent)",
        transform: "translateY(-1px)",
        boxShadow: "0 0 4px var(--accent)",
      }}
    />
  );
}
