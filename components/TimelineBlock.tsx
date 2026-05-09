"use client";
// TimelineBlock — M4a extended from M3:
// - M3 features preserved: absolute position, height, category dot, time range,
//   fade-in, scaffold left-bar, tap-to-expand, BrickChip list, Add brick button.
// - M4a NEW: onTickToggle prop threaded to each BrickChip.
// - M4a NEW: useCrossUpEffect wired for block-100% bloom + chime + haptics.success.
// - M4a NEW: bloom visual (motion.div) keyed on bloomKey; suppressed under reduced-motion.

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { fmtRange, blockPct } from "@/lib/dharma";
import { useCrossUpEffect } from "@/lib/celebrations";
import { haptics } from "@/lib/haptics";
import { playChime } from "@/lib/audio";
import { springConfigs } from "@/lib/motion";
import { BrickChip } from "./BrickChip";

interface Props {
  block: Block;
  categories: Category[];
  onAddBrick?: (parentBlockId: string) => void;
  onTickToggle?: (brickId: string) => void;
  onGoalLog?: (brickId: string, delta: 1 | -1) => void;
  /** M4c: current running timer brick id for computing running=true on time chips */
  runningTimerBrickId?: string | null;
  /** M4c: tap a time chip to start/stop */
  onTimerToggle?: (brickId: string) => void;
  /** M4c: long-press a time chip to open manual-entry sheet */
  onTimerOpenSheet?: (brickId: string) => void;
}

export function TimelineBlock({
  block,
  categories,
  onAddBrick,
  onTickToggle,
  onGoalLog,
  runningTimerBrickId = null,
  onTimerToggle,
  onTimerOpenSheet,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [bloomKey, setBloomKey] = useState(0);
  const prefersReducedMotion = useReducedMotion();

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
    setExpanded((e) => !e);
  }

  function handleAddBrickClick(e: React.MouseEvent) {
    e.stopPropagation();
    onAddBrick?.(block.id);
  }

  return (
    <AnimatePresence>
      <motion.div
        data-component="timeline-block"
        role="article"
        aria-expanded={expanded}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        variants={prefersReducedMotion ? undefined : variants}
        transition={
          prefersReducedMotion
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
          cursor: "pointer",
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
                        onGoalLog={onGoalLog}
                        running={runningTimerBrickId === brick.id}
                        onTimerToggle={onTimerToggle}
                        onTimerOpenSheet={onTimerOpenSheet}
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
