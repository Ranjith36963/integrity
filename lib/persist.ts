/**
 * lib/persist.ts — M5: schema v3 persistence module.
 * ADR-045: schema history read-only; v1→v2→v3 additive migration.
 * ADR-018: single dharma:v1 key, two-pass load, synchronous save.
 * ADR-044: schema version discipline.
 * M5: schemaVersion bumped 2→3; deletions field added (ADR-018).
 * Pure module — no React.
 */

import type { Block, Category, Brick, ArchivedDay } from "./types";
import { today } from "./dharma";

export const STORAGE_KEY = "dharma:v1";
export const SCHEMA_VERSION = 3 as const;

export type PersistedState = {
  schemaVersion: 3;
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  currentDate: string; // ISO YYYY-MM-DD — the date of the in-progress day
  history: Record<string, ArchivedDay>; // keyed by ISO YYYY-MM-DD
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  deletions: Record<string, true>; // M5 — per-day block override map (ADR-018)
};

/**
 * defaultPersisted() — fresh empty v3 state with programStart = currentDate = today().
 * Called on: no-key / corrupt / unknown-version paths inside loadState.
 * Returns a fresh object on every call (no shared mutable arrays).
 */
export function defaultPersisted(): PersistedState {
  return {
    schemaVersion: 3,
    programStart: today(),
    currentDate: today(),
    history: {},
    blocks: [],
    categories: [],
    looseBricks: [],
    deletions: {}, // M5 — empty on first run (ADR-018)
  };
}

/**
 * migrate(raw) — the single version-logic site (ADR-044/ADR-045 scaffold).
 * case 1: v1 → v3 migration (additive, lossless — ADR-044/ADR-045 chain).
 * case 2: v2 → v3 migration (additive, lossless — M5 adds deletions: {}).
 * case 3: v3 load + defensive coercion (M5 new terminus).
 * default: unknown / future schemaVersion (≥4, non-numeric, absent) → null.
 * Returns PersistedState on success, null on unknown/invalid input.
 */
export function migrate(raw: unknown): PersistedState | null {
  // Only non-null plain objects are accepted
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  switch (obj.schemaVersion) {
    case 1: {
      // v1 → v3 migration (additive, lossless — ADR-044/ADR-045).
      // Defensive coercion: absent/non-array collections → []
      const blocks = Array.isArray(obj.blocks) ? (obj.blocks as Block[]) : [];
      const categories = Array.isArray(obj.categories)
        ? (obj.categories as Category[])
        : [];
      const looseBricks = Array.isArray(obj.looseBricks)
        ? (obj.looseBricks as Brick[])
        : [];
      const programStart =
        typeof obj.programStart === "string" ? obj.programStart : today();
      // v1 stored no currentDate — the v1 day's true date is unrecoverable.
      // Accepted one-time migration approximation per ADR-045 / spec Edge case.
      const currentDate = today();
      return {
        schemaVersion: 3,
        programStart,
        currentDate,
        history: {},
        blocks,
        categories,
        looseBricks,
        deletions: {}, // M5 — v1 payloads had no deletions
      };
    }
    case 2: {
      // v2 → v3 migration (M5 additive, lossless — adds deletions: {} to v2 payload).
      const blocks = Array.isArray(obj.blocks) ? (obj.blocks as Block[]) : [];
      const categories = Array.isArray(obj.categories)
        ? (obj.categories as Category[])
        : [];
      const looseBricks = Array.isArray(obj.looseBricks)
        ? (obj.looseBricks as Brick[])
        : [];
      const programStart =
        typeof obj.programStart === "string" ? obj.programStart : today();
      const currentDate =
        typeof obj.currentDate === "string" ? obj.currentDate : today();
      // history must be a non-null, non-array object; otherwise coerce to {}.
      const history: Record<string, ArchivedDay> =
        obj.history !== null &&
        typeof obj.history === "object" &&
        !Array.isArray(obj.history)
          ? (obj.history as Record<string, ArchivedDay>)
          : {};
      return {
        schemaVersion: 3,
        programStart,
        currentDate,
        history,
        blocks,
        categories,
        looseBricks,
        deletions: {}, // M5 — v2 payloads had no deletions; additive and lossless
      };
    }
    case 3: {
      // v3 load + defensive coercion (M5 new terminus).
      const blocks = Array.isArray(obj.blocks) ? (obj.blocks as Block[]) : [];
      const categories = Array.isArray(obj.categories)
        ? (obj.categories as Category[])
        : [];
      const looseBricks = Array.isArray(obj.looseBricks)
        ? (obj.looseBricks as Brick[])
        : [];
      const programStart =
        typeof obj.programStart === "string" ? obj.programStart : today();
      const currentDate =
        typeof obj.currentDate === "string" ? obj.currentDate : today();
      // history must be a non-null, non-array object; otherwise coerce to {}.
      const history: Record<string, ArchivedDay> =
        obj.history !== null &&
        typeof obj.history === "object" &&
        !Array.isArray(obj.history)
          ? (obj.history as Record<string, ArchivedDay>)
          : {};
      // deletions must be a non-null, non-array object; otherwise coerce to {}.
      const deletions: Record<string, true> =
        obj.deletions !== null &&
        typeof obj.deletions === "object" &&
        !Array.isArray(obj.deletions)
          ? (obj.deletions as Record<string, true>)
          : {};
      return {
        schemaVersion: 3,
        programStart,
        currentDate,
        history,
        blocks,
        categories,
        looseBricks,
        deletions,
      };
    }
    default:
      // Unknown or future schemaVersion (≥4, non-numeric, absent) — never guessed at.
      return null;
  }
}

/**
 * loadState() — read and parse dharma:v1 from localStorage.
 * Never throws. Falls back to defaultPersisted() on every error path.
 * Per SG-m8-05: corrupt key is left in place (passive overwrite on next saveState).
 */
export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultPersisted();
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrate(parsed);
    return migrated ?? defaultPersisted();
  } catch {
    return defaultPersisted();
  }
}

/**
 * saveState(state) — serialize and write to localStorage.
 * Synchronous (SG-m8-01 — no debounce). Swallows all errors (quota, disabled).
 * Writes the full v3 shape per M5.
 */
export function saveState(state: PersistedState): void {
  try {
    const json = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      programStart: state.programStart,
      currentDate: state.currentDate,
      history: state.history,
      blocks: state.blocks,
      categories: state.categories,
      looseBricks: state.looseBricks,
      deletions: state.deletions, // M5
    });
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Swallowed: quota exceeded, storage disabled, etc. (SG-m8-05)
  }
}
