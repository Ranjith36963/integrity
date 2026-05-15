"use client";
// BlueprintBar — re-authored for M3 (plan.md § Components — Day Blueprint bar):
// - M2 features preserved: colored segments by category, NOW pin, empty-outline fallback
// - M3 NEW: segment opacity = 0.3 + (blockPct/100 × 0.7), clamped [0.3, 1.0]
// - Uncategorized blocks (categoryId=null) excluded per SG-m2-02
// - Blocks without end excluded from duration aggregation
// - Segments sorted by categoryId for determinism

import type { Block, Category } from "@/lib/types";
import { toMin, blockPct } from "@/lib/dharma";

interface Props {
  blocks: Block[];
  categories: Category[];
  now: string;
}

/**
 * Aggregates categorized block durations and average blockPct by categoryId.
 * Returns entries sorted by categoryId for determinism.
 * Excludes: categoryId===null, blocks without end (from duration).
 * Exported for U-m2-011 unit test.
 */
export function aggregateCategoryMinutes(
  blocks: Block[],
): { categoryId: string; minutes: number; avgBlockPct: number }[] {
  const minuteMap = new Map<string, number>();
  const pctSumMap = new Map<string, number>();
  const pctCountMap = new Map<string, number>();

  for (const b of blocks) {
    if (b.categoryId === null) continue;
    // Accumulate blockPct for all categorized blocks (with or without end)
    pctSumMap.set(
      b.categoryId,
      (pctSumMap.get(b.categoryId) ?? 0) + blockPct(b),
    );
    pctCountMap.set(b.categoryId, (pctCountMap.get(b.categoryId) ?? 0) + 1);
    // Only accumulate minutes for blocks with a valid end
    if (b.end === undefined) continue;
    const mins = toMin(b.end) - toMin(b.start);
    if (mins <= 0) continue;
    minuteMap.set(b.categoryId, (minuteMap.get(b.categoryId) ?? 0) + mins);
  }

  // Build result from categoryIds that have at least some duration (minute entries)
  return [...minuteMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([categoryId, minutes]) => {
      const pctCount = pctCountMap.get(categoryId) ?? 1;
      const pctSum = pctSumMap.get(categoryId) ?? 0;
      const avgBlockPct = pctSum / pctCount;
      return { categoryId, minutes, avgBlockPct };
    });
}

export function BlueprintBar({ blocks, categories, now }: Props) {
  const aggregated = aggregateCategoryMinutes(blocks);
  const totalMinutes = aggregated.reduce((s, e) => s + e.minutes, 0);
  const hasSegments = aggregated.length > 0 && totalMinutes > 0;

  // NOW pin position: time-based fallback when no categorized blocks
  const nowPct = (toMin(now) / (24 * 60)) * 100;

  const faintGrid = {
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.02)), " +
      "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px), " +
      "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px), " +
      "linear-gradient(to right, rgba(245,241,232,0.12) 1px, transparent 1px)",
    backgroundSize: "100% 100%, 25% 100%, 50% 100%, 75% 100%",
    backgroundPosition: "0 0, 25% 0, 50% 0, 75% 0",
    backgroundRepeat: "no-repeat" as const,
  };

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
          ...faintGrid,
        }}
      >
        <div className="flex h-full w-full">
          {hasSegments &&
            aggregated.map(({ categoryId, minutes, avgBlockPct }) => {
              const cat = categories.find((c) => c.id === categoryId);
              const pct = (minutes / totalMinutes) * 100;
              // M3: opacity = 0.3 + (blockPct/100 × 0.7), clamped [0.3, 1.0]
              const opacity = Math.min(
                1.0,
                Math.max(0.3, 0.3 + (avgBlockPct / 100) * 0.7),
              );
              return (
                <div
                  key={categoryId}
                  data-testid="blueprint-segment"
                  data-category-id={categoryId}
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    background: cat?.color ?? "var(--accent)",
                    opacity,
                  }}
                />
              );
            })}
        </div>

        {/* NOW pin */}
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
      {/* Legend hidden in M2 — M3 reintroduces with real per-category percentages */}
    </section>
  );
}
