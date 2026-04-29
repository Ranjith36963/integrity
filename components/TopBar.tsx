import { Pencil, Settings } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-[3px]"
          style={{
            background:
              "linear-gradient(180deg, var(--amber), var(--amber-deep))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px -3px var(--amber-glow)",
          }}
          aria-hidden
        />
        <span
          className="text-[13px] tracking-[0.32em] text-ink"
          style={{ color: "var(--ink)" }}
        >
          DHARMA
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Edit"
          className="w-9 h-9 rounded-md grid place-items-center border border-white/5 hover:border-white/15 transition-colors"
          style={{ background: "var(--card)" }}
        >
          <Pencil size={15} color="var(--ink-dim)" />
        </button>
        <button
          aria-label="Settings"
          className="w-9 h-9 rounded-md grid place-items-center border border-white/5 hover:border-white/15 transition-colors"
          style={{ background: "var(--card)" }}
        >
          <Settings size={15} color="var(--ink-dim)" />
        </button>
      </div>
    </header>
  );
}
