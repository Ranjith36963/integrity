## Milestone 4a — Tick Brick Logging

> **Pillars:** § 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (visual identity — every tap is a brick laid), § 0.5 (interaction primitives — the simplest verb: a tick), § 0.9 (data model — `tick` brick is `done: boolean`), § 0.10 (haptics: every tap fires light), ADR-031 (44 px touch targets), ADR-039 (ships empty).

### Intent

Wire the simplest user-driven verb in the entire app: **tap a tick brick to mark it done.** This is the moment Dharma stops being a setup screen and starts being a tracker.

When the user taps a tick brick, four things happen on the same React tick:

1. The brick's `done` flag flips (`false ↔ true`).
2. The chip's foreground gradient animates from 0% → 100% (or back) via M0's `brickFill` token.
3. Every dependent score recomputes: that brick's `brickPct`, its containing block's `blockPct` (or the loose-brick aggregate), the day's `dayPct(state)`, and any `categoryDayPct` reads.
4. Every dependent visual updates: BrickChip fill, block scaffold left-bar height, HeroRing arc length, BlueprintBar segment opacity.

If the flip causes a block to cross to 100%, M3's wired `useCrossUpEffect` fires the bloom + chime for the first time from a real user gesture (M3 only fired it via state injection). If the flip causes the day to cross to 100%, the fireworks overlay plays.

**Goal and time bricks remain inert in M4a** (tap = no-op; chip displays as in M3). They get their verbs in M4b and M4c.

**What this is NOT:** goal stepper (M4b). Time timer (M4c). Block edit / delete (M5). Drag reorder (M6). Polish layer (M7). Persistence (M8). Calendar nav (M9). Voice (M10).

### Inputs

- The full M3 surface — top bar, hero with `<HeroRing>`, BlueprintBar with opacity modulation, 24-hour timeline with `<TimelineBlock>` cards (tap-to-expand wired, scaffold left-bar wired), `<LooseBricksTray>`, dock with `+`, `<AddBrickSheet>`, `<AddBlockSheet>`, `<EditModeProvider>`, `<SlotTapTargets>`, `<BrickChip>` (renders three kinds; tap = no-op in M3).
- M0 motion tokens — `brickFill` (600 ms easeInOut, M3 already wires it on `<BrickChip>` for chip foreground gradient).
- M0 haptics — `light` on each tick toggle, `success` on block 100% (already fires inside `useCrossUpEffect`), `notification` on day 100% (same).
- M0 audio — chime for block 100% and a longer chime for day 100% (M3 deferred the assets; M4a lands `public/sounds/chime.mp3`; see SG-m4a-04).
- The locked Brick / AppState / Action schemas from M3.
- `lib/celebrations.ts:useCrossUpEffect` — M3 ships this hook unchanged. M4a wires it to fire on real user gestures, not state injection.
- `lib/dharma.ts` — `brickPct` already returns 0 / 100 for tick bricks; no math change.

### Outputs (regions and behaviors)

| Region                       | Role in M4a                                                                                                                                                                                                                         | Sync with M3                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `<BrickChip>` (tick)         | Wraps the chip in a tap-surface (`<button>` or click-handler on the existing chip element). Tap fires `LOG_TICK_BRICK` action. Chip foreground gradient animates 0 ↔ 100 via M0 `brickFill`. ✓ / ☐ glyph swaps via the same render. | M3 chip element is preserved; only the tap target is added.    |
| `<BrickChip>` (goal, time)   | Tap = no-op (unchanged from M3). Cursor stays default.                                                                                                                                                                              | Untouched.                                                     |
| Block scaffold left-bar      | Height re-computes from `blockPct(block)` after every tick toggle. Animates via existing M3 transition (600 ms `height` tween).                                                                                                     | M3 path preserved; only the trigger (a real user tick) is new. |
| `<HeroRing>`                 | Stroke-dashoffset re-computes from `dayPct(state)` after every tick toggle. Animates via M3's existing 600 ms easeInOut.                                                                                                            | Same.                                                          |
| BlueprintBar segment opacity | Re-computes from `blockPct` on tick.                                                                                                                                                                                                | Same.                                                          |
| `bloom` celebration          | Fires when a block crosses to 100% from a real tick. Cross-down + cross-up retriggers per M3's one-shot rule.                                                                                                                       | M3 wired; M4a is the first real fire.                          |
| `fireworks` celebration      | Fires when the day crosses to 100% from a real tick.                                                                                                                                                                                | M3 wired; M4a is the first real fire.                          |
| Chime audio                  | M4a lands `public/sounds/chime.mp3` (≤ 30 KB). Loaded on app boot via `new Audio()`. Plays on block 100% (and day 100%, same asset). Mute-respecting per OS.                                                                        | M3 deferred this asset to M4 per SG-m3-12. M4a delivers it.    |

### Locked schema additions

```ts
// lib/data.ts — extend M3's Action union
type Action =
  | /* M2 + M3 actions */
  | { type: 'LOG_TICK_BRICK'; brickId: string };  // routes by id; flips `done` in place
```

The reducer locates the brick by `id` (search `state.blocks[*].bricks[]` then `state.looseBricks[]`), flips `done`, returns a new `AppState` (immutable update; no in-place mutation; existing M3 reducer pattern). `assertNever` exhaustiveness preserved.

### Edge cases

- **Reduced motion** — chip fill animation collapses to instant; block scaffold + HeroRing animations same; bloom + fireworks visual suppressed; chime + haptics still fire.
- **Tap during animation** — second tap registers immediately; reducer flips `done` again; the in-flight animation cancels and reverses (Framer Motion handles this natively).
- **Tap a tick brick with `categoryId: null`** — works the same; uncategorized fill uses category-of-parent or `--surface-2` fallback (matches M3's chip rendering).
- **Tap a tick brick inside a collapsed block** — block must be expanded for the chip to be visible (M3 collapses by default). Tap on a non-visible chip is impossible by definition.
- **Tap a tick brick inside the Loose Bricks tray when tray is collapsed** — chips are visible in the collapsed scroll row (per M3 SG-m3-15); tap works directly without expanding the tray.
- **Block at 99% pre-tick, single tick brick at 0%, user toggles to done** → block hits 100%, bloom fires once, day percentage updates.
- **Day at 99% pre-tick, single brick brings it to 100%** → fireworks fires once.
- **Untoggle from 100% back to 99%** → bloom does NOT replay until the block re-crosses up (one-shot per crossing per M3 SG-m3-05).
- **Audio fails to load** (offline, blocked) — celebration visuals still fire; chime silently skipped (try/catch around `audio.play()`).
- **Audio blocked by browser** (no user gesture yet) — first chime may be silent on iOS; subsequent chimes work (browser unlocks audio after first user gesture; M4a's first tick IS a user gesture so this is self-resolving by the second tick).
- **Page refresh after a tick** — state is lost (no persistence until M8). Same as M3.

### Acceptance criteria

**Tap-to-tick (the verb)**

1. The `<BrickChip>` for a `tick` brick is a tappable surface ≥ 44 px (ADR-031). Tap target spans the full chip, not just the glyph.
2. Tapping a `tick` brick with `done: false` dispatches `LOG_TICK_BRICK` with that brick's id; reducer flips `done` to `true`.
3. Tapping a `tick` brick with `done: true` flips it back to `false`. (Toggle, not one-way.)
4. The chip foreground gradient animates from 0% → 100% (on toggle to `done: true`) or 100% → 0% (on toggle to `false`) via M0 `brickFill` (600 ms easeInOut). Reduced-motion → instant.
5. The check glyph swaps from `☐` to `✓` (or back) on the same render tick as the toggle.
6. Haptic `light` fires on every tap.

**Goal and time bricks unchanged** 7. Tapping a `goal` brick chip → no-op. No reducer dispatch. No haptic. Chip rendering identical to M3. 8. Tapping a `time` brick chip → no-op. No reducer dispatch. No haptic. Chip rendering identical to M3.

**Cascading visuals** 9. After a tick toggle, the containing block's scaffold left-bar height updates to the new `blockPct`. Animates via M3's existing transition (600 ms). Reduced-motion → instant. 10. After a tick toggle, the BlueprintBar segment for the containing block updates opacity to `0.3 + ((newBlockPct / 100) × 0.7)`. Reduced-motion → instant. 11. After a tick toggle, the `<HeroRing>` stroke-dashoffset updates to reflect the new `dayPct(state)`. Animates over 600 ms. Reduced-motion → instant. 12. After a tick toggle, the hero numeral text node updates to `${Math.round(dayPct(state))}%` synchronously with the ring. 13. All four visual updates (chip / scaffold / BlueprintBar / HeroRing) reflect the same reducer state — no flash of stale percentages.

**Block 100% celebration (first real fire)** 14. When a tick toggle causes `blockPct(block)` to cross from `< 100` to `100`, M3's `useCrossUpEffect` fires the `bloom` spring on that block card (M0 `springConfigs.bloom = { stiffness: 220, damping: 22 }`). 15. On the same crossing, the chime audio plays (`new Audio('/sounds/chime.mp3').play()`; ≤ 30 KB asset). 16. On the same crossing, `success` haptic fires. 17. Crossing back below 100 (untoggle a tick) and re-crossing up fires the celebration again. One-shot per crossing.

**Day 100% celebration (first real fire)** 18. When a tick toggle causes `dayPct(state)` to cross from `< 100` to `100`, the fireworks overlay plays (~1.6 s; bounded particle count). 19. On the same crossing, `notification` haptic fires. 20. On the same crossing, the chime audio plays (same asset as block 100%). 21. Crossing back below 100 and re-crossing up fires fireworks again.

**Audio asset** 22. `public/sounds/chime.mp3` exists, ≤ 30 KB, single short tone. 23. Audio is loaded once on app boot via `new Audio()`. No re-fetch per play. 24. Audio failures (network, codec) are caught silently; visuals still fire.

**Reduced motion + a11y** 25. `prefers-reduced-motion: reduce` → chip fill, block scaffold, HeroRing animations all collapse to instant. Bloom and fireworks suppressed. 26. Reduced-motion does NOT suppress haptics or audio. 27. `<BrickChip>` for `tick` exposes its tap target via accessible name `"${name}, ${done ? 'done' : 'not done'}, tap to toggle"`. 28. `aria-pressed={done}` on the tick chip's tap surface (button semantics). 29. axe-core: zero violations on day view with all three brick kinds rendered. 30. Tab order: tick brick chips are reachable and tappable via keyboard (Enter or Space toggles).

**Quality** 31. `tsc --noEmit`: zero new errors. 32. ESLint: zero new errors. 33. Vitest: all existing tests still pass; new `LOG_TICK_BRICK` reducer tests + chip tap tests added. 34. Playwright: tap a tick brick → chip fills, scaffold grows, HeroRing arc grows, BlueprintBar opacity increases. Mobile viewport 430 px; no horizontal overflow.

### Out of scope (M4a)

- Goal +/- stepper — **M4b**
- Time timer (start / stop / pause / manual entry) — **M4c**
- Block edit / brick edit (rename, retype, retarget) — **M5**
- Block delete / brick delete with "Just today / All recurrences" — **M5**
- Drag reorder — **M6**
- FLIP block-expand magic — **M7**
- Persistence — **M8**
- Calendar nav — **M9**

### Open spec gaps (resolve at VERIFY)

- **SG-m4a-01 — Tap target shape.** Recommendation: wrap the existing `<BrickChip>` element in a `<button type="button">` for tick bricks ONLY; goal and time bricks keep the M3 non-interactive `<div>` element. Alternative: always render `<button>` and dispatch by `kind` inside the click handler (simpler but means goal/time chips have a dangling tap target that does nothing). Lean toward per-kind branching for cleaner semantics.
- **SG-m4a-02 — Chip element role.** Recommendation: `role="button"` + `aria-pressed={done}` on the tap surface for tick bricks. Screen readers announce "${name}, pressed/not pressed, button". Goal/time bricks keep their M3 `<div>` (no role).
- **SG-m4a-03 — Reducer placement.** Recommendation: extend `lib/data.ts` reducer with `LOG_TICK_BRICK` action; route by `brick.parentBlockId` is NOT needed (we already have the brick id; search both arrays). Pattern matches M3's `ADD_BRICK` routing.
- **SG-m4a-04 — Audio asset format + size.** Recommendation: MP3 (broad codec support), ≤ 30 KB, single short tone (~250 ms). Source from a royalty-free pack or generate via a tone generator. Final asset committed under `public/sounds/chime.mp3`.
- **SG-m4a-05 — Mute respect.** Recommendation: M4a does NOT implement explicit mute respect (no UI mute toggle). Browser/OS-level mute is honored automatically by `<audio>`. M7 polish layer can add a per-app mute toggle if needed.
- **SG-m4a-06 — First-tap audio unlock on iOS.** Recommendation: accept that the first chime may be silent on iOS Safari (browser audio unlock requirement); the M4a first tick IS a user gesture, which unlocks audio for the rest of the session. Document in CHANGELOG.
- **SG-m4a-07 — Test for cross-up firing.** Recommendation: Vitest tests use `useCrossUpEffect`'s state-injection seam (already shipped in M3); Playwright tests assert the celebration class lands on the DOM after a tick that brings block to 100%.
- **SG-m4a-08 — Chip animation direction on untoggle.** Recommendation: the `brickFill` token animates symmetrically — toggle to `true` plays 0 → 100; toggle to `false` plays 100 → 0. No special-case for "undo" gesture.

---
