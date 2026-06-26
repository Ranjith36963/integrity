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
  /**
   * Settings sheet open handler. When omitted, the gear button keeps its
   * historical aria-disabled treatment ("coming in a later release").
   * BuildingClient passes a real handler now that SettingsSheet exists.
   */
  onOpenSettings?: () => void;
};

export function TopBar({ state, onOpenSettings }: TopBarProps = {}) {
  const { editMode, toggle } = useEditMode();

  function handleEditToggle() {
    haptics.light();
    toggle();
  }

  function handleSettings() {
    if (!onOpenSettings) return;
    haptics.light();
    onOpenSettings();
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
    // R1-P1-2: consume env(safe-area-inset-top) via the --safe-top CSS var that
    // globals.css declares but no element referenced. Without this, the header
    // overlapped the iPhone notch (and the existing E-m1-016 test was tautological
    // — it asserted box.y >= 0 which is true of any rendered element).
    <header
      role="presentation"
      className="flex items-center justify-between px-5 pb-3"
      style={{ paddingTop: "calc(20px + var(--safe-top, 0px))" }}
    >
      {state !== undefined ? (
        <BrandMarkLongPress state={state}>{brandMark}</BrandMarkLongPress>
      ) : (
        brandMark
      )}
      <div className="flex items-center gap-2">
        {/* R1-P2-4: type="button" guards against future <form> wrapping. */}
        <button
          type="button"
          data-testid="edit-mode-toggle"
          aria-label={editMode ? "Edit mode, on" : "Edit mode, off"}
          aria-pressed={editMode}
          onClick={handleEditToggle}
          className="tap grid h-11 w-11 place-items-center rounded-md border transition-colors"
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
        {/* Settings — disabled when no handler is wired (legacy callers /
            tests). Live when BuildingClient passes onOpenSettings. */}
        <button
          type="button"
          data-testid="settings-button"
          aria-label={
            onOpenSettings ? "Settings" : "Settings (coming in a later release)"
          }
          aria-disabled={onOpenSettings ? undefined : "true"}
          onClick={onOpenSettings ? handleSettings : undefined}
          className={
            onOpenSettings
              ? "tap grid h-11 w-11 place-items-center rounded-md border border-white/5 transition-colors"
              : "grid h-11 w-11 cursor-not-allowed place-items-center rounded-md border border-white/5 opacity-50 transition-colors"
          }
          style={{ background: "var(--card)" }}
        >
          <Settings size={15} color="var(--ink-dim)" />
        </button>
      </div>
    </header>
  );
}
