"use client";
// TimelineBlock — M6: drag handle affordance added.
// - M5 features preserved: jiggle, × delete button, edit mode tap suppression.
// - M6: GripVertical drag handle (≥44px, ADR-031) in Edit Mode (ADR-008).
//   New props: dragControls (DragControls from Framer) + onReorderRequest.

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { DragControls } from "motion/react";
import { Plus, X, GripVertical } from "lucide-react";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { fmtRange, blockPct } from "@/lib/dharma";
import { useBlockCelebrationOnce, celebrate } from "@/lib/celebrations";
import { springConfigs } from "@/lib/motion";
import { BrickChip } from "./BrickChip";
import { BlockBrickReorderGroup } from "./BlockBrickReorderGroup";
import { useEditMode } from "./EditModeProvider";
import { NowTag } from "./NowTag";

interface Props {
  block: Block;
  categories: Category[];
  onAddBrick?: (parentBlockId: string) => void;
  onTickToggle?: (brickId: string) => void;
  /** M4f: called with brickId when a units chip is tapped (opens UnitsEntrySheet). */
  onUnitsOpenSheet?: (brickId: string) => void;
  /** M5: called with blockId when the × delete button is tapped. */
  onRequestDeleteBlock?: (blockId: string) => void;
  /** M5: called with brickId when a brick × is tapped. */
  onRequestDeleteBrick?: (brickId: string) => void;
  /** M6: DragControls instance from DraggableTimelineBlock — used by the handle. */
  dragControls?: DragControls;
  /** M6: called with (blockId, newStart, newEnd) when a valid drop commits. */
  onReorderRequest?: (
    blockId: string,
    newStart: string,
    newEnd: string | null,
  ) => void;
  /** M6: called with (blockId, fromIndex, toIndex) when a brick drag commits. */
  onReorderBrickInBlock?: (
    blockId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  /** M7b: when true, adds is-active CSS class (pulsing outline) + renders NowTag badge.
   * Computed by Timeline.tsx via activeBlockId(visibleBlockList, now).
   * Default false — byte-identical to pre-M7b when omitted. */
  isActive?: boolean;
  /** Log mode: when true, renders a neon green border signalling this block has unlogged bricks. */
  logHighlight?: boolean;
}

export function TimelineBlock({
  block,
  categories,
  onAddBrick,
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBlock,
  onRequestDeleteBrick,
  dragControls,
  onReorderRequest: _onReorderRequest,
  onReorderBrickInBlock,
  isActive = false,
  logHighlight = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [bloomKey, setBloomKey] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const { editMode } = useEditMode();

  const category =
    block.categoryId !== null
      ? (categories.find((c) => c.id === block.categoryId) ?? null)
      : null;

  const top = timeToOffsetPx(block.start, HOUR_HEIGHT_PX);
  const height =
    block.end !== undefined
      ? timeToOffsetPx(block.end, HOUR_HEIGHT_PX) - top
      : HOUR_HEIGHT_PX / 12;

  const timeLabel = fmtRange(block);
  const pct = blockPct(block);
  const scaffoldColor = category?.color ?? "var(--text-dim)";

  // M7d: replace useCrossUpEffect with useBlockCelebrationOnce (once per block per mount,
  // never re-fires on 100→99→100 oscillations — resolves SG-m7d-02).
  // celebrate("block", { withAudio: true }) routes haptics + Web Audio chime through the shim.
  // M7f: playChime now live (Web AudioContext, 880 Hz single tone). Direct playChime import removed.
  const shouldBloom = useBlockCelebrationOnce(block.id, pct);

  // Consume the shouldBloom signal: celebrate + bump bloomKey when the first crossing fires.
  // The eslint-disable is justified: shouldBloom is a one-shot signal per mount from
  // useBlockCelebrationOnce (never oscillates between true/true). The setBloomKey call
  // increments a counter that drives a keyed overlay — no cascading render loop possible
  // (plan.md M7d SG-m7d-02: "once per block per mount" semantics; same pattern as
  // Fireworks.tsx's eslint-disable for setParticles inside useEffect, M4a precedent).
  useEffect(() => {
    if (!shouldBloom) return;
    celebrate("block", { withAudio: true });
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- M7d plan.md SG-m7d-02: one-shot shouldBloom signal, no cascade — same precedent as Fireworks.tsx (M4a). */
    setBloomKey((k) => k + 1);
  }, [shouldBloom]);

  const variants = {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0 },
  };

  const bloomVariants = {
    initial: { scale: 1, opacity: 0 },
    animate: { scale: 1.04, opacity: 1 },
    exit: { scale: 1, opacity: 0 },
  };

  function handleCardClick() {
    // M5: tap-to-expand is suppressed in Edit Mode (SG-m5-05)
    if (editMode) return;
    setExpanded((e) => !e);
  }

  function handleAddBrickClick(e: React.MouseEvent) {
    e.stopPropagation();
    onAddBrick?.(block.id);
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onRequestDeleteBlock?.(block.id);
  }

  // M5: jiggle is applied via data-edit-mode when editMode=true and not reduced-motion
  const jiggleActive = editMode && !prefersReducedMotion;

  return (
    <AnimatePresence>
      <motion.div
        data-component="timeline-block"
        data-edit-mode={editMode ? "true" : undefined}
        data-reduced={prefersReducedMotion ? "true" : undefined}
        role="article"
        aria-expanded={expanded}
        className={isActive ? "is-active" : undefined}
        initial={prefersReducedMotion ? false : "hidden"}
        animate={
          jiggleActive
            ? { rotate: [0, -0.18, 0.18, -0.18, 0], y: [0, 0.4, -0.4, 0.4, 0] }
            : "visible"
        }
        variants={prefersReducedMotion ? undefined : variants}
        transition={
          jiggleActive
            ? { repeat: Infinity, duration: 0.45, ease: "easeInOut" }
            : prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: "easeOut" }
        }
        onClick={handleCardClick}
        style={{
          position: "absolute",
          top: `${top}px`,
          height: expanded ? "auto" : `${height}px`,
          minHeight: `${height}px`,
          left: "4px",
          right: "4px",
          overflow: "hidden",
          borderRadius: "6px",
          border: logHighlight
            ? "1.5px solid #4ade80"
            : "1px solid var(--card-edge)",
          boxShadow: logHighlight
            ? "0 0 10px 2px rgba(74,222,128,0.3), inset 0 0 0 1px rgba(74,222,128,0.1)"
            : undefined,
          background: "var(--card)",
          display: "flex",
          alignItems: "flex-start",
          padding: "4px 6px",
          gap: "4px",
          cursor: editMode ? "default" : "pointer",
          zIndex: 2,
        }}
      >
        {/* Scaffold left-bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            background: "var(--surface-2)",
            overflow: "hidden",
          }}
        >
          <div
            data-testid="scaffold-fill"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${pct}%`,
              background: scaffoldColor,
              transition: prefersReducedMotion
                ? "none"
                : "height 600ms ease-in-out",
            }}
          />
        </div>

        {/* M4a: bloom overlay — only renders when not reduced-motion and bloomKey > 0 */}
        {!prefersReducedMotion && bloomKey > 0 && (
          <motion.div
            key={bloomKey}
            data-testid="bloom-overlay"
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={bloomVariants}
            transition={springConfigs.bloom}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "6px",
              background: category?.color
                ? `${category.color}33`
                : "var(--accent)33",
              pointerEvents: "none",
              zIndex: 3,
            }}
          />
        )}
        {/* M7d: PRM bloom fallback — 600 ms opacity flash via @keyframes blockBloomReduced.
            Renders ONLY under prefers-reduced-motion (when spring motion.div is suppressed).
            Keyed by bloomKey so each fire remounts and replays the animation. */}
        {prefersReducedMotion && bloomKey > 0 && (
          <div
            key={bloomKey}
            data-testid="bloom-overlay-reduced"
            aria-hidden="true"
            className="bloom-reduced"
            style={{
              position: "absolute",
              inset: "0px",
              borderRadius: "6px",
              background: category?.color
                ? `${category.color}33`
                : "var(--accent)33",
              pointerEvents: "none",
              zIndex: 3,
            }}
          />
        )}

        {/* M5: always-visible × delete button — only in Edit Mode (ADR-008, ≥44px) */}
        {editMode && (
          <button
            type="button"
            aria-label={`Delete block ${block.name}`}
            onClick={handleDeleteClick}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              display: "grid",
              placeItems: "center",
              width: "44px",
              minHeight: "44px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 4,
            }}
          >
            <X size={14} color="var(--ink-dim)" />
          </button>
        )}

        {/* M6: GripVertical drag handle — only in Edit Mode; handle is the only drag origin (ADR-008, ADR-031 ≥44px) */}
        {editMode && dragControls && (
          <button
            type="button"
            aria-label={`Reorder block ${block.name}`}
            data-drag-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              dragControls.start(e);
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              display: "grid",
              placeItems: "center",
              width: "44px",
              minHeight: "44px",
              background: "transparent",
              border: "none",
              cursor: "grab",
              zIndex: 4,
            }}
          >
            <GripVertical size={14} color="var(--ink-dim)" aria-hidden="true" />
          </button>
        )}

        {/* Category color dot — 8px circle, only when categoryId !== null */}
        {category !== null && (
          <span
            data-testid="category-dot"
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              marginTop: "3px",
              marginLeft: "4px", // offset for scaffold bar
              background: category.color,
            }}
          />
        )}

        <div style={{ minWidth: 0, flex: 1, marginLeft: category ? 0 : "4px" }}>
          {/* Title: single-line ellipsis per plan.md § Edge cases */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14)",
              color: "var(--ink)",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {block.name}
          </div>
          {/* Time range label */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-10)",
              color: "var(--ink-dim)",
              marginTop: "1px",
            }}
          >
            {timeLabel}
          </div>

          {/* Expanded view: bricks list + + Add brick button */}
          {expanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ marginTop: "8px" }}
            >
              {block.bricks.length > 0 &&
                /* M6: use BlockBrickReorderGroup when editMode=true AND bricks.length > 1;
                   otherwise plain <ul> (Locked mode OR single-brick block — C-m6-013). */
                (editMode &&
                onReorderBrickInBlock &&
                block.bricks.length > 1 ? (
                  <BlockBrickReorderGroup
                    block={block}
                    categories={categories}
                    onReorderBrickInBlock={onReorderBrickInBlock}
                    onTickToggle={onTickToggle}
                    onUnitsOpenSheet={onUnitsOpenSheet}
                    onRequestDeleteBrick={onRequestDeleteBrick}
                  />
                ) : (
                  <ul
                    role="list"
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "8px",
                    }}
                  >
                    {block.bricks.map((brick) => (
                      <li key={brick.id} role="listitem">
                        <BrickChip
                          brick={brick}
                          categories={categories}
                          size="md"
                          dragHandle={editMode}
                          dragControls={editMode ? dragControls : undefined}
                          onTickToggle={onTickToggle}
                          onUnitsOpenSheet={onUnitsOpenSheet}
                          onRequestDeleteBrick={onRequestDeleteBrick}
                          logHighlight={logHighlight}
                        />
                      </li>
                    ))}
                  </ul>
                ))}

              <button
                type="button"
                aria-label="Add brick"
                onClick={handleAddBrickClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  width: "100%",
                  minHeight: "44px",
                  borderRadius: "6px",
                  border: "1px dashed var(--ink-dim)",
                  background: "transparent",
                  color: "var(--ink-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                }}
              >
                <Plus size={12} />
                Add brick
              </button>
            </div>
          )}
        </div>

        {/* M7b: NOW badge — top-right, absolute, only when isActive=true.
            Anchored to the outer motion.div (same node regardless of expanded state).
            CSS suppresses the pulse keyframe under prefers-reduced-motion (AC #8). */}
        {isActive && <NowTag />}
      </motion.div>
    </AnimatePresence>
  );
}
