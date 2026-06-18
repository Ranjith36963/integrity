# Changelog — M9e

## [unreleased]

### Added (M9e) — **Completes Milestone 9**

- **M9e — Year view (Empire) + the complete calendar:** a 3×4 twelve-month overview grid where
  every `MonthCell` shows that month's aggregate score as heat-fill intensity + numeral. An inline
  `YearAggregate` ring shows the year's overall score prominently. Two new pure period-aggregate
  helpers in `lib/history.ts` — `monthScore(state, year, monthIndex)` and `yearScore(state, year)`
  — follow the ADR-046 pattern (today derived from `state.currentDate`; honest-scoreboard missed=0;
  `NO_DATA` sentinel). `yearScore` averages the year's in-range non-future days directly.
  New `lib/yearGrid.ts` provides UTC-drift-free year/month date math. The ViewSwitcher **Year**
  segment is now live — **all four segments (Day/Week/Month/Year) are active; none is disabled.**
  Tapping a month cell opens the M9c Month view at that month (new optional `initialMonth` prop
  on `MonthView` + `AppShell` `monthTarget` state). M9e amended five prior-milestone test IDs
  (`C-m9c-012`, `C-m9d-010`, `A-m9d-002`, `A-m9c-002`, `C-m9d-011`) to drop now-stale
  "segment disabled / Year inert" assertions. Fifth and FINAL chunk of Milestone 9.
  1078/1078 Vitest tests across 72 files (+83 tests / +3 files vs M9d's 995/69).
  TZ-pinned suite: 11/11. 0 lint errors, 20 warnings (pre-M9e) + 1 cosmetic
  (`makeM9eDay40` unused fixture; non-blocking). `tsc --noEmit` clean.
  Closes U-m9e-001..009, C-m9e-001..012, A-m9e-001..002, E-m9e-001..003
  (a11y + E2E deferred-to-preview); amended C-m9c-012, C-m9d-010, C-m9d-011,
  A-m9d-002, A-m9c-002 for the now-live Year segment.
  **MILESTONE 9 COMPLETE — the period-scoring ladder `dayScore → weekScore → monthScore →
yearScore` is whole; the user can traverse their record at every zoom level.**
- `lib/yearGrid.ts` — new. Pure UTC-drift-free year/month date math. `yearGridMonths(year)`
  returns an array of 12 month descriptors (year + monthIndex) for the twelve calendar months
  of the given year; uses multi-arg local-time `Date` constructor throughout. `addYear` /
  `subYear` navigation helpers. Tests: U-m9e-001..003.
- `monthScore(state, year, monthIndex): number | typeof NO_DATA` in `lib/history.ts` — new
  helper. Averages the month's in-range non-future days using the honest-scoreboard rule
  (missed in-range day = 0; future + pre-`programStart` days excluded). Tests: U-m9e-004..007.
- `yearScore(state, year): number | typeof NO_DATA` in `lib/history.ts` — new helper. Averages
  the year's in-range non-future days directly (day-averaged, not month-averaged-of-months).
  Tests: U-m9e-008..009.
- `components/YearView.tsx` — new. Empire view — 3×4 twelve-month grid with per-month score
  cells (`<MonthCell>`) and an inline `YearAggregate` ring showing the year score. Prev/next
  year navigation. Tests: C-m9e-001..009, C-m9e-011..012.
- `components/MonthCell.tsx` — new. Single month cell inside `YearView` — heat-fill intensity
  by score + month name abbreviation; tappable for months with data (opens `MonthView` at that
  month); future months dimmed. Tests: C-m9e-001..009.
- `tests/e2e/m9e.spec.ts` — 3 Playwright e2e specs (deferred to preview). IDs: E-m9e-001..003.
- `tests/e2e/m9e.a11y.spec.ts` — 2 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m9e-001..002.

### Changed (M9e)

- `lib/history.ts` — extended with `monthScore()` and `yearScore()` helpers (second and third
  period aggregates after `weekScore`). Tests: U-m9e-004..009.
- `components/ViewSwitcher.tsx` — Year segment is now live (was `aria-disabled`). All four
  segments (Day/Week/Month/Year) are now active. Tests: C-m9e-010; amended C-m9c-012,
  C-m9d-010, A-m9d-002, A-m9c-002.
- `app/(building)/AppShell.tsx` — wires the Year view into its `view` state
  (`'day' | 'week' | 'month' | 'year'`); adds `monthTarget` state for the year→month tap-through;
  routes to `<YearView>` when `view === 'year'`. Tests: C-m9e-011..012; amended C-m9d-011.
- `components/MonthView.tsx` — gains an optional `initialMonth` prop so the Year view can open
  it at a specific month (year→month tap-through). Tests: C-m9e-011.
