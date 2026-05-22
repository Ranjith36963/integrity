"use client";
// DraggableTimelineBlock — M6: wraps TimelineBlock in a motion.div with drag="y".
// The wrapper owns the drag lifecycle: lift haptic, snapToSlot, overlap detection
// via post-dispatch readback (plan baseline), snap-back animation, and a11y announce.
// Block re-time uses motion.div + drag="y" (not Reorder.Group) — SG-m6-05.
// dragControls delegates from handle → Framer motion (AC #3).

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useDragControls, useReducedMotion } from "motion/react";
import type { RefObject } from "react";
import type { Block, Category } from "@/lib/types";
import { useEditMode } from "./EditModeProvider";
import { TimelineBlock } from "./TimelineBlock";
import { haptics } from "@/lib/haptics";
import { snapToSlot, shiftEnd } from "@/lib/snapToSlot";
import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

interface Props {
  block: Block;
  categories: Category[];
  /** True when the M5 delete-confirmation modal is open — drag suppressed. */
  modalOpen: boolean;
  /** Called with (blockId, newStart, newEnd) when a valid drop commits. */
  onReorderRequest: (
    blockId: string,
    newStart: string,
    newEnd: string | null,
  ) => void;
  /** Optional announce callback for a11y live region. */
  onAnnounce?: (message: string) => void;
  /** Ref to the timeline scroll container for dragConstraints. */
  dragConstraintsRef: RefObject<HTMLElement | null>;
  // Pass-through props for TimelineBlock
  onAddBrick?: (parentBlockId: string) => void;
  onTickToggle?: (brickId: string) => void;
  onUnitsOpenSheet?: (brickId: string) => void;
  onRequestDeleteBlock?: (blockId: string) => void;
  onRequestDeleteBrick?: (brickId: string) => void;
  onReorderBrickInBlock?: (
    blockId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  /** M7b: when true, threads isActive={true} to inner <TimelineBlock>.
   * Default false — byte-identical to pre-M7b when omitted. */
  isActive?: boolean;
}

export function DraggableTimelineBlock({
  block,
  categories,
  modalOpen,
  onReorderRequest,
  onAnnounce,
  dragConstraintsRef,
  onAddBrick,
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBlock,
  onRequestDeleteBrick,
  onReorderBrickInBlock,
  isActive = false,
}: Props) {
  const { editMode } = useEditMode();
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  // Snapshot editMode at drag-start so in-flight gesture completes even if mode flips
  const wasEditModeRef = useRef(editMode);

  // Post-dispatch readback via React state:
  // dropSeq increments after each onReorderRequest dispatch so useEffect can run.
  // pendingNewStartRef holds the expected new start until the effect clears it.
  const [dropSeq, setDropSeq] = useState(0);
  const pendingNewStartRef = useRef<string | null>(null);

  // Stable refs so closures don't capture stale values
  const onAnnounceRef = useRef(onAnnounce);
  useEffect(() => {
    onAnnounceRef.current = onAnnounce;
  });
  const blockNameRef = useRef(block.name);
  useEffect(() => {
    blockNameRef.current = block.name;
  });

  // Post-dispatch readback effect: runs after React flushes following setDropSeq.
  // By the time this effect runs, the parent may have re-rendered (acceptance) or not (rejection).
  // This effect runs AFTER all React renders triggered by the same act() flush,
  // so block.start here reflects the most up-to-date value.
  useEffect(() => {
    if (dropSeq === 0 || pendingNewStartRef.current === null) return;
    const pending = pendingNewStartRef.current;
    pendingNewStartRef.current = null; // consume

    if (block.start === pending) {
      // Accepted: parent re-rendered with new block.start → successful-commit haptic
      haptics.light();
    } else {
      // Rejected: block.start unchanged (reducer returned state unchanged) → rejection path
      haptics.medium();
      onAnnounceRef.current?.(
        `Cannot move ${blockNameRef.current} — overlaps another block`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only react to dropSeq changes to avoid spurious re-runs on block.start transitions
  }, [dropSeq]);

  // drag="y" only when Edit Mode is on AND modal is not open
  const dragEnabled = editMode && !modalOpen;

  const whileDragProps =
    !prefersReducedMotion && dragEnabled
      ? {
          scale: 1.02,
          boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
          zIndex: 5,
        }
      : {};

  const handleDragStart = useCallback(() => {
    wasEditModeRef.current = editMode;
    // AC #4: lift haptic fires on drag start
    haptics.light();
  }, [editMode]);

  const handleDragEnd = useCallback(
    (_e: unknown, info: { point: { y: number } }) => {
      // Only commit if the drag was started in Edit Mode (C-m6-011: in-flight drag completes)
      if (!wasEditModeRef.current) return;

      // Compute pixel offset relative to the timeline scroll container.
      // In production: containerTop = scrollRef.getBoundingClientRect().top,
      //                scrollOffset  = scrollRef.scrollTop
      // In JSDOM tests: both are 0 (no layout), so info.point.y maps directly to timeline px.
      const containerEl = dragConstraintsRef.current;
      const containerTop = containerEl
        ? containerEl.getBoundingClientRect().top
        : 0;
      const scrollOffset = containerEl ? containerEl.scrollTop : 0;
      const offsetPx = info.point.y - containerTop + scrollOffset;

      // Snap to 30-minute grid
      const newStart = snapToSlot(offsetPx, HOUR_HEIGHT_PX);

      // Same-slot guard: no dispatch, no haptic, no announce (C-m6-009)
      if (newStart === block.start) return;

      // Compute new end preserving block duration (null = open-ended)
      const newEnd = shiftEnd(block.start, block.end ?? null, newStart);

      // Set pending state for post-dispatch readback
      pendingNewStartRef.current = newStart;

      // Dispatch to parent (reducer may accept or reject)
      onReorderRequest(block.id, newStart, newEnd);

      // Increment dropSeq: triggers the useEffect for post-dispatch readback.
      // React will flush both this state update and any parent re-render (from the
      // reducer accepting) in the same batch, so the useEffect sees the final block.start.
      setDropSeq((s) => s + 1);
    },
    [block.id, block.start, block.end, dragConstraintsRef, onReorderRequest],
  );

  return (
    <motion.div
      data-testid="draggable-timeline-block"
      drag={dragEnabled ? "y" : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={dragConstraintsRef}
      dragMomentum={false}
      whileDrag={whileDragProps}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 220, damping: 22 }
      }
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TimelineBlock
        block={block}
        categories={categories}
        dragControls={dragControls}
        onReorderRequest={onReorderRequest}
        onAddBrick={onAddBrick}
        onTickToggle={onTickToggle}
        onUnitsOpenSheet={onUnitsOpenSheet}
        onRequestDeleteBlock={onRequestDeleteBlock}
        onRequestDeleteBrick={onRequestDeleteBrick}
        onReorderBrickInBlock={onReorderBrickInBlock}
        isActive={isActive}
      />
    </motion.div>
  );
}
