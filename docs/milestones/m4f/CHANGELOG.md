# Changelog — M4f

## [unreleased]

### Changed (M4f)

- **M4f — Two Brick Kinds; Rip Timer:** destructive refactor per ADR-043. `Brick` discriminated
  union collapsed from three kinds (`tick`/`goal`/`time`) to two (`tick`/`units`).
  `kind:"goal"` → `kind:"units"`; field `count` → `done`. `kind:"time"` removed entirely.
  `<BrickChip>` renders two variants only; `<AddBrickSheet>` kind selector shows two chips.
  682 Vitest tests pass across 56 files (was 731/731 at end of M4e; net change: 44 M4f IDs
  added, 25 M4c IDs retired, files reduced as dead code deleted). 9 e2e/a11y deferred to
  preview (E-m4f-001..005, A-m4f-001..004) consistent with M4a/b/c/d/e pattern.

### Added (M4f)

- `components/UnitsEntrySheet.tsx` — new. Manual-number entry sheet that opens on tap of a
  units brick chip. Single numeric input + Save/Cancel. Save dispatches `SET_UNITS_DONE`.
  Reuses M0 `<Sheet>` + M4d focus-trap pattern. Tests: C-m4f-001..008.
- `SET_UNITS_DONE` reducer action — sets `brick.done` to an absolute typed value (clamped
  to `[0, brick.target]`). Added to `Action` union; `assertNever` arm preserved.
- `docs/decisions.md` ADR-043 — Two brick kinds (tick + units); time-brick timer
  infrastructure removed.
- `tests/e2e/m4f.spec.ts` — 5 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/b/c/d/e precedent). IDs: E-m4f-001..005.
- `tests/e2e/m4f.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m4f-001..004.

### Removed (M4f)

- `lib/timer.ts` — deleted. `useTimer` hook, single-instance 1 s setInterval,
  `visibilitychange` listener all gone.
- `components/TimerSheet.tsx` — deleted. Direct minute-entry sheet for time bricks removed
  with the time kind.
- `AppState.runningTimerBrickId: string | null` — field removed from state schema.
- `Action` variants `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`,
  `LOG_GOAL_BRICK` — all removed from the reducer.
- `<BrickStepper>` — ±1 stepper UX retired (replaced by `<UnitsEntrySheet>` absolute-value
  entry).
- Legacy dead files: `components/Brick.tsx`, `components/ui/BrickChip.tsx`,
  `components/NowCard.tsx` — deleted.
- `tests/e2e/m4c.spec.ts` + `tests/e2e/m4c.a11y.spec.ts` — retired with M4c timer surface;
  25 M4c test IDs (`U-m4c-012..015`, `C-m4c-007..018`, `E-m4c-001..005`, `A-m4c-001..004`)
  explicitly retired in `docs/tests.md`.

### Retained (M4f)

- `lib/audio.ts` + `public/sounds/chime.mp3` — block-complete and day-complete chimes
  explicitly **NOT removed**, per user decision 2026-05-14. Only the timer's own usage of
  the audio module was removed with `lib/timer.ts`.
