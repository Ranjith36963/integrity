"use client";
// [obsolete: not-imported-in-M2] — stays on disk for M3/M4 revisit.
// Uses a local LegacyBlock type to avoid depending on the new Block schema.
import type { Category } from "@/components/ui/types";
// Local copies of removed constants (Block now uses new schema; this file is obsolete)
const CATEGORY_COLOR: Record<Category, string> = {
  health: "#34d399",
  mind: "#c4b5fd",
  career: "#fbbf24",
  passive: "#64748b",
};
const CATEGORY_LABEL: Record<Category, string> = {
  health: "Health",
  mind: "Mind",
  career: "Career",
  passive: "Passive",
};
import { blockPct, fmtRange } from "@/lib/dharma";
import { Brick as BrickComponent } from "./Brick";
import type { Brick } from "@/lib/types";

// Local legacy block type — M2 Block no longer has `category` or `end` required.
interface LegacyBlock {
  id: string;
  name: string;
  start: string;
  end: string;
  category: Category;
  bricks: Brick[];
}

interface Props {
  block: LegacyBlock;
  onLogBrick: (index: number, updated: Brick) => void;
}

export function NowCard({ block, onLogBrick }: Props) {
  const pct = Math.round(
    blockPct(block as unknown as Parameters<typeof blockPct>[0]),
  );
  const color = CATEGORY_COLOR[block.category];
  return (
    <section className="px-5 pb-5">
      <div
        className="now-glow relative rounded-xl p-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))",
          border: "1px solid rgba(251,191,36,0.35)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-2 w-2">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--amber)" }}
              />
              <span
                className="dot-pulse absolute inset-0 rounded-full"
                style={{ background: "var(--amber)" }}
              />
              <span
                className="ring-ping absolute inset-0 rounded-full"
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
            style={{ color: "var(--ink-dim)" }}
          >
            {fmtRange(block as Parameters<typeof fmtRange>[0])}
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
                className="h-1.5 w-1.5 rounded-[2px]"
                style={{ background: color }}
              />
              <span
                className="text-[9px] tracking-[0.18em] uppercase"
                style={{ color: "var(--ink-dim)" }}
              >
                {CATEGORY_LABEL[block.category].toUpperCase()}
              </span>
            </div>
          </div>
          <div className="font-serif-italic text-[44px] leading-none">
            {pct}
            <span
              className="ml-0.5 align-top text-[18px]"
              style={{ color: "var(--ink-dim)" }}
            >
              %
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {block.bricks.map((b, i) => (
            <BrickComponent
              key={`${block.start}-${b.name}-${b.kind}`}
              brick={b}
              category={block.category}
              index={i}
              onLog={(updated) => onLogBrick(i, updated)}
              editMode={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
