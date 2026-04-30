"use client";
import { useState } from "react";
import { currentBlockIndex, dayPct } from "@/lib/dharma";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { NowCard } from "@/components/NowCard";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import type { Block, Brick } from "@/lib/types";

// Local placeholder constants — replaced in subsequent features:
// - `now` will come from useNow() (live-clock feature, ADR-020)
// - `dayNumber` is undefined until programStart is set (persist feature, ADR-018)
// - `totalDays` and `dateLabel` will be derived live (live-clock feature)
const now = "00:00";
const dayNumber = undefined as number | undefined;
const totalDays = 365;
const dateLabel = "";

// Page-1 client component. State is in-memory only — mutations are lost on refresh.
// No localStorage or server persistence in this feature (wipe-demo scope).
// Empty state is the default; blocks are created by the user via the add-block feature.
export function BuildingClient() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  function handleLogBrick(
    blockIndex: number,
    brickIndex: number,
    updated: Brick,
  ) {
    setBlocks((prev) =>
      prev.map((block, bi) => {
        if (bi !== blockIndex) return block;
        return {
          ...block,
          bricks: block.bricks.map((brick, ri) =>
            ri === brickIndex ? updated : brick,
          ),
        };
      }),
    );
  }

  const idx = currentBlockIndex(blocks, now);
  const current = idx >= 0 ? blocks[idx] : null;
  const pct = Math.round(dayPct(blocks));

  return (
    <EditModeProvider>
      <div className="relative mx-auto min-h-dvh max-w-[430px]">
        <TopBar />
        <Hero
          dateLabel={dateLabel}
          dayNumber={dayNumber}
          totalDays={totalDays}
          pct={pct}
        />
        {blocks.length > 0 && <BlueprintBar blocks={blocks} now={now} />}
        {blocks.length > 0 && current && (
          <NowCard
            block={current}
            onLogBrick={(brickIndex, updated) =>
              handleLogBrick(idx, brickIndex, updated)
            }
          />
        )}
        <Timeline blocks={blocks} now={now} onLogBrick={handleLogBrick} />
        <BottomBar />
      </div>
    </EditModeProvider>
  );
}
