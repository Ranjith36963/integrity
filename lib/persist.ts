/**
 * lib/persist.ts — M5: schema v3 persistence module.
 * ADR-045: schema history read-only; v1→v2→v3 additive migration.
 * ADR-018: single dharma:v1 key, two-pass load, synchronous save.
 * ADR-044: schema version discipline.
 * M5: schemaVersion bumped 2→3; deletions field added (ADR-018).
 * M7e: firstBrickShown optional field added (ADR-044 additive — no version bump).
 *
 * R7-ROOT-1: SHAPE validation via valibot (lib/persistSchemas.ts), replacing
 * the previous type-only coercion. Per-field recovery: any single corrupted
 * field resets to default; the rest are preserved. The UI hook surfaces the
 * reset list via a toast.
 *
 * Pure module — no React.
 */

import * as v from "valibot";
import type { Block, Category, Brick, ArchivedDay } from "./types";
import { today } from "./dharma";
import {
  archivedDaySchema,
  blockSchema,
  brickSchema,
  categorySchema,
  deletionsSchema,
  freezesSchema,
  isoDateSchema,
  persistedStateV3Schema,
  type PersistedFieldName,
} from "./persistSchemas";

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
  freezes?: Record<string, true>; // Streak-freeze: ISO-YYYY-MM-DD → true. Additive field.
  firstBrickShown?: boolean; // M7e — additive within v3 (ADR-044 "optional fields are an additive change").
};

/**
 * LoadReport — surfaced by loadStateWithReport() so the UI hook can toast
 * the user when corrupted data was partially recovered.
 *
 * - kind: "fresh"       — no key in storage; defaults returned.
 * - kind: "clean"       — key present, parsed fully clean.
 * - kind: "migrated"    — key present, came from older schema version.
 * - kind: "recovered"   — key present, some fields were corrupt and were
 *                         reset to defaults; resetFields lists which.
 * - kind: "discarded"   — key present, but UNRECOVERABLE (e.g. JSON parse
 *                         error, or unknown schemaVersion); defaults returned.
 */
export type LoadReport =
  | { kind: "fresh" }
  | { kind: "clean" }
  | { kind: "migrated"; fromVersion: number }
  | {
      kind: "recovered";
      resetFields: PersistedFieldName[];
      // R7-ROOT-M8/M9-P0: when 1+ archived days inside `history` fail validation
      // but other days are good, the per-day recovery flow drops the bad ones
      // and keeps the rest — instead of resetting the entire history field.
      // droppedHistoryDays lists the ISO dates that were dropped, so the UI
      // can include them in the recovery toast.
      droppedHistoryDays?: string[];
    }
  | { kind: "discarded"; reason: "json" | "unknown-version" | "non-object" };

/**
 * hasAnyBrick — M7e: pure predicate for the firstBrickShown back-fill rule.
 * Returns true iff any block has at least one brick OR looseBricks.length > 0.
 *
 * @internal — exported for direct testability (SG-m7e-06 ratification).
 */
export function hasAnyBrick(blocks: Block[], looseBricks: Brick[]): boolean {
  if (looseBricks.length > 0) return true;
  return blocks.some((b) => Array.isArray(b.bricks) && b.bricks.length > 0);
}

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
    firstBrickShown: false, // M7e — first-run users have NOT yet earned the card (ADR-039)
  };
}

/**
 * R7-ROOT-1 per-field recovery: parse each top-level field with valibot.
 * Any failure → reset that field to its default and append the field name to
 * `resetFields`. Good fields are preserved.
 *
 * Returns the recovered state + the list of fields that were reset.
 * `resetFields` is empty on clean v3 input.
 */
function parsePerField(obj: Record<string, unknown>): {
  state: PersistedState;
  resetFields: PersistedFieldName[];
  droppedHistoryDays: string[];
} {
  const defaults = defaultPersisted();
  const resetFields: PersistedFieldName[] = [];
  const droppedHistoryDays: string[] = [];

  // For each field: try schema parse. On failure, fall back to default and
  // record the name.
  function pick<T>(
    field: PersistedFieldName,
    schema: v.GenericSchema<unknown, T>,
    fallback: T,
  ): T {
    const result = v.safeParse(schema, obj[field]);
    if (result.success) return result.output;
    resetFields.push(field);
    return fallback;
  }

  const programStart = pick(
    "programStart",
    isoDateSchema,
    defaults.programStart,
  );
  const currentDate = pick("currentDate", isoDateSchema, defaults.currentDate);

  // R7-ROOT-M8/M9-P0: history needs PER-DAY recovery, not all-or-nothing.
  // The previous `pick("history", historySchema, ...)` was all-or-nothing —
  // a single corrupted ArchivedDay in one ISO key wiped out every other day.
  // That was especially dangerous given ADR-045 calls history "read-only":
  // a future additive change to blockSchema (e.g. new required field) would
  // invalidate every legacy day in one go.
  //
  // The per-day flow:
  //   - Reject the whole history field only if it's not a plain object.
  //   - For each ISO key: validate the key shape AND the value's ArchivedDay
  //     shape. Bad days are dropped (added to droppedHistoryDays); good days
  //     are kept. If 1+ days are dropped, history is reported as "recovered"
  //     but NOT as fully reset.
  let history: Record<string, ArchivedDay>;
  if (
    obj.history === null ||
    typeof obj.history !== "object" ||
    Array.isArray(obj.history)
  ) {
    history = defaults.history;
    resetFields.push("history");
  } else {
    history = {};
    const rawHistory = obj.history as Record<string, unknown>;
    for (const isoKey of Object.keys(rawHistory)) {
      const keyParse = v.safeParse(isoDateSchema, isoKey);
      const dayParse = v.safeParse(archivedDaySchema, rawHistory[isoKey]);
      if (keyParse.success && dayParse.success) {
        history[isoKey] = dayParse.output;
      } else {
        droppedHistoryDays.push(isoKey);
      }
    }
  }

  const blocks = pick("blocks", v.array(blockSchema), defaults.blocks);
  const categories = pick(
    "categories",
    v.array(categorySchema),
    defaults.categories,
  );
  const looseBricks = pick(
    "looseBricks",
    v.array(brickSchema),
    defaults.looseBricks,
  );
  const deletions = pick("deletions", deletionsSchema, defaults.deletions);

  // freezes is optional (additive field). Absent → empty object; corrupt →
  // reset to empty + record in resetFields.
  let freezes: Record<string, true>;
  if (obj.freezes === undefined) {
    freezes = {};
  } else {
    const fz = v.safeParse(freezesSchema, obj.freezes);
    if (fz.success) {
      freezes = fz.output;
    } else {
      resetFields.push("freezes");
      freezes = {};
    }
  }

  // firstBrickShown is optional; absent → back-fill via hasAnyBrick (not a reset).
  let firstBrickShown: boolean;
  if (obj.firstBrickShown === undefined) {
    firstBrickShown = hasAnyBrick(blocks, looseBricks);
  } else {
    const fbs = v.safeParse(v.boolean(), obj.firstBrickShown);
    if (fbs.success) {
      firstBrickShown = fbs.output;
    } else {
      resetFields.push("firstBrickShown");
      firstBrickShown = hasAnyBrick(blocks, looseBricks);
    }
  }

  return {
    state: {
      schemaVersion: 3,
      programStart,
      currentDate,
      history,
      blocks,
      categories,
      looseBricks,
      deletions,
      freezes,
      firstBrickShown,
    },
    resetFields,
    droppedHistoryDays,
  };
}

/**
 * migrateWithReport(raw) — same as migrate() but returns the LoadReport too.
 * Internal-grade helper for the loadStateWithReport() flow.
 */
function migrateWithReport(
  raw: unknown,
): { state: PersistedState; report: LoadReport } | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  switch (obj.schemaVersion) {
    case 1: {
      // v1 → v3: per-field recover what's there. v1 stored no currentDate;
      // seed via defaults (ADR-045 edge case). Don't report as a "reset" —
      // it's an expected migration consequence.
      const recovered = parsePerField({ ...obj, schemaVersion: 3 });
      return {
        state: recovered.state,
        report: { kind: "migrated", fromVersion: 1 },
      };
    }
    case 2: {
      // v2 → v3: M5 added `deletions`. Per-field recovery handles the rest.
      const recovered = parsePerField({ ...obj, schemaVersion: 3 });
      return {
        state: recovered.state,
        report: { kind: "migrated", fromVersion: 2 },
      };
    }
    case 3: {
      const recovered = parsePerField(obj);
      // R7-ROOT-M8/M9-P0: a recovered report fires when either top-level
      // fields were reset OR specific history days were dropped. Pre-R7
      // dropped days never surfaced — the whole history field was
      // either clean or fully reset.
      const cleanFields = recovered.resetFields.length === 0;
      const cleanHistory = recovered.droppedHistoryDays.length === 0;
      if (cleanFields && cleanHistory) {
        return { state: recovered.state, report: { kind: "clean" } };
      }
      return {
        state: recovered.state,
        report: {
          kind: "recovered",
          resetFields: recovered.resetFields,
          ...(recovered.droppedHistoryDays.length > 0
            ? { droppedHistoryDays: recovered.droppedHistoryDays }
            : {}),
        },
      };
    }
    default:
      return null;
  }
}

/**
 * migrate(raw) — backward-compat signature.
 * Single version-logic site (ADR-044/ADR-045 scaffold).
 *
 * R7-ROOT-1: callers that want the LoadReport (e.g., UI hook that toasts the
 * user when corruption was recovered) should use loadStateWithReport()
 * instead of migrate(). This function preserves the pre-R7 contract:
 * `PersistedState | null`.
 */
export function migrate(raw: unknown): PersistedState | null {
  const result = migrateWithReport(raw);
  return result === null ? null : result.state;
}

/**
 * loadStateWithReport() — read+parse with a LoadReport for the UI.
 * Never throws. Falls back to defaultPersisted() on every error path.
 * Per SG-m8-05: corrupt key is left in place (passive overwrite on next save).
 */
export function loadStateWithReport(): {
  state: PersistedState;
  report: LoadReport;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null)
      return { state: defaultPersisted(), report: { kind: "fresh" } };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        state: defaultPersisted(),
        report: { kind: "discarded", reason: "json" },
      };
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {
        state: defaultPersisted(),
        report: { kind: "discarded", reason: "non-object" },
      };
    }
    const migrated = migrateWithReport(parsed);
    if (migrated === null) {
      return {
        state: defaultPersisted(),
        report: { kind: "discarded", reason: "unknown-version" },
      };
    }
    return migrated;
  } catch {
    // localStorage access can throw in some environments (Safari private mode).
    return { state: defaultPersisted(), report: { kind: "fresh" } };
  }
}

/**
 * loadState() — backward-compat thin wrapper. Returns only the state.
 * New callers should prefer loadStateWithReport() so the UI can surface the
 * recovery report to the user (toast).
 */
export function loadState(): PersistedState {
  return loadStateWithReport().state;
}

/**
 * saveState(state) — serialize and write to localStorage.
 * Synchronous (SG-m8-01 — no debounce). Swallows all errors (quota, disabled).
 * Writes the full v3 shape per M5.
 *
 * R7-ROOT-1: writes are validated against persistedStateV3Schema in dev only
 * (process.env.NODE_ENV !== "production"). A failed write is logged but still
 * attempted — corruption-on-write is a real bug we want to know about in dev.
 */
export function saveState(state: PersistedState): void {
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      programStart: state.programStart,
      currentDate: state.currentDate,
      history: state.history,
      blocks: state.blocks,
      categories: state.categories,
      looseBricks: state.looseBricks,
      deletions: state.deletions, // M5
      freezes: state.freezes ?? {}, // Streak-freeze — empty object when never used
      firstBrickShown: state.firstBrickShown ?? false, // M7e — ?? false: undefined coerces to false
    };
    if (process.env.NODE_ENV !== "production") {
      const result = v.safeParse(persistedStateV3Schema, payload);
      if (!result.success) {
        // Surface in dev only — production swallows to avoid white-screening
        // a user whose in-memory state somehow drifted out of contract.
        console.error(
          "[persist] save payload failed v3 schema:",
          result.issues,
        );
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Swallowed: quota exceeded, storage disabled, etc. (SG-m8-05)
  }
}
