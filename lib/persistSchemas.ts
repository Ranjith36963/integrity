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
    // target must be a finite, non-negative number (NaN/Infinity rejected).
    target: v.pipe(v.number(), v.finite(), v.minValue(0)),
    unit: v.string(),
    done: v.pipe(v.number(), v.finite(), v.minValue(0)),
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

// ArchivedDay (lib/types.ts:ArchivedDay).
export const archivedDaySchema = v.object({
  blocks: v.array(blockSchema),
  categories: v.array(categorySchema),
  looseBricks: v.array(brickSchema),
});

// Record<string, ArchivedDay> keyed by ISO date.
// valibot has no first-class "record with key schema" — emulate via record().
export const historySchema = v.record(isoDateSchema, archivedDaySchema);

// Record<string, true> keyed by `${currentDate}:${blockId}` form.
// Key format is internal — we only validate value is literal true.
export const deletionsSchema = v.record(v.string(), v.literal(true));

// PersistedState v3 — top-level shape (lib/persist.ts:PersistedState).
// firstBrickShown is optional (additive M7e field, ADR-044).
export const persistedStateV3Schema = v.object({
  schemaVersion: v.literal(3),
  programStart: isoDateSchema,
  currentDate: isoDateSchema,
  history: historySchema,
  blocks: v.array(blockSchema),
  categories: v.array(categorySchema),
  looseBricks: v.array(brickSchema),
  deletions: deletionsSchema,
  firstBrickShown: v.optional(v.boolean()),
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
  "firstBrickShown",
] as const;
export type PersistedFieldName = (typeof persistedFieldNames)[number];
