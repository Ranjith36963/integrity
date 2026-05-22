"use client";
import { Pencil, Settings } from "lucide-react";
import { useEditMode } from "./EditModeProvider";
import { haptics } from "../lib/haptics";
import { BrandMarkLongPress } from "./BrandMarkLongPress";
import type { AppState } from "@/lib/types";

type TopBarProps = {
  /**
   * M7e: optional state for brand-mark long-press easter egg.
   * When provided, the DHARMA cluster is wrapped with <BrandMarkLongPress>.
   * When absent, the brand mark renders un-wrapped (backwards compat with M0/M5).
   */
  state?: AppState;
};

export function TopBar({ state }: TopBarProps = {}) {
  const { editMode, toggle } = useEditMode();

  function handleEditToggle() {
    haptics.light();
    toggle();
  }

  // Brand-mark cluster — wrapped in BrandMarkLongPress when state is provided (M7e).
  const brandMark = (
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded-[3px]"
        style={{
          background:
            "linear-gradient(180deg, var(--amber), var(--amber-deep))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px -3px var(--amber-glow)",
        }}
        aria-hidden
      />
      <span
        className="text-[13px] tracking-[0.32em]"
        style={{ color: "var(--ink)" }}
      >
        DHARMA
      </span>
    </div>
  );

  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-3">
      {state !== undefined ? (
        <BrandMarkLongPress state={state}>{brandMark}</BrandMarkLongPress>
      ) : (
        brandMark
      )}
      <div className="flex items-center gap-2">
        <button
          aria-label={editMode ? "Edit mode, on" : "Edit mode, off"}
          aria-pressed={editMode}
          onClick={handleEditToggle}
          className="grid h-11 w-11 place-items-center rounded-md border transition-colors"
          style={{
            background: editMode ? "var(--accent)" : "var(--card)",
            borderColor: editMode
              ? "color-mix(in srgb, var(--accent) 60%, transparent)"
              : "rgba(255,255,255,0.05)",
          }}
        >
          <Pencil
            size={15}
            color={editMode ? "var(--ink)" : "var(--ink-dim)"}
          />
        </button>
        <button
          aria-label="Settings"
          className="grid h-11 w-11 place-items-center rounded-md border border-white/5 transition-colors hover:border-white/15"
          style={{ background: "var(--card)" }}
        >
          <Settings size={15} color="var(--ink-dim)" />
        </button>
      </div>
    </header>
  );
}
