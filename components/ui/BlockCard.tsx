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

  return (
    <div
      data-testid="block-card"
      data-status={status}
      className={cn(
        "relative flex gap-[--sp-12] rounded-xl border border-[--ink-dim]/10 bg-[--bg-elev] p-[--sp-12]",
        status === "current" && "now-glow",
        status === "past" && "opacity-55",
        className,
      )}
      onClick={!editMode ? onClick : undefined}
    >
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
      <div className="flex min-w-0 flex-1 flex-col gap-[--sp-4]">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            {/* Category dot */}
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: catColor }}
              aria-hidden="true"
            />
            <span className="truncate font-mono text-[--fs-14] text-[--ink]">
              {name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[--fs-12] text-[--ink-dim]">
              {Math.round(pct)}%
            </span>
            {/* Delete affordance — always visible in edit mode per ADR-008 */}
            {editMode && (
              <button
                type="button"
                aria-label="Delete block"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[--ink-dim] hover:text-[--ink]"
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
        <span className="font-mono text-[--fs-12] text-[--ink-dim]">
          {start}–{end}
        </span>
        {children}
      </div>
    </div>
  );
}
