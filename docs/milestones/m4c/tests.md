> **RETIRED** by M4f per ADR-043. M4c test IDs are explicitly retired and superseded.

## Milestone 4c — Time Brick Timer — Tests

This entry covers M4c — the third and final brick-logging verb (after M4a tick and M4b goal). Test ID prefixes:

- `U-m4c-` — unit (Vitest, no DOM): reducer arms, `lib/timer.ts` lifecycle with fake timers, `useLongPress` (sibling helper) lifecycle.
- `C-m4c-` — component (Vitest + Testing Library): `<BrickChip>` time variant, `<TimerSheet>`, `<BuildingClient>` wiring of the timer hook + sheet.
- `E-m4c-` — Playwright e2e (`tests/e2e/m4c.spec.ts`): tap-to-start / tap-to-stop, long-press → sheet, block-collapse independence, second-timer auto-stops first.
- `A-m4c-` — Playwright a11y (`tests/e2e/m4c.a11y.spec.ts`): axe-core zero violations on building view + open sheet, `aria-pressed` correctness, reduced-motion path.

E2E and a11y specs continue the **deferred-to-preview** pattern from M4a/M4b/M4d: tests live in `tests/e2e/m4c.*.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox (Playwright's chromium binary is missing in this environment — established M0..M4d pattern; flagged in `status.md` as vacuous-pass debt). A future TESTS-mode dispatch owes a deterministic seeding helper that lifts these guards across M4a/M4b/M4c/M4d in one pass; M4c does NOT introduce that helper (out of scope; would touch four prior test files).

The M4c surface is unit-heavy (reducer + timer hook + long-press helper) because the timer's correctness is a math + lifecycle problem, not a render problem. Component coverage focuses on the chip's two-gesture (tap vs long-press) routing and the sheet's clamp/save/cancel paths. E2E + a11y are thin (5 + 4 IDs) and explicitly preview-deferred.

### Unit (Vitest)

#### U-m4c-001

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: null` and a single `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 0 }`
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t1" })` is called
**THEN** the returned state has `runningTimerBrickId === "t1"`; the brick is unchanged (`minutesDone === 0`); all other fields (categories, blocks, looseBricks) preserve referential equality where their contents are unchanged.
Proves: plan.md § Locked schema additions ("`START_TIMER` writes the new id") + plan.md § Library modules ("Single-timer invariant enforcement") — covers SPEC AC #3.

#### U-m4c-002

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"` (timer A is running)
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t2" })` is called (start timer B)
**THEN** the returned state has `runningTimerBrickId === "t2"`; no separate `STOP_TIMER` was needed; both bricks' `minutesDone` are unchanged (whatever the last `TICK_TIMER` for `t1` wrote stays as A's captured value).
Proves: plan.md § Reducer arms ("the swap IS the stop") + plan.md § Edge cases ("Tap a stopped time chip while another timer is running") — covers SPEC AC #11.

#### U-m4c-003

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t1" })` is called (re-start the already-running brick — defensive idempotence)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); no spurious re-render is triggered.
Proves: plan.md § Reducer arms (`if (state.runningTimerBrickId === action.brickId) return state`) — covers SPEC AC #3 (invariant) by ruling out a duplicate-dispatch state churn.

#### U-m4c-004

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t1" })` is called
**THEN** the returned state has `runningTimerBrickId === null`.
Proves: plan.md § Reducer arms (`STOP_TIMER` clears the field) — covers SPEC AC #4.

#### U-m4c-005

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: null` (no timer running)
**WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t1" })` is called
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the no-op early return is hit.
**AND GIVEN** `state` with `runningTimerBrickId: "t1"`, **WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t2" })` is called (stop a non-running brick), **THEN** same-ref no-op (mismatched id branch).
Proves: plan.md § Reducer arms (two `STOP_TIMER` no-op branches) — covers SPEC § Edge cases (stopping a non-running brick is harmless).

#### U-m4c-006

Target file: `lib/data.test.ts`
**GIVEN** `state` containing one block with one `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 5 }` and `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "t1", minutesDone: 7 })` is called
**THEN** the returned state has the brick's `minutesDone === 7`; `runningTimerBrickId` unchanged at `"t1"`; the block array reference changed (one brick mutated → one block mutated → array re-rolled), but `state.categories` and `state.looseBricks` preserve referential equality.
Proves: plan.md § Reducer arms (`TICK_TIMER` writes minutes; array-identity preservation pattern) — covers SPEC AC #7.

#### U-m4c-007

Target file: `lib/data.test.ts`
**GIVEN** `state` with a `kind: "time"` brick whose `minutesDone === 7` and `runningTimerBrickId === "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "t1", minutesDone: 7 })` is called (no minute boundary crossed)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the identity short-circuit fired.
Proves: plan.md § Reducer arms ("Identity short-circuit when minutesDone is unchanged") + § Cross-cutting concerns #5 — covers SPEC § Edge cases (no spurious cross-up effect re-runs at 1 s tick cadence).

#### U-m4c-008

Target file: `lib/data.test.ts`
**GIVEN** `state` containing a `kind: "tick"` brick (NOT time) with `id: "tk1"`, plus a `kind: "time"` brick with `id: "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "tk1", minutesDone: 7 })` is called (wrong-kind id)
**THEN** the returned state is the **same reference** as the input state; the `b.kind !== "time"` guard fires; no field is mutated.
Proves: plan.md § Reducer arms (`apply` matches by `id` AND `kind === "time"`) — covers SPEC § Edge cases ("Brick id collision" defense-in-depth).

#### U-m4c-009

Target file: `lib/data.test.ts`
**GIVEN** `state` with one `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 5 }` (in `state.looseBricks` to also exercise the loose path)
**WHEN** `reducer(state, { type: "SET_TIMER_MINUTES", brickId: "t1", minutes: 12 })` is called (in-range)
**THEN** the brick's `minutesDone === 12`.
**AND** when `minutes: 30` is dispatched (overflow > durationMin), `minutesDone` clamps to `25`.
**AND** when `minutes: -3` is dispatched (under-zero), `minutesDone` clamps to `0`.
**AND** when `minutes: 12` is dispatched while `minutesDone === 12` already, the returned state is the same reference (identity short-circuit).
Proves: plan.md § Reducer arms (`SET_TIMER_MINUTES` clamp at `[0, durationMin]` + identity short-circuit) — covers SPEC AC #15, #18.

#### U-m4c-010

Target file: `lib/data.test.ts`
**GIVEN** any prior `state` shape used by M2/M3/M4a/M4b reducer tests
**WHEN** the test file is loaded under `tsc --noEmit`
**THEN** every `AppState` literal compiles only when it includes `runningTimerBrickId: null` (or a non-null id); the field is required (not optional). `defaultState()` returns a value with `runningTimerBrickId: null` (deep-equal); no other field changed.
Proves: plan.md § Locked schema additions (additive `runningTimerBrickId: string | null` extension) + plan.md § Migration / obsolete IDs — covers SPEC AC #31 (`tsc --noEmit` clean).

#### U-m4c-011

Target file: `lib/data.test.ts`
**GIVEN** the M4c-extended `Action` union
**WHEN** the reducer's `default` arm is reached with an action of type `"NOPE"` (cast through `any`)
**THEN** the call throws (`assertNever` exhaustiveness preserved across the four new union members `START_TIMER` / `STOP_TIMER` / `TICK_TIMER` / `SET_TIMER_MINUTES`).
Proves: plan.md § Cross-cutting concerns #6 (`assertNever` preserved) — covers SPEC AC #31.

#### U-m4c-012

Target file: `lib/timer.test.ts` (NEW)
**GIVEN** a test host that renders `useTimer(state, dispatch)` via `renderHook` from `@testing-library/react`, with `vi.useFakeTimers()` engaged and `vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"))`; initial state has `runningTimerBrickId: null` and a `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 0 }`
**WHEN** the hook is re-rendered with `runningTimerBrickId: "t1"` (timer started), then `vi.advanceTimersByTime(60_000)` (one minute)
**THEN** `dispatch` is called exactly once with `{ type: "TICK_TIMER", brickId: "t1", minutesDone: 1 }` (the floor of 60_000 / 60_000 + initialMinutesDone 0).
**AND** `dispatch` is NOT called for any of the 59 sub-minute interval ticks (the `lastDispatchedMinutesRef` short-circuit fired 59 times).
Proves: plan.md § Library modules > `useTimer` (interval starts on `runningTimerBrickId` non-null; `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`; identity short-circuit) — covers SPEC AC #5, #6.

#### U-m4c-013

Target file: `lib/timer.test.ts`
**GIVEN** the same test host, `vi.useFakeTimers()`, `runningTimerBrickId: "t1"` for two simulated minutes (so `dispatch` has been called twice)
**WHEN** the host re-renders with `runningTimerBrickId: null` (timer stopped), then `vi.advanceTimersByTime(120_000)` (two more minutes)
**THEN** `dispatch` is called **zero** additional times (interval torn down by `useEffect` cleanup).
Proves: plan.md § Library modules ("Stops the interval when `runningTimerBrickId === null`") — covers SPEC AC #5.

#### U-m4c-014

Target file: `lib/timer.test.ts`
**GIVEN** the test host with `runningTimerBrickId: "t1"`, `vi.useFakeTimers()` active, `vi.setSystemTime` set
**WHEN** the test simulates tab-background by NOT advancing wall-clock (`Date.now()` jumps via a second `vi.setSystemTime` to +120_000 ms) without firing intervals, then dispatches a synthetic `document.visibilityState = "visible"` + `document.dispatchEvent(new Event("visibilitychange"))`
**THEN** `dispatch` is called once with `{ type: "TICK_TIMER", brickId: "t1", minutesDone: 2 }` (the corrective tick computed from `Date.now() - startedAt`).
Proves: plan.md § Library modules ("`visibilitychange` listener dispatches a corrective `TICK_TIMER` on `visible`") — covers SPEC AC #24.

#### U-m4c-015

Target file: `lib/timer.test.ts`
**GIVEN** the hook running for `t1` with `minutesDone: 0`, `vi.useFakeTimers()` engaged, two minutes simulated (so `lastDispatchedMinutesRef === 2`)
**WHEN** the host re-renders with the same `runningTimerBrickId: "t1"` but the brick's `minutesDone` updated to `10` (a `SET_TIMER_MINUTES` happened mid-run); `vi.advanceTimersByTime(60_000)`
**THEN** the next `TICK_TIMER` dispatched carries `minutesDone: 11` (new floor `10` + one elapsed minute since the effect re-ran and re-captured `startedAt`); not `3` (would be the bug — keeping the old base) and not `10` (would be no-op — but a minute elapsed).
Proves: plan.md § Edge cases ("Manual entry while running" — effect re-runs and captures new `initialMinutesDoneRef`) + plan.md § Components > `<TimerSheet>` ("Save updates `minutesDone`; the next tick computes from the new floor") — covers SPEC AC #16.

#### U-m4c-016

Target file: `lib/longPress.test.ts`
**GIVEN** a test component that consumes `useLongPress({ holdMs: 500, onTap, onLongPress })` (the new sibling helper) and renders a `<button>` with the returned pointer handlers; `vi.useFakeTimers()` engaged
**WHEN** the test fires `pointerdown` on the button, then `pointerup` after `vi.advanceTimersByTime(200)` (under threshold)
**THEN** `onTap` is called exactly once; `onLongPress` is NOT called.
**AND** in a second render, when `pointerdown` is fired and `vi.advanceTimersByTime(500)` elapses without `pointerup`, `onLongPress` is called exactly once.
**AND** in a third render, when `pointerdown` is followed by 500 ms elapse (firing `onLongPress`) THEN `pointerup`, `onTap` is NOT called (the consumed-ref guard fired).
**AND** in a fourth render, when `pointerdown` is followed by 200 ms then `pointercancel`, neither callback fires.
**AND** in a fifth render, when the host unmounts mid-press, the timeout is cleared (no callback fires after unmount).
Proves: plan.md § Library modules ("`useLongPress` — single-fire hook") + § Cross-cutting concerns #9 (click suppression) — covers SPEC AC #13 (long-press threshold), AC #1 / #2 (tap not double-firing).

### Component (Vitest + Testing Library)

#### C-m4c-001

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"t1", kind:"time", durationMin:25, minutesDone:5, name:"Read", categoryId:null, parentBlockId:null }} categories={[]} running={false} onTimerToggle={vi.fn()} onTimerOpenSheet={vi.fn()} />` rendered
**WHEN** the DOM is queried
**THEN** there is exactly one `<button>` (whole-chip tap target); it has `aria-pressed="false"`; the rendered glyph is the lucide `Play` icon (▶); the badge text is `"5 / 25 m"`; the chip's accessible name is `"Read, 5 of 25 minutes, stopped, tap to start"` (per AC #28).
Proves: plan.md § Components > `<BrickChip>` time variant (Play glyph when stopped; AC #28 aria-label string) — covers SPEC AC #9, #28, #29.

#### C-m4c-002

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same chip but with `running={true}` and `minutesDone: 12`
**WHEN** the DOM is queried
**THEN** `aria-pressed="true"`; the glyph is the lucide `Pause` icon (⏸); the badge text is `"12 / 25 m"`; the accessible name is `"Read, 12 of 25 minutes, running, tap to stop"`.
Proves: plan.md § Components > `<BrickChip>` time variant (Pause glyph when running; AC #28 running variant) — covers SPEC AC #9, #28, #29.

#### C-m4c-003

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip with `running={false}`, `onTimerToggle` and `onTimerOpenSheet` spies, `lib/haptics` mocked, `vi.useFakeTimers()` engaged
**WHEN** the user fires `pointerdown` then `pointerup` within < 500 ms (a tap)
**THEN** `onTimerToggle` is called exactly once with `"t1"`; `onTimerOpenSheet` is NOT called; `haptics.light` is called exactly once.
Proves: plan.md § Components > `<BrickChip>` ("Tap behaviour: `onClick` fires `haptics.light()` then `onTimerToggle?.(brick.id)`") — covers SPEC AC #1, #10.

#### C-m4c-004

Target file: `components/BrickChip.test.tsx`
**GIVEN** a running time chip with `running={true}`
**WHEN** the user taps the chip (pointerdown + pointerup < 500 ms)
**THEN** `onTimerToggle` is called once with `"t1"`; `haptics.light` is called once. (The parent decides `START_TIMER` vs `STOP_TIMER` based on `state.runningTimerBrickId === brick.id` — see C-m4c-013.)
Proves: plan.md § Components > `<BrickChip>` ("parent decides which action") — covers SPEC AC #2, #10.

#### C-m4c-005

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip, `onTimerToggle` and `onTimerOpenSheet` spies, `lib/haptics` mocked, `vi.useFakeTimers()` engaged
**WHEN** the user fires `pointerdown` and then `vi.advanceTimersByTime(500)` elapses without `pointerup` (then `pointerup` fires)
**THEN** `onTimerOpenSheet` is called exactly once with `"t1"`; `onTimerToggle` is NOT called; `haptics.medium` is called exactly once (the long-press lift haptic).
Proves: plan.md § Components > `<BrickChip>` ("Long-press behaviour: `onLongPress` calls `haptics.medium()` and `onTimerOpenSheet`") — covers SPEC AC #13.

#### C-m4c-006

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip rendered with `useReducedMotion()` mocked to return `true`
**WHEN** the chip is inspected for the running-state pulse animation (when re-rendered with `running={true}`)
**THEN** no `transform` or scale animation is applied (computed style or motion-class absent); the glyph is static. The badge and `aria-pressed` still update normally.
Proves: plan.md § Reduced motion ("Chip running-state pulse: suppressed under `prefers-reduced-motion`") — covers SPEC AC #27.

#### C-m4c-007

Target file: `components/TimerSheet.test.tsx` (NEW)
**GIVEN** `<TimerSheet open={true} brick={{ id:"t1", kind:"time", durationMin:25, minutesDone:8, ... }} onSave={onSave} onCancel={onCancel} />` rendered
**WHEN** the DOM is queried
**THEN** the sheet has `role="dialog"` with title `"Set minutes"`; the `<input type="number">` has `aria-label="Minutes done"`, `min="0"`, `max="25"`, `step="1"`, and a defaultValue of `"8"`; there are exactly two action buttons with accessible names `"Save minutes"` and `"Cancel"`, each with `min-height ≥ 44px`.
Proves: plan.md § Components > `<TimerSheet>` (DOM structure + a11y) — covers SPEC AC #14.

#### C-m4c-008

Target file: `components/TimerSheet.test.tsx`
**GIVEN** `<TimerSheet open={true} brick={{ ..., durationMin:25, minutesDone:8 }} onSave={onSave} onCancel={onCancel} />` with `lib/haptics` mocked
**WHEN** the user types `"15"` into the input and clicks Save
**THEN** `onSave` is called exactly once with `15` (a parsed integer); `onCancel` is NOT called; `haptics.medium` is NOT called (no clamp triggered).
Proves: plan.md § Components > `<TimerSheet>` (Save → parsed integer → onSave) — covers SPEC AC #15.

#### C-m4c-009

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the same sheet, `lib/haptics` mocked
**WHEN** the user types `"30"` (overflow — durationMin is 25) and clicks Save
**THEN** `onSave` is called exactly once with `25` (the clamp from the sheet's pre-dispatch logic); `haptics.medium` is called exactly once **before** `onSave` (the clamp cue).
Proves: plan.md § Components > `<TimerSheet>` ("If the parsed value (pre-clamp) was > durationMin, fire haptics.medium() BEFORE calling onSave") — covers SPEC AC #18.

#### C-m4c-010

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the same sheet, `lib/haptics` mocked
**WHEN** the user types `"-3"` (under-zero) and clicks Save
**THEN** `onSave` is called exactly once with `0` (silent clamp); `haptics.medium` is NOT called (under-zero is silent per plan § Edge cases).
**AND** when the input is left blank (NaN) and Save is clicked, `onSave` is called with `0` (the `Number()`-NaN-fallback path).
Proves: plan.md § Components > `<TimerSheet>` (`Math.max(0, Math.min(durationMin, parsedValue))` + NaN fallback) — covers SPEC § Edge cases (manual entry < 0).

#### C-m4c-011

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the sheet open with the input pre-filled to `"8"`
**WHEN** the user types into the input then clicks Cancel
**THEN** `onCancel` is called exactly once; `onSave` is NOT called.
Proves: plan.md § Components > `<TimerSheet>` (Cancel discards) — covers SPEC AC #17.

#### C-m4c-012

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the sheet open, focus initially on the body
**WHEN** the user presses Tab repeatedly
**THEN** focus cycles input → Save → Cancel → input (focus trap mirrors the M4d `<AddChooserSheet>` pattern). Shift+Tab cycles in reverse.
Proves: plan.md § Components > `<TimerSheet>` ("Focus trap follows the M4d AddChooserSheet pattern") — covers SPEC AC #30 (a11y baseline).

#### C-m4c-013

Target file: `app/(building)/BuildingClient.m4c.test.tsx` (NEW dedicated file per the M4b precedent)
**GIVEN** `<BuildingClient />` rendered with `defaultState()` mocked to seed one block containing one `kind: "time"` brick `{ id:"t1", durationMin:25, minutesDone:0 }`, `runningTimerBrickId: null`
**WHEN** the user taps the rendered time chip
**THEN** the reducer dispatches `{ type: "START_TIMER", brickId: "t1" }` (verified by spying `dispatch` or by re-querying the DOM and asserting `aria-pressed="true"` post-tap); the chip's glyph flips to Pause.
**AND** when the user taps the same chip again, the reducer dispatches `{ type: "STOP_TIMER", brickId: "t1" }`; the glyph flips back to Play.
Proves: plan.md § Components > `<BuildingClient>` (`handleTimerToggle` decides START vs STOP off `state.runningTimerBrickId === brickId`) — covers SPEC AC #1, #2, #10.

#### C-m4c-014

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with two time bricks `t1` and `t2` seeded, `runningTimerBrickId: "t1"`, `vi.useFakeTimers()` engaged
**WHEN** the user taps the chip for `t2`
**THEN** the chip for `t1` shows `aria-pressed="false"` and the Play glyph; the chip for `t2` shows `aria-pressed="true"` and the Pause glyph; only one chip in the DOM has `aria-pressed="true"` (single-running invariant verified at the UI level).
Proves: plan.md § Library modules ("Single-timer invariant enforcement") + plan.md § Edge cases ("Tap a stopped time chip while another timer is running") — covers SPEC AC #11, #12.

#### C-m4c-015

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with `runningTimerBrickId: null` and one time brick `t1`, `lib/timer`'s `useTimer` exported, `vi.useFakeTimers()` engaged with `vi.setSystemTime`
**WHEN** the user taps `t1` (start), then `vi.advanceTimersByTime(60_000)`, then re-renders the DOM
**THEN** the chip's badge text reads `"1 / 25 m"` (the reducer received the `TICK_TIMER` from the live `useTimer` hook); `aria-pressed` remains `"true"`.
Proves: plan.md § Components > `<BuildingClient>` (`useTimer(state, dispatch)` called once near the top) + plan.md § Visual cascade — covers SPEC AC #5, #6, #7, #19.

#### C-m4c-016

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with `runningTimerBrickId: "t1"`, `vi.useFakeTimers()`, the timer running for one minute (so the chip is rendered in a parent block)
**WHEN** the parent block is collapsed (the chip is unmounted from the DOM), then `vi.advanceTimersByTime(120_000)`, then the block is re-expanded (chip remounts)
**THEN** the chip's badge reads `"3 / 25 m"` (the timer ticked while the chip was unmounted — `lib/timer.ts` is unaware of expand/collapse). `aria-pressed="true"` on the remounted chip.
Proves: plan.md § Edge cases ("Block expand / collapse during a running timer") — covers SPEC AC #22, #23.

#### C-m4c-017

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with one time brick, `vi.useFakeTimers()` engaged
**WHEN** the user long-presses the chip (`pointerdown` + 500 ms elapse + `pointerup`)
**THEN** `<TimerSheet>` is open in the DOM (`role="dialog"` with title `"Set minutes"` queryable); the input is pre-filled with the brick's current `minutesDone`.
**AND** when the user types `"30"` and clicks Save, the sheet closes; the brick's `minutesDone` becomes `25` (clamped); `haptics.medium` was called once.
**AND** when the user long-presses again and clicks Cancel, the sheet closes; no further dispatch.
Proves: plan.md § Components > `<BuildingClient>` (`handleTimerOpenSheet` + `handleTimerSave` + `handleTimerCancel` wiring) — covers SPEC AC #13, #14, #15, #17, #18.

#### C-m4c-018

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with one time brick `t1` running, `minutesDone: 5`, `vi.useFakeTimers()` engaged
**WHEN** the user long-presses to open the sheet, types `"10"`, clicks Save, then `vi.advanceTimersByTime(60_000)` elapses
**THEN** the brick's `minutesDone` becomes `11` (10 from the manual save + 1 elapsed minute). The timer was NOT stopped by the manual entry; `runningTimerBrickId === "t1"` throughout.
Proves: plan.md § Components > `<TimerSheet>` ("The sheet does NOT stop the timer when opened" + "running timer's next tick computes a NEW startedAt-based delta from the new minutesDone floor") — covers SPEC AC #16.

#### C-m4c-019

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered standalone with one time brick, `runningTimerBrickId="t1"`, `onTimerToggle` and `onTimerOpenSheet` spies threaded as props
**WHEN** the rendered chip is inspected
**THEN** the chip receives `running={true}` (because `"t1" === "t1"`); when the chip's `onTimerToggle` is invoked, the `onTimerToggle` spy on `<TimelineBlock>` is called with `"t1"` (pass-through plumbing).
**AND** when `runningTimerBrickId="t2"` (another brick), the chip receives `running={false}`.
Proves: plan.md § Components > `<TimelineBlock>` (pass-through props + `running` derived as `runningTimerBrickId === brick.id`) — covers SPEC AC #11.

#### C-m4c-020

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray>` rendered standalone with one time brick, `runningTimerBrickId="t1"`, the three new prop spies threaded
**WHEN** the chip is inspected and tapped
**THEN** the chip's `running={true}` (mirror of C-m4c-019 for the loose path); tap and long-press handlers invoke the threaded spies. Tick / goal chip behaviour is unchanged (regression: spying `onTickToggle` / `onGoalLog` still works for non-time bricks rendered alongside).
Proves: plan.md § Components > `<LooseBricksTray>` (pass-through plumbing) + § Migration / obsolete IDs (M4a/M4b regression preserved) — covers SPEC AC #25, #26.

### E2E (Playwright) — deferred to preview

#### E-m4c-001

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with at least one `kind: "time"` brick rendered (under `if ((await chip.count()) > 0)` guard; preview has the brick seeded via the fixture path documented in `status.md`)
**WHEN** the user taps the chip
**THEN** the chip's accessible name updates from `…stopped, tap to start` to `…running, tap to stop`; the rendered glyph swaps from `Play` to `Pause`; `aria-pressed="true"` after tap.
Proves: plan.md § Components > `<BrickChip>` time variant (tap-to-start) — covers SPEC AC #1, #9, #28, #29.

#### E-m4c-002

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one running time brick (chip has `aria-pressed="true"` after E-m4c-001's tap)
**WHEN** the user waits 5 seconds (`page.waitForTimeout(5_000)` — preview only; sandbox skips), then re-reads the badge
**THEN** the badge's `m` integer prefix reads no smaller than the pre-wait value; if 60 s+ wait is feasible in preview, the badge advances by 1 (or more) minutes. (Preview-only assertion; sandbox guards the count and skips.)
Proves: plan.md § Library modules > `useTimer` (1 s tick interval drives `TICK_TIMER`) + plan.md § Visual cascade — covers SPEC AC #5, #6, #7, #8, #19.

#### E-m4c-003

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one running time brick whose parent block is expanded
**WHEN** the user taps the block header to collapse the block, waits 5 s (the chip is unmounted), then taps to re-expand
**THEN** the re-mounted chip's badge reads a higher minutes value than before the collapse (the timer kept running while the chip was off-DOM); `aria-pressed="true"` on the remounted chip.
Proves: plan.md § Edge cases ("Block expand / collapse during a running timer") — covers SPEC AC #22, #23.

#### E-m4c-004

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with two time bricks `A` and `B` rendered (one in a block, one in the loose tray, or two in the same block); A is running (`aria-pressed="true"`)
**WHEN** the user taps B's chip
**THEN** A's chip shows `aria-pressed="false"` and the Play glyph; B's chip shows `aria-pressed="true"` and the Pause glyph. Exactly one chip on the page has `aria-pressed="true"`.
Proves: plan.md § Library modules ("Single-timer invariant enforcement") — covers SPEC AC #11, #12.

#### E-m4c-005

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one stopped time brick `{ durationMin: 25, minutesDone: 5 }`
**WHEN** the user long-presses the chip (Playwright `page.mouse.down()` + 600 ms wait + `page.mouse.up()`), types `"30"` into the sheet's input, clicks Save
**THEN** the sheet closes; the chip's badge reads `"25 / 25 m"` (clamped). When the user long-presses again, types `"7"`, clicks Cancel, the sheet closes and the badge still reads `"25 / 25 m"` (Cancel discarded).
Proves: plan.md § Components > `<TimerSheet>` (long-press → sheet → Save clamp + Cancel discard) — covers SPEC AC #13, #14, #15, #17, #18.

### Accessibility (axe via Playwright) — deferred to preview

#### A-m4c-001

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick rendered (under `count() > 0` guard) in both stopped and running states (run the assertion twice — once before tapping, once after)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config in BOTH states.
Proves: plan.md § A11y — covers SPEC AC #30.

#### A-m4c-002

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick rendered, the chip long-pressed so `<TimerSheet>` is open
**WHEN** axe-core runs against the document
**THEN** zero violations are reported (the sheet's `role="dialog"`, input's `aria-label="Minutes done"`, button labels, and contrast all pass).
Proves: plan.md § A11y (`<TimerSheet>` accessibility) — covers SPEC AC #30.

#### A-m4c-003

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick (under guard)
**WHEN** the chip's `aria-pressed` attribute is read before the tap, and again after
**THEN** the attribute reads `"false"` initially and `"true"` after the tap (mirrors the chip's running state at all times).
**AND** the chip's accessible name (read via Playwright's `getByRole('button', { name: ... })`) matches the AC #28 string for both states.
Proves: plan.md § A11y (`aria-pressed={running}` + AC #28 aria-label) — covers SPEC AC #28, #29.

#### A-m4c-004

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the browser context emulated with `prefers-reduced-motion: reduce`, app at `/` with one time brick (under guard)
**WHEN** the user taps the chip and inspects the chip's computed transform / motion class
**THEN** no scale-pulse animation runs (`getComputedStyle(...).transition` is `none` or `0ms` for the relevant property; or the motion-class for the pulse is absent). The chip's foreground gradient `width` retargets without smooth interpolation (jumps per tick). Haptics + chime cross-up paths are unaffected (verified separately by C-m4c-006 + the M4a celebration tests).
Proves: plan.md § Reduced motion (chip pulse + gradient transition collapse under reduced motion) — covers SPEC AC #27.

### M3 / M4a / M4b test migration notes

M4c's additive `runningTimerBrickId: string | null` field on `AppState` will surface as TypeScript errors in any pre-existing test that constructs an `AppState` literal. BUILDER fixes these in place during the TDD red phase (the typecheck flags them on first failed test). The list below is exhaustive at the time of TESTS authoring (verified via `grep -n "blocks: \[\], categories: \[\]" lib/data.test.ts` and the M4b BuildingClient mock); BUILDER greps once more before the red phase to catch any added since:

| File                                         | Line    | Symbol / context                               | Migration                                              |
| -------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------------------ |
| `lib/data.test.ts`                           | 23      | `U-m2-009` `AppState` literal in `assertNever` | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 31      | `U-m2-009` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 47      | `U-m2-009` `AppState` literal in ADD_CATEGORY  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 58      | `U-m2-009` `AppState` literal in ADD_CATEGORY  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 65–67   | `U-m2-009` `defaultState()` deep-equal         | extend expected to include `runningTimerBrickId: null` |
| `lib/data.test.ts`                           | 170     | `U-m3-009` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 212     | `U-m3-010` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 234     | `U-m3-011` `AppState` literal in `assertNever` | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 241–243 | `U-m3-011` `defaultState()` deep-equal         | extend expected to include `runningTimerBrickId: null` |
| `lib/data.test.ts`                           | 470     | `U-m4a-*` `AppState` literal (LOG_TICK_BRICK)  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 835     | `U-m4b-*` `AppState` literal (LOG_GOAL_BRICK)  | add `runningTimerBrickId: null`                        |
| `app/(building)/BuildingClient.m4b.test.tsx` | 32–55   | mocked `defaultState` factory                  | add `runningTimerBrickId: null` to the mocked return   |

Each is a one-line additive edit; no AC changes. EVALUATOR validates the migration is mechanical, not semantic. The `U-m2-009` and `U-m3-011` `defaultState()` deep-equal IDs **expand their assertion** to include the new field — the test's intent (defaultState is empty, no factory data) is unchanged; only the literal shape grows by one field. Any test added between this TESTS dispatch and BUILDER's red phase will surface during `tsc --noEmit` and gets the same one-line fix. None of the existing M4a / M4b / M4d test IDs are obsoleted.

Deferred-cleanup items inherited from prior milestones (M4a's 4 deferred tests.md cleanup items, M4b's 1 deferred item, M4d's 12 vacuous-pass-guarded e2e/a11y items) are explicitly OUT of scope for the M4c TESTS dispatch and remain owned by separate TESTS-mode re-dispatches for those milestones.

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                              | Covering test IDs                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| #1  | Tap stopped time chip → `START_TIMER` (≥ 44 px tap target)                                                      | C-m4c-003, C-m4c-013, U-m4c-016, E-m4c-001                                                         |
| #2  | Tap running time chip → `STOP_TIMER`                                                                            | C-m4c-004, C-m4c-013                                                                               |
| #3  | `START_TIMER` reducer sets `runningTimerBrickId = brickId`; idempotent on re-start                              | U-m4c-001, U-m4c-003                                                                               |
| #4  | `STOP_TIMER` reducer sets `runningTimerBrickId = null`                                                          | U-m4c-004, U-m4c-005                                                                               |
| #5  | `lib/timer.ts` runs single setInterval when running; stops when null                                            | U-m4c-012, U-m4c-013, E-m4c-002                                                                    |
| #6  | Each tick dispatches `TICK_TIMER` w/ floored minutes                                                            | U-m4c-012, E-m4c-002                                                                               |
| #7  | `TICK_TIMER` reducer updates brick's `minutesDone`                                                              | U-m4c-006, U-m4c-007, U-m4c-008, C-m4c-015                                                         |
| #8  | Foreground gradient width = `(minutesDone / durationMin) × 100%`; reduced-motion jumps                          | E-m4c-002, A-m4c-004                                                                               |
| #9  | Badge `${minutesDone} / ${durationMin} m`; ▶/⏸ glyph swap                                                       | C-m4c-001, C-m4c-002, E-m4c-001                                                                    |
| #10 | Haptic `light` on Start; `light` on Stop                                                                        | C-m4c-003, C-m4c-004, C-m4c-013                                                                    |
| #11 | Starting B while A runs auto-stops A (state-level)                                                              | U-m4c-002, C-m4c-014, C-m4c-019, E-m4c-004                                                         |
| #12 | After auto-stop, A's glyph reverts to ▶; B becomes ⏸                                                            | C-m4c-014, E-m4c-004                                                                               |
| #13 | Long-press (≥ 500 ms) opens `<TimerSheet>`                                                                      | U-m4c-016, C-m4c-005, C-m4c-017, E-m4c-005                                                         |
| #14 | Sheet has number input pre-filled, Save / Cancel buttons                                                        | C-m4c-007, C-m4c-017, E-m4c-005                                                                    |
| #15 | Save dispatches `SET_TIMER_MINUTES` clamped `[0, durationMin]`                                                  | U-m4c-009, C-m4c-008, C-m4c-017, E-m4c-005                                                         |
| #16 | Sheet does not stop the timer; new `minutesDone` becomes the new floor                                          | U-m4c-015, C-m4c-018                                                                               |
| #17 | Cancel closes the sheet without dispatching                                                                     | C-m4c-011, C-m4c-017, E-m4c-005                                                                    |
| #18 | Manual entry > durationMin → clamp + `medium` haptic                                                            | U-m4c-009, C-m4c-009, E-m4c-005                                                                    |
| #19 | Block scaffold, BlueprintBar, HeroRing, hero numeral all update on each `TICK_TIMER`                            | C-m4c-015, E-m4c-002                                                                               |
| #20 | Block 100% cross-up: bloom + chime + `success`                                                                  | inherited from M4a (`U-m4a-013`, `C-m4a-013`, etc.); reused unchanged via plan.md § Visual cascade |
| #21 | Day 100% cross-up: fireworks + chime + `notification`                                                           | inherited from M4a (`C-m4a-014`, `U-m4a-014`); reused unchanged via plan.md § Visual cascade       |
| #22 | Collapsing the block does NOT stop the timer                                                                    | C-m4c-016, E-m4c-003                                                                               |
| #23 | Re-expanding shows latest accumulated `minutesDone`                                                             | C-m4c-016, E-m4c-003                                                                               |
| #24 | Tab-background recovery via `visibilitychange`                                                                  | U-m4c-014                                                                                          |
| #25 | Tick bricks unchanged                                                                                           | C-m4c-020 (regression in tray); inherited from M4a (`C-m4a-*`)                                     |
| #26 | Goal bricks unchanged                                                                                           | C-m4c-020 (regression in tray); inherited from M4b (`C-m4b-*`)                                     |
| #27 | Reduced motion: chip pulse suppressed; gradient jumps                                                           | C-m4c-006, A-m4c-004                                                                               |
| #28 | Composite `aria-label` per AC #28 string                                                                        | C-m4c-001, C-m4c-002, A-m4c-003                                                                    |
| #29 | `aria-pressed={running}` on the tap surface                                                                     | C-m4c-001, C-m4c-002, A-m4c-003, E-m4c-001                                                         |
| #30 | axe-core: zero violations                                                                                       | A-m4c-001, A-m4c-002, C-m4c-012                                                                    |
| #31 | `tsc --noEmit`: zero new errors                                                                                 | gate (`npm run eval`); also U-m4c-010, U-m4c-011                                                   |
| #32 | ESLint: zero new errors                                                                                         | gate (`npm run eval`)                                                                              |
| #33 | Vitest: reducer + `lib/timer.ts` lifecycle tests                                                                | U-m4c-001..015 (reducer + timer); U-m4c-016 (`useLongPress`)                                       |
| #34 | Playwright (deferred-to-preview): tap, collapse-keeps-running, second-timer-auto-stops, long-press manual entry | E-m4c-001..005, A-m4c-001..004                                                                     |

### Sandbox / preview note

Per the established M4a/M4b/M4d pattern: this sandbox cannot launch chromium (binary missing — confirmed by the prior milestones' EVALUATOR reports and `status.md`). The 5 `E-m4c-*` and 4 `A-m4c-*` IDs above are authored as full GIVEN/WHEN/THEN specs but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the same `if ((await chip.count()) > 0)` guard pattern as `tests/e2e/m4a.spec.ts` and `tests/e2e/m4b.spec.ts`, which yields a vacuous PASS when the chip is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md` under M4a's "open loops" — and a future TESTS-mode dispatch owes a deterministic seeding helper (a `?seed=m4c-running-timer` query-param fixture, or an `__APP_TEST_SEED__` window hook, or an injected reducer initial state) that lifts the guards across all four milestones in one pass. M4c does NOT introduce that helper (it would touch four prior test files and is therefore out of scope per ADR-022). The 9 deferred-to-preview IDs are net-additive to the 17 vacuous-pass-guarded items already tracked from M4a + M4b + M4d (~26 items total post-M4c); they will all be cleared in the same future cleanup dispatch.

### Spec gaps surfaced for VERIFIER

None. SG-m4c-01 through SG-m4c-08 are resolved in plan.md and reflected directly in the test IDs above (`U-m4c-012` for SG-m4c-01/02, `U-m4c-014` for SG-m4c-08, `U-m4c-009` for SG-m4c-03's defensive integer floor, `C-m4c-014` for SG-m4c-05, `C-m4c-007` for SG-m4c-06, `U-m4c-016` for SG-m4c-07).

**Two items VERIFIER may want to flag and either accept or escalate** (mirroring plan.md § Open questions for VERIFIER — answers should be one-line confirmations, not re-plans):

1. **ADR-017 partial-fulfillment.** The tests cover timer behaviour within a session (start, stop, single-running, manual entry, tab-background recovery, block-collapse independence) but do NOT cover localStorage persistence of `runningTimerBrickId` + `startedAt` across page refresh. Spec AC #34 explicitly does not require persistence; M8 will land it. If VERIFIER reads ADR-017 strictly, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.`. Otherwise PASS.
2. **`useTimer` dep-array width.** `U-m4c-015` asserts the manual-entry-while-running path works (effect re-runs when `state.blocks[].bricks[]` changes the running brick's `minutesDone`). The plan accepts a wider-than-minimal `useEffect` dep array (the whole `state`) to make this work without a derived selector. If VERIFIER prefers a tight dep (the running brick's `minutesDone` only), `U-m4c-015` still holds — it asserts the observable outcome, not the dep-array shape — but `lib/timer.ts`'s implementation would refactor to a `useMemo` selector. Either implementation passes `U-m4c-015`; flag for awareness.
