"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export interface StepperProps {
  value: number;
  onChange(next: number): void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
  className?: string;
}

const BASE_INTERVAL_MS = 300; // initial repeat delay during long-press
const ACCEL_START_MS = 1500; // time before acceleration starts
const MAX_ACCEL = 10; // caps at 10× base rate

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  unit,
  className,
}: StepperProps) {
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const accelRef = React.useRef(1);
  const pressStartRef = React.useRef(0);
  const tickCountRef = React.useRef(0);
  const pendingDirRef = React.useRef<1 | -1>(1);

  function clamp(n: number): number {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  function commit(dir: 1 | -1) {
    const next = clamp(value + dir * step);
    if (next === value) return; // at boundary — no commit
    onChange(next);
    haptics.light();
  }

  function startLongPress(dir: 1 | -1) {
    pressStartRef.current = Date.now();
    accelRef.current = 1;
    tickCountRef.current = 0;
    pendingDirRef.current = dir;

    intervalRef.current = setInterval(() => {
      tickCountRef.current++;
      const elapsed = Date.now() - pressStartRef.current;
      // Ramp acceleration over ACCEL_START_MS
      accelRef.current = Math.min(
        MAX_ACCEL,
        1 + Math.floor((elapsed / ACCEL_START_MS) * (MAX_ACCEL - 1)),
      );
      for (let i = 0; i < accelRef.current; i++) {
        commit(pendingDirRef.current);
      }
    }, BASE_INTERVAL_MS);
  }

  function stopLongPress() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  React.useEffect(() => () => stopLongPress(), []);

  const canDecrement = min === undefined || value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[--ink]",
        className,
      )}
      data-testid="stepper"
    >
      <button
        type="button"
        aria-label="Decrement"
        disabled={disabled || !canDecrement}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[--ink-dim]/30 text-[--fs-16] text-[--ink-dim] transition-colors hover:border-[--ink] hover:text-[--ink] disabled:pointer-events-none disabled:opacity-30"
        onClick={() => commit(-1)}
        onPointerDown={() => startLongPress(-1)}
        onPointerUp={stopLongPress}
        onPointerLeave={stopLongPress}
      >
        −
      </button>

      <span className="min-w-[3ch] text-center text-[--fs-16]">
        {value}
        {unit && (
          <span className="ml-1 text-[--fs-12] text-[--ink-dim]">{unit}</span>
        )}
      </span>

      <button
        type="button"
        aria-label="Increment"
        disabled={disabled || !canIncrement}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[--ink-dim]/30 text-[--fs-16] text-[--ink-dim] transition-colors hover:border-[--ink] hover:text-[--ink] disabled:pointer-events-none disabled:opacity-30"
        onClick={() => commit(1)}
        onPointerDown={() => startLongPress(1)}
        onPointerUp={stopLongPress}
        onPointerLeave={stopLongPress}
      >
        +
      </button>
    </div>
  );
}
