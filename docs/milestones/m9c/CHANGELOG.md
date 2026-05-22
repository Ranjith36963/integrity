# Changelog — M9c

## [unreleased]

### Added (M9c)

- **M9c — Month view (Kingdom) + view switcher:** Apple/Google-Calendar-style calendar-month
  grid where every day cell shows that day's score as heat-fill intensity + numeral. New
  Day/Week/Month/Year segmented view switcher — Day and Month are live; Week and Year are
  present but disabled until M9d/M9e. Prev/next month navigation with `<` / `>` controls.
  Tapping today's cell opens the editable Building view; tapping a past day with history opens
  a read-only `PastDayDetail`. New `app/(building)/AppShell.tsx` owns the in-app `view` state
  and calls `usePersistedState` exactly once; `BuildingClient` was refactored to receive
  `state`/`dispatch` as props (prop-drilled; no duplication of the hook). New
  `lib/monthGrid.ts` provides UTC-drift-free month date math (`monthGridCells`, `addMonth`,
  `subMonth`). `dayScore(state, isoDate)` helper + `NO_DATA` sentinel added to
  `lib/history.ts` — day scores are computed from archived history, never stored separately.
  Third of five M9 chunks. 913/913 Vitest tests across 66 files (+107 tests / +6 files vs
  M9b's 806/60). TZ-pinned suite: 11/11. 0 lint errors, 16 warnings (3 new benign
  unused-import warnings in M9c test files; within budget). `tsc --noEmit` clean. Closes
  U-m9c-001..012, C-m9c-001..016, A-m9c-001..004, E-m9c-001..003 (a11y + E2E
  deferred-to-preview). **M9d is now unblocked.**
- `app/(building)/AppShell.tsx` — new. Top-level shell that owns `view` state
  (`'day' | 'month'`) and renders either `<BuildingClient>` or `<MonthView>`. Calls
  `usePersistedState` once; passes `state`/`dispatch` to both children. Tests: C-m9c-001..002,
  C-m9c-013.
- `components/MonthView.tsx` + `DayCell` sub-component — new. Calendar-month grid with
  heat-fill day cells. `DayCell` renders score intensity + ISO-date numeral; today is
  highlighted; future days are dimmed. Tests: C-m9c-003..011, C-m9c-016.
- `components/ViewSwitcher.tsx` — new. Day/Week/Month/Year segmented control using
  `role="tablist"`. Week and Year tabs are `aria-disabled`; all four tabs are keyboard
  reachable. Tests: C-m9c-012.
- `components/PastDayDetail.tsx` — new. Read-only detail sheet rendered when the user taps a
  past day cell that has archived history. Displays the archived day's blocks + bricks in a
  non-interactive layout. Tests: C-m9c-014..015.
- `lib/monthGrid.ts` — new. Pure UTC-drift-free month date math. `monthGridCells(year, month)`
  returns a 6×7 grid of ISO-date strings (leading/trailing cells from adjacent months padded);
  uses multi-arg local-time `Date` constructor throughout. `addMonth` / `subMonth` navigation
  helpers. Tests: U-m9c-001..012.
- `dayScore(state, isoDate): number | typeof NO_DATA` in `lib/history.ts` — new helper.
  Computes the day score from `state.history[isoDate]` (archived day) or from live
  `state.blocks` / `state.looseBricks` when `isoDate === state.currentDate`. Returns `NO_DATA`
  sentinel for dates with no record.
- `tests/e2e/m9c.spec.ts` — 3 Playwright e2e specs (deferred to preview). IDs: E-m9c-001..003.
- `tests/e2e/m9c.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m9c-001..004.

### Changed (M9c)

- `app/(building)/BuildingClient.tsx` — refactored to receive `state: AppState` and
  `dispatch: Dispatch<Action>` as props. The `usePersistedState` hook call moved up into
  `AppShell`; `BuildingClient` no longer manages its own persisted state. Tests: C-m9c-001,
  C-m9c-013.
- `app/page.tsx` — now mounts `<AppShell>` instead of `<BuildingClient>` directly.
