"use client";
// BuildingClient — M4f: timer ripped, brick kinds collapsed to tick+units (ADR-043).
// - M4a features preserved: LOG_TICK_BRICK dispatch, useCrossUpEffect, Fireworks overlay.
// - M4f: LOG_GOAL_BRICK replaced by SET_UNITS_DONE (via UnitsEntrySheet tap-to-open-sheet).
// - M4d NEW: AddChooserSheet inserted between dock-+ / slot-tap and the downstream sheets.
//   - handleDockAdd: opens chooser with defaultStart=roundDownToHour(now)
//   - handleSlotTap: opens chooser with defaultStart=hourToHHMM(hour)
//   - handleChooserPick: routes to AddBlockSheet or AddBrickSheet(null)
//   - handleChooserCancel: closes chooser silently
//   - Inside-block "+ Add brick" (handleAddBrickFromBlock) bypasses chooser — direct path.
//   - Tray "+ Brick" pill (handleAddLooseBrick) bypasses chooser — direct path.
// - roundDownToHour: 1-line local helper — string slice, no Date math (SG-m2-04)
// M4f: removed handleUnitsLog stepper; added handleUnitsOpenSheet → UnitsEntrySheet → handleUnitsSave.
// M9c: usePersistedState() call moved up into AppShell; BuildingClient now receives
//       state + dispatch as props so the hook runs exactly once in the app shell.
// M5: pendingDelete state + DeleteConfirmModal; Timeline fed from currentDayBlocks(state)
//     (ADR-047). Delete handlers: DELETE_BLOCK_TODAY / DELETE_BLOCK_ALL / DELETE_BRICK.
//     onRequestDeleteBlock / onRequestDeleteBrick threaded to Timeline + LooseBricksTray.
// M7a: hydrated?: boolean prop (default true). When false renders skeleton subtree
//      (ADR-023 pass-1 window). When true renders real subtree + stagger on first paint.
//      useFirstPaintAfterHydration drives stagger=true exactly once per mount (AC #2).

import { useState, useCallback } from "react";
import type { Dispatch } from "react";
import { today, dateLabel, dayPct, dayNumber } from "@/lib/dharma";
import { daysInYear } from "@/lib/dayOfYear";
import { useFirstPaintAfterHydration } from "@/lib/firstPaint";
import { useNow } from "@/lib/useNow";
import {
  selectTrayBricks,
  selectTimelineItems,
  selectAllTimedItems,
  findOverlaps,
} from "@/lib/overlap";
import { currentDayBlocks } from "@/lib/currentDayBlocks";
import { useCrossUpEffect } from "@/lib/celebrations";
import { haptics } from "@/lib/haptics";
import { playChime } from "@/lib/audio";
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
import { UnitsEntrySheet } from "@/components/UnitsEntrySheet";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { DeleteTarget } from "@/components/DeleteConfirmModal";
import { Fireworks } from "@/components/Fireworks";
import { Skeleton } from "@/components/Skeleton";
import type { AppState, Action, Block, Brick, Category } from "@/lib/types";

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

interface UnitsSheetState {
  open: boolean;
  brickId: string | null;
}

type BuildingClientProps = {
  state: AppState;
  dispatch: Dispatch<Action>;
  /**
   * M7a: whether the client store has hydrated from localStorage (ADR-023 two-pass).
   * Defaults to true so every pre-M7a caller (and existing tests) gets the real subtree.
   * AppShell passes the third tuple slot from usePersistedState().
   */
  hydrated?: boolean;
};

// ─── M7a skeleton sub-components ─────────────────────────────────────────────
// Inline helpers — not separate files (plan.md § BuildingClient).
// Each mirrors its real counterpart's outer chrome so the swap has zero CLS (AC #6).

/** One segment placeholder inside the BlueprintBar outer chrome */
function BlueprintBarSkeleton() {
  return (
    <section
      aria-label="Day blueprint"
      data-testid="m7a-skeleton-blueprint"
      className="px-5 pb-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <div
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--ink-dim)" }}
        >
          day blueprint
        </div>
      </div>
      <div
        className="relative h-9 overflow-hidden rounded-md border"
        style={{ borderColor: "var(--card-edge)" }}
      >
        <Skeleton variant="segment" />
      </div>
    </section>
  );
}

/** Three block placeholders at canonical y offsets, matching Timeline's vertical span */
function TimelineSkeleton() {
  const OFFSETS = [60, 200, 340] as const;
  return (
    <div
      data-testid="m7a-skeleton-timeline"
      style={{
        position: "relative",
        height: "500px",
        margin: "0 20px",
      }}
    >
      {OFFSETS.map((top) => (
        <div
          key={top}
          data-testid={`m7a-skeleton-block-${top}`}
          style={{ position: "absolute", left: 0, right: 0, top: `${top}px` }}
        >
          <Skeleton variant="block" />
        </div>
      ))}
    </div>
  );
}

/** One chip placeholder inside the LooseBricksTray outer chrome */
function LooseBricksTraySkeleton() {
  return (
    <section
      data-testid="m7a-skeleton-tray"
      style={{ padding: "0 20px", paddingBottom: "8px" }}
    >
      <Skeleton variant="chip" />
    </section>
  );
}

export function BuildingClient({
  state,
  dispatch,
  hydrated = true,
}: BuildingClientProps) {
  // M9c: state + dispatch are now received as props from AppShell.
  // usePersistedState() was moved to AppShell so it runs exactly once in the app shell.
  // All logic below is unchanged.
  // M7a: stagger fires once per mount when hydrated transitions false→true (AC #2).
  const stagger = useFirstPaintAfterHydration(hydrated);
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
  // M4f: UnitsEntrySheet state — opened when a units chip is tapped
  const [unitsSheetState, setUnitsSheetState] = useState<UnitsSheetState>({
    open: false,
    brickId: null,
  });

  // M5: pendingDelete — set when a × is tapped; cleared on modal confirm/cancel.
  // Stays open independent of editMode (ADR plan.md § Modal-open + Edit-Mode-toggle).
  const [pendingDelete, setPendingDelete] = useState<{
    blockId: string | null;
    brickId: string | null;
  } | null>(null);

  // M6: aria-live announcement for reorder events (polite; screen-reader-discoverable).
  const [announcement, setAnnouncement] = useState("");

  // Live clock (ADR-023: server-clock paint on SSR, reconciles within 60s)
  const now = useNow();
  const todayIso = today();

  // M8: dayNumber(programStart, todayIso) replaces dayOfYear(new Date()) (AC #13).
  // programStart comes from persisted AppState (set to today on first run, preserved thereafter).
  // dayNumber returns number | undefined; undefined only if programStart is empty (never in practice).
  // totalDays keeps daysInYear — the program is a one-year arc.
  const dayNumberValue = dayNumber(state.programStart, todayIso);
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

  // M4a: dispatch LOG_TICK_BRICK for tick chip taps; threaded to Timeline + LooseBricksTray
  const handleTickToggle = useCallback(
    (brickId: string) => {
      dispatch({ type: "LOG_TICK_BRICK", brickId });
    },
    [dispatch],
  );

  // M4f: units chip tap → open UnitsEntrySheet for that brick
  const handleUnitsOpenSheet = useCallback((brickId: string) => {
    setUnitsSheetState({ open: true, brickId });
  }, []);

  // M4f: UnitsEntrySheet Save → dispatch SET_UNITS_DONE + close sheet
  const handleUnitsSave = useCallback(
    (brickId: string, done: number) => {
      dispatch({ type: "SET_UNITS_DONE", brickId, done });
      setUnitsSheetState({ open: false, brickId: null });
    },
    [dispatch],
  );

  // M4f: UnitsEntrySheet Cancel → close without dispatch
  const handleUnitsClose = useCallback(() => {
    setUnitsSheetState({ open: false, brickId: null });
  }, []);

  // M5: block × tapped — set pendingDelete (do NOT dispatch yet; modal confirms first)
  const handleRequestDeleteBlock = useCallback((blockId: string) => {
    setPendingDelete({ blockId, brickId: null });
  }, []);

  // M5: brick × tapped — set pendingDelete
  const handleRequestDeleteBrick = useCallback((brickId: string) => {
    setPendingDelete({ blockId: null, brickId });
  }, []);

  // M5: cancel delete — clear pendingDelete, no dispatch
  const handleDeleteCancel = useCallback(() => {
    setPendingDelete(null);
  }, []);

  // M5: "Just today" — dispatch DELETE_BLOCK_TODAY, close modal
  const handleConfirmJustToday = useCallback(() => {
    if (pendingDelete?.blockId) {
      dispatch({ type: "DELETE_BLOCK_TODAY", blockId: pendingDelete.blockId });
    }
    setPendingDelete(null);
  }, [dispatch, pendingDelete]);

  // M5: "All recurrences" — dispatch DELETE_BLOCK_ALL, close modal
  const handleConfirmAll = useCallback(() => {
    if (pendingDelete?.blockId) {
      dispatch({ type: "DELETE_BLOCK_ALL", blockId: pendingDelete.blockId });
    }
    setPendingDelete(null);
  }, [dispatch, pendingDelete]);

  // M5: single "Delete" — dispatch DELETE_BLOCK_ALL (non-recurring block) or DELETE_BRICK
  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete?.blockId) {
      dispatch({ type: "DELETE_BLOCK_ALL", blockId: pendingDelete.blockId });
    } else if (pendingDelete?.brickId) {
      dispatch({ type: "DELETE_BRICK", brickId: pendingDelete.brickId });
    }
    setPendingDelete(null);
  }, [dispatch, pendingDelete]);

  // M6: handleReorderBlock — called by DraggableTimelineBlock after drag ends.
  // Uses the overlap engine pre-dispatch to predict outcome and fire the correct announcement.
  const handleReorderBlock = useCallback(
    (blockId: string, newStart: string, newEnd: string | null) => {
      const candidate = { start: newStart, end: newEnd ?? "24:00" };
      const hits = findOverlaps(candidate, selectAllTimedItems(state), blockId);
      const block = state.blocks.find((b) => b.id === blockId);
      if (hits.length > 0) {
        // Overlap rejection: announce without dispatching (reducer would no-op anyway)
        const hitName = hits[0].name;
        setAnnouncement(
          `Cannot move ${block?.name ?? blockId} — overlaps ${hitName}`,
        );
      } else {
        dispatch({ type: "REORDER_BLOCK", blockId, newStart, newEnd });
        setAnnouncement(`Block ${block?.name ?? blockId} moved to ${newStart}`);
      }
    },
    [dispatch, state],
  );

  // M6: handleReorderBrickInBlock — called by BlockBrickReorderGroup after a brick drag.
  // Dispatches REORDER_BRICK_IN_BLOCK and announces the brick name.
  const handleReorderBrickInBlock = useCallback(
    (blockId: string, fromIndex: number, toIndex: number) => {
      const block = state.blocks.find((b) => b.id === blockId);
      const brick = block?.bricks[fromIndex];
      dispatch({ type: "REORDER_BRICK_IN_BLOCK", blockId, fromIndex, toIndex });
      setAnnouncement(`Brick ${brick?.name ?? "unknown"} moved`);
    },
    [dispatch, state],
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

  // M5: currentDayBlocks filters state.blocks by deletions (ADR-047).
  // Build a filtered-state view so selectTimelineItems/selectTrayBricks operate on visible blocks.
  const visibleBlocks = currentDayBlocks(state);
  const stateForTimeline = { ...state, blocks: visibleBlocks };

  // M4e: tray shows only non-timed loose bricks (selectTrayBricks filters out hasDuration:true).
  // showTray: visible when any blocks exist OR any non-timed loose bricks exist (AC #29).
  const trayBricks = selectTrayBricks(state);
  const showTray = visibleBlocks.length > 0 || trayBricks.length > 0;
  // M4e: Timeline renders blocks + timed loose bricks via selectTimelineItems (AC #28).
  // M5: use stateForTimeline so deleted-today blocks are excluded.
  const timelineItems = selectTimelineItems(stateForTimeline);

  // M5: derive the delete modal target from pendingDelete
  const pendingDeleteTarget: DeleteTarget | null = (() => {
    if (!pendingDelete) return null;
    if (pendingDelete.brickId) return { kind: "brick" };
    if (pendingDelete.blockId) {
      const block = state.blocks.find((b) => b.id === pendingDelete.blockId);
      const recurring = block?.recurrence.kind !== "just-today";
      return { kind: "block", recurring };
    }
    return null;
  })();

  // M4f: find the current units brick for UnitsEntrySheet
  const unitsSheetBrick: Extract<Brick, { kind: "units" }> | null = (() => {
    if (!unitsSheetState.brickId) return null;
    for (const bl of state.blocks) {
      const br = bl.bricks.find((b) => b.id === unitsSheetState.brickId);
      if (br && br.kind === "units") return br;
    }
    for (const br of state.looseBricks) {
      if (br.id === unitsSheetState.brickId && br.kind === "units") return br;
    }
    return null;
  })();

  return (
    <EditModeProvider>
      <div className="relative mx-auto min-h-dvh max-w-[430px]">
        {/* M6: aria-live region — polite, atomic, visually hidden (sr-only equivalent) */}
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            borderWidth: 0,
          }}
        >
          {announcement}
        </span>
        <TopBar />
        <Hero
          dateLabel={dateLabelValue}
          dayNumber={dayNumberValue}
          totalDays={totalDays}
          pct={heroPct}
        />
        {/* M7a: skeleton / real subtree branch (ADR-023 two-pass hydration).
             !hydrated → skeleton placeholders; hydrated → real surfaces + stagger.
             Swap is a single React commit — no overlap of skeleton + real (AC #5). */}
        {!hydrated ? (
          <>
            {/* Skeleton subtree — SG-m7a-02: 1 segment + 3 blocks + 1 chip */}
            <BlueprintBarSkeleton />
            <TimelineSkeleton />
            <LooseBricksTraySkeleton />
          </>
        ) : (
          <>
            {/* BlueprintBar: always rendered (SPEC AC #8 — unconditional) */}
            <BlueprintBar
              blocks={state.blocks}
              categories={state.categories}
              now={now}
              stagger={stagger}
            />
            {/* NowCard: NOT rendered in M2/M3/M4a */}
            <Timeline
              items={timelineItems}
              categories={state.categories}
              now={now}
              onSlotTap={handleSlotTap}
              onAddBrick={handleAddBrickFromBlock}
              onTickToggle={handleTickToggle}
              onUnitsOpenSheet={handleUnitsOpenSheet}
              hasLooseBricks={trayBricks.length > 0}
              onRequestDeleteBlock={handleRequestDeleteBlock}
              onRequestDeleteBrick={handleRequestDeleteBrick}
              onReorderRequest={handleReorderBlock}
              onAnnounce={setAnnouncement}
              onReorderBrickInBlock={handleReorderBrickInBlock}
              modalOpen={pendingDelete !== null}
              stagger={stagger}
            />
            {/* LooseBricksTray: visible when blocks exist OR non-timed loose bricks exist */}
            {showTray && (
              <LooseBricksTray
                looseBricks={trayBricks}
                categories={state.categories}
                onAddBrick={handleAddLooseBrick}
                onTickToggle={handleTickToggle}
                onUnitsOpenSheet={handleUnitsOpenSheet}
                blocksExist={visibleBlocks.length > 0}
                onRequestDeleteBrick={handleRequestDeleteBrick}
                stagger={stagger}
              />
            )}
          </>
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
        {/* M4f: UnitsEntrySheet — opened when a units chip is tapped */}
        <UnitsEntrySheet
          brick={unitsSheetBrick}
          open={unitsSheetState.open}
          onClose={handleUnitsClose}
          onSave={handleUnitsSave}
        />
        {/* M4a: Fireworks overlay — day-100% celebration */}
        <Fireworks active={fireworksActive} />
      </div>
      {/* M5: DeleteConfirmModal — pendingDelete drives open/target; independent of editMode */}
      <DeleteConfirmModal
        open={pendingDelete !== null}
        target={pendingDeleteTarget}
        onConfirmJustToday={handleConfirmJustToday}
        onConfirmAll={handleConfirmAll}
        onConfirmDelete={handleConfirmDelete}
        onCancel={handleDeleteCancel}
      />
    </EditModeProvider>
  );
}
