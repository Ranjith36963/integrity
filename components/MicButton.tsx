"use client";
/**
 * MicButton — dock mic trigger.
 * Returns null when supported=false (AC #3 — hidden, no JS error).
 * h-12 w-12 to match the + button footprint.
 * aria-label changes between "Start voice log" / "Stop voice log" (AC #2).
 * aria-pressed reflects listening state.
 * haptics.light() on press.
 */

import { Mic } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface Props {
  /** When false the component returns null (AC #3). */
  supported: boolean;
  /** Drives the active/idle visual + aria-pressed. */
  listening: boolean;
  /** Calls the toggle handler. */
  onPress: () => void;
}

export function MicButton({ supported, listening, onPress }: Props) {
  if (!supported) return null;

  function handleClick() {
    haptics.light();
    onPress();
  }

  return (
    <button
      type="button"
      aria-label={listening ? "Stop voice log" : "Start voice log"}
      aria-pressed={listening}
      onClick={handleClick}
      className={`tap ${listening ? "hud-glass-primary" : "hud-glass-ghost"} grid h-12 w-12 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={{
        // Listening keeps a harder 2px ring on top of the glass tint so the
        // "live mic" state is unmistakable.
        ...(listening ? { border: "2px solid var(--accent)" } : {}),
        flexShrink: 0,
      }}
    >
      <Mic size={18} />
    </button>
  );
}
