"use client";
// Timeline — re-authored for M2 (plan.md § Components — Timeline):
// - Layered structure: hour-grid (z=0) → SlotTapTargets (z=1) → TimelineBlock cards (z=2) → NowLine (z=3)
// - EmptyBlocks card when items.length === 0 AND !hasLooseBricks
// - Accepts new props: categories: Category[], onSlotTap: (hour: number) => void
// - Auto-scroll-to-now from M1 preserved
// - NowLine always on top (z=3)
// - M1 hour-grid CSS gradient unchanged
// - M4e: `blocks: Block[]` prop replaced by `items: TimelineItem[]` union (blocks + timed loose bricks)
//        Renders TimelineBlock for kind="block", TimedLooseBrickCard for kind="brick".

import { useRef, useEffect } from "react";
import type { Block, Brick, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { NowLine } from "./NowLine";
import { EmptyBlocks } from "./EmptyBlocks";
import { SlotTapTargets } from "./SlotTapTargets";
import { TimelineBlock } from "./TimelineBlock";
import { TimedLooseBrickCard } from "./TimedLooseBrickCard";

export type TimelineItem =
  | { kind: "block"; block: Block }
  | { kind: "brick"; brick: Brick };

const HOURS = Array.from(
  { length: 24 },
  (_, i) => String(i).padStart(2, "0") + ":00",
);

interface Props {
  items: TimelineItem[];
  categories: Category[];
  now: string;
  onSlotTap: (hour: number) => void;
  onAddBrick?: (parentBlockId: string) => void;
  onTickToggle?: (brickId: string) => void;
  onGoalLog?: (brickId: string, delta: 1 | -1) => void;
  /** M4d: when true, the EmptyBlocks card is suppressed even if items is empty.
   * Used by BuildingClient when selectTrayBricks(state).length > 0 (AC #10/#11 — loose bricks
   * fill the day so the block-empty state is no longer relevant). */
  hasLooseBricks?: boolean;
  /** M4c: current running timer brick id threaded to TimelineBlock → BrickChip */
  runningTimerBrickId?: string | null;
  /** M4c: tap a time chip to start/stop */
  onTimerToggle?: (brickId: string) => void;
  /** M4c: long-press a time chip to open manual-entry sheet */
  onTimerOpenSheet?: (brickId: string) => void;
}

export function Timeline({
  items,
  categories,
  now,
  onSlotTap,
  onAddBrick,
  onTickToggle,
  onGoalLog,
  hasLooseBricks = false,
  runningTimerBrickId = null,
  onTimerToggle,
  onTimerOpenSheet,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on mount so NowLine is vertically centered in the visible viewport.
  // Runs once after first paint (SSR-safe: useEffect never runs on the server).
  // Uses behavior:"auto" (instant — no jarring smooth scroll on mount).
  useEffect(() => {
    if (!scrollRef.current) return;
    const containerHeight = scrollRef.current.clientHeight;
    const offsetPx = timeToOffsetPx(now, HOUR_HEIGHT_PX);
    const targetTop = Math.max(0, offsetPx - containerHeight / 2);
    scrollRef.current.scrollTop = targetTop;
    // Intentionally runs only once on mount — not on every `now` tick.
    // The user may have scrolled away intentionally; we don't re-center.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHeight = 24 * HOUR_HEIGHT_PX;
  const labelColumnWidth = 56;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-x-hidden overflow-y-auto"
      style={{
        // Reserve space for BottomBar (~96px) and above chrome.
        maxHeight: "calc(100dvh - 360px)",
      }}
    >
      <div
        data-testid="hour-grid"
        className="relative"
        style={{ height: `${totalHeight}px` }}
      >
        {/* Left column: hour labels */}
        <div
          className="absolute top-0 bottom-0 left-0 flex flex-col"
          style={{ width: `${labelColumnWidth}px` }}
        >
          {HOURS.map((label) => (
            <div
              key={label}
              data-testid="hour-label"
              className="flex-shrink-0 px-2 pt-1 text-[10px] select-none"
              style={{
                height: `${HOUR_HEIGHT_PX}px`,
                color: "var(--ink-dim)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Right column: schedule region with layered structure */}
        <div
          className="absolute top-0 right-0 bottom-0"
          style={{
            left: `${labelColumnWidth}px`,
            // Hour-grid lines via CSS gradient (SG-m1-03 choice: CSS gradient).
            // Each row is HOUR_HEIGHT_PX tall; hairline at top of each row.
            backgroundImage: `repeating-linear-gradient(to bottom, var(--grid) 0px, var(--grid) 1px, transparent 1px, transparent ${HOUR_HEIGHT_PX}px)`,
            position: "relative",
          }}
        >
          {/* Layer 1: Slot tap targets (z=1, above hour-grid, below blocks) */}
          <SlotTapTargets onSlotTap={onSlotTap} />

          {/* Layer 2: Timeline items — block cards OR timed loose brick cards */}
          {items.map((item) =>
            item.kind === "block" ? (
              <TimelineBlock
                key={item.block.id}
                block={item.block}
                categories={categories}
                onAddBrick={onAddBrick}
                onTickToggle={onTickToggle}
                onGoalLog={onGoalLog}
                runningTimerBrickId={runningTimerBrickId}
                onTimerToggle={onTimerToggle}
                onTimerOpenSheet={onTimerOpenSheet}
              />
            ) : (
              <TimedLooseBrickCard
                key={item.brick.id}
                brick={item.brick}
                categories={categories}
                onTickToggle={onTickToggle}
                onGoalLog={onGoalLog}
                running={runningTimerBrickId === item.brick.id}
                onTimerToggle={onTimerToggle}
                onTimerOpenSheet={onTimerOpenSheet}
              />
            ),
          )}

          {/* Layer 2 (centered): EmptyBlocks card — only when items empty AND no loose bricks */}
          {items.length === 0 && !hasLooseBricks && (
            <div className="absolute inset-x-4 z-0" style={{ top: "20px" }}>
              <EmptyBlocks />
            </div>
          )}

          {/* Layer 3: NowLine — always on top */}
          <NowLine now={now} />
        </div>
      </div>
    </div>
  );
}
