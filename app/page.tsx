import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { NowCard } from "@/components/NowCard";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import {
  BLOCKS,
  NOW,
  DAY_NUMBER,
  TOTAL_DAYS,
  TODAY_LABEL,
} from "@/lib/data";
import { currentBlockIndex, dayPct } from "@/lib/dharma";

export default function BuildingPage() {
  const idx = currentBlockIndex(BLOCKS, NOW);
  const current = idx >= 0 ? BLOCKS[idx] : null;
  const pct = dayPct(BLOCKS);
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh relative">
      <TopBar />
      <Hero
        dateLabel={TODAY_LABEL}
        dayNumber={DAY_NUMBER}
        totalDays={TOTAL_DAYS}
        pct={pct}
      />
      <BlueprintBar blocks={BLOCKS} now={NOW} />
      {current && <NowCard block={current} />}
      <Timeline blocks={BLOCKS} now={NOW} />
      <BottomBar />
    </div>
  );
}
