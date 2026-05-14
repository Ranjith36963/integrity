"use client";
// TimedLooseBrickCard — NEW in M4e (plan.md § Components — <TimedLooseBrickCard>).
// Renders a timed loose brick as an absolutely-positioned card on the timeline.
// - outer wrapper: data-testid="timed-loose-brick", position:absolute,
//   top = timeToOffsetPx(brick.start), height = timeToOffsetPx(end) - timeToOffsetPx(start)
//   border: dashed 1.5px in category color (or var(--ink-dim) when uncategorized)
// - inner: <BrickChip> which is fully interactive (onTickToggle/onGoalLog pass-through)
//
// ADR-031: chip touch target preserved inside the card.
// hasDuration === true is a precondition (caller should only pass timed bricks).

import type { Brick, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { BrickChip } from "@/components/BrickChip";

interface Props {
  brick: Brick;
  categories: Category[];
  /** Called with brick.id when a tick brick chip is tapped. */
  onTickToggle?: (brickId: string) => void;
  /** Called with (brickId, delta) when a goal brick stepper is tapped. */
  onGoalLog?: (brickId: string, delta: 1 | -1) => void;
  /** M4c timer props (for time bricks nested inside the card). */
  running?: boolean;
  onTimerToggle?: (brickId: string) => void;
  onTimerOpenSheet?: (brickId: string) => void;
}

function resolveBorderColor(brick: Brick, categories: Category[]): string {
  if (brick.categoryId === null) return "var(--ink-dim)";
  const cat = categories.find((c) => c.id === brick.categoryId);
  return cat?.color ?? "var(--ink-dim)";
}

export function TimedLooseBrickCard({
  brick,
  categories,
  onTickToggle,
  onGoalLog,
  running = false,
  onTimerToggle,
  onTimerOpenSheet,
}: Props) {
  const start = brick.hasDuration ? (brick.start ?? "") : "";
  const end = brick.hasDuration ? (brick.end ?? "") : "";

  const topPx = timeToOffsetPx(start, HOUR_HEIGHT_PX);
  const endPx = timeToOffsetPx(end, HOUR_HEIGHT_PX);
  const heightPx = endPx - topPx;

  const borderColor = resolveBorderColor(brick, categories);

  return (
    <div
      data-testid="timed-loose-brick"
      style={{
        position: "absolute",
        top: `${topPx}px`,
        height: `${heightPx}px`,
        left: 0,
        right: 0,
        borderStyle: "dashed",
        borderWidth: "1.5px",
        borderColor,
        borderRadius: "12px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <BrickChip
        brick={brick}
        categories={categories}
        size="sm"
        onTickToggle={onTickToggle}
        onGoalLog={onGoalLog}
        running={running}
        onTimerToggle={onTimerToggle}
        onTimerOpenSheet={onTimerOpenSheet}
      />
    </div>
  );
}
