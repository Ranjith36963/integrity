## Milestone 9e — Year view (Empire) + the complete calendar — Tests

This entry covers M9e — the **Empire view** (the year) and the **last two period aggregates**: a 3×4 twelve-month grid, per-month scores, a prominent `yearScore` aggregate ring, prev/next-year navigation, the now-enabled **Year** switcher segment (after M9e all four of Day · Week · Month · Year are live), and a year→month tap-through that opens the M9c Month (Kingdom) view at the tapped month. It is derived from the `plan.md` M9e entry (`## Milestone 9e — Year view (Empire) + the complete calendar — Plan`). Feature slug: `m9e`. ID prefixes: `U-m9e-`, `C-m9e-`, `A-m9e-`, `E-m9e-`. M9e adds a real UI surface (two new components — `YearView` hosting an inline `YearAggregate` ring + `MonthCell` — plus the new `lib/yearGrid.ts`), so it has a full four-layer test mix — unit (pure `lib/yearGrid.ts` date math + the pure `monthScore`/`yearScore` helpers), component (`YearView`, `MonthCell`, the `YearAggregate` ring, `ViewSwitcher` all-four-live, `AppShell` year-branch + tap-through, `MonthView`'s additive `initialMonth` prop), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9e has a **large genuine unit surface** — `lib/yearGrid.ts` is pure date math (`monthDates`/`yearMonths`/`addYear`/`subYear`, called with literal integer/ISO args, no clock, no `localStorage`) and `monthScore`/`yearScore` in `lib/history.ts` are pure `(state, year[, monthIndex])` aggregators over `dayScore`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) / M9d (#13) precedent:

- **AC #12 (no regression to M1–M9d; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Year / month scores + the year aggregate / tap-a-month-opens-Month)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the **four** sanctioned amendments in § Retired / amended test IDs below — `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the complete stale-test collateral of enabling the Year segment, plus `C-m9e-009` (the `AppShell` year-branch + `monthTarget` wiring is purely additive — Day/Week/Month behavior byte-equivalent) and `C-m9e-011` (the `MonthView` `initialMonth` prop is optional — prop-omitting call sites byte-identical); the three named E2E scenarios are authored as real `test()` blocks (`E-m9e-001..003`).

All other 12 ACs map to at least one concrete bespoke `m9e` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b/M9c/M9d discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9e-004` is THE load-bearing `monthScore` correctness guard.** It asserts the **exact** numeric average for a fixture month with two archived scores `90`/`30` and **two** in-range missed days inside a four-day in-range window — `(90 + 30 + 0 + 0) / 4 = 30`, asserted `toBe(30)`, **not** `60` (the inflated `(90+30)/2` a mutant that excludes missed days would yield). A mutant that drops the missed-day `0`s from the numerator OR from the denominator fails this exact-value assertion. AC #4's honest-scoreboard rule is enforced numerically.
- **`U-m9e-007` is THE load-bearing `yearScore` correctness guard — the SG-m9e-01 numeric proof.** It pins a fixture year where **day-averaging and month-averaging give different numbers** and asserts the **day-averaged** result. The fixture has exactly one scored day in February (`dayPct 100`) and exactly two scored days in March (`dayPct 0`, `dayPct 0`), every other in-range day pre-`programStart` or future and excluded → day-averaging gives `(100 + 0 + 0) / 3 = 33.33…`; averaging the two non-null `monthScore`s (`Feb monthScore = 100`, `Mar monthScore = 0`) gives `(100 + 0) / 2 = 50`. The test asserts `yearScore` `toBeCloseTo(33.333, 2)` and **explicitly NOT `50`** — a mutant that averages the twelve `monthScore`s instead of the days fails. SG-m9e-01 is enforced numerically.
- **`U-m9e-006` (`monthScore` no-data sentinel) and `U-m9e-008` (`yearScore` no-data sentinel) assert strict `=== null`**, not falsy — a mutant returning `0` for a fully-future / fully-pre-start month or year fails, because `MonthCell`'s no-data tile (`C-m9e-005`) and `YearAggregate`'s no-data ring (`C-m9e-007`) depend on telling the `null` sentinel apart from a real `0`.
- **`U-m9e-009` (`monthScore`/`yearScore` purity + clock-independence) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts both helpers neither throw nor mutate, and that advancing the system clock (`vi.setSystemTime`) between two identical-arg calls leaves the result unchanged — both derive "today" from `state.currentDate`, never the system clock (ADR-046). A mutant that calls `new Date()` / `Date.now()` or mutates `state` fails.
- **`U-m9e-002` (UTC-drift) computes `monthDates` for known months and asserts every ISO string exactly, then re-runs under a faked negative-UTC-offset environment** (`vi.stubEnv("TZ", "America/Los_Angeles")` / the M9a `appliesOn.tz.test.ts` faked-offset pattern) — a mutant using `new Date(isoString)` (UTC midnight) drifts a day and fails the cross-environment equality. The plan's § Year/month date math forbids `new Date(isoString)`.
- **`U-m9e-003` (leap year) asserts `monthDates(2028, 1)` has length 29** — a mutant hard-coding 28 days for February, or using a wrong days-in-month technique, fails.
- **`C-m9e-004` (the no-data tile vs scored-0 tile distinctness) is a structural absence assertion** — a `score === null` `MonthCell` has **no** heat fill and **no** score numeral text node (only a `—` glyph); a `score === 0` `MonthCell` has the `0.12`-alpha accent fill **and** a numeral "0". A mutant rendering them identically fails.
- **`C-m9e-007` (no-data year aggregate) asserts a `—` em-dash glyph and NO `0` / NO `%`-of-zero** — a mutant rendering `0%` for a fully-future year fails. The ring `role="img"` `aria-label` is asserted to be `"Year score: no data"`, not `"Year score 0 percent"`.
- **`C-m9e-006` (all four switcher segments live) asserts NO segment carries `aria-disabled` / `disabled`** — a mutant that leaves Year `live: false` fails, because the assertion enumerates all four tabs and asserts none is disabled and all four fire `onSelect`.
- **`C-m9e-010` (tap-through to an out-of-range month) renders `MonthView` for a fully-future month AND a pre-`programStart` month and asserts no crash** — SG-m9e-03 is proven by an actual render, not a guarded no-op.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9e-001..009` | 9      |
| Component (Vitest + Testing Library)  | `C-m9e-001..012` | 12     |
| Accessibility (axe via Playwright)    | `A-m9e-001..002` | 2      |
| E2E (Playwright, deferred-to-preview) | `E-m9e-001..003` | 3      |
| **Total**                             |                  | **26** |

ID series start values were supplied by the orchestrator: `U-m9e-001`, `C-m9e-001`, `A-m9e-001`, `E-m9e-001`.

**Fixture dates (ISO, weekdays/lengths verified against the proleptic Gregorian calendar):**
`2026-05-01` (M9d-era **`programStart`**) · `2026-05-18` (today, per `currentDate`) · `2026-02-2x`, `2026-03-2x` (used in the SG-m9e-01 year fixture) · `2028-02-29` (leap day) — and the explicitly-overridden `programStart`/`currentDate` each fixture below names.

**The named fixtures (all pin an explicit `programStart` + `currentDate` — never the clock):**

| Fixture        | `programStart` / `currentDate`                                              | Character                                                                                                          |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **F-monthwin** | `programStart: "2026-06-08"`, `currentDate: "2026-06-11"`                   | The four-day in-range window `06-08…06-11` inside June 2026 — the load-bearing `monthScore` fixture (`U-m9e-004`). |
| **F-yearwin**  | `programStart: "2026-02-20"`, `currentDate: "2026-03-15"`                   | One scored Feb day + two scored Mar days — the SG-m9e-01 day-vs-month divergence fixture (`U-m9e-007`).            |
| **F-standing** | `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`                   | The M9d-era standing state — live in-progress day scores `dayPct === 40`; used for current-month / today-live IDs. |
| **F-firstrun** | `programStart: "2026-05-18"`, `currentDate: "2026-05-18"`, `history === {}` | First run — today is `programStart`, empty `history`, live day `dayPct === 50`.                                    |

### Unit (Vitest)

`U-m9e-001..003` exercise the pure `lib/yearGrid.ts` (no clock, no `localStorage` — called with literal integer/ISO args). `U-m9e-004..009` exercise the `monthScore` / `yearScore` helpers added to `lib/history.ts` (pure `(state, year[, monthIndex])` — no clock, no `localStorage`, driven directly).

#### U-m9e-001 — success (yearGrid module surface — monthDates / yearMonths / addYear / subYear)

Target file: `lib/yearGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `monthDates`, `yearMonths`, `addYear`, `subYear` exported from `lib/yearGrid.ts`
**WHEN** the module's exports are inspected and each is called for a known year
**THEN** `monthDates`, `yearMonths`, `addYear`, `subYear` are all `typeof === "function"`; `monthDates(2026, 0)` (January 2026, `monthIndex` 0-indexed) returns a `string[]` of **exactly length 31**, every element a zero-padded `YYYY-MM-DD` ISO string ascending by one day, first `"2026-01-01"`, last `"2026-01-31"`; `monthDates(2026, 3)` (April) has length 30; `monthDates(2026, 1)` (February 2026, non-leap) has length 28.
**AND** `yearMonths(2026)` returns **exactly 12** `{ year, monthIndex, name }` descriptors, ordered Jan→Dec — `monthIndex` `0…11`, `year` `2026` on all twelve, `name[0] === "January"` and `name[11] === "December"`; `addYear(2026) === 2027` and `subYear(2026) === 2025` (integer arithmetic, no `Date` object).
Proves: plan.md § Year/month date math (`monthDates` → in-month ISO list, correct length; `yearMonths` → twelve descriptors; `addYear`/`subYear` integer arithmetic) + § File structure (`lib/yearGrid.ts` module surface) — covers SPEC AC #1, AC #2, AC #9.
Tag: success.

#### U-m9e-002 — edge (monthDates — UTC-drift-free across timezones, mutation-resistant)

Target file: `lib/yearGrid.test.ts`
Layer: Unit
**GIVEN** `monthDates` from `lib/yearGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** `monthDates` is computed for several months in **both** environments
**THEN** in **both** environments `monthDates(2026, 0)` `toEqual` the identical 31-element array (`"2026-01-01"`…`"2026-01-31"`) and `monthDates(2026, 11)` `toEqual` the identical 31-element December array (`"2026-12-01"`…`"2026-12-31"`); every `iso` string is **byte-identical** between the two timezone runs — no day drift, no `"2026-01-00"` or `"2026-02-01"` bleed at the month edges.
**AND** there is **no** `new Date("2026-01-01")`-style ISO string-parse anywhere in `lib/yearGrid.ts` — only the multi-arg local-time constructor (`new Date(y, m, d)`, including the `new Date(year, monthIndex + 1, 0).getDate()` last-day technique); a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality.
Proves: plan.md § Year/month date math (boundary-correct `monthDates`; no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson) — covers SPEC AC #1, AC #3.
Tag: edge.

#### U-m9e-003 — edge (monthDates — leap year handled automatically)

Target file: `lib/yearGrid.test.ts`
Layer: Unit
**GIVEN** `monthDates` and `yearMonths` from `lib/yearGrid.ts`
**WHEN** `monthDates` is called for February of a leap year and a non-leap year, and the full year date list is assembled
**THEN** `monthDates(2028, 1)` (February 2028, a leap year) returns a `string[]` of **exactly length 29** — last element `"2028-02-29"`; `monthDates(2027, 1)` (February 2027, non-leap) has **length 28** — last element `"2027-02-28"`; no special-casing — the length follows `new Date(year, monthIndex + 1, 0).getDate()`.
**AND** concatenating `monthDates(2028, 0)`…`monthDates(2028, 11)` yields **366** dates for the leap year 2028 and `monthDates(2027, 0)`…`monthDates(2027, 11)` yields **365** for 2027 — the year date list `yearScore` consumes is leap-aware automatically.
Proves: plan.md § Year/month date math (leap year automatic — `monthDates(2028, 1)` is 29 days; the year list is 365/366) + § Edge cases (leap year) — covers SPEC AC #1, AC #5.
Tag: edge.

#### U-m9e-004 — success / edge (monthScore — THE honest-month-average contract, missed = 0, mutation-resistant)

Target file: `lib/history.test.ts` (EXISTS — `monthScore` cases appended; no `m9b`/`m9c`/`m9d` ID touched)
Layer: Unit
**GIVEN** `monthScore` exported from `lib/history.ts`, and the **F-monthwin** fixture `state` — `programStart: "2026-06-08"`, `currentDate: "2026-06-11"`, `history = { "2026-06-08": <ArchivedDay dayPct 90>, "2026-06-09": <ArchivedDay dayPct 30> }` — `2026-06-10` and `2026-06-11` have **no** `history` entry; the in-progress day's `dayPct` is irrelevant here because `currentDate` is `06-11` and that day is also un-archived
**WHEN** `monthScore(state, 2026, 5)` is called (June 2026, `monthIndex` 5)
**THEN** it returns the **number `30`** — `expect(monthScore(state, 2026, 5)).toBe(30)`. June's 30 dates are classified: `06-01`…`06-07` are `< programStart "2026-06-08"` → **excluded** from numerator and denominator; `06-08`/`06-09` archived → contribute `90`/`30`; `06-10`/`06-11` are in-range (`programStart ≤ d ≤ currentDate`) past/today days with no `history` entry → `dayScore` returns `NO_DATA` (or the live `dayPct` for `06-11` if the in-progress day scores — in this fixture the in-progress day scores `0`) → each contributes **`0`** and **is counted** in the denominator; `06-12`…`06-30` are `> currentDate` → future → excluded. Numerator `= 90+30+0+0 = 120`; denominator `= 4`; result `= 30`.
**AND** the value is asserted to be **`30`, NOT `60`** — `60` is the inflated `(90+30)/2` average a mutant that drops the two missed in-range days from the numerator OR denominator would produce. A mutant that excludes the missed days fails this exact assertion. This is the numeric enforcement of AC #4's honest-scoreboard rule.
Proves: plan.md § `monthScore` & `yearScore` helpers (`monthScore` — included days summed, missed-in-range `NO_DATA → 0` contribution counted in numerator AND denominator, pre-start + future excluded from both) — covers SPEC AC #4.
Tag: edge.

#### U-m9e-005 — success (monthScore — current month is partial; today's live dayPct counts)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `monthScore` from `lib/history.ts` and the **F-standing** fixture `state` — `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, the live in-progress day scoring `dayPct === 40`, `history` holding archived days for `2026-05-01`…`2026-05-17` each scoring `dayPct 70` (seventeen archived days)
**WHEN** `monthScore(state, 2026, 4)` is called (May 2026, the current month)
**THEN** it returns the **number `68.33…`** — the test asserts `toBeCloseTo(68.333, 2)`. May's days `05-01`…`05-17` are archived `70` (seventeen days); `05-18` equals `currentDate` → `dayScore` returns the **live** `dayPct === 40` (today's in-progress score, AC #7); `05-19`…`05-31` are `> currentDate` → future → excluded from numerator AND denominator. Numerator `= 70*17 + 40 = 1230`; denominator `= 18` (only the in-range non-future days); result `= 1230/18 = 68.333…`.
**AND** months after the current month return the no-data sentinel — `expect(monthScore(state, 2026, 5)).toBe(null)` (June 2026 — every day `> currentDate "2026-05-18"` → future → `denominator === 0` → `NO_DATA`). The current month averages **only** its in-range non-future days, not all 31.
Proves: plan.md § `monthScore` & `yearScore` helpers (current-month branch — averages only in-range non-future days incl. today's live `dayPct`; a fully-future month → `denominator === 0` → `NO_DATA`) + § Edge cases (current year — partial current month) — covers SPEC AC #4, AC #7.
Tag: success.

#### U-m9e-006 — edge (monthScore — no-data sentinel for fully-future / fully-pre-start months, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `monthScore` and the `NO_DATA` sentinel from `lib/history.ts`, the **F-standing** fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`)
**WHEN** `monthScore` is called for a fully-future month (`monthScore(state, 2026, 6)` — July 2026, every day `> currentDate`) and for a fully-pre-`programStart` month (`monthScore(state, 2026, 3)` — April 2026, every day `< programStart "2026-05-01"`)
**THEN** each call returns **exactly `null`** — `expect(monthScore(state, 2026, 6)).toBe(null)` and `expect(monthScore(state, 2026, 3)).toBe(null)` (strict `=== null`, NOT merely falsy, NOT `0`); `NO_DATA` is exported and `NO_DATA === null`. The denominator is `0` (no day is in-range and non-future), so `monthScore` returns the sentinel rather than dividing by zero.
**AND** `0` is **never** returned for the no-data case — `0` is reserved for "the month happened and every included day scored 0" (a distinct, truthful statement — a fully-unopened in-range past month, see `U-m9e-004`'s missed-day handling); a mutant returning `0` for an empty denominator fails the strict `toBe(null)`.
Proves: plan.md § `monthScore` & `yearScore` helpers (no-data case — `denominator === 0` → `NO_DATA`, never `0`, never a divide-by-zero crash) + § Edge cases (fully future month / month before `programStart`) — covers SPEC AC #3, AC #4.
Tag: edge.

#### U-m9e-007 — edge (yearScore — averages DAYS directly, NOT the twelve monthScores — THE SG-m9e-01 guard)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `yearScore` and `monthScore` from `lib/history.ts`, and the **F-yearwin** fixture `state` — `programStart: "2026-02-20"`, `currentDate: "2026-03-15"`, `history = { "2026-02-25": <ArchivedDay dayPct 100>, "2026-03-05": <ArchivedDay dayPct 0>, "2026-03-10": <ArchivedDay dayPct 0> }`; every other in-range day (`02-20`…`02-24`, `02-26`…`02-28`, `03-01`…`03-04`, `03-06`…`03-09`, `03-11`…`03-14`, `03-15`) is an in-range past/today day with no `history` entry — but to pin the divergence cleanly the fixture sets `history` to ALSO archive every other in-range day at `dayPct 100` so the only "low" days are the two `0`-scoring March days **and** narrows the comparison to the three named days by an explicit assertion (see below)
**WHEN** `yearScore(state, 2026)` is computed and compared against the arithmetic mean of the twelve `monthScore(state, 2026, m)` values
**THEN** for the three-named-day reading the fixture is reduced to its essentials: with only `02-25` (`100`), `03-05` (`0`), `03-10` (`0`) in-range and scored and **all other dates pre-`programStart` or future or explicitly excluded**, `yearScore` averages the three in-range non-future scored days **directly** → `(100 + 0 + 0) / 3 = 33.33…` — the test asserts `toBeCloseTo(33.333, 2)`.
**AND** the mean of the twelve `monthScore`s is **different**: `monthScore(2026, 1)` (Feb) `= 100` (its one in-range day), `monthScore(2026, 2)` (Mar) `= 0` (its two in-range days both `0`), the other ten months `= NO_DATA` → averaging the two non-null month scores gives `(100 + 0) / 2 = 50`. The test asserts `yearScore` is **`33.333`, explicitly NOT `50`** — a mutant that computes `yearScore` as the mean of the twelve (or the non-null) `monthScore`s fails. This is the numeric enforcement of SG-m9e-01: `yearScore` averages days directly (the same day-averaging `weekScore` uses), never the month aggregates.
Proves: plan.md § `monthScore` & `yearScore` helpers (`yearScore` averages `dayScore` over the year's in-range non-future days directly — NOT the mean of the twelve `monthScore`s; SG-m9e-01 RESOLVED → average days) + § Open questions for VERIFIER (SG-m9e-01) — covers SPEC AC #5.
Tag: edge.

#### U-m9e-008 — edge (yearScore — no-data sentinel + first-run single-day year, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `yearScore` and the `NO_DATA` sentinel from `lib/history.ts`, and two fixtures: (a) the **F-standing** fixture (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`); (b) the **F-firstrun** fixture (`programStart: "2026-05-18"`, `currentDate: "2026-05-18"`, `history === {}`, live in-progress day scoring `dayPct === 50`)
**WHEN** `yearScore` is called for a fully-future year and a fully-pre-start year against fixture (a), and for the current year against the first-run fixture (b)
**THEN** for (a) — `expect(yearScore(state, 2027)).toBe(null)` (every day of 2027 is `> currentDate "2026-05-18"` → future → `denominator === 0` → `NO_DATA`) and `expect(yearScore(state, 2025)).toBe(null)` (every day of 2025 is `< programStart "2026-05-01"` → pre-start → `denominator === 0` → `NO_DATA`); strict `=== null`, NOT `0`, no divide-by-zero crash.
**AND** for (b) — `yearScore(state, 2026)` returns the **number `50`** (`expect(...).toBe(50)`): in 2026 every day before `2026-05-18` is `< programStart` → excluded; `2026-05-18` equals `currentDate` → contributes the live `dayPct === 50`; every day after is future → excluded; numerator `= 50`, denominator `= 1`, result `= 50` — the first-run year reflects only the single in-range day, no crash on the empty `history` map.
Proves: plan.md § `monthScore` & `yearScore` helpers (`yearScore` no-data case — `denominator === 0` → `NO_DATA`, never `0`) + § Edge cases (fully future year; year before `programStart`; first run — only the current day counts) — covers SPEC AC #5, AC #6, AC #7.
Tag: edge.

#### U-m9e-009 — edge (monthScore / yearScore — purity, clock-independence, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the **F-standing** fixture `state`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.categories`, `state.looseBricks` — passed to both `monthScore` and `yearScore`
**WHEN** `monthScore(frozenState, 2026, 4)` and `yearScore(frozenState, 2026)` are each called twice with identical args, and the system clock is advanced (`vi.setSystemTime` to a date in a later year) **between** the two calls of each
**THEN** neither helper throws (`expect(() => monthScore(frozenState, 2026, 4)).not.toThrow()`, likewise `yearScore`) — neither writes into `state` or any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** for each helper the two calls return **deep-equal results regardless of the advanced system clock** — both derive "today" from `state.currentDate`, **never** `new Date()` / `Date.now()`; they read no clock and no `localStorage`; each is a pure function of its arguments. A mutant that reads the system clock returns a different result after the clock is advanced and fails. (ADR-046 — period aggregates are pure; "today" is `state.currentDate`.)
Proves: plan.md § `monthScore` & `yearScore` helpers (purity — both pure, "today" = `state.currentDate`, never the clock; honor ADR-046 verbatim) + § Open questions for VERIFIER item (a) + § ADR needed (ADR-046 is the heart of m9e) — covers SPEC AC #4, AC #5.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9e-001..003` cover `<YearView>` (the 3×4 grid layout, year label, prev/next nav); `C-m9e-004..005` cover `<MonthCell>` (scored / no-data / current-month, distinctness, tappability); `C-m9e-006..007` cover `<YearAggregate>` (the score ring + the no-data state) and the `<ViewSwitcher>` all-four-live state; `C-m9e-008` covers the `ViewSwitcher` round-trip; `C-m9e-009..010` cover `<AppShell>` year-branch + the year→month tap-through; `C-m9e-011` covers `<MonthView>`'s additive `initialMonth` prop; `C-m9e-012` is the no-regression anchor. All render with React Testing Library; where a clock read matters (`YearView`'s initial displayed year reads `today()`) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `<AppShell />` (which calls `usePersistedState`).

#### C-m9e-001 — success (YearView — 3×4 twelve-month grid + month-name labels + year label)

Target file: `components/YearView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the **F-standing** fixture state
**WHEN** rendered (the initial displayed year is the current year, 2026)
**THEN** exactly **twelve** `MonthCell`s render, inside a `role="list"` container (`aria-label="Months of 2026"`); each cell shows its month name — the first cell reads "January", the last "December", in calendar order; the grid wrapper carries `gridTemplateColumns: repeat(3, 1fr)` (a 3×4 layout).
**AND** the view is labeled with the displayed year — a `<h2>` (`var(--font-display)`, `var(--fs-22)`, `var(--ink)`) reading `"2026"`.
Proves: plan.md § Components `<YearView>` (twelve `<MonthCell>`s in a `role="list"` 3×4 grid; year label `<h2>`) + § File structure (`components/YearView.tsx`) — covers SPEC AC #1, AC #2.
Tag: success.

#### C-m9e-002 — success (YearView — per-month score indicator + the prominent year aggregate)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the **F-standing** fixture (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` with archived days in May scoring known values, the live in-progress day scoring `dayPct === 40`)
**WHEN** the twelve month cells and the year aggregate are inspected
**THEN** each `MonthCell` shows a score indicator reflecting that month's `monthScore` — months Jan–Apr (entirely pre-`programStart`) show the **distinct no-data treatment** (a `—` glyph, no heat fill — `monthScore === null`); May (the current month) shows a numeral + heat fill driven by `monthScore(state, 2026, 4)`; Jun–Dec (fully future) show the `—` no-data tile; the current month (May) carries the today-style `var(--accent)` accent outline.
**AND** the year aggregate is rendered **prominently** — a `YearAggregate` ring above the grid showing `Math.round(yearScore(state, 2026))` as a centered `%` numeral; today's live `dayPct` is reflected in both the May cell and the year aggregate (`YearView` passes the same live `state` to `monthScore`/`yearScore`).
Proves: plan.md § Components `<YearView>`/`<MonthCell>`/`YearAggregate` (per-month score indicator + distinct no-data treatment; the prominent year aggregate ring; current-month accent) + § Edge cases (current year — partial current month; year containing `programStart`) — covers SPEC AC #3, AC #6, AC #7.
Tag: success.

#### C-m9e-003 — success (YearView — prev/next year nav updates the 12 cells, the year label, the aggregate)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, starting on the displayed year 2026
**WHEN** the "Previous year" button is clicked once, then the "Next year" button is clicked twice
**THEN** the two nav controls are `<button>`s carrying `aria-label="Previous year"` / `"Next year"` with ≥ 44px hit areas (ADR-031); after one Previous click the year label reads `"2025"`, all twelve cells re-derive their `monthScore` for 2025 (a fully-pre-`programStart` year → all twelve are the `—` no-data tile), and the `YearAggregate` recomputes to the `—` no-data state; after two Next clicks the label reads `"2027"` and the twelve cells + aggregate recompute for 2027 (a fully-future year → all twelve `—`, aggregate `—`).
**AND** the displayed-year change is session-only React state — `setDisplayedYear((y) => subYear(y))` / `addYear(y)`; no `localStorage` write occurs on nav (asserted by a `localStorage.setItem` spy showing zero calls attributable to nav); prev/next is **instant** — no slide animation.
Proves: plan.md § Components `<YearView>` (prev/next-year buttons → `setDisplayedYear(subYear/addYear)`; the twelve cells + label + aggregate recompute; session-only displayed year; instant nav) + § Edge cases (prev/next far past `programStart` / into the future — an all-no-data year renders without crashing) — covers SPEC AC #9.
Tag: success.

#### C-m9e-004 — edge (MonthCell — scored tile: heat fill + numeral; scored-0 vs no-data distinctness, mutation-resistant)

Target file: `components/MonthCell.test.tsx` (NEW)
Layer: Component
**GIVEN** three renders — `<MonthCell year={2026} monthIndex={4} name="May" score={60} onOpen={vi.fn()} />`, `<MonthCell year={2026} monthIndex={3} name="April" score={0} onOpen={vi.fn()} />`, and `<MonthCell year={2026} monthIndex={6} name="July" score={null} onOpen={vi.fn()} />`
**WHEN** each is rendered and inspected
**THEN** the `score={60}` tile shows the month name `"May"` and a numeric score `60` (the `Math.round(score)` numeral) with the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (the M9c/M9d heat formula, asserted via inline style / a `data-score`-derived style hook); the `score={0}` tile carries the **minimum-alpha** heat fill (alpha `0.12`) **and** a visible numeral text node `"0"`.
**AND** the `score={null}` tile has **no** heat fill (flat `var(--card)` background with a 1px `var(--card-edge)` border) and **no** score numeral text node at all — only a `—` (em-dash) glyph in `var(--ink-dim)`; the `score={0}` tile and the `score={null}` tile are **structurally distinct** ("0" numeral vs "—" glyph — a mutant rendering them identically fails). All three are ≥ 44px tall (ADR-031) `<button>`s.
Proves: plan.md § Components `<MonthCell>` (scored tile — heat fill at scaled alpha + numeral; `score === 0` → `0.12` alpha + "0"; `score === null` → flat `--card` tile, no fill, `—` glyph; the two are visually distinct) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) + § Edge cases (month with 0 score vs month never opened) — covers SPEC AC #3.
Tag: edge.

#### C-m9e-005 — success (MonthCell — every cell is tappable; current-month accent outline)

Target file: `components/MonthCell.test.tsx`
Layer: Component
**GIVEN** four renders — a `scored` cell, a `score={0}` cell, a `score={null}` (no-data) cell, and a `scored` cell with `isCurrentMonth` — each with an `onOpen` spy
**WHEN** each cell is rendered, inspected, and clicked
**THEN** **every** cell — scored, scored-0, AND no-data — is a `<button>` (`getByRole("button")` succeeds for all four) and clicking it calls its `onOpen` spy **exactly once** — there are **no inert month cells** (SG-m9e-03 — the `null` vs number split is a visual distinction only, not an interactivity one).
**AND** the `isCurrentMonth` cell additionally carries a `2px solid var(--accent)` outline (`outlineOffset: 1px`) — the today-marker treatment — and its `aria-label` includes `", current month"`; each cell's `aria-label` is `"<Month> <year>, score <N> percent"` for a scored cell and `"<Month> <year>, no data"` for a `null` cell.
Proves: plan.md § Components `<MonthCell>` (every month is a tappable `<button>` — no inert cells, SG-m9e-03; `isCurrentMonth` → `2px var(--accent)` outline; `aria-label` grammar) + § Accessibility (`MonthCell` labels) — covers SPEC AC #3, AC #10.
Tag: success.

#### C-m9e-006 — edge (YearAggregate — the year score ring + the no-data em-dash state, mutation-resistant)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** two `<YearView>` renders — one navigated to a year whose `yearScore` is a known number (e.g. the current year 2026 against a fixture whose `yearScore` rounds to `72`), and one navigated to a fully-future year (`yearScore` → `NO_DATA`), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `YearAggregate` ring is inspected in each
**THEN** the scored render shows the year aggregate **prominently above the grid** as an SVG ring — a `var(--accent)` progress arc on a `var(--card-edge)` track, a centered numeral `"72%"` (`Math.round(yearScore)` + `%`) in `var(--font-display)` `var(--fs-32)` `var(--ink)`, with a `"Year"` label below in `var(--font-ui)` `var(--fs-10)` `var(--ink-dim)`; the ring is `role="img"` with `aria-label="Year score 72 percent"`.
**AND** the no-data render shows a **distinct no-data treatment** — the ring track only (no progress arc) and a `—` (em-dash) glyph in `var(--ink-dim)` in place of the numeral, the `"Year"` label still shown; there is **no** `"0%"`, **no** `"0"` numeral, and no crash (`YearView` branches on `yearScore(...) === null`); the ring's `aria-label` is `"Year score: no data"` (NOT `"Year score 0 percent"`). The ring uses only **defined** M0 tokens — there is no `var(--surface-2)` reference anywhere in the year-aggregate markup. A mutant that renders `0%` for an empty-year fails both the `—`-glyph and the aria-label assertions.
Proves: plan.md § Components `YearAggregate` (prominent ring + centered numeral; no-data state — track only, `—` glyph, never `0%`, never a crash; `role="img"` `aria-label`; only defined M0 tokens — no `--surface-2`) + § Edge cases (fully future year — aggregate is no-data, never `0`) — covers SPEC AC #6, AC #7.
Tag: edge.

#### C-m9e-007 — success / edge (ViewSwitcher — Year now enabled; ALL FOUR segments live, none disabled, mutation-resistant)

Target file: `components/ViewSwitcher.test.tsx` (EXISTS — see § Retired / amended test IDs for the `C-m9c-012` + `C-m9d-010` amendments)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />` with the M9e-widened props type (`view: "day" | "month" | "week" | "year"`)
**WHEN** rendered, all four segments inspected, then each of the four is clicked in turn, then the component is re-rendered with `view="year"`
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — in that order inside a `role="tablist"` (`aria-label="Calendar view"`); **all four** are live `role="tab"` `<button>`s — **no** segment carries `aria-disabled="true"` and **no** segment is `disabled` (a mutant leaving Year `live: false` fails this enumeration); clicking each of Day / Week / Month / Year fires `onSelect` exactly once with the matching value (`"day"` / `"week"` / `"month"` / `"year"`).
**AND** re-rendering with `view="year"` sets the Year tab's `aria-selected="true"` and the filled-`var(--accent)` active style, with the other three at `aria-selected="false"`; arrow-key navigation now moves across **all four** enabled tabs with **no skip** — no tab is out of the tab order.
Proves: plan.md § Components `<ViewSwitcher>` change (Year `live: false → true`; props widen to include `"year"`; all four segments live, none disabled; Year selectable + fires `onSelect`; four-tab arrow nav, no skip) + § Regression surface — covers SPEC AC #8, AC #11.
Tag: edge.

#### C-m9e-008 — success (ViewSwitcher inside AppShell — Day↔Week↔Month↔Year round-trip, no view leaks)

Target file: `app/(building)/AppShell.test.tsx` (EXISTS — `year`-branch + round-trip cases appended)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` payload and `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `ViewSwitcher` segments are clicked in sequence — Day → Week → Month → Year → Month → Week → Day
**THEN** selecting **Year** renders the Empire view — the `role="list"` `aria-label="Months of 2026"` container with twelve `MonthCell`s and the `YearAggregate` ring are in the DOM, and the `Year` tab shows `aria-selected="true"`; selecting each of Day / Week / Month renders **only** that view — the Building (Day) view, the seven-row Castle (Week) list, and the twelve-cell Kingdom (Month) grid each appear alone.
**AND** at every step exactly **one** view is mounted — when Year is shown the Day/Week/Month surfaces are **not** in the DOM, and vice versa; no view leaks into another; the round-trip Day→Week→Month→Year→Month→Week→Day returns to the Building view with no crash, no console error, no hydration-mismatch warning. All four zoom levels render off the **one** shared `AppState`.
Proves: plan.md § Components `<ViewSwitcher>` + § AppShell (the `"year"` branch; the switcher round-trips Day↔Week↔Month↔Year with no view leaking) — covers SPEC AC #8, AC #13.
Tag: success.

#### C-m9e-009 — success (AppShell — year-branch + monthTarget wiring; single usePersistedState preserved)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload, `vi.setSystemTime` → `"2026-05-18"`, `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush, then the view is switched Day→Year→Month→Year→Day
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across every view switch — adding the `"year"` branch and the `monthTarget` state does not introduce a second hydration pass and does not re-run rollover; the `view` state is `"day" | "month" | "week" | "year"` and defaults to `"day"`; `<YearView>` is rendered with `state={state}` and `onOpenMonth={handleOpenMonth}` — the **same** `AppState` object the other view branches receive.
**AND** selecting Month / Week / Day / Year **via the `ViewSwitcher`** clears `monthTarget` to `null` (verified: a direct Month-view visit after a switcher selection shows today's month, not a stale tapped month); a remount (simulating a refresh) returns the view to **Day** (the `view` state is session-only React state — no `view` field is written to `localStorage`).
Proves: plan.md § Components `<AppShell>` + § The year→month tap-through (`view` widened to include `"year"`; `<YearView state={state} onOpenMonth={handleOpenMonth} />`; `monthTarget` state; `handleSelectView` clears `monthTarget`; `usePersistedState()` still runs exactly once; `view` session-only) + § Regression surface (`AppShell.test.tsx` — purely additive) — covers SPEC AC #8, AC #12, AC #13.
Tag: success.

#### C-m9e-010 — edge (AppShell — year→month tap-through opens MonthView at the tapped month, incl. out-of-range months, mutation-resistant)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload (`programStart: "2026-05-01"`), `vi.setSystemTime` → `"2026-05-18"`, switched to the Year view
**WHEN** an in-range past month cell (March 2026), then — after returning to Year — a fully-future month cell (October 2026), then a pre-`programStart` month cell (January 2026) are each tapped
**THEN** tapping the March cell switches to the Month (Kingdom) view and `<MonthView>` renders **March 2026** — its month label reads "March 2026", not today's month (May) — `AppShell`'s `handleOpenMonth` set `monthTarget` to `{ year: 2026, month: 2 }`, `MonthView` received it via `initialMonth`, and the `monthTarget`-derived `key` remounted `MonthView` so its `useState` initializer re-ran.
**AND** tapping the fully-future October cell opens the Month view at **October 2026** and tapping the pre-`programStart` January cell opens it at **January 2026** — both render **without crashing** (SG-m9e-03 — every month is tappable, including out-of-range; `MonthView`'s existing `DayCell` classification handles future / pre-start / blank days); tapping a _different_ month after the first re-seeds `MonthView` (the `key` changes) rather than showing the stale earlier month.
Proves: plan.md § The year→month tap-through (`YearView`'s `onOpenMonth` → `handleOpenMonth` sets `monthTarget` + `setView("month")`; `MonthView` receives `initialMonth`; the `monthTarget`-derived `key` remounts `MonthView`; tapping ANY month — incl. future + pre-start — opens the Month view) + § Open questions for VERIFIER (SG-m9e-03 RESOLVED) — covers SPEC AC #10.
Tag: edge.

#### C-m9e-011 — success (MonthView — the additive initialMonth prop; omitting it is byte-identical to M9c)

Target file: `components/MonthView.test.tsx` (EXISTS — `initialMonth` cases appended; no `m9c` ID touched)
Layer: Component
**GIVEN** two `<MonthView>` renders — one **with** `initialMonth={{ year: 2026, month: 2 }}` (March 2026) and one **without** the prop — `vi.setSystemTime` → `"2026-05-18"`, the same fixture state
**WHEN** each is rendered, then prev/next-month nav is exercised on the `initialMonth` render
**THEN** the render **with** `initialMonth` shows **March 2026** as its initial displayed month (the month label reads "March 2026") — `displayed` initialized from `initialMonth` instead of `today()`; the render **without** the prop shows **May 2026** (today's month) — behavior **byte-identical** to M9c (the `useState` initializer falls back to `{ year: todayYear, month: todayMonth }`).
**AND** on the `initialMonth` render, clicking "Next month" moves to April 2026 and "Previous month" back — the prop only **seeds** the initial value; prev/next still mutate `displayed` freely afterward; every existing M9c `MonthView` test (which omits `initialMonth`) passes unchanged.
Proves: plan.md § Components `<MonthView>` + § The year→month tap-through (`initialMonth?` optional prop — `displayed` initializer becomes `initialMonth ?? { year: todayYear, month: todayMonth }`; omitting it is byte-identical; prev/next still free afterward) + § Regression surface (`MonthView.test.tsx` — additive only) — covers SPEC AC #10, AC #12.
Tag: success.

#### C-m9e-012 — success (AppShell / M9c-M9d views — Day/Week/Month branches unchanged; year wiring is purely additive)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** the M9c/M9d `AppShell` Day↔Week↔Month behavior (`C-m9c-001`/`C-m9c-002`, `C-m9d-011`/`C-m9d-012`/`C-m9d-013`) and the M9e-widened `AppShell`
**WHEN** `<AppShell />` mounts and the Day, Week, and Month views are exercised exactly as the M9c/M9d tests do
**THEN** the Day view (`BuildingClient`), the Week view (`WeekView`), and the Month view (`MonthView`) render and behave **identically** to their pre-M9e behavior — widening `view` to include `"year"`, adding the `"year"` render branch, and adding `monthTarget` are purely additive; the existing M9c/M9d `AppShell` cases pass unchanged; no console error, no hydration-mismatch warning.
**AND** the `MonthView` reached via the `ViewSwitcher` `Month` segment (not a month tap) gets `monthTarget === null` → `initialMonth` undefined → falls back to today's month — M9c Month-view behavior is byte-identical for the direct-switcher path. This ID is the M9e no-regression anchor for `AppShell` (AC #12).
Proves: plan.md § Regression surface (`AppShell.test.tsx` — no stale assertion; the `"year"` branch + `monthTarget` are purely additive; the direct-switcher Month path is unchanged) + § The year→month tap-through (a Month view reached directly via the switcher gets `monthTarget === null` → today's month) — covers SPEC AC #12, AC #13.
Tag: success.

### Accessibility (axe via Playwright)

`A-m9e-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9d sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9e-001 — a11y (Year view — axe clean, grid/list semantics, keyboard, 430px)

Target file: `tests/e2e/m9e.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Year (Empire) view (under `count() > 0` guard)
**WHEN** axe-core runs against the year view
**THEN** it returns **zero** violations across all rule categories; the twelve month cells live in a `role="list"` (`aria-label="Months of <year>"`) container, each `MonthCell` reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carrying a descriptive `aria-label` (`"<Month> <year>, score <N> percent"` / `"<Month> <year>, no data"`, `", current month"` when applicable); the prev/next-year buttons carry `aria-label`s (`"Previous year"` / `"Next year"`) and are keyboard-operable.
**AND** the 3×4 month grid (`repeat(3, 1fr)`) and the centered `YearAggregate` ring render within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`); each cell's hit area is ≥ 44px (ADR-031).
Proves: plan.md § Accessibility (`YearView` list role, `MonthCell` keyboard + labels, prev/next labels, 3×4 grid at 430px no overflow, 44px) + § Edge cases (430px viewport) — covers SPEC AC #11.
Tag: a11y.

#### A-m9e-002 — a11y (YearAggregate ring + ViewSwitcher all-four-live — axe clean, contrast, four-tab keyboard)

Target file: `tests/e2e/m9e.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Year view visible with the `YearAggregate` ring and the `ViewSwitcher` (under `count() > 0` guard)
**WHEN** axe-core runs with colour-contrast rules enabled and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations — the `YearAggregate` ring is `role="img"` with an `aria-label` (`"Year score N percent"` or `"Year score: no data"`) and its numeral is rendered as visible text (not color-only); the `MonthCell` name/numeral text (`var(--ink)` over the heat fill, AA-safe at the `0.12` alpha floor) and the no-data `—` glyph + labels (`var(--ink-dim)` on `--bg`/`--card`, AA) meet WCAG AA; the ring uses only **defined** M0 tokens (no `var(--surface-2)`).
**AND** the `ViewSwitcher` is `role="tablist"`; **all four** segments — Day, Week, Month, Year — are live `role="tab"` with `aria-selected`, keyboard-operable (Enter/Space activate; Left/Right arrows move across **all four** enabled tabs with **no skip** — no disabled tab to skip anymore); each segment's hit area is ≥ 44px (ADR-031); the four segments fit the 430px column with no overflow.
Proves: plan.md § Accessibility (`YearAggregate` ring `role="img"` + label; heat-fill alpha-floor `0.12` AA contrast; switcher tablist/tab roles, four-tab arrow nav no skip, 44px) + § Decisions to honor (ADR-031, ADR-033) — covers SPEC AC #11.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name (AC #12): switch to Year, month scores + the year aggregate render, tap a month to open the Month view.

#### E-m9e-001 — success (switch to Year — Empire view renders; all four segments live)

Target file: `tests/e2e/m9e.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Year` segment is tapped (under `count() > 0` guard)
**THEN** the Empire year view appears — a `role="list"` (`aria-label="Months of <year>"`) of twelve month cells, a year label, and the prominent `YearAggregate` ring; the Building view is no longer shown; tapping `Day` / `Week` / `Month` switches to each of those views — all four of Day · Week · Month · Year are reachable, **none** disabled, with no crash, no error overlay.
Proves: plan.md § Components `<ViewSwitcher>`/`<YearView>` + § AppShell — covers SPEC AC #8, AC #12 (switch-to-Year E2E scenario), AC #13.
Tag: success.

#### E-m9e-002 — success (month scores + the year aggregate render)

Target file: `tests/e2e/m9e.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` such that the displayed year has at least one fully-past month with archived `history` days scoring known values, the current month (partial), and at least one fully-future month; the app loaded fresh at `/` and switched to Year
**WHEN** the year view is inspected (under `count() > 0` guard)
**THEN** the fully-past month cell shows its computed `monthScore` (month name + heat fill + numeral), the current month cell shows a number reflecting its in-range non-future days incl. today's live score and carries the accent outline, a fully-future month cell shows the distinct `—` no-data tile (no numeral, no heat fill), and the `YearAggregate` ring displays the computed `yearScore` as a prominent percentage; prev/next-year nav moves the twelve cells + year label + aggregate to the adjacent year; no console error.
Proves: plan.md § Components `<MonthCell>`/`YearAggregate` + § `monthScore` & `yearScore` helpers — covers SPEC AC #3, AC #4, AC #5, AC #6, AC #7, AC #9, AC #12 (month-scores + year-aggregate E2E scenario).
Tag: success.

#### E-m9e-003 — success (tap a month → the M9c Month view opens at that month)

Target file: `tests/e2e/m9e.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9e-002` (a hand-built v2 payload), the app at `/`, the Year view shown
**WHEN** a fully-past month cell is tapped; then — after returning to Year — a fully-future month cell is tapped
**THEN** tapping the past month cell switches to the M9c Month (Kingdom) view rendering **that month** — the month label names the tapped month (not today's month), the month grid shows that month's days per M9c behavior; tapping the fully-future month cell opens the Month view at that future month and it renders correctly (empty/future days) with no crash.
**AND** returning to the Year view and selecting the `Month` segment directly via the `ViewSwitcher` shows today's month (not the stale tapped month) — the `monthTarget` reset on switcher selection works end-to-end.
Proves: plan.md § The year→month tap-through (tapping a month opens the M9c Month view at that month, incl. future months; `monthTarget` reset on switcher select) — covers SPEC AC #10, AC #12 (tap-a-month E2E scenario), AC #13.
Tag: success.

### Sandbox / preview note

Per the established M3–M9d pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 2 `A-m9e-*` and 3 `E-m9e-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9d.spec.ts` / `tests/e2e/m9c.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9e-002`/`E-m9e-003` partly mitigate it by hand-building the `dharma:v1` v2 payload via `page.evaluate` (a deterministic year seed that does not depend on a brick-creation UI flow). M9e introduces no general deterministic seeding helper (out of scope per ADR-022). The 9 unit + 12 component IDs (`U-m9e-*`, `C-m9e-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the year/month date math, the `monthScore`/`yearScore` helpers, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9e adds 26 new `m9e` IDs (9 U + 12 C + 2 A + 3 E) and removes none.

**Amended — sanctioned, expected M9e collateral (the Year-segment enable regression surface):** enabling the Year `ViewSwitcher` segment (AC #8) makes the Year-disabled sub-assertions in `components/ViewSwitcher.test.tsx` stale. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M9d `C-m9c-012` Week-enable precedent at M9d § Retired / amended test IDs; the M9c `BuildingClient` prop-lift precedent; the M4d chooser-walk precedent). **Two existing test IDs** carry stale Year-disabled sub-assertions and **MUST be amended** by the BUILDER in the M9e dispatch:

- **`C-m9c-012` (`components/ViewSwitcher.test.tsx`) — the `describe` block "ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled".** Two of its sub-tests assert the **Year** segment is disabled:
  - the sub-test **`it("Year segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect")`** (file lines ~91–99) — asserts `yearTab` has `aria-disabled="true"` and that clicking it does not call `onSelect`. AC #8 of M9e **enables Year** — this assertion is now false.
  - the sub-test **`it("only the Year tab is rendered as a disabled button (no crash)")`** (file lines ~102–109) — asserts `yearTab` is `toBeDisabled()`. After M9e **no** segment is disabled — this assertion is now false.
    Both sub-tests **MUST be amended**: the disabled-assertions are **inverted** to assert Year is now a **live** tab — selectable, fires `onSelect("year")` exactly once, `aria-selected` toggles when `view="year"`, not `disabled`, no `aria-disabled`. (This overlaps with M9e's own `C-m9e-007`, the canonical AC #8 coverage; the `C-m9c-012` amendment keeps the M9c file internally consistent.) **Every `C-m9c-012` sub-assertion not about the Year segment's disabled state is preserved verbatim** — the four-segment render, the `role="tablist"`/`role="tab"` structure, the `aria-label="Calendar view"`, the `aria-selected` active-indicator behavior for Day/Month, the Day/Month/Week live `onSelect` calls (the M9d-amended Week sub-tests) all stay.
- **`C-m9d-010` (`components/ViewSwitcher.test.tsx`) — the `describe` block "ViewSwitcher — Week segment enabled, selectable, fires onSelect; Year stays disabled".** Its sub-test **`it("Year is the lone remaining disabled button — clicking it fires onSelect zero times")`** (file lines ~160–169) asserts `yearTab` is `toBeDisabled()`, has `aria-disabled="true"`, and that clicking it fires `onSelect` zero times. AC #8 of M9e enables Year — this sub-test is now false and **MUST be amended**: inverted to assert Year is a live tab — `not.toBeDisabled()`, no `aria-disabled`, clicking it fires `onSelect("year")` exactly once. The `describe` block title's "; Year stays disabled" clause is correspondingly amended to "; Year now enabled" (cosmetic — the block's other sub-tests, all about Week being live, are preserved verbatim). With this amendment `C-m9d-010` becomes a four-segments-all-live assertion — consistent with `C-m9e-007`.
- **A11y / keyboard-nav skip-assertions:** any M9c/M9d sub-assertion that arrow-key navigation **skips a disabled tab** (Year) or that a disabled tab is **out of the tab order** is stale — after M9e all four tabs are in the tab order and arrow-nav crosses all four with no skip. In `ViewSwitcher.test.tsx` the skip language lives inside the `C-m9d-010` block's prose (it asserts Week being live while Year stays disabled); amending `C-m9d-010` as above removes the stale skip implication. The `A-m9d-002` a11y spec asserts "Left/Right arrows move across the **three** enabled tabs, skipping the disabled Year" — that sentence is stale; `A-m9d-002` is **amended** to "move across **all four** enabled tabs with no skip". These are mechanical, assertion-preserving edits — no a11y rule coverage is lost.
- **`A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the `test()` titled "ViewSwitcher is axe-clean, tablist aria-label, Day/Month tabs aria-selected, Week/Year aria-disabled".** This M9c a11y test carries **two** stale `aria-disabled` sub-assertions and **MUST be amended** by the BUILDER in the M9e dispatch — note one of the two has been stale since **M9d** (the M9d `A-m9d-002` amendment enabled Week but never propagated the fix back to this `A-m9c-002` test; both bad assertions sit in one test body, so they are cleaned up together here):
  - the **line 192** assertion `await expect(yearTab).toHaveAttribute("aria-disabled", "true")` (Year tab) — **stale as of M9e**: AC #8 enables the Year segment, so after M9e the Year tab carries no `aria-disabled`. This assertion is **inverted** to assert the **Year** tab is **NOT** `aria-disabled` — `expect(await yearTab.getAttribute("aria-disabled")).toBeNull()` (the live-tab form, matching the existing Month-tab sub-assertion at line ~198).
  - the **line 189** assertion `await expect(weekTab).toHaveAttribute("aria-disabled", "true")` (Week tab) — **stale since M9d** (Week went live in M9d): this assertion is **inverted** to assert the **Week** tab is **NOT** `aria-disabled` — `expect(await weekTab.getAttribute("aria-disabled")).toBeNull()` — correcting M9d's missed propagation.
  - the test **title's "Week/Year aria-disabled" clause** is amended to reflect all four tabs being live (e.g. "…Day/Month tabs aria-selected, all four tabs live").
  - **Every non-disabled-state sub-assertion in this test is preserved verbatim** — the axe-clean `expect(results.violations).toHaveLength(0)`, the tablist `aria-label` ("Calendar view"), the four-tabs-present `count() === 4`, the Day tab `aria-selected="true"`, the existing Month tab `aria-disabled` null check, the ≥ 44px hit-area / `boundingBox` check, and the no-overflow (`scrollWidth <= clientWidth`) check all stay unchanged. This is a mechanical, assertion-preserving edit — no a11y rule coverage is lost.
- **No other M1–M9d test ID is amended or retired.** The M9c/M9d `AppShell` tests exercise Day/Week/Month switching and never asserted Year was unreachable or that `view` cannot be `"year"` — widening `view` to include `"year"`, adding the `"year"` branch, and adding `monthTarget` are purely additive (anchored by the new `C-m9e-009`/`C-m9e-012`). The `MonthView` `initialMonth` prop is optional — every M9c test that omits it is byte-identical (anchored by `C-m9e-011`). The `ViewSwitcher` props-type widening (`… | "year"`) is source-only and breaks no test that does not also assert the old Year-disabled state.

**VERIFIER: please ratify the `C-m9c-012` + `C-m9d-010` + `A-m9c-002` amendments (and the `A-m9d-002` skip-language amendment)** as expected, sanctioned M9e collateral — the last switcher-enable in Milestone 9, exactly as M9d's `C-m9c-012` Week-enable was ratified and M9c's `BuildingClient` prop-lift amendments were ratified. The amendments are surfaced here, not silent. The **complete** stale-test collateral of enabling the Year segment is **four test IDs across three files**: `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — note `A-m9c-002` additionally carries one assertion stale since **M9d** (the Week tab), which this amendment also corrects. Every amendment is assertion-preserving for every sub-assertion not about a tab's disabled state. If VERIFIER prefers, the alternative ruling is to FAIL back to PLANNER to add an explicit amended-test-IDs note to `plan.md` § Regression surface (which already flags the `ViewSwitcher` Year-disabled tests as sanctioned-for-amendment).

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9e-01..03 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `C-m9c-012` + `C-m9d-010` + `A-m9c-002` + `A-m9d-002` amendments.** See § Retired / amended test IDs above — the genuine plan↔test regression surface for M9e. The **complete** stale-test collateral of enabling the Year segment is **four test IDs across three files**: `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`). The M9e plan § Regression surface explicitly flags the `ViewSwitcher` Year-disabled tests as "sanctioned-for-amendment" and asks VERIFIER to ratify them; this entry documents the exact, assertion-preserving amendment (invert the Year sub-assertions in both `describe` blocks; invert the Year and Week `aria-disabled` sub-assertions at lines 192/189 of `A-m9c-002`; amend the `A-m9d-002` skip language). Note `A-m9c-002`'s Week-tab `aria-disabled` assertion (line 189) was already stale since **M9d** — M9d's `A-m9d-002` amendment never propagated to it; M9e corrects it here. This is the M9e analogue of the M9d `C-m9c-012` Week-enable amendment — surfaced, not silently resolved by the BUILDER.
2. **`monthScore`/`yearScore` return the un-rounded average; `MonthCell`/`YearAggregate` round for display.** The plan states `monthScore`/`yearScore` return a `number` in `[0,100]` and the display components show `Math.round(...)`. `U-m9e-005`/`U-m9e-007` therefore assert the helpers' un-rounded value via `toBeCloseTo` (e.g. `1230/18 ≈ 68.333`, `100/3 ≈ 33.333`), and `C-m9e-002`/`C-m9e-006` assert the rounded percentage at the display layer. VERIFIER may confirm rounding lives only in the components, not the helpers — the plan implies this (the `MonthCell` numeral is `Math.round(score)`) but does not state the helpers are un-rounded in so many words. This is not an ambiguity that blocks the BUILDER; both readings of an exact-integer fixture (e.g. `monthScore → 30`) agree.
3. **`yearScore` may diverge from the mean of the twelve `monthScore`s — by design (SG-m9e-01).** The plan resolves SG-m9e-01 in favor of day-averaging; `U-m9e-007` pins a fixture where the two aggregations give different numbers (`33.333` day-averaged vs `50` month-averaged) and asserts the day-averaged value. VERIFIER ratifies that this divergence is correct and expected — the Year view shows `monthScore` per cell + `yearScore` as the aggregate without any requirement that they reconcile (the same reasoning ADR-046 applied to `weekScore`). Not a gap — a sanctioned consequence the plan names explicitly.
4. **`WeekAggregate` reuse for the `YearAggregate` ring.** The plan's baseline is the BUILDER copying M9d's proven `WeekAggregate` ring shape into an inline `YearAggregate` (changing only the label `"Week"→"Year"` and the `aria-label` prefix), with a shared extracted `<ScoreRing>` an _optional_ Refactor-step move. `C-m9e-006` asserts the rendered outcome (a ring + `"N%"` numeral, `role="img"`, no `--surface-2`) without pinning which implementation the BUILDER picks — either satisfies the test. Likewise, if the BUILDER extracts a shared `averageDays(state, dates)` helper for `weekScore`/`monthScore`/`yearScore`, the M9d `weekScore` tests (`U-m9d-004..009`) are the byte-identical-behavior guard — VERIFIER may note this, it is a sanctioned BUILDER choice within the plan, not a gap.

No ADR is reversed: **ADR-046** (period-aggregate helpers are pure; "today" is `state.currentDate`, never the clock; missed-in-range = 0; `NO_DATA` sentinel; UTC-drift-free date math) is the **heart of m9e** — `monthScore`/`yearScore` inherit its contract verbatim, enforced by `U-m9e-004`/`U-m9e-006`/`U-m9e-008`/`U-m9e-009`; **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `monthScore`/`yearScore` are pure reads built on `dayScore`, M9e writes no `history`, mutates no `AppState`, bumps no schema (stays `v2`); **ADR-019** (`0=Sun…6=Sat` weekday convention) is inherited via the M9c `monthGrid.ts` the tapped Month view reuses; **ADR-033** (the single-% ring is the score signature) governs the `<YearAggregate>` ring; **ADR-038** (forgiveness — missed = gray) governs the no-data `MonthCell` tile; **ADR-031** (44px touch targets) is enforced by `A-m9e-001`/`A-m9e-002` and the cell/button sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9e adds 26 `m9e` test IDs (9 U + 12 C + 2 A + 3 E) and retires none; it amends four existing test IDs across three files as sanctioned, expected M9e collateral (VERIFIER to ratify) — `C-m9c-012` and `C-m9d-010` in `components/ViewSwitcher.test.tsx`, the skip-language in `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and the stale Week/Year `aria-disabled` assertions (lines 189/192) in `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`). With m9e, **Milestone 9 — the calendar — is complete: all four switcher views (Day · Week · Month · Year) are live.**

### AC → test-ID coverage map (all 13 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                          | Test ID(s)                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Year view renders a twelve-month overview — twelve month cells, each labeled with its month name                            | `U-m9e-001`, `U-m9e-002`, `U-m9e-003`, `C-m9e-001`                                                                                              |
| #2  | The view is labeled with the displayed year                                                                                 | `U-m9e-001`, `C-m9e-001`, `C-m9e-003`                                                                                                           |
| #3  | Each month cell shows a score indicator; a distinct no-data treatment for months with no in-range non-future days           | `U-m9e-006`, `C-m9e-002`, `C-m9e-004`, `C-m9e-005`, `E-m9e-002`                                                                                 |
| #4  | `monthScore` — avg of `dayScore` over in-range non-future days; missed-in-range = 0; future + pre-start excluded; pure      | `U-m9e-004`, `U-m9e-005`, `U-m9e-006`, `U-m9e-009`, `E-m9e-002`                                                                                 |
| #5  | `yearScore` — avg of `dayScore` over the year's in-range non-future days directly (not the twelve `monthScore`s); same rule | `U-m9e-003`, `U-m9e-007`, `U-m9e-008`, `U-m9e-009`, `E-m9e-002`                                                                                 |
| #6  | The Year view displays the year aggregate prominently; a no-qualifying-day year → no-data state, never `0`, never a crash   | `U-m9e-008`, `C-m9e-006`, `E-m9e-002`                                                                                                           |
| #7  | The current month's cell AND the year aggregate both include today's live `dayPct`                                          | `U-m9e-005`, `U-m9e-008`, `C-m9e-002`, `C-m9e-006`, `E-m9e-002`                                                                                 |
| #8  | The Year switcher segment is enabled; selecting it renders the Empire view; all four segments live, none disabled           | `C-m9e-007`, `C-m9e-008`, `C-m9e-009`, `E-m9e-001`                                                                                              |
| #9  | Prev/next controls move the Year view, updating the twelve cells + year label + aggregate                                   | `U-m9e-001`, `C-m9e-003`, `E-m9e-002`                                                                                                           |
| #10 | Tapping a month cell opens the M9c Month view at that month (incl. empty/future/pre-start months)                           | `C-m9e-005`, `C-m9e-010`, `C-m9e-011`, `E-m9e-003`                                                                                              |
| #11 | 430px renders the twelve-month grid without overflow; axe a11y clean; cells + nav keyboard-operable + screen-reader-labeled | `C-m9e-007`, `A-m9e-001`, `A-m9e-002`                                                                                                           |
| #12 | No regression to M1–M9d; quality gates clean; E2E covers switch-to-Year / month scores + year aggregate / tap-a-month       | **gate (`npm run eval`)** + `C-m9c-012`/`C-m9d-010`/`A-m9c-002`/`A-m9d-002` amendments + `C-m9e-009`/`C-m9e-011`/`C-m9e-012` + `E-m9e-001..003` |
| #13 | The switcher round-trips Day↔Week↔Month↔Year, all rendering off the one shared `AppState`, no view leaking into another     | `C-m9e-008`, `C-m9e-009`, `E-m9e-001`, `E-m9e-003`                                                                                              |

**Gate-verified portion:** AC #12's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b/M9c/M9d precedent. AC #12's no-regression half is anchored by the four sanctioned amendments `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`) + `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`) + `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the complete stale-test surface of enabling the Year segment — plus `C-m9e-009`/`C-m9e-011`/`C-m9e-012` (the `AppShell` year-branch + `monthTarget` wiring and the `MonthView` `initialMonth` prop are purely additive — Day/Week/Month behavior byte-equivalent). All other 12 ACs map to at least one bespoke `m9e` test ID; every `m9e` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** current year — partial current month → `U-m9e-005`/`C-m9e-002`; fully past year → `U-m9e-005` (its current-month + fully-past-month branches)/`E-m9e-002`; fully future year → `U-m9e-006`/`U-m9e-008`/`C-m9e-003`/`C-m9e-006`; year containing `programStart` → `U-m9e-006`/`U-m9e-007`/`C-m9e-002`; first run (empty `history`) → `U-m9e-008`; month with 0 score vs month never opened → `U-m9e-004` (missed-in-range = 0 → a low/0 _number_, not `null`)/`C-m9e-004` (the "0" numeral vs "—" glyph distinctness); prev/next far past `programStart` or far into the future → `C-m9e-003`; leap year → `U-m9e-003`; tapping a future / pre-start month → `C-m9e-010`/`E-m9e-003`; 430px → `A-m9e-001`/`A-m9e-002`; heat-fill alpha-floor contrast → `A-m9e-002`; reduced motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9e adds no year-slide animation; prev/next year is instant, per the M9c/M9d precedent); `monthScore`/`yearScore` purity under an advanced clock → `U-m9e-009` (ADR-046).
