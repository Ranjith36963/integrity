# Changelog — M4c

## [unreleased]

### Added (M4c)

- **M4c — Time Brick Timer:** timer verb for time bricks. Tap a time brick → starts its
  per-brick timer (single-running invariant: one timer at a time across the whole app).
  Tap again → stops. Long-press (≥ 500 ms) → opens `<TimerSheet>` for direct minute entry.
  visibilitychange tab-background recovery (listener restores `startedAt` on page-show).
  Block-collapse independence: timer keeps running when parent block collapses.
  Completes the M4 brick-logging trilogy (M4a tick / M4b goal / M4c time).
  34 SPEC ACs closed (U-m4c-001..016, C-m4c-001..020, E-m4c-001..005, A-m4c-001..004 —
  E and A deferred to preview per ADR-039 pattern).
  652 Vitest tests pass (was 600 at end of M4d; +52 M4c tests: 16U + 20C + 5E stub +
  4A stub + 7 integration).
- `components/TimerSheet.tsx` — new. Sheet for direct minute entry on a time brick.
  Single number input + Save / Cancel. Reuses M0 `<Sheet>` + M4d focus-trap pattern.
  Pre-fills current `minutesDone`; Save dispatches `SET_TIMER_MINUTES`; Cancel closes
  without change. Tests: C-m4c-007..012.
- `lib/timer.ts` — new. `useTimer(state, dispatch)` hook. Single-instance 1 s
  `setInterval` + `visibilitychange` listener. Called once at `<BuildingClient>` top.
  Identity short-circuit suppresses ~59 of every 60 dispatches (only `TICK_TIMER` fires
  when a running brick's minute boundary crosses). Tests: U-m4c-012..015 + integration
  suite in `BuildingClient.m4c.test.tsx`.
- `lib/longPress.ts` — extended. `useLongPress` single-fire sibling helper added
  alongside the existing `useLongPressRepeat`. Single-fire fires once on hold ≥ 500 ms,
  does NOT repeat. Used by the time `<BrickChip>` to open `<TimerSheet>`. Tests:
  U-m4c-001..011.
- `tests/e2e/m4c.spec.ts` — 5 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/M4b/M4d precedent). IDs: E-m4c-001..005.
- `tests/e2e/m4c.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m4c-001..004.

### Changed (M4c)

- `lib/types.ts` — `AppState` extended with `runningTimerBrickId: string | null`
  (additive; defaults `null`). `Action` union extended with 4 new variants: `START_TIMER`,
  `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`. `assertNever` arm preserved.
  All existing tests migrated to carry `runningTimerBrickId: null` in state fixtures
  (`lib/data.test.ts`, `lib/dharma.test.ts`, `lib/scoring.test.ts`,
  `BuildingClient.m4b.test.tsx`).
- `lib/data.ts` — reducer adds 4 new arms: `START_TIMER` (sets `runningTimerBrickId`;
  single-running invariant enforced), `STOP_TIMER` (clears it), `TICK_TIMER` (increments
  `minutesDone` by 1 with identity-preservation pattern), `SET_TIMER_MINUTES` (direct
  minute assignment from `<TimerSheet>` Save).
- `components/BrickChip.tsx` — time variant becomes a single `<button>` with whole-chip
  tap target (≥ 44 px per ADR-031). Tap dispatches `START_TIMER` / `STOP_TIMER`.
  Long-press (≥ 500 ms via `useLongPress`) opens `<TimerSheet>`. Running state shows ▶
  glyph + scale-pulse animation (default motion); paused state shows ⏸ glyph.
  `aria-pressed={running}`; composite `aria-label` per AC #28.
- `app/(building)/BuildingClient.tsx` — hosts `useTimer(state, dispatch)`. Threads
  `runningTimerBrickId` + 2 new callbacks (`onStartTimer`, `onStopTimer`) through
  `<Timeline>` and `<LooseBricksTray>`. `<TimerSheet>` open/close state lives here.
- `components/Timeline.tsx` — prop-threads `runningTimerBrickId` + `onStartTimer` /
  `onStopTimer` / `onOpenTimerSheet` down to `<TimelineBlock>`.
- `components/TimelineBlock.tsx` — prop-threads the same callbacks to nested
  `<BrickChip>` time chips.
- `components/LooseBricksTray.tsx` — prop-threads `runningTimerBrickId` + timer callbacks
  to loose-brick time chips.

### Notes (M4c)

- **`useTimer` wide dep-array trade-off (plan-locked).** `lib/timer.ts:91` depends on
  `[state.runningTimerBrickId, dispatch, state]` per plan.md:2247's LOCKED decision.
  Unrelated state changes mid-minute shift the next tick boundary by up to 60 s.
  Correctness holds; future optimization: narrow to a derived selector (e.g.,
  `[state.runningTimerBrickId, runningBrick?.minutesDone]`). Plan accepts BUILDER may
  optimize later.
- **`<TimerSheet>` does NOT auto-focus the minutes input on open.** rAF interfered with
  focus-trap tests under jsdom. Current behavior matches M4d `<AddChooserSheet>` (no input
  field). Spec ACs #28–#29 do not strictly require auto-focus; focus trap (C-m4c-012)
  works once the user Tabs in. Recommend M5 cleanup pass adds inline auto-focus for
  input-bearing sheets via a stable shared pattern.
- **ADR-017 partial-fulfillment.** M4c implements real timer behavior (start/stop,
  single-running invariant, mm-accurate display, visibilitychange recovery) but does NOT
  persist `runningTimerBrickId + startedAt` to localStorage. AC #34 and spec § Out of
  scope explicitly defer persistence to M8 per ADR-018.
- **`fireEvent` vs `userEvent` in `BuildingClient.m4c.test.tsx`.** Direct
  `fireEvent.pointerDown/Up` used for long-press (semantically correct for native pointer
  events). Keyboard-driven start/stop independently validated in C-m4c-001..006 with
  `userEvent`.
- **C-m4c-017 mock-clear pattern.** Clears haptics mocks after long-press gesture to
  isolate the overflow-clamp `medium` haptic for AC #18. Gesture haptic independently
  asserted in C-m4c-005.
- **VERIFIER agent hit usage limit for M4c; Main Claude ran the 5 audit checks inline.**
  Same precedent as M4d TESTS-mode. Five-check audit produced PASS with two non-blocking
  notes. Flagged for traceability only.
- **8 unused-`card` lint warnings** in `BuildingClient.m4c.test.tsx` (lines 151, 311,
  367). `expandBlock(container)` return value unused. Trivial cleanup; non-blocking.
- **Vacuous-pass debt grows.** 9 deferred-to-preview IDs (5E + 4A) added in M4c.
  Combined M4a/M4b/M4c/M4d carry-forward: ~26 sandbox-vacuous items. Future TESTS-mode
  dispatch will land a deterministic seeding helper to lift all four milestones' guards.
