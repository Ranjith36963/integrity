"use client";
import { Pencil, Settings } from "lucide-react";
import { useEditMode } from "./EditModeProvider";

export function TopBar() {
  const { editMode, toggle } = useEditMode();
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-3">
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
      <div className="flex items-center gap-2">
        <button
          aria-label="Edit"
          aria-pressed={editMode}
          onClick={toggle}
          className="grid h-11 w-11 place-items-center rounded-md border border-white/5 transition-colors hover:border-white/15"
          style={{ background: "var(--card)" }}
        >
          <Pencil size={15} color="var(--ink-dim)" />
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
