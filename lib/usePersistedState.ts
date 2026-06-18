"use client";
/**
 * lib/usePersistedState.ts — M9b: two-pass hydration hook with rollover.
 * Exports usePersistedState(): [AppState, Dispatch<Action>].
 *
 * Design (plan.md § Hydration design, § Hydration wiring M9b, SG-m8-02):
 * Pass 1: useState initialized from defaultPersisted() projection → SSR + first paint = empty default.
 * Pass 2: useEffect (post-mount) calls loadState(), then rollover(loaded, today()) once,
 *          then re-seeds state via setState. today() is the single clock read in the whole path.
 * Save effect: if (!mounted) return; else saveState(toPersisted(state)) — the mounted guard
 * prevents clobbering a real persisted dharma:v1 before hydration completes (plan § Risks R2).
 *
 * No HYDRATE action added — schema lock honored (ADR-043/M4f). Re-seeding via setState (plan § Risks R3).
 * ADR-044 + ADR-045, ADR-018.
 */

import { useState, useEffect, useCallback } from "react";
import type { Dispatch } from "react";
import type { AppState, Action } from "./types";
import { reducer } from "./data";
import {
  loadStateWithReport,
  saveState,
  defaultPersisted,
} from "./persist";
import type { PersistedState } from "./persist";
import { rollover } from "./history";
import { today } from "./dharma";
import { toast } from "@/components/Toaster";

/**
 * projectToAppState — strips schemaVersion from PersistedState (SG-m8-04).
 * schemaVersion is a persist-boundary-only key; AppState never carries it.
 * M9b: also carries currentDate and history through (they are runtime data, not storage metadata).
 */
function projectToAppState(p: PersistedState): AppState {
  return {
    blocks: p.blocks,
    categories: p.categories,
    looseBricks: p.looseBricks,
    programStart: p.programStart,
    currentDate: p.currentDate, // M9b — must round-trip (plan § Data model SG-m9b decision)
    history: p.history, // M9b — must round-trip
    deletions: p.deletions, // M5 — must round-trip (ADR-018)
    firstBrickShown: p.firstBrickShown, // M7e — must round-trip (ADR-044 additive field)
  };
}

/**
 * toPersisted — lifts AppState to PersistedState for saveState.
 * schemaVersion: 3 (M5 bump). currentDate + history + deletions lifted back from AppState.
 */
function toPersisted(s: AppState): PersistedState {
  return {
    schemaVersion: 3,
    programStart: s.programStart,
    currentDate: s.currentDate, // M9b
    history: s.history, // M9b
    blocks: s.blocks,
    categories: s.categories,
    looseBricks: s.looseBricks,
    deletions: s.deletions, // M5 — ADR-018
    firstBrickShown: s.firstBrickShown, // M7e — ADR-044 additive field
  };
}

/**
 * usePersistedState() — drop-in replacement for useReducer in BuildingClient.
 * M7a: Returns [AppState, Dispatch<Action>, boolean] where the third element is
 * `mounted` — the two-pass hydration completion signal (ADR-023).
 * The third slot is backwards-compatible: existing two-element destructures
 * [state, dispatch] continue to work (TS allows two-of-three tuple destructure).
 */
export function usePersistedState(): [AppState, Dispatch<Action>, boolean] {
  // Pass 1: empty default — SSR and first client paint both render this.
  // loadState() is never called here (R1 guard).
  const [state, setState] = useState<AppState>(() =>
    projectToAppState(defaultPersisted()),
  );

  const [mounted, setMounted] = useState(false);

  // Wrapped dispatch: computes next state via reducer and setState.
  // BuildingClient call sites (dispatch({ type: "ADD_BLOCK", ... })) are byte-identical.
  const dispatch = useCallback<Dispatch<Action>>((action) => {
    setState((prev) => reducer(prev, action));
  }, []);

  // Pass 2: post-mount hydration effect — runs once, client only.
  // Loads persisted state, runs rollover(loaded, today()) once (M9b), then re-seeds state.
  // today() is the single clock read in the whole rollover path (plan § Hydration wiring step 4).
  // setMounted(true) after setState so the save effect's mounted guard unblocks only
  // after hydration has completed.
  useEffect(() => {
    // R7-ROOT-1: loadStateWithReport returns both the recovered state and a
    // LoadReport. We surface the report to the user via toast for the two
    // user-visible recovery paths:
    //   - "recovered": some fields were corrupt and reset; user should know.
    //   - "discarded": the whole payload was unparseable; user should know.
    // "fresh", "clean", and "migrated" are silent (normal user paths).
    const { state: loaded, report } = loadStateWithReport();
    const rolled = rollover(loaded, today()); // M9b: rollover once on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- M9b two-pass hydration (plan.md § Hydration wiring, ADR-018, ADR-044, ADR-045): setState here is intentional — replaces the SSR empty default with the post-rollover persisted state post-mount. A HYDRATE action is blocked by the M4f schema lock (plan § Risks R3).
    setState(projectToAppState(rolled));
    setMounted(true);

    if (report.kind === "recovered") {
      toast(
        `Some saved data was reset (${report.resetFields.join(", ")}). Your other data is intact.`,
        "info",
      );
    } else if (report.kind === "discarded") {
      toast("Saved data was unreadable. Starting fresh.", "error");
    }
  }, []);

  // Save effect: fires whenever state changes, but ONLY after hydration (mounted guard — R2).
  // The `if (!mounted) return` prevents the empty-default first render from clobbering
  // a real persisted dharma:v1 before pass-2 hydration runs.
  // First save after a rollover boot persists the post-rollover state — yesterday lands in
  // history on disk (plan § Hydration wiring step 5).
  useEffect(() => {
    if (!mounted) return;
    saveState(toPersisted(state));
  }, [mounted, state]);

  // M7a: expose mounted as the third tuple slot — the "hydrated" signal for BuildingClient.
  // Additive only: existing [state, dispatch] destructures are byte-identical (two-of-three).
  return [state, dispatch, mounted];
}
