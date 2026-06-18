## Milestone 4b — Goal Brick Stepper

> **Pillars:** § 0.1, § 0.3, § 0.5 (the second verb: a quantitative count), § 0.9 (data model — `goal` brick is `count + target + unit`), § 0.10 (haptic on every increment / decrement), ADR-031 (44 px), ADR-039 (ships empty). Builds on M4a.

### Intent

Wire the **second** user-driven verb: **tap +/- on a goal brick to increment or decrement its count.** Long-press accelerates (~50 ms intervals after the first tick).

When the user taps + or - on a goal brick:

1. The brick's `count` changes (clamped to `[0, target]` — count cannot exceed target; can drop to zero).
2. The chip's foreground gradient width = `(count / target) × 100%` animates via `brickFill` (600 ms easeInOut).
3. The numeric badge `count / target unit` updates synchronously.
4. All M4a cascade visuals (block scaffold, HeroRing, BlueprintBar) update on the same tick.
5. Block / day 100% celebrations fire on cross-up via the same M3 `useCrossUpEffect` hook M4a uses.

Tick bricks (M4a) and time bricks (M4c) remain unchanged.

**What this is NOT:** time timer (M4c). Editing the brick's `target` or `unit` (M5). Brick delete (M5).

### Inputs

- The full M4a surface — tick bricks tappable, chime asset shipped, all cascade visuals proven.
- M0 haptics — `light` on each tick / detent.
- M0 motion — `brickFill` (existing).
- The locked Brick / AppState / Action schemas from M3 + M4a.
- `lib/celebrations.ts:useCrossUpEffect` (M3, used in M4a).
- `lib/dharma.ts:brickPct` for goal — already returns `min(count / target, 1) × 100`; no math change.

### Outputs (regions and behaviors)

| Region                     | Role in M4b                                                                                                                                                                                                                                                                                                                                  | Sync with M4a                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `<BrickChip>` (goal)       | Renders inline `−` and `+` `<button>` controls flanking the badge. Each ≥ 44 px tap target (may stack vertically on narrow screens). Tap dispatches `LOG_GOAL_BRICK` with `delta: -1 \| +1`. Long-press (≥ 500 ms hold) starts auto-repeat at ~50 ms intervals; release stops. Chip foreground gradient width animates per `count / target`. | M4a chip element is preserved; controls are added. Tick chips unchanged. |
| `<BrickChip>` (tick, time) | Unchanged from M4a.                                                                                                                                                                                                                                                                                                                          | Same.                                                                    |
| Cascade visuals            | All update per `blockPct` recompute, same as M4a.                                                                                                                                                                                                                                                                                            | Same.                                                                    |
| Celebrations               | Block/day 100% bloom + chime + fireworks fire when a goal stepper push crosses the relevant percentage.                                                                                                                                                                                                                                      | Same hook, additional trigger source.                                    |

### Locked schema additions

```ts
// lib/data.ts — extend the Action union
type Action =
  | /* M2 + M3 + M4a actions */
  | { type: 'LOG_GOAL_BRICK'; brickId: string; delta: 1 | -1 };
```

Reducer applies `delta` to `count`, clamps to `[0, target]`, returns a new `AppState`. `assertNever` preserved.

### Edge cases

- **Tap + at `count === target`** → no-op (clamp). Haptic fires `medium` (a "you've hit the cap" cue, distinct from `light`). Chip stays at 100% gradient.
- **Tap - at `count === 0`** → no-op. Haptic fires `medium` (same cap cue).
- **Long-press at `count === target - 1`** → first auto-repeat tick brings count to `target`; subsequent ticks no-op (clamped). Auto-repeat stops naturally on cap (no infinite tick stream).
- **Long-press release** → auto-repeat stops within one frame.
- **Reduced motion** — chip fill animation collapses to instant; long-press visual feedback (cursor pulse, etc.) suppressed; haptics + audio unaffected.
- **`unit` is empty string** — badge renders just `count / target` with no unit suffix. (M3 SG already covered this; spec just notes the M4b behavior is identical.)
- **Cross to 100% on a single tap** (count was target - 1, tap +) → bloom + chime fire.
- **Cross down from 100% via tap -** → no replay-suppression issue; cross-up rule is one-shot per crossing.

### Acceptance criteria

**Stepper UI**

1. Goal `<BrickChip>` renders `−` and `+` `<button>` controls. Each ≥ 44 px tap target.
2. Controls are positioned so they don't overlap the chip badge or fill gradient at 430 px viewport.
3. `−` is disabled (visually + `disabled` attribute) when `count === 0`. `+` is disabled when `count === target`.

**Increment / decrement** 4. Tap `+` dispatches `LOG_GOAL_BRICK` with `delta: 1`; reducer increments `count` by 1, clamped to `target`. 5. Tap `−` dispatches `LOG_GOAL_BRICK` with `delta: -1`; reducer decrements `count` by 1, clamped to 0. 6. Chip foreground gradient width animates to `(count / target) × 100%` via `brickFill` (600 ms easeInOut). Reduced-motion → instant. 7. Badge text updates to `${count} / ${target}${unit ? ' ' + unit : ''}` synchronously. 8. Haptic `light` fires on every successful (non-clamped) tick. 9. Haptic `medium` fires when a tap is rejected by the clamp (already at cap).

**Long-press auto-repeat** 10. Press-and-hold `+` for ≥ 500 ms triggers auto-repeat at ~50 ms intervals. 11. Auto-repeat stops on release OR on hitting `count === target`. 12. Same applies to `−` (auto-repeats down to `count === 0`). 13. Each auto-repeat tick fires `light` haptic; clamp tick fires `medium`.

**Cascading visuals + celebrations** 14. Same as M4a's tick cascade — chip / scaffold / BlueprintBar / HeroRing all update on the same render tick. 15. Block 100% celebration fires when a stepper push (single tap or auto-repeat tick) brings `blockPct` to 100 from `< 100`. Bloom + chime + `success` haptic. 16. Day 100% celebration fires when a stepper push brings `dayPct` to 100. Fireworks + chime + `notification` haptic. 17. Cross-down + re-cross-up replays the celebration.

**Tick + time bricks unchanged** 18. Tick bricks render and behave identically to M4a. 19. Time bricks render identically to M3 (still inert; their verb arrives in M4c).

**Reduced motion + a11y** 20. Reduced-motion → fill animation instant; long-press visual feedback suppressed. 21. `−` and `+` buttons have accessible names `"Decrease ${name}"` and `"Increase ${name}"`. 22. Each button is keyboard-focusable; Enter/Space triggers the same dispatch as a tap. 23. axe-core: zero violations.

**Quality** 24. `tsc --noEmit`: zero new errors. 25. ESLint: zero new errors. 26. Vitest: reducer tests for `LOG_GOAL_BRICK` (increment, decrement, clamp top, clamp bottom). Chip tests (controls render, disabled state, dispatch on tap, long-press auto-repeat). 27. Playwright: tap + on a goal brick → chip fills, badge updates; long-press → auto-repeat ticks ~50 ms apart; cross to target fires bloom; mobile viewport 430 px; no overflow.

### Out of scope (M4b)

- Time timer (start / stop / manual entry) — **M4c**
- Manual `count` entry (e.g. type "50 reps" directly) — **M5 polish or M7**
- Brick edit (rename, retype, retarget) — **M5**
- Brick delete — **M5**

### Open spec gaps (resolve at VERIFY)

- **SG-m4b-01 — Stepper position.** Recommendation: `−` on the left edge of the chip (after the title), `+` on the right edge (before the badge), badge centered. Alternative: both on the right side stacked. Lean toward flanking layout for clearer "decrement / increment" mental model.
- **SG-m4b-02 — Long-press threshold.** Recommendation: 500 ms hold to trigger auto-repeat; auto-repeat interval 50 ms. Both round numbers; can tune in M7 polish.
- **SG-m4b-03 — Long-press visual feedback.** Recommendation: subtle button-press scale (0.95 → 1.0) on each auto-repeat tick. Reduced-motion → none. Skippable feature; if it adds complexity, drop and add in M7.
- **SG-m4b-04 — Reducer delta granularity.** Recommendation: `delta: 1 | -1` only. No "set count directly" action in M4b. (M5 may add `SET_BRICK_COUNT` for edit-mode manual entry.)
- **SG-m4b-05 — Clamp haptic.** Recommendation: `medium` (heavier than `light` so the user feels "blocked"). Distinct from `light` (normal tick) and from `success` (block-100% celebration).

---
