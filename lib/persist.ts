/**
 * lib/persist.ts — M8: localStorage persistence module.
 * ADR-044: persisted shape { schemaVersion: 1, programStart, blocks, categories, looseBricks }.
 * ADR-018: single dharma:v1 key, two-pass load, synchronous save.
 * Pure module — no React.
 */

import type { Block, Category, Brick } from "./types";
import { today } from "./dharma";

export const STORAGE_KEY = "dharma:v1";
export const SCHEMA_VERSION = 1 as const;

export type PersistedState = {
  schemaVersion: 1;
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};

/**
 * defaultPersisted() — fresh empty state with programStart = today().
 * Called on: no-key / corrupt / unknown-version paths inside loadState.
 * Returns a fresh object on every call (no shared mutable arrays).
 */
export function defaultPersisted(): PersistedState {
  return {
    schemaVersion: 1,
    programStart: today(),
    blocks: [],
    categories: [],
    looseBricks: [],
  };
}

/**
 * migrate(raw) — the single version-logic site (ADR-044 scaffold).
 * M5 will extend this with a case 2 + migrateV1toV2.
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
      return {
        schemaVersion: 1,
        programStart,
        blocks,
        categories,
        looseBricks,
      };
    }
    default:
      // Unknown or absent schemaVersion — forward-incompatible data not guessed at
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
 */
export function saveState(state: PersistedState): void {
  try {
    const json = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      programStart: state.programStart,
      blocks: state.blocks,
      categories: state.categories,
      looseBricks: state.looseBricks,
    });
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Swallowed: quota exceeded, storage disabled, etc. (AC #11, SG-m8-05)
  }
}
