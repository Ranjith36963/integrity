/**
 * lib/persist.ts — M9b: schema v2 persistence module.
 * ADR-045: persisted shape { schemaVersion: 2, programStart, currentDate, history, blocks, categories, looseBricks }.
 * ADR-044: schema v1 migration path retained.
 * ADR-018: single dharma:v1 key, two-pass load, synchronous save.
 * Pure module — no React.
 */

import type { Block, Category, Brick, ArchivedDay } from "./types";
import { today } from "./dharma";

export const STORAGE_KEY = "dharma:v1";
export const SCHEMA_VERSION = 2 as const;

export type PersistedState = {
  schemaVersion: 2;
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  currentDate: string; // ISO YYYY-MM-DD — the date of the in-progress day
  history: Record<string, ArchivedDay>; // keyed by ISO YYYY-MM-DD
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};

/**
 * defaultPersisted() — fresh empty v2 state with programStart = currentDate = today().
 * Called on: no-key / corrupt / unknown-version paths inside loadState.
 * Returns a fresh object on every call (no shared mutable arrays).
 */
export function defaultPersisted(): PersistedState {
  return {
    schemaVersion: 2,
    programStart: today(),
    currentDate: today(),
    history: {},
    blocks: [],
    categories: [],
    looseBricks: [],
  };
}

/**
 * migrate(raw) — the single version-logic site (ADR-044/ADR-045 scaffold).
 * case 1: v1 → v2 migration (ADR-045).
 * case 2: v2 load + defensive coercion.
 * default: unknown / future schemaVersion → null.
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
      // v1 → v2 migration (ADR-045).
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
        schemaVersion: 2,
        programStart,
        currentDate,
        history: {},
        blocks,
        categories,
        looseBricks,
      };
    }
    case 2: {
      // v2 load with defensive coercion (ADR-045 § case 2 arm).
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
        schemaVersion: 2,
        programStart,
        currentDate,
        history,
        blocks,
        categories,
        looseBricks,
      };
    }
    default:
      // Unknown or future schemaVersion (≥3, non-numeric, absent) — never guessed at.
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
 * Writes the full v2 shape per ADR-045.
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
    });
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Swallowed: quota exceeded, storage disabled, etc. (AC #11, SG-m8-05)
  }
}
