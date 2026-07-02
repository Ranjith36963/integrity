"use client";
/**
 * AppShell — M9c: in-app shell that owns view state + a single usePersistedState().
 * M9d: view type widened to include "week"; WeekView wired for the "week" branch.
 * M9e: view type widened to include "year"; YearView wired for the "year" branch.
 *      monthTarget state added: set by handleOpenMonth (tap-through from YearView),
 *      cleared by handleSelectView (direct ViewSwitcher nav).
 * Resolves SG-m9c-01 and SG-m9c-05.
 *
 * Owns:
 *   - usePersistedState() call — exactly once; [state, dispatch] shared with all views
 *   - const [view, setView] = useState<"day" | "month" | "week" | "year">("day") — session-only
 *   - const [monthTarget, setMonthTarget] = useState<{year:number;month:number}|null>(null) — session-only
 *   - ViewSwitcher (persistent chrome visible in all views)
 *   - BuildingClient (Day view) | MonthView (Month view) | WeekView (Week view) | YearView (Year view)
 *
 * ADR-045: history/currentDate consumed read-only.
 * No new ADR: AppShell is the spec's recommended in-app state pattern (SG-m9c-01).
 */

import { useState, useMemo, useEffect } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { WeekView } from "@/components/WeekView";
import { YearView } from "@/components/YearView";
import { BuildingClient } from "./BuildingClient";
import { MonthView } from "@/components/MonthView";
import type { ArchivedBrickEdit } from "@/lib/pastEdit";
import { Toaster, toast } from "@/components/Toaster";
import { InstallPrompt } from "@/components/InstallPrompt";
import { BurstOverlay, fireBurst } from "@/components/BurstOverlay";
import {
  CommandPalette,
  useCommandPalette,
  type Command,
} from "@/components/CommandPalette";
import { Calendar, CalendarDays, CalendarRange, Snowflake } from "lucide-react";
import {
  freezesRemainingThisMonth,
  currentStreak,
  streakMilestone,
  type StreakMilestone,
} from "@/lib/insights";
import {
  EmpireGlimpse,
  hasMilestoneBeenShown,
  markMilestoneShown,
} from "@/components/EmpireGlimpse";

export function AppShell() {
  // Single usePersistedState() call — shared between Day, Week, Month, and Year views.
  // Moving this hook here (from BuildingClient) ensures:
  //   - No re-hydration on view switch (one pass per app session)
  //   - No dual save effects racing on dharma:v1
  //   - All views see the identical AppState object
  // M7a: third tuple slot `hydrated` is the ADR-023 two-pass-hydration signal.
  // Passed to BuildingClient so it can gate the skeleton / real subtree branch.
  const [state, dispatch, hydrated] = usePersistedState();

  // Session-only view state — not persisted; refresh returns to Day.
  const [view, setView] = useState<"day" | "month" | "week" | "year">("day");

  // Session-only monthTarget — set when tapping a month in YearView (tap-through).
  // null = show today's month. Cleared when navigating via ViewSwitcher.
  const [monthTarget, setMonthTarget] = useState<{
    year: number;
    month: number;
  } | null>(null);

  // Command palette — global ⌘K / Ctrl+K. The hook owns open/close state
  // plus the global keyboard shortcut binding.
  const palette = useCommandPalette();

  // Sci-fi Phase 4e — Empire Glimpse milestone cinematic. The streak
  // calc runs every render but its result is cheap (walks at most ~365
  // days backward). When it lands on 7/30/100/365 AND localStorage
  // hasn't yet stamped that milestone, we mount the overlay. The
  // dismissal path stamps the flag so the same milestone never re-fires.
  const streak = currentStreak(state, state.currentDate);
  const milestone = streakMilestone(streak);
  const [activeMilestone, setActiveMilestone] =
    useState<StreakMilestone | null>(null);
  useEffect(() => {
    if (milestone && !hasMilestoneBeenShown(milestone)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount when a brand-new milestone is reached + not previously stamped. Cascade is impossible because markMilestoneShown writes the gate before the next render reads it.
      setActiveMilestone(milestone);
      markMilestoneShown(milestone);
    }
  }, [milestone]);

  function handleSelectView(v: "day" | "month" | "week" | "year") {
    // Clear monthTarget on direct nav — MonthView initializes to today
    setMonthTarget(null);
    setView(v);
  }

  function handleOpenDay(isoDate: string) {
    // MonthView / WeekView calls this when today's cell is tapped → switch to Day view
    void isoDate; // today's ISO is passed but we just switch the view
    setView("day");
  }

  function handleOpenMonth(year: number, monthIndex: number) {
    // YearView calls this when a MonthCell is tapped → switch to Month view at that month
    setMonthTarget({ year, month: monthIndex });
    setView("month");
  }

  // M11 DEC-2 — route a past-day back-log edit to the matching reducer action.
  // The reducer gates each on canEditPastDay, so an out-of-window edit is a no-op.
  function handleEditArchivedBrick(
    isoDate: string,
    brickId: string,
    edit: ArchivedBrickEdit,
  ) {
    if (edit.kind === "toggle-tick") {
      dispatch({ type: "TOGGLE_ARCHIVED_TICK", isoDate, brickId });
    } else if (edit.kind === "units") {
      dispatch({
        type: "SET_ARCHIVED_UNITS_DONE",
        isoDate,
        brickId,
        done: edit.done,
      });
    } else {
      dispatch({
        type: "SET_ARCHIVED_TIMER_ELAPSED",
        isoDate,
        brickId,
        elapsedSec: edit.elapsedSec,
      });
    }
  }

  // Command palette command set — built from current state so freeze
  // affordance can show remaining quota live. Memoized on state +
  // current view so it doesn't rebuild every render.
  const commands = useMemo<Command[]>(() => {
    const freezesLeft = freezesRemainingThisMonth(state, state.currentDate);
    return [
      {
        id: "view-day",
        label: "Go to Day",
        hint: "Today's timeline",
        shortcut: "1",
        icon: Calendar,
        keywords: ["today", "now", "1"],
        run: () => handleSelectView("day"),
      },
      {
        id: "view-week",
        label: "Go to Week",
        hint: "7-day castle view",
        shortcut: "2",
        icon: CalendarRange,
        keywords: ["week", "7", "castle", "2"],
        run: () => handleSelectView("week"),
      },
      {
        id: "view-month",
        label: "Go to Month",
        hint: "30-day kingdom grid",
        shortcut: "3",
        icon: CalendarDays,
        keywords: ["month", "30", "kingdom", "3"],
        run: () => handleSelectView("month"),
      },
      {
        id: "view-year",
        label: "Go to Year",
        hint: "12-month empire view",
        shortcut: "4",
        icon: CalendarDays,
        keywords: ["year", "12", "empire", "4"],
        run: () => handleSelectView("year"),
      },
      {
        id: "freeze-today",
        label:
          freezesLeft > 0
            ? "Freeze today (protect streak)"
            : "No freezes left this month",
        hint: `${freezesLeft} of 2 remaining`,
        icon: Snowflake,
        keywords: ["freeze", "streak", "protect", "rest", "skip"],
        run: () => {
          if (freezesLeft > 0) {
            dispatch({ type: "FREEZE_DAY", isoDate: state.currentDate });
            toast("Day frozen", "success");
            // Sci-fi Phase 4b — celebratory particle burst at the
            // hero ring's approximate position (top-center, ~30%).
            fireBurst({
              x: window.innerWidth / 2,
              y: window.innerHeight * 0.3,
            });
          } else {
            toast("No freezes left this month", "info");
          }
        },
      },
      // Numeric "view-N" shortcuts implemented elsewhere in a follow-up;
      // for now the palette is the entry point.
    ];
  }, [state, dispatch]);

  // Numeric view shortcuts (1/2/3/4) — registered separately because they're
  // distinct from the palette open keystroke.
  useNumericViewShortcuts(handleSelectView);

  // Derive a key for MonthView so that tapping different months forces remount
  const monthKey = monthTarget
    ? `${monthTarget.year}-${monthTarget.month}`
    : "default";

  return (
    <div role="main" className="mx-auto max-w-[430px]">
      {/* Persistent ViewSwitcher — visible in all views */}
      <ViewSwitcher view={view} onSelect={handleSelectView} />
      {/* M7e: Toaster — mounted once as a ViewSwitcher sibling, outside the view branch.
           Lives here so it persists across Day→Week→Month→Year switches (C-m7e-035). */}
      <Toaster />
      {/* PWA install affordance — null when already-installed, dismissed,
           or browser doesn't support beforeinstallprompt. iOS Safari gets
           a how-to overlay because it has no programmatic install path. */}
      <InstallPrompt />
      {/* Command palette — ⌘K / Ctrl+K opens; ESC closes. Liquid-glass
           overlay on top of everything else (z-80 > z-50 sheets). */}
      <CommandPalette
        open={palette.open}
        onClose={() => palette.setOpen(false)}
        commands={commands}
      />
      {/* Sci-fi Phase 4b — particle burst overlay. Mounted once; the
           fireBurst() helper enqueues a 12-mote scatter at any viewport
           coordinate. Used by the brick-save and freeze-today moments. */}
      <BurstOverlay />
      {/* Sci-fi Phase 4e — streak-milestone cinematic. One-time per
           milestone per user-device, gated by localStorage. z-90 above
           every other overlay so the moment isn't competing. */}
      <EmpireGlimpse
        milestone={activeMilestone}
        onClose={() => setActiveMilestone(null)}
      />

      {view === "day" ? (
        <BuildingClient state={state} dispatch={dispatch} hydrated={hydrated} />
      ) : view === "week" ? (
        <WeekView
          state={state}
          onOpenDay={handleOpenDay}
          onEditArchivedBrick={handleEditArchivedBrick}
        />
      ) : view === "year" ? (
        <YearView state={state} onOpenMonth={handleOpenMonth} />
      ) : (
        <MonthView
          key={monthKey}
          state={state}
          onOpenDay={handleOpenDay}
          initialMonth={monthTarget ?? undefined}
          onEditArchivedBrick={handleEditArchivedBrick}
        />
      )}
    </div>
  );
}

/**
 * Hook: numeric shortcuts 1/2/3/4 route to Day/Week/Month/Year. Lives
 * outside the palette because the shortcuts work app-wide regardless
 * of palette state. Guards against firing while typing in inputs.
 */
function useNumericViewShortcuts(
  onSelect: (v: "day" | "month" | "week" | "year") => void,
): void {
  useEffect(() => {
    function h(e: KeyboardEvent) {
      // Only fire when no modifier is pressed and the target is not an
      // input/textarea — otherwise typing "2" in the title field jumps
      // to Week view, which would be infuriating.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key === "1") onSelect("day");
      else if (e.key === "2") onSelect("week");
      else if (e.key === "3") onSelect("month");
      else if (e.key === "4") onSelect("year");
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onSelect]);
}
