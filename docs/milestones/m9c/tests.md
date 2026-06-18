## Milestone 9c — Month view (Kingdom) + view switcher — Tests

This entry covers M9c — the first **visible** Milestone 9 chunk: the Kingdom month grid, the Day·Week·Month·Year view switcher, computed per-day scores, month navigation, and a strictly read-only past-day detail. It is derived from the `plan.md` M9c entry (`## Milestone 9c — Month view (Kingdom) + view switcher — Plan`). Feature slug: `m9c`. ID prefixes: `U-m9c-`, `C-m9c-`, `A-m9c-`, `E-m9c-`. M9c **adds a real UI surface** (four new components + a new shell), so unlike M9a/M9b it has a full four-layer test mix — unit (pure `lib/monthGrid.ts` + the `dayScore` helper), component (`AppShell`, `ViewSwitcher`, `MonthView`, `DayCell`, `PastDayDetail`), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9c has a **large genuine unit surface** (`lib/monthGrid.ts` is pure date math; the `dayScore` helper in `lib/history.ts` is a pure `(state, isoDate)` function) and a substantial component surface (the grid, the switcher, the cell's five visual `kind`s, the read-only detail, the shell's single-`usePersistedState` lift). Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) precedent:

- **AC #15 (no regression to M1–M9b; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Month / day-cell-scores / open-past-day)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by `C-m9c-013` (the `BuildingClient` prop-refactor leaves the Building view byte-equivalent in behavior) plus the migration discipline in § Retired / amended test IDs below; the three named E2E scenarios are authored as real `test()` blocks (`E-m9c-001..003`).

All other 14 ACs map to at least one concrete bespoke `m9c` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9c-005` (UTC-drift) is the load-bearing date-math guard** — it computes `monthGridCells` for a month whose 1st falls on a known weekday and asserts the leading-blank count and every `date` cell's `iso` string **exactly**, then re-runs the same assertion under a faked negative-UTC-offset environment (`process.env.TZ = "America/Los_Angeles"` via `vi.stubEnv` / a fixture clock) — a mutant that parses with `new Date(isoString)` (UTC midnight) drifts a day and fails. The plan's § Date math forbids `new Date(isoString)`; this test enforces it.
- **`U-m9c-008` (`dayScore` no-data sentinel) asserts strict `=== null`**, not falsy — a mutant returning `0` or `undefined` for a no-data date fails, because the cell-classification depends on telling `null` apart from a real `0`.
- **`U-m9c-009` (`dayScore` precedence) asserts `history` wins over `currentDate`** when (the should-not-occur case) a date is in both — a mutant that checks `currentDate` first fails.
- **`U-m9c-010` (`dayScore` purity) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts `dayScore` neither throws nor reads a clock — called twice with the same args it returns deep-equal results; a mutant that mutates `state` or reads `Date.now()` fails.
- **`C-m9c-014` (the read-only guarantee) is a real absence assertion, not a comment** — it renders `<PastDayDetail>` over a fixture `ArchivedDay` that has bricks in mixed `done` states and asserts via `queryBy*` that **no** mutation affordance exists: no checkbox/toggle (`queryByRole("checkbox")` → `null`), no stepper (`queryByRole("spinbutton")` → `null`), no add-brick / add-block control (`queryByRole("button", { name: /add|new brick|new block|\+/i })` → `null` for every match except the lone `Close`), no `BrickChip` interactive element. The only interactive element returned by `getAllByRole("button")` is `Close`.
- **`C-m9c-006` (DayCell missed vs future distinctness, AC #7) asserts a structural difference**, not a class-name guess — a `missed` cell carries a visible `var(--card-edge)` border and no score numeral; a `future`/`pre-start` cell is borderless and faint. The test asserts the `missed` cell exposes a card-bordered element while the `future` cell does not, and that `missed` has no numeral text node — a mutant rendering both identically fails.
- **`C-m9c-007` (DayCell tappability is structural) asserts `future`/`pre-start`/`missed`/`blank` cells are NOT `<button>`s** (`queryByRole("button")` within the cell → `null`) — AC #13's "tapping a future / pre-start date does nothing" is proven by the absence of an interactive role, not by a guarded no-op handler that a mutant could un-guard.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9c-001..012` | 12     |
| Component (Vitest + Testing Library)  | `C-m9c-001..016` | 16     |
| Accessibility (axe via Playwright)    | `A-m9c-001..004` | 4      |
| E2E (Playwright, deferred-to-preview) | `E-m9c-001..003` | 3      |
| **Total**                             |                  | **35** |

ID series start values were supplied by the orchestrator: `U-m9c-001`, `C-m9c-001`, `A-m9c-001`, `E-m9c-001`.

**Fixture dates (ISO, weekdays verified against the proleptic Gregorian calendar):**
`2026-05-01` Fri · `2026-05-17` Sun · `2026-05-18` Mon (**today**, per `currentDate`) · `2026-05-19` Tue · `2026-05-31` Sun · `2026-04-29` Wed · `2026-04-01` Wed · `2026-02-01` Sun · `2026-02-28` Sat (Feb 2026 has 28 days — not a leap year) · `2024-02-29` Thu (leap-year check) · `2026-12-01` Tue · `2026-12-31` Thu · `2027-01-01` Fri.
Standing fixture `state` unless a test overrides it: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` = `{ "2026-05-17": <ArchivedDay scoring 100>, "2026-05-15": <ArchivedDay scoring 0>, "2026-05-16": <ArchivedDay scoring 60> }`, the live in-progress day (`blocks`/`categories`/`looseBricks`) scoring `dayPct === 40`. May 2026: the 1st is a Friday → 5 leading blank cells (Sun..Thu), 31 days, 1 trailing blank → 37 cells = 5 rows of 7 (Sun-row…), wait — 5 + 31 = 36, padded to 42 = **6 rows** (35 < 36 ≤ 42). Tests that assert the May-2026 cell count use **42** (6 rows); a 5-row month is exercised separately by `U-m9c-004` (Feb 2026: 1st is Sun → 0 leading blanks, 28 days = 28 cells = exactly 4 rows).

### Unit (Vitest)

`U-m9c-001..006` exercise the pure `lib/monthGrid.ts` (no clock, no `localStorage` — called with literal `(year, month)` args). `U-m9c-007..012` exercise the `dayScore` helper added to `lib/history.ts` (pure `(state, isoDate)` — no clock, no `localStorage`, driven directly).

#### U-m9c-001 — success

Target file: `lib/monthGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `monthGridCells`, `addMonth`, `subMonth` exported from `lib/monthGrid.ts`, and the `GridCell` type
**WHEN** the module's exports are inspected
**THEN** `monthGridCells`, `addMonth`, `subMonth` are all `typeof === "function"`; `monthGridCells(2026, 4)` (May 2026, `month` 0-indexed) returns an array whose every element is either `{ kind: "blank" }` or `{ kind: "date"; iso: string; dayOfMonth: number }` (the `GridCell` union); the returned array `.length` is a multiple of `7`.
Proves: plan.md § Data model (`GridCell` union; `monthGridCells` signature) + § File structure (`lib/monthGrid.ts` module surface) — covers SPEC AC #1.
Tag: success.

#### U-m9c-002 — success

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called as `monthGridCells(2026, 4)` (May 2026 — the 1st is Friday, weekday index `5` under `0=Sun…6=Sat`)
**THEN** the first **5** elements are `{ kind: "blank" }` (leading blanks aligning the 1st to its Friday column); element index `5` is `{ kind: "date", iso: "2026-05-01", dayOfMonth: 1 }`; element index `35` is `{ kind: "date", iso: "2026-05-31", dayOfMonth: 31 }`; the **last 6** elements (index `36..41`) are `{ kind: "blank" }` (trailing pad); the array length is exactly `42` (6 rows × 7).
**AND** every `date` cell's `iso` is a zero-padded `YYYY-MM-DD` string (`"2026-05-09"`, not `"2026-05-9"`) and `dayOfMonth` matches the trailing day number.
Proves: plan.md § Data model (`monthGridCells` — leading blanks = weekday of the 1st; one `date` per day; trailing pad to a multiple of 7; zero-padded `iso`) + § Date math — covers SPEC AC #1.
Tag: success.

#### U-m9c-003 — success / edge

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called for a month whose 1st is a Sunday — `monthGridCells(2026, 1)` (February 2026 — the 1st is Sunday, weekday index `0`)
**THEN** there are **zero** leading blank cells (index `0` is already `{ kind: "date", iso: "2026-02-01", dayOfMonth: 1 }`); the last `date` cell is `{ kind: "date", iso: "2026-02-28", dayOfMonth: 28 }` (Feb 2026 has 28 days — 2026 is not a leap year); the array length is exactly `28` (4 rows × 7, no trailing blank needed).
**AND** for the leap year — `monthGridCells(2024, 1)` (February 2024) — the grid includes a `date` cell `{ iso: "2024-02-29", dayOfMonth: 29 }` (29 days), proving `daysInMonth` uses the `new Date(year, month+1, 0).getDate()` idiom and is leap-safe.
Proves: plan.md § Date math (days-in-month idiom, leap-safe; weekday-0 → zero leading blanks; exact-row month) + § Edge cases — covers SPEC AC #1.
Tag: edge.

#### U-m9c-004 — success / edge

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `addMonth` and `subMonth` from `lib/monthGrid.ts`, operating on `{ year: number; month: number }` (month `0–11`)
**WHEN** called within a year and across both year boundaries
**THEN** `addMonth({ year: 2026, month: 4 })` deep-equals `{ year: 2026, month: 5 }` (May→Jun); `subMonth({ year: 2026, month: 4 })` deep-equals `{ year: 2026, month: 3 }` (May→Apr).
**AND** `addMonth({ year: 2026, month: 11 })` deep-equals `{ year: 2027, month: 0 }` (December→January advances the year); `subMonth({ year: 2027, month: 0 })` deep-equals `{ year: 2026, month: 11 }` (January→December decrements the year).
**AND** `addMonth` / `subMonth` are pure — they return a **new** object, do not mutate the input, and construct no `Date` (pure integer arithmetic — calling twice with the same input yields deep-equal results).
Proves: plan.md § Date math (`addMonth`/`subMonth` integer arithmetic; Dec→Jan / Jan→Dec year-boundary correctness; pure, no `Date`) — covers SPEC AC #11.
Tag: edge.

#### U-m9c-005 — edge (UTC-drift-free, mutation-resistant)

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** `monthGridCells(2026, 4)` (May 2026) is computed in **both** environments
**THEN** in **both** the leading-blank count is exactly `5`, index `5` is `{ kind: "date", iso: "2026-05-01", dayOfMonth: 1 }`, index `35` is `{ iso: "2026-05-31", dayOfMonth: 31 }`, and the full array is byte-identical between the two runs — no cell's `iso` string drifts by a day.
**AND** the `iso` strings are assembled by string formatting (`` `${y}-${pad(m+1)}-${pad(d)}` ``), and the weekday/days-in-month computations use the multi-arg local-time `Date` constructor (`new Date(year, month, 1)` / `new Date(year, month+1, 0)`) — there is no `new Date("2026-05-01")`-style string-parse anywhere in `lib/monthGrid.ts` (a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality).
Proves: plan.md § Date math (no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson SG-m9a-02) — covers SPEC AC #1, AC #11.
Tag: edge.

#### U-m9c-006 — success

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called for the December→January boundary months — `monthGridCells(2026, 11)` (December 2026, the 1st is Tuesday) and `monthGridCells(2027, 0)` (January 2027, the 1st is Friday)
**THEN** `monthGridCells(2026, 11)` has a `date` cell `{ iso: "2026-12-01", dayOfMonth: 1 }` at index `2` (2 leading blanks for Sun+Mon) and `{ iso: "2026-12-31", dayOfMonth: 31 }`; `monthGridCells(2027, 0)` has `{ iso: "2027-01-01", dayOfMonth: 1 }` at index `5` (5 leading blanks) — confirming the grid for adjacent-across-the-year months is internally consistent and `iso` years are correct on both sides of the boundary.
Proves: plan.md § Date math (year-boundary grid correctness — the data side of AC #11's nav) — covers SPEC AC #11.
Tag: success.

#### U-m9c-007 — success

Target file: `lib/history.test.ts` (EXISTS — `dayScore` cases appended; no `m9b` ID touched)
Layer: Unit
**GIVEN** `dayScore` and the `NO_DATA` sentinel exported from `lib/history.ts`, and the standing fixture `state` whose `history["2026-05-17"]` is an `ArchivedDay` constructed to score `dayPct === 100` (one block, all bricks done)
**WHEN** `dayScore(state, "2026-05-17")` is called
**THEN** it returns the **number** `100` — the archived branch: `"2026-05-17"` is a key of `state.history`, so `dayScore` computes `dayPct` over that `ArchivedDay` (passing a structurally-complete `AppState`-shaped object built from it, per the plan baseline — no cast); the return is a `number` in `[0,100]`, not `null`.
**AND** `dayScore(state, "2026-05-16")` returns `60` and `dayScore(state, "2026-05-15")` returns `0` — every archived `history` entry resolves to its own `dayPct`.
Proves: plan.md § Data model — `dayScore` archived-day branch (`isoDate in history` → `dayPct` over the `ArchivedDay`) — covers SPEC AC #4, AC #5.
Tag: success.

#### U-m9c-008 — success / edge (mutation-resistant sentinel)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` and `NO_DATA` from `lib/history.ts`, the standing fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` keyed on the 15th/16th/17th)
**WHEN** `dayScore` is called for ISO dates with **neither** a `history` entry **nor** equality to `currentDate` — a future date `"2026-05-25"`, a pre-`programStart` date `"2026-04-10"`, and a past in-range date the user never opened `"2026-05-13"`
**THEN** each call returns **exactly `null`** (`expect(dayScore(state, iso)).toBe(null)` — strict `=== null`, NOT merely falsy); `NO_DATA` is exported and `NO_DATA === null`; the return for these three dates is identical (`dayScore` itself does not distinguish future / pre-start / missed — it is a pure history lookup, and the classification is `MonthView`'s job, per `C-m9c-004`).
**AND** `dayScore` returns `null` on an **empty** `history` (`state.history === {}`) for any non-`currentDate` date — no crash on a first-run empty map (a plain `in` check).
Proves: plan.md § Data model — `dayScore` no-data branch (`NO_DATA = null` sentinel; future/pre-start/missed all → `null`; empty-`history` safe) + § Edge cases (first-ever run) — covers SPEC AC #4, AC #8.
Tag: edge.

#### U-m9c-009 — success / edge (precedence)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and the standing fixture `state` whose live in-progress day scores `dayPct === 40` and whose `currentDate === "2026-05-18"`
**WHEN** `dayScore(state, "2026-05-18")` is called (the date equals `currentDate`, and `"2026-05-18"` is **not** a `history` key)
**THEN** it returns the **number** `40` — the `currentDate` branch: `dayPct(state)` computed directly over the live `AppState`.
**AND** for the should-not-occur case where a date is **both** a `history` key and `=== currentDate` (a fixture with `currentDate: "2026-05-17"` and `history["2026-05-17"]` present, the archived snapshot scoring `100`, the live day scoring `40`), `dayScore(state, "2026-05-17")` returns **`100`** — `history` is checked **first**; the archived snapshot wins (deterministic precedence per the plan).
Proves: plan.md § Data model — `dayScore` `currentDate` branch + documented `history`-before-`currentDate` precedence — covers SPEC AC #4, AC #6.
Tag: edge.

#### U-m9c-010 — edge (purity, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay` in it, `state.blocks`, `state.categories`, `state.looseBricks` (and a representative nested block) — passed to `dayScore`
**WHEN** `dayScore(frozenState, "2026-05-17")` and `dayScore(frozenState, "2026-05-18")` are called
**THEN** neither call throws (`expect(() => dayScore(frozenState, iso)).not.toThrow()`) — `dayScore` writes into neither `state` nor any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** `dayScore` reads **no clock** and **no `localStorage`**: called twice with the same `(state, isoDate)` args it returns deep-equal (here `===`-equal) results, and its verdict is a pure function of its two arguments — never of `Date.now()` (the only clock read in M9c lives in `MonthView`'s classification, see `C-m9c-004`).
Proves: plan.md § Data model — `dayScore` purity ("reads no clock and no `localStorage`; pure function of `(state, isoDate)`") + § Decisions to honor (ADR-045 — `history` consumed read-only) — covers SPEC AC #4.
Tag: edge.

#### U-m9c-011 — edge (0-score vs missed)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and a fixture `state` whose `history["2026-05-15"]` is an `ArchivedDay` with bricks present but **none** done (so `dayPct` over it is `0`), and which has **no** entry for `"2026-05-14"` (a past in-range date never opened)
**WHEN** `dayScore(state, "2026-05-15")` and `dayScore(state, "2026-05-14")` are called
**THEN** `dayScore(state, "2026-05-15")` returns the **number `0`** (`expect(...).toBe(0)` — a real archived score, an `ArchivedDay` that scored zero); `dayScore(state, "2026-05-14")` returns **`null`** (`NO_DATA` — no entry). The two are distinguishable: `0` (tried, scored nothing) is a `number`, `null` (never opened) is the sentinel — `MonthView` uses this to render a `scored` cell with numeral "0" vs a `missed` cell with no numeral.
Proves: plan.md § Data model — `dayScore` ("a `0`-score day returns the number `0`, never the sentinel") + § Edge cases (`ArchivedDay` score 0 vs missed day) — covers SPEC AC #4, AC #7.
Tag: edge.

#### U-m9c-012 — edge (ArchivedDay → dayPct field contract)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and an `ArchivedDay` fixture in `history` that carries `blocks` and `looseBricks` that drive a known `dayPct`, plus a `categories` array deliberately set to a value that `dayPct` does **not** read
**WHEN** `dayScore(state, <that archived date>)` is called
**THEN** the returned score depends **only** on the `ArchivedDay`'s `blocks` and `looseBricks` (matching `dayPct`'s documented field-read contract — `dayPct` at `lib/dharma.ts:49` reads only `state.blocks` and `state.looseBricks`); changing the `ArchivedDay`'s `categories` does not change the result; the score is a `number` in `[0,100]` and equals `dayPct` computed independently over the same collections.
Proves: plan.md § Data model — `dayScore` archived branch ("`dayPct` reads only `blocks`/`looseBricks`; build a complete `AppState`-shaped object — zero cast") + § Open questions for VERIFIER item (b) — covers SPEC AC #4, AC #5.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9c-001..002` cover `AppShell`; `C-m9c-003..007` cover `DayCell`; `C-m9c-008..011` cover `MonthView`; `C-m9c-012` covers `ViewSwitcher`; `C-m9c-013` covers the `BuildingClient` prop-refactor regression; `C-m9c-014..016` cover `PastDayDetail` and the day-open interaction. All render with React Testing Library; where a clock read matters (`MonthView` classification) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `AppShell` (which calls `usePersistedState`).

#### C-m9c-001 — success (AppShell — single usePersistedState + Day↔Month share one AppState)

Target file: `app/(building)/AppShell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` (`currentDate: "2026-05-18"`, one in-progress block, a non-empty `history`), `vi.setSystemTime` → `"2026-05-18"`, and `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush (`act`), the `ViewSwitcher` `Month` segment is clicked, then the `Day` segment is clicked
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across both view switches (the hook / its `loadState` spy shows a single hydration pass — not one per view); switching Day→Month→Day does not re-hydrate, does not re-run rollover, and does not mount a second `usePersistedState`.
**AND** the `MonthView` rendered in Month view and the `BuildingClient` rendered in Day view read the **same** `AppState` object — a change visible in one (the live in-progress day's score) is the same `state` the other sees (asserted by both views reflecting the identical `currentDate` / in-progress `blocks`).
Proves: plan.md § View hosting (SG-m9c-01 — `AppShell` calls `usePersistedState()` exactly once; Day and Month are two renders of one `AppState`) + § Components `<AppShell>` — covers SPEC AC #9, AC #10.
Tag: success.

#### C-m9c-002 — success (AppShell — view state, default Day, not persisted)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered fresh (mocked empty `localStorage`, `vi.setSystemTime` → `"2026-05-18"`)
**WHEN** the shell mounts, then the `Month` segment is selected, then the component tree is unmounted and remounted (simulating a refresh)
**THEN** on first mount the **Day** view is shown (`BuildingClient`'s Building chrome is in the DOM; the Kingdom grid is not) — `view` defaults to `"day"`; after selecting `Month` the Kingdom grid (`role="grid"`) is shown and the Building view is not; after the remount the view is **Day again** (the `view` state is session-only React state, not persisted — refresh returns to Day, the app's home).
**AND** `localStorage["dharma:v1"]`, if written, contains **no** `view` field — M9c persists nothing new (schema stays `v2`).
Proves: plan.md § View hosting (`view` is `useState<"day"|"month">("day")`, session-only, not persisted; refresh → Day) + § Out of scope (persisting the selected `view`) — covers SPEC AC #10.
Tag: success.

#### C-m9c-003 — success (DayCell — scored cell renders date + heat fill + numeral)

Target file: `components/DayCell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<DayCell kind="scored" date="2026-05-16" dayOfMonth={16} score={60} isToday={false} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the cell displays the date number `16`; it renders a numeric score `60` (the `Math.round(score)` corner numeral); its background carries the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (asserted via inline style / a `data-score`-derived style hook); the cell is a `<button>` (tappable) carrying an `aria-label` of the form `"…, May 16, 2026, score 60 percent"`.
**AND** clicking it calls `onOpen` exactly once.
Proves: plan.md § Components `<DayCell>` (`scored` kind — date number + accent heat fill at scaled alpha + corner numeral; tappable `<button>`) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) — covers SPEC AC #3, AC #5.
Tag: success.

#### C-m9c-004 — success (DayCell — today marker)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** `<DayCell kind="scored" date="2026-05-18" dayOfMonth={18} score={40} isToday={true} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the cell displays date number `18` and numeral `40` (the live in-progress day's `dayPct`), and additionally carries the today marker — a 2px `var(--accent)` ring (`outline` / `box-shadow`, asserted via inline style or a `data-today` attribute) — so today is unmistakable regardless of its score; the `aria-label` identifies it as today (e.g. contains `"today"` or the full dated label is present and the ring is the only visual delta).
**AND** the same cell rendered with `isToday={false}` has **no** ring — the ring is conditional on `isToday`, proving the marker is not always-on.
Proves: plan.md § Components `<DayCell>` (today — `scored` cell + 2px `--accent` ring) + § Design tokens (`scored`/`today` cell ring) — covers SPEC AC #6.
Tag: success.

#### C-m9c-005 — edge (DayCell — score-0 scored cell vs missed cell)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** two renders — `<DayCell kind="scored" date="2026-05-15" dayOfMonth={15} score={0} onOpen={vi.fn()} />` and `<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />`
**WHEN** both are rendered
**THEN** the `scored` score-`0` cell shows the date number `15`, a minimum-alpha (`0.12`) `var(--accent)` heat fill, **and** the numeral `"0"`; it is a `<button>` (tappable — an archived day has a detail to show).
**AND** the `missed` cell shows the date number `14` in `var(--ink-dim)`, a flat `var(--card)` background with a 1px `var(--card-edge)` border, and **no** heat fill and **no** numeral; it is **not** a `<button>` (`queryByRole("button")` within the cell → `null`).
**AND** the two are visually distinct — the score-`0` `scored` cell has a numeral and an accent fill; the `missed` cell has neither — resolving the spec's "tried, scored 0" vs "not opened" edge case.
Proves: plan.md § Components `<DayCell>` `kind` table (`scored` score-0 → 0.12 fill + numeral "0"; `missed` → card chip, no fill, no numeral) + § Edge cases (`ArchivedDay` score 0 vs missed day) — covers SPEC AC #7.
Tag: edge.

#### C-m9c-006 — edge (DayCell — missed visually distinct from future/pre-start, mutation-resistant)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** three renders — `<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />`, `<DayCell kind="future" date="2026-05-25" dayOfMonth={25} />`, `<DayCell kind="pre-start" date="2026-04-10" dayOfMonth={10} />`
**WHEN** all three are rendered
**THEN** the `missed` cell carries a **visible bordered chip** — a `var(--card)` background with a 1px `var(--card-edge)` border (asserted via inline style / computed style / a `data-kind="missed"` hook that maps to the bordered treatment).
**AND** the `future` cell and the `pre-start` cell are **borderless and transparent** — date number `var(--ink-dim)` at low opacity, no background fill, no border; `future` and `pre-start` render identically to each other.
**AND** the `missed` treatment is structurally different from the `future`/`pre-start` treatment (a mutant rendering all three identically fails this assertion) — satisfying AC #7's "visually different from a future or pre-`programStart` blank cell".
Proves: plan.md § Components `<DayCell>` `kind` table (`missed` = bordered card chip; `future`/`pre-start` = borderless transparent; distinctness required by AC #7) + § Design tokens — covers SPEC AC #7, AC #8.
Tag: edge.

#### C-m9c-007 — edge (DayCell — inert kinds are not tappable, structural)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** `<DayCell>` rendered for each non-`scored` kind — `kind="future"`, `kind="pre-start"`, `kind="missed"`, and `kind="blank"` — each with an `onOpen` prop **not** supplied (or supplied as a spy)
**WHEN** each cell is queried and clicked
**THEN** none of the four is a `<button>` (`queryByRole("button")` within the cell → `null`); each is a plain non-interactive `<div>`, not focusable (no `tabindex` making it tabbable); clicking it triggers no `onOpen` call (if a spy was passed) and changes no state — AC #13's "tapping a future / pre-start date does nothing" is **structural** (no interactive role), not a guarded handler.
**AND** the `blank` cell renders no date number and no background and is `aria-hidden="true"`.
Proves: plan.md § Components `<DayCell>` ("non-tappable cells are plain `<div>` … not focusable — AC #13's 'tapping … does nothing' is structural") + § Edge cases (tapping a `missed`/`future`/`pre-start`/`blank` cell) — covers SPEC AC #8, AC #13.
Tag: edge.

#### C-m9c-008 — success (MonthView — grid structure + month/year label + weekday headers)

Target file: `components/MonthView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />` with `vi.setSystemTime` → `"2026-05-18"` so the displayed month initializes to May 2026
**WHEN** rendered
**THEN** a calendar grid renders as `role="grid"` containing `role="row"` rows, each row holding 7 `role="gridcell"`s (7 weekday columns); the grid has the May-2026 cell layout — 5 leading blank cells, 31 in-range `date` cells, trailing pad — `42` gridcells total, 6 rows.
**AND** a month-year label reading `"May 2026"` is present (in `var(--font-display)`); a weekday header row of seven `role="columnheader"`s reads `"Sun" … "Sat"` in the `0=Sun…6=Sat` order (matching `RecurrenceChips` `WEEKDAYS`).
**AND** each in-range `date` cell shows its date-of-month number `1..31`.
Proves: plan.md § Components `<MonthView>` (month-year label, weekday header row, 7-column `role="grid"`, `monthGridCells`-driven cells) + § Decisions to honor (ADR-019 `0=Sun…6=Sat`) — covers SPEC AC #1, AC #2, AC #3.
Tag: success.

#### C-m9c-009 — success (MonthView — per-cell classification + scores)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture `state` (`programStart: "2026-05-01"`; `history` keyed `"2026-05-15"`→score 0, `"2026-05-16"`→score 60, `"2026-05-17"`→score 100; live day `dayPct === 40`)
**WHEN** the May-2026 grid renders
**THEN** the cell for `2026-05-17` is a `scored` cell showing numeral `100`; the cell for `2026-05-16` shows `60`; the cell for `2026-05-15` is a `scored` cell showing numeral `0`; the cell for `2026-05-18` is a `scored` cell marked **today** showing the live numeral `40`.
**AND** the cell for `2026-05-13` (past, in-range `[2026-05-01, 2026-05-18)`, no `history` entry) is a `missed` cell (card chip, no numeral); the cell for `2026-05-25` (future) is a `future` cell; there is no May cell before `programStart` (May 1 = `programStart`) — `MonthView` classifies each cell via `today()` + `state.programStart` + `dayScore`.
Proves: plan.md § Components `<MonthView>` (computes each cell's classification + score, passes to `<DayCell>`) + § Edge cases table (archived / today / missed / future rows) — covers SPEC AC #3, AC #5, AC #6, AC #7, AC #8.
Tag: success.

#### C-m9c-010 — success / edge (MonthView — prev/next month nav incl. year boundary)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"` (displayed month initializes to May 2026)
**WHEN** the "Next month" control is clicked, then the "Previous month" control is clicked twice
**THEN** after the first "Next" the label reads `"June 2026"` and the grid is June's (June 1 2026 is a Monday → 1 leading blank); after two "Previous" clicks the label reads `"April 2026"` and the grid is April's — the grid and the month-year label both update on every nav.
**AND** navigating from `"December 2026"` (reachable by repeated "Next") one more month forward yields the label `"January 2027"` and the January-2027 grid — the **year advances** across the Dec→Jan boundary; navigating back from `"January 2027"` returns to `"December 2026"`.
**AND** the prev/next controls are `<button>`s with `aria-label="Previous month"` / `"Next month"`.
Proves: plan.md § Components `<MonthView>` (prev/next via `subMonth`/`addMonth`; label + grid update; year-boundary) + § Edge cases (Dec→Jan year boundary) — covers SPEC AC #11.
Tag: edge.

#### C-m9c-011 — edge (MonthView — empty-history / future month renders all-inert, no crash)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={emptyHistoryState} onOpenDay={vi.fn()} />` where `emptyHistoryState` has `history: {}`, `programStart: "2026-05-18"`, `currentDate: "2026-05-18"` (first-ever run), `vi.setSystemTime` → `"2026-05-18"`; and separately the same component navigated forward to a wholly future month (`"August 2026"`)
**WHEN** each grid renders
**THEN** on first-run May 2026: only the `2026-05-18` cell is `scored` (today, live `dayPct`); every in-month cell before the 18th is `pre-start` (before `programStart`); every cell after is `future`; the grid renders with no crash on the empty `history` map.
**AND** the navigated-to August 2026 grid renders with **every** `date` cell `future` (all > today) — the grid still draws, all cells inert, no error.
Proves: plan.md § Edge cases (first-ever run — empty `history`; a month with no history at all → grid renders, all inert) — covers SPEC AC #1, AC #8.
Tag: edge.

#### C-m9c-012 — success / edge (ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled)

Target file: `components/ViewSwitcher.test.tsx` (NEW)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />`
**WHEN** rendered and the four segments are inspected, then `Month`, then `Week`, then `Year` are clicked
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — inside a `role="tablist"` container (`aria-label="Calendar view"`); the **Day** and **Month** segments are live `role="tab"` `<button>`s; Day has `aria-selected="true"`, Month `aria-selected="false"` (the active view is indicated by `aria-selected` and the filled-`var(--accent)` style, not color alone).
**AND** clicking `Month` calls `onSelect("month")` exactly once; re-rendering with `view="month"` flips `aria-selected` to Month.
**AND** the **Week** and **Year** segments render as `<button disabled aria-disabled="true">` — clicking either fires `onSelect` **zero** times (`expect(onSelect).not.toHaveBeenCalled()` for those clicks), causes no crash, and no view change; they are out of the tab sequence (not reachable as `role="tab"` selectable, `disabled`).
Proves: plan.md § Components `<ViewSwitcher>` (4 segments, `role="tablist"`/`role="tab"`, `aria-selected` active indicator; Day/Month live `onSelect`; Week/Year `disabled`, no `onSelect`, no crash — SG-m9c-02) — covers SPEC AC #9, AC #10.
Tag: edge.

#### C-m9c-013 — success (BuildingClient prop-refactor — no Building-view regression)

Target file: `app/(building)/BuildingClient.test.tsx` (AMENDED — see § Retired / amended test IDs)
Layer: Component
**GIVEN** the refactored `<BuildingClient state={state} dispatch={dispatch} />` — `BuildingClient` no longer calls `usePersistedState()` internally; it receives `[state, dispatch]` as props (the M9c refactor) — rendered via the sanctioned test harness that supplies `state`/`dispatch` (either by wrapping in `<AppShell />`, or by a thin `usePersistedState`-providing harness; see § Retired / amended test IDs for the migration discipline)
**WHEN** `<BuildingClient>` mounts with a state holding one block and one brick, effects flush
**THEN** the Building view renders identically to its pre-refactor behavior — the `TopBar`, `Hero`, timeline, dock, and `EditModeProvider` wrapper are all present and behave as before; a mutating dispatch (e.g. `LOG_TICK_BRICK`) still flows through and updates the view; no console error, no hydration-mismatch warning.
**AND** the refactor is **mechanical** — `BuildingClient`'s JSX, sheets, handlers, and `EditModeProvider` are unchanged; only the state _source_ moved from an internal `usePersistedState()` call to a prop. This ID is the no-regression anchor for AC #15.
Proves: plan.md § View hosting (`BuildingClient` refactored from "calls the hook" to "receives `state`/`dispatch` props"; every other line unchanged) + § File structure `app/(building)/BuildingClient.tsx` row + § Open questions for VERIFIER item (c) — covers SPEC AC #10, AC #15.
Tag: success.

#### C-m9c-014 — edge (PastDayDetail — strictly read-only, mutation-resistant absence assertion)

Target file: `components/PastDayDetail.test.tsx` (NEW)
Layer: Component
**GIVEN** `<PastDayDetail archivedDay={fixtureArchivedDay} isoDate="2026-04-29" onClose={onClose} />` where `fixtureArchivedDay` has two blocks containing bricks in **mixed** `done` states (some tick bricks `done: true`, some `false`; a units brick `done: 12 / target: 30`) and one loose brick
**WHEN** rendered and its interactive surface is queried
**THEN** the panel exposes **no mutation affordance**: `queryByRole("checkbox")` → `null` (no tick toggle), `queryByRole("spinbutton")` → `null` (no units stepper), `queryAllByRole("button")` returns **exactly one** element — the `Close` control (`aria-label="Close"` or "Back to month"); there is no `+`/"Add brick"/"Add block"/"New" control (`queryByRole("button", { name: /add|new|\+/i })` → `null`); no `BrickChip`/`TimelineBlock` interactive element is rendered.
**AND** clicking `Close` calls `onClose` exactly once; the panel is otherwise pure presentation over the frozen `ArchivedDay` (a mutant that reuses an interactive `BrickChip`/`TimelineBlock` or threads a `dispatch` fails the single-`button` assertion).
Proves: plan.md § Components `<PastDayDetail>` ("strictly read-only — no `dispatch`, no `BrickChip`/`TimelineBlock`/sheet/stepper/toggle; the only interactive element is `Close`") + § Decisions to honor (the read-only guarantee) — covers SPEC AC #13.
Tag: edge.

#### C-m9c-015 — success (PastDayDetail — renders the day's blocks/bricks + score)

Target file: `components/PastDayDetail.test.tsx`
Layer: Component
**GIVEN** `<PastDayDetail archivedDay={fixtureArchivedDay} isoDate="2026-04-29" onClose={vi.fn()} />` where `fixtureArchivedDay` scores `dayPct === 75`, has a block `"Morning"` (`start`/`end` set) holding two bricks, and one loose brick
**WHEN** rendered
**THEN** a header shows the date formatted via `dateLabel("2026-04-29")` (`"Wed, Apr 29"`) and the day's score as a read-only `"75%"` (`Math.round` of `dayScore` / `dayPct` over the `ArchivedDay`); the block `"Morning"` renders with its time range (`fmtRange`) and its two bricks as static rows showing each brick's name and `brickLabel(brick)` (the "done / units" text); the loose brick renders under a trailing "Loose bricks" group.
**AND** a `Close` control is present (`role="region" aria-label="Day detail"` on the panel).
Proves: plan.md § Components `<PastDayDetail>` (header date + score, static block/brick list with `fmtRange`/`brickLabel`, loose-bricks group, `Close`) — covers SPEC AC #12.
Tag: success.

#### C-m9c-016 — success / edge (day-open interaction — today → Day view; past archived → PastDayDetail; future/pre-start → nothing)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={onOpenDay} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture (`history` has `"2026-05-17"`)
**WHEN** the `2026-05-18` (today) cell is clicked; then the `2026-05-17` (past, archived) cell is clicked; then a `future` cell (`2026-05-25`) and a `missed` cell (`2026-05-13`) are clicked
**THEN** clicking **today's** cell calls `onOpenDay("2026-05-18")` (which `AppShell` handles by `setView("day")` — verified end-to-end in `C-m9c-001` / `E-m9c-003`); it does **not** open `PastDayDetail`.
**AND** clicking the past **archived** `2026-05-17` cell opens `<PastDayDetail>` (a `role="region" aria-label="Day detail"` panel appears over the grid showing that day's blocks/bricks and score); clicking its `Close` dismisses the panel back to the grid.
**AND** clicking the `future` and `missed` cells does **nothing** — no `onOpenDay` call, no `PastDayDetail` panel (those cells are non-interactive `<div>`s per `C-m9c-007`).
Proves: plan.md § Components `<MonthView>` / `<PastDayDetail>` mounting (tap today → `onOpenDay`; tap past `scored` → `setOpenDate` → `PastDayDetail`; tap future/missed → no-op) + § Edge cases table — covers SPEC AC #12, AC #13.
Tag: edge.

### Accessibility (axe via Playwright)

`A-m9c-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9a sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9c-001 — a11y (Month grid — axe clean, keyboard, 430px)

Target file: `tests/e2e/m9c.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Month (Kingdom) view (under `count() > 0` guard)
**WHEN** axe-core runs against the month grid
**THEN** it returns **zero** violations across all rule categories; the grid is `role="grid"` with `role="row"`/`role="gridcell"` and `role="columnheader"` weekday headers; tappable `scored` day cells are reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carry a descriptive `aria-label` (weekday, full date, score); prev/next month buttons have `aria-label`s.
**AND** the 7-column grid renders within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`).
Proves: plan.md § Accessibility (month grid roles, keyboard, labels) + § Edge cases (430px) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-002 — a11y (ViewSwitcher — axe clean, tablist keyboard semantics)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the `ViewSwitcher` visible (under `count() > 0` guard)
**WHEN** axe-core runs and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations; the switcher container is `role="tablist"` (`aria-label="Calendar view"`); the Day and Month live segments are `role="tab"` with `aria-selected`, are keyboard-operable (Enter/Space activate; Left/Right arrows move between the two enabled tabs, skipping the disabled Week/Year); the Week and Year segments are `aria-disabled="true"` and removed from the tab sequence.
**AND** the four segments fit the 430px column with no overflow and each segment's hit area is ≥ 44px tall (ADR-031).
Proves: plan.md § Accessibility (switcher tablist/tab roles, arrow-key nav skipping disabled, `aria-disabled`) + § Decisions to honor (ADR-031) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-003 — a11y (PastDayDetail — axe clean, keyboard operable)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, a past archived day opened so `<PastDayDetail>` is showing (under `count() > 0` guard)
**WHEN** axe-core runs against the day-detail panel
**THEN** it returns **zero** violations; the panel is `role="region"` with `aria-label="Day detail"`; the `Close` control is focusable and carries an `aria-label`; the detail is a static read-only list with no form controls; it renders single-column at 430px with no horizontal overflow.
Proves: plan.md § Accessibility (`PastDayDetail` region role, `Close` label, static read-only, 430px) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-004 — a11y (DayCell heat-fill contrast at the alpha floor)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Month view showing cells across the score range — a low-score (`0`, alpha-floor `0.12`) `scored` cell, a high-score (`100`, alpha `0.90`) `scored` cell, and a `missed` cell (under `count() > 0` guard)
**WHEN** axe-core runs against the grid with colour-contrast rules enabled
**THEN** it returns **zero** contrast violations — the date numeral (`var(--ink)` `#f5f1e8`) and the corner score numeral meet WCAG AA over every heat-fill alpha including the `0.12` floor (the numeral's contrast is against the near-`--bg` page, not the translucent fill); the `missed` cell's `var(--ink-dim)` date number over `var(--card)` also meets AA.
Proves: plan.md § Accessibility (contrast — heat-fill alpha floor `0.12` keeps the numeral AA-legible) + § Open questions for VERIFIER item (d) — covers SPEC AC #14.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name: switch to Month, day-cell scores render, open a past day read-only.

#### E-m9c-001 — success (switch to Month — Kingdom grid renders)

Target file: `tests/e2e/m9c.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Month` segment is tapped (under `count() > 0` guard)
**THEN** the Kingdom month grid appears — a `role="grid"` calendar for the current month with a month-year label and a Sun…Sat weekday header row; the Building view is no longer shown; tapping `Day` returns to the Building view; tapping the `Week` or `Year` segment does **nothing** (no crash, no view change, no error overlay).
Proves: plan.md § Components `<ViewSwitcher>`/`<MonthView>` + § View hosting — covers SPEC AC #9, AC #10, AC #15 (switch-to-Month E2E scenario).
Tag: success.

#### E-m9c-002 — success (day-cell scores render)

Target file: `tests/e2e/m9c.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` set so the current month has at least one archived `history` day scoring a known value and a live in-progress day; the app loaded fresh at `/` and switched to Month
**WHEN** the month grid is inspected (under `count() > 0` guard)
**THEN** the archived day's cell shows its computed score (date number + accent heat fill + numeric score), today's cell shows the live in-progress score and is marked today (the 2px accent ring), and a past in-range never-opened day shows the distinct `missed` indicator; a future cell is an inert empty cell; no console error.
Proves: plan.md § Components `<DayCell>`/`<MonthView>` + § Data model `dayScore` — covers SPEC AC #3, AC #5, AC #6, AC #7, AC #8, AC #15 (day-cell-scores E2E scenario).
Tag: success.

#### E-m9c-003 — success (open a past day read-only)

Target file: `tests/e2e/m9c.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9c-002` (a hand-built v2 payload with an archived `history` day), the app at `/`, Month view shown
**WHEN** the archived past-day cell is tapped, then the today cell is tapped (under `count() > 0` guards)
**THEN** tapping the archived past-day cell opens the read-only `PastDayDetail` panel — it shows that day's blocks/bricks and score, exposes **no** add/complete/edit affordance (only a `Close` control), and `Close` returns to the grid.
**AND** tapping **today's** cell switches to the editable Building (Day) view (not the read-only detail) — `onOpenDay(today)` → `AppShell` `setView("day")`.
Proves: plan.md § Components `<PastDayDetail>` + § Components `<MonthView>` mounting (tap today → Day view; tap past archived → read-only detail) — covers SPEC AC #12, AC #13, AC #15 (open-past-day E2E scenario).
Tag: success.

### Sandbox / preview note

Per the established M3–M9b pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 4 `A-m9c-*` and 3 `E-m9c-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9b.spec.ts` / `tests/e2e/m8.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9c-002`/`E-m9c-003` partly mitigate it by hand-building the `dharma:v1` payload via `page.evaluate` (a deterministic seed for the month grid that does not depend on a brick-creation UI flow). M9c introduces no general deterministic seeding helper (out of scope per ADR-022). The 12 unit + 16 component IDs (`U-m9c-*`, `C-m9c-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the date math, the `dayScore` helper, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9c is additive in test count: it adds 35 new `m9c` IDs (12 U + 16 C + 4 A + 3 E) and removes none.

**Amended — sanctioned, mechanical migration (the `BuildingClient` prop-refactor regression surface):** the M9c plan (§ File structure, § View hosting) refactors `app/(building)/BuildingClient.tsx` so it **no longer calls `usePersistedState()` internally** and instead **receives `state` + `dispatch` as props** from the new `AppShell`. The existing `BuildingClient` test files mount `<BuildingClient />` with **no props**:

- `app/(building)/BuildingClient.test.tsx` — mounts `render(<BuildingClient />)`.
- `app/(building)/BuildingClient.m4b.test.tsx` — mounts `render(<BuildingClient />)`.
- `app/(building)/BuildingClient.m4d.test.tsx` — mounts `render(<BuildingClient />)` (14 mount sites).
- `app/(building)/BuildingClient.m4e.test.tsx` — mounts `render(<BuildingClient />)` (10 mount sites).
- (`app/(building)/BuildingClient.imports.test.ts` — a static-import smoke test; needs no change.)

After the refactor, `<BuildingClient />` with no props would be a TypeScript error (and would not hydrate state), so **these four files MUST be amended** as part of the M9c BUILDER dispatch. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M4d "chooser-walk amendment" precedent at tests.md § "The following pre-existing tests must be amended…"). The amendment is **mechanical and assertion-preserving**:

- Each `render(<BuildingClient />)` is replaced with a render that supplies `state`/`dispatch` — **either** (a) `render(<AppShell />)` and the test drives the Day view through the shell, **or** (b) a tiny test harness component that calls `usePersistedState()` and renders `<BuildingClient state={s} dispatch={d} />` (recommended — it keeps each test's existing localStorage-seeding + clock setup intact and changes the least).
- **Every existing assertion in those four files is preserved verbatim** — the amendment changes only how `BuildingClient` is _mounted_ (its state source), never _what_ is asserted. The pre-refactor behaviors (`m4b` block ordering, `m4d` chooser routing, `m4e` overlap engine, the base `BuildingClient.test.tsx` cases) must all still pass against the prop-receiving `BuildingClient`. `C-m9c-013` is the dedicated no-regression anchor proving the refactor is behavior-neutral.
- This amendment **edits existing test files** — which is in tension with a naive reading of AC #15's "no regression to M1–M9b". The TESTS-phase reading, consistent with how M9b § Retired test IDs surfaced the M8 `schemaVersion` tension and how M4d sanctioned the chooser-walk amendments, is: AC #15 means **no _behavioral_ regression** — the M4b/M4d/M4e/base behaviors stay green — and mechanically re-pointing a mount call from an internal hook to a prop is a _sanctioned migration_, not a regression. **VERIFIER: please confirm** that (a) editing `BuildingClient.test.tsx` + `.m4b` + `.m4d` + `.m4e` to supply `state`/`dispatch` is sanctioned and assertion-preserving, OR (b) FAIL back to PLANNER to add an explicit "amended test files" note to `plan.md` § File structure / § Out of scope. This is surfaced, not silent.

### Spec gaps surfaced for VERIFIER

The plan resolves all five of its named spec gaps in-plan (SG-m9c-01..05 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `BuildingClient`-refactor test amendment.** See § Retired / amended test IDs above — the genuine plan↔test tension for M9c. The plan modifies `BuildingClient.tsx` but does not explicitly list the four `BuildingClient*.test.tsx` files as amended. This entry's reading is that they are sanctioned mechanical, assertion-preserving amendments; VERIFIER rules whether that is acceptable or whether the plan must name them. This is the M9c analogue of the M9b § Spec gaps item 1 (the M8 `schemaVersion` tension) — surfaced, not silently resolved by the BUILDER.

2. **`AppShell` test-mount of `usePersistedState`.** `AppShell` calls `usePersistedState()` (which touches `localStorage` and reads the clock via `today()`/`rollover`). `C-m9c-001`/`C-m9c-002` mount `<AppShell />` with a mocked `localStorage` and `vi.setSystemTime` — the same harness pattern the M8/M9b `usePersistedState` tests use. VERIFIER may confirm this is the intended harness; no plan ambiguity blocks the BUILDER.

3. **`PastDayDetail` score source.** The plan says `PastDayDetail`'s header score is `dayScore(state, isoDate)` "(equivalently `dayPct` over the `ArchivedDay`)". `C-m9c-015` asserts the rendered score equals `Math.round` of that value without pinning which of the two equivalent calls the BUILDER uses (the plan states they are equivalent — the archived branch of `dayScore` _is_ `dayPct` over the `ArchivedDay`). VERIFIER may note this; it is not an ambiguity — both produce the identical number.

No ADR is reversed: **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `dayScore` is a pure read, M9c writes no `history`, mutates no `AppState`, and bumps no schema (stays `v2`); **ADR-019** (`Recurrence`/`0=Sun…6=Sat` weekday convention) is honored by the grid's weekday headers and leading-blank count; **ADR-038** (forgiveness — missed = gray) governs the `missed` cell's gray card chip; **ADR-031** (44px touch targets) is enforced by `A-m9c-002` and the switcher/cell sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9c adds 35 `m9c` test IDs (12 U + 16 C + 4 A + 3 E) and retires none; it amends the four `BuildingClient*.test.tsx` files as a sanctioned mechanical migration (VERIFIER to confirm).

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                       | Test ID(s)                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| #1  | Month view renders a 7-col calendar grid: weekday columns, week rows, a cell per date, leading/trailing alignment blanks | `U-m9c-001`, `U-m9c-002`, `U-m9c-003`, `U-m9c-005`, `C-m9c-008`, `C-m9c-011`      |
| #2  | Grid labeled with month name + year; weekday column headers shown                                                        | `C-m9c-008`                                                                       |
| #3  | Each in-range day cell shows its date-of-month number + a score indicator                                                | `C-m9c-003`, `C-m9c-008`, `C-m9c-009`, `E-m9c-002`                                |
| #4  | `dayScore` helper: archived→`dayPct`, today→live `dayPct`, no-data→`null` sentinel                                       | `U-m9c-007`, `U-m9c-008`, `U-m9c-009`, `U-m9c-010`, `U-m9c-011`, `U-m9c-012`      |
| #5  | An archived `history`-entry day cell displays that archived day's `dayPct`                                               | `U-m9c-007`, `U-m9c-012`, `C-m9c-003`, `C-m9c-009`, `E-m9c-002`                   |
| #6  | Today's cell displays the live in-progress `dayPct` AND is visually marked today                                         | `U-m9c-009`, `C-m9c-004`, `C-m9c-009`, `E-m9c-002`                                |
| #7  | A past in-range no-`history` day → distinct missed indicator, visually different from a future/pre-start blank           | `U-m9c-011`, `C-m9c-005`, `C-m9c-006`, `C-m9c-009`, `E-m9c-002`                   |
| #8  | A future date and a pre-`programStart` date → inert empty cells, no score                                                | `U-m9c-008`, `C-m9c-006`, `C-m9c-007`, `C-m9c-009`, `C-m9c-011`, `E-m9c-002`      |
| #9  | A Day·Week·Month·Year segmented switcher present; active view visually indicated                                         | `C-m9c-001`, `C-m9c-012`, `E-m9c-001`                                             |
| #10 | Day → Building view; Month → Kingdom grid; Week/Year present but inert (no crash)                                        | `C-m9c-001`, `C-m9c-002`, `C-m9c-012`, `C-m9c-013`, `E-m9c-001`                   |
| #11 | Prev/next move the grid + label by a month; Dec→Jan advances the year                                                    | `U-m9c-004`, `U-m9c-005`, `U-m9c-006`, `C-m9c-010`                                |
| #12 | Tapping today's cell → editable Building view; tapping a past archived day → read-only day detail                        | `C-m9c-015`, `C-m9c-016`, `E-m9c-003`                                             |
| #13 | Past-day detail exposes NO add/complete/edit affordance; tapping a future/pre-start date does nothing                    | `C-m9c-007`, `C-m9c-014`, `C-m9c-016`, `E-m9c-003`                                |
| #14 | 430px renders without overflow; axe clean; switcher + day cells keyboard-operable + screen-reader-labeled                | `A-m9c-001`, `A-m9c-002`, `A-m9c-003`, `A-m9c-004`                                |
| #15 | No regression to M1–M9b; quality gates clean; E2E covers switch-to-Month / day-cell-scores / open-past-day               | **gate (`npm run eval`)** + `C-m9c-013` (no-regression anchor) + `E-m9c-001..003` |

**Gate-verified portion:** AC #15's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b precedent. AC #15's no-regression half is anchored by `C-m9c-013` plus the sanctioned mechanical-migration discipline in § Retired / amended test IDs. All other 14 ACs map to at least one bespoke `m9c` test ID; every `m9c` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** archived `history` day → `U-m9c-007`/`C-m9c-009`; today's cell → `U-m9c-009`/`C-m9c-004`; past in-range missed day → `U-m9c-011`/`C-m9c-005`/`C-m9c-006`/`C-m9c-009`; future date → `C-m9c-006`/`C-m9c-007`/`C-m9c-009`; pre-`programStart` date → `C-m9c-006`/`C-m9c-007`/`C-m9c-011`; first-ever run (empty `history`) → `U-m9c-008`/`C-m9c-011`; a month with no history (future month) → `C-m9c-011`; Dec→Jan year boundary → `U-m9c-004`/`U-m9c-006`/`C-m9c-010`; `ArchivedDay` score 0 vs missed day → `U-m9c-011`/`C-m9c-005`; tapping inert cells → `C-m9c-007`/`C-m9c-016`; selecting Week/Year → `C-m9c-012`/`E-m9c-001`; UTC-drift → `U-m9c-005`; 430px → `A-m9c-001`/`A-m9c-002`/`A-m9c-003`; heat-fill alpha-floor contrast → `A-m9c-004`; reduced-motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9c adds no new motion, only the switcher's instant-collapse transition, asserted via the M0 motion-token discipline per the M3 SG-m3-18 precedent).
