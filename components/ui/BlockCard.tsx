"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Category } from "./types";

const CAT_COLOR: Record<Category, string> = {
  health: "var(--cat-health)",
  mind: "var(--cat-mind)",
  career: "var(--cat-career)",
  passive: "var(--cat-passive)",
};

export interface BlockCardProps {
  name: string;
  start: string; // HH:MM
  end: string; // HH:MM
  category: Category;
  status: "past" | "current" | "future";
  pct: number; // 0..100
  onClick?(): void;
  editMode?: boolean;
  onDelete?(): void;
  children?: React.ReactNode;
  className?: string;
}

export function BlockCard({
  name,
  start,
  end,
  category,
  status,
  pct,
  onClick,
  editMode,
  onDelete,
  children,
  className,
}: BlockCardProps) {
  const catColor = CAT_COLOR[category];

  // NEW-4 fix: stable DOM identity — always render a <div> root. When
  // interactive, an absolute-positioned <button> overlay (sibling, not
  // wrapper) captures clicks + keyboard activation. Toggling editMode no
  // longer unmounts/remounts the root, preserving focus, CSS transitions,
  // and screen-reader context. The overlay also avoids button-in-button
  // (the inner delete button stays valid HTML in edit mode) and avoids
  // overriding the body's accessible name (children remain announceable).
  const isInteractive = !editMode && typeof onClick === "function";

  return (
    <div
      data-testid="block-card"
      data-status={status}
      className={cn(
        "relative flex gap-[var(--sp-12)] rounded-xl border border-[var(--ink-dim)]/10 bg-[var(--bg-elev)] p-[var(--sp-12)]",
        status === "current" && "now-glow",
        status === "past" && "opacity-55",
        className,
      )}
    >
      {/* Interactive overlay: covers the card except where higher z-index
          children sit (e.g., the delete button in edit mode is z-20). */}
      {isInteractive && (
        <button
          type="button"
          aria-label={`Open block: ${name}, ${start} to ${end}, ${Math.round(pct)}%`}
          onClick={onClick}
          className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
        />
      )}

      {/* Scaffold bar (left accent) */}
      <div
        aria-hidden="true"
        className="relative w-2 shrink-0 overflow-hidden rounded-sm"
        style={{ background: `${catColor}22` }}
      >
        <div
          className="scaffold__fill absolute inset-x-0 bottom-0"
          style={{
            height: `${Math.min(100, pct)}%`,
            background: catColor,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--sp-4)]">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            {/* Category dot */}
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: catColor }}
              aria-hidden="true"
            />
            <span className="truncate font-mono text-[var(--fs-14)] text-[var(--ink)]">
              {name}
            </span>
          </div>
          <div className="relative z-20 flex items-center gap-2">
            <span className="font-mono text-[var(--fs-12)] text-[var(--ink-dim)]">
              {Math.round(pct)}%
            </span>
            {/* Delete affordance — always visible in edit mode per ADR-008.
                z-20 keeps it above the interactive overlay (z-10). */}
            {editMode && (
              <button
                type="button"
                aria-label="Delete block"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--ink-dim)] hover:text-[var(--ink)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        {/* Time range */}
        <span className="font-mono text-[var(--fs-12)] text-[var(--ink-dim)]">
          {start}–{end}
        </span>
        {children}
      </div>
    </div>
  );
}
