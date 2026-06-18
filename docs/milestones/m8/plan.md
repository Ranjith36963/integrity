## Milestone 8 — Persistence — Plan

### Context

Every page refresh currently wipes the user's day: `BuildingClient` holds `AppState` in a `useReducer` with an in-memory `defaultState()` initializer, so blocks, categories, loose bricks, and brick completion vanish on reload. M8 makes the day durable by serializing `AppState` to a single `localStorage` key `dharma:v1` after every mutation and rehydrating two-pass on boot. It also stamps a once-only `programStart` ISO date that retires M1's `dayOfYear()` placeholder in favor of `programStart`-relative day numbering. M8 changes **no UI surface** — the only observable effect is reload-survives-state.

### Feature grouping

This plan is **one feature group: `m8`** (one BUILDER dispatch). Test IDs in `tests.md` group under the same `m8` slug. Sub-sections below (persist module / hydration / day-number) are organizational, not separate features.

### File structure

**New files**

| Path                       | Change                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `lib/persist.ts`           | NEW. Exports `STORAGE_KEY = "dharma:v1"`, `SCHEMA_VERSION = 1`, the `PersistedState` type, `defaultPersisted()` factory, `loadState(): PersistedState`, `saveState(state: PersistedState): void`, and `migrate(raw: unknown): PersistedState                                    | null` (migrator scaffold per ADR-044). Pure module — no React. |
| `lib/usePersistedState.ts` | NEW. Exports the `usePersistedState()` hook owning the two-pass `mounted`-flag load + save-on-change effect. Resolves SG-m8-02 (hook, not inline effect). Wraps `useReducer` so `BuildingClient` stays thin and the hydration behavior is unit/component-testable in isolation. |

**Modified files**

| Path                                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `AppState` gains `programStart: string` (ISO `YYYY-MM-DD`). `Block`/`Category`/`Brick`/`Recurrence`/`Action` unions are **untouched** (schema-locked since M2 — see Data model). Add a one-line M8 history comment.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lib/data.ts`                       | `defaultState()` adds `programStart: today()` (imported from `lib/dharma`). Reducer arms unchanged — no new `Action`. Update the header comment ("M8 lands localStorage rehydration" → "M8: persistence wired").                                                                                                                                                                                                                                                                                                                                                                                                            |
| `app/(building)/BuildingClient.tsx` | Replace the bare `useReducer(reducer, undefined, …)` lazy initializer with `usePersistedState()` (which internally calls `useReducer` + owns hydration + save effect). Replace `dayNumberValue = dayOfYear(new Date())` / `totalDays = daysInYear(new Date())` (lines 110-113) with `programStart`-relative computation (see Day-number design). Drop the now-unused `dayOfYear`/`daysInYear` import.                                                                                                                                                                                                                       |
| `components/Hero.tsx`               | **No prop signature change.** `dayNumber?: number` + `totalDays: number` stay; M8 only changes the _values_ passed in. Confirmed: `Hero` renders `Building {dayNumber} of {totalDays}` and is the live `dayOfYear()` consumer.                                                                                                                                                                                                                                                                                                                                                                                              |
| `lib/dayOfYear.ts`                  | **Kept, untouched.** `daysInYear()` is still used for `totalDays` (the program runs one calendar year). `dayOfYear()` itself is no longer called by `BuildingClient` after M8 but stays for its existing unit tests (`lib/dayOfYear.test.ts`) — deleting it is out of scope (a dead-export sweep belongs to a future M4g-style pass, not M8).                                                                                                                                                                                                                                                                               |
| `lib/dharma.ts`                     | **No code change — listed because M8 re-activates one of its existing exports.** `dayNumber(programStart: string \| null \| undefined, todayIso: string): number \| undefined` already exists (`lib/dharma.ts:159-168`) and is already covered green by `U-bld-024` (`lib/dharma.test.ts:266-272`). M8 does **not** add, edit, or re-sign this helper — AC #13 is a pure **wiring** task in `BuildingClient` (call the existing `dayNumber`, drop `dayOfYear`). `dharma.ts` itself is byte-identical post-M8. Listed here only so the BUILDER knows the helper it must wire to is pre-existing and must not be re-authored. |

### Data model

**`PersistedState` (the on-disk JSON shape, ADR-044 — defined in `lib/persist.ts`):**

```ts
export type PersistedState = {
  schemaVersion: 1; // migration anchor
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

**Post-M8 in-memory `AppState` (`lib/types.ts`):**

```ts
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  programStart: string; // NEW in M8 — ISO YYYY-MM-DD
};
```

**SG-m8-04 resolution — placement.** `programStart` **joins the in-memory `AppState`**; `schemaVersion` is a **persist-boundary-only wrapper key** (added by `saveState`, stripped by `loadState`, never present on `AppState`).

- Rationale: the running app needs `programStart` for the day number (the Hero re-reads it every render), so it belongs in runtime state. `schemaVersion` is pure storage metadata with no runtime consumer — leaking it into `AppState` would invite a dead field that every reducer arm must spread. Keep the storage concern at the boundary.
- Mapping is mechanical: `saveState(s: AppState)` writes `{ schemaVersion: 1, programStart: s.programStart, blocks, categories, looseBricks }`; `loadState()` returns a `PersistedState`, and `usePersistedState` projects it to `AppState` by dropping `schemaVersion`.

**Schema lock honored.** `Block`, `Category`, `Brick`, `Recurrence`, `Action` are byte-identical to M4f. The lock permits `AppState` to gain `programStart` (`AppState` is not itself a locked object schema — only the nested `Block`/`Category` shapes are, per the M2 lock; M3 already grew `AppState` with `looseBricks`, M4f shrank it by removing `runningTimerBrickId` — both precedent for additive `AppState` evolution). VERIFIER: this is an additive `AppState` field, not a `Block`/`Category` schema edit.

**Persistence requirement:** `localStorage` only (ADR-018 transport retained; no IndexedDB, no cookies, no server).

### `lib/persist.ts` API

```ts
export const STORAGE_KEY = "dharma:v1";
export const SCHEMA_VERSION = 1 as const;
export type PersistedState = {
  schemaVersion: 1;
  programStart: string;
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

- **`defaultPersisted(): PersistedState`** — returns `{ schemaVersion: 1, programStart: today(), blocks: [], categories: [], looseBricks: [] }`. `today()` from `lib/dharma` (the DST-safe local-date helper already used project-wide). This is the empty-state default for first run and every failure path. _Note:_ `programStart` is read from the system clock at call time — `loadState` calls `defaultPersisted()` only on the no-key / corrupt / unknown-version paths, so a fresh stamp is correct there (AC #3, #12).
- **`saveState(state: PersistedState): void`** — `JSON.stringify` the state, `localStorage.setItem(STORAGE_KEY, json)`. Entire body wrapped in `try/catch`; on throw (quota exceeded, storage disabled) the catch is empty — error is swallowed, no rethrow (AC #11, SG-m8-05). Synchronous, no debounce (SG-m8-01).
- **`loadState(): PersistedState`** — read `localStorage.getItem(STORAGE_KEY)` inside `try/catch`:
  - `getItem` throws (storage unavailable) → return `defaultPersisted()` (AC #11).
  - value is `null` (no key, first run) → return `defaultPersisted()` (AC #3, #12).
  - value present → `JSON.parse` inside the same `try`; parse throws (malformed) → return `defaultPersisted()` (AC #8, SG-m8-05 — passive: do **not** `removeItem`; the next `saveState` overwrites).
  - parsed object → pass to `migrate()`; if `migrate` returns `null` → return `defaultPersisted()` (AC #9, unknown version).
- **`migrate(raw: unknown): PersistedState | null`** — the migrator **scaffold** (ADR-044 — version field + scaffold, no actual v0→v1 migration since v1 has no on-disk predecessor):
  - `raw` not a non-null object → return `null`.
  - `raw.schemaVersion !== 1` → return `null` (AC #9 — unknown/future version is not guessed at). _This is the single `switch (raw.schemaVersion)` site M5 will extend to a `case 2:` + a real `migrateV1toV2`._
  - `raw.schemaVersion === 1` → coerce defensively to `PersistedState`: `blocks`, `categories`, `looseBricks` each `Array.isArray(...) ? value : []` (AC #10 — partial object fills missing collections with `[]`); `programStart` is `typeof raw.programStart === "string" ? raw.programStart : today()`. Return the coerced object. (Brick-level field validation is **out of scope** — M8 trusts well-versioned data beyond collection presence; deep validation is a future hardening pass.)

**`migrate` is the only place version logic lives** — `loadState` stays a thin transport wrapper. This keeps the M5 `schemaVersion: 2` bump a one-function change.

### Hydration design (SG-m8-02 — `usePersistedState()` hook)

`lib/usePersistedState.ts` exports `usePersistedState(): [AppState, Dispatch<Action>]`. It is the single hydration owner; `BuildingClient` calls it exactly where it currently calls `useReducer`.

**Two-pass `mounted`-flag pattern (the M1 auto-scroll / M3 `<HeroRing>` precedent):**

1. `useReducer(reducer, undefined, () => projectToAppState(defaultPersisted()))` — the lazy initializer is the **empty default**. SSR and the client's first paint both render this → server HTML === first client HTML → no hydration-mismatch warning (AC #4). `projectToAppState` drops `schemaVersion`.
2. `const [mounted, setMounted] = useState(false)`.
3. `useEffect(() => { dispatch(...hydrate from loadState()...); setMounted(true); }, [])` — runs **once, post-mount, client only**. Loads the persisted state and replaces the in-memory state with it (AC #5, #7).
4. `useEffect(() => { if (!mounted) return; saveState(toPersisted(state)); }, [mounted, state])` — the save effect. **The `if (!mounted) return` guard is load-bearing** (see Risks R2): it ensures `saveState` never fires on the empty-default first render and never fires before hydration completes. The first `saveState` can only happen after pass-2 hydration has run.

**How hydration replaces state without a new `Action`:** the reducer has no `HYDRATE` action and M8 adds none (no `Action` union change — schema lock). The hook performs the swap by passing a custom dispatch wrapper, OR — preferred, simplest — by `useReducer`'s state being re-seeded via a one-shot `dispatch` of the existing actions is _not_ viable. **Decision:** the hook owns a `useState<AppState>` seeded from `defaultPersisted()` projection, and a `dispatch` that on every call computes `reducer(currentState, action)` AND `setState`; the post-mount hydration effect calls `setState(loadedAppState)` directly. This keeps `reducer` (pure, `lib/data.ts`) untouched and adds zero `Action` variants. The hook's returned tuple is `[state, dispatch]` — `BuildingClient`'s call sites (`dispatch({ type: "ADD_BLOCK", ... })` etc.) are **byte-identical**, so no `BuildingClient` handler changes beyond the one-line `useReducer` → `usePersistedState` swap.

**Save-on-every-dispatch (SG-m8-01):** wired via the `[mounted, state]`-deps effect in step 4 — every reducer-produced new `state` reference triggers exactly one synchronous `saveState`. Covers all five mutating actions (`ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE` — AC #6) with no per-handler wiring. Identity short-circuits in the reducer (e.g. `SET_UNITS_DONE` no-op) return the same `state` reference → the effect does not re-run → no redundant write (a free optimization, not a requirement).

### Day-number design (SG-m8-03 — AC #13 is a WIRING task, not a helper-authoring task)

**Grep finding:** `app/(building)/BuildingClient.tsx:112` actively computes `dayNumberValue = dayOfYear(new Date())` and line 113 `totalDays = daysInYear(new Date())`; both feed `<Hero dayNumber={dayNumberValue} totalDays={totalDays}>` (lines 271-276), and `components/Hero.tsx:33-34` renders `Building {dayNumber} of {totalDays}`. A live consumer exists → **AC #13 stands in full**; M8 swaps it.

**The `dayNumber()` helper already exists — M8 wires it, does not author it.** `lib/dharma.ts:159-168` already exports:

```ts
export function dayNumber(
  programStart: string | null | undefined,
  todayIso: string,
): number | undefined; // 1-based; programStart = day 1; null/""/undefined → undefined; no clamp
```

It is already proven green by the existing test **`U-bld-024`** (`lib/dharma.test.ts:266-272`): `dayNumber("2026-04-01","2026-04-29") === 29`, `dayNumber("2026-04-29","2026-04-29") === 1`, and `null`/`""`/`undefined` start → `undefined`. This is the **locked contract** for the helper. M8 does **not** change it: same `number | undefined` return, same null-passthrough, **no clamp**. `lib/dharma.ts` is byte-identical post-M8 and `U-bld-024` stays green, untouched (see § Test surface preview and `tests.md` § Retired test IDs).

**Why no clamp.** An earlier draft of this plan specified a _new_ helper with signature `(programStart: string, today: string): number` clamped `>= 1`. That contradicted the locked `U-bld-024` contract and is **withdrawn**. The clamp defended against a `programStart` strictly in the future — but that state cannot occur: SPEC § AC #12 guarantees `programStart` is stamped to _today_ on first run and only ever preserved verbatim thereafter, so as real time advances `programStart` is always `≤` today. Defending a negative day number means defending an impossible state — dropped per "no validation for scenarios that can't happen". The existing helper's no-clamp behavior is therefore correct as-is.

**The M8 change is wiring only, entirely inside `BuildingClient`:**

- In `BuildingClient`: replace `const dayNumberValue = dayOfYear(new Date());` with `const dayNumberValue = dayNumber(state.programStart, todayIso);` (`todayIso` already in scope, line 108; `dayNumber` imported from `lib/dharma`). `state.programStart` is the persisted value post-hydration, the freshly-stamped today on first run.
- `dayNumber` returns `number | undefined`. `<Hero>`'s prop is already `dayNumber?: number` and `Hero` already keys its render on `dayNumber !== undefined`, so an `undefined` (only reachable if `state.programStart` were ever empty — it never is, `defaultState()` stamps it) is handled gracefully with no change. In practice `state.programStart` is always a non-empty ISO string post-hydration, so `dayNumberValue` is always a concrete `number ≥ 1`.
- `totalDays` keeps `daysInYear(new Date())` — the program is a one-year arc; "Building N of 365|366" semantics are unchanged. `daysInYear` import stays; only `dayOfYear` import is dropped.
- **`lib/dharma.ts` gets no edit.** The "Modified files" table lists it only to flag that the helper the BUILDER wires to is pre-existing — see that table's `lib/dharma.ts` row.

### Dependencies

**None.** No new packages. `localStorage`, `JSON`, `crypto.randomUUID` (via existing `lib/uuid.ts`), and React hooks cover M8 entirely.

### Design tokens

**None.** M8 is pure persistence wiring — zero new colors, fonts, spacing, motion, or shadows. No `app/globals.css` change. AC #14 ("no UI surface, component, or interaction changes") is a hard constraint; the only visual delta is that the Hero day number now counts from `programStart` instead of Jan 1 — same component, same tokens, different integer.

### Edge cases

- **First run, no `dharma:v1`** → `loadState` returns `defaultPersisted()`; `programStart` stamped to today; `schemaVersion: 1` written on first `saveState`.
- **Malformed JSON** → `JSON.parse` throws inside `loadState`'s `try` → `defaultPersisted()` returned; no throw escapes; next `saveState` overwrites (AC #8, SG-m8-05).
- **Unknown / future `schemaVersion`** → `migrate` returns `null` → `loadState` returns `defaultPersisted()` (AC #9). Forward-incompatible data is never guessed at.
- **Partial persisted object** (missing `blocks`/`categories`/`looseBricks`) → `migrate` fills each absent collection with `[]` (AC #10).
- **`localStorage` unavailable** (Safari private mode, quota, disabled) → `getItem`/`setItem` throw → `loadState` returns default, `saveState` swallows; app runs in-memory for the session, never crashes (AC #11).
- **SSR / first paint** → server render and client first paint both = empty default (lazy initializer); persisted state arrives only in the post-mount effect → zero hydration-mismatch warning (AC #4).
- **`programStart` already set** → preserved verbatim through `migrate` (string passthrough); never re-stamped (AC #12).
- **Two tabs open** → last writer wins; no cross-tab `storage`-event sync in M8 (ADR-018).
- **`programStart` in the future** — _not a defended scenario._ SPEC § AC #12 stamps `programStart` to today on first run and only preserves it verbatim afterwards, so it is always `≤` today as real time advances. No clamp is added; the existing `dayNumber()` helper's no-clamp behavior is left untouched (see § Day-number design). A future `programStart` would require a deliberately hand-edited `dharma:v1` key — out of scope per "no validation for scenarios that can't happen".
- **Very large state** → not a concern at Phase-1 scale (one day's blocks/bricks); `setItem` quota failure is already handled by the `saveState` catch.

### Risks

- **R1 — SSR hydration mismatch (top risk).** If the persisted state were read during render (or in the lazy `useReducer` initializer), server HTML (no `localStorage`) would diverge from client HTML → React hydration-mismatch warning, violating AC #4. **Mitigation:** the `loadState()` call lives **only** inside a `useEffect` (pass two), never in render or the initializer. The lazy initializer is unconditionally `defaultPersisted()`-projected. This is the established M1/M3 `mounted`-flag pattern; the BUILDER must not "optimize" the load into render.
- **R2 — `saveState` clobbering a real persisted value before hydration.** Without the `if (!mounted) return` guard, the save effect would fire on the empty-default first render and overwrite the user's real `dharma:v1` with `[]` _before_ the pass-two hydration effect runs. **Mitigation:** the save effect's first statement is `if (!mounted) return;`; `mounted` flips to `true` only inside the hydration effect, _after_ `setState(loadedAppState)`. Ordering: pass-2 load+`setMounted(true)` strictly precedes any `saveState`. The BUILDER must keep these two effects in this order and must not merge them.
- **R3 — Accidental `Action` / schema change.** A naive "add a `HYDRATE` action" would break the M4f-locked `Action` union and force a reducer arm. **Mitigation:** the hook re-seeds state via `setState` directly (Hydration design above) — `reducer`, `Action`, `Block`, `Category` are all untouched. VERIFIER checks the schema lock holds.
- **R4 — Dropping `dayOfYear` import breaks an unseen consumer.** **Mitigation:** `dayOfYear` is removed only from `BuildingClient`'s _import line_; the function itself stays in `lib/dayOfYear.ts` with its tests. `tsc --noEmit` + full Vitest green is the binding proof (AC #15). `daysInYear` import is retained — do not drop it.
- **R5 — BUILDER re-authors the pre-existing `dayNumber()` helper or changes its contract.** AC #13 is wiring only. `lib/dharma.ts:dayNumber()` already exists with a locked `number | undefined` / no-clamp contract proven by `U-bld-024`. **Mitigation:** the "Modified files" table marks `lib/dharma.ts` as _no code change_; § Day-number design states the helper is pre-existing and byte-identical post-M8. The BUILDER must `import { dayNumber }` and call it from `BuildingClient`, never add or re-sign it. If `U-bld-024` is touched, the schema lock is broken — VERIFIER and EVALUATOR both check this.

### Test surface preview

(IDs assigned by the separate `mode: TESTS` dispatch — this is the surface sketch only.)

- **Unit (Vitest, mock `localStorage`)** — `lib/persist.ts`: `defaultPersisted` shape; `saveState` writes the ADR-044 JSON shape under `dharma:v1` (AC #2); `loadState` round-trips a valid value (AC #3 happy path) and returns default on no-key (AC #3), malformed JSON (AC #8), unknown `schemaVersion` (AC #9), partial object → `[]`-fill (AC #10), throwing `getItem`/`setItem` (AC #11); `migrate` scaffold version-gate. **No unit test for `dayNumber()` itself** — the helper is pre-existing and already covered green by `U-bld-024`; AC #13 is verified at the wiring layer (component), not by re-testing the helper math.
- **Component / integration (Vitest + Testing Library)** — `usePersistedState` / `BuildingClient`: pass-one renders empty default (AC #4); post-mount hydration renders persisted blocks/categories/loose bricks (AC #5); each mutating dispatch updates `dharma:v1` (AC #6); `mounted`-guard prevents empty-default clobber (R2); `BuildingClient` wires the existing `dayNumber(state.programStart, todayIso)` (not `dayOfYear`) into `<Hero>` so the day number is `programStart`-relative post-hydration (AC #13); the M1–M4g suite passes unmodified (AC #14).
- **E2E (Playwright, deferred-to-preview, `localStorage` cleared per case — ADR-018)** — first-run-empty; mutate-then-reload-persists, including brick `done` values (AC #7); corrupt-key-recovers without crash (AC #8/#11).
- **Accessibility (axe)** — no new surface; an axe pass on the unchanged building page confirms no regression (AC #14). Likely a single smoke assertion; TESTS dispatch decides.

### Out of scope

- A backend, cloud sync, or multi-device merge / conflict resolution (Phase 2+). M8 is last-writer-wins within one browser.
- The `deletions` map — M5 (Edit Mode + delete) adds it via a `schemaVersion: 2` bump + a real migrator (ADR-044). Adding it now would be a speculative empty field.
- Cross-tab `storage`-event synchronization.
- Debounced / batched / flush-on-unload writes — synchronous save per dispatch (SG-m8-01); revisit only if M7 profiling shows jank.
- IndexedDB or any store other than `localStorage`.
- A settings screen to export / clear / reset data (M6+).
- Recurrence resolution against past dates (M9).
- Deleting the now-unused `dayOfYear()` export — a dead-export sweep is a separate pass; `dayOfYear` stays with its tests.
- Deep per-brick field validation of persisted data — `migrate` validates collection presence only.
- A new ADR — ADR-044 (M8 schema) + ADR-018 (transport) govern; M8 introduces no new decision surface.

### ADR needed

None. ADR-044 (Accepted 2026-05-15) defines the persisted schema; ADR-018 (Accepted 2026-04-29) supplies the retained transport (single `dharma:v1` key, two-pass load, `lib/persist.ts`). All five SG-m8 gaps are resolved within this plan (SG-m8-01: synchronous save per dispatch; SG-m8-02: `usePersistedState()` hook; SG-m8-03: AC #13 full swap in scope; SG-m8-04: `programStart` on `AppState`, `schemaVersion` boundary-only; SG-m8-05: passive overwrite-on-next-save). No decision exceeds those ADRs.
