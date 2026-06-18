## Milestone 4b — Goal Brick Stepper — Tests

Derived from `/docs/plan.md § Milestone 4b — Goal Brick Stepper — Plan` (commit `f116a21`). M4b adds the **second** user-driven verb (count steppers on goal bricks): one new reducer arm (`LOG_GOAL_BRICK`), `−` / `+` controls inside `<BrickChip>` for `kind === "goal"`, and a `lib/longPress.ts` auto-repeat hook. Tick + time chip behavior is regression-checked unchanged. Coverage spans 27 SPEC ACs across Unit/Data, Component, E2E, and A11y layers; auto-repeat assertions use `vi.useFakeTimers()` (Vitest) and explicit Playwright waits with ±20 ms tolerance (E2E). All A-m4b-_ and E-m4b-_ tests seed deterministic state (fixture / `addInitScript`) — no `if ((await x.count()) > 0)` vacuous-pass guards, per EVALUATOR's M4a flag.

### Unit (Vitest)

#### U-m4b-001

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing one block with a goal brick `{ id: "g1", kind: "goal", count: 3, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }`
**THEN** the returned state's matching brick has `count === 4`; `target`, `unit`, and all other fields are deep-equal to the input.
Proves: plan.md § Locked schema additions (reducer arm sketch — increment path) — covers SPEC AC #4

#### U-m4b-002

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing one block with a goal brick `{ id: "g1", kind: "goal", count: 4, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: -1 }`
**THEN** the returned state's matching brick has `count === 3`; all other fields deep-equal.
Proves: plan.md § Locked schema additions (decrement path) — covers SPEC AC #5

#### U-m4b-003

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing a goal brick `{ id: "g1", kind: "goal", count: 10, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }` (clamp at top)
**THEN** the returned state is the **same reference** as the input state (`prevState === nextState`); brick `count` remains `10`.
Proves: plan.md § Locked schema additions ("identity short-circuit … return the original state by reference") + § Cross-cutting concerns #5 — covers SPEC AC #4 (clamp), edge-case "Tap + at count === target"

#### U-m4b-004

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing a goal brick `{ id: "g1", kind: "goal", count: 0, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: -1 }` (clamp at bottom)
**THEN** the returned state is the same reference as the input state; brick `count` remains `0`.
Proves: plan.md § Locked schema additions (clamp identity short-circuit) — covers SPEC AC #5 (clamp), edge-case "Tap − at count === 0"

#### U-m4b-005

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a goal brick `{ id: "lg1", kind: "goal", count: 2, target: 5 }` only in `state.looseBricks` (no blocks contain it)
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "lg1", delta: 1 }`
**THEN** the returned state's `looseBricks` entry has `count === 3`; `state.blocks` array is reference-equal to the input's `state.blocks` (only loose array changes).
Proves: plan.md § File structure (`lib/data.ts` row — "Routes by `brickId` across `state.blocks[*].bricks[]` then `state.looseBricks[]`") — covers SPEC AC #4

#### U-m4b-006

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a goal brick `{ id: "g1", count: 2, target: 5 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "does-not-exist", delta: 1 }`
**THEN** the returned state is the same reference as the input state (id-not-found → no-op identity).
Proves: plan.md § Edge cases ("Brick id collision: defensive — reducer matches by id AND `kind === \"goal\"`") — covers SPEC AC #4 defensiveness

#### U-m4b-007

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a tick brick `{ id: "t1", kind: "tick", done: false }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "t1", delta: 1 }` (kind mismatch — id matches a tick brick)
**THEN** the returned state is the same reference as the input; the tick brick still has `done === false`; no `count` field appears on it.
Proves: plan.md § Locked schema additions ("Non-goal id matches are no-ops") + § Edge cases (brick-id-collision defense) — covers SPEC AC #18 (tick brick unchanged)

#### U-m4b-008

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a time brick `{ id: "tm1", kind: "time", elapsedMs: 0, durationMs: 600000 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "tm1", delta: 1 }` (kind mismatch — id matches a time brick)
**THEN** the returned state is the same reference as the input; the time brick is deep-equal to the input.
Proves: plan.md § Locked schema additions (kind-guard) — covers SPEC AC #19 (time brick unchanged)

#### U-m4b-009

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` `prevState` with a goal brick `{ id: "g1", count: 2, target: 5 }`
**WHEN** the reducer returns `nextState` for `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }` (real change)
**THEN** `prevState !== nextState` (new top-level reference) AND `prevState.blocks` array reference is preserved on the previous state (no in-place mutation observable on the prior reference).
Proves: plan.md § Locked schema additions ("The reducer never mutates in place") — covers SPEC AC #4 (immutability invariant)

#### U-m4b-010

Target file: `lib/data.test.ts`
**GIVEN** the reducer's exhaustive `Action` union now including `LOG_GOAL_BRICK` (M4b extension)
**WHEN** an unknown action shape (`{ type: "__never__" } as never`) is passed to the reducer
**THEN** TypeScript compile fails OR the `default` branch's `assertNever` throws at runtime, proving the new union member is exhaustively handled.
Proves: plan.md § Locked schema additions ("`assertNever` arm preserved") + § Decisions to honor ("`assertNever` exhaustiveness") — covers SPEC AC #24

#### U-m4b-011

Target file: `lib/data.test.ts`
**GIVEN** a goal brick `{ id: "g1", count: 0, target: 0 }` (degenerate `target === 0` case)
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }`
**THEN** the returned state is the same reference as the input (clamp at the degenerate boundary).
Proves: plan.md § Edge cases ("`target === 0` (degenerate user input)") — defensive coverage

#### U-m4b-012

Target file: `lib/longPress.test.ts`
**GIVEN** the module `lib/longPress.ts` exporting named constants `HOLD_MS` and `INTERVAL_MS`
**WHEN** the constants are imported and read
**THEN** `HOLD_MS === 500` AND `INTERVAL_MS === 50` (literal equality, not `>=`).
Proves: plan.md § Long-press / auto-repeat strategy ("`HOLD_MS = 500`, `INTERVAL_MS = 50`") + SG-m4b-02 lock — pins the timing constants numerically

#### U-m4b-013

Target file: `lib/longPress.test.ts`
**GIVEN** `vi.useFakeTimers()` is active and the `useLongPressRepeat` hook is mounted (via `renderHook`) with an `onTick` spy and `enabled: true`
**WHEN** the returned `onPointerDown` is invoked, then `vi.advanceTimersByTime(500)` (HOLD_MS), then `vi.advanceTimersByTime(50)` repeated 3 times, then `onPointerUp` is invoked, then `vi.advanceTimersByTime(500)` more
**THEN** `onTick` was called: 1 × on `pointerdown` (initial), then 1 × at `t = 500 ms` (auto-repeat starts), then 3 × at 50 ms intervals, total 5 calls; **after** `pointerup`, no further calls fire even after the additional 500 ms wait.
Proves: plan.md § Long-press / auto-repeat strategy ("on `pointerdown`, … (a) immediately calls `onTick()`, … (c) `setInterval(intervalMs)` … On `pointerup` … both timers are cleared") — covers SPEC AC #10, #11

#### U-m4b-014

Target file: `lib/longPress.test.ts`
**GIVEN** `useLongPressRepeat` mounted with `onTick` spy and `enabled: true`, fake timers active, `onPointerDown` invoked, then `vi.advanceTimersByTime(700)` (past HOLD_MS, into auto-repeat)
**WHEN** the hook is re-rendered (or its prop) with `enabled: false`, then `vi.advanceTimersByTime(200)`
**THEN** no further `onTick` calls fire after the `enabled: false` flip; the in-flight interval is cleared proactively.
Proves: plan.md § Long-press / auto-repeat strategy ("when the button becomes disabled during a held press … the hook clears its timers proactively") + § Cross-cutting concerns #7 — covers SPEC AC #11 (auto-repeat stops on cap)

### Component (Vitest + Testing Library)

#### C-m4b-001

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ kind: "goal", id: "g1", name: "pushups", count: 2, target: 10, unit: "reps" }` and an `onGoalLog` spy
**WHEN** the rendered DOM is queried by role
**THEN** there are exactly two `<button>` elements inside the chip: one with accessible name `"Decrease pushups"` and one with accessible name `"Increase pushups"`. The outer chip wrapper is a `<div role="group">` (not a `<button>`); a flex layout positions title left, then `−`, then a centered numeric badge, then `+`.
Proves: plan.md § Components > BrickChip ("DOM shape for `kind === \"goal\"`: outer `<div role=\"group\">` … (c) the two stepper buttons") + SG-m4b-01 (flanking layout) — covers SPEC AC #1 (controls render), #21 (aria-labels)

#### C-m4b-002

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered for a goal brick at the M3/M4a chip layout, in a fixed-width container
**WHEN** `getBoundingClientRect()` is read on the `−` `<button>` and the `+` `<button>` (or `getComputedStyle().minWidth` / `.minHeight` is read)
**THEN** each control has both `min-width` ≥ 44 (px) and `min-height` ≥ 44 (px) per ADR-031.
Proves: plan.md § Components > BrickChip ("each button is its own `<button type=\"button\">` with `min-width: 44px`, `min-height: 44px`") + § Decisions to honor (ADR-031) — covers SPEC AC #1

#### C-m4b-003

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 0, target: 10 }`
**WHEN** the DOM is queried for the `−` and `+` buttons
**THEN** the `−` button has the `disabled` attribute set; the `+` button does NOT have `disabled`.
Proves: plan.md § Components > BrickChip ("`−` is `disabled` … when `count === 0`") — covers SPEC AC #3

#### C-m4b-004

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 10, target: 10 }`
**WHEN** the DOM is queried for the `−` and `+` buttons
**THEN** the `+` button has the `disabled` attribute set; the `−` button does NOT have `disabled`.
Proves: plan.md § Components > BrickChip ("`+` is `disabled` when `count === target`") — covers SPEC AC #3

#### C-m4b-005

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, an `onGoalLog` spy, and `lib/haptics.light` mocked
**WHEN** the user fires a single tap (`pointerdown` → `pointerup` within < 500 ms) on the `+` button
**THEN** `onGoalLog` is called exactly once with `("g1", 1)`; `haptics.light` is called exactly once; `haptics.medium` is NOT called.
Proves: plan.md § Components > BrickChip ("`pointerdown` on `+` → `haptics.light()` + `onGoalLog?.(brick.id, 1)` synchronously") — covers SPEC AC #4, #8

#### C-m4b-006

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, an `onGoalLog` spy, and `lib/haptics.light` mocked
**WHEN** the user fires a single tap on the `−` button
**THEN** `onGoalLog` is called exactly once with `("g1", -1)`; `haptics.light` is called exactly once; `haptics.medium` is NOT called.
Proves: plan.md § Components > BrickChip (decrement path mirrored) — covers SPEC AC #5, #8

#### C-m4b-007

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 10, target: 10 }` (at cap), `onGoalLog` and `lib/haptics.light` / `lib/haptics.medium` spies
**WHEN** the user attempts to tap the `+` button (the chip's renderer must allow the haptic-classifier path to fire even though the underlying `<button disabled>` would normally swallow `pointerdown`; per plan.md the chip computes the clamp-haptic decision **before** dispatch — verify this by simulating the press path the renderer uses)
**THEN** `onGoalLog` is NOT called (clamp path); `haptics.light` is NOT called; `haptics.medium` IS called exactly once.
Proves: plan.md § Components > BrickChip ("each clamp tick fires `medium` … computed from `brick.count` and `delta` against `[0, target]` **before** dispatch") + SG-m4b-05 — covers SPEC AC #9

#### C-m4b-008

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 0, target: 10 }` (at floor) and `haptics` spies
**WHEN** the chip's renderer evaluates a `−` press through the same clamp-haptic-before-dispatch path
**THEN** `onGoalLog` is NOT called; `haptics.light` is NOT called; `haptics.medium` IS called exactly once.
Proves: plan.md § Components > BrickChip (clamp-haptic, decrement at floor) + SG-m4b-05 — covers SPEC AC #9

#### C-m4b-009

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10, unit: "reps" }` (unit non-empty) and again with `{ count: 3, target: 10, unit: "" }` (unit empty)
**WHEN** the badge text content is read for each render
**THEN** the first renders `"3 / 10 reps"` (single space separator before unit); the second renders `"3 / 10"` with no trailing whitespace.
Proves: plan.md § Components > BrickChip ("Badge text format: `\"${count} / ${target}${unit ? ' ' + unit : ''}\"`") + § Edge cases ("`unit` is empty string") — covers SPEC AC #7

#### C-m4b-010

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10 }` and `useReducedMotion()` stubbed `false`
**WHEN** the `data-testid="brick-fill"` div is inspected
**THEN** its computed (or inline) `width` is `30%` and its `transition` includes `width 600ms ease-in-out` (M3 token `brickFill`).
Proves: plan.md § Components > BrickChip ("Chip foreground gradient width = `(count / target) × 100%`") + § Visual cascade step 3 — covers SPEC AC #6

#### C-m4b-011

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same goal chip as C-m4b-010 but with `useReducedMotion()` stubbed `true`
**WHEN** the `data-testid="brick-fill"` div is inspected
**THEN** its `transition` for `width` is `none` (or `0ms`) — fill animation collapses to instant; `width` is still `30%`.
Proves: plan.md § Reduced motion ("Chip foreground gradient `width` transition: collapses to `none`") — covers SPEC AC #20

#### C-m4b-012

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, `vi.useFakeTimers()` active, `onGoalLog` spy, `haptics.light` mocked
**WHEN** the user dispatches a `pointerdown` on `+`, then `vi.advanceTimersByTime(500)` (HOLD_MS), then `vi.advanceTimersByTime(50)` four times (auto-repeat ticks), then `pointerup`
**THEN** `onGoalLog` is called 1 (initial) + 1 (HOLD_MS auto-repeat start) + 4 (interval ticks) = 6 times, all with `("g1", 1)`; `haptics.light` is called 6 times; `haptics.medium` is never called (no clamp).
Proves: plan.md § Long-press / auto-repeat strategy + § Components > BrickChip (long-press wired) — covers SPEC AC #10, #13

#### C-m4b-013

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same harness as C-m4b-012, mid-burst at 4 auto-repeat ticks
**WHEN** the user dispatches `pointerup` on the `+` button, then `vi.advanceTimersByTime(500)` more
**THEN** no additional `onGoalLog` calls fire after `pointerup`; haptic call count freezes at the pre-release count.
Proves: plan.md § Long-press / auto-repeat ("On `pointerup`, `pointercancel`, or `pointerleave`, both timers are cleared") + § Edge cases ("Long-press release mid-burst: all timers cleared within one frame") — covers SPEC AC #11

#### C-m4b-014

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10 }`, `useReducedMotion()` stubbed `false`, `vi.useFakeTimers()` active
**WHEN** an auto-repeat tick fires (the chip's internal scale-press flag should set, then clear after ~80 ms)
**THEN** at the moment of tick the active stepper button's `transform` (or a corresponding state-driven class) reflects `scale(0.95)`; after `vi.advanceTimersByTime(80)`, the transform returns to `scale(1)`. The non-active stepper button's transform is unaffected.
Proves: plan.md § Components > BrickChip ("`transform: scale(0.95)` for ~80 ms, returning to `scale(1)` on the active stepper button only") + SG-m4b-03 — covers SPEC AC #20 (visual feedback path)

#### C-m4b-015

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same harness as C-m4b-014 but with `useReducedMotion()` stubbed `true`
**WHEN** an auto-repeat tick fires
**THEN** no `transform: scale(0.95)` is applied to either stepper button at any point; `haptics.light` and `onGoalLog` continue to fire normally.
Proves: plan.md § Reduced motion ("Long-press scale-press visual feedback (M4b new): suppressed under `prefers-reduced-motion: reduce`. Haptics + dispatch unaffected") + SG-m4b-03 — covers SPEC AC #20

#### C-m4b-016

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, `onGoalLog` spy, `vi.useFakeTimers()` active
**WHEN** the user fires a keyboard `Enter` (and separately a `Space`) on the `+` button, then `vi.advanceTimersByTime(2000)`
**THEN** `onGoalLog` is called exactly once per activation (one for Enter, one for Space — total 2); no auto-repeat ticks fire from keyboard activation even after 2 s of advanced time.
Proves: plan.md § Components > BrickChip ("native `<button>` already handles Enter and Space … keyboard does NOT auto-repeat") — covers SPEC AC #22

#### C-m4b-017

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ name: "pushups", count: 3, target: 10, unit: "reps" }`
**WHEN** the DOM is queried by accessible name
**THEN** the `−` button's `aria-label` is exactly `"Decrease pushups"`; the `+` button's `aria-label` is exactly `"Increase pushups"`; the lucide `Minus` / `Plus` icon glyphs each carry `aria-hidden="true"`.
Proves: plan.md § A11y ("`aria-label=\"Decrease ${brick.name}\"` / `\"Increase ${brick.name}\"`") + AC #21 quote — covers SPEC AC #21

#### C-m4b-018

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick `<BrickChip>` (M4a brick `{ kind: "tick", done: false }`) rendered alongside an `onGoalLog` spy and an `onTickToggle` spy
**WHEN** the chip's tick `<button>` is clicked
**THEN** `onTickToggle` is called once with the brick id; `onGoalLog` is NOT called; the rendered chip remains a single `<button>` (not the goal `<div role="group">` shape).
Proves: plan.md § File structure (`components/BrickChip.tsx` row — "Tick chips remain a single `<button>` exactly as M4a") — covers SPEC AC #18 (regression check)

#### C-m4b-019

Target file: `components/BrickChip.test.tsx`
**GIVEN** a time `<BrickChip>` (M3-shape brick `{ kind: "time", elapsedMs: 0, durationMs: 600000 }`) rendered with `onGoalLog` and `onTickToggle` spies
**WHEN** the chip is clicked and a `+` / `−` query is attempted
**THEN** neither spy is called; no `−` or `+` button is found in the chip's subtree (time chip is still a single inert `<button>` per M3 / M4a).
Proves: plan.md § File structure ("time chips remain a single inert `<button>` with `cursor: default`") + § Out of scope — covers SPEC AC #19 (regression check)

#### C-m4b-020

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered with a block containing a goal brick and an `onGoalLog` spy threaded as a prop
**WHEN** the inner goal `<BrickChip>`'s `+` button is clicked
**THEN** `onGoalLog` is called with the brick's id and `delta: 1`; the prop is threaded through unchanged (no in-component dispatch).
Proves: plan.md § Components > TimelineBlock ("Threads `onGoalLog` to each `<BrickChip>`") — covers SPEC AC #4 (threading)

#### C-m4b-021

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray>` rendered with one loose goal brick and an `onGoalLog` spy threaded as a prop
**WHEN** the inner goal chip's `+` button is clicked
**THEN** `onGoalLog` is called with the loose brick's id and `delta: 1`.
Proves: plan.md § Components > Timeline + LooseBricksTray ("Pass-through prop only … threads it to each `<BrickChip>`") — covers SPEC AC #4 (loose goal path)

#### C-m4b-022

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient>` rendered with a state where `dayPct(state) === 99` because exactly one goal brick is at `count: target − 1`, and `playChime` + `haptics.notification` spies
**WHEN** the user clicks `+` on that goal brick (real user gesture through the threaded `onGoalLog`)
**THEN** the `LOG_GOAL_BRICK` dispatch fires; `dayPct` recomputes to 100; `useCrossUpEffect` fires `fireDayComplete`; `haptics.notification` is called once; `playChime` is called once; `<Fireworks active={true} />` is rendered.
Proves: plan.md § Components > BuildingClient (day-100 wiring reused for goal path) + § Visual cascade step 8 — covers SPEC AC #16

### E2E (Playwright)

#### E-m4b-001

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app at `/` seeded (via `addInitScript` test fixture) with one block containing one goal brick `{ id: "g1", count: 0, target: 10, unit: "reps" }`, block expanded
**WHEN** the user taps the `+` stepper button once
**THEN** within one frame the chip's `data-testid="brick-fill"` width animates toward `10%`; the badge text updates to `"1 / 10 reps"`; the block scaffold left-bar height grows; the HeroRing arc length grows; the BlueprintBar segment opacity for that block increases.
Proves: plan.md § Visual cascade — covers SPEC AC #4, #6, #7, #14

#### E-m4b-002

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the same fixture as E-m4b-001 but seeded at `count: 5`
**WHEN** the user taps the `−` stepper button once
**THEN** the chip's brick-fill width animates from `50%` down to `40%`; the badge updates to `"4 / 10 reps"`; cascade visuals shrink correspondingly.
Proves: plan.md § Visual cascade (decrement path) — covers SPEC AC #5, #6, #7

#### E-m4b-003

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick `{ count: 0, target: 10 }`, block expanded
**WHEN** the user presses the `+` button at `t=0`, holds, and `expect.poll`s the badge text against successive checkpoints (`t=550 ms` → `"2 / 10"` (initial + 1 auto-repeat), `t=600 ms` → `"3 / 10"`, etc.) with ±20 ms tolerance
**THEN** auto-repeat ticks fire approximately 50 ms apart after the 500 ms hold threshold; each polled checkpoint observes the count incrementing by ~1 per 50 ms window.
Proves: plan.md § Long-press / auto-repeat strategy — covers SPEC AC #10, #13

#### E-m4b-004

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick `{ count: 8, target: 10 }`, block expanded
**WHEN** the user presses and holds the `+` button continuously for ~1.5 s
**THEN** within ~600 ms the badge text reads `"10 / 10"` and the brick-fill width is `100%`; for the remainder of the hold the badge does NOT advance past `10`; the `+` button has the `disabled` attribute set.
Proves: plan.md § Edge cases ("Long-press at `count === target − 1`: first auto-repeat tick brings count to `target`; subsequent interval fires would be clamps but the `disabled` short-circuit … prevents any churn") — covers SPEC AC #11

#### E-m4b-005

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a block containing one goal brick `{ count: 9, target: 10 }` (one tap away from blockPct === 100), with the chime audio counter wired (`window.__chimePlays` per M4a pattern)
**WHEN** the user taps `+` once
**THEN** the block card receives a bloom animation class/data-attr; the chime counter increments by exactly 1 (block-100 path).
Proves: plan.md § Components > TimelineBlock ("a goal stepper push that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic") — covers SPEC AC #15

#### E-m4b-006

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a state where `dayPct(state) === 99` because exactly one goal brick is at `count: target − 1` (and no other incomplete bricks remain)
**WHEN** the user taps `+` once
**THEN** a fireworks overlay (`[data-testid="fireworks"]`) appears within one frame; after ~1.6 s (≤ 2.0 s wait) the overlay is unmounted (or its `active` flag is `false`).
Proves: plan.md § Components > BuildingClient (day-100 cross-up reused for goal path) — covers SPEC AC #16

#### E-m4b-007

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick at `count: 9, target: 10`, the user taps `+` once (block bloom fires), then taps `−` once (block drops to 90%, bloom not replayed), then taps `+` once again (block back to 100%)
**WHEN** the third tap completes
**THEN** the bloom animation class/data-attr re-applies on the block card (one-shot per crossing rule re-fires).
Proves: plan.md § Visual cascade step 9 ("Cross-down via `−` resets the gate; re-cross-up replays celebration") — covers SPEC AC #17

#### E-m4b-008

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the page emulated at mobile viewport `430 × 932`, seeded with a goal brick `{ name: "pushups", count: 0, target: 99, unit: "reps" }` (long-ish text), block expanded
**WHEN** the chip is queried and the steppers are tapped
**THEN** `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow on `<body>`); the `−` and `+` buttons are visually present, do NOT overlap the badge or fill gradient, and remain tappable.
Proves: plan.md § File structure ("Layout: title flex-1 left-aligned; then `−` button; then badge … then `+` button") + SG-m4b-01 — covers SPEC AC #2

#### E-m4b-009

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with one tick brick (`{ kind: "tick", done: false }`) AND one goal brick (`{ count: 2, target: 5 }`) AND one time brick (`{ kind: "time", elapsedMs: 0 }`) all in one block
**WHEN** the user taps the tick chip's surface, then taps the time chip's surface
**THEN** the tick chip toggles `aria-pressed` from `"false"` to `"true"` and fills (M4a behavior preserved); the time chip's badge does NOT change and no timer starts (M3/M4a inert behavior preserved); the goal chip's count is unaffected by either tap.
Proves: plan.md § File structure (tick/time chip preservation) — covers SPEC AC #18, #19

#### E-m4b-010

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the browser context with `prefers-reduced-motion: reduce` emulated, app seeded with a goal brick `{ count: 4, target: 5 }`
**WHEN** the user presses and holds `+` for ~700 ms (past HOLD_MS)
**THEN** the brick-fill `width` transition is `none` (animation snaps to each new value); during the hold no `transform: scale(0.95)` is applied to either stepper button at any frame; haptics (mocked `window.__hapticsLog`) and dispatch counter still increment normally; the brick reaches `count: 5` and the cap-bloom (block-100 path if applicable) chime counter increments.
Proves: plan.md § Reduced motion (full M4b reduced-motion contract) — covers SPEC AC #20

### Accessibility (axe via Playwright)

#### A-m4b-001

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view rendered with at least one tick brick, one goal brick (at intermediate `count`), and one time brick visible (mixed kinds, deterministic fixture via `addInitScript` — no count guards)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config.
Proves: plan.md § A11y ("axe-core target per AC #23: zero violations on the building view with at least one goal brick rendered") — covers SPEC AC #23

#### A-m4b-002

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ name: "pushups", count: 3, target: 10 }` (deterministic fixture)
**WHEN** the page DOM is inspected
**THEN** the `−` button has `aria-label="Decrease pushups"`; the `+` button has `aria-label="Increase pushups"`; the outer wrapper has `role="group"` with an aria-label that includes the brick name and the goal context (`"…, goal, … of …"` per plan.md § Components).
Proves: plan.md § A11y (full ARIA contract) + SG-m4b-01 — covers SPEC AC #21

#### A-m4b-003

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ count: 0, target: 10 }` (at floor) AND a separate goal brick `{ count: 10, target: 10 }` (at cap)
**WHEN** the page DOM is inspected
**THEN** the floor brick's `−` button has the `disabled` attribute AND is not in the keyboard tab order (browser default for `<button disabled>`); the cap brick's `+` button has the `disabled` attribute AND is not in the keyboard tab order; the still-enabled sibling button on each chip remains keyboard-tabbable and retains its accessible name.
Proves: plan.md § A11y ("`disabled` attribute removes the button from the tab order at the clamp boundary … chip remains visible and the user can keyboard-tab to the still-enabled sibling button") — covers SPEC AC #3, #21

#### A-m4b-004

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ count: 3, target: 10 }`, the page focused on `body`
**WHEN** the user presses Tab repeatedly until focus lands on the chip's `−` button, presses Enter, then presses Tab once more (lands on `+`), then presses Space
**THEN** each press fires exactly one dispatch (the badge shows `"2 / 10"` after Enter on `−`, then `"3 / 10"` after Space on `+`); both buttons are reachable in tab order; both activate via Enter and via Space.
Proves: plan.md § A11y ("native `<button>` semantics provide keyboard activation via Enter and Space; one tap = one dispatch") — covers SPEC AC #22

#### A-m4b-005

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick (deterministic fixture)
**WHEN** `getBoundingClientRect()` is read on the `−` and `+` buttons
**THEN** each button's measured height ≥ 44 px AND width ≥ 44 px (ADR-031 enforced by computed CSS).
Proves: plan.md § Decisions to honor (ADR-031 explicit) — covers SPEC AC #1

#### A-m4b-006

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick (`{ count: 0, target: 10 }`) — i.e., one stepper button is `disabled`
**WHEN** axe-core runs against the document
**THEN** zero violations are reported; in particular, the disabled button still exposes its accessible name (axe rule `button-name` passes) and the chip's outer `<div role="group">` is correctly recognized.
Proves: plan.md § A11y ("`disabled` controls retain accessible names" — anti-vacuous-pass: state is seeded so the disabled control is guaranteed to exist) — covers SPEC AC #23

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                                                          | Covering test IDs                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| #1  | Goal chip renders `−` and `+` controls; each ≥ 44 px tap target                                                                             | C-m4b-001, C-m4b-002, A-m4b-005                                                          |
| #2  | Controls don't overlap badge or fill at 430 px viewport (no overflow)                                                                       | E-m4b-008                                                                                |
| #3  | `−` disabled at `count === 0`; `+` disabled at `count === target` (visual + `disabled` attribute)                                           | C-m4b-003, C-m4b-004, A-m4b-003                                                          |
| #4  | Tap `+` dispatches `LOG_GOAL_BRICK` `delta: 1`; reducer increments + clamps                                                                 | U-m4b-001, U-m4b-005, U-m4b-006, U-m4b-009, C-m4b-005, C-m4b-020, C-m4b-021, E-m4b-001   |
| #5  | Tap `−` dispatches `LOG_GOAL_BRICK` `delta: -1`; reducer decrements + clamps                                                                | U-m4b-002, C-m4b-006, E-m4b-002                                                          |
| #6  | Brick-fill width animates `(count/target) × 100%` via `brickFill` (600 ms easeInOut)                                                        | C-m4b-010, E-m4b-001, E-m4b-002                                                          |
| #7  | Badge text format `"${count} / ${target}${unit ? ' ' + unit : ''}"` updates synchronously                                                   | C-m4b-009, E-m4b-001, E-m4b-002                                                          |
| #8  | Haptic `light` fires on every successful (non-clamped) tick                                                                                 | C-m4b-005, C-m4b-006                                                                     |
| #9  | Haptic `medium` fires on clamp (rejected tap at cap or floor)                                                                               | C-m4b-007, C-m4b-008                                                                     |
| #10 | Press-and-hold ≥ 500 ms triggers auto-repeat at ~50 ms intervals                                                                            | U-m4b-013, C-m4b-012, E-m4b-003                                                          |
| #11 | Auto-repeat stops on release OR on hitting cap                                                                                              | U-m4b-013, U-m4b-014, C-m4b-013, E-m4b-004                                               |
| #12 | Same long-press semantics apply to `−` (auto-repeats down to 0)                                                                             | U-m4b-013 (hook is symmetric), C-m4b-012 (same path used for `−` per plan.md), E-m4b-002 |
| #13 | Each auto-repeat tick fires `light` haptic; clamp tick fires `medium`                                                                       | C-m4b-012, C-m4b-007, C-m4b-008, E-m4b-003                                               |
| #14 | Cascade visuals (chip + scaffold + BlueprintBar + HeroRing) all update on the same render tick                                              | E-m4b-001                                                                                |
| #15 | Block 100% celebration fires on stepper-push cross-up (bloom + chime + `success` haptic)                                                    | E-m4b-005                                                                                |
| #16 | Day 100% celebration fires on stepper-push cross-up (fireworks + chime + `notification` haptic)                                             | C-m4b-022, E-m4b-006                                                                     |
| #17 | Cross-down via `−` then re-cross-up via `+` replays celebration (one-shot per crossing)                                                     | E-m4b-007                                                                                |
| #18 | Tick bricks render and behave identically to M4a (regression)                                                                               | U-m4b-007, C-m4b-018, E-m4b-009                                                          |
| #19 | Time bricks render identically to M3 (still inert)                                                                                          | U-m4b-008, C-m4b-019, E-m4b-009                                                          |
| #20 | Reduced-motion → fill instant; long-press visual feedback suppressed; haptics + audio unaffected                                            | C-m4b-011, C-m4b-014, C-m4b-015, E-m4b-010                                               |
| #21 | `−` / `+` aria-labels: `"Decrease ${name}"` / `"Increase ${name}"`                                                                          | C-m4b-001, C-m4b-017, A-m4b-002, A-m4b-003                                               |
| #22 | Keyboard-focusable; Enter/Space triggers same dispatch as a tap                                                                             | C-m4b-016, A-m4b-004                                                                     |
| #23 | axe-core: zero violations                                                                                                                   | A-m4b-001, A-m4b-006                                                                     |
| #24 | `tsc --noEmit`: zero new errors                                                                                                             | gate (composite — `npm run eval`); also U-m4b-010 (assertNever)                          |
| #25 | ESLint: zero new errors                                                                                                                     | gate (composite — `npm run eval`)                                                        |
| #26 | Vitest: reducer tests (incr/decr/clamp top/clamp bottom) + chip tests (controls / disabled / dispatch / long-press auto-repeat)             | U-m4b-001..014, C-m4b-001..022                                                           |
| #27 | Playwright: tap `+` on goal chip → fill + badge update; long-press → ~50 ms auto-repeat; cross-to-target → bloom; mobile 430 px no overflow | E-m4b-001, E-m4b-003, E-m4b-005, E-m4b-008                                               |

**Spec gaps surfaced for VERIFIER:** none. SG-m4b-01 through SG-m4b-05 are resolved in plan.md and reflected directly in the test IDs above. M4a deferred-cleanup items (U-m4a-009 prose drift, C-m4a-002 / C-m4a-003 prose, A-m4a-\* vacuous-pass guards, E-m4a-005 weak assertion) remain explicitly out of scope per plan.md § Migration / obsolete IDs and per the M4b TESTS dispatch prompt.
