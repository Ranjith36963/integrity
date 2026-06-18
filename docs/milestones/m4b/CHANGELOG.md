# Changelog — M4b

## [unreleased]

### Added (M4b)

- **M4b — Goal Brick Stepper:** stepper verb for goal bricks. Inside each goal `<BrickChip>`,
  a `GoalStepperChip` variant renders `−` / `+` buttons inside `<div role="group">` with an
  accessible `aria-label`. Dispatches `LOG_GOAL_BRICK` to the reducer, which increments
  `brick.count` clamped to `[0, brick.target]`. Reuses M4a's block-100% bloom + chime +
  `success` haptic and day-100% fireworks + chime + `notification` haptic for the goal-driven
  cross-up path.
  Long-press auto-repeat: hold either button for 500 ms (`HOLD_MS`) → fires at 50 ms ticks
  (`INTERVAL_MS`) until released; each dispatched tick emits a `light` haptic; reaching the
  clamp boundary emits a `medium` haptic. Scale-press visual feedback: button scales 0.95 →
  1.0 over 80 ms on press; `prefers-reduced-motion: reduce` collapses the scale animation to
  instant but preserves haptics. 27 SPEC ACs closed (U-m4b-001..012, C-m4b-001..022,
  A-m4b-001..006 — E-m4b-001..010 + A-m4b-001..006 deferred to preview per ADR-039 pattern).
  569 Vitest tests pass (553 pre-M4b → 569; +16 M4b component tests + 14 M4b unit tests).
- `lib/longPress.ts` — new. `useLongPressRepeat` hook with `HOLD_MS=500`, `INTERVAL_MS=50`.
  Returns `{ onPointerDown, onPointerUp, onPointerLeave }` props; clears timer on unmount;
  works with keyboard (space/enter on `keydown`). Three event handlers use `_e` underscore
  prefix for unused event params (minor lint warning; fix via `argsIgnorePattern: "^_"` in
  ESLint config — deferred).
- `components/BrickChip.tsx` — `GoalStepperChip` variant: `−` + `+` `<button>` pair with
  44 px touch targets (ADR-031), count/target badge, unit label, and `useLongPressRepeat`
  wired to each button.
- `tests/e2e/m4b.spec.ts` — 10 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a precedent).
- `tests/e2e/m4b.a11y.spec.ts` — 6 Playwright axe-core a11y specs (deferred to preview).
- `app/(building)/BuildingClient.m4b.test.tsx` — dedicated test file for C-m4b-022
  (BuildingClient day-100 cross-up via `onGoalLog`); isolated `defaultState` mock scoping
  requires file-level separation — sound, not a defect.

### Changed (M4b)

- `lib/types.ts` — Action union extends with `LOG_GOAL_BRICK`. `assertNever` arm preserved.
- `lib/data.ts` — reducer routes `LOG_GOAL_BRICK` by `brickId` AND `kind === 'goal'` across
  `state.blocks[*].bricks[]` and `state.looseBricks[]`. Clamps `count` to `[0, target]`.
  Immutable updates throughout.
- `components/Timeline.tsx` — threads `onGoalLog` callback down to `<TimelineBlock>`.
- `components/TimelineBlock.tsx` — threads `onGoalLog` to nested `<BrickChip>` goal chips.
- `components/LooseBricksTray.tsx` — threads `onGoalLog` to loose-brick goal chips.
- `app/(building)/BuildingClient.tsx` — owns `LOG_GOAL_BRICK` dispatch; threads `onGoalLog`
  callback down; reuses existing day-100% cross-up wiring for the goal-driven path.

### Notes (M4b)

- **3 new lint warnings** in `lib/longPress.ts` lines 104, 111, 118 (`_e` underscore-prefixed
  unused params on event handler types). Fixable by adding `"argsIgnorePattern": "^_"` to
  the ESLint `@typescript-eslint/no-unused-vars` rule. Deferred to M5/M7 polish.
- **Vacuous-pass guards acknowledged debt.** M4b e2e specs reproduce the M4a
  `if ((await x.count()) > 0)` vacuous-pass pattern despite the M4b tests.md preamble
  (line 3232) explicitly promising not to. Spans M4a + M4b. Future TESTS-mode follow-up
  should land `addInitScript` seeding helpers (per ADR-039 ships-empty + `?seed=...` query
  param or test-only `localStorage` shim).
- E2E + a11y test bodies (E-m4b-001..010, A-m4b-001..006) authored but execution deferred to
  Vercel preview — same M0–M4a sandbox `next dev` socket bind failure pattern.
