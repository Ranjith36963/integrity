## Milestone 4a — Tick Brick Logging — Tests

### Unit (Vitest)

#### U-m4a-001

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing one block with one tick brick at `{ id: "b1", kind: "tick", done: false }`
**WHEN** the reducer is called with `{ type: "LOG_TICK_BRICK", brickId: "b1" }`
**THEN** the returned state's matching brick has `done === true`; all other fields are deep-equal to the input.
Proves: plan.md § Locked schema additions (reducer arm) — covers SPEC AC #2

#### U-m4a-002

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` whose block contains a tick brick `{ id: "b1", done: true }`
**WHEN** the reducer is called with `{ type: "LOG_TICK_BRICK", brickId: "b1" }`
**THEN** the returned state's matching brick has `done === false` (toggle, not one-way).
Proves: plan.md § Locked schema additions — covers SPEC AC #3

#### U-m4a-003

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a tick brick `{ id: "lb1", done: false }` only in `state.looseBricks` (no blocks)
**WHEN** the reducer is called with `{ type: "LOG_TICK_BRICK", brickId: "lb1" }`
**THEN** the returned state's `looseBricks[0].done === true`; `state.blocks` is unchanged.
Proves: plan.md § File structure (`lib/data.ts` row — searches blocks then looseBricks) — covers SPEC AC #2

#### U-m4a-004

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a tick brick `{ id: "b1", done: false }` and a sibling brick `{ id: "b2", done: false }`
**WHEN** the reducer is called with `{ type: "LOG_TICK_BRICK", brickId: "does-not-exist" }`
**THEN** the returned state's bricks are deep-equal to the input bricks (no-op when id is unmatched).
Proves: plan.md § Edge cases (defensive id-not-found) — covers SPEC AC #2

#### U-m4a-005

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a goal brick `{ id: "g1", kind: "goal", count: 3, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_TICK_BRICK", brickId: "g1" }` (defensive kind-mismatch)
**THEN** the returned state's goal brick is deep-equal to the input (no `done` flip; brick kind isn't tick).
Proves: plan.md § Edge cases (kind-mismatch defensive guard) + Locked schema (`kind === "tick"` predicate)

#### U-m4a-006

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` `prevState` with at least one tick brick
**WHEN** the reducer returns `nextState` for `{ type: "LOG_TICK_BRICK", brickId: <existing id> }`
**THEN** `prevState !== nextState` (new top-level reference) AND `prevState.blocks` is the literal same array reference as before the call (no in-place mutation observable on the previous reference's bricks).
Proves: plan.md § Locked schema additions ("reducer never mutates in place") — covers SPEC AC #2 (immutability invariant)

#### U-m4a-007

Target file: `lib/data.test.ts`
**GIVEN** the reducer's exhaustive `Action` union including `LOG_TICK_BRICK`
**WHEN** an unknown action shape (`{ type: "__never__" } as never`) is passed
**THEN** TypeScript compile fails OR the `default` branch's `assertNever` throws at runtime, proving the new union member is exhaustively handled.
Proves: plan.md § Locked schema additions ("`assertNever(action)` exhaustiveness preserved") — covers SPEC AC #31

#### U-m4a-008

Target file: `lib/audio.test.ts`
**GIVEN** a Vitest environment with `globalThis.Audio` mocked to a constructor spy that returns an object with a `.play()` method returning `Promise.resolve()`
**WHEN** `playChime()` is called twice
**THEN** the `Audio` constructor is invoked exactly once with `'/sounds/chime.mp3'` (lazy-cached), and `.play()` is called twice.
Proves: plan.md § Audio playback details ("module lazily constructs … caches the element") — covers SPEC AC #23

#### U-m4a-009

Target file: `lib/audio.test.ts`
**GIVEN** a mocked `Audio` whose `.play()` returns `Promise.reject(new DOMException("blocked"))`
**WHEN** `playChime()` is called
**THEN** no exception escapes the call; the function returns normally (try/catch swallows the rejection).
Proves: plan.md § Audio playback details ("wraps `audio.play()` in `try/catch`") — covers SPEC AC #24

#### U-m4a-010

Target file: `lib/audio.test.ts`
**GIVEN** a Vitest environment where `globalThis.Audio` is set to `undefined` (SSR-shaped global)
**WHEN** `playChime()` is called
**THEN** the function returns no-op without throwing (SSR guard `typeof Audio === 'undefined'` → no-op).
Proves: plan.md § Audio playback details ("Server-side / SSR guard") — covers SPEC AC #24

### Component (Vitest + Testing Library)

#### C-m4a-001

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a tick brick `{ kind: "tick", done: false, name: "brick A" }` and an `onTickToggle` spy
**WHEN** the chip's `<button>` is clicked
**THEN** `onTickToggle` is called once with `brick.id`; `haptics.light` (mocked) is called once.
Proves: plan.md § Components > BrickChip (tick variant) "Tick → `haptics.light()` + `onTickToggle?.(brick.id)`" — covers SPEC AC #2, #6

#### C-m4a-002

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ kind: "goal", count: 2, target: 5 }` and `onTickToggle` + `haptics.light` spies
**WHEN** the chip's `<button>` is clicked
**THEN** `onTickToggle` is NOT called; `haptics.light` is NOT called; the chip's rendering matches the M3 snapshot.
Proves: plan.md § Components > BrickChip ("Goal/time → no-op (no haptic, no dispatch)") — covers SPEC AC #7

#### C-m4a-003

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a time brick `{ kind: "time", elapsedMs: 0, durationMs: 600000 }` and `onTickToggle` + `haptics.light` spies
**WHEN** the chip's `<button>` is clicked
**THEN** `onTickToggle` is NOT called; `haptics.light` is NOT called.
Proves: plan.md § Components > BrickChip — covers SPEC AC #8

#### C-m4a-004

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a tick brick `{ done: false, name: "brick A" }`
**WHEN** the chip is queried by role
**THEN** the chip's button has `aria-pressed="false"` and `aria-label === "brick A, not done, tap to toggle"`.
Proves: plan.md § Components > BrickChip ("`aria-pressed={brick.done}` and an enriched `aria-label`") — covers SPEC AC #27, #28

#### C-m4a-005

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a tick brick `{ done: true, name: "brick A" }`
**WHEN** the chip is queried by role
**THEN** the chip's button has `aria-pressed="true"` and `aria-label === "brick A, done, tap to toggle"`; the visible glyph is the `Check` icon (not `Square`).
Proves: plan.md § Components > BrickChip — covers SPEC AC #5, #27, #28

#### C-m4a-006

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered for a tick brick inside a fixed-width container at the M3 chip layout
**WHEN** `getBoundingClientRect()` is read on the chip's button element (or `getComputedStyle().minHeight` is read)
**THEN** the height (or `minHeight`) is ≥ 44 (px, ADR-031).
Proves: plan.md § Components > BrickChip ("`minHeight: '44px'`") — covers SPEC AC #1

#### C-m4a-007

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick `<BrickChip>` rendered with the `useReducedMotion` hook stubbed to return `true`
**WHEN** the brick-fill element (`data-testid="brick-fill"`) is inspected
**THEN** its computed `transition` (or inline style) for `width` is `none` (or `0ms`), collapsing the animation to instant.
Proves: plan.md § Components > BrickChip ("M4a adds the branch: when `prefers-reduced-motion`, the chip-fill `transition` becomes `none`") — covers SPEC AC #25

#### C-m4a-008

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick `<BrickChip>` rendered with `done: false` and `useReducedMotion()` returning `false`
**WHEN** the brick-fill element is inspected
**THEN** its `transition` includes `width 600ms ease-in-out` (M3 token `brickFill`).
Proves: plan.md § Components > BrickChip ("the same CSS handles 0 → 100 and 100 → 0 symmetrically") — covers SPEC AC #4

#### C-m4a-009

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick `<BrickChip>` and an `onTickToggle` spy
**WHEN** the chip's button receives a keyboard `Enter` press (and separately, a `Space` press)
**THEN** `onTickToggle` is called once per activation (via native `<button>` semantics).
Proves: plan.md § Components > BrickChip ("Keyboard: native `<button>` already handles Enter and Space") — covers SPEC AC #30

#### C-m4a-010

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered with a block at `blockPct === 50` and an `onTickToggle` spy
**WHEN** an inner tick `<BrickChip>` is clicked
**THEN** `onTickToggle` is called with the brick's id; the prop is threaded through unchanged.
Proves: plan.md § Components > TimelineBlock ("Threaded to each `<BrickChip>`") — covers SPEC AC #2

#### C-m4a-011

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered with `blockPct` controlled by parent state, and `lib/audio.playChime` + `lib/haptics.success` spied
**WHEN** the parent re-renders with `blockPct` flipping from `99` to `100`
**THEN** within one effect tick, `haptics.success` is called once AND `playChime` is called once AND a bloom-keyed motion node is mounted (or its `key` prop increments) for the celebration.
Proves: plan.md § Components > TimelineBlock ("`useCrossUpEffect(blockPct(block), 100, fireBlockComplete)`") — covers SPEC AC #14, #15, #16

#### C-m4a-012

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` with `useReducedMotion()` stubbed `true` and `playChime` + `haptics.success` spies
**WHEN** the parent re-renders `blockPct` from `99` to `100`
**THEN** `haptics.success` is called AND `playChime` is called BUT the bloom `motion.div` either renders without animation or returns `null`.
Proves: plan.md § Components > TimelineBlock (reduced-motion branch) — covers SPEC AC #25, #26

#### C-m4a-013

Target file: `components/Fireworks.test.tsx`
**GIVEN** `<Fireworks active={false} />` mounted, then re-rendered with `active={true}`
**WHEN** the DOM is queried
**THEN** a fireworks overlay element is rendered with `aria-hidden="true"` and `pointer-events: none`; particle count is bounded (≤ ~16 child nodes).
Proves: plan.md § Components > Fireworks — covers SPEC AC #18

#### C-m4a-014

Target file: `components/Fireworks.test.tsx`
**GIVEN** `<Fireworks active={true} />` rendered with `useReducedMotion()` stubbed to return `true`
**WHEN** the DOM is queried
**THEN** the component renders `null` (no overlay element).
Proves: plan.md § Components > Fireworks ("When `useReducedMotion()`, returns `null`") — covers SPEC AC #25

#### C-m4a-015

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient>` rendered with a state where `dayPct(state) === 99` (one tick brick away from 100), and `playChime` + `haptics.notification` spies and a stubbed setTimeout
**WHEN** the user clicks the final undone tick `<BrickChip>` (real user gesture through the threaded `onTickToggle`)
**THEN** the `LOG_TICK_BRICK` dispatch flips done; `dayPct` recomputes to 100; `useCrossUpEffect` fires `fireDayComplete`; `haptics.notification` is called once; `playChime` is called once; `<Fireworks active={true} />` is rendered.
Proves: plan.md § Components > BuildingClient (day-100 wiring) — covers SPEC AC #18, #19, #20, #11, #12, #13

### E2E (Playwright)

#### E-m4a-001

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** the app at `/` with one block containing one tick brick `{ done: false }` (seeded via DOM/route fixture), block expanded
**WHEN** the user taps the tick chip
**THEN** within one frame the chip's `data-testid="brick-fill"` width animates toward `100%`, the block scaffold left-bar height animates toward `100%`, the HeroRing arc length grows, and the BlueprintBar segment opacity for that block increases. After the 600 ms transition, all four reflect the `100%` state.
Proves: plan.md § Intent (the four-region cascade) — covers SPEC AC #2, #4, #9, #10, #11, #12, #13

#### E-m4a-002

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a tick brick at `done: true`, block expanded
**WHEN** the user taps the chip
**THEN** the chip's `data-testid="brick-fill"` width animates toward `0%`; the glyph swaps from `✓` to `☐`; `aria-pressed` flips from `true` to `false`.
Proves: plan.md § Edge cases (untoggle) — covers SPEC AC #3, #5

#### E-m4a-003

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a goal brick chip and a time brick chip both rendered alongside a tick chip
**WHEN** the user taps each in turn
**THEN** the goal chip's count badge does not change; the time chip does not start a timer; only the tick chip's fill changes; the HeroRing percentage recomputes only after the tick tap.
Proves: plan.md § Components > BrickChip (goal/time inert in M4a) — covers SPEC AC #7, #8

#### E-m4a-004

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a block whose `blockPct === 99` because it has one undone tick brick and several already-done bricks, with `useCrossUpEffect` wired
**WHEN** the user taps the final undone tick chip
**THEN** the block card receives a bloom animation class/data-attr (e.g., `[data-bloom-active]`) for ~600 ms then clears; the celebration appears once per crossing.
Proves: plan.md § Components > TimelineBlock (block-100 cross-up) — covers SPEC AC #14, #16

#### E-m4a-005

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** the same setup as E-m4a-004, with the page's audio context spied via `window.__chimePlays` counter (BUILDER inserts in test mode) — OR a Playwright route mock for `/sounds/chime.mp3` that increments a counter
**WHEN** the user taps the final undone tick chip
**THEN** the chime asset's play count increments by exactly 1 (or the counter is at 1).
Proves: plan.md § Audio playback details — covers SPEC AC #15

#### E-m4a-006

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a state where the entire day is at `dayPct === 99` (one undone tick brick remaining anywhere)
**WHEN** the user taps that final tick chip
**THEN** a fireworks overlay (`[data-testid="fireworks"]`) appears within one frame; after ~1.6 s (≤ 2.0 s wait) the overlay is unmounted or its `active` flag is `false`.
Proves: plan.md § Components > BuildingClient (day-100 + setTimeout reset) — covers SPEC AC #18, #21

#### E-m4a-007

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a block at `99%`, user taps to bring it to `100%` (bloom fires), then taps again to drop it to `99%`, then taps a third time to bring it back to `100%`
**WHEN** the third tap completes
**THEN** the bloom animation class/data-attr re-applies on the block card (one-shot per crossing rule re-fires).
Proves: plan.md § Edge cases ("Untoggle from 100 → 99 — bloom does not replay; cross-up rule resets the gate") — covers SPEC AC #17, #21

#### E-m4a-008

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** a tick brick rendered inside the Loose Bricks tray (collapsed scroll row)
**WHEN** the user taps the chip without expanding the tray
**THEN** the chip fills, the HeroRing arc grows, and BlueprintBar opacity does NOT change for any block (the brick is loose; no parent block segment).
Proves: plan.md § Edge cases ("Tap inside the Loose Bricks tray when tray is collapsed") — covers SPEC AC #2, #11

#### E-m4a-009

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** the page emulated at mobile viewport `430 x 932`
**WHEN** the user taps several tick bricks across one block and the loose tray
**THEN** there is no horizontal scroll on `<body>` (`document.documentElement.scrollWidth <= clientWidth`); chips remain tappable; HeroRing reflects the running `dayPct`.
Proves: plan.md § Cross-cutting concerns + spec.md M4a Quality — covers SPEC AC #34

#### E-m4a-010

Target file: `tests/e2e/m4a.spec.ts`
**GIVEN** the browser context with `prefers-reduced-motion: reduce` emulated
**WHEN** the user taps a tick chip that brings the block to 100% (and the day to 100%)
**THEN** the chip's fill snaps to 100% without a 600 ms tween; no bloom class lands on the block card; no fireworks overlay appears in the DOM. The `playChime` counter still increments and the visible state still reaches `100%`.
Proves: plan.md § Edge cases (reduced-motion) — covers SPEC AC #25, #26

### Accessibility (axe via Playwright)

#### A-m4a-001

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** the day view rendered with at least one tick, one goal, and one time brick visible (mixed kinds)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config.
Proves: plan.md § Components > BrickChip (ARIA additions) — covers SPEC AC #29

#### A-m4a-002

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** the day view with at least one tick brick `{ done: false }`
**WHEN** the page is loaded and axe-core's color-contrast + aria-roles rules run
**THEN** the tick chip's button exposes `role="button"` (native), `aria-pressed="false"`, and an accessible name matching `"<name>, not done, tap to toggle"`.
Proves: plan.md § Components > BrickChip (ARIA — SG-m4a-02 lock) — covers SPEC AC #27, #28

#### A-m4a-003

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** the day view focused on the first tick chip via Tab traversal from the page top
**WHEN** the user presses `Enter`
**THEN** the chip toggles (visible state flips, `aria-pressed` flips); a second `Space` press toggles back.
Proves: plan.md § Components > BrickChip ("native `<button>` handles Enter and Space") — covers SPEC AC #30

#### A-m4a-004

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** the day view with a tick brick whose tap surface is a `<button>`
**WHEN** the page is rendered at the M3 chip layout
**THEN** `getBoundingClientRect()` of the chip's button is ≥ 44 px in height and ≥ 44 px in width.
Proves: plan.md § Decisions to honor (ADR-031) — covers SPEC AC #1

#### A-m4a-005

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** a tick brick at `done: true` and a tick brick at `done: false`, both visible
**WHEN** the page DOM is inspected
**THEN** the `done: true` chip exposes `aria-pressed="true"`; the `done: false` chip exposes `aria-pressed="false"`.
Proves: plan.md § Components > BrickChip — covers SPEC AC #28

#### A-m4a-006

Target file: `tests/e2e/m4a.a11y.spec.ts`
**GIVEN** the page with the Fireworks overlay mounted in `active={true}` state (forced via test seam)
**WHEN** axe-core runs and the DOM is queried
**THEN** zero violations are reported; the overlay element has `aria-hidden="true"` and does not steal focus or appear in the accessibility tree.
Proves: plan.md § Components > Fireworks ("Aria: `aria-hidden=\"true\"` (decorative)") — covers SPEC AC #29

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                             | Covering test IDs                                                                      |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| #1  | Tick chip tap surface ≥ 44 px (ADR-031)                                                        | C-m4a-006, A-m4a-004                                                                   |
| #2  | Tap tick `done:false` → dispatch `LOG_TICK_BRICK`; reducer flips to `true`                     | U-m4a-001, U-m4a-003, U-m4a-004, U-m4a-006, C-m4a-001, C-m4a-010, E-m4a-001, E-m4a-008 |
| #3  | Tap tick `done:true` → flips back to `false` (toggle)                                          | U-m4a-002, E-m4a-002                                                                   |
| #4  | Chip foreground gradient animates 0↔100 via `brickFill` (600 ms easeInOut)                     | C-m4a-008, E-m4a-001                                                                   |
| #5  | Glyph swaps `☐ ↔ ✓` on the same render tick                                                    | C-m4a-005, E-m4a-002                                                                   |
| #6  | Haptic `light` fires on every tap (tick only)                                                  | C-m4a-001                                                                              |
| #7  | Tap goal chip → no-op (no dispatch, no haptic, M3-identical render)                            | C-m4a-002, E-m4a-003                                                                   |
| #8  | Tap time chip → no-op (no dispatch, no haptic, M3-identical render)                            | C-m4a-003, E-m4a-003                                                                   |
| #9  | Block scaffold left-bar height updates to new `blockPct`                                       | E-m4a-001                                                                              |
| #10 | BlueprintBar segment opacity = `0.3 + (newBlockPct/100 × 0.7)`                                 | E-m4a-001                                                                              |
| #11 | HeroRing stroke-dashoffset reflects new `dayPct(state)`                                        | C-m4a-015, E-m4a-001, E-m4a-008                                                        |
| #12 | Hero numeral text updates synchronously with the ring                                          | C-m4a-015, E-m4a-001                                                                   |
| #13 | All four visual updates reflect same reducer state (no flash of stale)                         | C-m4a-015, E-m4a-001                                                                   |
| #14 | Block crosses to 100% → `useCrossUpEffect` fires `bloom`                                       | C-m4a-011, E-m4a-004                                                                   |
| #15 | Same crossing → chime audio plays                                                              | C-m4a-011, E-m4a-005                                                                   |
| #16 | Same crossing → `success` haptic fires                                                         | C-m4a-011, E-m4a-004                                                                   |
| #17 | Cross down + cross up re-fires celebration (one-shot per crossing)                             | E-m4a-007                                                                              |
| #18 | Day crosses to 100% → fireworks overlay plays (~1.6 s)                                         | C-m4a-013, C-m4a-015, E-m4a-006                                                        |
| #19 | Same day-crossing → `notification` haptic fires                                                | C-m4a-015                                                                              |
| #20 | Same day-crossing → chime audio plays (same asset)                                             | C-m4a-015                                                                              |
| #21 | Day cross-down + cross-up re-fires fireworks                                                   | E-m4a-006, E-m4a-007                                                                   |
| #22 | `public/sounds/chime.mp3` exists, ≤ 30 KB, single short tone                                   | gate (asset existence + size verified by SHIPPER smoke + repo check)                   |
| #23 | Audio loaded once on app boot via `new Audio()`; no re-fetch per play                          | U-m4a-008                                                                              |
| #24 | Audio failures caught silently; visuals still fire                                             | U-m4a-009, U-m4a-010                                                                   |
| #25 | `prefers-reduced-motion` → chip fill, scaffold, HeroRing instant; bloom + fireworks suppressed | C-m4a-007, C-m4a-012, C-m4a-014, E-m4a-010                                             |
| #26 | Reduced-motion does NOT suppress haptics or audio                                              | C-m4a-012, E-m4a-010                                                                   |
| #27 | `aria-label` = "${name}, ${done?'done':'not done'}, tap to toggle"                             | C-m4a-004, C-m4a-005, A-m4a-002                                                        |
| #28 | `aria-pressed={done}` on tick chip's tap surface                                               | C-m4a-004, C-m4a-005, A-m4a-002, A-m4a-005                                             |
| #29 | axe-core: zero violations on day view (mixed kinds)                                            | A-m4a-001, A-m4a-006                                                                   |
| #30 | Tab order + Enter/Space activation on tick chips                                               | C-m4a-009, A-m4a-003                                                                   |
| #31 | `tsc --noEmit`: zero new errors                                                                | gate (composite — `npm run eval`); also U-m4a-007 (assertNever)                        |
| #32 | ESLint: zero new errors                                                                        | gate (composite — `npm run eval`)                                                      |
| #33 | Vitest: existing tests pass; new reducer + chip tap tests added                                | U-m4a-001..010, C-m4a-001..015                                                         |
| #34 | Playwright: tap → cascade visuals + mobile 430 px no horizontal overflow                       | E-m4a-001, E-m4a-009                                                                   |
