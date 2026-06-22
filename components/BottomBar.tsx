"use client";
// BottomBar — floating dock with two actions.
//
// History:
//   M1/M2: left pill was "Voice Log" (aria-disabled placeholder for M10);
//          right circle was "+" (chooser).
//   Polish pass: Voice Log is dropped — the stranded "coming later" label
//          was the only such hint left in the UI after Settings shipped.
//          Replaced with "+ Brick" as a quick path that bypasses the
//          chooser and opens AddBrickSheet directly. Two entry points
//          stay: the small + (chooser → Block/Brick choice) and the big
//          pill (direct brick add — the hot path for daily habit logging).
//
// - Outer wrapper: paddingBottom calc(20px + var(--safe-bottom)) for iOS home-indicator.

import { Plus, Zap } from "lucide-react";

interface Props {
  /** Opens the AddChooserSheet (Block / Brick / Cancel). */
  onAddPress?: () => void;
  /** Opens the AddBrickSheet directly — the daily-habit fast path. */
  onQuickBrick?: () => void;
}

export function BottomBar({ onAddPress, onQuickBrick }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div
        className="mx-auto max-w-[430px] px-5"
        style={{ paddingBottom: "calc(20px + var(--safe-bottom, 0px))" }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick-brick pill — the daily-habit fast path. Skips the chooser
              dialog because logging a brick is the most-frequent action in
              a productivity app's day-to-day. */}
          {/* "Log brick" intentionally uses the LOG verb (not ADD) to
              distinguish from the in-block "+ Add brick" button which
              attaches a brick TO that block. The dock pill creates a
              standalone loose brick — the instant-capture path for
              "I just did something, mark it." */}
          <button
            type="button"
            data-testid="dock-quick-brick"
            aria-label="Log brick"
            onClick={onQuickBrick}
            className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[12px] tracking-[0.18em] uppercase"
            style={{
              background:
                "linear-gradient(180deg, var(--amber), var(--amber-deep))",
              color: "rgba(0,0,0,0.85)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -8px rgba(245,158,11,0.7), 0 0 0 1px rgba(251,191,36,0.45)",
            }}
          >
            <Zap size={16} />
            Log Brick
          </button>
          {/* + button: opens the chooser (Block / Brick / Cancel). */}
          <button
            type="button"
            data-testid="dock-add"
            aria-label="Add"
            className="tap grid h-12 w-12 place-items-center rounded-full"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-edge)",
              color: "var(--ink)",
            }}
            onClick={onAddPress}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24"
        style={{
          background: "linear-gradient(180deg, transparent, var(--bg) 60%)",
        }}
      />
    </div>
  );
}
