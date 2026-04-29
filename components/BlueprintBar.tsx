import { Block, CATEGORY_COLOR } from "@/lib/types";
import { duration, nowOffsetPct } from "@/lib/dharma";

interface Props {
  blocks: Block[];
  now: string;
}

export function BlueprintBar({ blocks, now }: Props) {
  const total = blocks.reduce((s, b) => s + duration(b), 0);
  const offset = nowOffsetPct(blocks, now);
  return (
    <section aria-label="Day blueprint" className="px-5 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <div
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--ink-faint)" }}
        >
          day blueprint
        </div>
        <div
          className="text-[10px] tracking-[0.18em]"
          style={{ color: "var(--ink-dim)" }}
        >
          {now}
        </div>
      </div>
      <div
        className="relative h-9 overflow-hidden rounded-md border"
        style={{
          borderColor: "var(--card-edge)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex h-full w-full">
          {blocks.map((b, i) => {
            const pct = (duration(b) / total) * 100;
            return (
              <div
                key={`${b.start}-${b.name}`}
                data-testid="blueprint-segment"
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(180deg, ${CATEGORY_COLOR[b.category]} 0%, color-mix(in oklab, ${CATEGORY_COLOR[b.category]} 65%, #000) 100%)`,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), inset -1px 0 0 rgba(0,0,0,0.25)",
                }}
                title={`${b.start}–${b.end} ${b.name}`}
              />
            );
          })}
        </div>
        <div
          data-testid="now-pin"
          aria-label={`Now ${now}`}
          className="absolute top-0 bottom-0"
          style={{ left: `${offset}%`, transform: "translateX(-50%)" }}
        >
          <div
            className="h-full w-[2px]"
            style={{
              background: "#fff",
              boxShadow: "0 0 8px rgba(255,255,255,0.7)",
            }}
          />
          <div
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
            style={{
              background: "#fff",
              boxShadow: "0 0 10px rgba(255,255,255,0.9)",
            }}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {(["health", "mind", "career", "passive"] as const).map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: CATEGORY_COLOR[c] }}
            />
            <span
              className="text-[9px] tracking-[0.16em] uppercase"
              style={{ color: "var(--ink-faint)" }}
            >
              {c.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
