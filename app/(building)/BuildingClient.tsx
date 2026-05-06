"use client";
// BuildingClient — re-authored for M2 (plan.md § Components — Page composition):
// - State: useReducer(reducer, defaultState()) for blocks + categories (M2)
// - Sheet state: { open: boolean; defaultStart: string } (M2)
// - onAddPress → opens sheet with roundDownToHour(now) as defaultStart (SG-m2-04)
// - onSlotTap → opens sheet with hourToHHMM(hour) as defaultStart
// - onSave → dispatches ADD_BLOCK, closes sheet
// - onCreateCategory → dispatches ADD_CATEGORY (stays open)
// - Timeline receives blocks, categories, onSlotTap (M2)
// - BlueprintBar receives blocks + categories (M2)
// - AddBlockSheet: renders from sheetState
// - roundDownToHour: 1-line local helper — string slice, no Date math (SG-m2-04)
// - TimelineBlock IS in import graph in M2 (via Timeline) — BuildingClient.imports.test.ts updated

import { useReducer, useState } from "react";
import { today, dateLabel } from "@/lib/dharma";
import { dayOfYear, daysInYear } from "@/lib/dayOfYear";
import { useNow } from "@/lib/useNow";
import { reducer, defaultState } from "@/lib/data";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import { AddBlockSheet } from "@/components/AddBlockSheet";
import type { Block, Category } from "@/lib/types";

/**
 * roundDownToHour — SG-m2-04.
 * Pure string slice: "09:47" → "09:00". No Date math.
 * Exported for U-m2-010 unit test.
 */
export function roundDownToHour(hhmm: string): string {
  return hhmm.slice(0, 2) + ":00";
}

function hourToHHMM(hour: number): string {
  return String(hour).padStart(2, "0") + ":00";
}

interface SheetState {
  open: boolean;
  defaultStart: string;
}

export function BuildingClient() {
  const [state, dispatch] = useReducer(reducer, defaultState());
  const [sheetState, setSheetState] = useState<SheetState>({
    open: false,
    defaultStart: "00:00",
  });

  // Live clock (ADR-023: server-clock paint on SSR, reconciles within 60s)
  const now = useNow();
  const todayIso = today();

  // M1 day semantics: dayOfYear(new Date()) returns 1..365|366 (SG-m1-07).
  // M8 replaces with dayNumber(programStart, today) once programStart is persisted.
  const dayNumberValue = dayOfYear(new Date());
  const totalDays = daysInYear(new Date());
  const dateLabelValue = dateLabel(todayIso);

  function openSheet(defaultStart: string) {
    setSheetState({ open: true, defaultStart });
  }

  function closeSheet() {
    setSheetState((s) => ({ ...s, open: false }));
  }

  function handleSave(block: Block) {
    dispatch({ type: "ADD_BLOCK", block });
    closeSheet();
  }

  function handleCreateCategory(cat: Pick<Category, "id" | "name" | "color">) {
    dispatch({
      type: "ADD_CATEGORY",
      category: { id: cat.id, name: cat.name, color: cat.color },
    });
    // Sheet stays open (user returns to block form after creating category)
  }

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
        {/* BlueprintBar: always rendered (SPEC AC #8 — unconditional) */}
        <BlueprintBar
          blocks={state.blocks}
          categories={state.categories}
          now={now}
        />
        {/* NowCard: NOT rendered in M2 (re-imported at M3 or M4) */}
        <Timeline
          blocks={state.blocks}
          categories={state.categories}
          now={now}
          onSlotTap={(hour) => openSheet(hourToHHMM(hour))}
        />
        <BottomBar onAddPress={() => openSheet(roundDownToHour(now))} />
        {/* AddBlockSheet: single instance, view state inside */}
        <AddBlockSheet
          open={sheetState.open}
          defaultStart={sheetState.defaultStart}
          categories={state.categories}
          blocks={state.blocks}
          onSave={handleSave}
          onCancel={closeSheet}
          onCreateCategory={handleCreateCategory}
        />
      </div>
    </EditModeProvider>
  );
}
