## Milestone 8 — Persistence — Tests

This entry covers M8 — `lib/persist.ts` (`loadState`/`saveState`/`PersistedState`/`STORAGE_KEY`/`migrate`/`defaultPersisted`), the `usePersistedState()` hook in `lib/usePersistedState.ts`, two-pass hydration wired into `BuildingClient`, and the AC #13 day-number swap (`BuildingClient` wires the **pre-existing** `lib/dharma.ts:dayNumber()` helper in place of `dayOfYear()` — the helper is not new and is not re-authored; see § Retired test IDs). It is derived from the `plan.md` M8 entry (`## Milestone 8 — Persistence — Plan`, committed `b25d174`, day-number section amended per VERIFIER FAIL retry 1). Feature slug: `m8`. ID prefixes: `U-m8-`, `C-m8-`, `E-m8-`, `A-m8-`.

### Testing approach — what is bespoke vs gate-verified

M8 has a **large genuine unit + component surface** (the persist module is pure and the hydration ordering is behavior-rich), so unlike M4g this entry authors real GIVEN/WHEN/THEN `it()` blocks for the persistence engine and the hydration wiring. Two ACs are honestly gate-verified rather than bespoke-tested, consistent with how M4f/M4g mapped purely-structural ACs to `npm run eval`:

- **AC #14 (no regression — every M1–M4g Vitest/component test passes unmodified)** → gate-verified by the **full Vitest suite staying green** under `npm run eval`. M8 changes no UI surface, so a bespoke "nothing changed" test would be vacuous; the binding proof is that no prior test file is edited and all prior IDs stay green. (`U-m8-009` plus `C-m8-001`/`C-m8-007` give runtime anchors for the schema-lock and zero-UI-delta portions, but the regression guarantee itself is the suite gate.)
- **AC #15 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest green; E2E clears `localStorage` per case)** → gate-verified by `npm run eval` (lint + typecheck + vitest + e2e + a11y). The `localStorage`-cleared-per-case requirement is realized as a `test.beforeEach` in the E2E specs (see § E2E) — not a bespoke assertion.

All other 13 ACs map to at least one concrete test ID below. One nuance: **AC #13 (`programStart`-relative day number)** is a pure wiring task — `BuildingClient` swaps `dayOfYear(new Date())` for the **pre-existing** `lib/dharma.ts:dayNumber()` helper. The helper's math is already covered green by the existing `U-bld-024` (`lib/dharma.test.ts`); M8 therefore authors **no** bespoke unit test for the helper and verifies AC #13 only at the wiring layer (`C-m8-007`). The pre-VERIFIER draft's `U-m8-012`/`U-m8-013` were removed for re-testing the helper against a wrong, clamped signature that contradicted the locked `U-bld-024` contract — see § Unit and § Retired test IDs.

### Mutation-resistance notes (read before reviewing the IDs)

Per the dispatch's explicit requirement, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **Round-trip tests assert exact restored values** — `U-m8-002`/`C-m8-004` assert the precise `done` value of each brick (`true`/`false` for tick, the exact integer for units), block ids, category ids, and `programStart` — not "state is non-empty". A mutant that restores a default-but-non-empty state must fail.
- **Malformed-JSON / unknown-version tests assert two things** — the default IS returned AND no exception escapes (`expect(() => loadState()).not.toThrow()` plus a deep-equal on the returned default). A mutant that lets the parse error propagate fails the no-throw arm; a mutant that returns `undefined` fails the deep-equal arm.
- **The two-pass ordering test (`C-m8-003`, R2)** asserts that `saveState` does NOT fire on the empty-default first render and does NOT clobber a pre-seeded real `dharma:v1` before hydration completes — a mutant that drops the `if (!mounted) return` guard fails it.
- **Schema-lock test (`C-m8-001`)** asserts no `HYDRATE` (or any new) action type exists on the `Action` union and that `reducer` never receives an unknown action — a mutant that re-seeds via a new action variant fails it.

### Test ID layout

| Layer                                 | IDs             | Count  |
| ------------------------------------- | --------------- | ------ |
| Unit (Vitest)                         | `U-m8-001..011` | 11     |
| Component / integration (Vitest+TL)   | `C-m8-001..007` | 7      |
| E2E (Playwright, deferred-to-preview) | `E-m8-001..003` | 3      |
| Accessibility (axe via Playwright)    | `A-m8-001`      | 1      |
| **Total**                             |                 | **22** |

_`U-m8-012`/`U-m8-013` from the pre-VERIFIER draft were removed (see § Unit and § Retired test IDs) — the `U-m8-` series ends at `011` with no renumbering of surviving IDs and no gap re-used._

### Unit (Vitest)

All `U-m8-*` IDs mock `localStorage` (a fresh in-memory stub installed on `globalThis.localStorage` in `beforeEach`, cleared in `afterEach`) so the persist module is exercised in isolation with no real browser storage.

#### U-m8-001

Target file: `lib/persist.test.ts` (NEW)
**GIVEN** the `lib/persist.ts` module
**WHEN** its exports are inspected
**THEN** `STORAGE_KEY` is the exact string `"dharma:v1"`; `SCHEMA_VERSION` is the number `1`; `loadState`, `saveState`, `defaultPersisted`, and `migrate` are all `typeof === "function"`; the `PersistedState` type is exported (compile-time, `tsc` gate — a `PersistedState`-typed literal `{ schemaVersion: 1, programStart: "2026-05-15", blocks: [], categories: [], looseBricks: [] }` type-checks).
Proves: plan.md § `lib/persist.ts` API (module surface; `STORAGE_KEY`/`SCHEMA_VERSION` constants) — covers SPEC AC #1.

#### U-m8-002

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and a `PersistedState` value with one block `{ id: "b1" }` holding one nested `kind: "units"` brick `{ id: "n1", done: 25 }`, one category `{ id: "c1" }`, one loose `kind: "tick"` brick `{ id: "t1", done: true }`, and `programStart: "2026-05-01"`
**WHEN** `saveState(state)` is called, then `loadState()` is called
**THEN** `loadState()` returns a value deep-equal to the saved state — the block id is `"b1"`, the nested units brick's `done === 25` (exact integer), the category id is `"c1"`, the loose tick brick's `done === true` (exact boolean, not coerced), and `programStart === "2026-05-01"`.
**AND** the raw `localStorage.getItem("dharma:v1")` string `JSON.parse`s to an object whose top-level keys are exactly `schemaVersion`, `programStart`, `blocks`, `categories`, `looseBricks` and whose `schemaVersion === 1` — the ADR-044 shape (cross-ref `U-m8-003`).
Proves: plan.md § `lib/persist.ts` API (`saveState`/`loadState` round-trip; exact `done` value fidelity for both brick kinds) — covers SPEC AC #2, AC #3, AC #7.

#### U-m8-003

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and an `AppState` `{ blocks: [b1], categories: [c1], looseBricks: [t1], programStart: "2026-05-01" }`
**WHEN** `saveState(state)` is called
**THEN** `localStorage.getItem("dharma:v1")` is a non-null JSON string; `JSON.parse` of it equals `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [b1], categories: [c1], looseBricks: [t1] }` — `schemaVersion` is the literal `1` and is present even though it is NOT a field of the input `AppState` (added at the persist boundary per SG-m8-04); the parsed object has **no** key other than those five (no leaked runtime-only field).
Proves: plan.md § Data model / SG-m8-04 resolution (`saveState` writes the ADR-044 wrapper shape; `schemaVersion` is a boundary-only key) — covers SPEC AC #2.

#### U-m8-004

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (`getItem` returns `null` — first run) and the system clock set/known to today
**WHEN** `loadState()` is called
**THEN** it returns a `PersistedState` with `blocks`, `categories`, `looseBricks` all `[]` (empty arrays), `schemaVersion === 1`, and `programStart` equal to today's ISO date (the `today()` helper's value) — the empty-state default.
**AND** no exception is thrown.
Proves: plan.md § `lib/persist.ts` API (`loadState` no-key path → `defaultPersisted()`; `programStart` stamped to today) — covers SPEC AC #3, AC #12.

#### U-m8-005

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is the malformed string `"{not valid json"` (un-parseable)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()` — no exception escapes; AND the return value is deep-equal to `defaultPersisted()` (empty `blocks`/`categories`/`looseBricks`, `schemaVersion: 1`, `programStart` = today).
**AND** `loadState` does **not** call `localStorage.removeItem` — the corrupt key is left in place for the next `saveState` to overwrite (SG-m8-05 passive disposition; assert the `removeItem` spy was not called).
Proves: plan.md § `lib/persist.ts` API + § Edge cases (malformed JSON → `defaultPersisted()`, no throw, passive overwrite) — covers SPEC AC #8.

#### U-m8-006

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for `{ schemaVersion: 2, programStart: "2026-05-01", blocks: [], categories: [], looseBricks: [] }` (a future/unknown version)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()` — `migrate` returned `null` for the unknown version and `loadState` fell back to the default.
**AND** the same holds for `schemaVersion: 0` and for a missing `schemaVersion` key (both → `null` from `migrate` → default).
Proves: plan.md § `lib/persist.ts` API `migrate` (unknown/future/absent `schemaVersion` → `null` → `defaultPersisted()`; forward-incompatible data not guessed at) — covers SPEC AC #9.

#### U-m8-007

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **partial** object `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [b1] }` (`categories` and `looseBricks` absent)
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` has `blocks` equal to `[b1]` (the present collection is preserved verbatim), `categories === []` and `looseBricks === []` (each absent collection filled with a fresh empty array), and `programStart === "2026-05-01"`.
**AND** when `blocks` is present but not an array (e.g. `blocks: "oops"`), it is also coerced to `[]` (`Array.isArray(...) ? value : []`).
Proves: plan.md § `lib/persist.ts` API `migrate` (partial object → absent/non-array collections filled with `[]`) — covers SPEC AC #10.

#### U-m8-008

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `getItem` is stubbed to **throw** (e.g. `new DOMException("denied")` — Safari private mode / storage disabled)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()`.
**AND** given a `localStorage` whose `setItem` is stubbed to throw (quota exceeded), `expect(() => saveState(anyValidState)).not.toThrow()` — the error is swallowed inside `saveState`'s `try/catch`, no rethrow.
Proves: plan.md § `lib/persist.ts` API + § Edge cases (`getItem`/`setItem` throwing → `loadState` returns default, `saveState` swallows; app never crashes) — covers SPEC AC #11.

#### U-m8-009

Target file: `lib/persist.test.ts`
**GIVEN** the `migrate(raw: unknown)` function exercised directly
**WHEN** called with `null`, `undefined`, a number, a string, and an array
**THEN** every non-(non-null-object) input returns `null`.
**AND** when called with a well-versioned object `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [], categories: [], looseBricks: [] }` it returns a `PersistedState` (not `null`); the returned object's `schemaVersion === 1`.
**AND** the only version-branching site is `migrate` — `loadState` itself contains no `schemaVersion` literal comparison (assert by inspection / the migrator-scaffold invariant; M5's `case 2` extension is a single-function change).
Proves: plan.md § `lib/persist.ts` API `migrate` (scaffold version-gate; non-object → `null`; `migrate` is the sole version-logic site — ADR-044) — covers SPEC AC #9.

#### U-m8-010

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with a prior-session `dharma:v1` whose `programStart` is `"2026-03-10"` (an old date, not today)
**WHEN** `loadState()` is called
**THEN** the returned `programStart === "2026-03-10"` — preserved verbatim, **not** re-stamped to today; the string passes straight through `migrate`.
**AND** when `programStart` is present but not a string (e.g. `programStart: 123`), `migrate` coerces it to `today()` (defensive default for a corrupt field).
Proves: plan.md § `lib/persist.ts` API `migrate` + § Edge cases (`programStart` already set → preserved; non-string → `today()`) — covers SPEC AC #12.

#### U-m8-011

Target file: `lib/persist.test.ts`
**GIVEN** the `defaultPersisted()` factory
**WHEN** it is called twice
**THEN** each call returns a fresh object with `schemaVersion === 1`, `blocks`/`categories`/`looseBricks` all `[]`, and `programStart` equal to today's ISO date; the two returned `blocks` arrays are **distinct references** (no shared mutable default) — `defaultPersisted().blocks !== defaultPersisted().blocks`.
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` shape; fresh-object factory, no shared-array footgun) — covers SPEC AC #3.

_(IDs `U-m8-012` and `U-m8-013` were removed during VERIFIER FAIL retry 1 — they re-tested the math of the **pre-existing** `lib/dharma.ts:dayNumber()` helper, which is already covered green by `U-bld-024`. AC #13 is a pure wiring task; its coverage lives at the component layer in `C-m8-007`. No `U-m8-` ID is reused for the gap — the series ends at `U-m8-011`. See § Retired test IDs.)_

### Component (Vitest + Testing Library)

`C-m8-*` IDs render the `usePersistedState()` hook (via a tiny test harness component or `renderHook`) and/or `BuildingClient`, with a mocked `localStorage`. The `dharma:v1` key is cleared before each test.

#### C-m8-001

Target file: `lib/usePersistedState.test.tsx` (NEW)
**GIVEN** the `usePersistedState()` hook and the post-M8 `Action` union from `lib/types.ts`
**WHEN** the hook is rendered and its returned tuple inspected
**THEN** the tuple is `[state, dispatch]` where `state` is an `AppState` and `dispatch` is a function; the `Action` union contains **no** `HYDRATE` member and no other M8-added action variant (compile-time `tsc` gate: an action literal `{ type: "HYDRATE" }` is a type error; runtime: dispatching every existing action type — `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE` — succeeds, and the reducer is never handed an unknown type).
**AND** `reducer` (from `lib/data.ts`) is byte-identical to M4f — the hook re-seeds state via direct `setState`, not via a new action (plan.md § Hydration design, § Risks R3).
Proves: plan.md § Hydration design + § Risks R3 (schema lock: no new `Action`; hook re-seeds via `setState`) — covers SPEC AC #14 (runtime anchor for the `Action`-lock portion).

#### C-m8-002

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` containing a valid `dharma:v1` with one block, one category, and one loose brick
**WHEN** `usePersistedState()` is rendered and the state is read **synchronously on the first render** (before effects flush — simulating SSR / first client paint)
**THEN** the first-render `state` is the empty default — `blocks: []`, `categories: []`, `looseBricks: []` — **not** the persisted values; the lazy `useReducer`/`useState` initializer returned `projectToAppState(defaultPersisted())` and `loadState()` was **not** called during render (assert the `loadState` spy has zero calls at first-render time).
Proves: plan.md § Hydration design pass-one + § Risks R1 (SSR / first paint = empty default; `loadState` never called in render) — covers SPEC AC #4.

#### C-m8-003

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` **pre-seeded** with a real `dharma:v1` holding one block `b1` (a user's prior-session day), and `saveState` wrapped in a spy
**WHEN** `usePersistedState()` is rendered and effects are allowed to flush (`act`)
**THEN** the two-pass ordering holds: `saveState` is **not** called on the empty-default first render — at the moment just after first paint and before the hydration effect, the `saveState` spy has **zero** calls; the pre-seeded `dharma:v1` still contains `b1` (it was NOT overwritten with `[]`).
**AND** after the hydration effect runs (`setState(loadedAppState)` + `setMounted(true)`), the state holds `b1`; only a **subsequent** mutating dispatch — never the hydration itself or the first render — triggers the first `saveState`.
Proves: plan.md § Hydration design step 4 + § Risks R2 (the `if (!mounted) return` guard prevents the empty-default save effect from clobbering a real persisted value before hydration completes) — covers SPEC AC #4, AC #5 (R2 ordering guarantee).

#### C-m8-004

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` containing a valid `dharma:v1` with block `b1` (holding a nested `kind: "units"` brick `n1` with `done: 40`), category `c1`, and loose `kind: "tick"` brick `t1` with `done: true`
**WHEN** `usePersistedState()` is rendered and effects flush
**THEN** after mount the hook's `state` deep-equals the persisted state — `state.blocks[0].id === "b1"`, the nested brick `n1.done === 40` (exact), `state.categories[0].id === "c1"`, `state.looseBricks[0].done === true` (exact), and `state.programStart` equals the persisted `programStart`; `schemaVersion` is **not** present on `state` (stripped at the boundary — `"schemaVersion" in state === false`).
Proves: plan.md § Hydration design pass-two + § Data model / SG-m8-04 (post-mount rehydration restores exact persisted blocks/categories/loose bricks; `schemaVersion` projected away) — covers SPEC AC #5, AC #7.

#### C-m8-005

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness, mounted and hydrated (mocked `localStorage`, `saveState` spied)
**WHEN** each of the five mutating actions is dispatched in turn — `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`
**THEN** after each dispatch `localStorage["dharma:v1"]` `JSON.parse`s to the **post-dispatch** state — e.g. after `ADD_BLOCK` the persisted `blocks` array contains the new block; after `LOG_TICK_BRICK` the persisted brick's `done` reflects the flip; the save effect fired exactly once per mutating dispatch (the `[mounted, state]`-deps effect — no per-handler wiring).
Proves: plan.md § Hydration design step 4 + SG-m8-01 (save-on-every-mutating-dispatch; all five actions covered by the single deps effect) — covers SPEC AC #6.

#### C-m8-006

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness, mounted and hydrated, with a units brick `u1` at `done: 5`
**WHEN** the full mutate→reload cycle is simulated: dispatch `SET_UNITS_DONE { brickId: "u1", done: 22 }`, then **unmount** the harness and **re-render a fresh** `usePersistedState()` against the same mocked `localStorage`
**THEN** the freshly-mounted hook, after its hydration effect flushes, holds `u1` with `done === 22` (the exact pre-reload value) — the day survived the reload; every block, category, and loose-brick id and every brick `done` value matches the pre-reload `AppState`.
Proves: plan.md § Hydration design (full save→reload→rehydrate round-trip through the hook) — covers SPEC AC #7.

#### C-m8-007

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a mocked `localStorage` whose `dharma:v1` carries `programStart: "2026-05-01"`, and the system "today" known to be `"2026-05-15"`
**WHEN** the component mounts, effects flush, and the Hero top bar is queried
**THEN** the Hero renders `Building 15 of <daysInYear>` — the day number is `dayNumber("2026-05-01", "2026-05-15") === 15`, computed `programStart`-relative, **not** `dayOfYear(new Date())`; `totalDays` is still `daysInYear(...)` (one-year arc unchanged); the `<Hero>` prop signature (`dayNumber?: number`, `totalDays: number`) is unchanged.
**AND** on a first run (no `dharma:v1`, `programStart` stamped to today) the Hero renders `Building 1 of <daysInYear>`.
Proves: plan.md § Day-number design (AC #13 full swap — `BuildingClient` feeds `dayNumber(state.programStart, todayIso)` to `<Hero>`; no prop-signature change) — covers SPEC AC #13, AC #14 (Hero prop-signature-unchanged anchor).

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent (this realizes the AC #15 "clears `localStorage` between cases" requirement). Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only.

#### E-m8-001

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/`
**WHEN** the page renders and the building view is inspected (under `count() > 0` guard)
**THEN** the app shows the empty-state default — no console hydration-mismatch warning is emitted; the Hero day number reads `Building 1 of <N>`; `localStorage["dharma:v1"]`, once first-run save fires, is valid JSON with `schemaVersion: 1` and empty `blocks`/`categories`/`looseBricks`.
Proves: plan.md § Test surface preview E2E (first-run-empty; no hydration-mismatch) — covers SPEC AC #4, AC #15 (first-run-empty case).

#### E-m8-002

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared, the app at `/`
**WHEN** the user adds a block and a brick, ticks the brick (or types a units value), then **reloads the page** (`page.reload()`)
**THEN** after the reload the same block, brick, and the brick's exact `done` state are still present on the timeline / tray (under `count() > 0` guard) — the day survived the reload; `localStorage["dharma:v1"]` holds the post-mutation state.
Proves: plan.md § Test surface preview E2E (mutate-then-reload-persists, including brick `done`) — covers SPEC AC #6, AC #7, AC #15 (mutate-then-reload case).

#### E-m8-003

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared, then `dharma:v1` set to the corrupt string `"{not json"` via `page.evaluate`
**WHEN** the app is loaded fresh at `/`
**THEN** the app renders normally — no uncaught exception, no crash, no error overlay; the building view shows the empty-state default (under `count() > 0` guard); a subsequent mutation followed by reload persists correctly (the corrupt key was overwritten by the next `saveState`).
Proves: plan.md § Test surface preview E2E + § Edge cases (corrupt-key-recovers without crash; passive overwrite-on-next-save) — covers SPEC AC #8, AC #11, AC #15 (corrupt-key case).

### Accessibility (axe via Playwright) — deferred to preview

#### A-m8-001

Target file: `tests/e2e/m8.a11y.spec.ts`
**GIVEN** the app at `/` after a fresh load (`localStorage` cleared) and again after a hydration cycle from a pre-seeded `dharma:v1` with one block + one brick (under `count() > 0` guard)
**WHEN** axe-core runs against the document in both states (`AxeBuilder({ page }).analyze()`)
**THEN** zero violations are reported in both states across every rule category enabled in the project's axe config (color-contrast, name-role-value, focus-visible, landmark) — M8 adds no DOM surface, so the building page's a11y posture is unchanged before and after hydration.
Proves: plan.md § Test surface preview Accessibility (axe smoke — no a11y regression; M8 is zero-UI-surface) — covers SPEC AC #14 (a11y portion of the no-regression guarantee).

### Sandbox / preview note

Per the established M4a–M4g pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `E-m8-*` and 1 `A-m8-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m4*.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md`. M8 does NOT introduce a deterministic seeding helper (out of scope per ADR-022). The 4 deferred-to-preview IDs (3 E + 1 A) are net-additive; M8 retires no E2E/a11y ID.

### Retired test IDs

**None — no existing test is retired or amended.** M8 deletes no test file and no test.

- **`U-bld-024` survives unchanged.** `U-bld-024` (`lib/dharma.test.ts:266-272`) covers the `lib/dharma.ts:dayNumber()` helper's math (`number | undefined` return, `null`/`""`/`undefined` → `undefined`, no clamp). M8 wires this **pre-existing** helper into `BuildingClient` without changing its signature or behavior — `lib/dharma.ts` is byte-identical post-M8 (plan.md § Day-number design, § Modified files `lib/dharma.ts` row, § Risks R5). Therefore `U-bld-024` is **not** retired, **not** amended, and stays green untouched. AC #13 verification lives at the wiring layer (`C-m8-007`), not by re-testing the helper.
- **`dayOfYear()` and its tests survive unchanged.** `dayOfYear()` and `lib/dayOfYear.test.ts` are explicitly **kept** (plan.md § File structure — `dayOfYear` stays with its tests; only `BuildingClient`'s import line drops `dayOfYear`, and `daysInYear` is retained).

Every existing `U-/C-/E-/A-` ID across all milestones — including `U-bld-024` — remains live and green. M8 is purely additive: 22 new `m8` IDs, zero retirements.

**Draft-only note (not a retirement):** the pre-VERIFIER draft of this entry contained `U-m8-012`/`U-m8-013`, which re-tested the `dayNumber()` helper math against a _wrong_ signature (`(programStart: string, today: string): number`, clamped `>= 1`) that contradicted the locked `U-bld-024` contract. Both were removed during VERIFIER FAIL retry 1 — they were never shipped IDs, so this is a draft correction, not a retirement of a live test. The `U-m8-` series now ends at `011`.

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                   | Test ID(s)                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| #1  | `lib/persist.ts` exports `loadState`/`saveState`/`PersistedState`/storage-key `"dharma:v1"`          | `U-m8-001`                                                                                             |
| #2  | `saveState` writes `dharma:v1` in the ADR-044 shape `{ schemaVersion:1, programStart, blocks, ... }` | `U-m8-002`, `U-m8-003`                                                                                 |
| #3  | `loadState` parses & returns persisted state; no-key → empty default, `programStart` = today         | `U-m8-002`, `U-m8-004`, `U-m8-011`                                                                     |
| #4  | SSR + first client paint = empty default; no hydration-mismatch warning                              | `C-m8-002`, `C-m8-003`, `E-m8-001`                                                                     |
| #5  | After mount, app rehydrates from `dharma:v1`; persisted blocks/categories/loose bricks render        | `C-m8-003`, `C-m8-004`                                                                                 |
| #6  | Every mutating action leaves `dharma:v1` updated to post-dispatch state                              | `C-m8-005`, `E-m8-002`                                                                                 |
| #7  | After reload the exact pre-reload `AppState` is restored (every `done` value exact)                  | `U-m8-002`, `C-m8-004`, `C-m8-006`, `E-m8-002`                                                         |
| #8  | Malformed JSON → empty default; no exception escapes                                                 | `U-m8-005`, `E-m8-003`                                                                                 |
| #9  | Unknown/future `schemaVersion` → empty default; no exception escapes                                 | `U-m8-006`, `U-m8-009`                                                                                 |
| #10 | Partial persisted object → missing collections filled with `[]`                                      | `U-m8-007`                                                                                             |
| #11 | `localStorage` getItem/setItem throwing → default returned / error swallowed; no crash               | `U-m8-008`, `E-m8-003`                                                                                 |
| #12 | First run stamps `programStart` = today; subsequent loads preserve it unchanged                      | `U-m8-004`, `U-m8-010`                                                                                 |
| #13 | Top-bar day number computed `programStart`-relative (`programStart` = day 1), replacing `dayOfYear`  | `C-m8-007` (wiring) + `U-bld-024` (pre-existing, proves the `dayNumber()` helper math AC #13 wires to) |
| #14 | No UI/component/interaction change; every M1–M4g Vitest/component test passes unmodified             | **gate (`npm run eval`)** + anchors `C-m8-001`, `C-m8-007`, `A-m8-001`                                 |
| #15 | Quality gates: `tsc --noEmit` clean; ESLint 0 err / ≤13 warn; full Vitest green; E2E clears storage  | **gate (`npm run eval`)** + E2E `beforeEach` realizes the clear-per-case requirement (`E-m8-001..003`) |

**Gate-verified ACs:** #14 and #15 — consistent with how M4f/M4g mapped purely-structural / quality-gate ACs to `npm run eval`. All other 13 ACs map to at least one concrete test ID. AC #13's day-number-helper math is proven by the pre-existing `U-bld-024`; its M8-specific wiring is proven by `C-m8-007`. No AC is unmapped; every `m8` test ID maps back to at least one AC.

### Spec gaps surfaced for VERIFIER

**None unresolved.** All five SG-m8 gaps (SG-m8-01 save cadence, SG-m8-02 hook vs inline effect, SG-m8-03 day-number swap scope, SG-m8-04 `programStart`/`schemaVersion` placement, SG-m8-05 corrupt-key disposition) are **resolved in plan.md** and reflected in the IDs above (synchronous save → `C-m8-005`; `usePersistedState()` hook → all `C-m8-*`; AC #13 wiring-only swap → `C-m8-007`, with the pre-existing `dayNumber()` helper math already covered by `U-bld-024`; `programStart` on `AppState` / `schemaVersion` boundary-only → `U-m8-003` + `C-m8-004`; passive overwrite → `U-m8-005` + `E-m8-003`). No ADR is reversed: ADR-044 (persisted schema) and ADR-018 (transport — single `dharma:v1` key, two-pass load) are both honored. One non-blocking item for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **Two gate-verified ACs.** AC #14 (no regression) and AC #15 (quality gates) are mapped to the `npm run eval` gate rather than bespoke `it()` blocks, because M8 changes no UI surface — a "nothing changed" test would be vacuous. VERIFIER's call: confirm this is acceptable spec-coverage, consistent with the M4f (#39/#40/#41 → `gate (npm run eval)`) and M4g precedents. Runtime anchors (`C-m8-001` for the `Action`-lock, `C-m8-007` for the `<Hero>` prop-signature, `A-m8-001` for a11y) are provided so the gate is not the _only_ evidence for the schema-lock and zero-UI-delta portions. No escalation expected.

All 15 M8 ACs map to at least one test ID (bespoke `m8` ID, the pre-existing `U-bld-024`, or the `npm run eval` gate). M8 adds 22 `m8` test IDs (11 U + 7 C + 3 E + 1 A) and retires none.
