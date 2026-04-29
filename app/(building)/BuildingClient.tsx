"use client";
import { useState } from "react";
import { BLOCKS, NOW, DAY_NUMBER, TOTAL_DAYS, TODAY_LABEL } from "@/lib/data";
import { currentBlockIndex, dayPct } from "@/lib/dharma";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { NowCard } from "@/components/NowCard";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import type { Block, Brick } from "@/lib/types";

// Page-1 client component. State is in-memory only — mutations are lost on refresh.
// No localStorage or server persistence in this feature (Phase 1 scope).
export function BuildingClient() {
  // Clone BLOCKS into mutable state; lib/data.ts const is left unmodified.
  const [blocks, setBlocks] = useState<Block[]>(() =>
    BLOCKS.map((b) => ({ ...b, bricks: [...b.bricks] })),
  );

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

  const idx = currentBlockIndex(blocks, NOW);
  const current = idx >= 0 ? blocks[idx] : null;
  const pct = Math.round(dayPct(blocks));

  return (
    <EditModeProvider>
      <div className="relative mx-auto min-h-dvh max-w-[430px]">
        <TopBar />
        <Hero
          dateLabel={TODAY_LABEL}
          dayNumber={DAY_NUMBER}
          totalDays={TOTAL_DAYS}
          pct={pct}
        />
        {blocks.length > 0 && <BlueprintBar blocks={blocks} now={NOW} />}
        {blocks.length > 0 && current && (
          <NowCard
            block={current}
            onLogBrick={(brickIndex, updated) =>
              handleLogBrick(idx, brickIndex, updated)
            }
          />
        )}
        <Timeline blocks={blocks} now={NOW} onLogBrick={handleLogBrick} />
        <BottomBar />
      </div>
    </EditModeProvider>
  );
}
