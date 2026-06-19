"use client";
// BottomBar — re-authored for M2 (plan.md § Components — Floating dock):
// - Add (+) button: onClick wired to new onAddPress prop (M2)
// - Voice button: aria-disabled="true" + locked SPEC label (SG-m1-04, M1 unchanged)
//   Stays as <button> (NOT <div>) so SR users hear the disabled state.
//   No native `disabled` attribute (must remain focusable for screen readers).
//   Visual: opacity-50 + cursor-not-allowed.
//   R1-P1-3: dropped the dead `onClick={(e) => e.preventDefault()}` —
//   `<button>` outside a form has no default action to suppress, and the
//   handler shadowed nothing. Lack of any onClick = no-op = correct M1 intent.
//   The `aria-disabled` already covers the SR announcement.
// - Outer wrapper: paddingBottom calc(20px + var(--safe-bottom)) for iOS home-indicator.

import { Mic, Plus } from "lucide-react";

interface Props {
  onAddPress?: () => void;
}

export function BottomBar({ onAddPress }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div
        className="mx-auto max-w-[430px] px-5"
        style={{ paddingBottom: "calc(20px + var(--safe-bottom, 0px))" }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Voice button: visibly disabled per SG-m1-04.
              aria-disabled (not disabled) keeps it in the tab order for SR users.
              R1-P1-3: removed dead preventDefault; aria-disabled is the contract.
              R1-P2-4: explicit type="button" so a future wrap in <form> can't
              accidentally make this a submit. */}
          <button
            type="button"
            data-testid="dock-voice"
            aria-label="Voice Log (coming in a later release)"
            aria-disabled="true"
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
          {/* Add button: M2 wires onAddPress. M0 primary amber, 44×44, aria-label="Add".
              R1-P2-4: explicit type="button". */}
          <button
            type="button"
            data-testid="dock-add"
            aria-label="Add"
            className="grid h-12 w-12 place-items-center rounded-full"
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
