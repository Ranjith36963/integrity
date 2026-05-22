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

import { useState } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { WeekView } from "@/components/WeekView";
import { YearView } from "@/components/YearView";
import { BuildingClient } from "./BuildingClient";
import { MonthView } from "@/components/MonthView";
import { Toaster } from "@/components/Toaster";

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

  // Derive a key for MonthView so that tapping different months forces remount
  const monthKey = monthTarget
    ? `${monthTarget.year}-${monthTarget.month}`
    : "default";

  return (
    <div className="mx-auto max-w-[430px]">
      {/* Persistent ViewSwitcher — visible in all views */}
      <ViewSwitcher view={view} onSelect={handleSelectView} />
      {/* M7e: Toaster — mounted once as a ViewSwitcher sibling, outside the view branch.
           Lives here so it persists across Day→Week→Month→Year switches (C-m7e-035). */}
      <Toaster />

      {view === "day" ? (
        <BuildingClient state={state} dispatch={dispatch} hydrated={hydrated} />
      ) : view === "week" ? (
        <WeekView state={state} onOpenDay={handleOpenDay} />
      ) : view === "year" ? (
        <YearView state={state} onOpenMonth={handleOpenMonth} />
      ) : (
        <MonthView
          key={monthKey}
          state={state}
          onOpenDay={handleOpenDay}
          initialMonth={monthTarget ?? undefined}
        />
      )}
    </div>
  );
}
