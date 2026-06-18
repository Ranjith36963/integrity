## Milestone 9b — Day rollover + history store — Plan

### Context

After M8 the app persists exactly one day: the same `AppState` survives every reload forever, and the calendar never turns over. M9b makes days real. The persisted schema bumps to `schemaVersion: 2` (ADR-045): it gains a `history` map (ISO-date → archived day) and a `currentDate` (the date the in-progress day belongs to). On boot, if `currentDate` is earlier than today, the day has ended — the in-progress day is archived into `history[currentDate]`, and a **fresh day is seeded** for today (recurring bricks re-created via M9a's `appliesOn`, reset to incomplete; one-off bricks dropped). Like M8, M9b adds **no new screen**: the observable effect is that crossing midnight and reopening the app puts yesterday on record while today starts clean with the user's recurring habits unchecked. M9b is the storage foundation the M9c–M9e calendar views read.

### Feature grouping

This plan is **one feature group: `m9b`** (one BUILDER dispatch). Test IDs in `tests.md` group under the same `m9b` slug. The sub-sections below (schema v2 / rollover / seeding / migration) are organizational, not separate features.

### File structure

**New files**

| Path                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/history.ts`      | NEW. Resolves SG-m9b-02. Exports the pure `rollover(state: PersistedState, todayISO: string): PersistedState` function and the `ArchivedDay` type (re-exported from `lib/types.ts` for caller convenience — see Data model). Pure module: no React, no `localStorage`, no clock read. `todayISO` is passed in; the clock is read once at the `usePersistedState` boundary. This is also the natural home for the M9c–M9e aggregation helpers later — but M9b adds **only** `rollover` here. |
| `lib/history.test.ts` | NEW. Co-located Vitest unit suite (repo convention `lib/<name>.test.ts`). **Its contents are the TESTS-phase / BUILDER deliverable, not this plan's** — listed only so the file structure is complete.                                                                                                                                                                                                                                                                                      |

**Modified files**

| Path                       | Change                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`             | Add the `ArchivedDay` type (`{ blocks: Block[]; categories: Category[]; looseBricks: Brick[] }`). `AppState` gains `currentDate: string` and `history: Record<string, ArchivedDay>` (see Data model for the SG-m9b decision and justification). `Block`/`Category`/`Brick`/`Recurrence`/`Action` unions are **untouched** (schema-locked since M2). Add a one-line M9b history comment.                                            |
| `lib/persist.ts`           | `SCHEMA_VERSION` becomes `2 as const`. `PersistedState` becomes the v2 shape `{ schemaVersion: 2, programStart, currentDate, history, blocks, categories, looseBricks }`. `defaultPersisted()` returns the v2 default. `migrate()` gains a `case 1:` arm (v1→v2) alongside a `case 2:` arm (v2 load + defensive coercion); `default:` still returns `null`. `saveState` writes the v2 shape. See Migration + `lib/persist.ts` API. |
| `lib/data.ts`              | `defaultState()` adds `currentDate: today()` and `history: {}`. Reducer arms unchanged — **no new `Action`** (rollover is not a reducer action; see Rollover algorithm). Update the header comment ("M9b: schema v2 — day rollover + history").                                                                                                                                                                                    |
| `lib/usePersistedState.ts` | The pass-2 hydration effect runs `rollover(loaded, today())` once, after `loadState()`, before the re-seeding `setState`. `projectToAppState` carries `currentDate` + `history` through. `toPersisted` lifts them back. `today()` from `lib/dharma` is the single clock read. See Hydration wiring.                                                                                                                                |

**Not modified — confirmed:** `lib/dharma.ts` (no aggregation in M9b — `dayPct` etc. are M9c+ read-time concerns; byte-identical post-M9b), `lib/appliesOn.ts` (consumed verbatim, never edited), `lib/uuid.ts` (consumed), every `app/` and `components/` file (no UI — see Components). The Building view renders whatever day rollover produced with zero component change.

### Data model

**`ArchivedDay` (ADR-045 — defined in `lib/types.ts`):**

```ts
export type ArchivedDay = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

A deep snapshot of one finished day's three collections — **no stored score** (ADR-045: day/week/month/year scores are always computed on read via `lib/dharma.ts`, never persisted).

**`PersistedState` v2 (the on-disk JSON shape, ADR-045 — defined in `lib/persist.ts`):**

```ts
export type PersistedState = {
  schemaVersion: 2;
  programStart: string; // ISO YYYY-MM-DD — unchanged from v1
  currentDate: string; // ISO YYYY-MM-DD — the date of the in-progress day
  history: Record<string, ArchivedDay>; // keyed by ISO YYYY-MM-DD
  blocks: Block[]; // the in-progress (current) day
  categories: Category[];
  looseBricks: Brick[];
};
```

This matches ADR-045's `PersistedStateV2` block field-for-field. Do not invent, rename, or reorder fields.

**Post-M9b in-memory `AppState` (`lib/types.ts`):**

```ts
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  programStart: string;
  currentDate: string; // NEW in M9b
  history: Record<string, ArchivedDay>; // NEW in M9b
};
```

**SG-m9b decision — `currentDate` and `history` join the in-memory `AppState`** (not boundary-only like `schemaVersion`). Rationale, mirroring the M8 SG-m8-04 reasoning (runtime-needed fields go on `AppState`, pure-persistence metadata stays at the boundary):

- `schemaVersion` stays boundary-only (M8 precedent unchanged) — it is pure storage metadata with no runtime consumer; `saveState` stamps it, `loadState`/`migrate` consume it, `AppState` never carries it.
- `currentDate` and `history` are **runtime data, not storage metadata**. `rollover` produces a post-rollover `PersistedState` and `usePersistedState` re-seeds `AppState` from it; if `currentDate`/`history` were stripped at the boundary, `toPersisted` could not reconstruct them for the next `saveState` (it would have to re-derive `currentDate` from a clock — re-introducing impurity — and `history` would be unrecoverable). They must round-trip through `AppState`.
- **M9b has no view that reads them** — true, the Building view ignores both. But unlike `schemaVersion` they are not inert: they are live day-construction state that the next `saveState` must persist verbatim. Keeping them on `AppState` is the only way the save effect (which lifts `AppState` → `PersistedState`) stays correct without a second clock read.
- **M9c implication (noted, not acted on):** the month-view switcher (M9c) will read `state.history` and `state.currentDate` directly off `AppState` — placing them there now means M9c needs no `AppState` change. M9b places the fields; M9c consumes them. This is consistent forward placement, not scope creep — M9b adds the fields because _it_ needs them to round-trip, and M9c happens to benefit.

`AppState` is not itself a locked object schema (only nested `Block`/`Category`/`Brick`/`Recurrence` shapes are — M3 grew `AppState` with `looseBricks`, M4f shrank it, M8 added `programStart`; additive `AppState` evolution is established precedent). These are additive `AppState` fields, not `Block`/`Category` schema edits.

**Persistence requirement:** `localStorage` only, single key `dharma:v1` unchanged (ADR-018 + ADR-044 transport retained — only the `schemaVersion` _value_ moves to `2`, not the key string).

### `lib/persist.ts` API (v2)

```ts
export const STORAGE_KEY = "dharma:v1"; // unchanged
export const SCHEMA_VERSION = 2 as const; // was 1
export type PersistedState = {
  schemaVersion: 2;
  programStart;
  currentDate;
  history;
  blocks;
  categories;
  looseBricks;
};
```

- **`defaultPersisted(): PersistedState`** — returns `{ schemaVersion: 2, programStart: today(), currentDate: today(), history: {}, blocks: [], categories: [], looseBricks: [] }`. `today()` from `lib/dharma`. The empty-state default for first run and every failure path (AC #2). `currentDate === programStart === today` on first run.
- **`saveState(state: PersistedState): void`** — `JSON.stringify` the full v2 shape, `localStorage.setItem`. Body wrapped in `try/catch`; on throw (quota, disabled) the catch is empty — swallowed, no rethrow. Synchronous, no debounce (M8 SG-m8-01 retained).
- **`loadState(): PersistedState`** — read `getItem` inside `try/catch`; `null` → `defaultPersisted()`; `JSON.parse` throws → `defaultPersisted()`; parsed value → `migrate()`; `migrate` returns `null` → `defaultPersisted()` (AC #1, #2, #4, #5). `loadState` does **not** call `rollover` — rollover is the hydration layer's job (purity: `loadState` is transport only).
- **`migrate(raw: unknown): PersistedState | null`** — the single version-logic site; the `switch (obj.schemaVersion)` gains a `case 1` and a `case 2`:
  - `raw` not a non-null plain object → `null` (corrupt — AC #5).
  - **`case 1` (v1→v2 migration, ADR-045):** coerce v1 collections defensively (`Array.isArray(...) ? value : []` for `blocks`/`categories`/`looseBricks`; `programStart` is `typeof === "string" ? value : today()`), then **add the v2 fields**: `schemaVersion: 2`, `currentDate: today()` (the v1 day's true date is unrecoverable — v1 stored none — so it becomes today's in-progress day, an accepted one-time approximation per ADR-045 / spec Edge case), `history: {}`. Return the v2 object (AC #3).
  - **`case 2`:** coerce `blocks`/`categories`/`looseBricks` defensively (`Array.isArray` else `[]`); `programStart`/`currentDate` are `typeof === "string" ? value : today()`; **`history` is coerced** — `history` present and a non-null non-array object → kept; otherwise → `{}` (AC #5 — non-object `history` coerced, no throw). Return the v2 object (AC #1).
  - `default:` (`schemaVersion` 3+, non-numeric, or absent) → `null` → `loadState` falls back to `defaultPersisted()` (AC #4). Forward-incompatible data is never guessed at.

`migrate` is the only place version logic lives. Per-brick field validation stays out of scope (M8 stance retained — collection presence + `history`-is-object coercion only).

### The rollover algorithm

`rollover` is a **pure function** — `rollover(state: PersistedState, todayISO: string): PersistedState`. It reads no clock; `todayISO` is supplied by the caller (`usePersistedState`, which reads `today()` once). This makes every rollover branch unit-testable without faking a clock.

```
rollover(state, todayISO):
  1. DETECT.  If state.currentDate >= todayISO  →  return state UNCHANGED (same reference).
              (ISO YYYY-MM-DD strings sort lexicographically === chronologically — plain
               string compare, timezone-free. `===` today and the should-not-occur
               `currentDate` in the future both short-circuit to no-op — AC #6.)
  2. ARCHIVE. Build an ArchivedDay deep snapshot of the in-progress day:
              archived = deepClone({ blocks: state.blocks,
                                     categories: state.categories,
                                     looseBricks: state.looseBricks })
              Place it: history' = { ...state.history, [state.currentDate]: archived }
              Only the real currentDate key is written — NO entry for any intervening
              skipped date (AC #10; spec Edge case: absent in-range date = implicit
              zero-score day, never fabricated).
  3. SEED.    Compute the fresh day for todayISO from the in-progress day (see
              Fresh-day seeding): freshBlocks, freshLoose. categories carry verbatim.
  4. ADVANCE. return {
                ...state,
                schemaVersion: 2,
                history: history',
                currentDate: todayISO,
                blocks: freshBlocks,
                categories: state.categories,   // carry forward unchanged (AC #13)
                looseBricks: freshLoose,
              }
```

- **Single-pass, no per-skipped-day loop.** When N > 1 days were skipped, step 2 archives exactly one day (`state.currentDate`) and step 4 advances straight to `todayISO`. Intervening dates get no `history` entry (AC #10).
- **Determinism.** Same `(state, todayISO)` always yields the same result; `rollover` mutates none of its inputs (AC #9 depends on this — the snapshot in step 2 is a deep clone, so later mutation of the fresh in-progress day cannot reach into `history`).
- **No reducer action.** Rollover is not a user mutation — it runs once at hydration, before the day renders. Adding a `ROLLOVER` action would break the M4f-locked `Action` union. `usePersistedState` applies it by composing `rollover` into the pass-2 `setState` (see Hydration wiring) — exactly how M8 re-seeds without a `HYDRATE` action.

**Deep-clone choice:** use `structuredClone` (built-in in Node 18+ and all modern browsers; Next.js 15 runtime ships it — no new dependency). It deep-copies the `ArchivedDay` collections so AC #9 (archived-day immutability) holds with zero hand-written clone code. Fallback if a target runtime ever lacked it would be `JSON.parse(JSON.stringify(...))`, but `structuredClone` is the plan's choice — the collections are plain JSON-shaped data (no functions, no cycles).

### Fresh-day seeding detail

The fresh day is built by filtering the in-progress day's bricks through `appliesOn`:

- **Per-brick seeding rule.** A brick is seeded onto the fresh day **iff** it `hasDuration === true` AND `appliesOn(brick.recurrence!, todayISO) === true`. A brick with `hasDuration === false` carries **no `recurrence`** (the `lib/types.ts` presence invariant) → never seeded. A `hasDuration: true` brick whose `recurrence.kind === "just-today"` resolves `appliesOn` `false` for any `todayISO` other than its stored `date` → dropped (AC #11). `every-weekday` on a weekend, `custom-range` outside its window → dropped (AC #11, spec Edge case).
- **SG-m9b-01 — Seeded brick identity: RESOLVED → a fresh `uuid()` per day-instance.** Each seeded brick is re-created with a new `id` from `lib/uuid.ts`. Rationale (ADR-045 leaves brick _behavior_ to this plan; spec SG-m9b-01 recommends fresh `uuid`): each day's brick is a distinct instance; M9's score views (M9c–M9e) need no cross-day brick identity; a stable `id` would conceptually collide across `history` entries (the same `id` appearing in yesterday's `ArchivedDay` and today's live day). A future "habit streak" feature, if specced, would track recurrence-definition identity, not brick `id` — so a fresh `uuid` costs nothing now. The recurrence _definition_ (`recurrence`, `start`, `end`, `name`, `categoryId`, `target`, `unit`) is preserved verbatim; only `id`, `done`, and `parentBlockId` are re-derived.
- **`done` reset per kind (AC #12).** `kind: "tick"` → `done: false`. `kind: "units"` → `done: 0`. The brick's `target`, `unit`, `start`, `end`, `recurrence`, `name`, `categoryId` are preserved unchanged.
- **Block filtering (AC #13).** For each block in the in-progress day: compute its seeded bricks (apply the per-brick rule above to `block.bricks`). A block carries into the fresh day **iff** it has ≥1 seeded brick; it then hosts **only** those seeded bricks. A block with zero applicable recurring bricks is dropped entirely. The carried block itself gets a **fresh `uuid`** (same identity reasoning — a day-instance of the block), preserving `name`, `start`, `end`, `recurrence`, `categoryId`.
- **`parentBlockId` consistency.** Because both block and brick `id`s are re-derived, each seeded brick's `parentBlockId` must be re-pointed to the _new_ block `id`, not the stale one. The seeding pass therefore allocates each carried block's new `uuid` first, then maps that block's seeded bricks with `parentBlockId: newBlockId`. Loose recurring bricks keep `parentBlockId: null`.
- **Loose bricks.** `state.looseBricks` is filtered by the same per-brick rule; survivors are re-created with fresh `uuid`, `done` reset, `parentBlockId: null` (AC #11, #12).
- **A day with no applicable recurring bricks** → `freshBlocks = []`, `freshLoose = []`; `categories` still carry forward (spec Edge case; AC #13).

### Hydration wiring (`lib/usePersistedState.ts`)

M8's two-pass `mounted`-flag pattern is retained; M9b inserts `rollover` into pass 2 and widens the projections:

1. **Pass 1 (unchanged shape):** `useState` lazily initialized from `projectToAppState(defaultPersisted())` — SSR + first client paint render the empty v2 default. No `loadState`, no `rollover`, no clock in render or the initializer (M8 Risk R1 — the BUILDER must not move either into render).
2. **`projectToAppState(p: PersistedState): AppState`** — now also copies `currentDate` and `history` through (drops only `schemaVersion`).
3. **`toPersisted(s: AppState): PersistedState`** — now also lifts `currentDate` and `history` back; `schemaVersion: 2` stamped.
4. **Pass 2 (the M9b change):** the post-mount `useEffect` does `const loaded = loadState(); const rolled = rollover(loaded, today()); setState(projectToAppState(rolled)); setMounted(true);`. `today()` from `lib/dharma` is the **single clock read** in the whole rollover path. Rollover runs **once on mount, after load, before the day first renders** — exactly the contract the spec names. If `currentDate >= today`, `rollover` returns the loaded state unchanged (step 1) → no-op, identical to M8 behavior.
5. **Save effect (unchanged guard):** `if (!mounted) return; saveState(toPersisted(state))`. The `mounted` guard still prevents the empty-default first render from clobbering a real `dharma:v1`. Because `setMounted(true)` runs after the pass-2 `setState`, the first `saveState` persists the _post-rollover_ state — yesterday lands in `history` on disk on the first save after a rollover boot.

### Components

**None.** M9b adds no UI, no React component, no new hook (it edits the existing `usePersistedState`). No `app/` or `components/` file changes. The Building view renders whatever day `rollover` produced — same components, same props, different data. State this explicitly to the BUILDER: do not create a calendar screen, a view switcher, or any visual surface.

### Design tokens

**None.** M9b is pure storage + rollover logic — zero new colors, fonts, spacing, motion, or shadows. `app/globals.css` is untouched. AC #14 ("no new screen or component") is a hard constraint.

### Dependencies

**None.** No new `package.json` entry. `localStorage`, `JSON`, `structuredClone` (built-in, Node 18+ / modern browsers — Next.js 15 ships it), `crypto.randomUUID` via existing `lib/uuid.ts`, and React hooks cover M9b entirely. `appliesOn` is the M9a in-repo function.

### Edge cases

Each spec Edge case mapped to its planned code path:

| Spec edge case                                          | Planned code path                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| First run, no key                                       | `loadState` → `null` → `defaultPersisted()`: `currentDate` = `programStart` = today, `history` = `{}`, empty collections (AC #2).           |
| `currentDate` === today                                 | `rollover` step 1 DETECT: `currentDate >= todayISO` → return state unchanged; `history` untouched (AC #6).                                  |
| `currentDate` === yesterday                             | `rollover` step 2 archives the day under `history[currentDate]`; step 3 seeds a fresh day (AC #7, #8).                                      |
| `currentDate` is N > 1 days before today                | `rollover` step 2 archives **only** `state.currentDate`; no loop, no fabricated intervening entries (AC #10).                               |
| `schemaVersion: 1` payload                              | `migrate` `case 1`: v1 collections + `programStart` preserved; `currentDate` = today, `history` = `{}`, `schemaVersion` = 2 (AC #3).        |
| `schemaVersion` 3+ or non-numeric                       | `migrate` `default:` → `null` → `loadState` → `defaultPersisted()`; no throw (AC #4).                                                       |
| Corrupt JSON, or `history` not an object                | `JSON.parse` throw → `defaultPersisted()`; OR `migrate` `case 2` coerces a non-object `history` → `{}`; no throw (AC #5).                   |
| A recurring brick whose recurrence does not apply today | Fresh-day seeding per-brick rule: `appliesOn(rec, todayISO) === false` → brick not seeded (AC #11).                                         |
| A day with no applicable recurring bricks               | Seeding yields `freshBlocks = []`, `freshLoose = []`; `categories` still carry (AC #13).                                                    |
| Archived-day immutability                               | `rollover` step 2 uses `structuredClone` for the `ArchivedDay`; later mutation of the fresh in-progress day cannot reach `history` (AC #9). |

**Not handled (deliberately, per spec "What this is NOT"):** mid-session midnight crossing (see SG-m9b-03 below); calendar UI; score aggregation; fabricated archived days for skipped dates; editing/deleting archived days; a `deletions` map; cloud sync.

### Commit strategy

m9b is one feature group, one BUILDER dispatch. The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned:** the BUILDER may group the red and green commits per logical area (one red+green pair for the schema-v2 / `migrate` IDs, one for `rollover` archive/advance, one for fresh-day seeding, one for hydration wiring) rather than one commit pair per individual test ID. The orchestrator and EVALUATOR hold the BUILDER to per-group granularity, not strict per-ID. Red commits: `test(m9b): …`; green/refactor commits: `feat(m9b): …` or `fix(m9b): …`. No phase exit until every `m9b` test ID in `tests.md` is green.

### Out of scope

- **Any calendar UI** — month (Kingdom / M9c), week (Castle / M9d), year (Empire / M9e) views, the day/week/month/year view switcher. M9b adds no screen.
- **Score aggregation** over a date range — a read-time M9c–M9e concern. M9b stores raw days and computes nothing; `lib/dharma.ts` is untouched.
- **Mid-session midnight crossing** — see SG-m9b-03 (deferred, documented).
- **Fabricating archived days** for dates the user never opened — only the real `currentDate` day is archived.
- **Editing or deleting archived days**, and a `deletions` map — a later Edit-Mode milestone, `schemaVersion: 3`.
- **Cloud sync, multi-device merge** — Phase 2+.
- **Pruning `history`** — ADR-045: ~a year of days is a few hundred KB, well within `localStorage` limits; not needed in Phase 1.
- **A new ADR** — ADR-045 (Accepted 2026-05-18) locks the v2 schema + migration; ADR-044 + ADR-018 supply the retained transport; ADR-019 locks `Recurrence`. M9b introduces no new decision surface.

### Open questions for VERIFIER

All three spec gaps are **resolved in-plan**:

- **SG-m9b-01 — Seeded brick identity: RESOLVED → fresh `uuid()` per day-instance.** Each seeded brick (and carried block) gets a new `id` from `lib/uuid.ts`; the recurrence definition is preserved verbatim; `parentBlockId` is re-pointed to the new block `id`. See Fresh-day seeding detail.
- **SG-m9b-02 — Rollover function placement: RESOLVED → a pure exported `rollover` in a new `lib/history.ts`.** Called by `usePersistedState` on mount. `lib/history.ts` is also the future home of the M9c–M9e aggregation helpers (M9b adds only `rollover`). See File structure + The rollover algorithm.
- **SG-m9b-03 — Mid-session midnight crossing: RESOLVED → deferred, accepted for M9b.** Rollover fires on **load only** (the pass-2 hydration effect). If the app is left open across midnight, rollover does not fire until the next load/reopen. A future polish milestone may add an interval or `visibilitychange` check. This deferral is documented here, not silently dropped — VERIFIER confirms it is recorded.

VERIFIER may wish to confirm: (a) the v2 `PersistedState` shape matches ADR-045's `PersistedStateV2` field-for-field (it does — see Data model); (b) `rollover` reads no clock — `todayISO` is a parameter, the single `today()` call lives in `usePersistedState`; (c) the SG-m9b decision to place `currentDate`/`history` on `AppState` (justified above against the M8 SG-m8-04 boundary reasoning — they must round-trip for `saveState` to stay pure).

### ADR needed

None. ADR-045 (Accepted 2026-05-18) locks the v2 persisted schema (`ArchivedDay`, `PersistedStateV2`) and the v1→v2 migration; ADR-044 + ADR-018 supply the retained single-key two-pass transport; ADR-019 locks the `Recurrence` union the seeding step consumes via M9a's `appliesOn`. Rollover _behavior_ is governed by the M9b spec entry, not an ADR (ADR-045 explicitly says so). All three SG-m9b gaps are resolved within this plan. No choice here exceeds an existing ADR.
