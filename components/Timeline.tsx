import { Block } from "@/lib/types";
import { blockStatus } from "@/lib/dharma";
import { TimelineBlock } from "./TimelineBlock";

interface Props {
  blocks: Block[];
  now: string;
}

export function Timeline({ blocks, now }: Props) {
  return (
    <section className="px-5 pb-32">
      <div
        className="text-[10px] tracking-[0.22em] uppercase mb-3"
        style={{ color: "var(--ink-faint)" }}
      >
        schedule
      </div>
      <div className="flex flex-col gap-2">
        {blocks.map((b, i) => (
          <TimelineBlock
            key={`${b.start}-${b.name}`}
            block={b}
            status={blockStatus(blocks, now, i)}
          />
        ))}
      </div>
    </section>
  );
}
