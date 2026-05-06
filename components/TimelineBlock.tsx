"use client";
// TimelineBlock — re-authored for M2 (plan.md § Components — Block card on the timeline):
// - Consumes new Block schema: categoryId, recurrence, bricks[]
// - Positioned absolutely via timeToOffsetPx (HOUR_HEIGHT_PX from lib/timeOffset)
// - Height ∝ duration, or HOUR_HEIGHT_PX/12 if no end (SG-m2-05)
// - Category color dot (8px circle) when categoryId !== null; absent when null
// - Title: single-line ellipsis CSS per plan.md § Edge cases
// - Time range: fmtRange from lib/dharma (SG-m2-10)
// - onClick: explicitly no-op (M4 wires FLIP expand)
// - Stagger fade-in via motion.div; collapses to instant on prefers-reduced-motion
// - data-component="timeline-block" for Playwright selectors

import { motion, AnimatePresence } from "motion/react";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { fmtRange } from "@/lib/dharma";
import { useReducedMotion } from "motion/react";

interface Props {
  block: Block;
  categories: Category[];
}

export function TimelineBlock({ block, categories }: Props) {
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

  const variants = {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      <motion.div
        data-component="timeline-block"
        role="article"
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        variants={prefersReducedMotion ? undefined : variants}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.18, ease: "easeOut" }
        }
        style={{
          position: "absolute",
          top: `${top}px`,
          height: `${height}px`,
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
          cursor: "default",
          zIndex: 2,
        }}
        onClick={() => {
          // no-op in M2 — M4 wires FLIP expand
        }}
      >
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
              background: category.color,
            }}
          />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
