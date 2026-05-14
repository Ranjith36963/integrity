"use client";
// BuildingClient — M4d extended from M4a/M4b:
// - M4a features preserved: LOG_TICK_BRICK dispatch, useCrossUpEffect, Fireworks overlay.
// - M4b features preserved: LOG_GOAL_BRICK dispatch.
// - M4d NEW: AddChooserSheet inserted between dock-+ / slot-tap and the downstream sheets.
//   - handleDockAdd: opens chooser with defaultStart=roundDownToHour(now)
//   - handleSlotTap: opens chooser with defaultStart=hourToHHMM(hour)
//   - handleChooserPick: routes to AddBlockSheet or AddBrickSheet(null)
//   - handleChooserCancel: closes chooser silently
//   - Inside-block "+ Add brick" (handleAddBrickFromBlock) bypasses chooser — direct path.
//   - Tray "+ Brick" pill (handleAddLooseBrick) bypasses chooser — direct path.
// - roundDownToHour: 1-line local helper — string slice, no Date math (SG-m2-04)

import { useReducer, useState, useCallback } from "react";
import { today, dateLabel, dayPct } from "@/lib/dharma";
import { dayOfYear, daysInYear } from "@/lib/dayOfYear";
import { useNow } from "@/lib/useNow";
import { reducer, defaultState, withDurationDefaults } from "@/lib/data";
import { selectTrayBricks, selectTimelineItems } from "@/lib/overlap";
import { useCrossUpEffect } from "@/lib/celebrations";
import { haptics } from "@/lib/haptics";
import { playChime } from "@/lib/audio";
import { useTimer, findTimeBrickById } from "@/lib/timer";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import { AddChooserSheet } from "@/components/AddChooserSheet";
import { AddBlockSheet } from "@/components/AddBlockSheet";
import { AddBrickSheet } from "@/components/AddBrickSheet";
import { LooseBricksTray } from "@/components/LooseBricksTray";
import { TimerSheet } from "@/components/TimerSheet";
import { Fireworks } from "@/components/Fireworks";
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

interface ChooserState {
  open: boolean;
  defaultStart: string | null; // captured slot hour ("HH:00"), or null when opened from dock +
}

interface TimerSheetState {
  open: boolean;
  brickId: string | null;
}

export function BuildingClient() {
  // M4e: lazy initializer runs once, applies withDurationDefaults to every brick
  // (defensive migration for pre-M4e brick literals that may lack hasDuration — SG-m4e-06).
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const initial = defaultState();
    return {
      ...initial,
      blocks: initial.blocks.map((bl) => ({
        ...bl,
        bricks: bl.bricks.map(withDurationDefaults),
      })),
      looseBricks: initial.looseBricks.map(withDurationDefaults),
    };
  });
  const [sheetState, setSheetState] = useState<SheetState>({
    open: false,
    defaultStart: "00:00",
  });
  const [brickSheetState, setBrickSheetState] = useState<BrickSheetState>({
    open: false,
    parentBlockId: null,
    defaultCategoryId: null,
  });
  const [fireworksActive, setFireworksActive] = useState(false);
  const [chooserState, setChooserState] = useState<ChooserState>({
    open: false,
    defaultStart: null,
  });
  const [timerSheetState, setTimerSheetState] = useState<TimerSheetState>({
    open: false,
    brickId: null,
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

  // M4a: day-100% cross-up — fires notification haptic + chime + fireworks once per crossing
  const fireDayComplete = useCallback(() => {
    haptics.notification();
    playChime();
    setFireworksActive(true);
    window.setTimeout(() => setFireworksActive(false), 1700);
  }, []);

  useCrossUpEffect(heroPct, 100, fireDayComplete);

  // M4c: single-interval timer hook — manages setInterval + visibilitychange for the running timer
  useTimer(state, dispatch);

  // M4c: tap a time chip → START_TIMER (if stopped) or STOP_TIMER (if running)
  // Depends on state.runningTimerBrickId per plan § Cross-cutting concerns #2 (stale-closure).
  const handleTimerToggle = useCallback(
    (brickId: string) => {
      if (state.runningTimerBrickId === brickId) {
        dispatch({ type: "STOP_TIMER", brickId });
      } else {
        dispatch({ type: "START_TIMER", brickId });
      }
    },
    [state.runningTimerBrickId, dispatch],
  );

  // M4c: long-press a time chip → open TimerSheet with that brick's id
  const handleTimerOpenSheet = useCallback((brickId: string) => {
    setTimerSheetState({ open: true, brickId });
  }, []);

  // M4c: TimerSheet Save → dispatch SET_TIMER_MINUTES; close sheet
  // Depends on timerSheetState.brickId per plan § Cross-cutting concerns #2.
  const handleTimerSave = useCallback(
    (minutes: number) => {
      if (timerSheetState.brickId !== null) {
        dispatch({
          type: "SET_TIMER_MINUTES",
          brickId: timerSheetState.brickId,
          minutes,
        });
      }
      setTimerSheetState({ open: false, brickId: null });
    },
    [timerSheetState.brickId, dispatch],
  );

  // M4c: TimerSheet Cancel → close sheet without dispatching
  const handleTimerCancel = useCallback(() => {
    setTimerSheetState({ open: false, brickId: null });
  }, []);

  // M4a: dispatch LOG_TICK_BRICK for tick chip taps; threaded to Timeline + LooseBricksTray
  const handleTickToggle = useCallback(
    (brickId: string) => {
      dispatch({ type: "LOG_TICK_BRICK", brickId });
    },
    [dispatch],
  );

  // M4b: dispatch LOG_GOAL_BRICK for goal stepper steps; threaded to Timeline + LooseBricksTray
  const handleGoalLog = useCallback(
    (brickId: string, delta: 1 | -1) => {
      dispatch({ type: "LOG_GOAL_BRICK", brickId, delta });
    },
    [dispatch],
  );

  // M4d: dock + → open chooser with defaultStart=roundDownToHour(now) captured at open time.
  // Storing the hour at open time avoids stale-closure risk on `now` inside handleChooserPick
  // (cross-cutting concern #3 from plan.md).
  const handleDockAdd = useCallback(() => {
    setChooserState({ open: true, defaultStart: roundDownToHour(now) });
  }, [now]);

  // M4d: slot tap → open chooser with the tapped hour captured as defaultStart.
  const handleSlotTap = useCallback((hour: number) => {
    setChooserState({ open: true, defaultStart: hourToHHMM(hour) });
  }, []);

  // M4d: chooser pick — close chooser, then open the appropriate downstream sheet.
  // exhaustiveness: switch on 'block' | 'brick' with a default that throws if a
  // third option is ever added without handling it (assertNever pattern from plan.md).
  const handleChooserPick = useCallback(
    (choice: "block" | "brick") => {
      switch (choice) {
        case "block": {
          const start = chooserState.defaultStart ?? roundDownToHour(now);
          setChooserState({ open: false, defaultStart: null });
          setSheetState({ open: true, defaultStart: start });
          break;
        }
        case "brick": {
          setChooserState({ open: false, defaultStart: null });
          setBrickSheetState({
            open: true,
            parentBlockId: null,
            defaultCategoryId: null,
          });
          break;
        }
        default: {
          // Exhaustiveness guard: this branch is unreachable at runtime.
          const _exhaustive: never = choice;
          throw new Error(`Unhandled chooser choice: ${String(_exhaustive)}`);
        }
      }
    },
    [chooserState.defaultStart, now],
  );

  // M4d: chooser cancel — close chooser silently (no downstream sheet, no haptic).
  const handleChooserCancel = useCallback(() => {
    setChooserState({ open: false, defaultStart: null });
  }, []);

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

  // M4e: tray shows only non-timed loose bricks (selectTrayBricks filters out hasDuration:true).
  // showTray: visible when any blocks exist OR any non-timed loose bricks exist (AC #29).
  const trayBricks = selectTrayBricks(state);
  const showTray = state.blocks.length > 0 || trayBricks.length > 0;
  // M4e: Timeline renders blocks + timed loose bricks via selectTimelineItems (AC #28).
  const timelineItems = selectTimelineItems(state);

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
        {/* NowCard: NOT rendered in M2/M3/M4a */}
        <Timeline
          items={timelineItems}
          categories={state.categories}
          now={now}
          onSlotTap={handleSlotTap}
          onAddBrick={handleAddBrickFromBlock}
          onTickToggle={handleTickToggle}
          onGoalLog={handleGoalLog}
          hasLooseBricks={trayBricks.length > 0}
          runningTimerBrickId={state.runningTimerBrickId}
          onTimerToggle={handleTimerToggle}
          onTimerOpenSheet={handleTimerOpenSheet}
        />
        {/* LooseBricksTray: pinned above dock, visible when blocks exist OR non-timed loose bricks exist */}
        {showTray && (
          <LooseBricksTray
            looseBricks={trayBricks}
            categories={state.categories}
            onAddBrick={handleAddLooseBrick}
            onTickToggle={handleTickToggle}
            onGoalLog={handleGoalLog}
            runningTimerBrickId={state.runningTimerBrickId}
            onTimerToggle={handleTimerToggle}
            onTimerOpenSheet={handleTimerOpenSheet}
            blocksExist={state.blocks.length > 0}
          />
        )}
        <BottomBar onAddPress={handleDockAdd} />
        {/* AddChooserSheet: M4d routing surface — opens before AddBlockSheet or AddBrickSheet */}
        <AddChooserSheet
          open={chooserState.open}
          onPick={handleChooserPick}
          onCancel={handleChooserCancel}
        />
        {/* AddBlockSheet: single instance, view state inside */}
        <AddBlockSheet
          open={sheetState.open}
          defaultStart={sheetState.defaultStart}
          categories={state.categories}
          blocks={state.blocks}
          state={state}
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
          state={state}
          onSave={handleSaveBrick}
          onCancel={closeBrickSheet}
          onCreateCategory={handleCreateCategory}
        />
        {/* M4c: TimerSheet — manual minute entry for time bricks */}
        {timerSheetState.open &&
          timerSheetState.brickId !== null &&
          (() => {
            const timerBrick = findTimeBrickById(
              state,
              timerSheetState.brickId,
            );
            return timerBrick ? (
              <TimerSheet
                open={timerSheetState.open}
                brick={timerBrick}
                onSave={handleTimerSave}
                onCancel={handleTimerCancel}
              />
            ) : null;
          })()}
        {/* M4a: Fireworks overlay — day-100% celebration */}
        <Fireworks active={fireworksActive} />
      </div>
    </EditModeProvider>
  );
}
