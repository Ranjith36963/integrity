"use client";
/**
 * AppShell — M9c: in-app shell that owns view state + a single usePersistedState().
 * M9d: view type widened to include "week"; WeekView wired for the "week" branch.
 * Resolves SG-m9c-01 and SG-m9c-05.
 *
 * Owns:
 *   - usePersistedState() call — exactly once; [state, dispatch] shared with all views
 *   - const [view, setView] = useState<"day" | "month" | "week">("day") — session-only
 *   - ViewSwitcher (persistent chrome visible in all views)
 *   - BuildingClient (Day view) | MonthView (Month view) | WeekView (Week view)
 *
 * ADR-045: history/currentDate consumed read-only.
 * No new ADR: AppShell is the spec's recommended in-app state pattern (SG-m9c-01).
 */

import { useState } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { WeekView } from "@/components/WeekView";
import { BuildingClient } from "./BuildingClient";
import { MonthView } from "@/components/MonthView";

export function AppShell() {
  // Single usePersistedState() call — shared between Day, Week, and Month views.
  // Moving this hook here (from BuildingClient) ensures:
  //   - No re-hydration on view switch (one pass per app session)
  //   - No dual save effects racing on dharma:v1
  //   - All views see the identical AppState object
  const [state, dispatch] = usePersistedState();

  // Session-only view state — not persisted; refresh returns to Day.
  const [view, setView] = useState<"day" | "month" | "week">("day");

  function handleSelectView(v: "day" | "month" | "week") {
    setView(v);
  }

  function handleOpenDay(isoDate: string) {
    // MonthView / WeekView calls this when today's cell is tapped → switch to Day view
    void isoDate; // today's ISO is passed but we just switch the view
    setView("day");
  }

  return (
    <div className="mx-auto max-w-[430px]">
      {/* Persistent ViewSwitcher — visible in all views */}
      <ViewSwitcher view={view} onSelect={handleSelectView} />

      {view === "day" ? (
        <BuildingClient state={state} dispatch={dispatch} />
      ) : view === "week" ? (
        <WeekView state={state} onOpenDay={handleOpenDay} />
      ) : (
        <MonthView state={state} onOpenDay={handleOpenDay} />
      )}
    </div>
  );
}
