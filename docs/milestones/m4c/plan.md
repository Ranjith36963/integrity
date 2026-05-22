> **RETIRED** by M4f per ADR-043. Kept for historical reference.

## Milestone 4c — Time Brick Timer — Plan

### Pillars consumed

§ 0.1 (the wedge — proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (the third verb: time elapsed against a target), § 0.9 (locked Brick: `kind: "time"` is `durationMin + minutesDone`), § 0.10 (haptic on every start/stop, clamp on manual-entry overflow), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-017 (time bricks use a real timer — phase-1 timestamp-based), ADR-027 (commit prefixes), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts). Completes the M4 brick-logging trilogy.

### Intent

Wire the **third and final** user-driven verb: tap a time brick to start its per-brick timer; tap the same chip again to stop. Long-press (≥ 500 ms hold) opens a manual-entry `<TimerSheet>` with a single number input (minutes) and Save / Cancel. While running, a single module-level `setInterval` at 1 s cadence dispatches `TICK_TIMER` actions that re-derive `minutesDone` from `Date.now() - startedAt + initialMinutesDone` and write the floored integer minute count to state. Cascade visuals (chip foreground gradient, scaffold left-bar, BlueprintBar opacity, HeroRing arc, hero numeral) update on each tick exactly as M4a/M4b. Block-100 and day-100 cross-up celebrations (bloom + chime + `success` haptic; fireworks + chime + `notification` haptic) reuse M4a's `useCrossUpEffect` wiring with **zero** new call sites. Single-running-timer is a state-level invariant enforced by the reducer (`runningTimerBrickId: string | null`), not by UI. Tab-background recovery is a `visibilitychange` listener inside `lib/timer.ts` that dispatches a corrective `TICK_TIMER` on `visible`. Tick (M4a) and goal (M4b) chips are unchanged — M4c is the `kind === "time"` branch only.

**1-line value-add over M4a/M4b:** the **time-style** verb (start / stop / manual entry) becomes live; tick + goal stay live; nothing else changes. M4c closes the M4 trilogy and the empty-toolkit pivot's three-verb promise.

**What this is NOT:** background-tab timer accuracy (the browser throttles `setInterval` to ~1 s minimum on Chrome and pauses it on Safari — recovery on `visible` is best-effort). Multiple concurrent timers (forbidden by the single-running invariant per § 0.5). Persistence of `runningTimerBrickId` + `startedAt` across page refresh (M8). Manual minute editing inline (`+/-` like the goal stepper) — M5 polish. Pomodoro / interval pattern (never, or M10+). Timer-driven push notifications outside the app (never, or M10+).

### File structure

| Path                                | Tag                    | Role in M4c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | (a) Add `runningTimerBrickId: string \| null` to `AppState`. (b) Add four new `Action` union members: `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/data.ts`                       | `[extends]`            | (a) `defaultState()` returns `runningTimerBrickId: null`. (b) Four new `case` arms in the reducer (one per new Action). `START_TIMER` sets `runningTimerBrickId = action.brickId` (no separate STOP for the prior running brick — the field is single-valued, the swap IS the stop). `STOP_TIMER` sets `runningTimerBrickId = null` (no-op when already null). `TICK_TIMER` writes `minutesDone` to the matching `kind === "time"` brick (identity short-circuit on no-change). `SET_TIMER_MINUTES` clamps to `[0, durationMin]` and writes. All four arms preserve `assertNever`.                                                                                                                                                                                                                                                                               |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` for `kind === "time"` already returns `Math.min(minutesDone / durationMin, 1) × 100` with a zero-duration guard. `blockPct` and `dayPct(state)` cascade as in M4a/M4b. No math changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `lib/celebrations.ts`               | `[survives unchanged]` | `useCrossUpEffect` shipped in M3, wired in M4a, reused in M4b. M4c adds **zero** new call sites — both block-100 (`<TimelineBlock>`) and day-100 (`<BuildingClient>`) cross-ups already fire whenever any brick mutation drives the percentage upward. `TICK_TIMER` and `SET_TIMER_MINUTES` just become additional sources.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `lib/audio.ts`                      | `[survives unchanged]` | `playChime()` shipped in M4a. M4c reuses it via the existing M4a `<TimelineBlock>` / `<BuildingClient>` cross-up sites. No new asset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `lib/haptics.ts`                    | `[survives unchanged]` | `light` (start/stop), `medium` (manual-entry clamp at `> durationMin`), `success` (block-100 — reused), `notification` (day-100 — reused). All shipped in M0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/longPress.ts`                  | `[survives unchanged]` | `useLongPressRepeat` shipped in M4b. M4c uses it in **non-repeat mode**: M4c does NOT want auto-repeat at all — long-press just opens the sheet. **Decision (SG-m4c-07):** introduce a sibling helper `useLongPress` (single-fire) inside `lib/longPress.ts` that exports the same pointer handlers but fires `onLongPress` once after `holdMs`, with `pointerup` before `holdMs` firing `onTap` instead. Implementation reuses the timer machinery; ~25 lines added; the M4b hook is unchanged. **No new file** — same module.                                                                                                                                                                                                                                                                                                                                  |
| `lib/motion.ts`                     | `[survives unchanged]` | `brickFill` (600 ms easeInOut) drives the chip foreground gradient on tick updates. `springConfigs.bloom` and `fireworks` shipped via M4a. No new tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `lib/timer.ts`                      | `[new]`                | NEW module owning the single `setInterval` (1 s) + `visibilitychange` listener. Exposes `useTimer(state, dispatch)` — a hook called once at the top of `<BuildingClient>`. Internally: a `useEffect` keyed on `state.runningTimerBrickId` starts the interval when non-null and tears it down when null. Tracks `startedAtRef: Date.now()` and `initialMinutesDoneRef: number` captured at start. On every tick (and on `visible`), computes `floor((Date.now() - startedAtRef) / 60000) + initialMinutesDoneRef` and dispatches `TICK_TIMER` if the value changed. Pure module — no React Context.                                                                                                                                                                                                                                                              |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind === "time"`: chip becomes a single `<button>` (matches M4a tick chip shape) with the **whole surface** as the tap target (≥ 44 px, per ADR-031). Tap dispatches `START_TIMER` or `STOP_TIMER`. Long-press (≥ 500 ms) opens `<TimerSheet>`. Glyph: `Play` (▶) when stopped; `Pause` (⏸) + subtle scale-pulse when running (suppressed under reduced-motion). `aria-pressed={running}`; aria-label per AC #28. Pointer handlers from `useLongPress`. New props: `running: boolean`, `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. M4a tick + M4b goal variants unchanged.                                                                                                                                                                                                                     |
| `components/TimerSheet.tsx`         | `[new]`                | NEW. Bottom-sheet via M0 `<Sheet>` (title `"Set minutes"` or `"Edit time"`). Single `<input type="number" min="0" max={durationMin}>` pre-filled with current `minutesDone`. Save and Cancel buttons (each `min-h-[44px]`). Save dispatches `SET_TIMER_MINUTES` with `Math.max(0, Math.min(durationMin, parsedValue))`; if `parsedValue > durationMin`, fires `haptics.medium()` before dispatch (the clamp cue per AC #18). Cancel closes silently. Focus trap follows the M4d AddChooserSheet pattern (Tab cycle within the sheet).                                                                                                                                                                                                                                                                                                                            |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `runningTimerBrickId` through to each `<BrickChip>` (computed: `running = runningTimerBrickId === brick.id`). New props: `runningTimerBrickId: string \| null`, `onTimerToggle: (brickId: string) => void`, `onTimerOpenSheet: (brickId: string) => void`. Pass-through only; no other render or layout changes. M4a's block-100 `useCrossUpEffect` wiring is reused unchanged — a `TICK_TIMER` that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic.                                                                                                                                                                                                                                                                                                                                                                           |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` threaded to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: same three props threaded to each `<BrickChip>` it renders. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | (a) Reducer's initial `defaultState()` already gives `runningTimerBrickId: null` (extended in `lib/data.ts`). (b) New callbacks `handleTimerToggle = useCallback((brickId) => dispatch(state.runningTimerBrickId === brickId ? { type: "STOP_TIMER", brickId } : { type: "START_TIMER", brickId }), [dispatch, state.runningTimerBrickId])` and `handleTimerOpenSheet = useCallback((brickId) => setTimerSheetState({ open: true, brickId }), [])`. (c) Threads `runningTimerBrickId={state.runningTimerBrickId}` + the two callbacks to `<Timeline>` and `<LooseBricksTray>`. (d) Calls `useTimer(state, dispatch)` once near the top of the component (alongside `useNow`). (e) Renders `<TimerSheet>` as a sibling of the other sheets, fed by `timerSheetState`. Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged. |
| `components/Fireworks.tsx`          | `[survives unchanged]` | Day-100 overlay shipped in M4a. M4c is just an additional trigger source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `app/globals.css`                   | `[survives unchanged]` | No new CSS variables. Reuses `--surface-2`, `--accent`, `--ink`, `--ink-dim`, `--cat-*`, `--bg-elev` from M0/M1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `public/sounds/chime.mp3`           | `[survives unchanged]` | Shipped in M4a. Same single asset, same placeholder caveat carried in `status.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Untouched in M4c (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `AddChooserSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`, `NowCard`. M3/M4a/M4b/M4d chip and sheet wiring is preserved verbatim — the only behavioural surface M4c touches is the `kind === "time"` branch inside `<BrickChip>` plus the new timer module + sheet.

**Summary:** 2 NEW files (`lib/timer.ts`, `components/TimerSheet.tsx`), 7 MODIFIED files (`lib/types.ts`, `lib/data.ts`, `lib/longPress.ts` [adds sibling `useLongPress` helper], `components/BrickChip.tsx`, `components/Timeline.tsx`, `components/TimelineBlock.tsx`, `components/LooseBricksTray.tsx`, `app/(building)/BuildingClient.tsx`), 7 REUSED-UNCHANGED files (`lib/dharma.ts`, `lib/celebrations.ts`, `lib/audio.ts`, `lib/haptics.ts`, `lib/motion.ts`, `components/Fireworks.tsx`, `public/sounds/chime.mp3`).

### Locked schema additions

```ts
// lib/types.ts — extend AppState (M4c — single-running-timer invariant)
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  runningTimerBrickId: string | null; // M4c — null = no timer running; one running brick at a time
};

// lib/types.ts — extend the Action union (M4b had five members; M4c adds four → nine total)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 | -1 }
  | { type: "START_TIMER"; brickId: string } // M4c — implicitly stops any other running timer
  | { type: "STOP_TIMER"; brickId: string } // M4c — no-op when brickId is not the running one
  | { type: "TICK_TIMER"; brickId: string; minutesDone: number } // M4c — dispatched by lib/timer.ts
  | { type: "SET_TIMER_MINUTES"; brickId: string; minutes: number }; // M4c — long-press manual entry, clamped in reducer
```

```ts
// lib/data.ts — reducer arms (sketch)
case "START_TIMER": {
  // Single-running invariant: just write the new id. No separate stop for the prior running brick;
  // the field is single-valued, the swap IS the stop. lib/timer.ts captures the new startedAt
  // off the change in state.runningTimerBrickId.
  if (state.runningTimerBrickId === action.brickId) return state; // already running — true no-op
  return { ...state, runningTimerBrickId: action.brickId };
}
case "STOP_TIMER": {
  if (state.runningTimerBrickId === null) return state;
  if (state.runningTimerBrickId !== action.brickId) return state; // stopping a non-running brick is a no-op
  return { ...state, runningTimerBrickId: null };
}
case "TICK_TIMER": {
  // Identity short-circuit when minutesDone is unchanged (avoids spurious cross-up effect re-runs).
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "time") return b;
    if (b.minutesDone === action.minutesDone) return b;
    return { ...b, minutesDone: action.minutesDone };
  };
  // Same array-identity preservation pattern as LOG_GOAL_BRICK.
  let blocksChanged = false;
  const newBlocks = state.blocks.map((bl) => {
    let changed = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) changed = true;
      return out;
    });
    if (!changed) return bl;
    blocksChanged = true;
    return { ...bl, bricks };
  });
  let looseChanged = false;
  const newLoose = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) looseChanged = true;
    return out;
  });
  if (!blocksChanged && !looseChanged) return state;
  return {
    ...state,
    blocks: blocksChanged ? newBlocks : state.blocks,
    looseBricks: looseChanged ? newLoose : state.looseBricks,
  };
}
case "SET_TIMER_MINUTES": {
  // Clamp at the reducer level (defense-in-depth alongside the sheet's own clamp).
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "time") return b;
    const clamped = Math.max(0, Math.min(b.durationMin, action.minutes));
    if (b.minutesDone === clamped) return b;
    return { ...b, minutesDone: clamped };
  };
  // (same array-identity pattern as TICK_TIMER above — omitted for brevity, BUILDER copies)
  // ...
}
```

The reducer never mutates in place. `START_TIMER`'s "swap is the stop" semantics make the single-running invariant a single-line guarantee — there is no codepath in which two bricks could be marked running. `TICK_TIMER` and `SET_TIMER_MINUTES` short-circuit on identity to keep React reconciliation cheap during the 1 s tick cadence (especially during long sessions where >99% of state is unchanged each tick — same reference returned). `assertNever(action)` exhaustiveness is preserved by the four new union members each having a matching `case`. **The new `runningTimerBrickId` field has a clean migration path: the prior `defaultState()` shape is extended additively; existing tests that constructed `AppState` literals must add `runningTimerBrickId: null` (BUILDER will surface these as TypeScript errors during typecheck — fix in place).**

### Components

**`<BrickChip>` (time variant — extended; tick + goal variants unchanged from M4a/M4b)**

- Props (additive): `running: boolean` (computed at the parent — `runningTimerBrickId === brick.id`), `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. M4a/M4b props (`brick`, `categories`, `size`, `onTickToggle`, `onGoalLog`) preserved.
- DOM shape for `kind === "time"`: a single native `<button type="button">` (mirrors M4a tick chip — NOT a `role="group"` like M4b goal). Whole surface is the tap target. Inside: title (left, `flex: 1`, ellipsis on overflow), then the badge area (`Play` or `Pause` icon + `${minutesDone} / ${durationMin} m` text). Same gradient `<div data-testid="brick-fill">` for the foreground fill, transitions via `brickFill` token.
- Tap behaviour (AC #1, #2, #10): `onClick` fires `haptics.light()` synchronously, then calls `onTimerToggle?.(brick.id)`. The parent decides whether the dispatched action is `START_TIMER` or `STOP_TIMER` based on `state.runningTimerBrickId === brick.id` (avoids stale-closure risk inside the chip — see Cross-cutting concerns). Pointer handlers come from the new `useLongPress` helper (single-fire), which suppresses the synthetic click after a true long-press.
- Long-press behaviour (AC #13, #14): `useLongPress({ holdMs: 500, onTap, onLongPress })`. `onTap` calls the toggle path described above. `onLongPress` calls `haptics.medium()` (the long-press lift — same haptic M4b uses for clamp; consistent "hard cue" semantics) and then `onTimerOpenSheet?.(brick.id)`. The `useLongPress` helper guarantees that a true long-press does NOT also fire `onTap` — exactly one of the two callbacks runs per gesture.
- Glyph (AC #9): `Play` (▶, lucide-react) when `running === false`; `Pause` (⏸) when `running === true`. Both `aria-hidden="true"`. The pulse animation on the running chip is a CSS `@keyframes` (or Framer `motion.button`) that scales between `1.0` and `1.04` on a 1 s loop. **Suppressed under `prefers-reduced-motion: reduce`** (no transform applied, plain static glyph).
- Foreground gradient (AC #6, #8): the existing `<div data-testid="brick-fill">` element animates `width` via `transition: width 600ms ease-in-out` (re-uses the M4a `prefers-reduced-motion: reduce → transition: none` branch). On each `TICK_TIMER` reducer commit, the new `brickPct` is recomputed from `Math.min(minutesDone / durationMin, 1) × 100` and the inline `width` style retargets — CSS interpolates over 600 ms. At 1 s tick cadence the animation reads as a smooth, continuously-rising fill (the new target arrives 600 ms before the next tick, so the transition fully completes between ticks). **Reduced motion → fill jumps per tick (no smooth interpolation)** — already wired via M4a.
- ARIA (AC #28, #29): `aria-pressed={running}` on the `<button>`. Composite `aria-label` per AC #28: `"${brick.name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`. Use a new branch in the existing `buildAriaLabel` function — extend the `kind === "time"` branch to take a `running` argument and produce the AC #28 string.
- Keyboard: native `<button>` already handles Enter and Space. Both fire `onClick`, which does the toggle path. **Long-press has no keyboard equivalent** (long-press is a pointer gesture). Keyboard users tap to start/stop; for manual entry, an alternative path is **not** provided in M4c (M5 polish may add an inline edit mode for keyboard parity — out of scope here per spec § Out of scope).
- Click suppression after long-press: `useLongPress`'s `onPointerDown` calls `e.preventDefault()` to suppress the synthetic click that follows pointer events; if the long-press timer fires, the hook sets a "consumed" ref that causes `onPointerUp` to skip the `onTap` callback. Same belt-and-suspenders pattern M4b uses.

**`<TimerSheet>` (new)**

- Props: `open: boolean`, `brick: Extract<Brick, { kind: "time" }> | null`, `onSave: (minutes: number) => void`, `onCancel: () => void`. The parent (`<BuildingClient>`) holds `timerSheetState: { open: boolean; brickId: string | null }` and resolves the brick by id at render time (avoids stale-brick-snapshot risk during a running timer — see Cross-cutting concerns).
- DOM: `<Sheet open={open} onClose={onCancel} title="Set minutes">`. Body: a `<label>` wrapping `<input type="number" inputMode="numeric" min="0" max={brick.durationMin}>` pre-filled with `String(brick.minutesDone)`. Below the input: two buttons — Save (primary, `min-h-[44px]`, `aria-label="Save minutes"`) and Cancel (secondary, `min-h-[44px]`, `aria-label="Cancel"`). Cancel closes silently; Save reads the input value, parses with `Number(value)`, falls back to `0` if `NaN`, then clamps to `[0, durationMin]`. **If the parsed value (pre-clamp) was > `durationMin`, fire `haptics.medium()` BEFORE calling `onSave` to give the user the clamp cue per AC #18.**
- Focus trap: same Tab-cycle pattern as `<AddChooserSheet>` (per `components/AddChooserSheet.tsx:32–65` which BUILDER added in M4d under VERIFIER D2). Re-use the inline `useEffect`-with-keydown approach; do not extract a hook in M4c (extraction is a separate refactor — out of scope, would touch M4d).
- Accessibility: `<input>` carries `aria-label="Minutes done"`. Sheet's `role="dialog"` + `aria-modal="true"` come from `<Sheet>`. The number input's `min` and `max` attributes are honored by browsers for the spinner UI; the explicit clamp + haptic in `handleSave` is the load-bearing path (don't trust browser validation alone).
- Reduced motion: inherits `<Sheet>`'s `modalIn` / `modalOut` (already collapsed under reduced-motion via `<Sheet>`).
- **The sheet does NOT stop the timer when opened** (AC #16). If `running === true` at long-press, the timer continues to accumulate during the sheet session. Save updates `minutesDone` to the new value; the running timer's next tick computes a NEW `startedAt`-based delta from the new `minutesDone` floor. **This is `lib/timer.ts`'s responsibility:** when `runningTimerBrickId` is unchanged but the underlying `minutesDone` of that brick changes (e.g., a `SET_TIMER_MINUTES` mid-run), the timer module must recompute `startedAtRef = Date.now()` and `initialMinutesDoneRef = newMinutesDone` so the next tick is correct. See § Library modules below.

**`<TimelineBlock>` (extended)**

- Props (additive): `runningTimerBrickId: string | null`, `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. Each `<BrickChip>` rendered inside is given `running={runningTimerBrickId === brick.id}` plus the two callbacks.
- Block-100 cross-up: reused from M4a — `useCrossUpEffect(blockPct(block), 100, fireBlockComplete)` already fires on every `blockPct` recomputation. Each `TICK_TIMER` that brings the block to 100 fires bloom + chime + `success` haptic exactly once.
- The `TICK_TIMER` reducer's identity short-circuit means redundant ticks (no minute boundary crossed) do NOT cause a new `useCrossUpEffect` evaluation — the value reference is stable, the effect's dep array is unchanged, the celebration cannot mis-fire.

**`<Timeline>` and `<LooseBricksTray>` (extended)**

- Pass-through-only: each accepts `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` and threads them down. No render or layout changes — mirrors the M4a `onTickToggle` and M4b `onGoalLog` plumbing.

**`<BuildingClient>` (extended)**

- New state: `const [timerSheetState, setTimerSheetState] = useState<{ open: boolean; brickId: string | null }>({ open: false, brickId: null })`.
- New callback `handleTimerToggle = useCallback((brickId: string) => { dispatch(state.runningTimerBrickId === brickId ? { type: "STOP_TIMER", brickId } : { type: "START_TIMER", brickId }); }, [dispatch, state.runningTimerBrickId])`. Threaded to `<Timeline>` and `<LooseBricksTray>`. The dependency on `state.runningTimerBrickId` regenerates the callback on every running-timer change — fine, since the callback is consumed by chip `<button>` handlers that re-bind freely on each render.
- New callback `handleTimerOpenSheet = useCallback((brickId: string) => setTimerSheetState({ open: true, brickId }), [])`. Threaded same way.
- New callback `handleTimerSave = useCallback((minutes: number) => { if (timerSheetState.brickId !== null) dispatch({ type: "SET_TIMER_MINUTES", brickId: timerSheetState.brickId, minutes }); setTimerSheetState({ open: false, brickId: null }); }, [dispatch, timerSheetState.brickId])`. New callback `handleTimerCancel = useCallback(() => setTimerSheetState({ open: false, brickId: null }), [])`.
- Resolve the active brick at render: `const timerSheetBrick = timerSheetState.brickId !== null ? findBrickById(state, timerSheetState.brickId) : null` (helper traverses `state.blocks[*].bricks[]` then `state.looseBricks[]`, returning the first `kind === "time"` match). Render `<TimerSheet open={timerSheetState.open} brick={timerSheetBrick} onSave={handleTimerSave} onCancel={handleTimerCancel} />`.
- **Call `useTimer(state, dispatch)` once** near the top of the component (alongside `useNow`). The hook owns the interval lifecycle (see § Library modules).
- Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged. A `TICK_TIMER` that brings `heroPct` to 100 fires fireworks + chime + `notification` haptic via the M4a path. Cross-down (e.g., if the user sets `minutesDone` back to 0 via `SET_TIMER_MINUTES`) resets the gate; re-cross-up replays the celebration per the M3-locked one-shot rule.

### Library modules

**`lib/timer.ts` — `useTimer(state, dispatch)` design (resolves SG-m4c-01, SG-m4c-02, SG-m4c-03, SG-m4c-04, SG-m4c-08)**

```ts
"use client";
import { useEffect, useRef } from "react";
import type { AppState, Action, Brick } from "./types";

const TICK_INTERVAL_MS = 1000; // SG-m4c-02 — 1 s default; M7 may revisit

function findTimeBrickById(
  state: AppState,
  id: string,
): Extract<Brick, { kind: "time" }> | null {
  for (const block of state.blocks) {
    for (const brick of block.bricks) {
      if (brick.id === id && brick.kind === "time") return brick;
    }
  }
  for (const brick of state.looseBricks) {
    if (brick.id === id && brick.kind === "time") return brick;
  }
  return null;
}

export function useTimer(
  state: AppState,
  dispatch: React.Dispatch<Action>,
): void {
  const startedAtRef = useRef<number | null>(null);
  const initialMinutesDoneRef = useRef<number>(0);
  const lastDispatchedMinutesRef = useRef<number>(0);

  // Drive the interval off state.runningTimerBrickId.
  useEffect(() => {
    const runningId = state.runningTimerBrickId;
    if (runningId === null) {
      startedAtRef.current = null;
      return;
    }

    // Capture the floor at start (SG-m4c-03 — floor, not round).
    const brick = findTimeBrickById(state, runningId);
    if (brick === null) return; // defensive — should not happen
    startedAtRef.current = Date.now();
    initialMinutesDoneRef.current = brick.minutesDone;
    lastDispatchedMinutesRef.current = brick.minutesDone;

    const computeAndDispatch = () => {
      if (startedAtRef.current === null) return;
      const elapsedMs = Date.now() - startedAtRef.current;
      const next =
        Math.floor(elapsedMs / 60000) + initialMinutesDoneRef.current;
      if (next === lastDispatchedMinutesRef.current) return; // identity short-circuit (SG-m4c-02)
      lastDispatchedMinutesRef.current = next;
      dispatch({ type: "TICK_TIMER", brickId: runningId, minutesDone: next });
    };

    const intervalId = window.setInterval(computeAndDispatch, TICK_INTERVAL_MS);

    // SG-m4c-08 — visibilitychange recovery. On tab foreground, dispatch one corrective tick
    // immediately (browser-throttled intervals miss ticks while backgrounded).
    const onVisible = () => {
      if (document.visibilityState === "visible") computeAndDispatch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      startedAtRef.current = null;
    };
  }, [state.runningTimerBrickId, dispatch, state]);
}
```

**Why this shape (resolving SG-m4c-01).** A React hook called once at the top of `<BuildingClient>` (the existing `useReducer` host) is the simplest design: no Context, no external store, no module-scoped global state, no risk of duplicate intervals. The `useEffect` keyed on `state.runningTimerBrickId` is the single source of lifecycle truth — start when non-null, stop when null. Auto-stops via `useEffect` cleanup when the effect re-runs (i.e., when the user starts a new timer while another is running, which flips the id to a new value). External-store alternatives (Zustand, observable singleton) add weight and a second source of truth without solving any concrete problem at this scope. Lives in `<BuildingClient>` (not the root layout) because: (a) `<BuildingClient>` owns the reducer; the timer module wants the same `dispatch` reference, and (b) the building view is the only surface that needs the timer — the root layout has no business hosting feature-specific machinery.

**Tick cadence (SG-m4c-02).** 1 s default. Identity short-circuit at the reducer's `TICK_TIMER` arm + the `lastDispatchedMinutesRef` guard inside the hook combine to ensure that when no minute boundary is crossed (~59 of every 60 ticks), no React re-render happens — `dispatch` is not even called. Only minute-boundary crossings cause a state update. **M7 fallback:** if profiling shows render cost during multi-timer sessions (theoretically impossible per single-running invariant, but if M7 ever lifts that), batch dispatch to every 5 s while still updating display via local component state. M4c ships 1 s.

**Rounding on stop (SG-m4c-03).** Floor — only fully-completed minutes count. The hook computes `Math.floor(elapsedMs / 60000) + initialMinutesDoneRef.current` on every tick AND on stop. There is no separate "stop" computation — `STOP_TIMER` reducer just clears `runningTimerBrickId`; the last `TICK_TIMER` dispatched (one per minute boundary) is the captured value. This avoids premature 100% celebrations from an "in the moment of stopping, round up" path. **`SET_TIMER_MINUTES`** uses the user-typed integer directly (no further floor — the input is already `<input type="number">`); if the user types a fractional value, `Number()` parses it and the reducer's clamp accepts the float as-is. AC review: spec accepts integer minutes only — the input's `step="1"` attribute (browser-default) plus `Number()` parsing yields integer-ish behaviour; documented in the sheet that fractional input rounds toward 0 via the implicit floor inside the input's spinner. **Decision:** add `step="1"` explicitly to the input to force integer increments via the spinner, and use `Math.floor(Number(value))` in `handleSave` to be defensive.

**Battery / power efficiency (SG-m4c-04).** Confirmed: M4c does NOT implement explicit battery-aware logic. The browser throttles `setInterval` to ~1 s minimum on Chrome and pauses it on Safari when backgrounded — that's the OS's job. M7 polish may add `requestAnimationFrame`-based smoother visuals or longer ticks if profiling justifies it. No new APIs are wired in M4c.

**Single-timer invariant enforcement (SG-m4c-05).** Reducer-side. `START_TIMER` writes the new id; the prior id (if any) is overwritten. There is no second "running" field, no list, no map. The data-flow proof: the chip's `running` prop is computed at the parent as `runningTimerBrickId === brick.id`; only one chip in the entire tree can satisfy that equality at any given time. Therefore only one chip displays the ⏸ glyph + pulse. UI and state agree by construction. The `<TimelineBlock>` and `<LooseBricksTray>` props pass `runningTimerBrickId` (the whole field), not a per-chip `running` boolean, so the equality check is centralized at the chip site (not duplicated at the parent). No "auto-stop the prior brick" branch is needed — the field is single-valued, the swap IS the stop.

**Manual-entry sheet location (SG-m4c-06).** Confirmed: bottom sheet via M0 `<Sheet>`. Same pattern as `<AddChooserSheet>` (M4d). Single number input + Save / Cancel. No category picker, no recurrence picker, no toggle — simpler than the M2/M3 sheets.

**Long-press vs tap (SG-m4c-07).** Threshold: 500 ms hold (matches M4b's `HOLD_MS`). `pointerdown` starts a 500 ms timer; if `pointerup` fires before 500 ms, treat as tap (call `onTap`); if 500 ms elapses without `pointerup`, treat as long-press (call `onLongPress`, mark gesture as consumed so the eventual `pointerup` does NOT also call `onTap`). Implementation: extend `lib/longPress.ts` with a sibling `useLongPress({ holdMs, onTap, onLongPress })` hook. **The new hook does not change `useLongPressRepeat` (used by M4b) — they coexist as two independent exports from the same module.** `useLongPress` is ~25 lines: one `useRef` for the timeout id, one `useRef<'idle' | 'tap-eligible' | 'long-pressed'>` state machine, the four pointer handlers (`onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`), and a `useEffect` cleanup. BUILDER will write the actual implementation; this plan reserves the API.

**Tab-background recovery (SG-m4c-08).** `visibilitychange` listener inside `lib/timer.ts`'s effect. On `document.visibilityState === "visible"`, dispatch one corrective tick immediately (compute via `Date.now() - startedAtRef.current` per the same path as the regular interval). This recovers the accurate elapsed minute count after Chrome's throttled interval missed ticks or Safari paused entirely. The listener is registered alongside the interval and torn down in the same cleanup — single source of truth. **Page refresh is NOT recovered** — that requires persistence of `runningTimerBrickId` + `startedAt`, which is M8.

### Haptics map

| Trigger                                                               | Haptic event                         | Source                               |
| --------------------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Tap a stopped time chip → `START_TIMER`                               | `light`                              | `<BrickChip>` (M4c NEW call site)    |
| Tap a running time chip → `STOP_TIMER`                                | `light`                              | `<BrickChip>` (M4c NEW call site)    |
| Long-press a time chip → opens `<TimerSheet>`                         | `medium`                             | `<BrickChip>` (M4c NEW call site)    |
| Manual entry > `durationMin` (clamp on Save)                          | `medium`                             | `<TimerSheet>` (M4c NEW call site)   |
| Block-100 cross-up triggered by a `TICK_TIMER` or `SET_TIMER_MINUTES` | `success` (+ chime)                  | `<TimelineBlock>` (reused from M4a)  |
| Day-100 cross-up triggered by a `TICK_TIMER` or `SET_TIMER_MINUTES`   | `notification` (+ chime + fireworks) | `<BuildingClient>` (reused from M4a) |

### Visual cascade

**All cascade visuals from M4a/M4b are reused unchanged.** A successful timer tick path is:

1. `lib/timer.ts`'s interval fires → `dispatch({ type: "TICK_TIMER", brickId, minutesDone: next })`.
2. Reducer's identity short-circuit either returns the same state ref (no minute boundary crossed → no re-render) OR returns a new state with the brick's `minutesDone` updated.
3. New `pct` flows through `brickPct` for the time brick → `data-testid="brick-fill"` `width` style retargets → CSS transitions over 600 ms (instant under reduced-motion).
4. New `blockPct` propagates → block scaffold left-bar fills (M3 wiring).
5. New `dayPct` propagates → BlueprintBar opacity recomputes (M3 wiring).
6. New `heroPct` propagates → HeroRing arc redraws + hero numeral count-up (M3 wiring).
7. If `blockPct` crossed 100 from below: `<TimelineBlock>` cross-up fires bloom + chime + `success` haptic (M4a).
8. If `heroPct` crossed 100 from below: `<BuildingClient>` cross-up fires fireworks + chime + `notification` haptic (M4a).
9. Cross-down via `SET_TIMER_MINUTES` (e.g., user opens sheet, types 0, saves) resets the gate; re-cross-up replays celebration (M3 one-shot rule).

M4c adds **zero** new visual primitives — every paint path is M3 + M4a's. The chip's `Pause` glyph + scale-pulse is the only new visual element, and it's localized to the chip's badge area.

### Reduced motion

- Chip foreground gradient `width` transition: collapses to `none` (already done in M4a; reused by time chip).
- Chip running-state pulse: suppressed under `prefers-reduced-motion: reduce` (no `transform` applied, plain static glyph). Per AC #27.
- Bloom on block-100: visual suppressed; haptic + chime still fire (M4a).
- Fireworks on day-100: visual returns null; haptic + chime still fire (M4a).
- `<TimerSheet>` open/close: inherits `<Sheet>`'s `modalIn` / `modalOut` reduced-motion collapse.
- Per AC #27: reduced-motion users still feel every start/stop (`light`) and clamp (`medium`), and hear celebrations (`success` / `notification` chimes). The motion budget is purely visual.

### A11y

- Time chip is a single native `<button type="button">`. Native role + keyboard activation (Enter / Space) come for free.
- `aria-pressed={running}` per AC #29. `aria-label` per AC #28 — full string `"${name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`.
- `<TimerSheet>`'s `<input>` carries `aria-label="Minutes done"`. Save and Cancel buttons carry explicit `aria-label="Save minutes"` / `"Cancel"`.
- Tab focus order in the sheet: input → Save → Cancel → (back to input via Tab cycle).
- axe-core target per AC #30: zero violations on the building view with at least one time brick rendered (running and stopped variants), and on the open `<TimerSheet>`. Verified by Playwright + `@axe-core/playwright`.
- Long-press is a pointer gesture only — keyboard users cannot open the sheet from a chip. **Documented limitation**, M5+ may add an inline edit mode for keyboard parity. Not an axe violation (the chip's primary action — start/stop — is fully keyboard-accessible).

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline` / `LooseBricksTray`.** Three new props (`runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`) thread through the same prop-drill pattern as M4a's `onTickToggle` and M4b's `onGoalLog`. Do NOT introduce React Context.
2. **`useCallback` discipline.** `handleTimerToggle` MUST depend on `state.runningTimerBrickId` (it reads the field to decide `START_TIMER` vs `STOP_TIMER`). `handleTimerSave` MUST depend on `timerSheetState.brickId`. Without these, stale closures could dispatch the wrong action.
3. **Chip `running` is a derived prop, not a separate state.** Compute `running={runningTimerBrickId === brick.id}` at the parent; do NOT mirror it inside the chip. This guarantees the chip's `running` always reflects state.
4. **Find-by-id helper for `<TimerSheet>`.** The sheet receives a `brick` prop, but the parent stores only `brickId`. Resolving `brickId → brick` at render time means: when a running timer's `minutesDone` ticks while the sheet is open (yes, the sheet stays open during a running timer per AC #16), the input's `defaultValue` reflects the latest. **Decision:** the input is **uncontrolled** — `defaultValue={brick.minutesDone}` initialized once when the sheet opens. Subsequent ticks DO update the underlying brick but the input's displayed value does NOT change (intentional — the user is editing; we don't yank their typing). Save reads `inputRef.current!.value` at submit time. Cancel discards. (Alternative: controlled input with `key={brickId}` to remount on open — equivalent UX. BUILDER picks the simpler path; document in PR.)
5. **Reducer no-op identity preservation.** Both `TICK_TIMER` and `SET_TIMER_MINUTES` short-circuit on identity (return the same state reference when `minutesDone` is unchanged). This is critical at the 1 s tick cadence: ~59 of every 60 dispatches are no-ops; without identity preservation, `useCrossUpEffect`'s effect re-runs every second, potentially mis-firing celebrations during long sessions.
6. **`assertNever` exhaustiveness.** `lib/data.ts:default → assertNever(action)` arm preserved by adding the four new cases. TypeScript compile guarantees this.
7. **Timer module testability.** `lib/timer.ts` MUST be testable with `vi.useFakeTimers()` + `vi.advanceTimersByTime()` + a controlled `Date.now()` (via `vi.setSystemTime`). Use raw `window.setInterval` / `document.addEventListener("visibilitychange", ...)` (not `requestAnimationFrame`) so the Vitest harness hooks them. The `findTimeBrickById` helper is exported for unit testing in isolation.
8. **`<TimerSheet>` focus trap reuses M4d's pattern verbatim.** Do NOT extract a hook in M4c. The M4d `AddChooserSheet` has the canonical inline implementation; copy it to `TimerSheet.tsx`. Extraction is a separate refactor (deferred to M5+).
9. **Click suppression after long-press.** `useLongPress`'s `onPointerDown` calls `e.preventDefault()` and the hook's internal "consumed" ref ensures the synthetic click is skipped after a true long-press. BUILDER must verify this in component tests using `fireEvent.pointerDown` + `vi.advanceTimersByTime(500)` + asserting `onTap` was NOT called.
10. **Test seeds for time bricks.** `tests.md` will need a deterministic seed helper to put the running-timer state into the page (per the M4d ships-empty-and-vacuous-pass note in `status.md`). Reuse the same seeding approach M4a/M4b/M4d tests use (constructing `AppState` literals in Vitest; for Playwright, the `?seed=` query-param helper if it exists, else continue the vacuous-pass-guarded pattern with a TODO for M7 cleanup).
11. **Gate D (typecheck).** BUILDER must run `tsc --noEmit` before declaring red→green→commit. The new `runningTimerBrickId: string | null` field on `AppState` will surface as TypeScript errors in any test fixture that constructs `AppState` literals — fix in place by adding the field.
12. **`window.setInterval` SSR guard.** `lib/timer.ts` is `"use client"` and only runs after first paint, so `setInterval` is always available. No SSR guard needed inside the hook (the `"use client"` boundary is sufficient).

### Edge cases

- **Tap a running time chip.** Dispatches `STOP_TIMER`; reducer clears `runningTimerBrickId`; `lib/timer.ts`'s effect tears down the interval; the chip's `running` flips to `false`; glyph reverts to `Play`. The last `TICK_TIMER` dispatched (at the most recent minute boundary) is the captured `minutesDone` — no extra "stop snapshot" computation. Per AC #2, AC #4.
- **Tap a stopped time chip while another timer is running.** Dispatches `START_TIMER` for the new brick; reducer overwrites `runningTimerBrickId`; the prior timer's effect tears down (its cleanup runs); a new effect starts for the new brick. The prior brick's chip `running` flips to `false` (its glyph reverts to `Play`); the new chip's `running` flips to `true` (its glyph becomes `Pause` + pulse). Per AC #11, AC #12.
- **Timer reaches `durationMin`.** `TICK_TIMER` continues to dispatch (`minutesDone` exceeds `durationMin`); `brickPct` clamps to 100; the chip stays at full fill; block-100 / day-100 cross-ups fire once on first crossing. The user can stop to lock in the value or keep running for over-target tracking. Per spec § Edge cases.
- **Manual entry > `durationMin`.** `<TimerSheet>` clamps in `handleSave` and fires `haptics.medium()` before dispatching. Reducer's `SET_TIMER_MINUTES` arm clamps again (defense-in-depth). Per AC #18.
- **Manual entry < 0.** Clamp to 0 in both sheet and reducer. No haptic on under-zero (the spec only mandates `medium` on overflow; under-zero is a rarer edge case and `light` would be misleading because under-zero means "saved nothing happened"). BUILDER picks: silent clamp on negative input. Document in PR.
- **Long-press while another timer is running.** Long-press opens `<TimerSheet>` for the long-pressed brick. The other brick's timer keeps running. Saving updates the long-pressed brick's `minutesDone`; if the long-pressed brick IS the running one, see "Manual entry while running" below.
- **Manual entry while running** (AC #16). The timer keeps running. Save calls `SET_TIMER_MINUTES` → reducer updates `minutesDone`. Because this changes the running brick's `minutesDone`, `lib/timer.ts`'s effect re-runs (its dep array includes `state` for this exact reason — `state.blocks` / `state.looseBricks` reference changes when the brick is updated), which captures a new `startedAtRef = Date.now()` and `initialMinutesDoneRef = newMinutesDone`. The next 1 s tick computes from the new floor. **Subtle:** including the full `state` in the dep array is heavier than needed; BUILDER may prefer to depend only on the running brick's `minutesDone`, which requires a derived selector. **Plan-level decision:** depend on `state` (the whole reducer state). Cost: the effect re-runs whenever any state changes (including unrelated ticks/adds). Mitigation: the effect's body returns early when `runningTimerBrickId === null`; when non-null, the cleanup tears down and the body re-runs — which captures the current `initialMinutesDoneRef` correctly. The interval handler is recreated each time but the `setInterval` lifecycle is tied to the `useEffect` body, so this is correct. BUILDER may optimize later; correctness comes first.
- **Tab backgrounded during a running timer** (AC #24). Browser throttles `setInterval` to ~1 s minimum (Chrome) or pauses (Safari). On `visibilitychange === "visible"`, the listener inside `lib/timer.ts` dispatches one corrective `TICK_TIMER` immediately, computed from `Date.now() - startedAtRef.current` so the displayed `minutesDone` is accurate. Documented limitation: page refresh during a backgrounded timer loses everything (M8 fixes via persistence).
- **Page refresh during a running timer.** State resets to `defaultState()` → `runningTimerBrickId === null`. The effect doesn't start. The previously-running brick's `minutesDone` reflects only what was committed before the refresh. M8 will persist `runningTimerBrickId` + `startedAt` to recover.
- **Reduced motion.** Chip pulse suppressed; gradient fill collapses to per-tick (no smooth interpolation). Haptics + chime still fire.
- **Block expand / collapse during a running timer** (AC #22, #23). `lib/timer.ts` is unaware of expand/collapse. The interval keeps running. When the block re-expands, the chip is re-mounted with the latest accumulated `minutesDone` (the running flag and the `running` prop are read from `state.runningTimerBrickId`, not from any per-chip mount-time snapshot). Verified by spec AC #22-23.
- **Time chip in a collapsed block.** The chip is not in the DOM (the parent block doesn't render bricks until expanded). The timer keeps running regardless. The user can re-expand to see the live count.
- **Time chip in `<LooseBricksTray>`.** Identical behaviour. The tray's collapsed scroll-row state (M3 SG-m3-15) does not affect the timer.
- **Two long-presses in quick succession.** Each long-press opens the sheet; the second open replaces the first (same `timerSheetState` slot). `<TimerSheet>` rendering is conditional on `open`, so the React tree just re-renders with the new `brickId`.
- **`durationMin === 0` (degenerate user input).** `brickPct` returns 0 (the existing zero-duration guard in `lib/dharma.ts:39-40`). Tapping the chip dispatches `START_TIMER`, the timer runs and dispatches `TICK_TIMER` with growing `minutesDone`, but `brickPct` stays at 0. The block-100 / day-100 cross-ups never fire from this brick alone. AddBrickSheet validation (M3) prevents creating such a brick, but defense-in-depth is free here.
- **Brick id collision.** Defensive — reducer's `apply` helpers match by `id` AND `kind === "time"`; a non-time brick with the same id (impossible by uuid generation but defensible) is a no-op.
- **`SET_TIMER_MINUTES` for a non-running brick.** Allowed. Reducer updates `minutesDone` regardless of `runningTimerBrickId`. The user's mental model: "manually log time on a brick I'm not actively timing." Useful for past-session logging. Per spec AC #15.
- **`STOP_TIMER` while no timer running.** Reducer no-op. The chip's `onClick` only dispatches `STOP_TIMER` when `running === true` (which requires `runningTimerBrickId === brick.id`), so this codepath is normally unreachable; the no-op is defensive.
- **Click vs `pointerdown` on time chip.** The `useLongPress` hook attaches pointer handlers; the chip's `<button>` ALSO has an `onClick` for keyboard activation (Enter / Space, where `e.detail === 0`). Same dual-path pattern as M4b's stepper buttons. BUILDER copies the M4b pattern (the `e.detail === 0` keyboard guard). Pointer-driven clicks are suppressed by the hook's `preventDefault` + consumed-ref logic.

### Decisions to honor

- **ADR-031 (44 px touch target)** — the time chip's `<button>` enforces `min-height: 44px` (mirrors M4a tick chip). The whole chip surface is the tap target.
- **ADR-039 (ships empty)** — M4c adds no factory data. No new categories, blocks, bricks, or timers. The timer has nothing to start until a user adds a time brick via the M3 / M4d AddBrickSheet path.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4c): …` (red) and `feat(m4c): …` / `fix(m4c): …` (green/refactor). PLANNER's commits land as `docs(plan-m4c): …` and `docs(tests-m4c): …`. SHIPPER as `chore(ship-m4c): …` and `docs(ship-m4c): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4c only. M4 is now complete (M4a + M4b + M4c logging trilogy + M4d chooser). M5 is a separate `/feature m5` invocation.
- **ADR-025 / ADR-026 / ADR-041 (mode separation + single-gate Loop)** — this dispatch writes `/docs/plan.md` only. The next dispatch (`mode: TESTS`) writes `/docs/tests.md`. VERIFIER then audits both. No human gate between TESTS and BUILD.
- **ADR-017 (time bricks use a real timer)** — directly fulfilled. Phase-1 implements a real timer per the empty-toolkit pivot. **Note:** ADR-017 specifies localStorage persistence of `{ runningSince, accumulatedSec }`; M4c does NOT implement persistence (deferred to M8 per spec § Out of scope). This is a planned partial-fulfillment of ADR-017 — the timer is real (start/stop, mm-accurate display, single-running invariant), persistence is M8's job. ADR-017 is honored in spirit; the persistence half is staged for M8. **VERIFIER note:** if VERIFIER reads ADR-017 strictly and flags non-persistence as a gap, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.`. Spec AC #34 explicitly does NOT require persistence (the Playwright test asserts behaviour within a session, not across refresh), so the partial-fulfillment is spec-grounded.
- **ADR-032 / ADR-035 / ADR-034** — categories user-defined, bricks may be standalone, blocks always timed. M4c touches none of these contracts.
- **ADR-018 (localStorage `dharma:v1`)** — M4c does NOT route through `lib/persist.ts`. State is in-memory until M8.
- **ADR-024 (3-FAIL EVALUATOR cap)** — applies as usual.
- **Locked Brick discriminated union** — M4c mutates `minutesDone` only on the `kind === "time"` arm. The `durationMin` field is read-only in M4c (edit is M5). The reducer's pattern-match on `kind === "time"` is the type-system guard; without it, TypeScript would reject `b.minutesDone = next` because tick / goal bricks have no `minutesDone` field.
- **`assertNever` exhaustiveness** — preserved by adding the four new cases.
- **No new npm deps** — verified. `setInterval`, `document.addEventListener("visibilitychange")`, `Date.now()` are all Web APIs. Pointer Events for long-press already shipped via M4b. `motion`, `lucide-react` already installed.
- **Gate D (typecheck)** — added at end of M4a. M4c BUILDER must run `tsc --noEmit` before declaring red→green→commit.
- **Vacuous-pass debt** — M4c's E2E + a11y tests will continue to use the `if ((await x.count()) > 0)` guard pattern OR the seed-via-state injection pattern, matching M4a/M4b/M4d. The deterministic-seeding helper is still TODO for a future TESTS-mode follow-up; M4c does NOT introduce it (out of scope; would touch M4a-M4d harnesses).

### Resolutions for open spec gaps (SG-m4c-01..SG-m4c-08)

- **SG-m4c-01 — `lib/timer.ts` shape.** **LOCKED — `useTimer(state, dispatch)` React hook called once at the top of `<BuildingClient>`.** Single `useEffect` keyed on `state.runningTimerBrickId`. No external store, no Context, no module-level globals. Rationale: simplest design that satisfies the single-running invariant and the 1 s tick cadence; reuses the existing `useReducer` host's `dispatch`; lifecycle tied to the existing component tree. Alternative (Zustand-style external store) adds a dependency and a second source of truth without solving any concrete problem at this scope.
- **SG-m4c-02 — Tick cadence vs render cost.** **LOCKED — 1 s default.** Plus identity short-circuit at the reducer's `TICK_TIMER` arm and a `lastDispatchedMinutesRef` guard inside the hook so ~59 of every 60 ticks dispatch nothing. M7 fallback: batch to 5 s if profiling shows jank, with display still updating at 1 s via local component state. M4c ships 1 s. Constants in `lib/timer.ts`: `TICK_INTERVAL_MS = 1000`.
- **SG-m4c-03 — Rounding when stopping.** **LOCKED — floor.** `Math.floor((Date.now() - startedAt) / 60000) + initialMinutesDone`. No round-up. Rationale: only completed minutes count, avoids premature 100% celebrations, matches user mental model ("the timer hit 14:59 and I stopped — it's 14 minutes done, not 15"). `SET_TIMER_MINUTES` uses the user-typed integer (input has `step="1"`); `Math.floor(Number(value))` in `handleSave` is defensive against fractional input.
- **SG-m4c-04 — Battery / power efficiency.** **LOCKED — no explicit logic in M4c, browser throttling suffices.** Foreground 1 s ticks are acceptable. Background throttling is the OS / browser's job. M7 polish may revisit with `requestAnimationFrame`-based smoother visuals or longer ticks; not in scope here.
- **SG-m4c-05 — Single-timer invariant enforcement.** **LOCKED — reducer-side via single-valued `runningTimerBrickId: string | null`.** No list, no map. `START_TIMER` writes the new id (overwriting the prior); the field's single-valuedness IS the invariant. UI's `running` is derived as `runningTimerBrickId === brick.id` at the parent — only one chip in the tree can satisfy this equality at a time. Data-flow proof above (§ Library modules → "Single-timer invariant enforcement").
- **SG-m4c-06 — Manual-entry sheet location.** **LOCKED — `<Sheet>` reuse via new `<TimerSheet>` component.** Mirrors `<AddChooserSheet>` simplicity (single view, one input, two buttons). No category picker, no recurrence picker. Focus trap copied verbatim from M4d's `AddChooserSheet.tsx:32-65`.
- **SG-m4c-07 — Long-press vs tap.** **LOCKED — 500 ms threshold; `pointerdown` starts a 500 ms timer; `pointerup` before 500 ms → `onTap`; 500 ms elapsed without `pointerup` → `onLongPress` + consumed flag (suppresses the eventual `onTap`).** New sibling helper `useLongPress({ holdMs: 500, onTap, onLongPress })` in `lib/longPress.ts` (adds ~25 lines; coexists with `useLongPressRepeat`). M4b's hook is unchanged. Pointer-Events only (no Touch-Events fallback), per M4b's locked decision.
- **SG-m4c-08 — Tab-background recovery.** **LOCKED — `visibilitychange` listener inside `lib/timer.ts`.** On `document.visibilityState === "visible"`, dispatch one corrective `TICK_TIMER` immediately (computed from `Date.now() - startedAtRef.current + initialMinutesDoneRef.current`). Listener registered alongside the interval and torn down in the same `useEffect` cleanup — single source of truth.

### Out of scope (M4c)

- Page-refresh timer recovery → **M8** (needs persistence of `runningTimerBrickId` + `startedAt`).
- Multiple concurrent timers → **never** (intentional, single-running invariant per § 0.5).
- Pomodoro / interval pattern → **never (or M10+)**.
- Timer-driven push notifications outside the app → **never (or M10+)**.
- Manual minute editing inline (`+/-` like the goal stepper, without a sheet) → **M5** edit mode.
- Timer audio cues at start / stop (chime on start, distinct chime on stop) → **never (or M7 polish)**. Spec mandates haptic only.
- Per-block / per-timer chime variants → **never** (same single asset as M4a; chime is reserved for cross-up celebrations only).
- A `useFocusTrap` extraction for `<TimerSheet>` and `<AddChooserSheet>` → **deferred refactor** (M5+ cleanup).
- Background-tab timer accuracy beyond `visibilitychange` recovery → **M7 polish** (would require Web Workers or Service Worker timekeeping).
- Notifications when a timer reaches `durationMin` → **never (or M10+)**.
- A `useLongPress` extraction into `react-aria` or a third-party library → **never** (~25 lines locally is cheaper than a dependency).
- Edit `durationMin` from inside `<TimerSheet>` → **M5 polish** (sheet is single-purpose: minutes elapsed only).
- Visual progress beyond the 1 s tick (e.g., a smooth `requestAnimationFrame`-driven sub-second sweep) → **M7 polish**.
- A "lap" / "split" timer → **never (or M10+)**.

### Test strategy

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: four reducer arms (`START_TIMER` first run, `START_TIMER` swaps prior, `STOP_TIMER` non-no-op + no-op, `TICK_TIMER` writes minutes + identity short-circuit, `SET_TIMER_MINUTES` clamp at floor/ceiling/in-range/non-time-kind no-op). `lib/timer.test.ts` (NEW): hook starts interval when `runningTimerBrickId` non-null, dispatches `TICK_TIMER` at 60 s boundaries (mock `Date.now()` + `vi.advanceTimersByTime`), tears down on null, dispatches corrective tick on `visibilitychange === "visible"`, identity short-circuit suppresses no-op dispatches. `lib/longPress.test.ts` extension: `useLongPress` (new sibling hook) — fires `onTap` on quick `pointerup`, fires `onLongPress` after `holdMs`, suppresses `onTap` after `onLongPress`, clears on `pointercancel` / `pointerleave` / unmount.
- **Component (Vitest + Testing Library)** — `components/BrickChip.test.tsx`: time chip renders Play glyph when stopped, Pause glyph when running, `aria-pressed` reflects running, `aria-label` matches AC #28 string for both states, tap fires haptic.light + onTimerToggle, long-press fires haptic.medium + onTimerOpenSheet (with vi.useFakeTimers + vi.advanceTimersByTime), long-press suppresses tap, reduced-motion suppresses pulse. `components/TimerSheet.test.tsx` (NEW): renders with input pre-filled to brick.minutesDone, Save fires onSave with parsed integer, Save with overflow clamps + fires haptic.medium, Save with negative clamps to 0 silently, Cancel fires onCancel, focus trap cycles through input → Save → Cancel → input. `components/TimelineBlock.test.tsx`, `components/Timeline.test.tsx`, `components/LooseBricksTray.test.tsx`: regression — pass-through plumbing for new props (no behaviour change for tick / goal). `app/(building)/BuildingClient.m4c.test.tsx` (NEW dedicated file per the M4b precedent — `defaultState` mock isolation): integration of the chip-tap → reducer → cascade → cross-up wiring; `useTimer` integration; `<TimerSheet>` open/close lifecycle.
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4c.spec.ts`: tap a time brick → glyph becomes Pause, chip pulses, badge updates over time (5 s wait + assert badge incremented or page state shows TICK_TIMER fired; vacuous-pass guarded); collapse the parent block → re-expand → badge still incremented (timer kept running); start a second timer while first is running → first chip's glyph reverts to Play, second's becomes Pause; long-press → `<TimerSheet>` opens, type a value > durationMin, Save → minutes clamped to durationMin (verify badge); long-press → Cancel → no change.
- **A11y (axe via Playwright)** — `tests/e2e/m4c.a11y.spec.ts`: zero violations on the building view with at least one time brick (running and stopped variants), zero violations on the open `<TimerSheet>`, `aria-pressed` correctness, `aria-label` parity with AC #28.

### Migration / obsolete IDs

- M4a / M4b / M4d test IDs continue to apply unchanged (tick + goal + chooser behaviour is stable). M4c IDs are net-additive.
- Existing tests that construct `AppState` literals MUST add `runningTimerBrickId: null` to compile under TypeScript strict. BUILDER fixes these in place during the TDD red phase (the typecheck will surface them immediately on first failed test). Surface the count in the eventual EVAL report; if any test was implicitly relying on `AppState` not having the field, treat as a planner-side oversight and amend in M5+ cleanup.
- The 4 deferred M4a tests.md cleanup items + the 1 deferred M4b cleanup item + the 12 vacuous-pass-guarded M4d e2e/a11y items (per `status.md` open loops) are explicitly OUT of scope for the M4c TESTS dispatch — they belong to a separate TESTS-mode re-dispatch for those milestones.

### Open questions for VERIFIER

None genuinely unresolvable from the inputs. The plan resolves all 8 spec gaps, references every relevant ADR (most importantly ADR-017's partial-fulfillment caveat above), and threads the design through every existing M3/M4a/M4b/M4d invariant. **Two items VERIFIER may want to flag and either accept or escalate** (in either case the answer should be a one-line confirmation — not a re-plan):

1. **ADR-017 partial-fulfillment.** The plan implements the timer behaviour but defers localStorage persistence to M8. Spec AC #34 explicitly does not require persistence. ADR-017's "Decision" subbullets list persistence as part of the timer's identity. Plan-side resolution: this is a planned partial-fulfillment, spec-grounded. If VERIFIER reads ADR-017 strictly, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.` and Main Claude lands a one-line ADR amendment. Otherwise PASS.
2. **`useEffect` dep on full `state` inside `lib/timer.ts`.** The plan accepts a wider-than-minimal dep array (the whole `state`) to keep the running-brick `minutesDone` change a re-trigger of the effect. A tighter dep (the running brick's `minutesDone` only) would require a derived selector and complicates the hook. Plan-side resolution: ship wide deps in M4c; optimise in M7 polish if profiling shows it. If VERIFIER prefers tight deps, the alternative is a thin `useMemo` selector — minor refactor, not a scope change. Either way is acceptable; flag for awareness.

### ADR needed

None identified pre-emptively. Every decision in this plan resolves under existing ADRs (ADR-031, ADR-039, ADR-017, ADR-018, ADR-027, ADR-022, ADR-025, ADR-026, ADR-041, ADR-032, ADR-034, ADR-035) or under one of the SG-m4c-0N locks above. **One conditional caveat:** if VERIFIER flags ADR-017 strict-fulfillment as a gap (per Open question #1), Main Claude lands a one-line ADR amendment confirming M4c's partial-fulfillment; this is a paperwork operation, not a re-plan.
