## Milestone 7a — Stagger fade-in + skeleton shimmer — Tests

This entry covers M7a — the first item in the Polish Layer: a Framer Motion stagger on the Day-view's three repeating-card surfaces (BlueprintBar segments, Timeline visible blocks, LooseBricksTray chips) so first paint feels deliberate, plus a skeleton-shimmer placeholder during the brief two-pass-hydration window (ADR-023). M7a is render-layer only — no schema bump, no new persisted field, no new `Action` union member, no new `motionTokens` entry (`motionTokens.stagger` is consumed verbatim per AC #3). It is derived from the `plan.md` M7a entry (`## Milestone 7a — Stagger fade-in + skeleton shimmer — Plan`, commit `5a71786`). Feature slug: `m7a`. ID prefixes: `U-m7a-`, `C-m7a-`, `E-m7a-`, `A-m7a-`. M7a has a small but real pure-logic surface (`useFirstPaintAfterHydration` ref-machine; `staggerForCount(n)` piecewise; `usePersistedState`'s new third tuple slot), a real UI surface (`<Skeleton variant>`; `stagger?: boolean` prop on `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>`; the `hydrated` branch in `<BuildingClient>`), and a deferred-to-preview perf surface (Lighthouse Perf ≥ 90; zero CLS at the swap), so it has the full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M7a has a **modest genuine unit + component surface** — the `useFirstPaintAfterHydration` ref-machine (`lib/firstPaint.ts`), the `staggerForCount(n)` piecewise helper (`lib/motion.ts`), the new third tuple slot on `usePersistedState`, the new `<Skeleton variant>` primitive, the `stagger?: boolean` prop additions on three components, and the `hydrated` branch in `<BuildingClient>`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. Two ACs are honestly part-gate-verified, consistent with the M5/M6/M8/M9a–M9e precedent:

- **AC #8 (`tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green)** → the lint / typecheck / full-suite-green / `test:tz` half is gate-verified by `npm run eval`; the four named Vitest scenarios in AC #8 (stagger fires once per mount; reduced-motion path renders zero animation; skeleton-to-real swap has identical bounding boxes; first-paint ref guards subsequent renders from re-staggering) are anchored as bespoke IDs (`C-m7a-007`, `C-m7a-008`, `C-m7a-009`, `C-m7a-010`, `U-m7a-001`).
- **AC #9 (E2E Playwright, deferred-to-preview: Lighthouse Performance ≥ 90; no CLS at hydration; cascade completes inside `N × 30 ms + 100 ms` overhead)** → authored as real `test()` blocks under `e2e/` (`E-m7a-001..006`) but executed on the preview deployment (the sandbox cannot run a real Lighthouse audit; the M5b/M9a–M9e precedent for deferred-to-preview E2E carries forward).

All other 8 ACs map to at least one concrete bespoke `m7a` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M5/M6/M8/M9a–M9e discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m7a-001` (`useFirstPaintAfterHydration` ref-machine) asserts the EXACT sequence of return values** across four sequential renders of a single component instance: `(hydrated=false)` → `false`; first `(hydrated=true)` → `true`; second `(hydrated=true)` → `false`; third `(hydrated=true)` → `false`. A mutant that returns `true` on every hydrated render (no ref guard) fails the second-render assertion; a mutant that latches on `hydrated` directly (no first-paint distinction) fails the first-render assertion when constructed with `hydrated=true` after an earlier `hydrated=false` render of the same instance. A separate **remount** assertion (`render` → `unmount` → fresh `render`) asserts the ref restarts at `pending` and the first hydrated render of the new instance returns `true` again — a mutant that uses a module-level singleton instead of a per-component ref fails the remount case.
- **`U-m7a-002` (`staggerForCount(n)` boundary table) asserts EXACT numeric outputs** at canonical N values: `staggerForCount(0) === 0.03`; `staggerForCount(1) === 0.03`; `staggerForCount(10) === 0.03`; `staggerForCount(15) === 0.03` (boundary — still in the canonical branch); `staggerForCount(16) === 0.45/16` (= `0.028125` — first N in the capped branch); `staggerForCount(20) === 0.45/20` (= `0.0225`); `staggerForCount(30) === Math.max(0.02, 0.45/30) === 0.02` (= `0.015` floored at `0.02`); `staggerForCount(50) === 0.02` (well below floor). A mutant using `<` instead of `<=` at the boundary (`n < 15` instead of `n <= 15`) fails the `staggerForCount(15)` assertion; a mutant omitting the `Math.max(0.02, ...)` floor fails the `staggerForCount(50) === 0.02` assertion; a mutant hard-coding `0.03` everywhere fails the `staggerForCount(30)` assertion. The single source of truth for the canonical `0.03` is `motionTokens.stagger.durationMs / 1000` — the test imports `motionTokens` and computes the expected value the same way, so a coordinated change to the motion token cascades through both production code and test.
- **`U-m7a-003` (`usePersistedState` third tuple slot) asserts the EXACT type and value** of the third element across the two-pass hydration window: `result.current[2] === false` on the pre-effect first render (synchronous body of the hook before `useEffect`); after `act(...)` flushes the post-mount effect, `result.current[2] === true`. A mutant returning a two-element tuple (the current shape) fails the `result.current[2]` access immediately; a mutant returning `undefined` for the third slot fails the strict-equality `=== false` assertion; a mutant always returning `true` fails the pre-effect render assertion. The first two slots (`state`, `dispatch`) are asserted byte-identical pre- and post-effect for backwards compatibility — the existing M8/M9b two-element destructure pattern (`const [state, dispatch] = result.current`) must keep working.
- **`C-m7a-001` (`<Skeleton variant="block">` renders the shimmer class) asserts the rendered `<div>` carries the EXACT `className` token `skeleton-shimmer`** (`expect(node.className).toContain("skeleton-shimmer")`) and `data-variant="block"`; per-variant sizing asserted via `getBoundingClientRect()` or inline-style `height: 92px` for block / `28px` for chip / `36px` for segment. A mutant rendering a bare `<div>` with no shimmer class fails the className assertion; a mutant rendering all three variants at the same height fails the per-variant assertion.
- **`C-m7a-005` (`<BlueprintBar stagger={false}>` is byte-identical to today) asserts NO `motion.div` container** wraps the `aggregated.map(...)` segment list (`querySelector('[data-framer-motion]')` returns `null`, or the container's `tagName` is `DIV` and carries no Framer-specific data attribute), AND `data-testid="blueprint-segment"` nodes are still present and still plain `<div>`s. A mutant that always wraps in `motion.div` (forgetting the `stagger === false` short-circuit) fails the container-node-type assertion.
- **`C-m7a-006` (`<BlueprintBar stagger={true}>` wraps segments in `motion.div`) asserts the container has `motion.div`'s `style="transform: …"` reset on mount** (Framer applies initial variants synchronously) AND each rendered segment child is wrapped in (or replaced by) a `motion.div` with `data-testid="blueprint-segment"` preserved. The test spies on Framer Motion via `vi.mock("motion/react")` (or the existing `framer-motion` shim) to capture the `staggerChildren` value passed to the container variant — assertion: `staggerChildren === staggerForCount(N)` where N = number of aggregated segments. A mutant hard-coding `staggerChildren: 0.03` fails when N > 15.
- **`C-m7a-009` (skeleton-to-real swap = single React commit; no overlap) asserts that when `BuildingClient` re-renders with `hydrated: false → true`**, the skeleton DOM (`querySelector('[data-testid^="m7a-skeleton-"]')`) returns `null` on the post-swap render AND the real `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` nodes are present — both states are never present in the same render (`expect(screen.queryAllByTestId(/m7a-skeleton-/)).toHaveLength(0)` after the swap; the real nodes' `data-testid` (`blueprint-bar-container`, etc.) are present). A mutant that keeps the skeleton in the tree for a tick (e.g., via `useEffect` cleanup) fails the post-swap query.
- **`C-m7a-010` (stagger fires once per `BuildingClient` mount) asserts that a state-changing dispatch (`LOG_TICK_BRICK`) after the first hydrated render does NOT re-pass `stagger={true}` to the three surfaces** — the spy on `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` records `stagger === true` exactly ONCE across the mount lifecycle; every subsequent render of the same mount receives `stagger === false`. A mutant that flips `stagger` based on `hydrated` alone (no first-paint ref) fails the second-render assertion.
- **`C-m7a-011` (reduced-motion path collapses all variants) asserts that when `usePrefersReducedMotion()` returns `true`**, the `staggerChildren` value passed to each container variant is `0` (not `0.03`, not `staggerForCount(N)`) AND each child variant's `duration` is `0`. A mutant that honors reduced motion only on the child duration but leaves `staggerChildren` non-zero (or vice versa) fails one of the two assertions.
- **`C-m7a-012` (`<Skeleton>` reduced-motion CSS path) asserts that the rendered `<div>` carries the `skeleton-shimmer` class on every variant** (the suppression happens at the CSS `@media` layer in `globals.css`, not at the React level) AND the `aria-hidden` attribute is `"true"` by default. The CSS suppression itself is verified by `A-m7a-001`/`A-m7a-002` on the preview (axe + visual smoke); the React-level assertion is that the component never branches its className on reduced motion. A mutant that toggles classNames in JS based on the media query fails the className assertion.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m7a-001..003` | 3      |
| Component (Vitest + Testing Library)  | `C-m7a-001..012` | 12     |
| Accessibility (axe via Playwright)    | `A-m7a-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m7a-001..006` | 6      |
| **Total**                             |                  | **24** |

ID series start values were supplied by the orchestrator as the running totals for the four `m7a` prefixes; m7a introduces four fresh prefixes (`U-m7a-`, `C-m7a-`, `E-m7a-`, `A-m7a-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m7a IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `deletions: {}`, `history: {}`, `schemaVersion: 3`. The blocks/bricks set varies per test.
- **`stateEmpty`** — `blocks: []`, `looseBricks: []`. Drives the "Empty Day" path: skeleton subtree on `!hydrated`, real `<EmptyBlocks>` on `hydrated`, no `<LooseBricksTray>` mounted.
- **`stateSingle`** — `blocks: [blk-A]` (closed `"08:00"`–`"09:00"`, one tick brick `brk-A1`), `looseBricks: []`. Drives the single-block stagger case (1 × 0.03 = 30 ms total — perceptually instant).
- **`stateTen`** — 10 closed blocks `blk-01..blk-10` at hourly slots `"06:00"..."15:00"`, `looseBricks: [brk-loose-1, brk-loose-2]`. Drives `staggerForCount(10) === 0.03` and the typical-day cascade.
- **`stateMany`** — 30 closed blocks `blk-01..blk-30`. Drives the `staggerForCount(30) === 0.02` floored case and the AC #9 budget check.
- **`statePRM`** — same as `stateTen` but rendered under a `usePrefersReducedMotion` mock returning `true`. Drives AC #7.

### Unit (Vitest)

`U-m7a-001..003` exercise the three pure-logic surfaces: `useFirstPaintAfterHydration` ref-machine, `staggerForCount(n)` piecewise helper, and the `usePersistedState` third tuple slot.

#### U-m7a-001 — success (`useFirstPaintAfterHydration` — pending → staggered → done across renders; remount restarts at pending, mutation-resistant)

Target file: `lib/firstPaint.test.ts` (NEW — m7a creates this file; no existing test touched)
Layer: Unit
**GIVEN** the `useFirstPaintAfterHydration(hydrated: boolean): boolean` hook from `lib/firstPaint.ts`, rendered inside a Testing-Library `renderHook` harness so the same component instance can re-render with different prop values
**WHEN** the hook is called in sequence — render 1 with `hydrated=false`; render 2 with `hydrated=true`; render 3 with `hydrated=true`; render 4 with `hydrated=true`
**THEN** the returned value is **EXACTLY** `false` on render 1 (pre-hydration → skeleton path); `true` on render 2 (first hydrated render → stagger fires); `false` on render 3 (`staggered → done` transition); `false` on render 4 (`done` stays `done`). A subsequent re-render with `hydrated=false` (theoretically impossible per the plan, but tested defensively) STILL returns `false` and does NOT re-trigger the cascade — the ref is monotonic-forward.
**AND** a separate render → unmount → fresh render assertion: render hook with `hydrated=true` (returns `true`), unmount the result, re-render a fresh instance with `hydrated=true` — the fresh instance returns `true` again on its first render (the ref is per-component-instance, not module-scoped). A mutant using a module-level singleton fails the remount case.
Proves: plan.md § Data model (`useFirstPaintAfterHydration` ref tri-state: `"pending" | "staggered" | "done"`; "Component re-mount … resets the ref to `pending` and the stagger fires once more on remount") + § Edge cases ("Second navigation to the Day view (Week → Day) — fires once per `BuildingClient` mount") — covers SPEC AC #2.
Tag: success.

#### U-m7a-002 — boundary table (`staggerForCount(n)` — exact numeric outputs at N=0,1,10,15,16,20,30,50; mutation-resistant)

Target file: `lib/motion.test.ts` (EXISTS — m7a appends `staggerForCount` cases; no existing motion-token test touched)
Layer: Unit
**GIVEN** `staggerForCount(n: number): number` exported from `lib/motion.ts`, plus `motionTokens.stagger.durationMs` (the canonical 30 ms)
**WHEN** `staggerForCount` is called with `n = 0, 1, 10, 15, 16, 20, 30, 50`
**THEN** the returned numbers are **EXACTLY**: `staggerForCount(0) === motionTokens.stagger.durationMs / 1000` (= `0.03`); `staggerForCount(1) === 0.03`; `staggerForCount(10) === 0.03`; `staggerForCount(15) === 0.03` (boundary — `n <= 15` still in canonical branch); `staggerForCount(16) === 0.45 / 16` (= `0.028125` — first capped value); `staggerForCount(20) === 0.45 / 20` (= `0.0225`); `staggerForCount(30) === Math.max(0.02, 0.45 / 30)` (= `0.02` — floor wins over `0.015`); `staggerForCount(50) === 0.02` (floor).
**AND** the helper is referentially transparent — repeated calls with the same `n` return the same number; no closure state, no `Math.random`, no `Date.now` reads. A test for purity calls `staggerForCount(20)` 100× and asserts every return is `0.0225`.
**AND** the canonical-branch value is sourced from `motionTokens.stagger.durationMs / 1000` (single source of truth) — a coordinated change to the motion token cascades through both production code and test.
Proves: plan.md § Stagger ceiling — `staggerForCount(n)` helper (resolves SG-m7a-01) + § Design tokens (per-sibling stagger delay; stagger ceiling) — covers SPEC AC #3 and SG-m7a-01.
Tag: success / edge / boundary.

#### U-m7a-003 — additive (`usePersistedState` returns `[state, dispatch, mounted]`; `mounted === false` pre-effect, `true` after `act`; existing two-element destructure stays byte-identical)

Target file: `lib/usePersistedState.test.tsx` (EXISTS — m7a appends third-slot cases; M8/M9b existing assertions stay byte-identical per plan § Regression surface)
Layer: Unit
**GIVEN** the `usePersistedState()` hook (`lib/usePersistedState.ts`), rendered inside a Testing-Library `renderHook` harness
**WHEN** the hook is rendered the first time (the synchronous body runs but the post-mount `useEffect` has NOT yet flushed)
**THEN** `result.current` is a **3-element tuple**: `result.current[0]` is the `AppState` (default-persisted; same as today); `result.current[1]` is the `Dispatch<Action>` (same function reference across renders, per the M8 baseline); `result.current[2] === false` — **strictly** `false`, not `undefined`, not `null` (the pre-effect `mounted` value).
**AND WHEN** `act(() => {})` is called to flush the post-mount `useEffect`
**THEN** `result.current[2] === true` — the M8 post-mount load has completed; the third slot has flipped to `true`. A repeated rerender does NOT flip it back to `false` (the underlying `mounted` is monotonic-true).
**AND** the existing M8/M9b destructure pattern `const [state, dispatch] = result.current` continues to work without TypeScript or runtime error (TS allows two-element destructure of a three-element tuple; `state` and `dispatch` are byte-identical to today). A mutant returning a two-element tuple fails the `result.current[2]` access immediately; a mutant returning `undefined` for the third slot fails the strict-equality `=== false` assertion; a mutant always returning `true` fails the pre-effect render.
Proves: plan.md § Data model (`return [state, dispatch, mounted]` — additive only; M8 `mounted` exposed as third slot) + § Regression surface (existing two-element destructure stays green) — covers SPEC AC #4 (the `hydrated` signal that gates the skeleton subtree).
Tag: success / additive.

### Component (Vitest + Testing Library)

`C-m7a-001..004` exercise `<Skeleton variant>` per-variant rendering. `C-m7a-005..006` exercise `<BlueprintBar stagger>` (false → byte-identical, true → wrapped). `C-m7a-007` exercises `<Timeline stagger>`. `C-m7a-008` exercises `<LooseBricksTray stagger>`. `C-m7a-009..010` exercise `<BuildingClient>`'s `hydrated` branch + first-paint-stagger-once contract. `C-m7a-011..012` exercise the reduced-motion paths.

#### C-m7a-001 — success (`<Skeleton variant="block">` renders the shimmer class + correct height + aria-hidden by default)

Target file: `components/Skeleton.test.tsx` (NEW — m7a creates this file)
Layer: Component
**GIVEN** the `<Skeleton variant="block" />` component from `components/Skeleton.tsx`
**WHEN** rendered into the JSDOM
**THEN** the rendered DOM is a single `<div>` carrying the EXACT className token `skeleton-shimmer` (`expect(node).toHaveClass("skeleton-shimmer")`) plus a `data-variant="block"` attribute; `aria-hidden="true"` is present (decorative — assistive tech announces nothing); the inline style or class enforces `height: 92px` (matching a collapsed `<TimelineBlock>` card to prevent CLS on swap per AC #6).
**AND** no child text content is rendered (skeleton is purely a placeholder shape — no text means no contrast violation).
Proves: plan.md § Components (`<Skeleton>` — variant="block": `border-radius: 12px; height: 92px; padding: 12px;`; `aria-hidden="true"` default) + § Skeleton count + composition — covers SPEC AC #4, AC #6.
Tag: success.

#### C-m7a-002 — success (`<Skeleton variant="chip">` renders chip-shaped placeholder; CLS-safe height/min-width)

Target file: `components/Skeleton.test.tsx`
Layer: Component
**GIVEN** the `<Skeleton variant="chip" />` component
**WHEN** rendered into the JSDOM
**THEN** the rendered `<div>` carries `skeleton-shimmer` + `data-variant="chip"`; the computed/inline style sets `height: 28px` and `min-width: 96px` and `border-radius: 999px` (matching a `<BrickChip size="sm">` to prevent CLS on swap). `aria-hidden="true"` is present.
Proves: plan.md § Components (`<Skeleton>` — variant="chip": `border-radius: 999px; height: 28px; min-width: 96px;`) — covers SPEC AC #4, AC #6.
Tag: success.

#### C-m7a-003 — success (`<Skeleton variant="segment">` renders BlueprintBar-segment placeholder)

Target file: `components/Skeleton.test.tsx`
Layer: Component
**GIVEN** the `<Skeleton variant="segment" />` component
**WHEN** rendered into the JSDOM
**THEN** the rendered `<div>` carries `skeleton-shimmer` + `data-variant="segment"`; the computed/inline style sets `height: 36px` and `width: 100%` and `border-radius: 6px` (matching the `<BlueprintBar>` inner segment row at `h-9 = 36px`). `aria-hidden="true"` is present.
Proves: plan.md § Components (`<Skeleton>` — variant="segment": `border-radius: 6px; height: 36px; width: 100%;`) — covers SPEC AC #4, AC #6.
Tag: success.

#### C-m7a-004 — edge (`<Skeleton>` honors `aria-hidden={false}` override + accepts `className` for caller-positioning)

Target file: `components/Skeleton.test.tsx`
Layer: Component
**GIVEN** the `<Skeleton variant="block" aria-hidden={false} className="custom-pos" />` component
**WHEN** rendered into the JSDOM
**THEN** the rendered `<div>` carries `skeleton-shimmer` (the canonical class is never stripped) AND `custom-pos` (caller-supplied positioning class — e.g., `absolute top-[60px]` from `TimelineSkeleton`) AND `aria-hidden="false"` (override respected, in case a future caller wants to announce loading). The two classes coexist without one overriding the other; the variant-sizing inline style is unchanged.
Proves: plan.md § Components (`<Skeleton>` props: `{ variant; className?; "aria-hidden"?: boolean }`; `aria-hidden` defaults to `true`) — covers SPEC AC #4 (the skeleton is decorative by default; the override is a hatch for accessibility future-proofing).
Tag: edge.

#### C-m7a-005 — success (`<BlueprintBar stagger={false}>` is byte-identical to today — NO `motion.div` container, segments still present)

Target file: `components/BlueprintBar.test.tsx` (EXISTS — m7a appends stagger-prop cases; existing prop-omitting cases stay byte-identical per plan § Regression surface)
Layer: Component
**GIVEN** the `<BlueprintBar>` component with the M2/M3 standing props (a non-empty `aggregated` array of category segments) and `stagger={false}` (or omitted, which defaults to `false`)
**WHEN** rendered into the JSDOM
**THEN** the container `<div>` is a **plain** `<div className="flex h-full w-full">` — NO `motion.div`, NO `data-framer-motion` attribute, NO Framer-injected `style="transform: …"` (the test asserts `node.tagName === "DIV"` AND `node.dataset.framerMotion` is `undefined`); each child segment is a plain `<div data-testid="blueprint-segment" />` (preserving the M2/M3 test selectors); no animation variants are passed.
**AND** the rendered HTML is byte-identical to the pre-M7a render (the test snapshot, or a per-attribute diff, matches the M3 baseline). Existing M2/M3 BlueprintBar tests pass unamended.
Proves: plan.md § Components (`<BlueprintBar>` — "When `stagger === false` (every render after first paint, every re-render, every Week/Month/Year sibling-render), the existing `<div className="flex h-full w-full">{aggregated.map(...)}</div>` renders byte-identical to today") + § Regression surface — covers SPEC AC #2 (the stagger fires once per mount — subsequent renders do not re-stagger because they pass `stagger={false}`).
Tag: success / regression.

#### C-m7a-006 — success (`<BlueprintBar stagger={true}>` wraps segments in `motion.div`; container variant uses `staggerForCount(N)`; `data-testid="blueprint-segment"` preserved)

Target file: `components/BlueprintBar.test.tsx`
Layer: Component
**GIVEN** the `<BlueprintBar>` component with `stagger={true}` and a non-empty `aggregated` array of N category segments (test parameterizes N = 1, 5, 20)
**WHEN** rendered into the JSDOM, with `motion/react` mocked via `vi.mock` so the test can spy on the `variants` / `transition` / `initial` / `animate` props passed to `motion.div`
**THEN** the container is a `motion.div` (or `motion.div`-shimmed wrapper from the mock) carrying `initial="initial"`, `animate="animate"`, and a `variants` object whose `animate.transition.staggerChildren === staggerForCount(N)` (computed against the same N — `staggerForCount(5) === 0.03`, `staggerForCount(20) === 0.0225`); each child segment is a `motion.div` with `variants` carrying `initial: { opacity: 0, y: 4 }` → `animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } }`. The `data-testid="blueprint-segment"` attribute is preserved on each child so M2/M3 tests stay green.
**AND** the empty-outline / NOW pin / outer container nodes (`data-testid="blueprint-bar-container"`, `data-testid="now-pin"`) are OUTSIDE the staggered list — they render in the same plain shell whether `stagger` is `true` or `false`.
Proves: plan.md § Components (`<BlueprintBar>` — "When `stagger === true`, the inner `<div className="flex h-full w-full">` becomes `<motion.div … variants={containerVariants} initial="initial" animate="animate">` …; `transition: { staggerChildren: staggerForCount(N) }`"; `data-testid` preserved) + § Stagger ceiling — covers SPEC AC #1, AC #3, SG-m7a-01.
Tag: success.

#### C-m7a-007 — success (`<Timeline stagger>` toggle — `false` byte-identical; `true` wraps block cards in `motion.div`; chrome (hour-grid, SlotTapTargets, NowLine) NOT wrapped)

Target file: `components/Timeline.test.tsx` (EXISTS — m7a appends stagger-prop cases; existing prop-omitting cases stay byte-identical)
Layer: Component
**GIVEN** the `<Timeline>` component with N=3 visible block items (`stateSingle` extended) and the standard chrome (hour-grid, `SlotTapTargets`, `NowLine`)
**WHEN** rendered first with `stagger={false}` then re-rendered with `stagger={true}`, with `motion/react` mocked to spy on `motion.div` instantiations
**THEN** under `stagger={false}`: the items.map render is a plain `<div>` / `<section>` (NO `motion.div`); the hour-grid background, `SlotTapTargets`, and `NowLine` render at their existing layers (z=0/1/3) byte-identical to today; existing M2/M3/M5b/M6 Timeline tests pass unamended.
**AND** under `stagger={true}`: a `motion.div` wrapper appears around the items.map block list (with `display: contents` or `position: absolute; inset: 0; pointer-events: none` per the plan's mechanism choice — either is acceptable; the test asserts the wrapper has variants with `staggerChildren === staggerForCount(3) === 0.03` AND the children pointer events still reach `SlotTapTargets` underneath, verified by clicking a slot under a block-card placeholder and asserting the click target is the `SlotTapTarget`, not the wrapper); each block card / TimedLooseBrickCard / `<EmptyBlocks>` is wrapped in (or replaced by) a `motion.div variants={childVariants}` whose absolute positioning is preserved (the existing `top: …px` style still applies).
**AND** critically: the hour-grid background, `SlotTapTargets`, and `NowLine` are NOT inside the stagger wrapper — they render at their existing layers and do NOT fade in (they are chrome, not data, per the plan's explicit "do NOT wrap" note).
Proves: plan.md § Components (`<Timeline>` — `stagger?: boolean`; "do NOT wrap the hour-grid background, SlotTapTargets, or the NowLine — those three layers must remain on z=0/1/3"; plan baseline `display: contents` wrapper) + § Edge cases — covers SPEC AC #1, AC #2, AC #6.
Tag: success.

#### C-m7a-008 — success (`<LooseBricksTray stagger>` toggle — `false` byte-identical; `true` wraps chips in `motion.li` / `motion.div`; chrome (chevron, + Brick pill) NOT wrapped)

Target file: `components/LooseBricksTray.test.tsx` (EXISTS — m7a appends stagger-prop cases; existing prop-omitting cases stay byte-identical)
Layer: Component
**GIVEN** the `<LooseBricksTray>` component with N=4 loose bricks rendered in the expanded `<ul>` path (and separately, the collapsed horizontal-flex path)
**WHEN** rendered with `stagger={false}` then `stagger={true}`
**THEN** under `stagger={false}`: the `<ul>` / horizontal-flex container is a plain `<ul>` / `<div>` (NO `motion.ul` / `motion.div`); each `<li>` / chip wrapper is plain; existing M5b/M4f LooseBricksTray tests pass unamended.
**AND** under `stagger={true}`: the container becomes `motion.ul` / `motion.div` with stagger variants; each `<li>` (expanded) or chip-wrapper `<div>` (collapsed) becomes `motion.li` / `motion.div` with `childVariants`; the chevron toggle and `+ Brick` add-pill render OUTSIDE the staggered list (they are chrome — they paint instantly).
**AND** the outer `<section aria-label="Loose bricks">` and `aria-expanded` attribute are unchanged in both branches (the wrapping happens on the inner list, not the outer region — preserving the M5b aria semantics).
Proves: plan.md § Components (`<LooseBricksTray>` — `stagger?: boolean`; "When `true`, both the expanded `<ul>` path and the collapsed horizontal-flex path become `motion.ul` / `motion.div`"; "The `+ Brick` add-pill and the chevron toggle render outside the staggered list") + § Accessibility — covers SPEC AC #1, AC #2.
Tag: success.

#### C-m7a-009 — success (`<BuildingClient hydrated={false}>` renders skeleton subtree; `hydrated={true}` renders real subtree; swap is a single React commit with NO overlap)

Target file: `app/(building)/BuildingClient.test.tsx` (EXISTS — m7a appends `hydrated`-branch cases; existing tests use the default `hydrated={true}` per plan § Regression surface)
Layer: Component
**GIVEN** the `<BuildingClient>` component with `state` (any valid `AppState`) and `dispatch` (a `vi.fn()` spy)
**WHEN** rendered first with `hydrated={false}`, then re-rendered with `hydrated={true}` (simulating the two-pass-hydration `mounted` flip)
**THEN** on the `hydrated={false}` render: the JSDOM contains the skeleton subtree — `screen.queryAllByTestId(/^m7a-skeleton-/)` returns ≥ 5 nodes (1 BlueprintBar segment + 3 Timeline blocks + 1 LooseBricksTray chip per SG-m7a-02); the real `<BlueprintBar>` (`data-testid="blueprint-bar-container"`), `<Timeline>` (`data-testid="timeline-container"` or equivalent), and `<LooseBricksTray>` (`data-testid="loose-bricks-tray"`) are ABSENT; Hero / TopBar / BottomBar / ViewSwitcher ARE present (no skeleton on chrome per plan § Skeleton count).
**AND** on the `hydrated={true}` render: the skeleton DOM is GONE (`screen.queryAllByTestId(/^m7a-skeleton-/).length === 0`) AND the real `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` are present — both states never coexist in the same render (AC #5: no overlap of skeleton + real card in the same row). The swap happens in a single React commit (a `useEffect`-cleanup that delayed the skeleton removal would fail this assertion).
**AND** the skeleton subtree's outer container reserves the same vertical span as the real Timeline (verified by `getBoundingClientRect().height` parity within a small tolerance) — AC #6: zero CLS at the swap.
Proves: plan.md § Components (`<BuildingClient>` — "Render branch (pseudo-JSX, only the three M7a surfaces shown): `{!hydrated ? (skeleton subtree) : (real subtree)}`"; "The skeleton swap is a single React commit"; SG-m7a-02 RESOLVED — 3 + 1 + 1 placeholders) — covers SPEC AC #4, AC #5, AC #6.
Tag: success.

#### C-m7a-010 — success (stagger fires once per `BuildingClient` mount; state updates after first paint do NOT re-trigger; spy on `stagger` prop value across renders)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** the `<BuildingClient>` component with `hydrated={true}` and a non-empty `state` (`stateTen`), with `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` mocked via `vi.mock` so the test can spy on the `stagger` prop received on each render
**WHEN** the component renders the first time (first hydrated render — `useFirstPaintAfterHydration` returns `true`), then is forced to re-render via a `dispatch({ type: "LOG_TICK_BRICK", ... })` (or any prop change that triggers a re-render without unmount)
**THEN** the spy records `stagger === true` EXACTLY ONCE across the mount lifecycle (on the first hydrated render); every subsequent render of the same mount receives `stagger === false` — including the render triggered by the `LOG_TICK_BRICK` dispatch, the now-line tick (simulated via `vi.advanceTimersByTime(60_000)`), and any other state-changing path tested.
**AND** an unmount-and-remount sequence (simulating Day → Week → Day navigation via `AppShell`'s view switch): after the first mount cycle (stagger fired once), unmount via `cleanup()`, then mount a fresh `<BuildingClient>` — the fresh mount's first hydrated render again receives `stagger === true` (the `useFirstPaintAfterHydration` ref restarts at `pending` on each new mount). The cascade fires once per `BuildingClient` mount, not once per session.
Proves: plan.md § Components (`<BuildingClient>` — "Call `const stagger = useFirstPaintAfterHydration(hydrated);` once near the top — AC #2") + § Edge cases ("Second navigation to the Day view — fires once per `BuildingClient` mount") — covers SPEC AC #2.
Tag: success.

#### C-m7a-011 — edge (reduced-motion path — `usePrefersReducedMotion()` returns `true` → `staggerChildren === 0` AND child `duration === 0`)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** the `<BuildingClient>` component with `hydrated={true}`, a non-empty `state` (`statePRM`), and `usePrefersReducedMotion()` mocked to return `true`
**WHEN** rendered and the spy on `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` captures the container `variants` and `transition` props passed
**THEN** each container variant's `animate.transition.staggerChildren === 0` (NOT `0.03`, NOT `staggerForCount(N)`) AND each child variant's `transition.duration === 0` — the cascade collapses to instant; all three surfaces appear at the same frame with no per-sibling delay.
**AND** the skeleton subtree (if rendered before hydration) still renders with the `skeleton-shimmer` class on the `<div>` (the JS does not branch the className on PRM); the CSS-level suppression of the shimmer animation is verified by `A-m7a-001` on the preview (axe-only / no axe rule needed, but the `@media (prefers-reduced-motion: reduce)` block in `globals.css` sets `animation: none !important`).
Proves: plan.md § Edge cases (`prefers-reduced-motion: reduce` — "BlueprintBar / Timeline / LooseBricksTray each pass `transition: { duration: 0, staggerChildren: 0 }`"; "CSS `@media (prefers-reduced-motion: reduce)` block sets `.skeleton-shimmer` to flat `var(--card)`") + § Accessibility (AC #7) — covers SPEC AC #7.
Tag: edge.

#### C-m7a-012 — edge (`<Skeleton>` className is reduced-motion-invariant at the JS level; CSS-only suppression; `aria-hidden="true"` default)

Target file: `components/Skeleton.test.tsx`
Layer: Component
**GIVEN** the `<Skeleton variant="block" />` component, with `usePrefersReducedMotion()` mocked first to `false`, then to `true` (test parameterized)
**WHEN** rendered in both PRM=false and PRM=true scenarios
**THEN** the rendered `<div>` carries the SAME className token `skeleton-shimmer` in BOTH scenarios — the JS does NOT branch the className on the PRM media query (the suppression happens at the CSS `@media (prefers-reduced-motion: reduce)` layer in `globals.css`, which sets `.skeleton-shimmer { animation: none !important; background-image: none; background-color: var(--card); }`). `aria-hidden="true"` is present in both scenarios.
**AND** the component does NOT call `usePrefersReducedMotion()` itself (a `vi.spyOn` on the hook records zero calls from the `<Skeleton>` instance — the hook is consumed by `<BlueprintBar>` / `<Timeline>` / `<LooseBricksTray>` for the Framer variants, NOT by the skeleton primitive). Keeps the skeleton purely presentational; CSS owns the PRM branch.
Proves: plan.md § Components (`<Skeleton>` — "Under `prefers-reduced-motion: reduce`, the animation is suppressed via `@media` rule in `globals.css` and the placeholder renders as a flat `var(--card)` swatch (AC #7)"; "Pure presentational component; no React state") — covers SPEC AC #7.
Tag: edge.

### Accessibility (axe via Playwright) — deferred to preview

m7a accessibility runs as Playwright + `@axe-core/playwright` smoke on the preview deployment. The sandbox cannot exercise the real `prefers-reduced-motion` media query reliably, and the post-hydration cascade timing is browser-engine-dependent — but axe-clean assertions are deterministic and run identically in CI and preview.

#### A-m7a-001 — axe-clean during the pre-hydration window (skeleton subtree)

Target file: `e2e/m7a-skeleton-a11y.spec.ts` (NEW — deferred-to-preview)
Layer: Accessibility
**GIVEN** the Day-view URL loaded with `localStorage.clear()` (forces pass 1 of the two-pass hydration; the skeleton subtree renders momentarily before client state lands)
**WHEN** Playwright triggers an `AxeBuilder` scan of the page within the pre-hydration window (or against a forced-pre-hydration test harness that fixes `hydrated=false` for the scan)
**THEN** axe reports ZERO violations — the skeleton `<div>`s are `aria-hidden="true"` (no role-required attributes), carry no text content (no WCAG text-contrast violation), and the placeholder gradient is non-text decorative (non-text contrast does not apply). The chrome around the skeleton (Hero, TopBar, BottomBar, ViewSwitcher) maintains its existing a11y posture (carried over from M1/M3/M5b — axe-clean today).
**AND** under `page.emulateMedia({ reducedMotion: "reduce" })`, the skeleton `<div>`s still render with the `skeleton-shimmer` class but the computed-style `animation-name` is `none` (CSS `@media` suppression in `globals.css`); axe still reports zero violations.
Proves: plan.md § Accessibility ("Skeleton subtree: `<Skeleton>` is `aria-hidden='true'` by default. The pre-hydration window is short … and announces nothing to assistive tech"; reduced-motion CSS suppression) — covers SPEC AC #4, AC #7, AC #10.
Tag: a11y.

#### A-m7a-002 — axe-clean during the post-hydration cascade (real subtree); tab order unchanged across the swap

Target file: `e2e/m7a-cascade-a11y.spec.ts` (NEW — deferred-to-preview)
Layer: Accessibility
**GIVEN** the Day-view URL loaded with a seeded `localStorage` (`stateTen` payload — 10 blocks, 2 loose bricks)
**WHEN** Playwright waits for `hydrated === true` (via a `data-hydrated="true"` attribute on `<BuildingClient>` or equivalent signal) and immediately scans with `AxeBuilder`
**THEN** axe reports ZERO violations on the real subtree — `<BlueprintBar aria-label="Day blueprint">`, `<LooseBricksTray role="region" aria-label="Loose bricks">`, and the Timeline's block cards / brick chips carry their existing M5b/M6 aria attributes unchanged.
**AND** the Tab key order across the page (focusable elements in document order) is the SAME pre-swap and post-swap — the skeleton subtree contains NO focusable elements (skeletons are `aria-hidden="true"` and non-interactive); the chrome that is focusable on first paint (Hero, BottomBar, ViewSwitcher) renders identically before and after the swap, so Tab order does not jump or change. Verified by recording the `document.activeElement` sequence across 10 `Tab` presses before and after the swap and asserting the sequence is identical.
Proves: plan.md § Accessibility ("Real surfaces' `aria-label` / `role` are unchanged"; "Focus management: the pre-hydration window contains no focusable elements inside the skeleton subtree"; tab order parity) — covers SPEC AC #10.
Tag: a11y.

#### A-m7a-003 — 430 px viewport no-overflow during every cascade frame

Target file: `e2e/m7a-mobile-a11y.spec.ts` (NEW — deferred-to-preview)
Layer: Accessibility / mobile
**GIVEN** the Day-view URL loaded on a 430 × 932 viewport (`page.setViewportSize({ width: 430, height: 932 })`) with a seeded `localStorage` (`stateTen`)
**WHEN** Playwright records the `document.documentElement.scrollWidth` across the pre-hydration frame, the post-hydration first-paint frame, and a frame mid-cascade (e.g., 100 ms after hydration)
**THEN** `scrollWidth <= 430` in EVERY frame — no horizontal overflow at any point in the swap or cascade. The skeleton sizes (block 92 px, chip 28 px × 96 min-width, segment 36 px × 100% width) all fit within the 430 px viewport; the staggered real cards inherit the same per-card widths as today (M5b/M6 baseline).
**AND** Playwright captures a single full-page screenshot mid-cascade and an `axe` scan to assert zero violations even mid-animation (the cascade is opacity + transform — does not affect a11y posture).
Proves: plan.md § Accessibility ("430 px (AC #10): the skeleton sizes match the real cards; no new horizontal content; no overflow at 430 px") — covers SPEC AC #10.
Tag: a11y / mobile.

### E2E (Playwright) — deferred to preview

m7a E2E runs as Playwright on the preview deployment. The sandbox cannot run a real Lighthouse audit (per M5/M6 sandbox notes; § Sandbox / preview note below) and the cascade timing is most accurately measured against a real browser at the production-equivalent build. Each `E-m7a-NNN` ID below is authored as a real `test()` block in `e2e/` and executed on the Vercel preview.

#### E-m7a-001 — first paint shows skeleton placeholders that swap to real cards (the headline behavior)

Target file: `e2e/m7a-first-paint.spec.ts` (NEW)
Layer: E2E
**GIVEN** the Day-view URL on a clean session (`localStorage.clear()` before navigation), seeded post-load with `stateTen`
**WHEN** Playwright navigates to `/` and captures DOM snapshots at: (a) the immediate first paint (before client state lands); (b) ~50 ms later, after hydration
**THEN** snapshot (a) contains the skeleton subtree — `page.locator('[data-testid^="m7a-skeleton-"]').count()` returns ≥ 5; the real `<BlueprintBar>` segments / `<Timeline>` block cards / `<LooseBricksTray>` chips are NOT present.
**AND** snapshot (b) contains the real subtree — `m7a-skeleton-*` count is 0; the real `[data-testid="blueprint-segment"]` / Timeline block cards / loose-brick chips ARE present and are visibly fading in (the post-mount opacity is < 1 mid-cascade; the test waits for `animationend` on the last child before asserting final opacity is 1).
Proves: plan.md § Components (`<BuildingClient>` `!hydrated` branch → skeleton subtree; `hydrated` branch → real subtree + stagger) — covers SPEC AC #4, AC #5.
Tag: e2e / first-paint.

#### E-m7a-002 — cascade completes within `N × stagger + 100 ms` overhead (AC #9 timing budget)

Target file: `e2e/m7a-cascade-budget.spec.ts` (NEW)
Layer: E2E / performance
**GIVEN** the Day-view URL with a seeded `localStorage` of `stateTen` (N=10 visible blocks, 2 loose bricks, 1 segment row → max N across the three surfaces is 10)
**WHEN** Playwright records the timestamp at which `hydrated === true` is first observed (via `data-hydrated="true"` attribute or equivalent signal) and the timestamp at which the LAST block card's opacity transition completes (Framer Motion fires an `animationend` / completion event the test listens for)
**THEN** `(t_last - t_hydrated) <= staggerForCount(10) × 1000 × 10 + 100` ms — i.e., `≤ 0.03 × 1000 × 10 + 100 = 400 ms` for the typical N=10 case; for `stateMany` (N=30), `≤ 0.02 × 1000 × 30 + 100 = 700 ms`. The 100 ms headroom covers the 180 ms child-fade duration plus browser-event-loop overhead.
**AND** the test parameterizes N at 1, 10, 20, 30 and asserts the formula holds at each — a mutant that hard-codes `staggerChildren: 0.03` even at N=30 would produce 30 × 30 ms + 180 ms = 1080 ms > 700 ms budget and fail.
Proves: plan.md § Performance ("Stagger budget — `cascade ≤ N × stagger + 100 ms` overhead. With `staggerForCount(n)` capping the per-sibling delay, the worst-case at N=30 is 700 ms") + § Stagger ceiling — covers SPEC AC #9, SG-m7a-01.
Tag: e2e / perf.

#### E-m7a-003 — zero CLS at the skeleton-to-real swap (AC #6)

Target file: `e2e/m7a-cls.spec.ts` (NEW)
Layer: E2E / performance
**GIVEN** the Day-view URL with a seeded `localStorage` of `stateTen`
**WHEN** Playwright instruments `PerformanceObserver` with `entryTypes: ["layout-shift"]` and records all CLS entries from navigation through the post-hydration cascade
**THEN** the cumulative CLS value across the swap window (from before hydration to 1 s after) is `< 0.01` (target zero; the 0.01 threshold absorbs sub-pixel rounding noise that browsers report as tiny shifts). No layout-shift entry attributed to the BlueprintBar / Timeline / LooseBricksTray surfaces during the swap (the skeleton bounding boxes match the real-card bounding boxes within 1 px).
**AND** the test also asserts via `getBoundingClientRect()` that the BlueprintBar skeleton's `[height, width]` is within `[±1px, ±1px]` of the real BlueprintBar's post-swap `[height, width]` — direct verification of the AC #6 bounding-box-parity assertion.
Proves: plan.md § Performance ("Cumulative Layout Shift (AC #6): skeleton sizes match real-card bounding boxes; CLS at the swap is target-zero. Verified via Playwright trace") — covers SPEC AC #6.
Tag: e2e / perf.

#### E-m7a-004 — reduced-motion forced ON → no animation, no shimmer, instant swap

Target file: `e2e/m7a-reduced-motion.spec.ts` (NEW)
Layer: E2E
**GIVEN** the Day-view URL with `page.emulateMedia({ reducedMotion: "reduce" })` set BEFORE navigation, plus a seeded `localStorage` of `stateTen`
**WHEN** Playwright navigates and captures the cascade timing (same instrumentation as `E-m7a-002`)
**THEN** the swap is effectively instant: `(t_last - t_hydrated) <= 100 ms` (no per-sibling delay, no 180 ms child fade — Framer's `duration: 0` and `staggerChildren: 0` collapse to zero animation; the 100 ms is browser-event-loop overhead only). The skeleton `<div>`s render with `skeleton-shimmer` class present but `getComputedStyle(node).animationName === "none"` (CSS `@media` suppression).
**AND** no `animation-iteration-count` or `animation-name` other than `none` is observed on the skeleton subtree; the shimmer is a flat `var(--card)` background-color (verified via `getComputedStyle`).
Proves: plan.md § Edge cases (`prefers-reduced-motion: reduce` row) + § Accessibility (AC #7 reduced-motion path) — covers SPEC AC #7.
Tag: e2e / reduced-motion.

#### E-m7a-005 — Lighthouse Performance ≥ 90 on the post-M7a Day view (AC #9 perf floor)

Target file: `e2e/m7a-lighthouse.spec.ts` (NEW — deferred-to-preview; Lighthouse audit runs against the Vercel preview URL)
Layer: E2E / performance
**GIVEN** the Vercel preview URL for the m7a branch, with a seeded `localStorage` of `stateTen` (typical-day payload)
**WHEN** the Lighthouse audit runs in mobile emulation mode (430 × 932, 4 G throttling)
**THEN** the reported Lighthouse Performance score is `≥ 90` — the M6 baseline (status.md tracked as ≥ 90 today) is preserved. The skeleton + stagger add: (a) three `motion.div` wrappers per surface (negligible JS bundle delta); (b) one CSS keyframe + one class in `globals.css` (negligible CSS); (c) zero new asset weight (SG-m7a-03 — pure CSS, no images / SVG / fonts).
**AND** First Contentful Paint is at or below the M6 baseline (skeleton renders SSR-first, so FCP is unblocked by client hydration); Largest Contentful Paint is at or below the M6 baseline (the LCP element is unchanged — Hero ring, which renders chrome-side, not inside the skeleton subtree).
Proves: plan.md § Performance ("Lighthouse Perf ≥ 90 (AC #9): zero new asset weight (SG-m7a-03); only JS additions are three `motion.div` wrappers"; FCP unchanged) + § Out of scope ("A perf regression budget below the current M6 baseline") — covers SPEC AC #9.
Tag: e2e / perf / preview-only.

#### E-m7a-006 — second navigation (Week → Day) re-fires the cascade (AC #2 + Edge cases "Second navigation")

Target file: `e2e/m7a-remount.spec.ts` (NEW)
Layer: E2E
**GIVEN** the Day-view URL with a seeded `localStorage` of `stateTen`; Playwright waits for the first-mount cascade to complete (`E-m7a-001` baseline)
**WHEN** Playwright clicks the ViewSwitcher's "Week" tab (`AppShell` unmounts `<BuildingClient>` and mounts `<WeekView>`), waits for Week view to render, then clicks "Day" again (`AppShell` unmounts Week and mounts a FRESH `<BuildingClient>`)
**THEN** the cascade fires AGAIN on the second Day mount — the block cards' opacity transitions from 0 → 1 with per-sibling stagger, observable via the same `animationend` listener as `E-m7a-001`. The skeleton subtree does NOT re-render on the Week → Day path because `hydrated` is already `true` (persistence hydrated at session boot; the third tuple slot stays `true` once flipped); the cascade is the only visible signal of "first paint" on the remount.
**AND** the cascade timing on the remount obeys the same `staggerForCount(N) × N × 1000 + 100` ms budget — within 400 ms for N=10.
Proves: plan.md § Edge cases ("Second navigation to the Day view (Week → Day) — `AppShell`'s view switch unmounts the Week / Month / Year subtree and mounts `<BuildingClient>` fresh. `useFirstPaintAfterHydration`'s ref starts at `pending` on the new mount") + § Out of scope ("Re-stagger on Day → Week → Day round-trip without component re-mount" — confirms today's mount semantics) — covers SPEC AC #2 (the cascade fires once per `BuildingClient` mount, which is once per Day-view entry under today's `AppShell` semantics).
Tag: e2e / remount.

### Sandbox / preview note

Two E2E IDs and all three A11y IDs are explicitly **deferred to the Vercel preview run**: `E-m7a-005` requires a real Lighthouse audit (the sandbox lacks the throttled headless-Chrome harness Lighthouse needs); `A-m7a-001`/`A-m7a-002`/`A-m7a-003` require axe scans against a deployed build (the sandbox's local dev server has the `devIndicators: false` setting per ADR-029, but axe runs more reliably against the production-build output served by Vercel). The remaining four E2E IDs (`E-m7a-001..004` + `E-m7a-006`) can run in the sandbox's Playwright project as long as `localStorage` seeding works (M8/M9b precedent — they do). Authoring all six as real `test()` blocks is mandatory (M5b/M9c precedent — preview-deferred ≠ untested).

### Retired / amended test IDs

M7a is **additive at every seam.** The plan's § Regression surface flags two narrow sanctioned amendments and three byte-identical additive surfaces; the TESTS author honors them exactly:

- **`lib/usePersistedState.test.tsx`** — gains a new `it("returns [state, dispatch, mounted] as a 3-tuple", ...)` case (anchored as `U-m7a-003`). The M8 / M9b existing assertions (the two-element destructure `const [state, dispatch] = result.current`) stay byte-identical — TS allows two-element destructure of a three-element tuple, runtime behavior unchanged. Zero existing assertion is rewritten.
- **`app/(building)/BuildingClient.test.tsx`** — gains new `hydrated`-branch cases (`C-m7a-009`, `C-m7a-010`, `C-m7a-011`). Existing tests do NOT explicitly pass `hydrated` (per the plan's baseline choice (b): `hydrated?: boolean` defaults to `true` in `BuildingClient`'s prop destructure, so any existing test omitting it gets the real-subtree branch — byte-identical to today). Zero existing M1–M9e BuildingClient assertion is amended.
- **`components/BlueprintBar.test.tsx`** / **`components/Timeline.test.tsx`** / **`components/LooseBricksTray.test.tsx`** — gain new `stagger`-prop cases (`C-m7a-005..008`). Existing tests omit `stagger`, which defaults to `false` → byte-identical render. Zero existing M2/M3/M5b/M4f/M6 assertion is amended.
- **`app/(building)/AppShell.test.tsx`** — the existing destructure `const [state, dispatch] = usePersistedState()` continues to work (TS two-of-three tuple); the new `hydrated` thread to `<BuildingClient>` is additive. Zero existing AppShell assertion is amended.
- **No other M0–M9e / M5b / M6 test** asserts the absence of a `motion.div` wrapper on BlueprintBar / Timeline / LooseBricksTray segments, asserts the absence of a `hydrated` prop on BuildingClient, asserts the absence of a third tuple slot on `usePersistedState`, or asserts the absence of skeleton DOM. Additive everywhere.

**VERIFIER: please ratify the `BuildingClient` `hydrated?: boolean` default-to-`true` choice (plan § Regression surface alternative (b))** as expected, sanctioned M7a collateral — exactly as M5's `TopBar` `aria-label` and M6's `TimelineBlock`/`BrickChip` Edit-Mode-affordance-set amendments were ratified. The amendment is surfaced here, not silent; it is byte-identical for every existing assertion (because no existing test passes `hydrated` explicitly).

### Spec gaps surfaced for VERIFIER

The plan resolves **all three** of the spec's named gaps in-plan (SG-m7a-01..03 — see plan.md § Resolutions to the 3 Open Spec Gaps; all three RESOLVED verbatim per the spec recommendation) and the TESTS phase covers the plan faithfully. Each SG resolution is anchored to at least one test ID:

| SG        | Resolution (per plan.md § Resolutions)                                                                                     | Anchoring test ID(s)                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| SG-m7a-01 | Piecewise `staggerForCount(n)` in `lib/motion.ts` — canonical 0.03 at n≤15, capped at max(0.02, 0.45/n) above; per-surface | `U-m7a-002`, `C-m7a-006`, `E-m7a-002`      |
| SG-m7a-02 | 3 Timeline block placeholders + 1 LooseBricksTray chip + 1 BlueprintBar segment; no skeleton after `hydrated === true`     | `C-m7a-009`, `E-m7a-001`                   |
| SG-m7a-03 | One shared `<Skeleton variant>` primitive; pure CSS keyframe shimmer; zero new asset weight                                | `C-m7a-001..004`, `A-m7a-001`, `E-m7a-005` |

No ADR is reversed: **ADR-023** (two-pass hydration: server paints, client rehydrates without mismatch) — the skeleton subtree IS the ADR-023 pass-1 window (`C-m7a-009`, `E-m7a-001`); **ADR-013 / ADR-022** (one-feature-per-dispatch) — m7a is one feature group, one BUILDER dispatch; **ADR-018** (overrides keyed map) — irrelevant for m7a (no AppState mutation; documented as inapplicable); **ADR-031** (≥44px touch targets) — no new interactive element; skeleton is `aria-hidden="true"`, non-interactive (`C-m7a-001..004` assert `aria-hidden="true"`); **ADR-043** (`assertNever` exhaustiveness) — no new `Action` union member, the existing `assertNever(action)` in the reducer's default arm is untouched; **ADR-044 / ADR-045** (`schemaVersion` discipline; `history` read-only) — m7a introduces NO `schemaVersion` bump (still `3` — `U-m7a-003` covers the persistence shape); **ADR-046** (period-aggregate helpers pure) — unaffected (m7a does no aggregation); **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only) — orthogonal; the skeleton path does not touch `currentDayBlocks`.

The following non-blocking items are surfaced for VERIFIER to confirm with one-line answers (not a re-plan):

1. **Timeline stagger wrapper — `display: contents` vs `position: absolute; inset: 0; pointer-events: none` (plan § Open questions for VERIFIER).** The plan baseline is `display: contents`; `C-m7a-007` is written against the baseline (the test asserts the wrapper does not disturb the existing absolute-positioned cards). If VERIFIER prefers the absolute-inset alternative, `C-m7a-007` is amendable (the `position: absolute; pointer-events: none` wrapper would assert pointer events still reach `SlotTapTargets` via `pointer-events: auto` on children) — but the AC #1/AC #6 assertion is identical either way; both architectures are testable. **No ADR-binding decision; VERIFIER picks freely.**
2. **`useFirstPaintAfterHydration` ref tri-state vs bi-state (plan § Open questions for VERIFIER).** The plan baseline is tri-state `"pending" | "staggered" | "done"`; `U-m7a-001` is written against the baseline (the test asserts the EXACT sequence `false → true → false → false` across four renders, which holds for both tri-state and bi-state implementations — render 3's `false` is the only point where they differ in spec, but both implementations return `false` at render 3 because the ref has already flipped past `pending` on render 2). If VERIFIER prefers the bi-state alternative, `U-m7a-001` passes unchanged. **No ADR-binding decision; VERIFIER picks freely.**

### AC → test-ID coverage map (all 10 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                                                                                                                                             | Test ID(s)                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | On first hydrated paint, BlueprintBar segments / Timeline blocks / LooseBricksTray chips each enter with `motionTokens.stagger.durationMs` per-sibling delay (30 ms), in source order                                                          | `C-m7a-006`, `C-m7a-007`, `C-m7a-008`, `E-m7a-001`, `E-m7a-002`                                                                                 |
| #2  | The stagger fires once per `BuildingClient` mount; brick-log / add-block / now-line-tick re-renders do NOT re-trigger                                                                                                                          | `U-m7a-001`, `C-m7a-010`, `E-m7a-006`                                                                                                           |
| #3  | The stagger consumes the existing `motionTokens.stagger`; M7a does not modify `lib/motion.ts` (other than the additive `staggerForCount` helper which COMPUTES off the same token)                                                             | `U-m7a-002`, `C-m7a-006`                                                                                                                        |
| #4  | Before client hydration completes, the three surfaces render `<Skeleton>` variants — outlined cards with CSS shimmer keyframe                                                                                                                  | `C-m7a-001`, `C-m7a-002`, `C-m7a-003`, `C-m7a-009`, `E-m7a-001`, `A-m7a-001`                                                                    |
| #5  | The skeleton fades out at the same instant the real cards begin staggering in; no overlap of skeleton + real card in the same row                                                                                                              | `C-m7a-009`, `E-m7a-001`                                                                                                                        |
| #6  | The skeleton DOM matches the real card's bounding box (same height, same padding) → no layout shift at swap                                                                                                                                    | `C-m7a-001`, `C-m7a-002`, `C-m7a-003`, `C-m7a-007`, `C-m7a-009`, `E-m7a-003`                                                                    |
| #7  | With `prefers-reduced-motion: reduce`, stagger collapses to instant (`duration: 0`) and shimmer collapses to a flat solid swatch — no animation                                                                                                | `C-m7a-011`, `C-m7a-012`, `A-m7a-001`, `E-m7a-004`                                                                                              |
| #8  | `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: stagger-fires-once-per-mount; reduced-motion zero animation; skeleton-to-real bounding-box parity; first-paint ref guards rest. | `U-m7a-001`, `U-m7a-002`, `U-m7a-003`, `C-m7a-007`, `C-m7a-008`, `C-m7a-009`, `C-m7a-010`, `C-m7a-011` + **gate (`npm run eval`)**              |
| #9  | E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; no CLS at hydration; cascade completes inside `N × 30 ms + 100 ms` overhead                                                                                                | `E-m7a-002`, `E-m7a-003`, `E-m7a-005`                                                                                                           |
| #10 | No regression to M1–M9e / M5b; Day view, calendar views, add/edit/delete flows behave identically                                                                                                                                              | `C-m7a-005`, `C-m7a-007`, `C-m7a-008` (all `stagger={false}` byte-identical paths) + § Retired / amended amendments + **gate (`npm run eval`)** |

**Gate-verified portion:** AC #8's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M5/M6/M8/M9a/M9b/M9c/M9d/M9e precedent. AC #10's no-regression half is anchored by the sanctioned amendments in § Retired / amended test IDs (all five surfaces are byte-identical at the existing-test level: `usePersistedState`'s two-element destructure still works, `BuildingClient` defaults `hydrated={true}` so existing tests are unchanged, the three component `stagger?` props default to `false` so existing tests are unchanged) plus `C-m7a-005`/`C-m7a-007`/`C-m7a-008` (each asserts the `stagger={false}` branch is byte-identical to today). All other 8 ACs map to at least one bespoke `m7a` test ID; every `m7a` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** Empty Day (no blocks, no loose bricks) → `C-m7a-009` (skeleton subtree on `!hydrated`, real `<EmptyBlocks>` on `hydrated`; no `<LooseBricksTray>` mounted under the `hasLooseTrayContent` gate) + `E-m7a-001`; single block → `U-m7a-002` (`staggerForCount(1) === 0.03`) + `C-m7a-006` (parameterized N=1); many blocks (10/20/30) → `U-m7a-002` (boundary table) + `C-m7a-006` (parameterized N=20) + `E-m7a-002` (parameterized N=10, 20, 30); `prefers-reduced-motion: reduce` → `C-m7a-011`, `C-m7a-012`, `A-m7a-001`, `E-m7a-004`; state update during stagger (brick logged mid-cascade) → `C-m7a-010` (the dispatch does NOT re-pass `stagger={true}` to the three surfaces; the brick-fill animation runs on its own variant — Framer's last-write-wins is documented, not tested in m7a since the brick-fill is M3's surface); server paint → `C-m7a-009` (the `!hydrated` branch IS the server paint; the SSR HTML and client first paint match byte-identical because the skeleton contains no time-of-day text) + `E-m7a-001`; second navigation (Week → Day) → `E-m7a-006`; reduced-motion + many blocks → `E-m7a-004` (forced-PRM at preview) + `C-m7a-011` (PRM mocked at component); Lighthouse / 60 fps → `E-m7a-002`, `E-m7a-005`; skeleton-to-real CLS → `C-m7a-009`, `E-m7a-003`; persistence quota error during pre-hydration → covered structurally by the unchanged M8 quota-exceeded path (no new error path for m7a; the pre-hydration window is `loadState`-only, and quota errors fire on `saveState`); `hydrated` flips spuriously back to `false` → not testable (the underlying `mounted` is monotonic-true per `usePersistedState`; `U-m7a-003` asserts post-effect `mounted === true` and a rerender does NOT flip it back); server clock skew on first paint (ADR-023) → covered structurally (the skeleton subtree contains no time-of-day text — the NowLine / BlueprintBar NOW pin / `now` chip live in the real subtree, not the skeleton; ADR-023's reconciliation is unaffected by m7a).
