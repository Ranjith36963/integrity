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

import { useState, useCallback, useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { toast } from "@/components/Toaster";
import { haptics } from "@/lib/haptics";
import { useVoiceCapture } from "@/lib/useVoiceCapture";
import { VoiceCaptureOverlay } from "@/components/VoiceCaptureOverlay";
import { FirstBrickCard } from "@/components/FirstBrickCard";
import {
  today,
  dateLabel,
  dayPct,
  dayNumber,
  isoToLocalDate,
} from "@/lib/dharma";
import { resolveDayStart } from "@/lib/dayWindow";
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
import { useDayCelebrationOnce, celebrate } from "@/lib/celebrations";
import { useReducedMotion, AnimatePresence, motion } from "motion/react";
import { EditModeProvider } from "@/components/EditModeProvider";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { BlueprintBar } from "@/components/BlueprintBar";
import { Timeline } from "@/components/Timeline";
import { BottomBar } from "@/components/BottomBar";
import { AddChooserSheet } from "@/components/AddChooserSheet";
import { AddBlockSheet } from "@/components/AddBlockSheet";
import { Welcome } from "@/components/Welcome";
import { SettingsSheet } from "@/components/SettingsSheet";
import { fireBurst } from "@/components/BurstOverlay";
import {
  hasSeenOnboarding,
  markOnboardingShown,
  hasPersistedState,
} from "@/lib/onboarding";
import { STORAGE_KEY } from "@/lib/persist";
import { AddBrickSheet } from "@/components/AddBrickSheet";
import { LooseBricksTray } from "@/components/LooseBricksTray";
import { UnitsEntrySheet } from "@/components/UnitsEntrySheet";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { DeleteTarget } from "@/components/DeleteConfirmModal";
import { Fireworks } from "@/components/Fireworks";
import { SkylineSweep } from "@/components/SkylineSweep";
import { DayCompleteCard } from "@/components/DayCompleteCard";
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
  /** M10: optional voice-transcript pre-fill for the brick name (AC #9) */
  defaultTitle?: string;
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
  // Welcome overlay — only on a true first visit. Detection via raw
  // localStorage flags (pre-hydration-safe).
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot first-visit detection requires reading window.localStorage which is only available post-mount; SSR-safe two-pass pattern (welcomeOpen starts false → flips true once on the client if storage matches).
    if (!hasPersistedState() && !hasSeenOnboarding()) setWelcomeOpen(true);
  }, []);
  function dismissWelcome() {
    markOnboardingShown();
    setWelcomeOpen(false);
  }
  const [settingsOpen, setSettingsOpen] = useState(false);
  function handleResetAll() {
    // Wipe everything Dharma owns — both the persisted state AND the
    // onboarding flag so the user lands on Welcome again on next visit.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("dharma:onboarding-shown");
    } catch {
      /* private mode / quota — best-effort */
    }
    window.location.reload();
  }
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

  // Log mode: highlights unlogged blocks/bricks from earlier today
  const [logMode, setLogMode] = useState(false);
  function handleLogPress() {
    haptics.light();
    setLogMode((v) => !v);
  }

  // timer: commit accumulated elapsed seconds when a running timer is paused.
  const handleTimerCommit = useCallback(
    (brickId: string, elapsedSec: number) => {
      dispatch({ type: "SET_TIMER_ELAPSED", brickId, elapsedSec });
    },
    [dispatch],
  );

  // M5: pendingDelete — set when a × is tapped; cleared on modal confirm/cancel.
  // Stays open independent of editMode (ADR plan.md § Modal-open + Edit-Mode-toggle).
  const [pendingDelete, setPendingDelete] = useState<{
    blockId: string | null;
    brickId: string | null;
  } | null>(null);

  // M6: aria-live announcement for reorder events (polite; screen-reader-discoverable).
  const [announcement, setAnnouncement] = useState("");

  // M10: voice capture hook — owns the session lifecycle (idle → listening → resolved/error).
  // onTranscript: trimmed final transcript pre-fills the brick name via openBrickSheet.
  // onError: routes failure kinds to toast with the exact copy from plan.md Edge cases table.
  // M10: onTranscript/onError are stable via useCallback (no outer deps); useVoiceCapture
  // uses internal refs so re-created callbacks never retrigger hook effects.
  const handleVoiceTranscript = useCallback((t: string) => {
    openBrickSheet(null, null, t);
  }, []); // empty deps: openBrickSheet only closes over setBrickSheetState (stable setter)

  const handleVoiceError = useCallback(
    (
      kind: "not-allowed" | "no-speech" | "unsupported" | "other",
      msg: string,
    ) => {
      toast(
        msg,
        kind === "not-allowed"
          ? "error"
          : kind === "no-speech"
            ? "info"
            : "error",
      );
    },
    [],
  );
  const voice = useVoiceCapture({
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  // M7e: FirstBrickCard — show on 0→1 brick transition when firstBrickShown was NOT true
  //      at the prior render (ADR-039 first-brick narrative payoff).
  // Tracks BOTH previous brickCount AND previous firstBrickShown to detect the exact crossing.
  // The reducer flips firstBrickShown to true in the same dispatch as ADD_BRICK, so we must
  // use the PREVIOUS value of firstBrickShown (captured before the dispatch) as the gate.
  const brickCount =
    state.blocks.reduce((sum, b) => sum + b.bricks.length, 0) +
    state.looseBricks.length;
  const prevBrickCountRef = useRef<number>(brickCount);
  const prevFirstBrickShownRef = useRef<boolean | undefined>(
    state.firstBrickShown,
  );
  const [firstCardOpen, setFirstCardOpen] = useState(false);

  useEffect(() => {
    const prevCount = prevBrickCountRef.current;
    const prevFlag = prevFirstBrickShownRef.current;
    prevBrickCountRef.current = brickCount;
    prevFirstBrickShownRef.current = state.firstBrickShown;
    // Gate: previous brickCount was 0 AND now is ≥1 AND flag was NOT already true before dispatch.
    if (prevCount === 0 && brickCount >= 1 && prevFlag !== true) {
      setFirstCardOpen(true);
    }
  }, [brickCount, state.firstBrickShown]);

  // Live clock (ADR-023: server-clock paint on SSR, reconciles within 60s)
  const now = useNow();
  const todayIso = today();

  // M8: dayNumber(programStart, todayIso) replaces dayOfYear(new Date()) (AC #13).
  // programStart comes from persisted AppState (set to today on first run, preserved thereafter).
  // dayNumber returns number | undefined; undefined only if programStart is empty (never in practice).
  // totalDays keeps daysInYear — the program is a one-year arc.
  //
  // R3-P2-3: parse todayIso via the shared `isoToLocalDate` helper (lib/dharma.ts)
  // so this call site uses the SAME parse strategy as dayNumber + dateLabel.
  // The helper appends "T00:00:00" to force local-midnight parsing, avoiding
  // the R1-P2-3 Jan-1 negative-UTC-TZ bug (`new Date("2025-01-01")` parses as
  // UTC midnight = 2024-12-31 16:00 PT, getFullYear() returns 2024 → wrong
  // totalDays). Closes R3-P1-1: a mutation of the production parse will now
  // also break dayNumber + dateLabel tests, not just totalDays.
  const dayNumberValue = dayNumber(state.programStart, todayIso);
  const totalDays = daysInYear(isoToLocalDate(todayIso));
  const dateLabelValue = dateLabel(todayIso);

  // M3: dayPct now takes full AppState (blocks + looseBricks)
  const heroPct = dayPct(state);

  // M7d: replace useCrossUpEffect+playChime with useDayCelebrationOnce+celebrate.
  // shouldCelebrate is true for exactly one render on the FIRST 0→100 crossing per mount.
  // celebrate("day", { withAudio: true }) routes haptics + Web Audio chime via the shim (M7f live).
  // PRM-conditional timer: 2000ms under PRM (DayCompleteCard), 1700ms under motion ON (Fireworks).
  // R7-ROOT-M7-P1-2: capture PRM at celebration START so a mid-window OS toggle
  // doesn't desync the in-flight timer from DayCompleteCard's active gate.
  // celebratingPrm holds the frozen PRM value while a celebration is in
  // flight (true | false); null when not celebrating.
  const [celebratingPrm, setCelebratingPrm] = useState<boolean | null>(null);
  // timerIdRef holds the clearTimeout handle so unmount cleanup can cancel it safely.
  const prefersReducedMotion = useReducedMotion();
  const shouldCelebrate = useDayCelebrationOnce(heroPct);
  const dayCelebTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldCelebrate) return;
    celebrate("day", { withAudio: true });
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- M7d plan.md: setFireworksActive(true) is gated by one-shot shouldCelebrate from useDayCelebrationOnce; no cascade. Same precedent as Fireworks.tsx (M4a). */
    setFireworksActive(true);
    // R7-ROOT-M7-P1-2: capture PRM at the moment the celebration starts.
    // The DayCompleteCard active gate reads from this state while a
    // celebration is in flight, freezing PRM until the timer clears.
    // Pre-R7 a mid-window OS PRM toggle could surface the card briefly
    // under newly-enabled PRM or keep Fireworks playing under newly-
    // disabled PRM.
    setCelebratingPrm(Boolean(prefersReducedMotion));
    const delay = prefersReducedMotion ? 2000 : 1700;
    // Store ID in ref so unmount cleanup can cancel safely without returning cleanup here.
    // Returning a cleanup function from this effect would cancel the timer when
    // shouldCelebrate flips false on the next render (triggered by setFireworksActive),
    // defeating the 1700/2000ms celebration window (plan.md M7d PRM-conditional timer).
    dayCelebTimerRef.current = window.setTimeout(() => {
      setFireworksActive(false);
      setCelebratingPrm(null); // release the freeze
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shouldCelebrate is the only trigger dep; prefersReducedMotion is intentionally excluded to prevent React cleanup from cancelling the in-flight timer on the next render where shouldCelebrate flips false (plan.md M7d PRM-conditional timer invariant).
  }, [shouldCelebrate]);

  // Unmount cleanup: cancel the in-flight timer if the component unmounts early.
  useEffect(() => {
    return () => {
      if (dayCelebTimerRef.current !== null) {
        window.clearTimeout(dayCelebTimerRef.current);
      }
    };
  }, []);

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
      toast("Block deleted", "info"); // M7e: AC #10 block-delete toast
    }
    setPendingDelete(null);
  }, [dispatch, pendingDelete]);

  // M5: "All recurrences" — dispatch DELETE_BLOCK_ALL, close modal
  const handleConfirmAll = useCallback(() => {
    if (pendingDelete?.blockId) {
      dispatch({ type: "DELETE_BLOCK_ALL", blockId: pendingDelete.blockId });
      toast("Block deleted", "info"); // M7e: AC #10 block-delete toast
    }
    setPendingDelete(null);
  }, [dispatch, pendingDelete]);

  // M5: single "Delete" — dispatch DELETE_BLOCK_ALL (non-recurring block) or DELETE_BRICK
  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete?.blockId) {
      dispatch({ type: "DELETE_BLOCK_ALL", blockId: pendingDelete.blockId });
      toast("Block deleted", "info"); // M7e: AC #10 block-delete toast
    } else if (pendingDelete?.brickId) {
      dispatch({ type: "DELETE_BRICK", brickId: pendingDelete.brickId });
      toast("Brick deleted", "info"); // M7e: AC #10 brick-delete toast
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
    defaultTitle?: string,
  ) {
    setBrickSheetState({
      open: true,
      parentBlockId,
      defaultCategoryId,
      defaultTitle,
    });
  }

  function closeBrickSheet() {
    setBrickSheetState((s) => ({ ...s, open: false }));
  }

  function handleSave(block: Block) {
    // Overnight blocks (end < start, e.g. Sleep 22:00→04:00) are stored as ONE
    // block now — the wake-to-wake timeline (day anchor) renders them as a single
    // continuous span, so no midnight split is needed.
    dispatch({ type: "ADD_BLOCK", block });
    toast("Block created", "success"); // M7e: AC #10 block-add toast
    closeSheet();
  }

  function handleSaveBrick(brick: Brick) {
    dispatch({ type: "ADD_BRICK", brick });
    toast("Brick added", "success"); // M7e: AC #10 brick-add toast
    closeBrickSheet();
    // Sci-fi Phase 4b — celebratory particle scatter at the hero
    // region (~30% from top) so the user's eye is drawn upward to
    // the day-pct numeral they just incremented. fireBurst is a no-op
    // server-side, and is a CSS-only animation client-side.
    if (typeof window !== "undefined") {
      fireBurst({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.3,
      });
    }
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

  // Effective wake-to-wake anchor for the day being shown: weekend wake time on
  // Sat/Sun, weekday wake time otherwise (each falling back sensibly when unset).
  const effectiveDayStart = resolveDayStart(
    state.dayStart,
    state.weekendDayStart,
    state.currentDate,
  );

  // M4e: tray shows only non-timed loose bricks (selectTrayBricks filters out hasDuration:true).
  // showTray: visible when any blocks exist OR any non-timed loose bricks exist (AC #29).
  const trayBricks = selectTrayBricks(state);
  const showTray = visibleBlocks.length > 0 || trayBricks.length > 0;
  // M4e: Timeline renders blocks + timed loose bricks via selectTimelineItems (AC #28).
  // M5: use stateForTimeline so deleted-today blocks are excluded.
  const timelineItems = selectTimelineItems(stateForTimeline);

  // Log mode: compute which blocks/bricks are "incomplete" (have started but still unlogged).
  // A brick is incomplete when: tick && !done, or units && done < target.
  // A block is incomplete when it has started (start ≤ now) AND has at least one incomplete brick.
  const brickIncomplete = (br: Brick): boolean =>
    (br.kind === "tick" && !br.done) ||
    (br.kind === "units" && br.done < br.target) ||
    (br.kind === "timer" && br.elapsedSec < br.targetMin * 60);
  const logIncompleteBlockIds = new Set<string>(
    visibleBlocks
      .filter(
        (block) => block.start <= now && block.bricks.some(brickIncomplete),
      )
      .map((b) => b.id),
  );
  const logIncompleteBrickIds = new Set<string>(
    trayBricks.filter(brickIncomplete).map((br) => br.id),
  );
  const logPendingCount =
    logIncompleteBlockIds.size + logIncompleteBrickIds.size;

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
      {welcomeOpen && <Welcome onBegin={dismissWelcome} />}
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
        <TopBar state={state} onOpenSettings={() => setSettingsOpen(true)} />

        {/* Log mode banner — slides in below TopBar when LOG is tapped */}
        <AnimatePresence>
          {logMode && (
            <motion.div
              data-testid="log-mode-banner"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px 8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 6px 2px rgba(74,222,128,0.5)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-11, 11px)",
                    color: "#4ade80",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  {logPendingCount > 0
                    ? `${logPendingCount} to log`
                    : "All logged"}
                </span>
              </div>
              <button
                type="button"
                aria-label="Exit log mode"
                onClick={() => setLogMode(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12, 12px)",
                  color: "var(--ink-dim)",
                  padding: "4px 8px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <SettingsSheet
          open={settingsOpen}
          state={state}
          onClose={() => setSettingsOpen(false)}
          onResetAll={handleResetAll}
          onFreezeToday={() =>
            dispatch({ type: "FREEZE_DAY", isoDate: state.currentDate })
          }
          weekdayStart={state.dayStart ?? "04:00"}
          weekendStart={state.weekendDayStart ?? state.dayStart ?? "04:00"}
          onSetDayStart={(kind, v) =>
            dispatch({ type: "SET_DAY_START", kind, dayStart: v })
          }
        />
        <Hero
          dateLabel={dateLabelValue}
          dayNumber={dayNumberValue}
          totalDays={totalDays}
          pct={heroPct}
          firstPaintCountUp={stagger}
          hydrated={
            hydrated
          } /* R7-ROOT-5: hide SSR clock until client locks in */
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
              dayStart={effectiveDayStart}
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
              logMode={logMode}
              logIncompleteBlockIds={logIncompleteBlockIds}
              onTimerCommit={handleTimerCommit}
              dayStart={effectiveDayStart}
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
                logMode={logMode}
                logIncompleteBrickIds={logIncompleteBrickIds}
                onTimerCommit={handleTimerCommit}
              />
            )}
          </>
        )}
        <BottomBar
          onAddPress={handleDockAdd}
          onQuickBrick={handleLogPress}
          onMicPress={voice.toggle}
          micSupported={voice.supported}
          listening={voice.status === "listening"}
        />
        {/* M10: VoiceCaptureOverlay — listening modal (AC #4, #5, #6, #8) */}
        <VoiceCaptureOverlay
          open={voice.status === "listening"}
          interim={voice.interim}
          onCancel={voice.cancel}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
        />
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
          defaultTitle={brickSheetState.defaultTitle}
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
        {/* M7e: FirstBrickCard — slides up on first-ever brick (ADR-039 narrative payoff).
             Visible when firstCardOpen=true; auto-dismisses after 3000 ms or on tap.
             z-index 40 (above dock z-20, below sheet z-50). */}
        <FirstBrickCard
          visible={firstCardOpen}
          onDismiss={() => setFirstCardOpen(false)}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
        />
        {/* M4a: Fireworks overlay — day-100% celebration (motion ON path) */}
        {/* R7-ROOT-R2-P1-2: prmOverride keeps Fireworks symmetric with
            DayCompleteCard's frozen-PRM gate. Pre-R2 only the card was
            frozen — Fireworks read live PRM and could vanish mid-burst. */}
        <Fireworks active={fireworksActive} prmOverride={celebratingPrm} />
        {/* Sci-fi Phase 4c — day-complete skyline scanner. Same active
            gate as Fireworks; both run in parallel for the 1700ms
            celebration window. PRM users see neither — they get the
            DayCompleteCard text below. */}
        <SkylineSweep active={fireworksActive && !celebratingPrm} />
        {/* M7d: DayCompleteCard — PRM-only "Day complete." text card.
            active predicate: fireworksActive && prefersReducedMotion.
            Under motion ON: prefersReducedMotion===false → card receives active={false} → renders null.
            Under PRM: Fireworks returns null (M4a behavior preserved); card mounts for 2000ms. */}
        <DayCompleteCard
          active={Boolean(
            fireworksActive &&
            // R7-ROOT-M7-P1-2: read from frozen state while a celebration
            // is in flight; fall back to live PRM otherwise (defensive).
            (celebratingPrm ?? prefersReducedMotion),
          )}
        />
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
