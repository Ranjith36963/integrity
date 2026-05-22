> **RETIRED** by M4f per ADR-043. Kept for historical reference.

## Milestone 4c — Time Brick Timer

> **Pillars:** § 0.1, § 0.3, § 0.5 (the third verb: time elapsed against a target), § 0.9 (data model — `time` brick is `minutesDone + durationMin`), § 0.10 (haptics: light on start/stop, success on complete), ADR-031 (44 px), ADR-039 (ships empty). Completes the M4 brick-logging trilogy.

### Intent

Wire the **third and final** user-driven verb: **tap a time brick to start its timer; tap again to stop.** A long-press opens a manual entry sheet for direct minute input.

When the timer is running:

1. `minutesDone` increments at a rate of 1 per real-world minute (computed from `Date.now()` deltas in a `useEffect` interval).
2. The chip's foreground gradient width = `(minutesDone / durationMin) × 100%`, animated continuously (re-render every 1 s minimum, 5 s for battery efficiency, see SG-m4c-04).
3. The chip's ▶/⏸ glyph reflects timer state.
4. Block scaffold, HeroRing, BlueprintBar all update on the second tick (debounced; see SG-m4c-04).
5. Block / day 100% celebrations fire on cross-up via M3's `useCrossUpEffect`.

The timer **continues running when the parent block collapses** (per phase1plan.md M4 — "Timer continues running when block collapses"). Only one timer can be running at a time across the entire app. Starting a new timer auto-stops any other running timer.

Tick bricks (M4a) and goal bricks (M4b) remain unchanged.

**What this is NOT:** background-tab timer accuracy (timers pause when the tab is backgrounded — M7 polish may revisit). Multiple concurrent timers (intentionally one-at-a-time per § 0.5). Manual minute editing inside an already-running timer (M5).

### Inputs

- The full M4a + M4b surface — tick logging, goal stepper, chime asset, all cascade visuals, all celebration triggers.
- M0 haptics — `light` on start/stop, `success` on block 100%, `notification` on day 100%.
- M0 motion — `brickFill` (existing).
- The locked Brick / AppState / Action schemas from M3 + M4a + M4b.
- `lib/celebrations.ts:useCrossUpEffect`.
- `lib/dharma.ts:brickPct` for time — already `min(minutesDone / durationMin, 1) × 100`.
- A new `lib/timer.ts` module — owns the `setInterval` lifecycle and `Date.now()` accumulation. One module-level interval; one running brick id at a time.

### Outputs (regions and behaviors)

| Region                       | Role in M4c                                                                                                                                                                                                                                                           | Sync with M4b                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `<BrickChip>` (time)         | Tappable surface (whole chip). Tap dispatches `START_TIMER` (or `STOP_TIMER` if this brick is the running one). ▶ when stopped, ⏸ + subtle pulse when running. Badge: `${minutesDone} / ${durationMin} m`. Long-press (≥ 500 ms hold) opens a manual-entry `<Sheet>`. | M4a/M4b chips unchanged. Time chip gets a tap target. |
| `<TimerSheet>` (new, simple) | Bottom-sheet with a single number input (minutes), Save, Cancel. Pre-filled with current `minutesDone`. Save dispatches `SET_TIMER_MINUTES` with the new value (clamped to `[0, durationMin]`).                                                                       | M0 `<Sheet>` reused.                                  |
| Cascade visuals              | Update on each tick of the running timer (1 s effective; 5 s in batched mode per SG-m4c-04). Animates as M4a/M4b.                                                                                                                                                     | Same.                                                 |
| Celebrations                 | Same as M4a/M4b.                                                                                                                                                                                                                                                      | Same.                                                 |
| `lib/timer.ts`               | Owns the single `setInterval` (1 s ticks). Tracks `runningBrickId`, `startedAt`, accumulated `minutesDone`. On every tick, dispatches `TICK_TIMER` action. On Stop, captures final `minutesDone`.                                                                     | New file.                                             |

### Locked schema additions

```ts
// lib/data.ts — extend the Action union
type Action =
  | /* M2 + M3 + M4a + M4b actions */
  | { type: 'START_TIMER'; brickId: string }       // also stops any other running timer
  | { type: 'STOP_TIMER'; brickId: string }
  | { type: 'TICK_TIMER'; brickId: string; minutesDone: number }  // dispatched by lib/timer.ts on each setInterval tick
  | { type: 'SET_TIMER_MINUTES'; brickId: string; minutes: number };  // long-press manual entry

// AppState extension — track which brick is running (single timer invariant)
type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  runningTimerBrickId: string | null;  // null = no timer running
};
```

### Edge cases

- **Tap a time brick that's currently running** → `STOP_TIMER`. Final `minutesDone` is captured (rounded to nearest minute or floored — see SG-m4c-03). `runningTimerBrickId` set to `null`.
- **Tap a time brick when another timer is running** → `START_TIMER` for the new brick. Reducer auto-stops the old one (captures its final `minutesDone`) and sets the new id as running.
- **Timer reaches `durationMin`** → continues counting (`minutesDone` exceeds `durationMin` is allowed in state but `brickPct` clamps to 100). Block 100% celebration fires once on cross-up. User can stop to "lock in" or keep running for over-target tracking.
- **Tab backgrounded** — `setInterval` is throttled by the browser to ~1 s minimum (Chrome) or pauses entirely (Safari). On tab-foreground, recompute elapsed via `Date.now() - startedAt` to recover accurate elapsed time. Document: "Timers stay accurate across tab-background within a session, but page refresh loses everything (M8 fixes that)."
- **Reduced motion** — chip pulse animation suppressed; gradient animation collapses to per-tick (no smooth interpolation between ticks).
- **Long-press on running timer** — opens TimerSheet. User can manually set minutes (clamped). Save updates `minutesDone` and resumes the timer from the new value (timer keeps running). Cancel discards.
- **Manual entry exceeds `durationMin`** → clamp to `durationMin`. Haptic `medium` (cap cue, matching M4b).
- **Page refresh while timer running** — state lost (no persistence until M8). Documented limitation; M8 will persist `runningTimerBrickId` + a `startedAt` timestamp.

### Acceptance criteria

**Tap-to-start / tap-to-stop**

1. Tapping a time brick chip (whole surface, ≥ 44 px) dispatches `START_TIMER` with that brick's id when the brick is not running.
2. Tapping a running time brick chip dispatches `STOP_TIMER` with that brick's id.
3. `START_TIMER` reducer sets `state.runningTimerBrickId = brickId`. If another brick was running, reducer also implicitly stops it (sets `state.runningTimerBrickId = brickId`; no separate STOP for the old brick is needed because the invariant is single-running).
4. `STOP_TIMER` reducer sets `state.runningTimerBrickId = null`.

**Timer lifecycle** 5. `lib/timer.ts` runs a single `setInterval` (1 s tick) when `state.runningTimerBrickId !== null`. Stops the interval when `runningTimerBrickId === null`. 6. Each tick dispatches `TICK_TIMER` with the brick id and the new `minutesDone` (computed as `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`). 7. `TICK_TIMER` reducer updates the brick's `minutesDone` to the new value. 8. The chip foreground gradient width updates to `(minutesDone / durationMin) × 100%` on each render. Reduced-motion → fill jumps per tick rather than animating; default → smooth via `brickFill`. 9. The badge text updates to `${minutesDone} / ${durationMin} m`. Glyph: ▶ when stopped; ⏸ + subtle scale-pulse when running (suppressed under reduced-motion). 10. Haptic `light` fires on Start; `light` fires on Stop.

**Single-timer invariant** 11. Starting timer B while timer A is running auto-stops A (A's final `minutesDone` is preserved at the value captured by the last `TICK_TIMER`). 12. After the auto-stop, A's chip glyph reverts to ▶; B's becomes ⏸.

**Manual-entry sheet (long-press)** 13. Long-press (≥ 500 ms) on a time brick chip opens `<TimerSheet>`. 14. Sheet has a number input pre-filled with the current `minutesDone` and Save / Cancel buttons. 15. Save dispatches `SET_TIMER_MINUTES` with the new value, clamped to `[0, durationMin]`. 16. If the brick was running, it stays running after Save (the new `minutesDone` becomes the new floor; timer continues accumulating from there). 17. Cancel closes the sheet without dispatching. 18. Manual entry > `durationMin` → clamps + `medium` haptic.

**Cascading visuals + celebrations** 19. Block scaffold, BlueprintBar, HeroRing, hero numeral all update on each `TICK_TIMER` (1 s cadence). 20. When a tick crosses `blockPct` to 100, bloom + chime + `success` haptic fire (one-shot per crossing). 21. When a tick crosses `dayPct` to 100, fireworks + chime + `notification` haptic fire.

**Block-collapse independence** 22. Starting a timer, then collapsing the parent block, does NOT stop the timer. `lib/timer.ts` is unaware of expand/collapse state. 23. Re-expanding the block shows the chip with the latest accumulated `minutesDone`.

**Tab-background recovery** 24. After the tab is backgrounded for ≥ 60 s (browser throttles `setInterval`), foregrounding the tab recomputes `minutesDone` from `Date.now() - startedAt + initialMinutesDone` so the displayed value is accurate. (Implemented as a `visibilitychange` listener that dispatches a one-off `TICK_TIMER` with the corrected value.)

**Tick + goal bricks unchanged** 25. Tick bricks behave identically to M4a. 26. Goal bricks behave identically to M4b.

**Reduced motion + a11y** 27. Chip pulse-while-running animation suppressed under `prefers-reduced-motion`. 28. Time brick chip exposes accessible name `"${name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`. 29. `aria-pressed={running}` on the tap surface. 30. axe-core: zero violations.

**Quality** 31. `tsc --noEmit`: zero new errors. 32. ESLint: zero new errors. 33. Vitest: reducer tests for `START_TIMER` (incl. auto-stop of prior running), `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`. `lib/timer.ts` lifecycle tests via fake timers. 34. Playwright: tap a time brick → glyph becomes ⏸, chip pulses, badge updates over time; collapse the block → timer keeps running (verify via 5 s wait + re-expand); start a second timer → first auto-stops; manual entry via long-press → minutes update.

### Out of scope (M4c)

- Page-refresh timer recovery — **M8** (needs persistence)
- Multiple concurrent timers — **never** (intentional, single-timer invariant)
- Pomodoro / interval pattern — **never (or M10+)**
- Timer-driven notifications outside the app — **never (or M10+)**
- Manual minute editing while NOT running (i.e. inline +/- like the goal stepper) — **M5** (edit mode)

### Open spec gaps (resolve at VERIFY)

- **SG-m4c-01 — `lib/timer.ts` shape.** Recommendation: a single module-level `useTimer()` React hook + an interval driven by a `useEffect` watching `state.runningTimerBrickId`. The hook lives in the root layout (or BuildingClient) so it doesn't unmount when blocks collapse. Alternative: a Zustand-style external store. Lean toward the simpler hook-in-root approach.
- **SG-m4c-02 — Tick cadence vs render cost.** Recommendation: 1 s tick interval. If render profiling shows jank, batch to dispatching `TICK_TIMER` every 5 s while still tracking accurate elapsed via `Date.now()` (display can update via local component state for the visual at 1 s; reducer state at 5 s). M4c ships 1 s by default; revisit in M7 if needed.
- **SG-m4c-03 — Rounding when stopping.** Recommendation: capture `minutesDone` as `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`. Don't round up — only "completed" minutes count. Alternative: round to nearest. Lean toward `floor` for accuracy and to avoid premature 100% celebrations.
- **SG-m4c-04 — Battery / power efficiency.** Recommendation: 1 s tick is acceptable for foreground; browser throttles when backgrounded. M4c does NOT implement explicit battery-aware logic. M7 polish can add `requestAnimationFrame`-based smoother visuals or longer ticks.
- **SG-m4c-05 — Single-timer invariant enforcement.** Recommendation: enforce in the reducer (`START_TIMER` always sets `runningTimerBrickId`, never appends to a list). UI never tries to display two ⏸ glyphs at once because `running` is derived from `state.runningTimerBrickId === brick.id`.
- **SG-m4c-06 — Manual-entry sheet location.** Recommendation: bottom sheet via M0 `<Sheet>`, single number input, Save/Cancel. Mirrors AddBrickSheet's view-toggle pattern but simpler (one view, one field).
- **SG-m4c-07 — Long-press conflict with tap-to-start.** Recommendation: `pointerdown` starts a 500 ms timer; if `pointerup` fires before 500 ms, treat as tap (start/stop); if 500 ms elapses without `pointerup`, treat as long-press (open sheet, cancel the tap). Standard long-press pattern.
- **SG-m4c-08 — Tab-background recovery.** Recommendation: `visibilitychange` listener in `lib/timer.ts` dispatches a corrective `TICK_TIMER` on `visibilitychange === 'visible'` events when a timer is running.
