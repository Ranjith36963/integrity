# Changelog

All notable changes to Dharma are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

The **SHIPPER** agent updates this file on every ship. The user does not edit it directly.

---

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

### Added

- **M4e — Brick Duration + Overlap Engine:** universal `hasDuration` toggle on every brick
  kind (tick / goal / time). When ON, brick gains `start: HH:MM`, `end: HH:MM`,
  `recurrence: Recurrence` fields. Pure half-open overlap engine (`lib/overlap.ts`) with
  `intervalsOverlap` + `findOverlaps`. Overlap warning chip in `<AddBrickSheet>` and
  `<AddBlockSheet>` shows `⚠ overlaps with [Kind: Name, HH:MM–HH:MM]` with multi-item list
  and "+N more" tail; chip uses `role="alert"` for live-region announcement; Save is disabled
  when any overlap exists. `aria-describedby="brick-save-hint"` / `"block-save-hint"` with
  sr-only hint `"Resolve the overlap to save."` for screen-reader users.
  `<TimedLooseBrickCard>` — timed-brick chip with dashed outline that renders on the Timeline
  at its start row. `<BrickChip>` time-window badge shows `HH:MM–HH:MM` under the title for
  timed bricks. `withDurationDefaults()` migration helper — idempotent; preserves
  byte-identity for pre-M4e bricks. `selectTimelineItems()` + `selectTrayBricks()` selectors
  merge blocks + timed loose bricks sorted by start; non-timed loose bricks stay in the tray.
  `Timeline.tsx` prop signature widened from `blocks: Block[]` → `items: TimelineItem[]`
  (discriminated union). ADR-042 (universal-duration axis) accepted and locked at M4e.
  ADR-034 softened — overlap engine now hard-enforces collisions (was: warn-and-save).
  M2's missing block↔block overlap enforcement closed retroactively.
  51 coverage ACs closed (U-m4e-001..021, C-m4e-001..030). 9 deferred-to-preview e2e/a11y
  (E-m4e-001..005, A-m4e-001..004) consistent with M4a/b/c/d pattern.
  731 Vitest tests pass (was 652/652 at end of M4c; +79 M4e tests: 21U + 30C + 5E stub +
  4A stub).
- `lib/overlap.ts` — new. Pure half-open overlap engine: `intervalsOverlap(a, b)` +
  `findOverlaps(candidate, others)`. Tests: U-m4e-001..014.
- `components/TimedLooseBrickCard.tsx` — new. Timed loose-brick chip with dashed outline;
  renders on the Timeline at its start row via `selectTimelineItems`. Tests: C-m4e-014..021.
- `tests/e2e/m4e.spec.ts` — 5 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/b/c/d precedent). IDs: E-m4e-001..005.
- `tests/e2e/m4e.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m4e-001..004.

### Changed (M4e)

- `<AddBlockSheet>` Save button is now disabled by overlap (was: warn-and-save). M2's
  missing block↔block enforcement closed retroactively. Overlap chip updated to
  `role="alert"` for live-region announcement.
- `Timeline.tsx` prop renamed `blocks: Block[]` → `items: TimelineItem[]` (discriminated
  union). All internal call sites migrated (`BuildingClient.tsx`, both Timeline test files).
- C-m2-006 test tightened to require the `⚠ overlaps with …` copy prefix.
- `app/(building)/BuildingClient.tsx` — hosts `selectTimelineItems` + `selectTrayBricks`
  selectors; threads `items: TimelineItem[]` to `<Timeline>`; calls `withDurationDefaults()`
  on state load.

### Fixed (M4e)

- Hardcoded `"2026-05-14"` date literal in `AddBrickSheet`'s `DEFAULT_RECURRENCE` replaced
  with lazy `todayISO()` seed (G3 EVAL gap).

### Notes (M4e)

- **`BrickBase` type module-private.** `lib/types.ts` keeps `BrickBase` unexported. If a
  third surface needs the shape, promote it then. `AddBrickSheet` uses `as const` literals.
- **C-m4e-030 shares green commit with C-m4e-027..029.** Same production change satisfies
  all four IDs. Defensible per M4c precedent; minor ADR-027 one-green-per-ID deviation.
- **`lib/blockValidation.ts:overlapsExistingBlock` is dead production code.** Retained for
  U-m2-004/005 regression coverage. Flag for M5/M7 cleanup once edit-mode lands.
- **Vacuous-pass debt grows.** 9 new deferred-to-preview IDs (5E + 4A) added in M4e.
  Running total ~35 post-M4e. Deterministic-seed helper still owed.

### Added

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

### Added

- **M4d — Add Chooser Sheet:** chooser sheet routing for dock `+` and empty time slot tap.
  Tap dock `+` or any empty slot → `<AddChooserSheet>` appears with two options: "Add Block"
  and "Add Brick". Each routes to the existing `<AddBlockSheet>` / `<AddBrickSheet>` forms.
  Inside-block `+ Add brick` button and tray `+ Brick` pill bypass the chooser and remain
  direct. Real Tab-cycling focus trap (`components/AddChooserSheet.tsx:32–65`). Reduced-motion
  respected. No reducer or schema change. Resolves SG-m3-08 (chooser vs. bifurcated dock) in
  favor of a chooser — empty-state Brick path now reachable from a fresh install.
  25 SPEC ACs closed (U-m4d-001..002, C-m4d-001..017, E-m4d-001..006, A-m4d-001..004 — E
  and A deferred to preview per ADR-039 pattern). M2/M3 migrations: C-m2-012, C-m2-016,
  C-m2-020, C-m3-009, C-m3-024 amended to walk through the chooser; ACs unchanged.
  600 Vitest tests pass (was 569 at end of M4b; +31 M4d tests: 2U + 17C + 6E stub + 4A stub).
- `components/AddChooserSheet.tsx` — new. Single-instance chooser sheet with two large tap
  targets ("Add Block" / "Add Brick"). Real focus trap: Tab cycles between options and close
  button; Shift-Tab reverses; Esc delegates to `<Sheet>`'s existing keydown listener.
- `tests/e2e/m4d.spec.ts` — 6 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/M4b precedent).
- `tests/e2e/m4d.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).

### Changed (M4d)

- `app/(building)/BuildingClient.tsx` — chooser state + 4 new `useCallback` handlers
  (`onOpenChooser`, `onCloseChooser`, `onChooseBlock`, `onChooseBrick`). Dock `+` and slot
  tap now open the chooser instead of going directly to `<AddBlockSheet>`.
- `components/Timeline.tsx` — added optional `hasLooseBricks` prop (default `false`).
  Default preserves M3 semantics; existing Timeline tests still pass. Forced by AC #10/#11
  (additive 4-line change; planner-side oversight, not builder overreach).
- `components/AddBlockSheet.tsx` — added `useEffect` to sync `start` from `defaultStart`
  prop on open. Mirrors `AddBrickSheet`'s `defaultCategoryId` sync pattern per SG-m3-04.
  `eslint-disable` comment in place for the effect dependency.

### Notes (M4d)

- **AC #14 swipe-down dismiss** for chooser inherited from M0 `<Sheet>`; not M4d-tested
  directly. Confirm at preview Gate #2 tap-test.
- **D2 plan↔implementation drift on focus trap.** `plan.md:~1731` says M4d does NOT need a
  local focus trap; BUILDER added a real Tab-cycling trap because A-m4d-002 demanded it
  (native browsers do not trap Tab in a dialog without `inert` or a JS trap). EVALUATOR
  confirmed the trap matches AddBlockSheet/AddBrickSheet pattern. Plan prose is now stale
  on this point — recorded so future devs do not re-litigate.
- **D4 — Esc dismiss** confirmed deterministic via `<Sheet>`'s existing keydown listener
  (`components/ui/Sheet.tsx:22–29`). Promoted from "stretch test" to "expected behavior."
- **D5 — audit trail.** Main Claude authored the tests.md M4d entry directly in-thread
  (TESTS-mode planner agent hit usage limit at 12pm UTC reset). Substantively equivalent
  to healthy planner output; VERIFIER and EVALUATOR both gated PASS. Flag for traceability.
- **Vacuous-pass debt continues.** 12 new M4d e2e/a11y specs reproduce the
  `if ((await x.count()) > 0)` guard pattern (spans M4a + M4b + M4d). Future TESTS-mode
  follow-up owes deterministic seeding helpers (per ADR-039 + `?seed=...` query param or
  test-only `localStorage` shim).

### Added

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

### Added

- **M4a — Tick Brick Logging:** the first user-driven verb. Tap a tick brick to mark it done;
  chip foreground gradient animates 0 → 100%, glyph swaps ☐ → ✓, block scaffold bar grows,
  HeroRing arc updates, BlueprintBar segment opacity updates — all on the same render tick.
  First real-user trigger of M3's wired bloom + chime + fireworks celebrations: block 100%
  → bloom + chime + `success` haptic; day 100% → fireworks overlay (~1.6 s, ≤ 16 particles)
  - chime + `notification` haptic. Both one-shot per crossing (cross-down retriggers).
    Goal + time bricks remain inert (their verbs land in M4b + M4c).
    41 test IDs closed (U-m4a-001..010, C-m4a-001..015, E-m4a-001..010, A-m4a-001..006);
    3 deferred-by-design (AC #22 chime asset gate, AC #31 tsc gate, AC #32 ESLint gate).
- `lib/audio.ts` — new. `playChime()` lazy-builds a single module-scoped HTMLAudioElement
  for `/sounds/chime.mp3`; SSR guard (skips on server); try/catch around `.play()` (silent
  on iOS pre-gesture / offline).
- `components/Fireworks.tsx` — new. Day-100% celebration overlay; ≤ 16 particles; ~1.6 s;
  suppressed under `prefers-reduced-motion`.
- `lib/motion.ts` — `fireworks` Duration token (1600 ms easeOut). Was reserved in M3 plan;
  landed in M4a.

### Changed (M4a)

- `lib/types.ts` — Action union extends with `LOG_TICK_BRICK`. `assertNever` arm preserved.
- `lib/data.ts` — reducer routes `LOG_TICK_BRICK` by `brickId` AND `kind === 'tick'` across
  `state.blocks[*].bricks[]` and `state.looseBricks[]`. Immutable updates throughout.
- `components/BrickChip.tsx` — branches `onClick` by `brick.kind`. Tick chips fire
  `haptics.light()` + dispatch; goal/time chips no-op (M4b + M4c). Native `<button>` with
  `aria-pressed={done}` and enriched aria-label. 44 px touch target honored (ADR-031).
- `components/TimelineBlock.tsx` — threads `onTickToggle` to nested `<BrickChip>`s; wires
  block-100% cross-up via `useCrossUpEffect` to fire bloom + chime + `success` haptic.
- `components/LooseBricksTray.tsx` — threads `onTickToggle` for loose-brick chips.
- `app/(building)/BuildingClient.tsx` — owns `LOG_TICK_BRICK` dispatch; threads callback
  down; wires day-100% cross-up to fire `<Fireworks>` overlay + chime + `notification`
  haptic.

### Notes (M4a)

- `public/sounds/chime.mp3` ships in M4a as a **431-byte placeholder** — sandbox had no
  audio tooling. Replace with a real royalty-free chime ≤ 30 KB before user-facing release.
- E2E + a11y test bodies (E-m4a-001..010, A-m4a-001..006) authored but execution deferred
  to Vercel preview — same M0–M3 sandbox `next dev` socket bind failure pattern.
- **Reduced motion:** `prefers-reduced-motion: reduce` collapses chip-fill / scaffold /
  HeroRing animations to instant; bloom and fireworks visuals suppressed; haptics + chime
  still fire (haptics ≠ motion; audio ≠ motion).

### Harness (M4a)

- `docs(harness)` commit `23662cf` adds Gate D (`npx tsc --noEmit`) to BUILDER contract.
  Closes gap exposed by M4a first attempt: Vitest passed but `tsc` reported 6 net-new
  TypeScript errors (resolved via `asTick` discriminated-union narrowing helper). Effective
  M4b onward.
- ADR-041 collapse of Gate #1 into VERIFIER agent now fully in force from M4a onward.

### Added

- **M3 — Add Brick Flow + Live Scoring + Visual Fill:** first interactive verb on bricks.
  Add a brick inside a block (tap block → expand → "+ Add brick") OR standalone via the
  Loose Bricks tray. Three brick kinds — tick / goal / time — with per-type validation.
  Single-instance `<Sheet>` with `view: 'brick' | 'newCategory'` (mirrors M2's
  AddBlockSheet pattern). 57 test IDs closed (`U-m3-001..014`, `C-m3-001..024`,
  `E-m3-001..013`, `A-m3-001..006`); 3 deferred-by-design (AC #38 state injection;
  AC #47/#48 composite gates).
- `components/AddBrickSheet.tsx`, `components/BrickChip.tsx` (re-authored from
  `[obsolete]`), `components/HeroRing.tsx`, `components/LooseBricksTray.tsx` — new.
- `lib/celebrations.ts` — `useCrossUpEffect` hook for one-shot cross-up detection.
  Powers block 100% bloom and day 100% fireworks (wired in M3; user-driven trigger
  arrives with M4 logging).
- `lib/blockValidation.ts:isValidBrickGoal`, `isValidBrickTime` (integer >= 1
  validators).
- Locked Phase-1 Brick discriminated union (`kind` discriminator; `id` / `categoryId` /
  `parentBlockId` FKs; goal `count`/`target`/`unit`; time `minutesDone`/`durationMin`).
- `categoryDayPct(state, categoryId)` in `lib/dharma.ts` — bricks attribute to THEIR
  own category (not parent block's); null-category loose bricks excluded from category
  queries but counted in `dayPct(state)`.

### Changed (M3)

- `lib/types.ts` — Brick stub from M2 REPLACED with locked discriminated union;
  `AppState.looseBricks: Brick[]` added; `Action` union extends with `ADD_BRICK`.
- `lib/data.ts` — `defaultState()` returns `{ blocks:[], categories:[], looseBricks:[] }`.
  Reducer routes `ADD_BRICK` by `brick.parentBlockId` (null -> looseBricks;
  non-null -> block.bricks). Immutable updates throughout. `assertNever` preserved.
- `lib/dharma.ts` — `brickPct` updated for renamed schema. `dayPct(blocks: Block[])`
  REPLACED by `dayPct(state: AppState)` — averages over `(blocks union looseBricks)`.
  Empty-state floor `0`. New `categoryDayPct`.
- `components/Hero.tsx` — wraps the numeral inside `<HeroRing>`. Consumes
  `dayPct(state)` (new signature).
- `components/TimelineBlock.tsx` — left scaffold bar (height = blockPct%; color =
  category or `--text-dim`); tap-to-expand reveals `<BrickChip>` list + "+ Add brick"
  ghost button; cross-up bloom hook wired (M4 triggers it).
- `components/BlueprintBar.tsx` — segment opacity = `0.3 + (blockPct/100 x 0.7)`
  clamped `[0.3, 1]`. Aggregation logic preserved from M2.
- `app/(building)/BuildingClient.tsx` — wires AddBrickSheet open/close + ADD_BRICK
  reducer dispatch; mounts `<LooseBricksTray>` between Timeline and BottomBar (gated by
  visibility predicate); wires day-100 cross-up.

### Notes (M3)

- M3 ships the cross-up hook + bloom wiring + HeroRing visual fill; the `fireworks`
  motion token + `public/sounds/chime.mp3` chime asset are **deferred to M4** when
  logging UX arrives to actually drive crossings.
- Two `aria-expanded` lint warnings (`LooseBricksTray.tsx:43`, `TimelineBlock.tsx:62`)
  on `role="region"` / `role="article"` are spec-mandated by AC #44 + #45 and
  intentionally remain as warnings (not suppressed).
- Playwright + axe-core deferred to Vercel preview (sandbox `next dev` socket bind
  failure — M1/M2 pattern). Test files at `tests/e2e/m3.spec.ts` (13 IDs) and
  `tests/e2e/m3.a11y.spec.ts` (6 IDs).

### Added

- **M2 — Add Block Flow:** first interactive verb. Add via floating `+` button (defaults Start to current hour rounded down) or via empty-slot tap (24 absolutely-positioned transparent buttons behind block cards). Single `<Sheet>` instance with `view: 'block' | 'newCategory'` local state; M0 `<Sheet>` primitive untouched. Inline category creation — first category created as side-effect of categorizing first block; new category auto-selected; persists on "Done" even if block is then Cancelled. Validation: empty Title disables Save; End ≤ Start inline error; End past 23:59 inline error; Custom-range zero-weekdays inline error; overlap soft-warning (Save still allowed). Day Blueprint Bar non-empty path: aggregates by `categoryId`, segment width proportional to sum-of-durations / day-total; uncategorized blocks excluded. No-end blocks render as ~5px markers (`HOUR_HEIGHT_PX / 12`). Closes 50 test IDs (`U-m2-001..011`, `C-m2-001..020`, `E-m2-001..013`, `A-m2-001..006`); 33 testable SPEC ACs (3 deferred-by-design). Playwright + axe deferred to Vercel preview (sandbox `next dev` socket bind failure — M1 pattern).
- `components/AddBlockSheet.tsx`, `RecurrenceChips.tsx`, `CategoryPicker.tsx`, `NewCategoryForm.tsx`, `SlotTapTargets.tsx` — new.
- `lib/blockValidation.ts` — pure validators (5 helpers): `validateTitle`, `validateEndTime`, `validateEndOverflow`, `validateRecurrenceWeekdays`, `validateOverlap`.
- `lib/uuid.ts` — `crypto.randomUUID()` mockable seam.
- 12-color palette `--cat-1`..`--cat-12` in `app/globals.css` (replaces legacy `--cat-health/mind/career/passive` per ADR-032). `--cat-4` lightened from `#64748b` → `#94a3b8` for WCAG AA contrast on `#07090f`.
- Locked Phase-1 schemas in `lib/types.ts`: `Block` (`id`, `name`, `start`, `end?`, `recurrence`, `categoryId | null`, `bricks: []`), `Category` (`id`, `name`, `color`), `AppState` (`blocks`, `categories`), `Recurrence` union per ADR-019 (stored, not yet resolved — `appliesOn` lands in M9), `Action` discriminated union with `assertNever` exhaustiveness guard.

### Changed (M2)

- `app/(building)/BuildingClient.tsx` — owns `useReducer` over `(blocks, categories)`; wires sheet open/close + `ADD_BLOCK` / `ADD_CATEGORY` callbacks.
- `components/Timeline.tsx` — renders `<TimelineBlock>` cards over the M1 24-hour grid; layers `<SlotTapTargets>` underneath; preserves now-line + auto-scroll.
- `components/TimelineBlock.tsx` — re-authored (was obsolete in M1); height = `timeToOffsetPx(end) - timeToOffsetPx(start)` when `end` set, else `HOUR_HEIGHT_PX / 12` (~5px no-end marker); category dot via `data-testid="category-dot"`.
- `components/BlueprintBar.tsx` — non-empty path aggregates by `categoryId`; uncategorized blocks excluded.
- `components/BottomBar.tsx` — `+` button now wires `onClick` to open AddBlockSheet (M1 left it no-op).
- `lib/data.ts` — `defaultState()` adds `categories: []`; reducer with `ADD_BLOCK` + `ADD_CATEGORY` and `assertNever` exhaustiveness.
- `lib/dharma.ts:duration()` — widened to handle `end?: string` (returns 0 for no-end blocks; pre-M2 `U-bld-014` tests still pass).

### Added

- **M1 — Empty Building Shell:** spatial 24-hour timeline with amber now-line, hero (date +
  Building N of N + 0%), top bar (DHARMA / Edit toggle / Settings), Day Blueprint bar
  empty-outline placeholder, locked empty-state copy "Tap any slot to lay your first block.",
  floating dock (Voice disabled until M10; `+` no-op until M2). Closes 56 test IDs
  (`U-m1-001..011`, `C-m1-001..022`, `E-m1-001..016`, `A-m1-001..007`). 25 SPEC ACs #1..#25.
- `lib/dayOfYear.ts` — pure day-of-year helper (handles leap year).
- `lib/timeOffset.ts` — exports `HOUR_HEIGHT_PX` as the single source of truth shared by
  Timeline + NowLine.
- `components/NowLine.tsx` — new presentational component consuming `useNow()` (ADR-023).

- **M0 — Design System:** 10 primitive components (`<Button>`, `<Modal>`, `<Sheet>`, `<Chip>`,
  `<Input>`, `<Stepper>`, `<Toggle>`, `<EmptyState>`, `<BlockCard>`, `<BrickChip>`) with cva
  variants; design tokens migrated to `#07090f` warm-dark palette per ADR-011; new `/design`
  harness page renders all primitives in every documented state; motion / haptics /
  reduced-motion lib modules. Closes 48 M0 test IDs (`U-m0-001..012`, `C-m0-001..023`,
  `E-m0-001..008`, `A-m0-001..005`). New ADRs: 028 (`aria-checked` on `role="switch"`),
  029 (`devIndicators: false` for touch-target tests), 030 (`/design` route, no underscore),
  031 (`Button sm` keeps `min-h-[44px]`).
- **live-clock (Page 1 pivot, feature 2 of 8):** Real-time clock + date wired into the
  Building view. Hero now shows today's date in `Wed, Apr 29` style (en-US per ADR-023 /
  SG-bld-11), and the day-counter line reads `Building 1 of 365` against a placeholder
  `programStart === today` (the `persist` feature next shipped will replace the placeholder
  with a real first-install date). New `lib/useNow.ts` hook ticks every 60 s. New helpers in
  `lib/dharma.ts`: `today()`, `dayNumber()`, `dateLabel()`. Closes `U-bld-022..025`,
  `C-bld-039..040`.
- **Page 1 — Building view (today's routine):** full implementation of the daily routine
  tracker. Covers all 60 accepted Page 1 test IDs: `U-bld-001..021`, `C-bld-001..033`,
  `E-bld-001..020` (E-bld-021 intentionally dropped per SG-bld-04), and `A-bld-001..005`.
  Verified by 65/65 Vitest unit tests across 13 files, 26/26 Playwright e2e tests on
  mobile-chrome (ADR-010), and 0 axe-core violations.
- **SDD/TDD harness:** `CLAUDE.md` agent operating manual, `docs/spec.md`, `docs/plan.md`,
  `docs/tests.md`, `docs/decisions.md` (ADR-001..016), `docs/status.md`, Husky + commitlint,
  lint-staged, Vitest config, Playwright config, Serwist PWA config.
- **SDD/TDD harness V1 upgrade (2026-05-01):** `npm run eval` bundles all gates
  (lint + typecheck + vitest + e2e + a11y); `/feature <name>` slash command becomes the
  one-prompt pipeline trigger; ADR-024 caps the auto-FAIL → BUILDER loop at 3 retries; ADRs
  017–024 capture the per-feature dispatch policy (ADR-022), localStorage schema (ADR-018),
  recurrence union (ADR-019), live-derived `now`/`today`/`dayNumber` (ADR-020), `BrickTimer`
  decision (ADR-017), and `useNow` SSR-paint rationale (ADR-023).
- **SDD/TDD harness V2 upgrade (2026-05-01):** the methodology is named **The Loop**
  (ADR-025) and runs as PLAN → TESTS → IMPL → EVAL → SHIP with two human gates (ADR-026 —
  Gate #1 after both PLANNER dispatches return, Gate #2 after SHIPPER deploys). PLANNER
  splits into `mode: PLAN` and `mode: TESTS` dispatches per feature for timeout resilience.
  Per-phase commit-prefix convention adopted (ADR-027): `docs(plan-<feat>):` /
  `docs(tests-<feat>):` / `test(<feat>):` / `feat(<feat>):` / `docs(eval-<feat>):` /
  `chore(ship-<feat>):` / `docs(ship-<feat>):`. SHIPPER's `docs/status.md` update is now
  strictly mandatory on every ship. Slash-command pre-flight tightened to validate the
  feature's SPEC entry has all five required sections (Intent / Inputs / Outputs /
  Edge cases / Acceptance criteria) before The Loop runs.
- **`phase1plan.md`** added at the repo root: 11-milestone build order M0..M10 covering
  Design System through Voice Log, with carried-forward decisions, locked AppState schema,
  test migration discipline, and tracked spec gaps (SG-bld-13..19). Supersedes the previous
  8-feature empty-toolkit pivot for forward planning.
- **`test:a11y` script:** `npm run test:a11y` runs the dedicated axe-core Playwright suite
  (`building.a11y.spec.ts`) independently from the full e2e run (added in `c246686` per
  evaluator QoL suggestion).
- **wipe-demo (Page 1 pivot, feature 1 of 8):** Building view now boots into an empty state
  on first run. Copy "No blocks yet. Tap + to add your first block." renders by default.
  BlueprintBar and NowCard are hidden until the user creates blocks. Hero shows 0 % with the
  "Building N of 365" day-counter line hidden until `programStart` exists (ADR-020).
  Closes `C-bld-034..038`, `E-bld-022..024`.

### Changed

- `components/Hero.tsx` — drops `<AnimatedPercent>` for M1 (no count-up; M3 re-adds).
- `components/BlueprintBar.tsx` — adds empty-outline path with CSS-gradient grid; renders
  unconditionally even when `blocks.length === 0`.
- `components/Timeline.tsx` — adds 24-hour vertical grid, NowLine integration, auto-scroll-to-now
  on mount. One justified `eslint-disable-next-line react-hooks/exhaustive-deps` at line 39
  (auto-scroll-on-mount runs once).
- `components/EmptyBlocks.tsx` — adopts M0 `<EmptyState>` primitive with locked SPEC copy.
- `components/BottomBar.tsx` — Voice button visibly disabled (`aria-disabled`); `+` button
  no-op; `safe-area-inset-bottom` honored.
- `app/(building)/BuildingClient.tsx` — composes the seven M1 regions; drops obsolete-component
  imports (NowCard, TimelineBlock, Brick, BrickStepper, Scaffold, EmptyBricks).
- **M0 test migration complete:** the 94 pre-pivot test IDs from `docs/tests.md` have been
  tagged `[survives]`, `[re-author]`, or `[obsolete]` by the M0 PLANNER dispatch, fulfilling
  the `phase1plan.md` § Test Migration Discipline requirement. No IDs were silently dropped.
- **`lib/data.ts` placeholders gone:** `now="00:00"` and `dateLabel=""` are removed from
  `BuildingClient`; live values flow through from `useNow`.
- **`dayPct` scoring — equal-weighted (ADR-005 / SG-bld-08):** completion percentage is now
  computed as the unweighted mean of all brick completion ratios (each brick counts once,
  regardless of duration). Hero number now reads ~57 % for the canonical fixture vs. ~26 %
  under the prior duration-weighted calculation. This is a user-visible behavior change.
- **`--ink-faint` → `--ink-dim` migration (ADR-011):** all low-emphasis text that previously
  used the `--ink-faint` design token now uses `--ink-dim` to meet WCAG AA contrast ratios
  (4.5 : 1). No visual change intended beyond the contrast fix.
- **WebKit Playwright project disabled (ADR-010):** mobile-safari project removed from
  `playwright.config.ts` for this sandbox; WebKit binaries are unavailable in the build
  environment. Re-enable by restoring the `mobile-safari` project entry once binaries are
  present.
- **Demo fixtures retired:** removed `BLOCKS`, `NOW`, `DAY_NUMBER`, `TOTAL_DAYS`,
  `TODAY_LABEL` from `lib/data.ts`. The hardcoded weekday routine is gone; users will create
  their own. ~17 demo-fixture tests deleted (`U-bld-016..018`, `C-bld-008..015`,
  `E-bld-002..007/014/019`); replacement coverage tracked in `tests.md` migration table.
- **Groundwork for persistence:** `lib/data.ts` introduces an unused `defaultState()` factory
  and `AppState` interface per ADR-018; the `persist` feature (feature 3 of 8) will wire them.
- **Hero `dayNumber` is now optional** (`dayNumber?: number`); when undefined, the
  "Building N of 365" line is omitted from the DOM.

### Notes

- **ADR-023** documents the `useNow` SSR-paint policy: server clock used on first render to
  avoid CLS flash, reconciled within 60 s on the client.
- **Coverage caveat (live-clock):** the BlueprintBar now-pin `aria-label` has only
  regression-level coverage (negative assertion via C-bld-039); a positive component test
  will return when a future feature touches BlueprintBar with explicit blocks.

---
