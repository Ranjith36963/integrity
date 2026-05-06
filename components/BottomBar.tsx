"use client";
// BottomBar — re-authored for M1 (plan.md § Components — Floating dock):
// - Voice button: aria-disabled="true" + locked SPEC label (SG-m1-04)
//   Stays as <button> (NOT <div>) so SR users hear the disabled state.
//   No native `disabled` attribute (must remain focusable for screen readers).
//   Visual: opacity-50 + cursor-not-allowed.
//   Click handler: preventDefault() to defang without removing from tab order.
// - Add (+) button: aria-label="Add", stays enabled, no-op click (M2 wires sheet).
// - Outer wrapper: paddingBottom calc(20px + var(--safe-bottom)) for iOS home-indicator.

import { Mic, Plus } from "lucide-react";

export function BottomBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div
        className="mx-auto max-w-[430px] px-5"
        style={{ paddingBottom: "calc(20px + var(--safe-bottom))" }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Voice button: visibly disabled per SG-m1-04.
              aria-disabled (not disabled) keeps it in the tab order for SR users.
              onClick preventDefault defangs the click without removing focus. */}
          <button
            aria-label="Voice Log (coming in a later release)"
            aria-disabled="true"
            tabIndex={0}
            onClick={(e) => e.preventDefault()}
            className="flex h-12 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full text-[12px] tracking-[0.18em] uppercase opacity-50"
            style={{
              background:
                "linear-gradient(180deg, var(--amber), var(--amber-deep))",
              color: "rgba(0,0,0,0.85)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -8px rgba(245,158,11,0.7), 0 0 0 1px rgba(251,191,36,0.45)",
            }}
          >
            <Mic size={16} />
            Voice Log
          </button>
          {/* Add button: enabled, no-op in M1. M2 wires the Add Block sheet. */}
          <button
            aria-label="Add"
            className="grid h-12 w-12 place-items-center rounded-full"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-edge)",
              color: "var(--ink)",
            }}
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
