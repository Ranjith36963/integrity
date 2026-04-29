import { Mic, Plus } from "lucide-react";

export function BottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto max-w-[430px] px-5 pb-5">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 text-[12px] tracking-[0.18em] uppercase"
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
            className="h-12 w-12 rounded-full grid place-items-center"
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
        className="absolute inset-x-0 bottom-0 h-24 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent, var(--bg) 60%)",
        }}
      />
    </div>
  );
}
