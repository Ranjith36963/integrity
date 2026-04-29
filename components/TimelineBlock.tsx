"use client";
import { X } from "lucide-react";
import { Block, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/types";
import { blockPct } from "@/lib/dharma";
import { Brick as BrickComponent } from "./Brick";
import { Scaffold } from "./Scaffold";
import { EmptyBricks } from "./EmptyBricks";
import { useEditMode } from "./EditModeProvider";
import type { Brick } from "@/lib/types";

interface Props {
  block: Block;
  status: "past" | "current" | "future";
  onLogBrick: (brickIndex: number, updated: Brick) => void;
}

export function TimelineBlock({ block, status, onLogBrick }: Props) {
  const { editMode } = useEditMode();
  const pct = Math.round(blockPct(block));
  const color = CATEGORY_COLOR[block.category];
  const isCurrent = status === "current";
  const isPast = status === "past";

  return (
    <div
      data-testid="timeline-block"
      data-status={status}
      className="flex gap-3 rounded-lg p-3 transition-colors"
      style={{
        background: isCurrent ? "rgba(251,191,36,0.06)" : "var(--card)",
        border: `1px solid ${
          isCurrent ? "rgba(251,191,36,0.35)" : "var(--card-edge)"
        }`,
        opacity: isPast ? 0.55 : 1,
      }}
    >
      <div className="flex w-10 shrink-0 flex-col items-center pt-1">
        <div
          className="text-[10px] tracking-[0.06em]"
          style={{ color: "var(--ink-dim)" }}
        >
          {block.start}
        </div>
        <div className="my-1.5">
          <Scaffold pct={pct} category={block.category} height={48} />
        </div>
        <div
          className="text-[9px] tracking-[0.06em]"
          style={{ color: "var(--ink-faint)" }}
        >
          {block.end}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className="truncate text-[14px] leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {block.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-[2px]"
                style={{ background: color }}
              />
              <span
                className="text-[9px] tracking-[0.16em] uppercase"
                style={{ color: "var(--ink-faint)" }}
              >
                {CATEGORY_LABEL[block.category].toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <div className="text-right">
              <div
                className="font-serif-italic text-[26px] leading-none"
                style={{ color: isPast ? "var(--ink-dim)" : "var(--ink)" }}
              >
                {pct}
                <span
                  className="ml-0.5 align-top text-[12px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  %
                </span>
              </div>
            </div>
            {editMode && (
              <button
                aria-label="Delete block"
                className="grid h-6 w-6 place-items-center rounded"
                style={{ color: "var(--ink-faint)" }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {block.bricks.length === 0 ? (
            <EmptyBricks />
          ) : (
            block.bricks.map((b, i) => (
              <BrickComponent
                key={`${block.start}-${b.name}-${b.kind}`}
                brick={b}
                category={block.category}
                index={i}
                onLog={(updated) => onLogBrick(i, updated)}
                editMode={editMode}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
