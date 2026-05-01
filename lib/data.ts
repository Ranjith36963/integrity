// lib/data.ts — wipe-demo: demo constants removed per ADR-020.
// defaultState() is the empty AppState factory; real persistence is wired in the
// `persist` feature. No constants (BLOCKS, NOW, DAY_NUMBER, TOTAL_DAYS,
// TODAY_LABEL) remain in this module.

import type { Block } from "./types";

export interface AppState {
  schemaVersion: 1;
  programStart: string;
  blocks: Block[];
  logs: Record<string, unknown>;
  timers: Record<string, unknown>;
  deletions: Record<string, true>;
}

export function defaultState(): AppState {
  return {
    schemaVersion: 1,
    programStart: "",
    blocks: [],
    logs: {},
    timers: {},
    deletions: {},
  };
}
