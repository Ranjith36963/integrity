import { Mic, Plus } from "lucide-react";

export function BottomBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto max-w-[430px] px-5 pb-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[12px] tracking-[0.18em] uppercase"
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
