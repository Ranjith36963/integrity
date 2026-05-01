"use client";
import { useState } from "react";
import {
  currentBlockIndex,
  dayPct,
  today,
  dayNumber,
  dateLabel,
} from "@/lib/dharma";
import { useNow } from "@/lib/useNow";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { NowCard } from "@/components/NowCard";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import type { Block, Brick } from "@/lib/types";

const totalDays = 365;

// Page-1 client component. State is in-memory only — mutations are lost on refresh.
// No localStorage or server persistence in this feature (wipe-demo scope).
// Empty state is the default; blocks are created by the user via the add-block feature.
export function BuildingClient() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Live clock — updates every 60 s (ADR-020)
  const now = useNow();
  const todayIso = today();
  // TODO(persist): load programStart from AppState (persist feature, ADR-018)
  const programStart = todayIso;
  const dayNumberValue = dayNumber(programStart, todayIso);
  const dateLabelValue = dateLabel(todayIso);

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
          dateLabel={dateLabelValue}
          dayNumber={dayNumberValue}
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
