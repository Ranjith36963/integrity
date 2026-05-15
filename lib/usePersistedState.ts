"use client";
/**
 * lib/usePersistedState.ts — M8: two-pass hydration hook.
 * Exports usePersistedState(): [AppState, Dispatch<Action>].
 *
 * Design (plan.md § Hydration design, SG-m8-02):
 * Pass 1: useState initialized from defaultPersisted() projection → SSR + first paint = empty default.
 * Pass 2: useEffect (post-mount) calls loadState() and re-seeds state via setState.
 * Save effect: if (!mounted) return; else saveState(toPersisted(state)) — the mounted guard
 * prevents clobbering a real persisted dharma:v1 before hydration completes (plan § Risks R2).
 *
 * No HYDRATE action added — schema lock honored. Re-seeding is via setState (plan § Risks R3).
 * ADR-044, ADR-018.
 */

import { useState, useEffect, useCallback } from "react";
import type { Dispatch } from "react";
import type { AppState, Action } from "./types";
import { reducer } from "./data";
import { loadState, saveState, defaultPersisted } from "./persist";
import type { PersistedState } from "./persist";

/**
 * projectToAppState — strips schemaVersion from PersistedState (SG-m8-04).
 * schemaVersion is a persist-boundary-only key; AppState never carries it.
 */
function projectToAppState(p: PersistedState): AppState {
  return {
    blocks: p.blocks,
    categories: p.categories,
    looseBricks: p.looseBricks,
    programStart: p.programStart,
  };
}

/**
 * toPersisted — lifts AppState to PersistedState for saveState.
 * schemaVersion: 1 is always correct (this file only supports v1).
 */
function toPersisted(s: AppState): PersistedState {
  return {
    schemaVersion: 1,
    programStart: s.programStart,
    blocks: s.blocks,
    categories: s.categories,
    looseBricks: s.looseBricks,
  };
}

/**
 * usePersistedState() — drop-in replacement for useReducer in BuildingClient.
 * Returns [AppState, Dispatch<Action>].
 */
export function usePersistedState(): [AppState, Dispatch<Action>] {
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
  // Loads persisted state and replaces in-memory state via setState (no HYDRATE action — R3).
  // setMounted(true) after setState so the save effect's mounted guard unblocks only
  // after hydration has completed.
  useEffect(() => {
    const loaded = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- M8 two-pass hydration (plan.md § Hydration design, ADR-018, ADR-044): setState here is intentional — replaces the SSR empty default with the persisted state post-mount. A HYDRATE action is blocked by the M4f schema lock (plan § Risks R3).
    setState(projectToAppState(loaded));
    setMounted(true);
  }, []);

  // Save effect: fires whenever state changes, but ONLY after hydration (mounted guard — R2).
  // The `if (!mounted) return` prevents the empty-default first render from clobbering
  // a real persisted dharma:v1 before pass-2 hydration runs.
  useEffect(() => {
    if (!mounted) return;
    saveState(toPersisted(state));
  }, [mounted, state]);

  return [state, dispatch];
}
