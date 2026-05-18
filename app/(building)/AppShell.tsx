"use client";
/**
 * AppShell — M9c: in-app shell that owns view state + a single usePersistedState().
 * Resolves SG-m9c-01 and SG-m9c-05.
 *
 * Owns:
 *   - usePersistedState() call — exactly once; [state, dispatch] shared with both views
 *   - const [view, setView] = useState<"day" | "month">("day") — session-only, not persisted
 *   - ViewSwitcher (persistent chrome visible in both views)
 *   - BuildingClient (Day view) or MonthView (Month view)
 *
 * ADR-045: history/currentDate consumed read-only.
 * No new ADR: AppShell is the spec's recommended in-app state pattern (SG-m9c-01).
 */

import { useState } from "react";
import { usePersistedState } from "@/lib/usePersistedState";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { BuildingClient } from "./BuildingClient";
import { MonthView } from "@/components/MonthView";

export function AppShell() {
  // Single usePersistedState() call — shared between Day and Month views.
  // Moving this hook here (from BuildingClient) ensures:
  //   - No re-hydration on view switch (one pass per app session)
  //   - No dual save effects racing on dharma:v1
  //   - Day and Month see the identical AppState object
  const [state, dispatch] = usePersistedState();

  // Session-only view state — not persisted; refresh returns to Day.
  const [view, setView] = useState<"day" | "month">("day");

  function handleSelectView(v: "day" | "month") {
    setView(v);
  }

  function handleOpenDay(isoDate: string) {
    // MonthView calls this when today's cell is tapped → switch to Day view
    void isoDate; // today's ISO is passed but we just switch the view
    setView("day");
  }

  return (
    <div className="mx-auto max-w-[430px]">
      {/* Persistent ViewSwitcher — visible in both Day and Month views */}
      <ViewSwitcher view={view} onSelect={handleSelectView} />

      {view === "day" ? (
        <BuildingClient state={state} dispatch={dispatch} />
      ) : (
        <MonthView state={state} onOpenDay={handleOpenDay} />
      )}
    </div>
  );
}
