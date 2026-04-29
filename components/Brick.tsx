"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Brick as BrickT, CATEGORY_COLOR, Category } from "@/lib/types";
import { brickPct, brickLabel } from "@/lib/dharma";
import { BrickStepper } from "./BrickStepper";

interface Props {
  brick: BrickT;
  category: Category;
  index: number;
  onLog: (updated: BrickT) => void;
  editMode: boolean;
}

export function Brick({ brick, category, index, onLog, editMode }: Props) {
  const [stepperOpen, setStepperOpen] = useState(false);
  const pct = brickPct(brick);
  const color = CATEGORY_COLOR[category];
  const empty = pct === 0;
  const partial = pct > 0 && pct < 100;
  const cls = [
    "brick brick-in",
    empty && "brick--empty",
    partial && "brick--partial",
  ]
    .filter(Boolean)
    .join(" ");

  // Displayed text for the brick — includes name and numeric status
  function displayLabel(): string {
    if (brick.kind === "tick") return brick.name;
    if (brick.kind === "time")
      return `${brick.name} ${brick.current}/${brick.target}m`;
    // goal
    return `${brick.name} ${brick.current}/${brick.target}${brick.unit ? " " + brick.unit : ""}`;
  }

  const label = displayLabel();
  // Accessible label — brick name + current state
  const accessibleLabel =
    brick.kind === "tick" ? `${brick.name} ${brickLabel(brick)}` : label;

  function handleBrickClick() {
    if (editMode) return; // no-op in edit mode
    if (brick.kind === "tick") {
      onLog({ ...brick, done: !brick.done });
    } else {
      setStepperOpen((v) => !v);
    }
  }

  function handleStepperCommit(value: number) {
    onLog({ ...brick, current: value } as BrickT);
  }

  if (editMode) {
    return (
      <div className="relative inline-flex items-center gap-0.5">
        <button
          data-brick-body
          aria-label={accessibleLabel}
          className={cls}
          style={
            {
              "--brick-color": color,
              animationDelay: `${index * 35}ms`,
            } as React.CSSProperties
          }
          // In edit mode, body click is a no-op
        >
          {label}
        </button>
        <button
          aria-label="Delete brick"
          className="grid h-5 w-5 place-items-center rounded"
          style={{ color: "var(--ink-faint)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        aria-label={accessibleLabel}
        onClick={handleBrickClick}
        className={cls}
        style={
          {
            "--brick-color": color,
            animationDelay: `${index * 35}ms`,
            minHeight: "44px",
            minWidth: "44px",
          } as React.CSSProperties
        }
      >
        {label}
      </button>
      {stepperOpen && (brick.kind === "goal" || brick.kind === "time") && (
        <BrickStepper
          brick={brick}
          onCommit={handleStepperCommit}
          onClose={() => setStepperOpen(false)}
        />
      )}
    </div>
  );
}
