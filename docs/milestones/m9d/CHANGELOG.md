# Changelog — M9d

## [unreleased]

### Added (M9d)

- **M9d — Week view (Castle) + period scoring:** vertical seven-day (Sun→Sat) Castle view with
  per-day scores and the first period aggregate — the week score. `weekScore(state, anchorISO)`
  in `lib/history.ts` averages the week's in-range non-future days; a day the user was in-range
  for but never opened counts as 0 (the honest-scoreboard rule); future and pre-`programStart`
  days are excluded. `lib/weekGrid.ts` provides UTC-drift-free week date math (`weekGridDays`,
  `addWeek`, `subWeek`). The ViewSwitcher **Week** segment is now live (Year stays disabled
  until M9e). Prev/next week navigation; tapping a past day reuses M9c's read-only
  `PastDayDetail`. ADR-046 records that period-aggregate helpers are pure (they derive "today"
  from `state.currentDate`, never the wall clock). Fourth of five M9 chunks. 995/995 Vitest
  tests across 69 files (+82 tests / +3 files vs M9c's 913/66). TZ-pinned suite: 11/11.
  0 lint errors, 20 warnings (16 pre-M9d + 4 new benign: vestigial `archivedButtons` in
  `tests/e2e/m9d.spec.ts:351` + 3 unused imports in M9d test files; within budget).
  `tsc --noEmit` clean. Closes U-m9d-001..009, C-m9d-001..014, A-m9d-001..003,
  E-m9d-001..003 (a11y + E2E deferred-to-preview); amended C-m9c-012 for the now-live
  Week segment. **M9e is now unblocked.**
- `lib/weekGrid.ts` — new. Pure UTC-drift-free week date math. `weekGridDays(anchorISO)`
  returns an array of 7 ISO-date strings (Sun–Sat) for the week containing the anchor;
  uses multi-arg local-time `Date` constructor throughout. `addWeek` / `subWeek` navigation
  helpers. Tests: U-m9d-001..003.
- `weekScore(state, anchorISO): number | typeof NO_DATA` in `lib/history.ts` — new helper.
  First period aggregate. Averages the week's in-range non-future days using the
  honest-scoreboard rule (missed in-range day = 0; future + pre-`programStart` days excluded).
  Tests: U-m9d-004..009.
- `components/WeekView.tsx` — new. Castle view — vertical seven-day grid with per-day score
  cells (`<WeekDayCell>`) and an inline `WeekAggregate` banner showing the week score.
  Prev/next week navigation. Tests: C-m9d-001..009, C-m9d-011..014.
- `components/WeekDayCell.tsx` — new. Single day cell inside `WeekView` — score intensity bar
  - day numeral + weekday label; tappable for past days with history (opens `PastDayDetail`);
    today is highlighted; future days dimmed. Tests: C-m9d-001..009.
- `docs/decisions.md` ADR-046 — period-aggregate helpers are pure; they derive "today" from
  `state.currentDate`, never the wall clock. All future period helpers (month/year aggregates
  in M9e) must follow this pattern.
- `tests/e2e/m9d.spec.ts` — 3 Playwright e2e specs (deferred to preview). IDs: E-m9d-001..003.
- `tests/e2e/m9d.a11y.spec.ts` — 3 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m9d-001..003.

### Changed (M9d)

- `lib/history.ts` — extended with `weekScore(state, anchorISO)` helper (first period
  aggregate). Tests: U-m9d-004..009.
- `components/ViewSwitcher.tsx` — Week segment is now live (was `aria-disabled`). Year segment
  remains disabled until M9e. Tests: C-m9d-010, amended C-m9c-012.
- `app/(building)/AppShell.tsx` — wires the Week view into its `view` state
  (`'day' | 'week' | 'month'`); routes to `<WeekView>` when `view === 'week'`. Tests:
  C-m9d-011..014.
