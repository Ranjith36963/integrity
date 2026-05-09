"use client";
// TimerSheet — M4c bottom sheet for manual time-brick minute entry.
// Opens via long-press on a time chip. Single number input + Save / Cancel.
// Focus trap: input → Save → Cancel → (wraps back to input).
// Resolves C-m4c-007..012.

import { useEffect, useRef, useCallback } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";
import type { Brick } from "@/lib/types";

type TimeBrick = Extract<Brick, { kind: "time" }>;

interface Props {
  open: boolean;
  brick: TimeBrick;
  onSave: (minutes: number) => void;
  onCancel: () => void;
}

export function TimerSheet({ open, brick, onSave, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Store trigger element so we can restore focus on close
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
  }, [open]);

  // Focus trap: Tab/Shift+Tab cycles input → Save → Cancel → (back to input)
  // Required by C-m4c-012
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "input:not([disabled]), button:not([disabled]):not([aria-disabled='true'])",
        ),
      );

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSave = useCallback(() => {
    const raw = Math.floor(Number(inputRef.current?.value ?? ""));
    const value = isNaN(raw)
      ? 0
      : Math.max(0, Math.min(raw, brick.durationMin));

    // Overflow clamp — haptics.medium per plan haptics map (C-m4c-009)
    const parsed = isNaN(Number(inputRef.current?.value ?? ""))
      ? 0
      : Number(inputRef.current?.value ?? "");

    if (parsed > brick.durationMin) {
      haptics.medium();
    }

    returnFocusRef.current?.focus();
    onSave(value);
  }, [brick.durationMin, onSave]);

  const handleCancel = useCallback(() => {
    returnFocusRef.current?.focus();
    onCancel();
  }, [onCancel]);

  return (
    <Sheet open={open} onClose={handleCancel} title="Set minutes">
      <div ref={containerRef}>
        <div className="flex flex-col gap-4 p-5 pt-0">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="timer-minutes-input"
              className="font-mono text-[--fs-14] text-[--ink-dim]"
            >
              Minutes done
            </label>
            <input
              ref={inputRef}
              id="timer-minutes-input"
              type="number"
              aria-label="Minutes done"
              min={0}
              max={brick.durationMin}
              step={1}
              defaultValue={brick.minutesDone}
              className="w-full rounded-lg border border-[--ink-dim] bg-[--bg-base] px-3 py-2 font-mono text-[--fs-16] text-[--ink] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--accent]"
              style={{ minHeight: "44px" }}
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSave}
            aria-label="Save minutes"
            style={{ minHeight: "44px" }}
          >
            Save
          </Button>

          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel"
            className="flex w-full items-center justify-center rounded-lg border border-[--ink-dim] bg-transparent font-mono tracking-wide text-[--fs-14] text-[--ink-dim] uppercase hover:text-[--ink] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--accent]"
            style={{ minHeight: "44px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Sheet>
  );
}
