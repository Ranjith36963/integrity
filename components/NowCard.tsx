import { Block, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/types";
import { blockPct, fmtRange } from "@/lib/dharma";
import { Brick } from "./Brick";

interface Props {
  block: Block;
}

export function NowCard({ block }: Props) {
  const pct = Math.round(blockPct(block));
  const color = CATEGORY_COLOR[block.category];
  return (
    <section className="px-5 pb-5">
      <div
        className="relative rounded-xl p-4 now-glow"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))",
          border: "1px solid rgba(251,191,36,0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative w-2 h-2">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--amber)" }}
              />
              <span
                className="absolute inset-0 rounded-full dot-pulse"
                style={{ background: "var(--amber)" }}
              />
              <span
                className="absolute inset-0 rounded-full ring-ping"
                style={{ background: "var(--amber)" }}
              />
            </div>
            <span
              className="text-[10px] tracking-[0.28em] uppercase"
              style={{ color: "var(--amber)" }}
            >
              now
            </span>
          </div>
          <div
            className="text-[10px] tracking-[0.16em] uppercase"
            style={{ color: "var(--ink-faint)" }}
          >
            {fmtRange(block)}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-[18px] leading-tight tracking-[0.01em]"
              style={{ color: "var(--ink)" }}
            >
              {block.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-[2px]"
                style={{ background: color }}
              />
              <span
                className="text-[9px] tracking-[0.18em] uppercase"
                style={{ color: "var(--ink-faint)" }}
              >
                {CATEGORY_LABEL[block.category]}
              </span>
            </div>
          </div>
          <div className="font-serif-italic text-[44px] leading-none">
            {pct}
            <span
              className="text-[18px] align-top ml-0.5"
              style={{ color: "var(--ink-dim)" }}
            >
              %
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {block.bricks.map((b, i) => (
            <Brick
              key={i}
              brick={b}
              category={block.category}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
