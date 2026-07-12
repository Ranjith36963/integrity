"use client";
// DayRing — Phase 2: the day drawn as a 24-hour clock ring.
// Wake anchor at the top (12 o'clock); time sweeps clockwise. Each block is a
// colored arc; an overnight block (Sleep 22:00→04:00) is ONE arc that closes
// the loop. A now-hand points at the current time; the centre shows day % or
// the tapped block's name + time.

import { useState } from "react";
import type { Block, Category } from "@/lib/types";
import { blockPct } from "@/lib/dharma";
import { DEFAULT_DAY_START } from "@/lib/dayWindow";
import {
  timeToAngle,
  pointOnCircle,
  annularSectorPath,
  blockArc,
} from "@/lib/ring";

interface Props {
  blocks: Block[];
  categories: Category[];
  now: string;
  /** Effective wake-to-wake anchor "HH:MM". */
  dayStart?: string;
  /** Day-complete percentage for the centre readout. */
  pct: number;
}

const SIZE = 260;
const C = SIZE / 2; // centre
const R_OUTER = 112;
const R_INNER = 74;

function hhmmForTick(dayStart: string, hourIndex: number): string {
  const startHour = Math.floor(
    (parseInt(dayStart.split(":")[0] ?? "0", 10) || 0) + hourIndex,
  );
  return String(startHour % 24).padStart(2, "0") + ":00";
}

export function DayRing({
  blocks,
  categories,
  now,
  dayStart = DEFAULT_DAY_START,
  pct,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const colorFor = (categoryId: string | null): string => {
    if (categoryId === null) return "var(--ink-dim)";
    return (
      categories.find((c) => c.id === categoryId)?.color ?? "var(--ink-dim)"
    );
  };

  // Blocks with an end render as arcs; sort so the selected one paints last (on top).
  const arcs = blocks
    .filter((b) => b.end !== undefined)
    .map((b) => {
      const { startAngle, endAngle } = blockArc(b.start, b.end, dayStart);
      return { block: b, startAngle, endAngle };
    })
    .filter((a) => a.endAngle - a.startAngle > 0.01);

  const nowAngle = timeToAngle(now, dayStart);
  const handTip = pointOnCircle(C, C, R_OUTER + 6, nowAngle);
  const handBase = pointOnCircle(C, C, R_INNER - 10, nowAngle);

  const selected = arcs.find((a) => a.block.id === selectedId)?.block ?? null;

  return (
    <section
      aria-label="Day ring"
      data-testid="day-ring"
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "8px 0 16px",
      }}
    >
      <svg
        viewBox={`-16 -16 ${SIZE + 32} ${SIZE + 32}`}
        width="100%"
        style={{ maxWidth: "320px" }}
        // role="group", not "img": the ring contains tappable block arcs
        // (role="button" paths). An image may not have focusable descendants
        // (axe nested-interactive, serious) — a group may.
        role="group"
        aria-label={`Day ring, ${Math.round(pct)}% complete, now ${now}`}
      >
        {/* Sci-fi: faint amber core glow behind the ring */}
        <defs>
          <radialGradient id="dayring-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.14} />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity={0.03} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R_OUTER} fill="url(#dayring-core)" />

        {/* Sci-fi: two counter-rotating dashed orbits behind the band
            ("rotations in the back") */}
        <circle
          className="dayring-spin-cw"
          cx={C}
          cy={C}
          r={R_OUTER + 6}
          fill="none"
          stroke="var(--ink-dim)"
          strokeWidth={1}
          strokeDasharray="2 10"
          opacity={0.5}
        />
        <circle
          className="dayring-spin-ccw"
          cx={C}
          cy={C}
          r={R_INNER - 8}
          fill="none"
          stroke="var(--ink-dim)"
          strokeWidth={1}
          strokeDasharray="1 8"
          opacity={0.4}
        />

        {/* Base ring band */}
        <circle
          cx={C}
          cy={C}
          r={(R_OUTER + R_INNER) / 2}
          fill="none"
          stroke="var(--card-edge)"
          strokeWidth={R_OUTER - R_INNER}
          opacity={0.35}
        />

        {/* Sci-fi: amber orbital data-dashes on the outer edge (echoes the Hero ring) */}
        <circle
          className="scifi-orbital-dashes"
          cx={C}
          cy={C}
          r={R_OUTER + 2}
          fill="none"
          stroke="var(--accent-glow, var(--accent))"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="3 13"
          opacity={0.7}
        />

        {/* Hour ticks (24) + cardinal labels every 6h */}
        {Array.from({ length: 24 }, (_, i) => {
          const ang = i * 15;
          const outer = pointOnCircle(C, C, R_OUTER + 2, ang);
          const inner = pointOnCircle(
            C,
            C,
            R_OUTER - (i % 6 === 0 ? 8 : 4),
            ang,
          );
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--ink-dim)"
              strokeWidth={i % 6 === 0 ? 1.5 : 0.75}
              opacity={i % 6 === 0 ? 0.7 : 0.4}
            />
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const ang = h * 15;
          const p = pointOnCircle(C, C, R_OUTER + 16, ang);
          return (
            <text
              key={h}
              x={p.x}
              y={p.y}
              fill="var(--ink-dim)"
              fontSize="9"
              fontFamily="var(--font-ui)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {hhmmForTick(dayStart, h)}
            </text>
          );
        })}

        {/* Block arcs */}
        {arcs.map(({ block, startAngle, endAngle }) => {
          const p = blockPct(block);
          const isSel = block.id === selectedId;
          const col = colorFor(block.categoryId);
          return (
            <path
              key={block.id}
              d={annularSectorPath(
                C,
                C,
                R_INNER,
                R_OUTER,
                startAngle,
                endAngle,
              )}
              fill={col}
              fillOpacity={Math.min(1, 0.35 + (p / 100) * 0.55)}
              stroke={isSel ? "var(--ink)" : "none"}
              strokeWidth={isSel ? 2 : 0}
              role="button"
              tabIndex={0}
              aria-label={`${block.name}, ${block.start} to ${block.end}, ${Math.round(p)}% complete`}
              style={{
                cursor: "pointer",
                // Sci-fi: each arc emits a soft glow in its own colour.
                filter: `drop-shadow(0 0 ${isSel ? 5 : 2.5}px ${col})`,
              }}
              onClick={() =>
                setSelectedId((cur) => (cur === block.id ? null : block.id))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId((cur) => (cur === block.id ? null : block.id));
                }
              }}
            />
          );
        })}

        {/* Now-hand — glowing, with a pulsing halo at the tip */}
        <circle
          className="dayring-tip-pulse"
          cx={handTip.x}
          cy={handTip.y}
          r={6}
          fill="var(--accent)"
          opacity={0.5}
        />
        <line
          data-testid="ring-now-hand"
          x1={handBase.x}
          y1={handBase.y}
          x2={handTip.x}
          y2={handTip.y}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 3px var(--accent))" }}
        />
        <circle cx={handTip.x} cy={handTip.y} r={2.5} fill="var(--ink)" />
        <circle
          cx={C}
          cy={C}
          r={3}
          fill="var(--accent)"
          style={{ filter: "drop-shadow(0 0 3px var(--accent))" }}
        />

        {/* Centre readout */}
        {selected ? (
          <>
            <text
              x={C}
              y={C - 6}
              fill="var(--ink)"
              fontSize="14"
              fontFamily="var(--font-ui)"
              textAnchor="middle"
            >
              {selected.name.length > 16
                ? selected.name.slice(0, 15) + "…"
                : selected.name}
            </text>
            <text
              x={C}
              y={C + 12}
              fill="var(--ink-dim)"
              fontSize="11"
              fontFamily="var(--font-ui)"
              textAnchor="middle"
            >
              {selected.start}–{selected.end}
            </text>
          </>
        ) : (
          <>
            <text
              x={C}
              y={C - 2}
              fill="var(--ink)"
              fontSize="30"
              fontFamily="var(--font-serif, var(--font-ui))"
              textAnchor="middle"
              style={{
                filter:
                  "drop-shadow(0 0 6px var(--accent-glow, var(--accent)))",
              }}
            >
              {Math.round(pct)}%
            </text>
            <text
              x={C}
              y={C + 18}
              fill="var(--ink-dim)"
              fontSize="9"
              fontFamily="var(--font-ui)"
              letterSpacing="0.18em"
              textAnchor="middle"
            >
              DAY
            </text>
          </>
        )}
      </svg>
    </section>
  );
}
