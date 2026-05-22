## Milestone 4a — Tick Brick Logging — Plan

### Pillars consumed

§ 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (interaction primitives — the simplest verb is a tick), § 0.9 (data model — `tick` brick is `done: boolean`), § 0.10 (haptic on every tap), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts).

### Intent

Wire the simplest user-driven verb in the entire app: **tap a tick brick to mark it done.** This is the moment Dharma stops being a setup screen and starts being a tracker. M4a delivers ONLY the tick verb; goal stepper is M4b, time timer is M4c. Every M3 surface (HeroRing, BlueprintBar opacity, scaffold left-bar, BrickChip rendering, AddBrickSheet, LooseBricksTray, AddBlockSheet, EditModeProvider) survives unchanged at the structural level — M4a additively wraps the tick chip in a tap surface, dispatches a new reducer action, and ships the chime audio asset that M3 deferred per SG-m3-12. M4a is also the first feature that fires `useCrossUpEffect` from a real user gesture; M3 ships the hook unwired (only `lib/celebrations.test.ts` injects state). M4a closes that loop end-to-end: tap → reducer → cascade visuals → bloom + chime + fireworks.

**What this is NOT:** goal stepper (M4b). Time timer (M4c). Block edit / brick edit / brick delete (M5). Drag reorder (M6). FLIP block-expand magic (M7). Persistence (M8).

### File structure

| Path                                | Tag                    | Role in M4a                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | Add `LOG_TICK_BRICK` member to the `Action` discriminated union. No other type changes. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                 |
| `lib/data.ts`                       | `[extends]`            | Add a `case "LOG_TICK_BRICK":` arm to the reducer. Routes by `brickId`: search `state.blocks[*].bricks[]` first, then `state.looseBricks[]`; flip `done` on the matching brick; return new `AppState` (immutable update). No-op return when id is unmatched (defensive, matches M3 ADD_BRICK pattern). Non-tick bricks with the matching id are also a no-op (defensive — tap dispatch only fires for tick chips, but the reducer guards against future drift). |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` already returns `done ? 100 : 0` for tick (lines 32-33). `blockPct` and `dayPct(state)` already cascade. No math changes.                                                                                                                                                                                                                                                                                                                            |
| `lib/celebrations.ts`               | `[survives unchanged]` | M3 ships `useCrossUpEffect` complete. M4a only adds **call sites** (in `TimelineBlock` for block-100 and in `BuildingClient` for day-100). The hook itself is untouched.                                                                                                                                                                                                                                                                                        |
| `lib/audio.ts`                      | `[new]`                | Tiny helper: lazily constructs a single `HTMLAudioElement` for `/sounds/chime.mp3` at first call, caches it, exposes `playChime()` that calls `.play()` inside `try/catch` (silent failure on iOS pre-unlock or offline). Server-side / SSR guard: returns no-op when `typeof Audio === 'undefined'`.                                                                                                                                                           |
| `lib/haptics.ts`                    | `[survives unchanged]` | `haptics.light` / `haptics.success` / `haptics.notification` already shipped in M0. M4a calls them from new sites.                                                                                                                                                                                                                                                                                                                                              |
| `lib/motion.ts`                     | `[extends]`            | Add `fireworks` motion token (1.6 s easeOut) per spec.md M3 line 1124 ("New token `fireworks`...") — M3 plan reserved this; M4a is where the overlay actually consumes the token. If M3 already shipped this token (verify), tag becomes `[survives unchanged]`. **PLANNER VERIFY:** `lib/motion.ts` line 34 currently has `brickFill`; check whether `fireworks` was added in M3 ship; if not, M4a adds it.                                                    |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind`: tick chips dispatch `LOG_TICK_BRICK` on click; goal/time chips keep M3's `<button>` element with `cursor: default` and click handler is no-op (no dispatch, no haptic). Tick chip's `<button>` gains `aria-pressed={done}` and a richer aria-label ("${name}, ${done ? 'done' : 'not done'}, tap to toggle"). Adds `onTickToggle?: (brickId: string) => void` prop.                                                                     |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `onTickToggle` down to each `<BrickChip>`. Wires `useCrossUpEffect(blockPct(block), 100, onBlockComplete)` — when block crosses to 100, fires `haptics.success()` + `playChime()` + sets a one-shot `bloom` animation flag on the card (M0 `springConfigs.bloom`). Suppresses bloom visual when `useReducedMotion()` is true; haptics + chime still fire.                                                                                               |
| `components/Fireworks.tsx`          | `[new]`                | Day-100% celebration overlay. Fixed-position absolute layer; bounded particle count; ~1.6 s easeOut animation per the new `fireworks` motion token; respects `useReducedMotion` (visual suppressed but haptic + chime still fire from the host). Mounted always; `active` prop drives a single play.                                                                                                                                                            |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | (a) Adds `onTickToggle` callback that dispatches `{ type: 'LOG_TICK_BRICK', brickId }`; passes it down to `Timeline → TimelineBlock → BrickChip` and to `LooseBricksTray → BrickChip`. (b) Hosts the day-level cross-up: `useCrossUpEffect(dayPct(state), 100, onDayComplete)` where `onDayComplete` fires `haptics.notification()` + `playChime()` + sets a `fireworksActive` state. (c) Renders `<Fireworks active={fireworksActive} />` overlay.             |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: accepts `onTickToggle` and threads it to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                          |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: accepts `onTickToggle` and threads it to each `<BrickChip>` it renders.                                                                                                                                                                                                                                                                                                                                                                 |
| `public/sounds/chime.mp3`           | `[new]`                | Single short tone, MP3, ≤ 30 KB. Used for both block-100 and day-100 celebrations (same asset; spec.md AC #20).                                                                                                                                                                                                                                                                                                                                                 |

Untouched in M4a (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`. M3 chip rendering is preserved — only the tap path changes.

### Locked schema additions

```ts
// lib/types.ts — extend the Action union (M3 had three members; M4a adds a fourth)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }; // M4a — flips `done` on the brick with this id
```

```ts
// lib/data.ts — reducer arm (sketch)
case "LOG_TICK_BRICK": {
  const flip = (b: Brick): Brick =>
    b.id === action.brickId && b.kind === "tick" ? { ...b, done: !b.done } : b;
  return {
    ...state,
    blocks: state.blocks.map((bl) => ({ ...bl, bricks: bl.bricks.map(flip) })),
    looseBricks: state.looseBricks.map(flip),
  };
}
```

The reducer never mutates in place; the `flip` helper applies to every brick in both arrays but only the one whose `id` matches and `kind === "tick"` actually changes. This is O(n) over all bricks, acceptable for Phase-1 scale (no user has hundreds of bricks). `assertNever(action)` exhaustiveness is preserved by the new union member matching the `case`.

### Components

**`<BrickChip>` (tick variant — extended)**

- Props (additive): `onTickToggle?: (brickId: string) => void`. M3 props (`brick`, `categories`, `size`) preserved.
- Tap target: keeps M3's existing `<button type="button">` element (which already provides `min-height: 44px` per M3 plan SG-m3-13 lock). M4a does **not** add a new wrapper element — it specializes the existing button's behavior by `brick.kind`. **Decision (SG-m4a-01):** branch the `onClick` handler by kind. Tick → `haptics.light()` + `onTickToggle?.(brick.id)`. Goal/time → no-op (no haptic, no dispatch). Cursor: tick → `cursor: pointer`; goal/time → `cursor: default` (preserves M3 visual no-op affordance).
- ARIA (SG-m4a-02): tick chip's button gains `aria-pressed={brick.done}` and an enriched `aria-label` of the form `"${brick.name}, ${brick.done ? 'done' : 'not done'}, tap to toggle"` (replacing M3's static "${name}, tick, ${pct}% complete" label for tick kind only — goal/time keep their M3 labels). The visible glyph swap (`Check` ↔ `Square`) is unchanged from M3.
- Keyboard: native `<button>` already handles Enter and Space; no extra wiring needed.
- Animation: the existing `data-testid="brick-fill"` div (M3 lines 117-129) already animates `width` via `transition: width 600ms ease-in-out`. M4a does not change the transition — the same CSS handles 0 → 100 and 100 → 0 symmetrically because `pct` is recomputed from the new `brick.done` after each reducer flip (SG-m4a-08). Reduced-motion: M3's transition does NOT yet branch on `useReducedMotion`. **M4a adds the branch:** when `prefers-reduced-motion: reduce`, the chip-fill `transition` becomes `none`. Use the existing `useReducedMotion` import pattern that `TimelineBlock` already employs.

**`<TimelineBlock>` (extended)**

- Props (additive): `onTickToggle?: (brickId: string) => void`. Threaded to each `<BrickChip>`.
- Block-100 cross-up: hosts `useCrossUpEffect(blockPct(block), 100, fireBlockComplete)` where `fireBlockComplete = useCallback(() => { haptics.success(); playChime(); setBloomKey(k => k + 1); }, [])`. The bloom visual is a `motion.div` with M0's `springConfigs.bloom` keyed by `bloomKey` so each new crossing remounts and replays. `useReducedMotion()` → `bloomKey` increments still fire (haptic + chime fire), but the bloom `motion.div` returns null or renders without animation.
- One-shot rule: `useCrossUpEffect` already enforces this (lib/celebrations.ts:30-37); cross-down resets, re-cross-up re-fires. Verified by `lib/celebrations.test.ts` U-m3-012.

**`<Fireworks>` (new)**

- Props: `active: boolean`. When `active` toggles `false → true`, plays a single fireworks animation; auto-resets internal play state on completion (~1.6 s) to remain mountable. When `useReducedMotion()`, returns `null` (renders nothing). No internal audio or haptic — caller (`<BuildingClient>`) handles those.
- Implementation: bounded particle count (~12 particles); CSS keyframes or motion variants per the M3-reserved `fireworks` token (1.6 s easeOut). Fixed-position overlay, `pointer-events: none`, `z-index` above timeline but below any open `<Sheet>`. Aria: `aria-hidden="true"` (decorative).

**`<BuildingClient>` (extended)**

- New callback `handleTickToggle = useCallback((brickId: string) => dispatch({ type: 'LOG_TICK_BRICK', brickId }), [dispatch])`.
- Threads `handleTickToggle` to `<Timeline onTickToggle={handleTickToggle}>` (which threads to `<TimelineBlock>`, which threads to `<BrickChip>`) and to `<LooseBricksTray onTickToggle={handleTickToggle}>` (which threads directly to `<BrickChip>`).
- New state `const [fireworksActive, setFireworksActive] = useState(false)`. New callback `fireDayComplete = useCallback(() => { haptics.notification(); playChime(); setFireworksActive(true); setTimeout(() => setFireworksActive(false), 1700); }, [])`.
- Hosts `useCrossUpEffect(heroPct, 100, fireDayComplete)` — same `heroPct` already passed to `<Hero>`. Cross-up at the day level fires fireworks + chime + notification haptic.
- Renders `<Fireworks active={fireworksActive} />` as a sibling of `<EditModeProvider>`'s root div (so it's above the timeline but inside the page tree).

### Audio playback details

- **Where loaded:** `lib/audio.ts` exports `playChime()`. Internally, the module lazily constructs `new Audio('/sounds/chime.mp3')` on first call and caches the element on a module-scoped variable. SSR guard: `typeof Audio === 'undefined' → no-op`.
- **Why module-scoped, not inside a component:** avoids per-component `new Audio()` allocation; one element, many plays. Avoids re-fetching the asset on each play (browser caches the response, but an explicit single `Audio` instance is cleaner). Avoids a `useEffect` dance to construct on mount.
- **Why not inside `lib/celebrations.ts`:** keeps the hook generic (the hook fires `fn`; the caller decides whether `fn` plays audio or not). Honors single-responsibility.
- **Triggered by:** `<TimelineBlock>` (block-100 crossing) and `<BuildingClient>` (day-100 crossing). Both cross-up sites call `playChime()` synchronously inside the cross-up callback; `useCrossUpEffect` already guarantees one-shot semantics.
- **Failure handling (SG-m4a-04 + spec AC #24):** `playChime` wraps `audio.play()` in `try/catch` (the call returns a `Promise` that rejects on iOS pre-gesture; we discard the rejection silently). Audio failures never break the visual cascade.
- **iOS first-tap unlock (SG-m4a-06):** the first tick tap IS the user gesture; the chime playback initiated by that same React tick may or may not unlock per Safari version. Accept that the first chime may be silent; subsequent chimes work. Document in CHANGELOG when SHIPPER lands M4a.
- **Reduced motion (SG-m3-11 + spec AC #26):** chime ignores `prefers-reduced-motion` (audio ≠ motion).
- **Mute respect (SG-m4a-05):** no in-app mute toggle in M4a. OS / browser mute is honored automatically by `<audio>`.

### Dependencies

**No new npm dependencies.** `motion`, `lucide-react`, and the existing test toolchain cover everything M4a needs. `Audio` is a Web API. The `chime.mp3` asset is a static file under `public/`.

### Design tokens

All consumed tokens already exist:

- `brickFill` (600 ms easeInOut) — `lib/motion.ts:34` — drives chip foreground gradient on toggle.
- `bloom` spring — `lib/motion.ts` (M0's `springConfigs.bloom = { stiffness: 220, damping: 22 }`) — drives `<TimelineBlock>` block-100 visual.
- `--surface-2`, `--accent`, `--ink`, `--ink-dim` — M0/M1 css vars — already used by `<BrickChip>`.
- Haptic events (`haptics.light/success/notification`) — `lib/haptics.ts` — M0.
- **`fireworks`** (1.6 s easeOut) — `lib/motion.ts` — added in M4a per the M3 plan reservation. Used by `<Fireworks>` overlay only.

No new colors, fonts, or spacing tokens.

### Edge cases

- **Reduced motion** — chip-fill `transition` becomes `none`; scaffold-fill (M3 already obeys reduced-motion via `prefersReducedMotion`); HeroRing arc (M3 already); BlueprintBar opacity is a `transition` on `opacity` — verify M3 honors reduced-motion; if not, M4a adds the branch. Bloom visual suppressed; fireworks overlay returns null. Haptics + chime still fire (spec AC #25-26).
- **Tap during in-flight 600 ms animation** — Framer / CSS `transition: width` cancels and reverses naturally. No special-case needed.
- **Tap a tick brick with `categoryId: null`** — `<BrickChip>` already handles uncategorized via the `--surface-2` background and `--accent` fill. Works the same on tap.
- **Tap inside a collapsed block** — block must be expanded for the chip to be in the DOM (M3 collapse renders no `<BrickChip>` until expanded). Tap on a non-existent chip is impossible by definition.
- **Tap inside the Loose Bricks tray when tray is collapsed** — M3 SG-m3-15 ships chips visible in the collapsed scroll row; the dispatch path works identically (tray collapse / expand is purely visual).
- **Block at 99% pre-tick → 100%** — `blockPct` recomputes; `useCrossUpEffect` fires once; bloom + chime + success haptic fire.
- **Day at 99% pre-tick → 100%** — `dayPct(state)` recomputes; day-level `useCrossUpEffect` in `<BuildingClient>` fires once; fireworks + chime + notification haptic fire.
- **Untoggle from 100 → 99** — bloom does not replay; cross-up rule resets the gate.
- **Audio asset fails to load** — `try/catch` around `audio.play()`; visuals + haptics still fire. `audio.onerror` is silently logged to console only in dev (gated by `process.env.NODE_ENV`).
- **Audio blocked pre-gesture (iOS)** — first chime may be silent; subsequent chimes work. Self-resolving by the second tick.
- **Page refresh after a tick** — state lost (no persistence until M8). Same as M3.
- **Tap goal or time chip in M4a** — no-op. No haptic, no dispatch. Cursor stays default. Spec AC #7-8.
- **Keyboard activation (Enter / Space) on a tick chip** — works via native `<button>` semantics. Same dispatch path.
- **Same brickId dispatched twice in quick succession (e.g., double-click)** — each dispatch flips `done`; second flip undoes the first. Acceptable; a debounce is unnecessary at human gesture rates and would mask intentional rapid toggles.
- **Brick id collision (theoretically impossible — UUIDs)** — defensive: the reducer matches by id AND `kind === "tick"`; a non-tick brick with the same id (impossible by uuid generation but defensible) is a no-op.

### Out of scope

- **Goal +/- stepper** — M4b
- **Time timer (start / stop / pause / manual entry)** — M4c
- **Edit / delete bricks or blocks** — M5
- **Drag reorder** — M6
- **FLIP block-expand magic** — M7
- **Persistence (state survives refresh)** — M8
- **In-app mute toggle** — explicitly deferred (SG-m4a-05); revisit in M7 if user feedback warrants.
- **Per-block / per-day chime variants** — same asset for both crossings (spec AC #20).
- **Long-press / haptic-detent on tick chips** — tick is a single-tap toggle. Long-press belongs to M4b's goal stepper acceleration.

### Decisions to honor

- **ADR-031 (44 px touch target)** — preserved; existing `<BrickChip>` button already enforces `minHeight: '44px'`.
- **ADR-039 (ships empty)** — M4a adds no factory data. The chime mp3 is a static asset, not user-data.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4a): …` (red) and `feat(m4a): …` / `fix(m4a): …` (green/refactor). PLANNER's commits land as `docs(plan-m4a): …` and `docs(tests-m4a): …`. SHIPPER as `chore(ship-m4a): …` and `docs(ship-m4a): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4a only. M4b (goal stepper) and M4c (time timer) are separate `/feature m4b` and `/feature m4c` invocations.
- **ADR-041 (single-gate Loop)** — VERIFIER will read this plan and the just-to-be-written `tests.md` entry against `/docs/spec.md § Milestone 4a` before BUILDER starts. No human gate between TESTS and BUILD.
- **ADR-032 / ADR-035 / ADR-034** — categories are user-defined, bricks may be standalone, blocks are always timed; M4a touches none of these contracts.
- **`assertNever` exhaustiveness** — `lib/data.ts:default → assertNever(action)` arm preserved by adding the `LOG_TICK_BRICK` case. TypeScript compile guarantees this.
- **No new npm deps** — verified above.

### Open spec gaps (resolutions)

- **SG-m4a-01 — Tap target shape.** **LOCKED — branch by `kind` inside the existing `<button>` element.** Keep M3's single `<button>` chip element for all kinds; tick path dispatches and gives haptic, goal/time path is no-op. Rationale: avoids a wrapper element; preserves all M3 test-IDs (`C-m3-001..008`); minimal diff; goal/time dangling-tap-target concern is mitigated by `cursor: default` + no haptic, which gives goal/time chips the same M3 "press has no effect" feel.
- **SG-m4a-02 — Chip element role.** **LOCKED — `<button>` (native) + `aria-pressed={done}` for tick; goal/time keep M3 `<button>` without `aria-pressed`.** Rationale: native `<button>` already covers role + keyboard; `aria-pressed` is the canonical toggle-button pattern (per ADR-028, `aria-pressed` is reserved for non-switch toggle buttons — exactly what a tick brick is). Tick is NOT semantically a "switch" (no on/off control of a setting); it's a "press to toggle done state" which is canonical button-pressed pattern.
- **SG-m4a-03 — Reducer placement.** **LOCKED — extend `lib/data.ts` reducer with `LOG_TICK_BRICK` case** that searches both `state.blocks[*].bricks[]` and `state.looseBricks[]` by `brickId`, flipping `done` on the matching tick brick. Pattern matches M3's `ADD_BRICK` parentBlockId routing.
- **SG-m4a-04 — Audio asset format + size.** **LOCKED — MP3, ≤ 30 KB, single short tone (~250 ms).** Source: royalty-free pack or generated tone. Final asset committed under `public/sounds/chime.mp3`. BUILDER must verify file size at commit time.
- **SG-m4a-05 — Mute respect.** **LOCKED — defer in-app mute toggle to M7.** OS / browser mute is honored automatically by `<audio>`. No work in M4a.
- **SG-m4a-06 — First-tap audio unlock on iOS.** **LOCKED — accept silent first chime on iOS Safari.** The first tick IS a user gesture; subsequent chimes work. SHIPPER documents in CHANGELOG.
- **SG-m4a-07 — Test seam for cross-up firing.** **LOCKED — Vitest tests inject state via existing `useCrossUpEffect` testbed (lib/celebrations.test.ts pattern); component-level tests assert that on simulated tick toggle the celebration callback fires; Playwright tests assert the visual class / DOM state lands after a tick that brings block to 100%.**
- **SG-m4a-08 — Chip animation direction on untoggle.** **LOCKED — symmetric.** Toggle to `true` plays 0 → 100; toggle to `false` plays 100 → 0. Same `brickFill` token; no special-case for "undo".

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline`.** `Timeline` currently passes `onAddBrick` through; M4a adds `onTickToggle` as a second pass-through. Use the same prop-drill pattern, not a Context — Context would over-engineer at this scale.
2. **`useCallback` discipline at the hosts.** `useCrossUpEffect`'s `fn` argument should be stable across renders to avoid spurious effect re-runs. Both `<TimelineBlock>` (block-100) and `<BuildingClient>` (day-100) wrap their celebration callbacks in `useCallback`.
3. **Mock-clock + audio mocking in unit tests.** `lib/audio.ts` should be importable in tests and `playChime` should be a thin wrapper that tests can spy on (Vitest `vi.spyOn`); the underlying `Audio` constructor isn't called in jsdom anyway — the SSR guard handles it. For `<BrickChip>` component tests, mock `lib/audio.ts` if the chip ever calls it (it doesn't directly — only `<TimelineBlock>` and `<BuildingClient>` do), and mock `lib/haptics.ts` to assert `light` is called on tick taps.
4. **`prefers-reduced-motion` thread-through for chip-fill.** M3's `<BrickChip>` doesn't yet read `useReducedMotion()`; M4a adds the import + branch. This is a one-line edit but BUILDER must run M3 chip tests after to confirm no regression.
5. **Fireworks overlay z-index.** Below open `<Sheet>` instances (M2's `--z-sheet` value), above timeline. SHIPPER's smoke test should confirm that opening AddBlockSheet during a fireworks play hides the fireworks behind the sheet.
6. **`fireworks` motion token verification.** Before BUILDER edits, check `lib/motion.ts` for the `fireworks` entry. If absent, the M4a build adds it (single-line addition, plus matching `lib/motion.test.ts` assertion). If present (M3 ship may have added it), the build only consumes it.

---
