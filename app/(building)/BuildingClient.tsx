"use client";
// BuildingClient — re-authored for M1 (plan.md § Components — Page composition):
// - Removed: NowCard import and conditional rendering (SPEC AC #13)
// - Removed: blocks.length > 0 guard on BlueprintBar (SPEC AC #8: always rendered)
// - Removed: currentBlockIndex / dayPct calls (unused in M1 empty path)
// - Changed: dayNumber now uses dayOfYear(new Date()) per SG-m1-07
//   (M8 will swap back to dayNumber(programStart, today) when persistence lands)
// - Changed: totalDays now uses daysInYear(new Date()) for 365|366 (leap-year aware)
// - Kept: EditModeProvider, TopBar, Hero, BlueprintBar, Timeline, BottomBar
// - Zero factory data (ADR-039)

import { useState } from "react";
import { today, dateLabel } from "@/lib/dharma";
import { dayOfYear, daysInYear } from "@/lib/dayOfYear";
import { useNow } from "@/lib/useNow";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import type { Block } from "@/lib/types";

// M1 client host: state is in-memory only. M8 wires localStorage persistence.
export function BuildingClient() {
  const [blocks] = useState<Block[]>([]);

  // Live clock (ADR-023: server-clock paint on SSR, reconciles within 60s)
  const now = useNow();
  const todayIso = today();

  // M1 day semantics: dayOfYear(new Date()) returns 1..365|366 (SG-m1-07).
  // M8 replaces with dayNumber(programStart, today) once programStart is persisted.
  const dayNumberValue = dayOfYear(new Date());
  const totalDays = daysInYear(new Date());
  const dateLabelValue = dateLabel(todayIso);

  return (
    <EditModeProvider>
      <div className="relative mx-auto min-h-dvh max-w-[430px]">
        <TopBar />
        <Hero
          dateLabel={dateLabelValue}
          dayNumber={dayNumberValue}
          totalDays={totalDays}
          pct={0}
        />
        {/* BlueprintBar: always rendered in M1 (SPEC AC #8 — unconditional) */}
        <BlueprintBar blocks={blocks} now={now} />
        {/* NowCard: NOT rendered in M1 (SPEC AC #13). Re-imported at M2. */}
        <Timeline blocks={blocks} now={now} />
        <BottomBar />
      </div>
    </EditModeProvider>
  );
}
