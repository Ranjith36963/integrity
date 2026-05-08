"use client";
// BuildingClient — re-authored for M3 (plan.md § Components — Page composition):
// - M2 features preserved: blocks reducer, AddBlockSheet, Timeline, BlueprintBar
// - M3 NEW: AddBrickSheet wired for onAddBrick (inside-block + standalone)
// - M3 NEW: LooseBricksTray mounted when blocks.length > 0 || looseBricks.length > 0
// - M3 NEW: dayPct(state) passed to Hero (M3 signature change)
// - roundDownToHour: 1-line local helper — string slice, no Date math (SG-m2-04)
// - TimelineBlock IS in import graph in M2 (via Timeline) — BuildingClient.imports.test.ts updated

import { useReducer, useState } from "react";
import { today, dateLabel, dayPct } from "@/lib/dharma";
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
import { AddBrickSheet } from "@/components/AddBrickSheet";
import { LooseBricksTray } from "@/components/LooseBricksTray";
import type { Block, Brick, Category } from "@/lib/types";

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

interface BrickSheetState {
  open: boolean;
  parentBlockId: string | null;
  defaultCategoryId: string | null;
}

export function BuildingClient() {
  const [state, dispatch] = useReducer(reducer, defaultState());
  const [sheetState, setSheetState] = useState<SheetState>({
    open: false,
    defaultStart: "00:00",
  });
  const [brickSheetState, setBrickSheetState] = useState<BrickSheetState>({
    open: false,
    parentBlockId: null,
    defaultCategoryId: null,
  });

  // Live clock (ADR-023: server-clock paint on SSR, reconciles within 60s)
  const now = useNow();
  const todayIso = today();

  // M1 day semantics: dayOfYear(new Date()) returns 1..365|366 (SG-m1-07).
  // M8 replaces with dayNumber(programStart, today) once programStart is persisted.
  const dayNumberValue = dayOfYear(new Date());
  const totalDays = daysInYear(new Date());
  const dateLabelValue = dateLabel(todayIso);

  // M3: dayPct now takes full AppState (blocks + looseBricks)
  const heroPct = dayPct(state);

  function openSheet(defaultStart: string) {
    setSheetState({ open: true, defaultStart });
  }

  function closeSheet() {
    setSheetState((s) => ({ ...s, open: false }));
  }

  function openBrickSheet(
    parentBlockId: string | null,
    defaultCategoryId: string | null,
  ) {
    setBrickSheetState({ open: true, parentBlockId, defaultCategoryId });
  }

  function closeBrickSheet() {
    setBrickSheetState((s) => ({ ...s, open: false }));
  }

  function handleSave(block: Block) {
    dispatch({ type: "ADD_BLOCK", block });
    closeSheet();
  }

  function handleSaveBrick(brick: Brick) {
    dispatch({ type: "ADD_BRICK", brick });
    closeBrickSheet();
  }

  function handleCreateCategory(cat: Pick<Category, "id" | "name" | "color">) {
    dispatch({
      type: "ADD_CATEGORY",
      category: { id: cat.id, name: cat.name, color: cat.color },
    });
    // Sheet stays open (user returns to block form after creating category)
  }

  function handleAddBrickFromBlock(parentBlockId: string) {
    // Find the block's categoryId to pre-fill
    const block = state.blocks.find((b) => b.id === parentBlockId);
    openBrickSheet(parentBlockId, block?.categoryId ?? null);
  }

  function handleAddLooseBrick() {
    openBrickSheet(null, null);
  }

  // Tray visible iff there's at least one block or loose brick
  const showTray = state.blocks.length > 0 || state.looseBricks.length > 0;

  return (
    <EditModeProvider>
      <div className="relative mx-auto min-h-dvh max-w-[430px]">
        <TopBar />
        <Hero
          dateLabel={dateLabelValue}
          dayNumber={dayNumberValue}
          totalDays={totalDays}
          pct={heroPct}
        />
        {/* BlueprintBar: always rendered (SPEC AC #8 — unconditional) */}
        <BlueprintBar
          blocks={state.blocks}
          categories={state.categories}
          now={now}
        />
        {/* NowCard: NOT rendered in M2/M3 */}
        <Timeline
          blocks={state.blocks}
          categories={state.categories}
          now={now}
          onSlotTap={(hour) => openSheet(hourToHHMM(hour))}
          onAddBrick={handleAddBrickFromBlock}
        />
        {/* LooseBricksTray: pinned above dock, visible when blocks or loose bricks exist */}
        {showTray && (
          <LooseBricksTray
            looseBricks={state.looseBricks}
            categories={state.categories}
            onAddBrick={handleAddLooseBrick}
          />
        )}
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
        {/* AddBrickSheet: single instance, parentBlockId null = loose brick */}
        <AddBrickSheet
          open={brickSheetState.open}
          parentBlockId={brickSheetState.parentBlockId}
          defaultCategoryId={brickSheetState.defaultCategoryId}
          categories={state.categories}
          onSave={handleSaveBrick}
          onCancel={closeBrickSheet}
          onCreateCategory={handleCreateCategory}
        />
      </div>
    </EditModeProvider>
  );
}
