"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Category } from "./types";
import { Stepper } from "./Stepper";

const CAT_COLOR: Record<Category, string> = {
  health: "var(--cat-health)",
  mind: "var(--cat-mind)",
  career: "var(--cat-career)",
  passive: "var(--cat-passive)",
};

// Shared props across brick kinds
interface BrickChipBase {
  category: Category;
  editMode?: boolean;
  onDelete?(): void;
  className?: string;
}

export type TickBrickChipProps = BrickChipBase & {
  kind: "tick";
  name: string;
  done: boolean;
  onToggle?(): void;
};

export type GoalBrickChipProps = BrickChipBase & {
  kind: "goal";
  name: string;
  current: number;
  target: number;
  unit?: string;
  onCommit?(n: number): void;
};

export type TimeBrickChipProps = BrickChipBase & {
  kind: "time";
  name: string;
  accumulatedSec: number;
  targetSec: number;
  running?: boolean;
  onToggle?(): void;
};

export type BrickChipProps =
  | TickBrickChipProps
  | GoalBrickChipProps
  | TimeBrickChipProps;

function formatMin(sec: number): string {
  return String(Math.floor(sec / 60));
}

// Tick variant
function TickChip({
  name,
  done,
  onToggle,
  editMode,
  onDelete,
  category,
  className,
}: TickBrickChipProps) {
  const catColor = CAT_COLOR[category];
  const label = done ? `${name} done` : `${name} —`;

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg px-3 py-2",
          "font-mono text-[--fs-12] transition-colors",
          done ? "text-[--ink]" : "text-[--ink-dim]",
          !editMode && "cursor-pointer hover:bg-[--bg-elev]",
          editMode && "pointer-events-none",
        )}
        onClick={!editMode ? onToggle : undefined}
      >
        <span
          className="h-3 w-3 rounded-sm border"
          style={{
            borderColor: catColor,
            background: done ? catColor : "transparent",
          }}
          aria-hidden="true"
        />
        <span>{name}</span>
      </button>
      {editMode && (
        <button
          type="button"
          aria-label="Delete brick"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[--ink-dim] hover:text-[--ink]"
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Goal variant
function GoalChip({
  name,
  current,
  target,
  unit,
  onCommit,
  editMode,
  onDelete,
  className,
}: GoalBrickChipProps) {
  const [stepperOpen, setStepperOpen] = React.useState(false);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const label = `${current}/${target}${unit ? " " + unit : ""}`;
  const ariaLabel = `${name} ${label}`;

  function handleCommit(n: number) {
    onCommit?.(n);
    setStepperOpen(false);
  }

  return (
    <div className={cn("relative inline-flex flex-col gap-1", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2",
          "font-mono text-[--fs-12] text-[--ink] transition-colors",
          !editMode && "cursor-pointer hover:bg-[--bg-elev]",
          editMode && "pointer-events-none",
        )}
        onClick={!editMode ? () => setStepperOpen((o) => !o) : undefined}
      >
        <span className="text-[--ink-dim]">{name}</span>
        {/* Fill bar */}
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[--ink-dim]/20">
          <span
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </span>
        <span>{label}</span>
      </button>
      {stepperOpen && !editMode && (
        <div className="px-3">
          <Stepper
            value={current}
            min={0}
            max={target * 2}
            onChange={handleCommit}
            unit={unit}
          />
        </div>
      )}
      {editMode && (
        <button
          type="button"
          aria-label="Delete brick"
          className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full text-[--ink-dim] hover:text-[--ink]"
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Time variant
function TimeChip({
  name,
  accumulatedSec,
  targetSec,
  running,
  onToggle,
  editMode,
  onDelete,
  className,
}: TimeBrickChipProps) {
  const pct =
    targetSec > 0 ? Math.min(100, (accumulatedSec / targetSec) * 100) : 0;
  const accMin = formatMin(accumulatedSec);
  const targetMin = formatMin(targetSec);
  const label = `${accMin}/${targetMin} min`;
  const ariaLabel = `${name} ${label}`;

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2",
          "font-mono text-[--fs-12] text-[--ink] transition-colors",
          !editMode && "cursor-pointer hover:bg-[--bg-elev]",
          editMode && "pointer-events-none",
        )}
        onClick={!editMode ? onToggle : undefined}
      >
        {/* Ring visual */}
        <span
          className="relative flex h-8 w-8 items-center justify-center"
          aria-hidden="true"
        >
          <svg className="h-full w-full -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="var(--ink-dim)"
              strokeOpacity={0.2}
              strokeWidth={3}
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="var(--accent)"
              strokeWidth={3}
              strokeDasharray={`${2 * Math.PI * 12}`}
              strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[8px]">{running ? "▶" : "⏸"}</span>
        </span>
        <span className="text-[--ink-dim]">{name}</span>
        <span>{label}</span>
      </button>
      {editMode && (
        <button
          type="button"
          aria-label="Delete brick"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[--ink-dim] hover:text-[--ink]"
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function BrickChip(props: BrickChipProps) {
  if (props.kind === "tick") return <TickChip {...props} />;
  if (props.kind === "goal") return <GoalChip {...props} />;
  return <TimeChip {...props} />;
}
