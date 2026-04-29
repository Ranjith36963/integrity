"use client";
import { Block } from "@/lib/types";
import { blockStatus } from "@/lib/dharma";
import { TimelineBlock } from "./TimelineBlock";
import { EmptyBlocks } from "./EmptyBlocks";
import type { Brick } from "@/lib/types";

interface Props {
  blocks: Block[];
  now: string;
  onLogBrick: (blockIndex: number, brickIndex: number, updated: Brick) => void;
}

export function Timeline({ blocks, now, onLogBrick }: Props) {
  return (
    <section className="px-5 pb-32">
      <div
        className="mb-3 text-[10px] tracking-[0.22em] uppercase"
        style={{ color: "var(--ink-faint)" }}
      >
        schedule
      </div>
      {blocks.length === 0 ? (
        <EmptyBlocks />
      ) : (
        <div className="flex flex-col gap-2">
          {blocks.map((b, i) => (
            <TimelineBlock
              key={`${b.start}-${b.name}`}
              block={b}
              status={blockStatus(blocks, now, i)}
              onLogBrick={(brickIndex, updated) =>
                onLogBrick(i, brickIndex, updated)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
