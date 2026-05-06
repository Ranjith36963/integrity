"use client";
// BlueprintBar — re-authored for M1:
// - Empty-outline path: renders outlined container with faint CSS gradient grid (SG-m1-02)
// - Zero category segments when blocks.length === 0 (ADR-032/039)
// - Legend HIDDEN in M1 (hardcoded categories are the antipattern — ADR-032)
// - NOW pin uses time-based fallback when blocks.length === 0:
//   left% = (toMin(now) / (24*60)) * 100  (plan.md § Components — BlueprintBar)
// - Faint grid: CSS linear-gradient background with hairlines at 25%/50%/75% (SG-m1-02)

import { Block } from "@/lib/types";
import { toMin } from "@/lib/dharma";

interface Props {
  blocks: Block[];
  now: string;
}

export function BlueprintBar({ blocks, now }: Props) {
  // NOW pin position: time-based fallback when no blocks exist;
  // otherwise use block-layout-aware offset.
  // Comment: when blocks.length === 0, position pin at current time within 24h day
  // so users still see "where we are" in the day without any block data.
  const nowPct =
    blocks.length === 0
      ? (toMin(now) / (24 * 60)) * 100
      : (() => {
          const total = blocks.reduce(
            (s, b) => s + (toMin(b.end) - toMin(b.start)),
            0,
          );
          if (total === 0) return (toMin(now) / (24 * 60)) * 100;
          // dayOffset-based for non-empty blocks (mirrors original nowOffsetPct logic)
          const elapsed = toMin(now) - toMin("04:00");
          const offset = elapsed < 0 ? elapsed + 24 * 60 : elapsed;
          return (offset / total) * 100;
        })();

  return (
    <section aria-label="Day blueprint" className="px-5 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <div
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--ink-dim)" }}
        >
          day blueprint
        </div>
        <div
          className="text-[10px] tracking-[0.18em]"
          style={{ color: "var(--ink-dim)" }}
        >
          {now}
        </div>
      </div>
      <div
        className="relative h-9 overflow-hidden rounded-md border"
        data-testid="blueprint-bar-container"
        style={{
          borderColor: "var(--card-edge)",
          // Faint grid: CSS gradient with hairlines at 25%/50%/75% (SG-m1-02, plan.md § SG-m1-02)
          // Uses --ink-dim at 12% opacity. Cheaper than SVG/DOM nodes; reduced-motion safe.
          // Note: backgroundImage replaces background shorthand to avoid CSS shorthand reset.
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.02)), " +
            "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px), " +
            "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px), " +
            "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 25% 100%, 50% 100%, 75% 100%",
          backgroundPosition: "0 0, 25% 0, 50% 0, 75% 0",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex h-full w-full">
          {blocks.map((b) => {
            const bDuration = toMin(b.end) - toMin(b.start);
            const total = blocks.reduce(
              (s, blk) => s + (toMin(blk.end) - toMin(blk.start)),
              0,
            );
            const pct = total > 0 ? (bDuration / total) * 100 : 0;
            return (
              <div
                key={`${b.start}-${b.name}`}
                data-testid="blueprint-segment"
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: "var(--accent)",
                }}
                title={`${b.start}–${b.end} ${b.name}`}
              />
            );
          })}
        </div>
        <div
          data-testid="now-pin"
          role="img"
          aria-label={`Now ${now}`}
          className="absolute top-0 bottom-0"
          style={{ left: `${nowPct}%`, transform: "translateX(-50%)" }}
        >
          <div
            className="h-full w-[2px]"
            style={{
              background: "#fff",
              boxShadow: "0 0 8px rgba(255,255,255,0.7)",
            }}
          />
          <div
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
            style={{
              background: "#fff",
              boxShadow: "0 0 10px rgba(255,255,255,0.9)",
            }}
          />
        </div>
      </div>
      {/* Legend is hidden in M1: zero categories exist (ADR-032/039). Restored at M3. */}
    </section>
  );
}
