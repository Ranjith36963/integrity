## Milestone 9d — Week view (Castle) + period scoring — Tests

This entry covers M9d — the **Castle view** (the week) and the first **period aggregate score**: the seven-row week layout, per-day score indicators, the prominent `weekScore` aggregate ring, prev/next-week navigation, the now-enabled **Week** switcher segment, and the reused read-only `PastDayDetail`. It is derived from the `plan.md` M9d entry (`## Milestone 9d — Week view (Castle) + period scoring — Plan`). Feature slug: `m9d`. ID prefixes: `U-m9d-`, `C-m9d-`, `A-m9d-`, `E-m9d-`. M9d adds a real UI surface (two new components + the new `lib/weekGrid.ts`), so it has a full four-layer test mix — unit (pure `lib/weekGrid.ts` date math + the pure `weekScore` helper), component (`WeekView`, `WeekDayCell`, the `<WeekAggregate>` ring, `ViewSwitcher` Week-enabled, `AppShell` week-view wiring), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9d has a **large genuine unit surface** — `lib/weekGrid.ts` is pure date math (`weekDates`/`addWeek`/`subWeek`/`weekRangeLabel`, called with literal ISO args, no clock, no `localStorage`) and `weekScore` in `lib/history.ts` is a pure `(state, anchorISO)` aggregator over `dayScore`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) precedent:

- **AC #13 (no regression to M1–M9c; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Week / per-day-scores + aggregate / open-past-day-read-only)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the `C-m9c-012` amendment in § Retired / amended test IDs below (the only stale-test collateral of enabling the Week segment) plus `C-m9d-013` (the `AppShell` Week-branch wiring is purely additive — Day/Month behavior byte-equivalent); the three named E2E scenarios are authored as real `test()` blocks (`E-m9d-001..003`).

All other 12 ACs map to at least one concrete bespoke `m9d` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b/M9c discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9d-004` is THE load-bearing `weekScore` correctness guard.** It asserts the **exact** numeric average for a fixture week with three archived scores `80`/`60`/`40` and **two** in-range missed days — `(80 + 60 + 40 + 0 + 0) / 5 = 36`, asserted `toBe(36)`, **not** `60` (the inflated `(80+60+40)/3` a mutant that excludes missed days would yield). A mutant that drops the missed-day `0`s from the numerator OR from the denominator fails this exact-value assertion. SG-m9d-01's honest-scoreboard rule is enforced numerically.
- **`U-m9d-006` (`weekScore` no-data sentinel) asserts strict `=== null`**, not falsy — a mutant returning `0` for a fully-future / fully-pre-start week fails, because `WeekAggregate`'s no-data branch (`C-m9d-008`) depends on telling the `null` sentinel apart from a real `0`.
- **`U-m9d-005` (`weekScore` purity + clock-independence) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts `weekScore` neither throws, mutates, nor reads `Date.now()` — it derives "today" from `state.currentDate`, never the system clock. Two calls with the same args return `===`-equal results. A mutant that calls `new Date()` or mutates `state` fails.
- **`U-m9d-002` (UTC-drift) computes `weekDates` for a known week and asserts every one of the seven `iso` strings exactly, then re-runs under a faked negative-UTC-offset environment** (`vi.stubEnv("TZ", "America/Los_Angeles")` / the M9a `appliesOn.tz.test.ts` faked-offset pattern) — a mutant using `new Date(isoString)` (UTC midnight) drifts a day and fails the cross-environment equality. The plan's § Week-date math forbids `new Date(isoString)`.
- **`U-m9d-003` (`weekDates` agrees with the M9c month grid)** asserts the seven dates `weekDates` returns for an anchor are the identical Sun→Sat span that anchor's row occupies in `monthGridCells` — a mutant using a Monday-start (`getDay()` off-by-one) convention fails (SG-m9d-03).
- **`C-m9d-005` (the `missed` vs score-0 distinctness) is a structural absence assertion** — a `missed` `WeekDayCell` row has **no** heat fill and **no** score numeral text node; a `scored` score-0 row has the `0.12`-alpha accent fill **and** a numeral "0". A mutant rendering them identically fails.
- **`C-m9d-007` (inert-cell tappability is structural) asserts `future`/`pre-start`/`missed` rows are NOT `<button>`s** (`queryByRole("button")` within the row → `null`) — AC #11's "tapping a future / pre-start day does nothing" is proven by the absence of an interactive role, not a guarded no-op handler a mutant could un-guard.
- **`C-m9d-008` (no-data aggregate) asserts a `—` em-dash glyph and NO `0` / NO `%`-of-zero** — a mutant rendering `0%` for a fully-future week fails. The ring `role="img"` `aria-label` is asserted to be `"Week score: no data"`, not `"Week score 0 percent"`.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9d-001..009` | 9      |
| Component (Vitest + Testing Library)  | `C-m9d-001..014` | 14     |
| Accessibility (axe via Playwright)    | `A-m9d-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m9d-001..003` | 3      |
| **Total**                             |                  | **29** |

ID series start values were supplied by the orchestrator: `U-m9d-001`, `C-m9d-001`, `A-m9d-001`, `E-m9d-001`.

**Fixture dates (ISO, weekdays verified against the proleptic Gregorian calendar):**
`2026-05-01` Fri (**`programStart`**) · `2026-05-10` Sun · `2026-05-16` Sat · `2026-05-17` Sun · `2026-05-18` Mon (**today**, per `currentDate`) · `2026-05-23` Sat · `2026-05-24` Sun · `2026-05-30` Sat · `2026-05-31` Sun · `2026-06-06` Sat · `2026-04-26` Sun · `2026-04-30` Thu · `2026-12-27` Sun · `2026-12-31` Thu · `2027-01-01` Fri · `2027-01-02` Sat · `2025-12-28` Sun · `2026-01-03` Sat.

**The named fixture weeks (all Sunday-start, verified):**

| Week             | Span (Sun→Sat)              | Character                                                                     |
| ---------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **W-today**      | `2026-05-17` … `2026-05-23` | contains today (`2026-05-18` Mon, index 1); days 19–23 are future             |
| **W-past**       | `2026-05-10` … `2026-05-16` | fully past, fully in-range (all ≥ `programStart 2026-05-01`, all ≤ today)     |
| **W-future**     | `2026-05-24` … `2026-05-30` | fully future (all > today `2026-05-18`)                                       |
| **W-prestart**   | `2026-04-26` … `2026-05-02` | straddles `programStart`: `04-26`…`04-30` pre-start, `05-01`/`05-02` in-range |
| **W-monthcross** | `2026-05-31` … `2026-06-06` | straddles the May→June month boundary                                         |
| **W-yearcross**  | `2026-12-27` … `2027-01-02` | straddles the Dec 2026→Jan 2027 year boundary                                 |

**Standing `weekScore` fixture `state` unless a test overrides it:** `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, the live in-progress day (`blocks`/`categories`/`looseBricks`) scoring `dayPct === 40`. `history` for the W-today scoring tests = `{ "2026-05-17": <ArchivedDay scoring 100> }` → `weekScore(state, <any day in W-today>)` = included days are `05-17` (archived 100) and `05-18` (today, live 40); `05-19`…`05-23` future, excluded → `(100 + 40) / 2 = `**`70`**. For the W-past missed-day fixture (`U-m9d-004`) `history` = `{ "2026-05-12": 80, "2026-05-13": 60, "2026-05-14": 40 }` (three `ArchivedDay`s scoring those `dayPct`s); `05-10`, `05-11`, `05-15`, `05-16` have no entry — `05-10`/`05-11`/`05-15`/`05-16` are all in-range past missed days, but the fixture pins **exactly two** of them as the counted missed days by setting `programStart` to `"2026-05-12"` for that test (so `05-10`/`05-11` become pre-start and are excluded) → included = `05-12`(80), `05-13`(60), `05-14`(40), `05-15`(missed→0), `05-16`(missed→0) → `(80+60+40+0+0)/5 = `**`36`**.

### Unit (Vitest)

`U-m9d-001..003` exercise the pure `lib/weekGrid.ts` (no clock, no `localStorage` — called with literal ISO-string args). `U-m9d-004..009` exercise the `weekScore` helper added to `lib/history.ts` (pure `(state, anchorISO)` — no clock, no `localStorage`, driven directly).

#### U-m9d-001 — success (weekGrid module surface — weekDates / addWeek / subWeek / weekRangeLabel)

Target file: `lib/weekGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` exported from `lib/weekGrid.ts`
**WHEN** the module's exports are inspected and `weekDates` is called for a mid-week anchor
**THEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` are all `typeof === "function"`; `weekDates("2026-05-20")` (a Wednesday anchor in W-today) returns a `string[]` of **exactly length 7**; every element is a zero-padded `YYYY-MM-DD` ISO string (`"2026-05-09"`, never `"2026-05-9"`); the array is `["2026-05-17","2026-05-18","2026-05-19","2026-05-20","2026-05-21","2026-05-22","2026-05-23"]` — Sun→Sat, ascending by one day.
**AND** `weekDates` accepts **any** day of the target week as the anchor and returns the identical seven dates: `weekDates("2026-05-17")` (the Sunday), `weekDates("2026-05-20")` (a Wednesday) and `weekDates("2026-05-23")` (the Saturday) all `toEqual` the same array — `weekDates` re-normalizes to the week's Sunday.
Proves: plan.md § Week-date math (`weekDates` → seven Sun→Sat ISO dates, length 7, zero-padded, anchor-agnostic via Sunday normalization) + § File structure (`lib/weekGrid.ts` module surface) — covers SPEC AC #1.
Tag: success.

#### U-m9d-002 — edge (weekDates — month/year boundaries + UTC-drift-free, mutation-resistant)

Target file: `lib/weekGrid.test.ts`
Layer: Unit
**GIVEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` from `lib/weekGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** the boundary weeks are computed in **both** environments
**THEN** in **both** environments: `weekDates("2026-06-02")` (W-monthcross anchor) `toEqual` `["2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06"]` — crossing the May→June boundary correctly; `weekDates("2026-12-30")` (W-yearcross anchor) `toEqual` `["2026-12-27","2026-12-28","2026-12-29","2026-12-30","2026-12-31","2027-01-01","2027-01-02"]` — the `iso` years are correct on both sides of the year boundary; every `iso` string is byte-identical between the two timezone runs (no day drift).
**AND** `addWeek("2026-12-30")` returns a date in the Jan 6–12, 2027 week and `subWeek("2026-01-01")` returns a date in the Dec 21–27, 2025 week — `±7`-day arithmetic rolls the month/year correctly; `weekRangeLabel("2026-12-30")` returns `"Dec 27, 2026 – Jan 2, 2027"`. There is **no** `new Date("2026-05-01")`-style ISO string-parse anywhere in `lib/weekGrid.ts` — only the multi-arg local-time constructor (`new Date(y, m, d)`); a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality.
Proves: plan.md § Week-date math (boundary-correct `weekDates`/`addWeek`/`subWeek`; no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson) — covers SPEC AC #1, AC #2, AC #9.
Tag: edge.

#### U-m9d-003 — edge (weekRangeLabel formatting + week-start agrees with the M9c month grid)

Target file: `lib/weekGrid.test.ts`
Layer: Unit
**GIVEN** `weekRangeLabel` and `weekDates` from `lib/weekGrid.ts`, and `monthGridCells` from `lib/monthGrid.ts` (M9c)
**WHEN** `weekRangeLabel` is called for a same-month week, a month-spanning week, and a year-spanning week; and `weekDates` is cross-checked against `monthGridCells`
**THEN** `weekRangeLabel("2026-05-20")` returns `"May 17–23, 2026"` (shared month + year collapsed); `weekRangeLabel("2026-06-02")` returns `"May 31 – Jun 6, 2026"` (months expanded, shared year); `weekRangeLabel("2026-12-30")` returns `"Dec 27, 2026 – Jan 2, 2027"` (year expanded on both endpoints) — matching SPEC AC #2's worked examples.
**AND** week-start agreement (SG-m9d-03): for the anchor `2026-05-20`, the seven `weekDates` strings `["2026-05-17"…"2026-05-23"]` are exactly the seven consecutive `{ kind: "date" }` cells that occupy one full Sun→Sat row of `monthGridCells(2026, 4)` (May 2026) — the week view and the month grid can never disagree on which seven dates form a week; both use the `0=Sun` `getDay()` convention.
Proves: plan.md § Week-date math (`weekRangeLabel` month/year collapse-or-expand rules; SG-m9d-03 — Sunday-start, week helper agrees with the M9c `monthGrid.ts`) — covers SPEC AC #1, AC #2.
Tag: edge.

#### U-m9d-004 — success / edge (weekScore — THE honest-week-average contract, missed = 0, mutation-resistant)

Target file: `lib/history.test.ts` (EXISTS — `weekScore` cases appended; no `m9b`/`m9c` ID touched)
Layer: Unit
**GIVEN** `weekScore` exported from `lib/history.ts`, and a fixture `state` with `programStart: "2026-05-12"`, `currentDate: "2026-05-18"`, and `history = { "2026-05-12": <ArchivedDay dayPct 80>, "2026-05-13": <ArchivedDay dayPct 60>, "2026-05-14": <ArchivedDay dayPct 40> }` — `2026-05-15` and `2026-05-16` have **no** `history` entry (in-range past missed days); `2026-05-10`/`2026-05-11` are pre-`programStart`
**WHEN** `weekScore(state, "2026-05-13")` is called (an anchor in the W-past week `2026-05-10`…`2026-05-16`)
**THEN** it returns the **number `36`** — `expect(weekScore(state, "2026-05-13")).toBe(36)`. The seven week dates are classified: `05-10`/`05-11` are `< programStart` → **excluded** from numerator and denominator; `05-12`/`05-13`/`05-14` archived → contribute `80`/`60`/`40`; `05-15`/`05-16` are in-range (`programStart ≤ d ≤ currentDate`) past days with no `history` entry → `dayScore` returns `NO_DATA` → each contributes **`0`** and **is counted** in the denominator. Numerator `= 80+60+40+0+0 = 180`; denominator `= 5`; result `= 36`.
**AND** the value is asserted to be **`36`, NOT `60`** — `60` is the inflated `(80+60+40)/3` average a mutant that drops missed days from the numerator OR denominator would produce. A mutant that excludes the two missed days fails this exact assertion. This is the numeric enforcement of SG-m9d-01 (the honest-scoreboard rule).
Proves: plan.md § `weekScore` helper (the honest-week average — included days summed, missed-in-range `NO_DATA → 0` contribution counted in numerator AND denominator, pre-start excluded from both) + § Decisions to honor (SG-m9d-01) — covers SPEC AC #4.
Tag: edge.

#### U-m9d-005 — edge (weekScore — purity, clock-independence, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the standing W-today scoring fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` keyed on `"2026-05-17"`), deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.categories`, `state.looseBricks` — passed to `weekScore`
**WHEN** `weekScore(frozenState, "2026-05-20")` is called twice with the identical args, and the system clock is advanced (`vi.setSystemTime`) between the two calls
**THEN** neither call throws (`expect(() => weekScore(frozenState, iso)).not.toThrow()`) — `weekScore` writes into neither `state` nor any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** both calls return **`70`** and are deep-equal **regardless of the advanced system clock** — `weekScore` derives "today" from `state.currentDate`, **never** `new Date()` / `Date.now()`; it reads no clock and no `localStorage`; it is a pure function of `(state, anchorISO)`. A mutant that reads the system clock returns a different result after the clock is advanced and fails.
Proves: plan.md § `weekScore` helper (purity — "reads no clock and no `localStorage`; today derived from `state.currentDate`; pure function of `(state, anchorISO)`") + § Decisions to honor (ADR-045 — `history` consumed read-only) + § Open questions for VERIFIER item (a) — covers SPEC AC #4.
Tag: edge.

#### U-m9d-006 — edge (weekScore — no-data sentinel for fully-future / fully-pre-start weeks, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` and the `NO_DATA` sentinel from `lib/history.ts`, the standing fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`)
**WHEN** `weekScore` is called for the W-future week (`2026-05-24`…`2026-05-30`, every day `> currentDate`) and for a fully-pre-`programStart` week (anchor `"2026-04-15"`, the week `2026-04-12`…`2026-04-18`, every day `< programStart`)
**THEN** each call returns **exactly `null`** — `expect(weekScore(state, "2026-05-27")).toBe(null)` and `expect(weekScore(state, "2026-04-15")).toBe(null)` (strict `=== null`, NOT merely falsy, NOT `0`); `NO_DATA` is exported and `NO_DATA === null`. The denominator is `0` (no day is in-range and non-future), so `weekScore` returns the sentinel rather than dividing by zero.
**AND** `0` is **never** returned for the no-data case — `0` is reserved for "the week happened and every included day scored 0" (a distinct, truthful statement); a mutant returning `0` for an empty denominator fails the strict `toBe(null)`.
Proves: plan.md § `weekScore` helper (no-data case — denominator `0` → `NO_DATA`, never `0`, never a divide-by-zero crash) + § Edge cases (fully future week / week before `programStart`) — covers SPEC AC #6.
Tag: edge.

#### U-m9d-007 — success (weekScore — today's live dayPct contributes to the aggregate)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and the standing W-today fixture `state` — `currentDate: "2026-05-18"`, the live in-progress day scoring `dayPct === 40`, `history = { "2026-05-17": <ArchivedDay dayPct 100> }`
**WHEN** `weekScore(state, "2026-05-18")` is called (an anchor in W-today `2026-05-17`…`2026-05-23`)
**THEN** it returns the **number `70`** — `expect(weekScore(state, "2026-05-18")).toBe(70)`. `05-17` is archived → `dayScore` returns `100`; `05-18` equals `currentDate` → `dayScore` returns the **live** `dayPct === 40` (today's in-progress score, AC #7); `05-19`…`05-23` are `> currentDate` → future → excluded. Numerator `= 100 + 40 = 140`; denominator `= 2`; result `= 70`.
**AND** when the live in-progress day is mutated in a sibling fixture so `dayPct` rises to `80`, `weekScore` for the same anchor returns `(100 + 80)/2 = 90` — today's contribution tracks the live `dayPct` (it is not a stale snapshot); future days remain excluded.
Proves: plan.md § `weekScore` helper (week-containing-today branch — today contributes its live `dayPct` via `dayScore`'s `currentDate` branch; future days excluded) + § Edge cases (a week containing today) — covers SPEC AC #4, AC #7.
Tag: success.

#### U-m9d-008 — edge (weekScore — empty history first run; straddling programStart)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and two fixtures: (a) a first-run `state` with `history === {}`, `programStart: "2026-05-13"`, `currentDate: "2026-05-15"`, live day scoring `dayPct === 50`; (b) the W-prestart `state` with `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history = { "2026-05-01": <ArchivedDay dayPct 90> }`
**WHEN** `weekScore` is called on each
**THEN** for (a) — W-today anchor `"2026-05-15"`, week `2026-05-10`…`2026-05-16`: `05-10`/`05-11`/`05-12` are `< programStart` → excluded; `05-13`/`05-14` are in-range past days with no `history` entry → missed → contribute `0`; `05-15` equals `currentDate` → live `dayPct === 50`; `05-16` is `> currentDate` → future → excluded. Result `= (0 + 0 + 50)/3 = 16.66…` → `weekScore` returns the un-rounded `50/3` (rounding is the `WeekAggregate` display's job, not the helper's) — the test asserts `toBeCloseTo(16.667, 2)`. No crash on the empty `history` map.
**AND** for (b) — W-prestart anchor `"2026-04-29"`, week `2026-04-26`…`2026-05-02`: `04-26`…`04-30` are `< programStart "2026-05-01"` → excluded from numerator AND denominator; `05-01` archived → `90`; `05-02` is in-range past missed → `0`. Result `= (90 + 0)/2 = 45`.
Proves: plan.md § `weekScore` helper (empty-`history` first run — safe, in-range past days contribute `0`, today live, future excluded) + § Edge cases (empty `history` first run; a week straddling `programStart`) — covers SPEC AC #4, AC #6.
Tag: edge.

#### U-m9d-009 — success / edge (weekScore — a fully-past week averages all seven in-range days; missed vs 0-archived both count 0)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and a W-past fixture `state` — `programStart: "2026-05-01"`, `currentDate: "2026-05-18"` (so all of `2026-05-10`…`2026-05-16` are in-range and `≤ currentDate`), `history` holding archived days for all seven dates with `dayPct`s `70, 0, 50, 100, 30, 90, 60` for `05-10`…`05-16` respectively (note `05-11` is a real `ArchivedDay` that **scored `0`** — the user tried, completed nothing)
**WHEN** `weekScore(state, "2026-05-13")` is called
**THEN** it returns the **number** `(70 + 0 + 50 + 100 + 30 + 90 + 60) / 7 = 400 / 7 = 57.14…` — the test asserts `toBeCloseTo(57.143, 2)`; all seven days are in-range and non-future → all seven included; the denominator is `7`.
**AND** in a sibling fixture where `05-11`'s `ArchivedDay` is **removed** (so `05-11` becomes a missed day with no `history` entry — but still in-range and past), `weekScore` returns the **same** `400/7` — a `missed` day (`dayScore → NO_DATA → 0`) and a `0`-scoring `ArchivedDay` (`dayScore → 0`) contribute the **identical `0`** to the average and are both counted in the denominator; they are indistinguishable to `weekScore` (the distinction is purely visual — see `C-m9d-005`).
Proves: plan.md § `weekScore` helper (a fully-past week — all seven `≤ currentDate` & `≥ programStart` included; missed-day `0` and 0-archived `0` contribute identically) + § Edge cases (a fully past week; a missed day vs a 0-score archived day) — covers SPEC AC #4.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9d-001..003` cover `<WeekView>` (layout, range label, prev/next nav); `C-m9d-004..007` cover `<WeekDayCell>` (the four `kind`s, distinctness, structural tappability); `C-m9d-008..009` cover `<WeekAggregate>` (the score ring + the no-data state); `C-m9d-010..011` cover `<ViewSwitcher>` with Week enabled; `C-m9d-012..013` cover `<AppShell>` week-view wiring; `C-m9d-014` covers the day-tap routing (today → Day view, past archived → `PastDayDetail`). All render with React Testing Library; where a clock read matters (`WeekView`'s initial anchor + cell classification reads `today()`) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `<AppShell />` (which calls `usePersistedState`).

#### C-m9d-001 — success (WeekView — seven Sun→Sat rows + date-range label)

Target file: `components/WeekView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing W-today fixture state
**WHEN** rendered (the initial anchor is today → the W-today week `2026-05-17`…`2026-05-23`)
**THEN** exactly **seven** `WeekDayCell` rows render, inside a `role="list"` container (`aria-label="Week days"`), each row a `role="listitem"`; the rows are ordered Sun→Sat — the first row's weekday label is "Sun" (`2026-05-17`), the last is "Sat" (`2026-05-23`); each row shows its day-of-month number.
**AND** a week date-range label reads `"May 17–23, 2026"` (via `weekRangeLabel`), rendered in the display serif at `var(--fs-22)`.
Proves: plan.md § Components `<WeekView>` (seven Sun→Sat `WeekDayCell` rows in a `role="list"`; `weekRangeLabel` heading) — covers SPEC AC #1, AC #2.
Tag: success.

#### C-m9d-002 — success (WeekView — prev/next week nav updates layout, label, aggregate)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, starting on the W-today week (`"May 17–23, 2026"`)
**WHEN** the "Previous week" button is clicked once, then the "Next week" button is clicked twice
**THEN** the two nav controls are `<button>`s carrying `aria-label="Previous week"` / `"Next week"`; after one Previous click the label reads `"May 10–16, 2026"`, the seven rows are `2026-05-10`…`2026-05-16`, and the aggregate recomputes for the new week; after two Next clicks the label reads `"May 24–30, 2026"` and the rows are the W-future week — the layout, range label, and aggregate **all** recompute from the new anchor.
**AND** the anchor changes are session-only React state — they call `setAnchor(subWeek(...))` / `setAnchor(addWeek(...))`; no `localStorage` write occurs on nav (asserted by a `localStorage.setItem` spy showing zero calls attributable to nav).
Proves: plan.md § Components `<WeekView>` (prev/next-week buttons → `setAnchor(subWeek/addWeek)`; label + layout + aggregate recompute; session-only anchor) — covers SPEC AC #9.
Tag: success.

#### C-m9d-003 — edge (WeekView — prev/next week across month and year boundaries)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` with `programStart: "2026-01-01"` and `currentDate` / `vi.setSystemTime` set so the displayed anchor can be navigated to `"2026-06-02"` (W-monthcross) and to `"2026-12-30"` (W-yearcross)
**WHEN** the week is navigated to the W-monthcross week, then to the W-yearcross week
**THEN** the W-monthcross week renders seven rows `2026-05-31`…`2026-06-06` with the label `"May 31 – Jun 6, 2026"` — the layout spans the May→June boundary without a gap or duplicate; the W-yearcross week renders `2026-12-27`…`2027-01-02` with the label `"Dec 27, 2026 – Jan 2, 2027"` — the seven rows carry the correct `iso` years on both sides of the year boundary.
Proves: plan.md § Components `<WeekView>` + § Week-date math (prev/next nav crosses month + year boundaries; `addWeek`/`subWeek` `±7` arithmetic) + § Edge cases (a week straddling a month or year boundary) — covers SPEC AC #2, AC #9.
Tag: edge.

#### C-m9d-004 — success (WeekDayCell — scored row renders weekday + date + heat fill + numeral)

Target file: `components/WeekDayCell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<WeekDayCell kind="scored" date="2026-05-16" dayOfMonth={16} weekdayLabel="Sat" score={60} isToday={false} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the row displays the weekday label `"Sat"` and the date number `16`; it renders a numeric score `60` (the `Math.round(score)` numeral); the row carries the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (asserted via inline style / a `data-score`-derived style hook — the identical heat formula M9c's `DayCell` uses); the row is a `<button>` (tappable) with an `aria-label` of the form `"Saturday, May 16, 2026, score 60 percent"`; the row is ≥ 44px tall (ADR-031).
**AND** clicking it calls `onOpen` exactly once.
Proves: plan.md § Components `<WeekDayCell>` (`scored` kind — weekday + date + accent heat fill at scaled alpha + numeral; tappable `<button>` ≥ 44px) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) — covers SPEC AC #3.
Tag: success.

#### C-m9d-005 — edge (WeekDayCell — missed vs scored-zero distinctness, mutation-resistant)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** two renders — `<WeekDayCell kind="scored" score={0} date="2026-05-15" dayOfMonth={15} weekdayLabel="Fri" onOpen={vi.fn()} />` and `<WeekDayCell kind="missed" date="2026-05-13" dayOfMonth={13} weekdayLabel="Wed" />`
**WHEN** each is rendered and inspected
**THEN** the `scored` score-`0` row carries the **minimum-alpha** `var(--accent)` heat fill (alpha `0.12`) **and** a visible score numeral text node `"0"`; the `missed` row has **no** heat fill (flat `var(--card)` background with a 1px `var(--card-edge)` border) and **no** score numeral text node at all — the two are structurally distinct (a mutant rendering them identically fails).
**AND** the `missed` row's weekday + date text is `var(--ink-dim)`; it is a plain `<div>`, not a `<button>` (`queryByRole("button")` within it → `null`), carrying no interactive role — it is read-only with no detail (ADR-038 forgiveness — gray, not red, no shame).
Proves: plan.md § Components `<WeekDayCell>` (per-`kind` table — `scored` score-0 = `0.12`-alpha fill + numeral "0"; `missed` = flat `--card` row, no fill / no numeral; distinctness) + § Edge cases (a missed day vs a 0-score archived day) + § Decisions to honor (ADR-038) — covers SPEC AC #3.
Tag: edge.

#### C-m9d-006 — edge (WeekDayCell — future and pre-start rows are inert)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** `<WeekDayCell kind="future" date="2026-05-25" dayOfMonth={25} weekdayLabel="Mon" />` and `<WeekDayCell kind="pre-start" date="2026-04-28" dayOfMonth={28} weekdayLabel="Tue" />`
**WHEN** each is rendered and inspected
**THEN** both rows render the weekday label + date number in `var(--ink-dim)` at low opacity, with a transparent background and no border; **neither** renders a heat fill or a score numeral; both are plain `<div>`s with no interactive role (`queryByRole("button")` → `null`) and are not focusable.
**AND** the `future` and `pre-start` rows are visually identical inert treatments (the plan's per-`kind` table maps `pre-start` to "identical inert treatment to `future`").
Proves: plan.md § Components `<WeekDayCell>` (per-`kind` table — `future` / `pre-start` inert rows, plain `<div>`, no fill, no numeral) — covers SPEC AC #3, AC #11.
Tag: edge.

#### C-m9d-007 — edge (WeekDayCell — today marker; inert-cell tappability is structural, mutation-resistant)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** a `scored` row with `isToday={true}` (`<WeekDayCell kind="scored" isToday date="2026-05-18" dayOfMonth={18} weekdayLabel="Mon" score={40} onOpen={vi.fn()} />`) and the four inert/missed rows from `C-m9d-005`/`C-m9d-006`
**WHEN** each is rendered
**THEN** the `isToday` `scored` row additionally carries a 2px `var(--accent)` ring/outline so today is unmistakable; its `aria-label` includes `", today"` (e.g. `"Monday, May 18, 2026, today, score 40 percent"`).
**AND** of the rows tested across `C-m9d-004..007`, **only** the `scored` rows are `<button>`s — the `missed`, `future`, and `pre-start` rows expose **no** `role="button"` (`queryByRole("button")` within each → `null`): "tapping a future / pre-start / missed day does nothing" (AC #11) is structural — proven by the absence of an interactive role, not a guarded no-op handler a mutant could un-guard.
Proves: plan.md § Components `<WeekDayCell>` (`isToday` 2px accent ring + `", today"` aria-label; tappable cells are `<button>`, non-tappable are plain `<div>` — structural no-op) — covers SPEC AC #3, AC #11.
Tag: edge.

#### C-m9d-008 — edge (WeekAggregate — no-data state renders the em-dash, never 0, mutation-resistant)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` navigated to the W-future week (`2026-05-24`…`2026-05-30`, `weekScore` → `NO_DATA`), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the week aggregate display is inspected
**THEN** the aggregate renders a **distinct no-data treatment** — the ring track only (no progress arc) and a `—` (em-dash) glyph in `var(--ink-dim)` in place of the numeral, with the "Week" / "Castle score" label still shown; there is **no** `"0%"`, **no** `"0"` numeral, and no crash (`WeekView` branches on `weekScore(...) === null`).
**AND** the ring is `role="img"` with `aria-label="Week score: no data"` (NOT `"Week score 0 percent"`); a mutant that renders `0%` for an empty-denominator week fails both the `—`-glyph assertion and the aria-label assertion.
Proves: plan.md § Components `<WeekAggregate>` (no-data state — ring track only, `—` glyph, never `0%`, never a crash; `role="img"` `aria-label="Week score: no data"`) + § Edge cases (a fully future week) — covers SPEC AC #6.
Tag: edge.

#### C-m9d-009 — success (WeekAggregate — the week score is displayed prominently as a ring + numeral)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` on the W-today week, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture (`weekScore` for this week `= (100 + 40)/2 = 70`)
**WHEN** the week aggregate display is inspected
**THEN** the aggregate is rendered **prominently above the seven day rows** as a ring + centered numeral — an SVG ring drawn with a `var(--accent)` progress arc on a `var(--card-edge)` track, with a centered numeral `"70%"` (`Math.round(weekScore)` + a `%` glyph) in the display serif at `var(--fs-32)`, `var(--ink)`; a short "Week" / "Castle score" label in `var(--font-ui)` `var(--ink-dim)` sits with the ring.
**AND** the ring is `role="img"` with `aria-label="Week score 70 percent"`; the numeral is rendered as visible text (not color-only); the ring uses only **defined** M0 tokens — there is no `var(--surface-2)` reference anywhere in the week-aggregate markup.
Proves: plan.md § Components `<WeekAggregate>` (prominent ring + centered numeral; ADR-033 score-signature identity; only defined M0 tokens — no `--surface-2`) — covers SPEC AC #5, AC #7.
Tag: success.

#### C-m9d-010 — success / edge (ViewSwitcher — Week segment now enabled, selectable, fires onSelect; Year stays disabled)

Target file: `components/ViewSwitcher.test.tsx` (EXISTS — see § Retired / amended test IDs for the `C-m9c-012` amendment)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />` with the M9d-widened props type (`view: "day" | "month" | "week"`)
**WHEN** rendered, the four segments inspected, then `Week`, then `Year` are clicked
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — inside a `role="tablist"` (`aria-label="Calendar view"`); **Day, Week, and Month** are live `role="tab"` `<button>`s (Week **no longer** carries `aria-disabled` / `disabled`); clicking `Week` calls `onSelect("week")` **exactly once**; re-rendering with `view="week"` sets the Week tab's `aria-selected="true"` and the filled-`var(--accent)` active style.
**AND** the **Year** segment is the **lone** remaining `<button disabled aria-disabled="true">` — clicking it fires `onSelect` **zero** times, causes no crash, no view change; arrow-key navigation now moves across the **three** enabled tabs (Day/Week/Month), skipping the single disabled Year tab.
Proves: plan.md § Components `<ViewSwitcher>` change (Week `live: false → true`; props widen to include `"week"`; Week selectable + fires `onSelect`; Year stays the lone disabled segment) — covers SPEC AC #8.
Tag: edge.

#### C-m9d-011 — success (ViewSwitcher — selecting Week from inside AppShell renders the Castle view)

Target file: `app/(building)/AppShell.test.tsx` (EXISTS — `week`-branch cases appended)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` payload and `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `ViewSwitcher` `Week` segment is clicked
**THEN** the Castle week view appears — the `role="list"` `aria-label="Week days"` container with seven `WeekDayCell` rows and the week aggregate ring are in the DOM; the Building (Day) view and the Kingdom (Month) grid are no longer shown; the `Week` tab shows `aria-selected="true"`.
**AND** clicking `Day` returns to the Building view and clicking `Month` shows the Kingdom grid — Day↔Week↔Month all switch correctly; clicking the `Year` segment does nothing (no crash, no view change).
Proves: plan.md § Components `<ViewSwitcher>` + § AppShell wiring (selecting Week renders `<WeekView>`; the active-view indicator updates; Year inert) — covers SPEC AC #8.
Tag: success.

#### C-m9d-012 — success (AppShell — week-view wiring, single usePersistedState preserved)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload, `vi.setSystemTime` → `"2026-05-18"`, `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush, then the view is switched Day→Week→Month→Week→Day
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across every view switch — adding the `"week"` branch does not introduce a second hydration pass and does not re-run rollover; the `view` state is `"day" | "month" | "week"` and defaults to `"day"`.
**AND** `<WeekView>` is rendered with `state={state}` and `onOpenDay={handleOpenDay}` — the **same** `AppState` object and the same day-open handler the `MonthView` branch receives; a remount (simulating a refresh) returns the view to **Day** (the `view` state is session-only React state, not persisted — no `view` field is written to `localStorage`).
Proves: plan.md § AppShell wiring (`view` widened to include `"week"`; `<WeekView state={state} onOpenDay={handleOpenDay} />` for the `"week"` branch; `usePersistedState()` still runs exactly once; `view` session-only) + § Out of scope (persisting the selected `view`) — covers SPEC AC #8, AC #13.
Tag: success.

#### C-m9d-013 — success (AppShell — Day/Month branches unchanged; week wiring is purely additive)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** the M9c `AppShell` Day↔Month behavior (`C-m9c-001`/`C-m9c-002`) and the M9d-widened `AppShell`
**WHEN** `<AppShell />` mounts and the Day and Month views are exercised exactly as the M9c tests do
**THEN** the Day view (`BuildingClient`) and the Month view (`MonthView`) render and behave **identically** to their pre-M9d behavior — widening `view` to include `"week"` and adding the `"week"` render branch is purely additive; the existing M9c `AppShell` cases (`C-m9c-001`/`C-m9c-002`) pass unchanged; no console error, no hydration-mismatch warning. This ID is the M9d no-regression anchor for `AppShell` (AC #13).
Proves: plan.md § AppShell wiring ("the existing M9c AppShell cases are unaffected — they only exercise Day/Month") + § Regression surface (`AppShell.test.tsx` — no stale assertion; the `"week"` branch is purely additive) — covers SPEC AC #13.
Tag: success.

#### C-m9d-014 — edge (WeekView — day-tap routing: today → Day view; past archived → PastDayDetail; future/pre-start → nothing)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={onOpenDay} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing W-today fixture (`history` has `"2026-05-17"`)
**WHEN** the `2026-05-18` (today) row is clicked; then the `2026-05-17` (past, archived) row is clicked; then a `future` row (`2026-05-21`) and a `pre-start` row (in a fixture with the anchor navigated to W-prestart) are clicked
**THEN** clicking **today's** row calls `onOpenDay("2026-05-18")` exactly once (which `AppShell` handles by `setView("day")` → the editable Building view — verified end-to-end in `C-m9d-011`/`E-m9d-003`); it does **not** open `PastDayDetail`.
**AND** clicking the past **archived** `2026-05-17` row opens `<PastDayDetail>` — a `role="region" aria-label="Day detail"` panel appears over the week list showing that day's blocks/bricks and score (mounted with `archivedDay={state.history["2026-05-17"]}`, `isoDate="2026-05-17"`, `onClose` — byte-identical to `MonthView`'s usage); clicking its `Close` dismisses the panel back to the week list.
**AND** clicking the `future` row and the `pre-start` row does **nothing** — no `onOpenDay` call, no `PastDayDetail` panel (those rows are non-interactive `<div>`s per `C-m9d-006`/`C-m9d-007`).
Proves: plan.md § Components `<WeekView>` (cell-tap routing — tap today → `onOpenDay`; tap past `scored` → `setOpenDate` → `PastDayDetail` reused verbatim; tap future/pre-start → no-op) + § Edge cases (tapping today / a past `scored` day / a `future` or `pre-start` day) — covers SPEC AC #10, AC #11.
Tag: edge.

### Accessibility (axe via Playwright)

`A-m9d-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9c sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9d-001 — a11y (Week view — axe clean, list semantics, keyboard, 430px)

Target file: `tests/e2e/m9d.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Week (Castle) view (under `count() > 0` guard)
**WHEN** axe-core runs against the week view
**THEN** it returns **zero** violations across all rule categories; the seven day rows live in a `role="list"` (`aria-label="Week days"`) container with each `WeekDayCell` a `role="listitem"`; tappable `scored` rows are reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carry a descriptive `aria-label` (weekday, full date, score, `", today"` when applicable); the prev/next-week buttons carry `aria-label`s and are keyboard-operable; inert `missed`/`future`/`pre-start` rows are non-focusable.
**AND** the vertical seven-row list and the centered aggregate ring render within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`); each row's hit area is ≥ 44px tall (ADR-031).
Proves: plan.md § Accessibility (`WeekView` list/listitem roles, keyboard, labels, 430px, 44px) + § Edge cases (430px viewport) — covers SPEC AC #12.
Tag: a11y.

#### A-m9d-002 — a11y (WeekAggregate ring + ViewSwitcher — axe clean, contrast, tablist keyboard)

Target file: `tests/e2e/m9d.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Week view visible with the aggregate ring and the `ViewSwitcher` (under `count() > 0` guard)
**WHEN** axe-core runs with colour-contrast rules enabled and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations — the aggregate ring is `role="img"` with an `aria-label` (`"Week score N percent"` or `"Week score: no data"`) and its numeral is rendered as visible text (not color-only); the `WeekDayCell` date/score text (`var(--ink)` over the heat fill, AA-safe at the `0.12` alpha floor) and the no-data `—` glyph + labels (`var(--ink-dim)` on `--bg`, AA) meet WCAG AA.
**AND** the `ViewSwitcher` is `role="tablist"`; Day/Week/Month are live `role="tab"` with `aria-selected`, keyboard-operable (Enter/Space activate; Left/Right arrows move across the **three** enabled tabs, skipping the disabled Year); each segment's hit area is ≥ 44px (ADR-031); the four segments fit the 430px column with no overflow.
Proves: plan.md § Accessibility (aggregate ring `role="img"` + label; heat-fill alpha-floor `0.12` AA contrast; switcher tablist/tab roles, three-tab arrow nav skipping Year, 44px) + § Decisions to honor (ADR-031, ADR-033) — covers SPEC AC #12.
Tag: a11y.

#### A-m9d-003 — a11y (PastDayDetail opened from the Week view — axe clean, keyboard operable)

Target file: `tests/e2e/m9d.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Week view with a past archived day opened so `<PastDayDetail>` is showing (under `count() > 0` guard)
**WHEN** axe-core runs against the day-detail panel
**THEN** it returns **zero** violations; the panel is `role="region"` with `aria-label="Day detail"`; the `Close` control is focusable and carries an `aria-label`; the detail is a static read-only list with no form controls (reused verbatim from M9c — no M9d edit); it renders single-column at 430px with no horizontal overflow.
Proves: plan.md § Accessibility (`PastDayDetail` reused verbatim — region role, `Close` label, static read-only, 430px) + § Decisions to honor (the read-only guarantee) — covers SPEC AC #12.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name (AC #13): switch to Week, per-day scores + the aggregate render, open a past day read-only.

#### E-m9d-001 — success (switch to Week — Castle view renders)

Target file: `tests/e2e/m9d.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Week` segment is tapped (under `count() > 0` guard)
**THEN** the Castle week view appears — a `role="list"` (`aria-label="Week days"`) of seven day rows, a week date-range label, and the prominent aggregate ring; the Building view is no longer shown; tapping `Day` returns to the Building view and tapping `Month` shows the Kingdom grid; tapping the `Year` segment does **nothing** (no crash, no view change, no error overlay).
Proves: plan.md § Components `<ViewSwitcher>`/`<WeekView>` + § AppShell wiring — covers SPEC AC #8, AC #13 (switch-to-Week E2E scenario).
Tag: success.

#### E-m9d-002 — success (per-day scores + the week aggregate render)

Target file: `tests/e2e/m9d.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` such that the current week has at least one archived `history` day scoring a known value, today's live in-progress day, and at least one in-range past missed day; the app loaded fresh at `/` and switched to Week
**WHEN** the week view is inspected (under `count() > 0` guard)
**THEN** the archived day's row shows its computed score (weekday + date + accent heat fill + numeric score), today's row shows the live in-progress score and the 2px accent ring, an in-range past never-opened day shows the distinct `missed` treatment (flat card, no numeral), and a future day is an inert row; the week aggregate ring displays the computed `weekScore` as a prominent percentage; no console error.
Proves: plan.md § Components `<WeekDayCell>`/`<WeekAggregate>` + § `weekScore` helper — covers SPEC AC #3, AC #4, AC #5, AC #7, AC #13 (per-day-scores + aggregate E2E scenario).
Tag: success.

#### E-m9d-003 — success (open a past day read-only from the Week view; prev/next nav)

Target file: `tests/e2e/m9d.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9d-002` (a hand-built v2 payload with an archived `history` day in the current week), the app at `/`, Week view shown
**WHEN** the archived past-day row is tapped, then `Close`d; then today's row is tapped; then the prev/next-week controls are used (under `count() > 0` guards)
**THEN** tapping the archived past-day row opens the read-only `PastDayDetail` panel — it shows that day's blocks/bricks and score, exposes **no** add/complete/edit affordance (only a `Close` control), and `Close` returns to the week list.
**AND** tapping **today's** row switches to the editable Building (Day) view (not the read-only detail); and tapping `Previous week` / `Next week` moves the seven-row layout, the range label, and the aggregate to the adjacent week — including across a month boundary — with no crash.
Proves: plan.md § Components `<WeekView>`/`<PastDayDetail>` (tap today → Day view; tap past archived → read-only detail; prev/next nav) — covers SPEC AC #9, AC #10, AC #13 (open-past-day-read-only E2E scenario).
Tag: success.

### Sandbox / preview note

Per the established M3–M9c pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `A-m9d-*` and 3 `E-m9d-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9c.spec.ts` / `tests/e2e/m9b.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9d-002`/`E-m9d-003` partly mitigate it by hand-building the `dharma:v1` v2 payload via `page.evaluate` (a deterministic week seed that does not depend on a brick-creation UI flow). M9d introduces no general deterministic seeding helper (out of scope per ADR-022). The 9 unit + 14 component IDs (`U-m9d-*`, `C-m9d-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the week-date math, the `weekScore` helper, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9d adds 29 new `m9d` IDs (9 U + 14 C + 3 A + 3 E) and removes none.

**Amended — sanctioned, expected M9d collateral (the Week-segment enable regression surface):** enabling the Week `ViewSwitcher` segment (AC #8) makes one M9c test ID stale. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M9c `BuildingClient` prop-lift precedent at M9c § Retired / amended test IDs; the M4d chooser-walk precedent):

- **`C-m9c-012` (`components/ViewSwitcher.test.tsx`) — the M9c test "ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled".** M9c's `C-m9c-012` asserts the **Week** and **Year** segments both render as `<button disabled aria-disabled="true">`, that clicking **Week** fires `onSelect` **zero** times, and that Week is out of the tab sequence (file lines ~65 / ~85 per the plan's § Regression surface). AC #8 of M9d **enables the Week segment** — Week now renders as a live `role="tab"` with no `aria-disabled`, is selectable, and **does** call `onSelect("week")`. Those Week-specific sub-assertions are therefore stale and **MUST be amended** by the BUILDER in the M9d dispatch. The amendment is **mechanical and assertion-preserving for everything not about Week**:
  - The "Week segment is disabled / clicking does NOT call `onSelect`" sub-assertion is **inverted** to assert Week is now a **live** tab — selectable, fires `onSelect("week")` exactly once, `aria-selected` toggles when `view="week"`. (This overlaps with M9d's own `C-m9d-010`, which is the canonical AC #8 coverage; the `C-m9c-012` amendment keeps the M9c file internally consistent.)
  - The "Week and Year rendered as disabled buttons" sub-assertion is **narrowed** to assert **only the Year** segment is the disabled `<button aria-disabled="true">`.
  - The sibling "Year segment is disabled" sub-assertion stays **valid and unchanged** — Year remains `live: false` (M9e).
  - **Every `C-m9c-012` sub-assertion not about the Week segment is preserved verbatim** — the four-segment render, the `role="tablist"`/`role="tab"` structure, the `aria-label="Calendar view"`, the `aria-selected` active-indicator behavior for Day/Month, and the Day/Month live `onSelect` calls all stay. The amendment touches only the Week-vs-Year disabled-state assertions.
- **No other M9c / M1–M9c test ID is amended or retired.** Per the M9d plan § Regression surface, the M9c `AppShell` tests (`C-m9c-001`/`C-m9c-002`) exercise only Day↔Month and never asserted Week was unreachable — widening `view` to include `"week"` is purely additive and they pass unchanged (anchored by the new `C-m9d-013`). The `ViewSwitcher` props-type widening (`"day" | "month"` → `"day" | "month" | "week"`) is source-only and breaks no test that does not also assert the old Week-disabled state.

**VERIFIER: please ratify the `C-m9c-012` amendment** as expected, sanctioned M9d collateral — the single stale-test surface of enabling the Week segment — exactly as M9c's `BuildingClient` prop-lift amendments and M4d's chooser-walk amendments were ratified. The amendment is surfaced here, not silent; it edits one existing test file (`components/ViewSwitcher.test.tsx`) and is assertion-preserving for every sub-assertion not about the Week segment's disabled state. If VERIFIER prefers, the alternative ruling is to FAIL back to PLANNER to add an explicit "amended test IDs" note to `plan.md` § Regression surface (which already flags `C-m9c-012` for VERIFIER).

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9d-01..03 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `C-m9c-012` amendment.** See § Retired / amended test IDs above — the genuine plan↔test regression surface for M9d. The M9d plan § Regression surface explicitly flags `C-m9c-012` as "sanctioned-for-amendment" and asks VERIFIER to ratify it; this entry documents the exact, assertion-preserving amendment (invert the Week sub-assertion, narrow the disabled-buttons sub-assertion to Year only). This is the M9d analogue of the M9c `BuildingClient`-refactor amendment — surfaced, not silently resolved by the BUILDER.
2. **`weekScore` returns the un-rounded average; `WeekAggregate` rounds for display.** The plan states `weekScore` returns a `number` in `[0,100]` and `WeekAggregate` displays `${Math.round(weekScore)}`. `U-m9d-008`/`U-m9d-009` therefore assert the helper's un-rounded value via `toBeCloseTo` (e.g. `50/3 ≈ 16.667`, `400/7 ≈ 57.143`), and `C-m9d-009` asserts the rounded `"70%"` at the display layer. VERIFIER may confirm rounding lives only in the component, not the helper — the plan implies this ("the centered numeral is `${Math.round(weekScore)}`") but does not state the helper is un-rounded in so many words. This is not an ambiguity that blocks the BUILDER; both readings of an exact-integer fixture (e.g. `weekScore → 70`) agree.
3. **`HeroRing` reuse vs the purpose-built ring.** The plan's baseline is a purpose-built SVG ring inside `WeekView` using only defined M0 tokens, and the BUILDER MAY instead reuse `components/HeroRing.tsx` only if doing so introduces no new `var(--surface-2)` reference. `C-m9d-009` asserts the rendered outcome (a ring + `"70%"` numeral, `role="img"`, no `--surface-2`) without pinning which implementation the BUILDER picks — either satisfies the test. VERIFIER may note this; it is a sanctioned BUILDER choice within the plan, not a gap.

No ADR is reversed: **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `weekScore` is a pure read built on `dayScore`, M9d writes no `history`, mutates no `AppState`, and bumps no schema (stays `v2`); **ADR-019** (`0=Sun…6=Sat` weekday convention) is honored by `weekDates`'s Sunday derivation, cross-checked against the M9c month grid in `U-m9d-003`; **ADR-033** (the single-% ring is the score signature) governs the `<WeekAggregate>` ring; **ADR-038** (forgiveness — missed = gray) governs the `missed` `WeekDayCell` row (`C-m9d-005`); **ADR-031** (44px touch targets) is enforced by `A-m9d-001`/`A-m9d-002` and the row/button sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9d adds 29 `m9d` test IDs (9 U + 14 C + 3 A + 3 E) and retires none; it amends `C-m9c-012` in `components/ViewSwitcher.test.tsx` as sanctioned, expected M9d collateral (VERIFIER to ratify).

### AC → test-ID coverage map (all 13 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                            | Test ID(s)                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| #1  | Week view renders a seven-day Sun→Saturday layout for the week containing a reference date (M9c Sunday-start convention)      | `U-m9d-001`, `U-m9d-002`, `U-m9d-003`, `C-m9d-001`                                             |
| #2  | View labeled with the week's date range (e.g. "May 17–23, 2026"), crossing month/year boundaries correctly                    | `U-m9d-002`, `U-m9d-003`, `C-m9d-001`, `C-m9d-003`                                             |
| #3  | Each day shows its date + a per-day score indicator, reusing the M9c cell vocabulary (archived/today/missed/future/pre-start) | `C-m9d-004`, `C-m9d-005`, `C-m9d-006`, `C-m9d-007`, `E-m9d-002`                                |
| #4  | `weekScore` helper: average of `dayScore` over in-range non-future days; missed-in-range = 0; future + pre-start excluded     | `U-m9d-004`, `U-m9d-005`, `U-m9d-007`, `U-m9d-008`, `U-m9d-009`, `E-m9d-002`                   |
| #5  | The Week view displays the week aggregate score prominently as the Castle score                                               | `C-m9d-009`, `E-m9d-002`                                                                       |
| #6  | A week with no in-range non-future days → a no-data aggregate, never `0`, never a crash                                       | `U-m9d-006`, `U-m9d-008`, `C-m9d-008`                                                          |
| #7  | Today's day contributes its live `dayPct` to the week aggregate                                                               | `U-m9d-007`, `C-m9d-009`, `E-m9d-002`                                                          |
| #8  | The Week switcher segment is now enabled; selecting it renders the Castle view; Year stays disabled                           | `C-m9d-010`, `C-m9d-011`, `C-m9d-012`, `E-m9d-001`                                             |
| #9  | Prev/next controls move the week, updating layout + range label + aggregate; nav crosses month + year boundaries              | `U-m9d-002`, `C-m9d-002`, `C-m9d-003`, `E-m9d-003`                                             |
| #10 | Tapping today's day → editable Building view; tapping a past in-range day with history → read-only `PastDayDetail`            | `C-m9d-014`, `E-m9d-003`                                                                       |
| #11 | Tapping a future day or a pre-`programStart` day does nothing                                                                 | `C-m9d-006`, `C-m9d-007`, `C-m9d-014`                                                          |
| #12 | 430px renders without overflow; axe a11y clean; week days + nav controls keyboard-operable + screen-reader-labeled            | `A-m9d-001`, `A-m9d-002`, `A-m9d-003`                                                          |
| #13 | No regression to M1–M9c; quality gates clean; E2E covers switch-to-Week / per-day-scores + aggregate / open-past-day          | **gate (`npm run eval`)** + `C-m9c-012` amendment + `C-m9d-012`/`C-m9d-013` + `E-m9d-001..003` |

**Gate-verified portion:** AC #13's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b/M9c precedent. AC #13's no-regression half is anchored by the sanctioned `C-m9c-012` amendment (the only stale-test surface) plus `C-m9d-012`/`C-m9d-013` (the `AppShell` week-branch wiring is purely additive — Day/Month behavior byte-equivalent). All other 12 ACs map to at least one bespoke `m9d` test ID; every `m9d` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** a week containing today → `U-m9d-007`/`C-m9d-014`; a fully past week → `U-m9d-009`; a fully future week → `U-m9d-006`/`C-m9d-008`; a week straddling `programStart` → `U-m9d-008`/`C-m9d-006`; a week straddling a month/year boundary → `U-m9d-002`/`U-m9d-003`/`C-m9d-003`; empty `history` first run → `U-m9d-008`; a missed day vs a 0-score archived day → `U-m9d-004`/`U-m9d-009` (both contribute `0` to the average) + `C-m9d-005` (distinct `WeekDayCell` rendering); tapping a future/pre-start/missed day → `C-m9d-006`/`C-m9d-007`/`C-m9d-014`; tapping today's day → `C-m9d-014`/`E-m9d-003`; tapping a past `scored` day → `C-m9d-014`/`E-m9d-003`; selecting the Year segment → `C-m9d-010`/`C-m9d-011`/`E-m9d-001`; prev/next week across month/year boundary → `C-m9d-003`/`E-m9d-003`; 430px → `A-m9d-001`/`A-m9d-002`/`A-m9d-003`; heat-fill alpha-floor contrast → `A-m9d-002`; reduced motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9d adds no week-slide animation; the switcher's instant-collapse transition is inherited unchanged from M9c, per the M9c precedent).
