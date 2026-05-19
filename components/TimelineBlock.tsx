"use client";
// TimelineBlock — M5: Edit Mode affordances added.
// - M4a features preserved: absolute position, height, category dot, time range,
//   fade-in, scaffold left-bar, tap-to-expand, BrickChip list, Add brick button.
// - M4a: onTickToggle prop; useCrossUpEffect; bloom visual.
// - M5: consumes useEditMode(). Unlocked: jiggle (suppressed under reduced-motion),
//   always-visible × delete button (ADR-008, ≥44px). Tap-to-expand suppressed
//   in Edit Mode (SG-m5-05). New onRequestDeleteBlock prop.

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus, X } from "lucide-react";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { fmtRange, blockPct } from "@/lib/dharma";
import { useCrossUpEffect } from "@/lib/celebrations";
import { haptics } from "@/lib/haptics";
import { playChime } from "@/lib/audio";
import { springConfigs } from "@/lib/motion";
import { BrickChip } from "./BrickChip";
import { useEditMode } from "./EditModeProvider";

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
}

export function TimelineBlock({
  block,
  categories,
  onAddBrick,
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBlock,
  onRequestDeleteBrick,
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

  // M4a: block-100% cross-up — fires bloom + chime + success haptic once per crossing
  const fireBlockComplete = useCallback(() => {
    haptics.success();
    playChime();
    setBloomKey((k) => k + 1);
  }, []);

  useCrossUpEffect(pct, 100, fireBlockComplete);

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
          border: "1px solid var(--card-edge)",
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
              {block.bricks.length > 0 && (
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
                        onTickToggle={onTickToggle}
                        onUnitsOpenSheet={onUnitsOpenSheet}
                        onRequestDeleteBrick={onRequestDeleteBrick}
                      />
                    </li>
                  ))}
                </ul>
              )}

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
      </motion.div>
    </AnimatePresence>
  );
}
