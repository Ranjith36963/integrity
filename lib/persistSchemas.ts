/**
 * lib/persistSchemas.ts — valibot schemas for persisted state shape validation.
 *
 * Root-cause fix for the persist.ts type-coercion gap (R5-P2-1 + a class of
 * silent-garbage bugs). Previously persist.ts only checked `typeof === "string"`
 * on each field — corrupted localStorage could carry malformed values through to
 * downstream helpers, where `new Date("garbage")` → Invalid Date → silent NaN.
 *
 * These schemas validate SHAPE as well as type. The migrate() flow in persist.ts
 * runs each field through its own schema and keeps GOOD fields while resetting
 * only the corrupt ones to defaults — per the "reset only bad parts" policy.
 *
 * Adding/changing fields:
 *   - Additive field → add an `optional()` schema + a default in
 *     defaultPersisted(). No version bump (per ADR-044).
 *   - Required field → bump SCHEMA_VERSION + add a migration case in
 *     persist.ts::migrate().
 *
 * NOTE: schemas mirror lib/types.ts exactly. If the types ever drift, the
 * vitest run picks it up because the test fixtures import the production types
 * AND parse through these schemas.
 */
import * as v from "valibot";

// "YYYY-MM-DD" — 10 chars, all-digit positions strict.
export const isoDateSchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
);

// "HH:MM" — 24-hour, allows 00:00..23:59 strict.
export const hhmmSchema = v.pipe(
  v.string(),
  v.regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    "Expected HH:MM in 24-hour format (00:00..23:59)",
  ),
);

// Recurrence union (lib/types.ts:Recurrence).
export const recurrenceSchema = v.variant("kind", [
  v.object({
    kind: v.literal("just-today"),
    date: isoDateSchema,
  }),
  v.object({
    kind: v.literal("every-weekday"),
  }),
  v.object({
    kind: v.literal("every-weekend"),
  }),
  v.object({
    kind: v.literal("every-day"),
  }),
  v.object({
    kind: v.literal("custom-range"),
    start: isoDateSchema,
    end: isoDateSchema,
    weekdays: v.array(
      v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
    ),
  }),
]);

// Category (lib/types.ts:Category).
export const categorySchema = v.object({
  id: v.string(),
  name: v.string(),
  // color is one of the design tokens — keep as string for forward compat
  // when new tokens are added. Empty string is rejected.
  color: v.pipe(v.string(), v.minLength(1)),
});

// Brick (lib/types.ts:Brick — discriminated union on `kind`).
// BrickBase fields are repeated in each variant rather than via composition,
// since valibot's variant matcher requires a discriminator at the top level.
const brickBaseFields = {
  id: v.string(),
  name: v.string(),
  categoryId: v.nullable(v.string()),
  parentBlockId: v.nullable(v.string()),
  hasDuration: v.boolean(),
  start: v.optional(hhmmSchema),
  end: v.optional(hhmmSchema),
  recurrence: v.optional(recurrenceSchema),
};

export const brickSchema = v.variant("kind", [
  v.object({
    ...brickBaseFields,
    kind: v.literal("tick"),
    done: v.boolean(),
  }),
  v.object({
    ...brickBaseFields,
    kind: v.literal("units"),
    // R7-ROOT-M3-P2-4: target must be a finite, POSITIVE number (NaN/Infinity
    // rejected; minValue 1 matches the UI's isValidBrickUnitsTarget). Pre-R7
    // a persisted target=0 round-tripped cleanly but brickPct() then
    // short-circuited to silent always-0 — visible bug if the user ever
    // touched corrupted state.
    target: v.pipe(v.number(), v.finite(), v.minValue(1)),
    unit: v.string(),
    done: v.pipe(v.number(), v.finite(), v.minValue(0)),
  }),
  // timer — additive variant (no schema version bump). Existing v3 tick/units
  // data still validates; a timer brick is simply a newly-allowed shape.
  v.object({
    ...brickBaseFields,
    kind: v.literal("timer"),
    targetMin: v.pipe(v.number(), v.finite(), v.minValue(1)),
    elapsedSec: v.pipe(v.number(), v.finite(), v.minValue(0)),
  }),
]);

// Block (lib/types.ts:Block).
export const blockSchema = v.object({
  id: v.string(),
  name: v.string(),
  start: hhmmSchema,
  end: v.optional(hhmmSchema),
  recurrence: recurrenceSchema,
  categoryId: v.nullable(v.string()),
  bricks: v.array(brickSchema),
});

// R7-ROOT-M8/M9-P1: ArchivedDay v3 frozen snapshot.
// ADR-045 calls state.history "read-only" — once a day archives, its shape
// must keep parsing on disk forever. If a future schemaVersion bump (v3→v4)
// adds a required field to Brick/Block (e.g. a new `kind` variant or a
// required new property), legacy archived days would suddenly fail validation
// and the whole history would reset.
//
// To prevent that, history validation uses a FROZEN v3 snapshot of the
// brick/block/category/archivedDay shapes. The live `blockSchema`,
// `brickSchema`, etc., above continue to evolve with new milestones; the
// snapshots below are pinned to v3 and never change.
//
// At v4 schema bump: write `brickSchemaV4`, `blockSchemaV4`, etc., and an
// `archivedDayV4Schema`. The v3→v4 migrate flow walks history entries
// shape-by-shape (v3-shape → v4-shape upgrader), then per-day-recovery in
// persist.ts uses the v4 schema for the post-migration state.
const brickV3Schema = brickSchema;
const blockV3Schema = blockSchema;
const categoryV3Schema = categorySchema;
export const archivedDaySchema = v.object({
  blocks: v.array(blockV3Schema),
  categories: v.array(categoryV3Schema),
  looseBricks: v.array(brickV3Schema),
});

// Record<string, ArchivedDay> keyed by ISO date.
// valibot has no first-class "record with key schema" — emulate via record().
// R7-ROOT-R2-NIT: this top-level historySchema is no longer used by
// persist.ts (R7-ROOT-M8/M9-P0 inlined per-day validation in parsePerField
// so individual corrupted days can be dropped without losing the rest).
// Kept as an export for documentation + potential future utility (e.g.,
// schema-only consumers). Internal use is deprecated.
/** @deprecated Internal callers should use parsePerField in persist.ts; this
 *  schema validates the whole history record all-or-nothing. */
export const historySchema = v.record(isoDateSchema, archivedDaySchema);

// Record<string, true> keyed by `${currentDate}:${blockId}` form.
// R7-ROOT-M5/M6-P2: key shape now validated — was previously v.string() which
// accepted any garbage (":", "::", "2026-05-18:" with empty blockId, etc.).
// Pattern is YYYY-MM-DD followed by ":" followed by non-empty blockId.
const deletionsKeySchema = v.pipe(
  v.string(),
  v.regex(
    /^\d{4}-\d{2}-\d{2}:.+$/,
    "Expected 'YYYY-MM-DD:<blockId>' deletions key",
  ),
);
export const deletionsSchema = v.record(deletionsKeySchema, v.literal(true));

// Streak-freeze keys: bare ISO date "YYYY-MM-DD" — no block-id suffix.
// Values are literal(true) like deletions; presence === frozen.
const freezeKeySchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected 'YYYY-MM-DD' freeze key"),
);
export const freezesSchema = v.record(freezeKeySchema, v.literal(true));

// PersistedState v3 — top-level shape (lib/persist.ts:PersistedState).
// firstBrickShown + freezes are optional (additive fields).
export const persistedStateV3Schema = v.object({
  schemaVersion: v.literal(3),
  programStart: isoDateSchema,
  currentDate: isoDateSchema,
  history: historySchema,
  blocks: v.array(blockSchema),
  categories: v.array(categorySchema),
  looseBricks: v.array(brickSchema),
  deletions: deletionsSchema,
  freezes: v.optional(freezesSchema),
  firstBrickShown: v.optional(v.boolean()),
  dayStart: v.optional(hhmmSchema),
  weekendDayStart: v.optional(hhmmSchema),
});

/**
 * The list of top-level field names tracked by the per-field-recovery flow
 * in persist.ts::migrate(). When any of these fails validation, the field is
 * reset to its default and its name is appended to LoadReport.resetFields.
 */
export const persistedFieldNames = [
  "programStart",
  "currentDate",
  "history",
  "blocks",
  "categories",
  "looseBricks",
  "deletions",
  "freezes",
  "firstBrickShown",
  "dayStart",
  "weekendDayStart",
] as const;
export type PersistedFieldName = (typeof persistedFieldNames)[number];
