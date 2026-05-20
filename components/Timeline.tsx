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
// - M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).
// - M7a NEW: optional stagger?: boolean prop (default false).
//   When true, wraps the items.map(…) render block in a Framer Motion stagger container
//   (display: contents, pointer-events: none) so it does not disturb absolute-positioned cards.
//   Chrome (hour-grid, SlotTapTargets, NowLine) is NOT wrapped — those layers stay at z=0/1/3.
//   When false (default), renders byte-identical to pre-M7a.

import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import type { Block, Brick, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { usePrefersReducedMotion } from "@/lib/reducedMotion";
import { staggerForCount } from "@/lib/motion";
import { NowLine } from "./NowLine";
import { EmptyBlocks } from "./EmptyBlocks";
import { SlotTapTargets } from "./SlotTapTargets";
import { TimelineBlock } from "./TimelineBlock";
import { DraggableTimelineBlock } from "./DraggableTimelineBlock";
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
  /** M4f: called with brickId when a units chip is tapped (opens UnitsEntrySheet). */
  onUnitsOpenSheet?: (brickId: string) => void;
  /** M4d: when true, the EmptyBlocks card is suppressed even if items is empty.
   * Used by BuildingClient when selectTrayBricks(state).length > 0 (AC #10/#11 — loose bricks
   * fill the day so the block-empty state is no longer relevant). */
  hasLooseBricks?: boolean;
  /** M5: called with blockId when a block × is tapped. */
  onRequestDeleteBlock?: (blockId: string) => void;
  /** M5: called with brickId when a brick × is tapped. */
  onRequestDeleteBrick?: (brickId: string) => void;
  /** M6: called with (blockId, newStart, newEnd) when a valid block drag commits. */
  onReorderRequest?: (
    blockId: string,
    newStart: string,
    newEnd: string | null,
  ) => void;
  /** M6: called with an a11y announce string by DraggableTimelineBlock. */
  onAnnounce?: (message: string) => void;
  /** M6: called with (blockId, fromIndex, toIndex) when a brick drag commits. */
  onReorderBrickInBlock?: (
    blockId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  /** M6: true when the M5 delete-confirmation modal is open — threads to DraggableTimelineBlock. */
  modalOpen?: boolean;
  /** M7a: when true, wraps the items.map render block in a Framer Motion stagger container.
   * When false (default), renders byte-identical to pre-M7a. Chrome layers not wrapped. */
  stagger?: boolean;
}

export function Timeline({
  items,
  categories,
  now,
  onSlotTap,
  onAddBrick,
  onTickToggle,
  onUnitsOpenSheet,
  hasLooseBricks = false,
  onRequestDeleteBlock,
  onRequestDeleteBrick,
  onReorderRequest,
  onAnnounce,
  onReorderBrickInBlock,
  modalOpen = false,
  stagger = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // M7a: stagger variants — built only when stagger===true
  const prefersReducedMotion = usePrefersReducedMotion();
  const staggerDelay = staggerForCount(items.length);
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

  // Auto-scroll on mount so NowLine is vertically centered in the visible viewport.
  useEffect(() => {
    if (!scrollRef.current) return;
    const containerHeight = scrollRef.current.clientHeight;
    const offsetPx = timeToOffsetPx(now, HOUR_HEIGHT_PX);
    const targetTop = Math.max(0, offsetPx - containerHeight / 2);
    scrollRef.current.scrollTop = targetTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHeight = 24 * HOUR_HEIGHT_PX;
  const labelColumnWidth = 56;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-x-hidden overflow-y-auto"
      style={{
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
            backgroundImage: `repeating-linear-gradient(to bottom, var(--grid) 0px, var(--grid) 1px, transparent 1px, transparent ${HOUR_HEIGHT_PX}px)`,
            position: "relative",
          }}
        >
          {/* Layer 1: Slot tap targets (z=1, above hour-grid, below blocks) */}
          <SlotTapTargets onSlotTap={onSlotTap} />

          {/* Layer 2: Timeline items — block cards OR timed loose brick cards */}
          {/* M7a: when stagger===true, wrap the items list in a Framer Motion stagger container.
               The wrapper uses display:contents so it does not disturb absolute-positioned cards.
               pointer-events:none on the wrapper; children re-enable their own pointer events.
               Chrome (SlotTapTargets, NowLine) is NOT wrapped — stays outside this container.
               When stagger===false (default), renders byte-identical to pre-M7a. */}
          {/* M6: when onReorderRequest is provided (Edit Mode), render DraggableTimelineBlock */}
          {stagger && containerVariants ? (
            <motion.div
              data-testid="timeline-stagger-container"
              style={{ display: "contents" }}
              variants={containerVariants}
              initial="initial"
              animate="animate"
            >
              {items.map((item) =>
                item.kind === "block" ? (
                  onReorderRequest ? (
                    <DraggableTimelineBlock
                      key={item.block.id}
                      block={item.block}
                      categories={categories}
                      modalOpen={modalOpen}
                      onReorderRequest={onReorderRequest}
                      onAnnounce={onAnnounce}
                      dragConstraintsRef={scrollRef}
                      onAddBrick={onAddBrick}
                      onTickToggle={onTickToggle}
                      onUnitsOpenSheet={onUnitsOpenSheet}
                      onRequestDeleteBlock={onRequestDeleteBlock}
                      onRequestDeleteBrick={onRequestDeleteBrick}
                      onReorderBrickInBlock={onReorderBrickInBlock}
                    />
                  ) : (
                    <motion.div key={item.block.id} variants={childVariants}>
                      <TimelineBlock
                        block={item.block}
                        categories={categories}
                        onAddBrick={onAddBrick}
                        onTickToggle={onTickToggle}
                        onUnitsOpenSheet={onUnitsOpenSheet}
                        onRequestDeleteBlock={onRequestDeleteBlock}
                        onRequestDeleteBrick={onRequestDeleteBrick}
                      />
                    </motion.div>
                  )
                ) : (
                  <motion.div key={item.brick.id} variants={childVariants}>
                    <TimedLooseBrickCard
                      brick={item.brick}
                      categories={categories}
                      onTickToggle={onTickToggle}
                      onUnitsOpenSheet={onUnitsOpenSheet}
                      onRequestDeleteBrick={onRequestDeleteBrick}
                    />
                  </motion.div>
                ),
              )}
              {/* EmptyBlocks is also inside the stagger container when stagger=true */}
              {items.length === 0 && !hasLooseBricks && (
                <motion.div variants={childVariants}>
                  <div
                    className="absolute inset-x-4 z-0"
                    style={{ top: "20px" }}
                  >
                    <EmptyBlocks />
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <>
              {items.map((item) =>
                item.kind === "block" ? (
                  onReorderRequest ? (
                    <DraggableTimelineBlock
                      key={item.block.id}
                      block={item.block}
                      categories={categories}
                      modalOpen={modalOpen}
                      onReorderRequest={onReorderRequest}
                      onAnnounce={onAnnounce}
                      dragConstraintsRef={scrollRef}
                      onAddBrick={onAddBrick}
                      onTickToggle={onTickToggle}
                      onUnitsOpenSheet={onUnitsOpenSheet}
                      onRequestDeleteBlock={onRequestDeleteBlock}
                      onRequestDeleteBrick={onRequestDeleteBrick}
                      onReorderBrickInBlock={onReorderBrickInBlock}
                    />
                  ) : (
                    <TimelineBlock
                      key={item.block.id}
                      block={item.block}
                      categories={categories}
                      onAddBrick={onAddBrick}
                      onTickToggle={onTickToggle}
                      onUnitsOpenSheet={onUnitsOpenSheet}
                      onRequestDeleteBlock={onRequestDeleteBlock}
                      onRequestDeleteBrick={onRequestDeleteBrick}
                    />
                  )
                ) : (
                  <TimedLooseBrickCard
                    key={item.brick.id}
                    brick={item.brick}
                    categories={categories}
                    onTickToggle={onTickToggle}
                    onUnitsOpenSheet={onUnitsOpenSheet}
                    onRequestDeleteBrick={onRequestDeleteBrick}
                  />
                ),
              )}

              {/* Layer 2 (centered): EmptyBlocks card — only when items empty AND no loose bricks */}
              {items.length === 0 && !hasLooseBricks && (
                <div className="absolute inset-x-4 z-0" style={{ top: "20px" }}>
                  <EmptyBlocks />
                </div>
              )}
            </>
          )}

          {/* Layer 3: NowLine — always on top */}
          <NowLine now={now} />
        </div>
      </div>
    </div>
  );
}
