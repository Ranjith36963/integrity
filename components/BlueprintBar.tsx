"use client";
// BlueprintBar — re-authored for M3 (plan.md § Components — Day Blueprint bar):
// - M2 features preserved: colored segments by category, NOW pin, empty-outline fallback
// - M3 NEW: segment opacity = 0.3 + (blockPct/100 × 0.7), clamped [0.3, 1.0]
// - Uncategorized blocks (categoryId=null) excluded per SG-m2-02
// - Blocks without end excluded from duration aggregation
// - Segments sorted by categoryId for determinism
// - M7a NEW: optional stagger?: boolean prop (default false).
//   When true, wraps the segments in a Framer Motion stagger container.
//   When false (default), renders byte-identical to pre-M7a.

import { motion } from "motion/react";
import type { Block, Category } from "@/lib/types";
import { blockPct, duration } from "@/lib/dharma";
import { minutesFromDayStart, DEFAULT_DAY_START } from "@/lib/dayWindow";
import { usePrefersReducedMotion } from "@/lib/reducedMotion";
import { staggerForCount } from "@/lib/motion";

interface Props {
  blocks: Block[];
  categories: Category[];
  now: string;
  /** M7a: when true, wraps the segment list in a Framer Motion stagger container.
   * When false (default), renders byte-identical to pre-M7a (no motion.div, no variants). */
  stagger?: boolean;
  /** Day anchor "HH:MM" — positions the NOW pin. Default 04:00. */
  dayStart?: string;
}

/**
 * Aggregates categorized block durations and average blockPct by categoryId.
 * Returns entries sorted by categoryId for determinism.
 * Excludes: categoryId===null, blocks without end (from duration).
 * Exported for U-m2-011 unit test.
 */
export function aggregateCategoryMinutes(
  blocks: Block[],
  // R7-ROOT-M2-16: optional category list used for stable, user-meaningful
  // sort order (by name, then by id as tie-breaker). When undefined, falls
  // back to id-only sort — the pre-R7 behavior — so existing test fixtures
  // (which use string ids like "c1", "c2") keep passing without change.
  categories?: { id: string; name: string }[],
): { categoryId: string; minutes: number; avgBlockPct: number }[] {
  const minuteMap = new Map<string, number>();
  const pctSumMap = new Map<string, number>();
  const pctCountMap = new Map<string, number>();

  for (const b of blocks) {
    if (b.categoryId === null) continue;
    // R7-ROOT-M2-13: only count blocks WITH an end in both width AND opacity
    // accumulators. Pre-R7 the avgBlockPct denominator included no-end blocks
    // (which always have blockPct = 0), pulling the average down to half its
    // true value for any category that had even one no-end block. Width
    // already excluded them; opacity now matches. The bug only surfaced once
    // M3 introduced real blockPct > 0 — by then the visual was wrong.
    if (b.end === undefined) continue;
    // Wrap-aware duration: an overnight block (end < start, e.g. Sleep
    // 22:00→04:00) has a positive duration around the day anchor. Raw
    // subtraction would give a negative value and silently drop it.
    const mins = duration(b);
    if (mins <= 0) continue;
    minuteMap.set(b.categoryId, (minuteMap.get(b.categoryId) ?? 0) + mins);
    pctSumMap.set(
      b.categoryId,
      (pctSumMap.get(b.categoryId) ?? 0) + blockPct(b),
    );
    pctCountMap.set(b.categoryId, (pctCountMap.get(b.categoryId) ?? 0) + 1);
  }

  // Build result from categoryIds that have at least some duration (minute entries).
  // R7-ROOT-M2-16: name-aware sort when categories are provided.
  const nameById = new Map(
    (categories ?? []).map((c) => [c.id, c.name] as const),
  );
  return [...minuteMap.entries()]
    .sort(([idA], [idB]) => {
      const nameA = nameById.get(idA);
      const nameB = nameById.get(idB);
      if (nameA && nameB) {
        const cmp = nameA.localeCompare(nameB);
        if (cmp !== 0) return cmp;
      }
      return idA.localeCompare(idB);
    })
    .map(([categoryId, minutes]) => {
      const pctCount = pctCountMap.get(categoryId) ?? 1;
      const pctSum = pctSumMap.get(categoryId) ?? 0;
      const avgBlockPct = pctSum / pctCount;
      return { categoryId, minutes, avgBlockPct };
    });
}

export function BlueprintBar({
  blocks,
  categories,
  now,
  stagger = false,
  dayStart = DEFAULT_DAY_START,
}: Props) {
  const aggregated = aggregateCategoryMinutes(blocks, categories);
  const totalMinutes = aggregated.reduce((s, e) => s + e.minutes, 0);
  const hasSegments = aggregated.length > 0 && totalMinutes > 0;

  // M7a: reduced motion — collapse stagger variants to instant (AC #7)
  const prefersReducedMotion = usePrefersReducedMotion();

  // M7a: stagger variant shapes — only built when stagger===true
  const staggerDelay = staggerForCount(aggregated.length);
  const containerVariants = stagger
    ? {
        initial: {},
        animate: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
          },
        },
      }
    : undefined;

  const childVariants = stagger
    ? {
        initial: { opacity: 0, y: 4 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: prefersReducedMotion ? 0 : 0.18,
            ease: "easeOut" as const,
          },
        },
      }
    : undefined;

  // NOW pin position: time-based fallback when no categorized blocks
  // Anchor the NOW pin to the user's wake-to-wake day so the blueprint pin and
  // the timeline now-line stay aligned at whatever dayStart the user chose.
  const nowPct = (minutesFromDayStart(now, dayStart) / (24 * 60)) * 100;

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
          className="hud-tick text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--ink-dim)" }}
        >
          day blueprint
        </div>
        {/* R2-SG-5: aria-hidden so SR users don't hear the time again — the
            canonical "Now HH:MM" landmark is NowLine in the Timeline
            (per ADR-051). Sighted users still see the visible label. */}
        <div
          aria-hidden="true"
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
        {/* M7a: when stagger===true, wrap in motion.div container with stagger variants;
             when stagger===false (default), render byte-identical to pre-M7a */}
        {stagger && containerVariants ? (
          <motion.div
            className="flex h-full w-full"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            {hasSegments &&
              aggregated.map(({ categoryId, minutes, avgBlockPct }) => {
                const cat = categories.find((c) => c.id === categoryId);
                const pct = (minutes / totalMinutes) * 100;
                const opacity = Math.min(
                  1.0,
                  Math.max(0.3, 0.3 + (avgBlockPct / 100) * 0.7),
                );
                return (
                  <motion.div
                    key={categoryId}
                    data-testid="blueprint-segment"
                    data-category-id={categoryId}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: cat?.color ?? "var(--accent)",
                      opacity,
                    }}
                    variants={childVariants}
                  />
                );
              })}
          </motion.div>
        ) : (
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
        )}

        {/* NOW pin — purely decorative.
            R1-P1-1: dropped role="img" + aria-label="Now ${now}". The Timeline's
            NowLine exposes the same accessible name; having BOTH made screen
            readers announce "Now 12:34, image" twice when traversing landmarks.
            BlueprintBar's section aria-label ("Day blueprint") + the visible
            "now" text already give sighted users the cue; SR users still hear
            the now-time via NowLine. */}
        <div
          data-testid="now-pin"
          aria-hidden="true"
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
