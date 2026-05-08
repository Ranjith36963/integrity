"use client";
import { useState } from "react";
import type { Brick } from "@/lib/types";

// [obsolete] — BrickStepper not imported in M3. M4 wires logging via BrickChip.
// M3: updated field reads: goal → count, time → minutesDone.

interface Props {
  brick: Extract<Brick, { kind: "goal" | "time" }>;
  onCommit: (value: number) => void;
  onClose: () => void;
}

function getCurrentValue(
  brick: Extract<Brick, { kind: "goal" | "time" }>,
): number {
  if (brick.kind === "goal") return brick.count;
  return brick.minutesDone;
}

export function BrickStepper({ brick, onCommit, onClose }: Props) {
  const [draft, setDraft] = useState(getCurrentValue(brick));

  const decrement = () => {
    const next = Math.max(0, draft - 1);
    setDraft(next);
    onCommit(next);
  };

  const increment = () => {
    const next = draft + 1;
    setDraft(next);
    onCommit(next);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-md border px-1 py-0.5"
      style={{
        background: "var(--card)",
        borderColor: "var(--card-edge)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        aria-label="Decrement"
        onClick={(e) => {
          e.stopPropagation();
          decrement();
        }}
        className="grid h-6 w-6 place-items-center rounded text-[14px]"
        style={{ color: "var(--ink-dim)" }}
      >
        −
      </button>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        onBlur={() => {
          onCommit(draft);
          onClose();
        }}
        className="w-10 bg-transparent text-center text-[12px]"
        style={{ color: "var(--ink)" }}
        aria-label="Current value"
      />
      <button
        aria-label="Increment"
        onClick={(e) => {
          e.stopPropagation();
          increment();
        }}
        className="grid h-6 w-6 place-items-center rounded text-[14px]"
        style={{ color: "var(--ink-dim)" }}
      >
        +
      </button>
    </div>
  );
}
