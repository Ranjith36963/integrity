"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  pressed: boolean;
  onPressedChange(next: boolean): void;
  label: string; // visually hidden; used for aria-label
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  pressed,
  onPressedChange,
  label,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      className={cn(
        // Ensure 44×44 minimum touch target
        "relative inline-flex h-11 w-11 items-center justify-center",
        "rounded-full transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--accent]",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onClick={() => onPressedChange(!pressed)}
    >
      {/* iOS-style switch track */}
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          pressed ? "bg-[--accent]" : "bg-[--ink-dim]/30",
        )}
      >
        {/* Thumb */}
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-[--ink] shadow transition-transform duration-200",
            pressed ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
