## Milestone 9b — Day rollover + history store — Tests

This entry covers M9b — schema v2 + day rollover + fresh-day seeding: the new pure `rollover(state: PersistedState, todayISO: string): PersistedState` in `lib/history.ts` (with the `ArchivedDay` type added to `lib/types.ts`), `lib/persist.ts` bumped to the ADR-045 v2 shape (`SCHEMA_VERSION = 2`, v2 `PersistedState`, `defaultPersisted()`, a `migrate()` with a `case 1` v1→v2 arm and a `case 2` v2 arm), and the `lib/usePersistedState.ts` hydration path running `rollover(loaded, today())` once on mount. It is derived from the `plan.md` M9b entry (`## Milestone 9b — Day rollover + history store — Plan`). Feature slug: `m9b`. ID prefixes: `U-m9b-`, `C-m9b-`, `E-m9b-` (no `A-` — M9b adds **zero UI surface**: no component, no screen, no DOM change, per plan.md § Components / § Design tokens — so there is no a11y leg, consistent with how M9a had no e2e/a11y leg).

### Testing approach — what is bespoke vs gate-verified

M9b has a **large genuine unit surface** (the `rollover` function is pure and branch-rich; `lib/persist.ts` load/save/migrate is pure) plus a focused component surface (the hydration effect ordering in `usePersistedState`). Real GIVEN/WHEN/THEN `it()` blocks are authored for all of it. Two ACs are honestly gate-verified rather than bespoke-tested, consistent with how M8 (#14/#15) and M9a (#10/#11) mapped no-regression / quality-gate ACs to `npm run eval`:

- **AC #14 (no regression — every M1–M8 + M9a Vitest/component test passes; the M9a `test:tz` suite passes)** → gate-verified by the **full Vitest suite + `test:tz` staying green** under `npm run eval`. M9b changes no UI surface and edits no prior test file, so a bespoke "nothing changed" test would be vacuous; the binding proof is that no prior test file is touched and every prior ID stays green. `C-m9b-005` provides a runtime anchor for the zero-new-`Action` schema-lock portion.
- **AC #15 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest green; E2E deferred-to-preview covers first-run / same-day / next-day)** → gate-verified by `npm run eval` (lint + typecheck + vitest + e2e + a11y). The three named E2E scenarios are authored as real `test()` blocks (`E-m9b-001..003`) per the M4/M8 deferred-to-preview pattern.

All other 13 ACs map to at least one concrete bespoke test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **The `rollover` no-op test (`U-m9b-010`) asserts reference identity** — `rollover(state, today)` returns the **same object reference** (`===`) when `currentDate >= todayISO`, not merely a deep-equal copy. A mutant that always rebuilds the object fails the `===` arm.
- **The archived-day immutability test (`U-m9b-014`) is mutation-resistant, not "history is non-empty"** — it deep-clones the archived snapshot, then **mutates the post-rollover in-progress day** (flips a brick `done`, pushes a block) and asserts `history[oldDate]` is **byte-identical** to the pre-mutation clone (`expect(after).toEqual(snapshotClone)`). A mutant that stores a shallow reference instead of a `structuredClone` fails it.
- **The purity test (`U-m9b-015`) asserts `rollover` reads no clock and mutates no input** — it freezes the input `state` (`Object.freeze` on the object and its `history`/`blocks`/`looseBricks`/`categories`) and asserts `rollover` does not throw, and that the input `state` object and arrays are referentially unchanged afterwards; it also asserts the verdict depends only on the `todayISO` argument (calling twice with the same args yields deep-equal results — no hidden `Date.now()` read).
- **The seeding tests assert exact field preservation AND exact reset** — `U-m9b-017`/`U-m9b-018` assert the seeded brick's `target`/`unit`/`start`/`end`/`recurrence`/`name`/`categoryId` are deep-equal to the source brick while `id` is a **fresh, different** uuid and `done` is reset (`false` for tick, `0` for units). A mutant that carries `done` forward, or one that keeps the stale `id`, fails.
- **The multi-day-skip test (`U-m9b-013`) asserts `Object.keys(history)` is exactly `[oldCurrentDate]`** — no intervening-date key — so a mutant that loops day-by-day fabricating empty `ArchivedDay`s fails.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9b-001..021` | 21     |
| Component / integration (Vitest+TL)   | `C-m9b-001..006` | 6      |
| E2E (Playwright, deferred-to-preview) | `E-m9b-001..003` | 3      |
| **Total**                             |                  | **30** |

No `A-m9b-*` IDs — M9b adds zero UI surface (plan.md § Components, § Design tokens). ID series start values were supplied by the orchestrator: `U-m9b-001`, `C-m9b-001`, `E-m9b-001`.

**Fixture dates (ISO, weekdays verified):** `2026-05-11` Mon · `2026-05-15` Fri · `2026-05-16` Sat · `2026-05-17` Sun · `2026-05-18` Mon (today) · `2026-05-19` Tue. Rollover fixtures set `state.currentDate` to a past date and assert the precise post-`rollover` shape.

### Unit (Vitest)

`U-m9b-001..009` exercise `lib/persist.ts` (v2 load / save / migrate) — all mock `localStorage` (a fresh in-memory stub on `globalThis.localStorage` in `beforeEach`, cleared in `afterEach`). `U-m9b-010..021` exercise the pure `rollover` in `lib/history.ts` and the fresh-day seeding — no `localStorage`, no clock (these call `rollover(state, todayISO)` directly with a literal `todayISO`).

#### U-m9b-001 — success

Target file: `lib/persist.test.ts`
**GIVEN** the `lib/persist.ts` module after the v2 bump
**WHEN** its exports are inspected
**THEN** `STORAGE_KEY` is the exact string `"dharma:v1"` (key unchanged); `SCHEMA_VERSION` is the number `2`; `loadState`, `saveState`, `defaultPersisted`, `migrate` are all `typeof === "function"`; the `PersistedState` type is exported and is the v2 shape (compile-time `tsc` gate — a `PersistedState`-typed literal `{ schemaVersion: 2, programStart: "2026-05-01", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` type-checks, and a v1-shaped literal omitting `currentDate`/`history` is a type error).
Proves: plan.md § `lib/persist.ts` API (v2 module surface; `SCHEMA_VERSION = 2`; v2 `PersistedState`) — covers SPEC AC #1.

#### U-m9b-002 — success

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and a v2 `PersistedState` value with `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history: { "2026-05-17": { blocks: [{ id: "ab1" }], categories: [], looseBricks: [] } }`, one in-progress block `{ id: "b1" }` holding a nested `kind: "units"` brick `{ id: "n1", done: 25 }`, one category `{ id: "c1" }`, and one loose `kind: "tick"` brick `{ id: "t1", done: true }`
**WHEN** `saveState(state)` is called, then `loadState()` is called
**THEN** `loadState()` returns a value deep-equal to the saved state — `currentDate === "2026-05-18"`, `history["2026-05-17"].blocks[0].id === "ab1"`, the in-progress block id is `"b1"`, the nested units brick `done === 25` (exact integer), the loose tick brick `done === true` (exact boolean), `programStart === "2026-05-01"`.
**AND** the raw `localStorage.getItem("dharma:v1")` string `JSON.parse`s to an object whose top-level keys are exactly `schemaVersion`, `programStart`, `currentDate`, `history`, `blocks`, `categories`, `looseBricks` and whose `schemaVersion === 2` — the ADR-045 v2 shape, field-for-field, no extra key.
Proves: plan.md § `lib/persist.ts` API + § Data model (`saveState`/`loadState` round-trip the v2 shape) — covers SPEC AC #1.

#### U-m9b-003 — success / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (`getItem` returns `null` — first run) and the system clock known to today (`today()` → `"2026-05-18"`)
**WHEN** `loadState()` is called
**THEN** it returns a `PersistedState` deep-equal to `{ schemaVersion: 2, programStart: "2026-05-18", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` — `currentDate === programStart === today`, `history` is an empty object, all three collections are empty arrays.
**AND** no exception is thrown.
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` v2 default; `loadState` no-key path) + § Edge cases (first run) — covers SPEC AC #2.

#### U-m9b-004 — success / edge

Target file: `lib/persist.test.ts`
**GIVEN** the `defaultPersisted()` factory and the `today()` clock known to `"2026-05-18"`
**WHEN** `defaultPersisted()` is called twice
**THEN** each call returns a fresh v2 object — `schemaVersion === 2`, `currentDate === "2026-05-18"`, `programStart === "2026-05-18"`, `history` deep-equals `{}`, `blocks`/`categories`/`looseBricks` all `[]`; the two returned `blocks` arrays are **distinct references** and the two `history` objects are **distinct references** (no shared mutable default — `defaultPersisted().blocks !== defaultPersisted().blocks`, `defaultPersisted().history !== defaultPersisted().history`).
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` v2 shape; fresh-object factory, no shared-reference footgun) — covers SPEC AC #2.

#### U-m9b-005 — success

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **v1** payload `{ schemaVersion: 1, programStart: "2026-03-10", blocks: [{ id: "b1" }], categories: [{ id: "c1" }], looseBricks: [{ id: "t1" }] }` (an M8 session — no `currentDate`, no `history`), `today()` known to `"2026-05-18"`
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` is v2 — `schemaVersion === 2`; `blocks` deep-equals `[{ id: "b1" }]`, `categories` deep-equals `[{ id: "c1" }]`, `looseBricks` deep-equals `[{ id: "t1" }]` (v1 collections preserved verbatim); `programStart === "2026-03-10"` (the v1 `programStart` preserved, **not** re-stamped); `currentDate === "2026-05-18"` (set to today — the v1 day's true date is unrecoverable, the accepted one-time migration approximation per ADR-045); `history` deep-equals `{}`.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 1` + § Migration (v1→v2: collections + `programStart` preserved, `currentDate`=today, `history`={}, `schemaVersion`=2) — covers SPEC AC #3.

#### U-m9b-006 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for `{ schemaVersion: 3, programStart: "2026-05-01", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` (a forward / unknown version)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()` (empty v2 default) — `migrate` returned `null` for the unknown version and `loadState` fell back to the default.
**AND** the same holds for `schemaVersion: 4`, `schemaVersion: "2"` (non-numeric string), and a missing `schemaVersion` key — every non-`1`/non-`2` `schemaVersion` → `migrate` returns `null` → `loadState` → `defaultPersisted()`, no throw.
Proves: plan.md § `lib/persist.ts` API `migrate` `default:` arm (forward-incompatible / non-numeric `schemaVersion` → `null` → empty v2 default; never guessed at) — covers SPEC AC #4.

#### U-m9b-007 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is the malformed string `"{not valid json"` (un-parseable)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()` — no exception escapes; AND the return value is deep-equal to `defaultPersisted()` (empty v2 default).
Proves: plan.md § `lib/persist.ts` API (`JSON.parse` throw → `defaultPersisted()`, no throw) + § Edge cases (corrupt JSON) — covers SPEC AC #5.

#### U-m9b-008 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a v2 payload whose `history` is **not an object** — `{ schemaVersion: 2, programStart: "2026-05-01", currentDate: "2026-05-18", history: "oops", blocks: [], categories: [], looseBricks: [] }`
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the returned `PersistedState` has `history` coerced to `{}` (deep-equal an empty object) while `currentDate`/`programStart`/collections pass through; the rest of the object is otherwise intact (`currentDate === "2026-05-18"`).
**AND** the same coercion holds when `history` is `null`, `42`, or an **array** `[]` (a non-null non-plain-object) — each → `history` coerced to `{}`, no throw.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 2` (`history` present but non-object → coerced to `{}`; no throw) + § Edge cases — covers SPEC AC #5.

#### U-m9b-009 — edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **partial** v2 object `{ schemaVersion: 2, history: {}, blocks: [{ id: "b1" }] }` — `programStart`, `currentDate`, `categories`, `looseBricks` absent — and `today()` known to `"2026-05-18"`
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` has `blocks` deep-equal `[{ id: "b1" }]` (present collection preserved), `categories === []` and `looseBricks === []` (absent collections filled with fresh empty arrays), and `programStart === "2026-05-18"` / `currentDate === "2026-05-18"` (absent / non-string string fields coerced to `today()` per the `case 2` defensive coercion).
**AND** when `blocks` is present but not an array (e.g. `blocks: "x"`) it is coerced to `[]` (`Array.isArray(...) ? value : []`), and when `currentDate` is present but not a string (e.g. `currentDate: 5`) it is coerced to `today()`.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 2` (defensive coercion: non-array collections → `[]`, non-string `programStart`/`currentDate` → `today()`) — covers SPEC AC #1, AC #5.

#### U-m9b-010 — success / edge

Target file: `lib/history.test.ts` (NEW)
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-18"`, a non-empty `history`, and one in-progress block, and `todayISO = "2026-05-18"` (`currentDate === todayISO`)
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** it returns the **same object reference** — `rollover(state, "2026-05-18") === state` — no archive, no seeding; `state.history` is the same reference, byte-identical, untouched; `state.blocks`/`categories`/`looseBricks` unchanged.
**AND** for a `currentDate` strictly **after** `todayISO` (the should-not-occur future case — `currentDate: "2026-05-19"`, `todayISO: "2026-05-18"`) `rollover` likewise short-circuits to the same-reference no-op (DETECT uses `currentDate >= todayISO`).
Proves: plan.md § The rollover algorithm step 1 DETECT (`currentDate >= todayISO` → return state unchanged, same reference) + § Edge cases (`currentDate === today` → no rollover) — covers SPEC AC #6.

#### U-m9b-011 — success

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"` (Sun, yesterday), `history: {}`, an in-progress day of one block `{ id: "b1" }` (holding a nested `kind: "units"` brick `n1`, `done: 9`), one category `c1`, one loose `kind: "tick"` brick `t1` (`done: true`); `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the result's `history` has exactly the key `"2026-05-17"`, and `history["2026-05-17"]` is an `ArchivedDay` deep-equal to `{ blocks: [b1...], categories: [c1...], looseBricks: [t1...] }` — the in-progress day's three collections snapshotted under the **old** `currentDate` key (the units brick `done === 9` and the tick brick `done === true` are captured at their pre-rollover values).
Proves: plan.md § The rollover algorithm step 2 ARCHIVE (in-progress `{blocks,categories,looseBricks}` written into `history[currentDate]` as an `ArchivedDay`) + § Edge cases (`currentDate` === yesterday) — covers SPEC AC #7.

#### U-m9b-012 — success

Target file: `lib/history.test.ts`
**GIVEN** the same `state` as `U-m9b-011` (`currentDate: "2026-05-17"`), `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the result's `currentDate === "2026-05-18"` (advanced to today) and the result is a **new object** (`!== state`); `programStart` is carried forward unchanged; the result's `blocks`/`looseBricks` are the freshly-seeded day (per the seeding rule — see `U-m9b-016..020`), not the archived collections.
Proves: plan.md § The rollover algorithm step 3 SEED + step 4 ADVANCE (after archive: fresh day seeded, `currentDate` advanced to `todayISO`) — covers SPEC AC #8.

#### U-m9b-013 — edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-11"` (Mon — **7 days** before today), `history: { "2026-05-04": <some prior ArchivedDay> }`, a non-empty in-progress day; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** `Object.keys(result.history).sort()` is exactly `["2026-05-04", "2026-05-11"]` — the pre-existing `"2026-05-04"` entry is preserved unchanged, and **only** `state.currentDate` (`"2026-05-11"`) is newly archived; there is **no** `history` entry for any intervening date (`2026-05-12` … `2026-05-17`) — single-pass archive, no per-skipped-day loop, no fabricated empty days.
**AND** `result.currentDate === "2026-05-18"` (advanced straight to today, skipping the gap).
Proves: plan.md § The rollover algorithm (single-pass, no per-skipped-day loop) + § Edge cases (`currentDate` N>1 days before today) — covers SPEC AC #10.

#### U-m9b-014 — edge (mutation-resistant)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"`, an in-progress day of one block `{ id: "b1" }` holding a tick brick `t1` (`done: false`), `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called → `result`; then a **structural snapshot** of `result.history["2026-05-17"]` is captured via `structuredClone`; then the **post-rollover in-progress day is mutated** — `result.blocks[0].bricks[0].done = true`, `result.blocks.push({ id: "x", ... })`, `result.looseBricks.push(...)`
**THEN** `result.history["2026-05-17"]` is **byte-identical** to the pre-mutation snapshot (`expect(result.history["2026-05-17"]).toEqual(snapshotClone)`) — the archived day's brick `done` is still `false`, its `blocks` length unchanged; the archived `ArchivedDay` shares **no** mutable reference with the new in-progress day (`result.history["2026-05-17"].blocks !== result.blocks`, and likewise no nested brick is shared).
Proves: plan.md § The rollover algorithm step 2 (`structuredClone` deep snapshot — later mutation of the fresh day cannot reach `history`) + § Edge cases (archived-day immutability) — covers SPEC AC #9.

#### U-m9b-015 — edge (purity)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, `state.blocks`, `state.categories`, `state.looseBricks` (and a representative nested block) — and `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** it does **not** throw (`expect(() => rollover(frozenState, "2026-05-18")).not.toThrow()`) — `rollover` never writes into its input `state` or any of `state`'s nested collections; after the call the input `state` object and its arrays are referentially and structurally unchanged (`state.currentDate` still `"2026-05-17"`, `state.history` still `{}`/its original value, `state.blocks` same length).
**AND** `rollover` reads **no clock**: called twice with the **same** `(state, "2026-05-18")` args the two results are deep-equal — and a result computed with `todayISO = "2026-05-18"` differs from one computed with `todayISO = "2026-05-19"` purely as a function of the argument, never of `Date.now()`. (The single `today()` clock read lives in `usePersistedState`, not `rollover` — see `C-m9b-002`.)
Proves: plan.md § The rollover algorithm — Determinism + § Open questions for VERIFIER item (b) (`rollover` reads no clock; mutates none of its inputs) — covers SPEC AC #9, AC #6 (purity underpins the no-op guarantee).

#### U-m9b-016 — success

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one block `B` holding three bricks — `r1` `hasDuration: true` with `recurrence: { kind: "every-day" }`, `r2` `hasDuration: true` with `recurrence: { kind: "just-today", date: "2026-05-17" }`, `r3` `hasDuration: false` (no `recurrence`) — and `todayISO = "2026-05-18"` (Mon)
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the fresh in-progress day re-creates exactly `r1`'s brick (its `recurrence` `every-day` satisfies `appliesOn(rec, "2026-05-18")`); `r2` is **dropped** (`just-today` for `"2026-05-17"` → `appliesOn` `false` for `"2026-05-18"`); `r3` is **dropped** (`hasDuration: false`, no `recurrence` → never seeded). The fresh block `B'` hosts exactly one brick (the `r1` instance).
Proves: plan.md § Fresh-day seeding detail — per-brick seeding rule (`hasDuration && appliesOn(...)`; `just-today` mismatch and no-`recurrence` bricks not carried) — covers SPEC AC #11.

#### U-m9b-017 — success / edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-15"` Fri) whose in-progress day has loose bricks, each `hasDuration: true`, one per recurrence kind: `wd` `{ kind: "every-weekday" }`, `wknd-check` `{ kind: "custom-range", start: "2026-05-01", end: "2026-05-31", weekdays: [0, 6] }` (Sun+Sat only), `inrange` `{ kind: "custom-range", start: "2026-05-01", end: "2026-05-31", weekdays: [1] }` (Mon), `oob` `{ kind: "custom-range", start: "2026-01-01", end: "2026-01-31", weekdays: [1] }` (range entirely in January); evaluated separately at `todayISO = "2026-05-18"` (Mon) and at `todayISO = "2026-05-16"` (Sat)
**WHEN** `rollover(state, todayISO)` is called for each `todayISO`
**THEN** at `todayISO = "2026-05-18"` (Mon): `wd` is seeded (weekday), `inrange` is seeded (in range, Mon ∈ weekdays), `wknd-check` is **dropped** (Mon ∉ {Sun,Sat}), `oob` is **dropped** (May 18 outside the January range).
**AND** at `todayISO = "2026-05-16"` (Sat): `wd` is **dropped** (weekend), `wknd-check` is seeded (Sat ∈ weekdays, in range), `inrange` is **dropped** (Sat ∉ {Mon}), `oob` is **dropped** (out of range) — confirming each recurrence kind drives seeding via `appliesOn`.
Proves: plan.md § Fresh-day seeding detail — per-brick rule across `every-weekday` / `custom-range` (in-window, out-of-window, weekday-excluded) + § Edge cases (recurrence does not apply today) — covers SPEC AC #11.

#### U-m9b-018 — success (mutation-resistant)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one loose `kind: "tick"` brick `tk` (`done: true`, `recurrence: { kind: "every-day" }`, `name: "Meditate"`, `categoryId: "cat-1"`, `start: "06:00"`, `end: "06:20"`) and one loose `kind: "units"` brick `un` (`done: 12`, `target: 30`, `unit: "pages"`, `recurrence: { kind: "every-day" }`, `name: "Read"`, `categoryId: "cat-2"`, `start: "21:00"`, `end: "21:40"`); `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the seeded tick brick has `done === false` (reset) and the seeded units brick has `done === 0` (reset); for **both**, `name`, `categoryId`, `start`, `end`, `recurrence`, `kind`, and (for `un`) `target` + `unit` are deep-equal to the source brick (`recurrence` deep-equals `{ kind: "every-day" }`, `un.target === 30`, `un.unit === "pages"`).
**AND** each seeded brick's `id` is a **fresh uuid** — `!== "tk"` / `!== "un"` — and is a valid uuid string; the recurrence _definition_ is preserved verbatim while only `id`, `done`, and `parentBlockId` are re-derived.
Proves: plan.md § Fresh-day seeding detail — `done` reset per kind (AC #12) + SG-m9b-01 (fresh `uuid` per day-instance, definition preserved) — covers SPEC AC #12.

#### U-m9b-019 — success / edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has three blocks — `Bkeep` with one `hasDuration: true` `every-day` brick, `Bdrop` with one `just-today` `{ date: "2026-05-17" }` brick only, `Bempty` with one `hasDuration: false` brick only — plus two categories `cat-A`, `cat-B`; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the fresh day's `blocks` contains exactly **one** block — the carry of `Bkeep` (it has ≥1 brick that recurs and applies today); `Bdrop` and `Bempty` are **dropped** (zero applicable recurring bricks); the carried block hosts **only** its one seeded brick.
**AND** the result's `categories` deep-equals `[cat-A, cat-B]` — carried forward unchanged (same content; ADR-045 — categories are not seeded/filtered).
Proves: plan.md § Fresh-day seeding detail — Block filtering (block carries iff ≥1 seeded brick; hosts only seeded bricks; `categories` carry verbatim) — covers SPEC AC #13.

#### U-m9b-020 — edge (parentBlockId consistency)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one block `{ id: "B-old" }` holding two `hasDuration: true` `every-day` bricks each with `parentBlockId: "B-old"`, and one loose `hasDuration: true` `every-day` brick with `parentBlockId: null`; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the carried block has a **fresh uuid** `id` (`!== "B-old"`), and **both** of its seeded bricks carry `parentBlockId` equal to that new block `id` — **not** the stale `"B-old"` (`result.blocks[0].bricks.every(b => b.parentBlockId === result.blocks[0].id)`); the seeded loose brick keeps `parentBlockId: null`.
Proves: plan.md § Fresh-day seeding detail — `parentBlockId` consistency (block `id` re-derived first, seeded bricks re-pointed to the new block `id`; loose bricks stay `null`) — covers SPEC AC #13, AC #11.

#### U-m9b-021 — edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-16"` Sat) whose in-progress day has **only** `every-weekday` bricks and blocks (no brick applies on a weekend), plus categories `[cat-A]`; `todayISO = "2026-05-17"` (Sun — still a weekend)
**WHEN** `rollover(state, "2026-05-17")` is called
**THEN** the fresh day's `blocks` is `[]` and `looseBricks` is `[]` (no applicable recurring brick → empty fresh day); `categories` still deep-equals `[cat-A]` (carried forward); `history["2026-05-16"]` holds the archived (non-empty) Saturday day; `currentDate === "2026-05-17"`.
Proves: plan.md § Fresh-day seeding detail — "A day with no applicable recurring bricks" + § Edge cases — covers SPEC AC #11, AC #13.

### Component (Vitest + Testing Library)

`C-m9b-*` IDs render the `usePersistedState()` hook (via `renderHook` or a tiny harness component) and/or `BuildingClient`, with a mocked `localStorage`. The `dharma:v1` key is cleared before each test; the system clock is controlled (`vi.setSystemTime`) so `today()` is deterministic.

#### C-m9b-001 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` pre-seeded with a v2 `dharma:v1` whose `currentDate` equals **today** (`vi.setSystemTime` → `"2026-05-18"`, persisted `currentDate: "2026-05-18"`), holding one block `b1` and a `history` with one entry
**WHEN** `usePersistedState()` is rendered and effects flush (`act`)
**THEN** after the hydration effect the hook's `state` carries `b1` and the `history` entry unchanged — `rollover(loaded, today())` was a no-op (`currentDate >= today`); `state.currentDate === "2026-05-18"`, `state.history` deep-equals the persisted `history`, `state.blocks[0].id === "b1"`. The post-M9b `AppState` exposes both `currentDate` (string) and `history` (object) — `"currentDate" in state` and `"history" in state` are both `true`; `schemaVersion` is **not** on `state` (`"schemaVersion" in state === false`, stripped at the boundary).
Proves: plan.md § Hydration wiring (rollover no-op on same-day load; `projectToAppState` carries `currentDate`/`history`, drops `schemaVersion`) + § Data model SG-m9b decision — covers SPEC AC #6, AC #1.

#### C-m9b-002 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` pre-seeded with a v2 `dharma:v1` whose `currentDate` is **yesterday** (`vi.setSystemTime` → today `"2026-05-18"`; persisted `currentDate: "2026-05-17"`), an in-progress day with one block holding an `every-day` brick (`done: true`) and one `just-today: "2026-05-17"` brick, `history: {}`
**WHEN** `usePersistedState()` is rendered and effects flush (`act`)
**THEN** after the hydration effect: `state.currentDate === "2026-05-18"` (advanced); `state.history` has the key `"2026-05-17"` whose `ArchivedDay` holds the pre-rollover day (the archived `every-day` brick still `done: true`); `state.blocks` is the freshly-seeded day — the `every-day` brick re-created with `done: false`, the `just-today` brick dropped. The single `today()` clock read happened in the hook's pass-2 effect (`rollover` itself received `today()` as its `todayISO` argument — confirmed by the hook honoring the faked `vi.setSystemTime` value).
Proves: plan.md § Hydration wiring step 4 (pass-2 effect runs `rollover(loadState(), today())` once on mount, after load, before first render) — covers SPEC AC #7, AC #8.

#### C-m9b-003 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (first run), `vi.setSystemTime` → `"2026-05-18"`, `saveState` wrapped in a spy
**WHEN** `usePersistedState()` is rendered and effects flush
**THEN** the first render (before effects) shows the empty v2 default — `state.blocks/categories/looseBricks` all `[]`, `state.history` deep-equals `{}`, `state.currentDate === "2026-05-18"`; after the pass-2 effect the state is still the empty v2 default (rollover on the empty default is a no-op — `currentDate === today`); `loadState` was not called during render, and the `saveState` spy has **zero** calls until a subsequent mutating dispatch (the `if (!mounted) return` guard holds).
Proves: plan.md § Hydration wiring pass-1 + pass-2 + save-effect guard (SSR/first paint = empty v2 default; `loadState`/`rollover` never in render; save guarded by `mounted`) — covers SPEC AC #2.

#### C-m9b-004 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness pre-seeded with a v2 `dharma:v1` whose `currentDate` is yesterday (`"2026-05-17"`, today `"2026-05-18"`), so a rollover occurs on mount; `saveState` wrapped in a spy
**WHEN** the hook mounts, the pass-2 rollover effect flushes, and then a mutating action (`LOG_TICK_BRICK` on a seeded brick) is dispatched
**THEN** the first `saveState` call (triggered by the post-mount mutating dispatch — `mounted` is now `true`) writes the **post-rollover** v2 shape to `dharma:v1` — `JSON.parse(localStorage["dharma:v1"])` has `schemaVersion: 2`, `currentDate: "2026-05-18"`, and a `history` containing the `"2026-05-17"` archived day; `toPersisted` lifted `currentDate` and `history` back from `AppState` (no second clock read). Yesterday lands in `history` on disk.
Proves: plan.md § Hydration wiring step 3 + step 5 (`toPersisted` lifts `currentDate`/`history` back, `schemaVersion: 2` stamped; first save after a rollover boot persists the post-rollover state) — covers SPEC AC #1, AC #7.

#### C-m9b-005 — success (schema-lock anchor)

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** the `usePersistedState()` hook and the post-M9b `Action` union from `lib/types.ts`
**WHEN** the hook is rendered and the `Action` union inspected
**THEN** the `Action` union contains **no** `ROLLOVER` member and no other M9b-added action variant (compile-time `tsc` gate: an action literal `{ type: "ROLLOVER" }` is a type error); at runtime, dispatching every existing action type still succeeds and the reducer is never handed an unknown type — rollover is applied by composing `rollover` into the pass-2 `setState`, **not** via a new reducer action (the M4f-locked `Action` union is unchanged).
**AND** `reducer` (from `lib/data.ts`) gains no new arm — `defaultState()` adds `currentDate`/`history` but no `Action` variant.
Proves: plan.md § The rollover algorithm — "No reducer action" + § File structure `lib/data.ts` row (no new `Action`; rollover composed into `setState`) — covers SPEC AC #14 (runtime anchor for the `Action`-lock portion).

#### C-m9b-006 — success

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a mocked `localStorage` whose v2 `dharma:v1` has `currentDate` = yesterday (`"2026-05-17"`) and an in-progress day of one block holding one `every-day` brick (ticked), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the component mounts and effects flush
**THEN** the building view renders the **freshly-seeded** day — the `every-day` brick is present and **unchecked** (`done: false`), as rollover re-seeded it; `<BuildingClient />` itself required **no** prop/markup change (M9b adds no component) — the same Building components render whatever day `rollover` produced. No console error, no hydration-mismatch warning.
Proves: plan.md § Components ("None" — Building view renders the rolled-over day with zero component change) + § Hydration wiring — covers SPEC AC #8, AC #14 (zero-UI-delta anchor).

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan names: first-run, same-day-no-rollover, next-day-rollover.

#### E-m9b-001 — success (first-run)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/`
**WHEN** the page renders and the building view is inspected (under `count() > 0` guard)
**THEN** the app shows the empty-state default — no console hydration-mismatch warning; once the first-run save fires, `localStorage["dharma:v1"]` is valid JSON with `schemaVersion: 2`, `history` an empty object `{}`, `currentDate` equal to today's ISO date, and empty `blocks`/`categories`/`looseBricks`.
Proves: plan.md § Edge cases (first run → v2 default) + § Hydration wiring — covers SPEC AC #2, AC #15 (first-run E2E scenario).

#### E-m9b-002 — success (same-day, no rollover)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared, the app at `/`; the user adds a block and a recurring (`every-day`) brick and ticks it, so `dharma:v1` holds an in-progress day with `currentDate` = today
**WHEN** the page is **reloaded the same day** (`page.reload()`, no clock change)
**THEN** after reload the same block and brick — with the brick's exact `done` (ticked) state — are still present on the timeline (under `count() > 0` guard); `localStorage["dharma:v1"]` still has an empty `history` (`{}`) and `currentDate` unchanged — no rollover occurred, the day was not archived.
Proves: plan.md § The rollover algorithm step 1 DETECT (`currentDate === today` → no rollover, `history` untouched) + § Edge cases — covers SPEC AC #6, AC #15 (same-day-no-rollover E2E scenario).

#### E-m9b-003 — success (next-day rollover)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared; via `page.evaluate`, `dharma:v1` is set to a hand-built v2 payload whose `currentDate` is **yesterday's** ISO date, with an in-progress day of one block holding one `every-day` brick ticked done and one `just-today: <yesterday>` brick, `history: {}`
**WHEN** the app is loaded fresh at `/` (a new calendar day relative to the seeded `currentDate`)
**THEN** the building view (under `count() > 0` guard) shows the **freshly-seeded** day — the `every-day` brick present and **unchecked**, the `just-today` brick **absent**; reading `localStorage["dharma:v1"]` after the first post-load save shows `currentDate` advanced to today and `history` containing one entry under yesterday's date whose `ArchivedDay` holds the ticked brick (yesterday archived intact). No crash, no error overlay.
Proves: plan.md § The rollover algorithm steps 2–4 + § Fresh-day seeding detail + § Hydration wiring (next-day boot archives yesterday, seeds a fresh day) — covers SPEC AC #7, AC #8, AC #11, AC #15 (next-day-rollover E2E scenario).

### Sandbox / preview note

Per the established M4a–M8 pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `E-m9b-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m8.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md`. `E-m9b-003` partly mitigates it by hand-building the `dharma:v1` payload via `page.evaluate` (a deterministic seed for the rollover path that does not need a brick-creation UI flow). M9b introduces no general deterministic seeding helper (out of scope per ADR-022). The 3 deferred-to-preview IDs are net-additive; M9b retires no E2E ID. No `A-` (a11y) leg — M9b adds zero DOM surface.

### Retired test IDs

**None.** M9b is purely additive: two new files (`lib/history.ts` + its new test suite `lib/history.test.ts`) plus edits to `lib/persist.ts`, `lib/types.ts`, `lib/data.ts`, `lib/usePersistedState.ts`. **No existing test file is edited** — the M8 `lib/persist.test.ts` and `lib/usePersistedState.test.tsx` gain **new** `m9b` IDs appended, but no prior `U-m8-*`/`C-m8-*` ID is changed or removed. Every existing `U-/C-/E-/A-` ID across all milestones — including all `U-m8-*`, `C-m8-*`, `U-m9a-*`, and the M9a `test:tz` suite — stays live and green. M9b adds 30 new `m9b` IDs (21 U + 6 C + 3 E) and retires none.

Note on the M8 persist tests: the M8 `U-m8-001` asserts `SCHEMA_VERSION === 1` and `U-m8-003`/`U-m8-006` assert v1-shaped behavior. The M9b plan bumps `SCHEMA_VERSION` to `2` and the schema to v2 — which **would** break those M8 IDs as literally written. **This is flagged for VERIFIER as Spec gaps item 1** — the plan's "no existing test file is edited" expectation (plan.md § Out of scope, § no-regression AC #14) is in tension with the schema bump. See § Spec gaps surfaced for VERIFIER.

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                                         | Test ID(s)                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| #1  | `loadState`/`saveState` round-trip the v2 shape `{ schemaVersion:2, programStart, currentDate, history, blocks, categories, looseBricks }` | `U-m9b-001`, `U-m9b-002`, `U-m9b-009`, `C-m9b-001`, `C-m9b-004`                                     |
| #2  | First run → v2 default (`currentDate`=today, `history`=`{}`, empty collections, `programStart`=today)                                      | `U-m9b-003`, `U-m9b-004`, `C-m9b-003`, `E-m9b-001`                                                  |
| #3  | `schemaVersion:1` payload migrates to v2 — v1 collections + `programStart` preserved, `currentDate`=today, `history`=`{}`                  | `U-m9b-005`                                                                                         |
| #4  | `schemaVersion` ≥3 or non-numeric → empty v2 default; no exception escapes                                                                 | `U-m9b-006`                                                                                         |
| #5  | Malformed JSON / non-object `history` → empty v2 default or `history`→`{}`; no exception escapes                                           | `U-m9b-007`, `U-m9b-008`, `U-m9b-009`                                                               |
| #6  | `currentDate` === today → no rollover; `history` untouched                                                                                 | `U-m9b-010`, `U-m9b-015`, `C-m9b-001`, `E-m9b-002`                                                  |
| #7  | `currentDate` < today → in-progress day archived into `history[currentDate]` as an `ArchivedDay`                                           | `U-m9b-011`, `C-m9b-002`, `C-m9b-004`, `E-m9b-003`                                                  |
| #8  | After archive, fresh day seeded + `currentDate` advanced to today                                                                          | `U-m9b-012`, `C-m9b-002`, `C-m9b-006`, `E-m9b-003`                                                  |
| #9  | `ArchivedDay` is a deep snapshot — mutating the new day leaves `history[oldDate]` byte-identical                                           | `U-m9b-014`, `U-m9b-015`                                                                            |
| #10 | Multi-day skip → ONLY `currentDate` archived; no entry for intervening dates                                                               | `U-m9b-013`                                                                                         |
| #11 | Fresh day re-creates exactly the bricks where `appliesOn` is true; `just-today` / no-`recurrence` dropped                                  | `U-m9b-016`, `U-m9b-017`, `U-m9b-020`, `U-m9b-021`, `E-m9b-003`                                     |
| #12 | Seeded bricks reset (`tick`→`done:false`, `units`→`done:0`); `target`/`unit`/`start`/`end`/`recurrence` preserved                          | `U-m9b-018`                                                                                         |
| #13 | A block carries iff ≥1 brick applies today; hosts only seeded bricks; `categories` carry unchanged                                         | `U-m9b-019`, `U-m9b-020`, `U-m9b-021`                                                               |
| #14 | No new screen/component; M1–M8 + M9a tests + `test:tz` still green                                                                         | **gate (`npm run eval`, full Vitest + `test:tz`)** + anchors `C-m9b-005`, `C-m9b-006`               |
| #15 | Quality gates: `tsc` clean; ESLint 0 err / ≤13 warn; full Vitest green; E2E covers first-run/same-day/next-day                             | **gate (`npm run eval`)** + `E-m9b-001` (first-run), `E-m9b-002` (same-day), `E-m9b-003` (next-day) |

**Gate-verified ACs:** #14 (no regression) and #15 (quality gates) — consistent with the M8 (#14/#15) and M9a (#10/#11) precedent. All other 13 ACs map to at least one bespoke `m9b` test ID. Every `m9b` test ID maps back to at least one AC. No AC is unmapped.

**Edge-case coverage (plan.md § Edge cases table):** first run → `U-m9b-003`/`C-m9b-003`; `currentDate`===today → `U-m9b-010`; `currentDate`===yesterday → `U-m9b-011`/`U-m9b-012`/`C-m9b-002`; N>1 days skipped → `U-m9b-013`; `schemaVersion:1` → `U-m9b-005`; `schemaVersion` 3+/non-numeric → `U-m9b-006`; corrupt JSON / non-object `history` → `U-m9b-007`/`U-m9b-008`; recurrence does not apply today → `U-m9b-016`/`U-m9b-017`; day with no applicable recurring bricks → `U-m9b-021`; archived-day immutability → `U-m9b-014`/`U-m9b-015`.

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9b-01 seeded brick identity → fresh `uuid`; SG-m9b-02 `rollover` placement → `lib/history.ts`; SG-m9b-03 mid-session midnight → deferred, documented), and the plan's § Open questions for VERIFIER lists three confirmation items (v2 shape matches ADR-045 field-for-field; `rollover` reads no clock; `currentDate`/`history` on `AppState`). The TESTS phase covers the plan faithfully; the following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The schema bump breaks the M8 persist tests as literally written.** AC #14 requires "every M1–M8 + M9a Vitest test still passes," and § Retired test IDs above commits to editing **no existing test file**. But the M8 `U-m8-001` asserts `SCHEMA_VERSION === 1`, and `U-m8-003`/`U-m8-006` assert the v1 `{ schemaVersion:1, programStart, blocks, categories, looseBricks }` shape and v1 round-trip — bumping `lib/persist.ts` to `SCHEMA_VERSION = 2` and the v2 `PersistedState` **necessarily** breaks those three M8 IDs. The M9b **plan does not name this** — it says `lib/persist.ts` is modified but its § Out of scope / AC #14 read as "no regression." This is a genuine plan↔spec tension: either (a) AC #14's "every M8 test passes unmodified" is to be read as "the M8 _behaviors that survive the v2 bump_ pass, and the three version-pinned M8 IDs are legitimately amended to the v2 contract — which IS editing an existing test file," or (b) the M9b plan should explicitly list `U-m8-001`/`U-m8-003`/`U-m8-006` as **amended-to-v2** IDs (a § Retired/amended test IDs entry the M9b plan currently lacks). **VERIFIER's call** — the TESTS-phase reading is (a): those three M8 IDs must be updated to the v2 contract by the BUILDER, and AC #14 means "no _behavioral_ regression," not literal byte-identity of the M8 test file. This was not invented here — it is a real omission in the plan that VERIFIER should rule on rather than let the BUILDER silently resolve. Recommended VERIFIER outcome: confirm (a) and have the BUILDER amend the three M8 IDs to assert `schemaVersion: 2` + the v2 shape, OR FAIL back to PLANNER to add the amended-IDs note to `plan.md` § Out of scope.

2. **`programStart` field validation in `migrate` `case 1`.** The plan says `case 1` coerces `programStart` defensively (`typeof === "string" ? value : today()`). `U-m9b-005` asserts the happy path (`programStart` preserved). The non-string-`programStart`-in-a-v1-payload sub-case is folded into `U-m9b-009`'s `case 2` coercion assertion (the coercion rule is identical across `case 1` and `case 2`) rather than given a standalone `case 1` ID. VERIFIER may request a dedicated assertion in `U-m9b-005` if it enforces strict per-arm coverage; the recommendation is the fold (the coercion logic is shared).

Neither item is an unresolved ambiguity that blocks the BUILDER on item 2; **item 1 is a real plan gap VERIFIER must rule on.** No ADR is reversed: ADR-045 (v2 persisted schema + v1→v2 migration) is honored field-for-field — the v2 `PersistedState` in the IDs above matches `PersistedStateV2`; ADR-044 + ADR-018 transport (single `dharma:v1` key, two-pass load) is retained; ADR-019 (`Recurrence` union) is consumed unchanged via M9a's `appliesOn`. M9b adds 30 `m9b` test IDs (21 U + 6 C + 3 E; no A) and retires none.
