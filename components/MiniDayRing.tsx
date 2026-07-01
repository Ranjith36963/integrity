"use client";
// MiniDayRing — a small 24h clock ring showing one day's blocks as colored arcs.
// The building block for the Week / Month period views ("the day, but tiny").
// Reuses lib/ring.ts geometry. No hour ticks / now-hand (too small); just the
// faint band + colored arcs, with an optional dimming for empty/other days.

import type { Block, Category } from "@/lib/types";
import { DEFAULT_DAY_START } from "@/lib/dayWindow";
import { blockArc, annularSectorPath } from "@/lib/ring";
import { blockPct } from "@/lib/dharma";

interface Props {
  blocks: Block[];
  categories: Category[];
  dayStart?: string;
  /** Outer diameter in px. */
  size?: number;
  /** Dim the ring (e.g. future / missed days). */
  dimmed?: boolean;
}

export function MiniDayRing({
  blocks,
  categories,
  dayStart = DEFAULT_DAY_START,
  size = 48,
  dimmed = false,
}: Props) {
  const C = size / 2;
  const rOuter = size / 2 - 1.5;
  const rInner = size * 0.3;

  const colorFor = (categoryId: string | null): string =>
    categoryId === null
      ? "var(--ink-dim)"
      : (categories.find((c) => c.id === categoryId)?.color ??
        "var(--ink-dim)");

  const arcs = blocks
    .filter((b) => b.end !== undefined)
    .map((b) => ({ block: b, ...blockArc(b.start, b.end, dayStart) }))
    .filter((a) => a.endAngle - a.startAngle > 0.01);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ opacity: dimmed ? 0.4 : 1, display: "block" }}
    >
      {/* Faint band */}
      <circle
        cx={C}
        cy={C}
        r={(rOuter + rInner) / 2}
        fill="none"
        stroke="var(--card-edge)"
        strokeWidth={rOuter - rInner}
        opacity={0.4}
      />
      {/* Block arcs */}
      {arcs.map(({ block, startAngle, endAngle }) => {
        const col = colorFor(block.categoryId);
        const p = blockPct(block);
        return (
          <path
            key={block.id}
            d={annularSectorPath(C, C, rInner, rOuter, startAngle, endAngle)}
            fill={col}
            fillOpacity={Math.min(1, 0.4 + (p / 100) * 0.5)}
          />
        );
      })}
    </svg>
  );
}
