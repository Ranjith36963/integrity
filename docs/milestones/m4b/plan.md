## Milestone 4b — Goal Brick Stepper — Plan

### Pillars consumed

§ 0.1 (the wedge — proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (the second verb: a quantitative count), § 0.9 (locked Brick: `kind: 'goal'` is `count + target + unit`), § 0.10 (haptic on every increment / decrement), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-027 (commit prefixes), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts).

### Intent

Wire the **second** user-driven verb: tap `−` or `+` on a goal brick to decrement or increment its `count`, clamped to `[0, target]`. Long-press (≥ 500 ms hold) starts auto-repeat at ~50 ms intervals; release stops. M4b is purely additive on top of the M4a surface — every cascade visual (chip foreground gradient, scaffold fill, BlueprintBar opacity, HeroRing arc) and every celebration path (block-100 bloom + chime + `success` haptic; day-100 fireworks + chime + `notification` haptic) is reused unchanged. M4b adds **one** new reducer arm (`LOG_GOAL_BRICK`), **two** new buttons inside `<BrickChip>` for `kind === "goal"`, and a single long-press auto-repeat helper. The dispatch site at `<BuildingClient>` and the prop-drill through `<Timeline> → <TimelineBlock> → <BrickChip>` and `<LooseBricksTray> → <BrickChip>` are siblings to M4a's `onTickToggle`.

**1-line value-add over M4a:** the **count-style** goal verb (steppers + clamp + auto-repeat) becomes live; tick remains live; time stays inert until M4c.

**What this is NOT:** time timer (M4c). Editing the brick's `target`/`unit` (M5). Manual `count` entry by typing (M5 polish or M7). Brick delete or rename (M5). Drag reorder (M6). Persistence (M8).

### File structure

| Path                                | Tag                    | Role in M4b                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | Add `LOG_GOAL_BRICK` member to the `Action` discriminated union: `{ type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 \| -1 }`. No other type changes. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `lib/data.ts`                       | `[extends]`            | Add a `case "LOG_GOAL_BRICK":` arm to the reducer. Routes by `brickId` across `state.blocks[*].bricks[]` then `state.looseBricks[]`. On match where `kind === "goal"`, computes `next = clamp(count + delta, 0, target)`; if `next === count` (clamp hit at floor or ceiling), returns the original state by reference (true no-op — useful for the celebration cross-up gate to not re-fire). Otherwise returns a new `AppState` with the brick replaced. Non-goal id matches are no-ops. `assertNever` arm preserved.                                                                                                                                                                                                                                                                            |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` already returns `min(count / target, 1) × 100` for `kind === "goal"`. `blockPct` and `dayPct(state)` already cascade. No math changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `lib/celebrations.ts`               | `[survives unchanged]` | `useCrossUpEffect` shipped in M3, wired in M4a. M4b adds **no new call sites** — both block-100 and day-100 cross-ups already fire from `<TimelineBlock>` and `<BuildingClient>` whenever any brick mutation drives the percentage upward. Goal stepper bumps just become an additional source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/audio.ts`                      | `[survives unchanged]` | `playChime()` shipped in M4a. M4b reuses the existing module-scoped lazy `Audio` element. No new asset. Same iOS first-tap caveat applies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lib/haptics.ts`                    | `[survives unchanged]` | `haptics.light` / `haptics.medium` / `haptics.success` / `haptics.notification` already shipped in M0. M4b uses `light` for successful ticks, `medium` for clamp ticks; reuses M4a's `success` (block-100) and `notification` (day-100) cross-up paths.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `lib/motion.ts`                     | `[survives unchanged]` | `brickFill` (600 ms easeInOut) drives the chip foreground gradient on count changes — already animates `width` symmetrically per M4a SG-m4a-08. `springConfigs.bloom` and `fireworks` shipped via M4a. No new tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `lib/longPress.ts`                  | `[new]`                | Tiny pointer-events helper. Exposes a single `useLongPressRepeat({ onTick, onClampStop?, holdMs?, intervalMs?, enabled })` hook returning `{ onPointerDown, onPointerUp, onPointerCancel, onPointerLeave }` handlers. First fires `onTick()` synchronously on `pointerdown` (the initial tap is the first tick). After `holdMs` (default 500), starts a `setInterval(intervalMs ≈ 50)` that calls `onTick` on each fire. All timers cleared on `pointerup` / `pointercancel` / `pointerleave` and on unmount. Respects `useReducedMotion` only for the visual scale callback wired by `<BrickChip>` (haptics + dispatch unaffected — see § Reduced motion). Module-local; no React Context.                                                                                                        |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind`: goal chips render `−` and `+` `<button>` controls flanking the badge. Each is a separate native `<button>` with `min-height: 44px` per ADR-031, `aria-label="Decrease ${brick.name}"` / `Increase ${brick.name}"`, and `disabled` set when the corresponding clamp boundary is reached. The outer chip surface for goal stops being a `<button>` — instead it is a `<div role="group" aria-label="${brick.name}, goal, ${count} of ${target}${unitSuffix}">` that wraps the title, the foreground fill, and the two stepper buttons. Tick chips remain a single `<button>` exactly as M4a; time chips remain a single inert `<button>` with `cursor: default`. New prop: `onGoalLog?: (brickId: string, delta: 1 \| -1) => void`. M4a's `onTickToggle` survives unchanged. |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `onGoalLog` to each `<BrickChip>`. Pass-through only. No render or layout changes. M4a's `useCrossUpEffect` block-100 wiring is reused — goal stepper bumps that bring `blockPct` to 100 fire the existing bloom + chime + `success` haptic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: accepts `onGoalLog` and threads it to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: accepts `onGoalLog` and threads it to each `<BrickChip>` it renders.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | Adds `handleGoalLog = useCallback((brickId, delta) => dispatch({ type: "LOG_GOAL_BRICK", brickId, delta }), [dispatch])`. Threads it to `<Timeline onGoalLog={…}>` and to `<LooseBricksTray onGoalLog={…}>` alongside the existing `onTickToggle`. Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged — goal increments that bring `heroPct` to 100 fire fireworks + chime + `notification` haptic via the M4a path.                                                                                                                                                                                                                                                                                                                                       |
| `components/Fireworks.tsx`          | `[survives unchanged]` | Day-100 overlay shipped in M4a. M4b is just an additional trigger source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `app/globals.css`                   | `[survives unchanged]` | No new CSS variables. Reuses `--surface-2`, `--accent`, `--ink`, `--ink-dim`, `--cat-*` from M0/M1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `public/sounds/chime.mp3`           | `[survives unchanged]` | Shipped in M4a. Same single asset, same caveat about the placeholder pending real audio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Untouched in M4b (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`. M3/M4a tick chip rendering is preserved verbatim — the only behavioral surface M4b touches is the `kind === "goal"` branch inside `<BrickChip>`.

**Summary:** 1 NEW file (`lib/longPress.ts`), 7 MODIFIED files (`lib/types.ts`, `lib/data.ts`, `components/BrickChip.tsx`, `components/Timeline.tsx`, `components/TimelineBlock.tsx`, `components/LooseBricksTray.tsx`, `app/(building)/BuildingClient.tsx`), 7 REUSED-UNCHANGED files (`lib/dharma.ts`, `lib/celebrations.ts`, `lib/audio.ts`, `lib/haptics.ts`, `lib/motion.ts`, `components/Fireworks.tsx`, `public/sounds/chime.mp3`).

### Locked schema additions

```ts
// lib/types.ts — extend the Action union (M4a had four members; M4b adds a fifth)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 | -1 }; // M4b
```

```ts
// lib/data.ts — reducer arm (sketch)
case "LOG_GOAL_BRICK": {
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "goal") return b;
    const next = Math.max(0, Math.min(b.target, b.count + action.delta));
    if (next === b.count) return b; // clamp no-op — preserve identity
    return { ...b, count: next };
  };
  // Identity short-circuit: if nothing changed, return state by reference.
  let changed = false;
  const blocks = state.blocks.map((bl) => {
    let blockChanged = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) blockChanged = true;
      return out;
    });
    if (!blockChanged) return bl;
    changed = true;
    return { ...bl, bricks };
  });
  const looseBricks = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) changed = true;
    return out;
  });
  if (!changed) return state;
  return { ...state, blocks, looseBricks };
}
```

The reducer never mutates in place. The `apply` helper applies to every brick in both arrays but only one whose `id` matches AND `kind === "goal"` AND whose clamp does not no-op actually changes. Identity short-circuit at the array level keeps React reconciliation cheap on clamp-rejected ticks (especially during long-press bursts at the cap). `assertNever(action)` exhaustiveness is preserved.

**Delta granularity:** strictly `1 | -1`. No `SET_BRICK_COUNT`, no batched `delta: N`. The TypeScript literal-union type enforces this at compile time. Manual entry is M5+.

### Components

**`<BrickChip>` (goal variant — extended; tick + time variants unchanged from M4a)**

- Props (additive): `onGoalLog?: (brickId: string, delta: 1 | -1) => void`. M4a props (`brick`, `categories`, `size`, `onTickToggle`) preserved.
- DOM shape for `kind === "goal"`: outer `<div role="group" aria-label="…">` wrapping (a) the foreground-fill div (unchanged from M4a, animates via `brickFill`), (b) the title `<span>`, (c) the two stepper buttons, and (d) the existing `<TypeBadge>` numeric `count / target unit`. Layout: title flex-1 left-aligned; then `−` button; then badge (centered between buttons); then `+` button. Two-button hit area: each button is its own `<button type="button">` with `min-width: 44px`, `min-height: 44px`, transparent background, `border: none`, the lucide `Minus` / `Plus` icon at 14 px, and `cursor: pointer` (or `not-allowed` when `disabled`).
- ARIA per AC #21: `aria-label="Decrease ${brick.name}"` on `−`, `aria-label="Increase ${brick.name}"` on `+`. Outer group's `aria-label` mirrors M4a's narrative label so screen readers announce the goal context once: `"${brick.name}, goal, ${roundedPct}% complete, ${count} of ${target}${unitSuffix}"` (preserves the `buildAriaLabel` shape M4a already produces for goal).
- Disabled state per AC #3 + AC #11/12: `−` is `disabled` (HTML `disabled` attribute + visual `opacity: 0.4`) when `count === 0`. `+` is `disabled` when `count === target`. The disabled state is the natural stop signal for long-press auto-repeat — the press-down handler also short-circuits when `disabled` is true so the timer never starts at the cap (defense-in-depth alongside the reducer's clamp no-op).
- Tap path per AC #4–8: `pointerdown` on `+` → `haptics.light()` + `onGoalLog?.(brick.id, 1)` synchronously (the first tap counts as the first tick). Subsequent ticks during a held press are driven by `lib/longPress.ts`'s interval. Same shape for `−` with `delta: -1`. Each non-clamped tick fires `light`; each clamp tick fires `medium` (haptic only — the reducer no-op short-circuits dispatch from causing any UI change). The clamp-haptic decision is computed from `brick.count` and `delta` against `[0, target]` **before** dispatch so the chip can pick the right haptic without round-tripping through the reducer.
- Keyboard per AC #22: native `<button>` already handles Enter and Space (browsers fire `click` on both). Each press dispatches one tick — keyboard does NOT auto-repeat. Long-press is a touch / mouse hold gesture; keyboard users decrement / increment one tap at a time. Spec AC #22 only asks "Enter / Space triggers the same dispatch as a tap" — single-tick dispatch satisfies that.
- Animation per AC #6: the existing `data-testid="brick-fill"` div continues to animate `width` via `transition: width 600ms ease-in-out`. M4a already added the `prefers-reduced-motion: reduce → transition: none` branch; M4b reuses it verbatim. During long-press auto-repeat at ~50 ms cadence the CSS `width` transition continually retargets — the DOM `width` style updates on every reducer commit; CSS interpolates to whatever the current target is. Visually this reads as a smooth fill rising during a held press, which is the intended outcome.
- Long-press visual feedback (SG-m4b-03): each auto-repeat tick triggers a subtle scale-press (`transform: scale(0.95)` for ~80 ms, returning to `scale(1)`) on the active stepper button only. Driven by a transient state flag inside `<BrickChip>` set by the long-press hook's `onTick` callback. Reduced-motion: visual feedback suppressed (no transform applied); haptics + dispatch unaffected.

**`<TimelineBlock>` (extended)**

- Props (additive): `onGoalLog?: (brickId: string, delta: 1 | -1) => void`. Threaded to each `<BrickChip>` alongside the existing `onTickToggle`.
- Block-100 cross-up wiring is reused unchanged from M4a (`useCrossUpEffect(blockPct(block), 100, fireBlockComplete)`); a goal stepper push that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic.

**`<Timeline>` and `<LooseBricksTray>` (extended)**

- Each accepts `onGoalLog` and threads it to `<TimelineBlock>` / `<BrickChip>` respectively. No render or layout changes — pure prop pass-through, mirroring M4a's `onTickToggle` plumbing.

**`<BuildingClient>` (extended)**

- New callback `handleGoalLog = useCallback((brickId: string, delta: 1 | -1) => dispatch({ type: "LOG_GOAL_BRICK", brickId, delta }), [dispatch])`.
- Threaded to `<Timeline onGoalLog={handleGoalLog}>` and `<LooseBricksTray onGoalLog={handleGoalLog}>` next to the existing `onTickToggle`.
- Day-100 cross-up (`useCrossUpEffect(heroPct, 100, fireDayComplete)`) is reused unchanged — goal increments that bring `heroPct` to 100 trigger fireworks + chime + `notification` haptic via the M4a path. Cross-down via `−` taps resets the gate; re-cross-up via subsequent `+` taps replays the celebration per AC #17 (M3-locked one-shot-per-crossing semantics).

### Long-press / auto-repeat strategy (`lib/longPress.ts`)

- **Threshold (SG-m4b-02):** 500 ms hold to start auto-repeat. **Interval:** 50 ms between auto-repeat ticks. Both expressed as named constants (`HOLD_MS = 500`, `INTERVAL_MS = 50`) for easy M7 polish tuning.
- **Mechanics:** on `pointerdown`, the hook (a) immediately calls `onTick()` (the initial tap is the first dispatch + haptic), (b) starts a `setTimeout(holdMs)` to enter auto-repeat mode, (c) when that fires, switches to a `setInterval(intervalMs)` that calls `onTick()` on each fire. On `pointerup`, `pointercancel`, or `pointerleave`, both timers are cleared. Same on component unmount. The hook's `enabled` flag (driven by the chip's `disabled` prop on the active button) acts as a guard rail — when the button becomes disabled during a held press (e.g., the count just reached `target`), the hook clears its timers proactively. Alongside the reducer's clamp no-op, this gives belt-and-suspenders defense per AC #11.
- **Why a custom hook rather than a third-party library:** the requirement is ~30 lines of code; adding `react-aria` or `use-long-press` is over-budget for a Phase-1 single-feature need. Local utility keeps the dependency graph minimal (no new npm deps).
- **Pointer Events vs Touch Events:** use Pointer Events (`onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`). Pointer Events unify mouse, touch, and stylus; supported in every browser the Phase-1 spec targets (iOS Safari 14+, Chrome 90+). No fallback wiring needed.
- **Click suppression:** because `pointerdown` already dispatches the first tick, the same gesture's synthetic `click` event must NOT re-dispatch. `<BrickChip>` does not register an `onClick` on the stepper buttons — only the pointer handlers from the long-press hook. The native button's keyboard activation (`Enter` / `Space`) fires `click`, which IS handled separately to dispatch one tick — this is the keyboard path per AC #22.

### Haptics map

| Trigger                                             | Haptic event                         | Source                                       |
| --------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Successful `+` or `−` tick (count actually changed) | `light`                              | `<BrickChip>` (M4b NEW call site)            |
| Clamp tick (`+` at `target` or `−` at `0`)          | `medium`                             | `<BrickChip>` (M4b NEW call site)            |
| Block-100 cross-up triggered by a goal increment    | `success` (+ chime)                  | `<TimelineBlock>` (reused from M4a)          |
| Day-100 cross-up triggered by a goal increment      | `notification` (+ chime + fireworks) | `<BuildingClient>` (reused from M4a)         |
| Auto-repeat tick (per fire of the 50 ms interval)   | `light` (or `medium` if at clamp)    | `<BrickChip>` (same code path as single-tap) |

### Visual cascade

**All cascade visuals from M4a are reused unchanged.** A successful goal tick path is:

1. `<BrickChip>` calls `onGoalLog(brickId, delta)` → `dispatch({ type: "LOG_GOAL_BRICK", … })`.
2. Reducer clamps and returns new state → React re-renders.
3. New `pct` flows through `brickPct` for the goal brick → `data-testid="brick-fill"` div's `width` style retargets → CSS transitions over 600 ms (instant under reduced-motion).
4. New `blockPct` propagates → block scaffold left-bar fills (M3 wiring).
5. New `dayPct` propagates → BlueprintBar opacity recomputes (M3 wiring).
6. New `heroPct` propagates → HeroRing arc redraws (M3 wiring).
7. If `blockPct` crossed 100 from below: `<TimelineBlock>` cross-up callback fires bloom + chime + `success` haptic (M4a).
8. If `heroPct` crossed 100 from below: `<BuildingClient>` cross-up callback fires fireworks + chime + `notification` haptic (M4a).
9. Cross-down via `−` resets the gate; re-cross-up replays celebration (AC #17, already locked by M3 one-shot rule).

M4b adds **zero** new visual primitives — every paint path is M3 + M4a's.

### Reduced motion

- Chip foreground gradient `width` transition: collapses to `none` (already done in M4a; reused).
- Bloom on block-100: visual suppressed; haptic + chime still fire (already done in M4a).
- Fireworks on day-100: visual returns null; haptic + chime still fire (already done in M4a).
- **Long-press scale-press visual feedback (M4b new):** suppressed under `prefers-reduced-motion: reduce`. Haptics + dispatch unaffected.
- Per AC #20: reduced-motion users still feel every tick (`light` / `medium` haptics) and hear celebrations (`success` / `notification` chimes). The motion budget is purely visual.

### A11y

- `−` and `+` are native `<button type="button">` elements with explicit `aria-label="Decrease ${brick.name}"` / `"Increase ${brick.name}"` per AC #21. The visible glyphs (`Minus` / `Plus` icons) are `aria-hidden="true"`.
- Per AC #22, native `<button>` semantics provide keyboard activation via Enter and Space; one tap = one dispatch. No auto-repeat from the keyboard (long-press is a pointer gesture). This matches platform conventions (mobile screen-reader users don't `long-press`).
- Outer `<div role="group">` carries the goal context label so screen readers announce the brick's identity once when focus enters; per-button labels are scoped to the action.
- `disabled` attribute removes the button from the tab order at the clamp boundary (browser default for `<button disabled>`). Visual: `opacity: 0.4`, `cursor: not-allowed`. The chip remains visible and the user can keyboard-tab to the still-enabled sibling button.
- axe-core target per AC #23: zero violations on the building view with at least one goal brick rendered, and on the AddBrickSheet flow if it lands on the page after creating a goal brick. Verified by Playwright + `@axe-core/playwright` (the M4a a11y suite at `tests/e2e/m4a.a11y.spec.ts` already covers the page; M4b's tests will reuse the harness with a new fixture that adds a goal brick).
- ARIA contract: tick chips keep `aria-pressed={done}` (M4a). Goal chips do **NOT** carry `aria-pressed` — they are not toggle buttons; they are stepper controls. The role distinction is intentional and matches WAI-ARIA APG patterns for spin buttons (we use button-pair rather than a single `role="spinbutton"` because spinbutton implies a typed-in numeric input, which is M5+).

### Resolutions for open spec gaps

- **Decision SG-m4b-01 — Stepper position.** **LOCKED — flanking layout: title left, `−` button, numeric badge centered between buttons, `+` button right.** Rationale: matches the spec's recommendation; matches user mental model (decrement on the left, increment on the right) and reads naturally L-to-R. At 430 px viewport with `min-width: 44px` per button + 8 px gap + a typical 60–80 px chip badge, the layout fits without overflow on every realistic chip-name length (verified by AC #2 visual test). If a name is so long it would push the buttons off-screen, the title's `text-overflow: ellipsis` (already in M3) clips first, preserving the controls.
- **Decision SG-m4b-02 — Long-press threshold + interval.** **LOCKED — 500 ms hold to start auto-repeat; 50 ms interval.** Both per spec recommendation; both are named constants in `lib/longPress.ts` so M7 polish can tune without a refactor. 50 ms ≈ 20 ticks/sec, comfortable for "I want to crank from 0 to 30 reps quickly" without feeling jittery.
- **Decision SG-m4b-03 — Long-press visual feedback.** **LOCKED — subtle button-press scale (0.95 → 1.0, ~80 ms) on each auto-repeat tick.** Reduced-motion → suppressed. The visual is small but reinforces "the press is doing something" during a long hold. If implementation cost spikes during BUILDER, drop to the floor (no visual; haptics + count update carry the feedback) per spec's "skippable feature" allowance, and surface a follow-up note in `status.md` for M7. Default is to ship with the scale.
- **Decision SG-m4b-04 — Reducer delta granularity.** **LOCKED — `delta: 1 | -1` only.** Per spec recommendation. Enforced by TypeScript literal-union type. No `SET_BRICK_COUNT`, no batched delta. Manual numeric entry deferred to M5 polish or M7. Rationale: limits the action surface; every UI path that mutates count goes through tap → light haptic → 1-step dispatch, which keeps celebration cross-up semantics straightforward (no atomic 0 → target jump that would short-circuit haptic feedback).
- **Decision SG-m4b-05 — Clamp haptic.** **LOCKED — `medium`.** Per spec recommendation. Distinct from `light` (normal tick) and from `success` (block-100 celebration). The user feels "blocked" without being startled. iOS Vibration API maps `medium` to a heavier impact than `light` — concrete bytes per `lib/haptics.ts:medium` from M0.

### Test strategy

The TESTS-mode dispatch (separate, ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: `LOG_GOAL_BRICK` reducer (increment, decrement, clamp at top, clamp at bottom, no-op identity short-circuit, non-goal kind no-op, unknown id no-op). `lib/longPress.test.ts`: hook fires first tick on `pointerdown`, starts auto-repeat after `holdMs`, fires at `intervalMs` cadence, stops on `pointerup` / `pointercancel` / `pointerleave`, and on `enabled: false` flip. Mock-clock via `vi.useFakeTimers()`.
- **Component (Vitest + Testing Library)** — `components/BrickChip.test.tsx`: goal chip renders `−` / `+` / badge, both controls have correct ARIA labels, `−` disabled at `count === 0`, `+` disabled at `count === target`, single tap dispatches once with correct delta, single tap fires `light` haptic, clamp tap fires `medium` haptic, long-press auto-repeats (with mock clock), reduced-motion suppresses scale-press. Tick chip M4a behavior is regression-checked (no change). Time chip remains inert (no change).
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4b.spec.ts`: tap `+` on a goal brick → chip fill animates and badge updates; long-press `+` → count reaches `target`, auto-repeat stops, bloom fires; `−` decrements; clamp at 0 and at `target` are visually inert (no further fill change). Mobile-safari deferred per ADR-010.
- **A11y (axe via Playwright)** — `tests/e2e/m4b.a11y.spec.ts`: zero violations on the building view with at least one goal brick at 0%, at intermediate %, and at 100%; verifies that `disabled` controls retain accessible names; verifies that the outer group label is present.

### Edge cases

- **Tap `+` at `count === target`:** reducer no-op (identity short-circuit); chip fires `medium` haptic; chip stays at 100% gradient. Long-press auto-repeat: hook clears its interval as soon as the button's `disabled` flips true (the next render after the clamp-reaching tick).
- **Tap `−` at `count === 0`:** symmetric — reducer no-op; `medium` haptic; gradient stays at 0%.
- **Long-press at `count === target − 1`:** first auto-repeat tick brings count to `target` (success: `light` + cascade); subsequent interval fires would be clamps but the `disabled` short-circuit + identity-check reducer prevents any churn. Spec AC #11 satisfied.
- **Long-press release mid-burst:** all timers cleared within one frame on `pointerup`. No "ghost ticks" after release.
- **Pointer leaves the button mid-press (e.g., user drags off):** `pointerleave` clears timers. Pressing back DOES NOT re-trigger; user must `pointerdown` again. This matches platform stepper conventions.
- **Reduced motion:** chip fill animation collapses to instant; long-press scale-press visual suppressed; haptics + chime + dispatch unaffected.
- **`unit` is empty string:** badge renders `${count} / ${target}` with no unit suffix. ARIA label ends at "of ${target}" (no trailing space). Already covered by M3's `unitSuffix` ternary.
- **Cross to 100% on a single tap:** count was `target − 1`, tap `+` → reducer brings count to `target`, `brickPct === 100`, `blockPct` may cross to 100, `<TimelineBlock>` cross-up fires bloom + chime + `success`. Simultaneously possible: `heroPct` crosses to 100 (if this was the last incomplete brick of the day) and `<BuildingClient>` fires fireworks + chime + `notification` in the same render tick. Both celebrations can fire on the same tick — not a bug (this is M4a-locked behavior; M4b just adds another trigger source).
- **Cross-down from 100% via `−`:** chip-fill animates back; bloom does not replay; cross-up gate is reset for next time (one-shot-per-crossing per M3).
- **Re-cross-up after cross-down:** bloom replays. Spec AC #17 satisfied. Same applies to fireworks.
- **Double-click on `+` in quick succession (≤ 500 ms):** Pointer Events fire two `pointerdown`s; each fires the initial tick; auto-repeat from the first is canceled by the second's `pointerdown` (timers cleared on the second mount of the hook's listeners). End result: two ticks, both `light` haptics. Acceptable; no debounce needed.
- **Brick id collision:** defensive — reducer matches by id AND `kind === "goal"`; a non-goal brick with the same id (impossible by uuid generation but defensible) is a no-op.
- **Page refresh after a goal increment:** state lost (no persistence until M8). Same as M3 / M4a.
- **`target === 0` (degenerate user input):** `brickPct` returns 0; both buttons immediately disabled; reducer no-ops both directions. Not specified as forbidden in the schema, so the reducer must handle it gracefully. The AddBrickSheet validation prevents a user from creating such a brick (M3 SG validation), but defense-in-depth is free here.

### Out of scope (M4b)

- Time timer (start / stop / pause / manual entry) → **M4c** (per spec lines 1216–1219).
- Manual `count` entry (e.g., type "50" directly) → **M5 polish or M7**.
- Brick edit (rename, retype, retarget, change unit) → **M5**.
- Brick delete → **M5**.
- Drag reorder → **M6**.
- FLIP block-expand magic → **M7**.
- Persistence (state survives refresh) → **M8**.
- Per-brick or per-block chime variants → out of scope (same single asset as M4a).
- Long-press on tick chips → tick is single-tap toggle (locked by M4a).
- Touch-Events fallback → unnecessary; Pointer Events are universal in target browsers.

### Decisions to honor

- **ADR-031 (44 px touch target)** — both `−` and `+` buttons enforce `min-width: 44px` AND `min-height: 44px` per the cumulative cva pattern from M0 ADR-031. The chip's outer height continues to exceed 44 px because the buttons themselves do.
- **ADR-039 (ships empty)** — M4b adds no factory data. No new categories, blocks, or bricks. The goal stepper has nothing to step until a user adds a goal brick via the M3 AddBrickSheet.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4b): …` (red) and `feat(m4b): …` / `fix(m4b): …` (green/refactor). PLANNER's commits land as `docs(plan-m4b): …` and `docs(tests-m4b): …`. SHIPPER as `chore(ship-m4b): …` and `docs(ship-m4b): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4b only. M4c is a separate `/feature m4c` invocation.
- **ADR-025 (mode separation)** — this dispatch writes `/docs/plan.md` only. The TESTS-mode dispatch authors `/docs/tests.md` separately.
- **ADR-041 (single-gate Loop)** — VERIFIER will read this plan + the just-to-be-written `tests.md` against `/docs/spec.md § Milestone 4b` before BUILDER starts. No human gate between TESTS and BUILD.
- **ADR-017 (time bricks use a real timer)** — irrelevant to M4b but explicitly preserved: M4b does NOT touch time bricks; they remain inert as M3 shipped them.
- **ADR-032 / ADR-035 / ADR-034** — categories user-defined, bricks may be standalone, blocks always timed. M4b touches none of these contracts.
- **Locked Brick discriminated union** — M4b mutates `count` only on the `kind === "goal"` arm. The `target` and `unit` fields are read-only in M4b (edit is M5). The reducer's pattern-match on `kind === "goal"` is the type-system guard; without it, TypeScript would reject `b.count + delta` because tick / time bricks have no `count` field.
- **`assertNever` exhaustiveness** — `lib/data.ts:default → assertNever(action)` arm preserved by adding the `LOG_GOAL_BRICK` case. TypeScript compile guarantees this.
- **No new npm deps** — verified above. Pointer Events and `setTimeout` / `setInterval` are Web APIs.
- **Gate D (typecheck)** — added to BUILDER contract at end of M4a (per `status.md` open loop). Effective for M4b: BUILDER must run `tsc --noEmit` before declaring red→green→commit, not only Vitest.

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline`.** Same prop-drill pattern as M4a's `onTickToggle`; add `onGoalLog` as a sibling pass-through. Do not introduce React Context.
2. **`useCallback` discipline at `<BuildingClient>`.** `handleGoalLog` MUST be wrapped in `useCallback([dispatch])` — same hygiene as `handleTickToggle`. Spurious re-renders of every `<BrickChip>` would otherwise tank long-press auto-repeat (since the hook's handlers depend on a stable `onTick`).
3. **Long-press hook stability.** `lib/longPress.ts`'s returned handlers must remain referentially stable across renders unless inputs change — `useCallback` inside the hook for each handler. Otherwise React re-attaches listeners every render, which is fine functionally but triggers spurious work.
4. **Click vs pointerdown ordering.** On goal stepper buttons, do NOT register `onClick` for the pointer path (would double-fire). Keyboard activation (Enter / Space) DOES need to dispatch — handle by attaching a separate `onKeyDown` listener that fires on Enter/Space and calls the same single-tick path, OR by leaving `onClick` registered and detecting the click came from a key event vs. a pointer event. **Decision:** attach `onClick` and have the pointer-down path call `event.preventDefault()` on the synthetic click that follows pointer events. Simpler than dual paths and matches how Pointer Events are typically integrated. BUILDER must test both paths in component tests.
5. **Reducer no-op identity preservation.** The clamp-no-op MUST return the same `state` reference (not a shallow new object) — `useCrossUpEffect` uses memo'd inputs and a fresh `state` reference would force unnecessary effect re-runs, potentially mis-firing celebrations during long-press cap mashing. The sketch above's identity short-circuit guards this.
6. **Mock-clock test ergonomics.** `lib/longPress.test.ts` and the `<BrickChip>` long-press component test will use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`. BUILDER should isolate `setTimeout` / `setInterval` references inside the hook to be testable (no `window.setTimeout` or globalThis-shadow workarounds — Vitest hooks `globalThis.setTimeout` directly).
7. **Disabled-button `pointerdown` semantics.** A `<button disabled>` does NOT fire `pointerdown` in any major browser — this is the platform-correct behavior. The long-press hook's `enabled` flag is therefore redundant for the _initial_ press but still necessary to terminate an in-flight interval the moment the button becomes disabled mid-press (the renderer flips `disabled` on the same tick the cap is reached). BUILDER must verify this via the Playwright auto-repeat-to-cap test.
8. **Reduced-motion thread-through for the new scale-press visual.** Use the same `useReducedMotion()` hook M4a wired into `<BrickChip>` for the chip-fill transition. Do NOT introduce a new mechanism.

### Migration / obsolete IDs

None expected. M4a's test IDs continue to apply unchanged (tick chip behavior is stable). M4b's IDs are net-additive. The 4 deferred M4a tests.md cleanup items noted in `status.md` open loops (U-m4a-009 prose-vs-impl drift; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose; A-m4a-\* + E-m4a-005 vacuous-pass guards) are explicitly OUT of scope for the M4b TESTS dispatch — they belong to a separate `docs(tests-m4a):` cleanup commit OR a future TESTS-mode re-dispatch for M4a, not bundled into M4b.

### ADR needed

None identified. Every decision in this plan resolves under existing ADRs (ADR-031, ADR-039, ADR-017, ADR-027, ADR-041) or under one of the SG-m4b-0N locks above. If VERIFIER finds otherwise, surface as `ADR needed: …` and Main Claude will land it as `docs(harness): …`.
