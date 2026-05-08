"use client";
// TimelineBlock — re-authored for M3 (plan.md § Components — Block card on the timeline):
// - M2 features preserved: absolute position, height, category dot, time range, fade-in
// - M3 NEW: scaffold left-bar (fill = blockPct), tap-to-expand, BrickChip list, + Add brick button
// - M3 NEW: onAddBrick prop (optional for backward compat)
// - M3 NEW: aria-expanded on card; role="list" on bricks list
// - data-testid="scaffold-fill" for test assertions

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { fmtRange, blockPct } from "@/lib/dharma";
import { useReducedMotion } from "motion/react";
import { BrickChip } from "./BrickChip";

interface Props {
  block: Block;
  categories: Category[];
  onAddBrick?: (parentBlockId: string) => void;
}

export function TimelineBlock({ block, categories, onAddBrick }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  const variants = {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0 },
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
