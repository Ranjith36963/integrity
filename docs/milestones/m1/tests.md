## Milestone 1 — Empty Building Shell — Tests

> Every ID below traces to `plan.md` § "Milestone 1 — Empty Building Shell — Plan". The `Proves:` line names the plan section the test verifies, so EVALUATOR's spec-coverage check is mechanical.
> ID series start fresh from `001` per layer (`U-m1-*`, `C-m1-*`, `E-m1-*`, `A-m1-*`). Pre-M1 IDs (pre-pivot `*-bld-*`, `*-m0-*`) continue to live above; M1 does not delete or renumber them.
> Per the migration table at plan.md § "Migration table for prior-pivot tests", existing component test files for `[obsolete: not-imported-in-M1]` components (`TimelineBlock.test.tsx`, `Brick.test.tsx`, `Scaffold.test.tsx`) stay disabled or skipped; their IDs remain in this file but are not re-asserted by M1 tests.

### Unit (Vitest)

- ID: U-m1-001
  Layer: Unit
  Proves: plan.md § File structure — `lib/dayOfYear.ts` (Jan 1 boundary)
  GIVEN `dayOfYear(d: Date)` from `lib/dayOfYear.ts`
  WHEN called with `new Date(2026, 0, 1)` (January 1, 2026, local time)
  THEN it returns exactly `1` (number, not string).
  Tested by: `lib/dayOfYear.test.ts`

- ID: U-m1-002
  Layer: Unit
  Proves: plan.md § Edge cases — Leap year for `dayNumber`
  GIVEN `dayOfYear` from `lib/dayOfYear.ts`
  WHEN called with `new Date(2028, 1, 29)` (February 29, 2028, leap year)
  THEN it returns exactly `60`.
  AND when called with `new Date(2028, 2, 1)` (March 1, 2028, leap year), it returns exactly `61`.
  AND when called with `new Date(2026, 2, 1)` (March 1, 2026, non-leap), it returns exactly `60`.
  Tested by: `lib/dayOfYear.test.ts`

- ID: U-m1-003
  Layer: Unit
  Proves: plan.md § Edge cases — Leap year for `dayNumber` (Dec 31 boundary)
  GIVEN `dayOfYear` from `lib/dayOfYear.ts`
  WHEN called with `new Date(2026, 11, 31)` (December 31, 2026, non-leap)
  THEN it returns exactly `365`.
  AND when called with `new Date(2028, 11, 31)` (December 31, 2028, leap), it returns exactly `366`.
  Tested by: `lib/dayOfYear.test.ts`

- ID: U-m1-004
  Layer: Unit
  Proves: plan.md § Data model — `totalDays = daysInYear(new Date())`
  GIVEN `daysInYear(d: Date)` from `lib/dayOfYear.ts`
  WHEN called with any date in 2026
  THEN it returns exactly `365`.
  AND when called with any date in 2028 (leap year), it returns exactly `366`.
  AND when called with any date in 2100 (NOT a leap year — divisible by 100 but not 400), it returns exactly `365`.
  AND when called with any date in 2000 (leap year — divisible by 400), it returns exactly `366`.
  Tested by: `lib/dayOfYear.test.ts`

- ID: U-m1-005
  Layer: Unit
  Proves: plan.md § File structure — `lib/timeOffset.ts:timeToOffsetPx` (00:00 boundary)
  GIVEN `timeToOffsetPx(hhmm: string, hourHeightPx: number)` from `lib/timeOffset.ts`
  WHEN called with `("00:00", 64)`
  THEN it returns exactly `0`.
  Tested by: `lib/timeOffset.test.ts`

- ID: U-m1-006
  Layer: Unit
  Proves: plan.md § File structure — `lib/timeOffset.ts:timeToOffsetPx` (midpoint)
  GIVEN `timeToOffsetPx` from `lib/timeOffset.ts`
  WHEN called with `("12:00", 64)`
  THEN it returns exactly `768` (i.e., `12 * 64`).
  Tested by: `lib/timeOffset.test.ts`

- ID: U-m1-007
  Layer: Unit
  Proves: plan.md § Edge cases — Now-line at the very top (00:00) or bottom (23:59)
  GIVEN `timeToOffsetPx` from `lib/timeOffset.ts`
  WHEN called with `("23:59", 64)`
  THEN it returns a number in the open range `(1534, 1536)` (specifically `23 * 64 + (59/60) * 64 = 1472 + 62.933 ≈ 1534.933`), and the value is strictly less than `24 * 64` (1536).
  Tested by: `lib/timeOffset.test.ts`

- ID: U-m1-008
  Layer: Unit
  Proves: plan.md § File structure — `lib/timeOffset.ts:timeToOffsetPx` (clamps out-of-range)
  GIVEN `timeToOffsetPx` from `lib/timeOffset.ts`
  WHEN called with `("-01:00", 64)` or any string parsed as a negative offset
  THEN it returns `0` (clamped to lower bound, never negative).
  AND when called with `("24:00", 64)` or `("25:30", 64)`, it returns exactly `24 * 64 = 1536` (clamped to upper bound).
  Tested by: `lib/timeOffset.test.ts`

- ID: U-m1-009
  Layer: Unit
  Proves: plan.md § File structure — `lib/timeOffset.ts:clampOffsetPx`
  GIVEN `clampOffsetPx(offsetPx: number, hourHeightPx: number)` from `lib/timeOffset.ts`
  WHEN called with `(-50, 64)` it returns `0`.
  AND when called with `(2000, 64)` it returns `1536` (`24 * 64`).
  AND when called with `(800, 64)` (in-range) it returns `800` unchanged.
  Tested by: `lib/timeOffset.test.ts`

- ID: U-m1-010
  Layer: Unit
  Proves: plan.md § Components — Decisions captured: "Hour-height constant ... must be a single shared constant, not duplicated per file"
  GIVEN `lib/timeOffset.ts` exports `HOUR_HEIGHT_PX` as a `const`
  WHEN imported in a unit test
  THEN `HOUR_HEIGHT_PX` is exactly `64` (number type).
  AND grepping the source tree (Timeline.tsx, NowLine.tsx) for the literal `64` finds zero hardcoded duplicates of the hour-height value (all sites import `HOUR_HEIGHT_PX` from `lib/timeOffset.ts`).
  Tested by: `lib/timeOffset.test.ts` (constant value) + `lib/timeOffset.singleSource.test.ts` (grep-based source-tree assertion)

- ID: U-m1-011
  Layer: Unit
  Proves: plan.md § Edge cases — `now` skew on first paint (defensive parse)
  GIVEN `timeToOffsetPx` from `lib/timeOffset.ts`
  WHEN called with an empty string `("", 64)` or an unparseable string `("abc", 64)`
  THEN it returns `0` (does not throw, does not return `NaN`).
  AND when called with `("12:00", 64)` after a malformed call, it still returns `768` (no internal state corruption).
  Tested by: `lib/timeOffset.test.ts`

### Component (Vitest + Testing Library)

- ID: C-m1-001
  Layer: Component
  Proves: plan.md § Components — Top bar (DHARMA wordmark + Edit + Settings) — covers SPEC AC #1
  GIVEN `<TopBar />` rendered standalone inside `<EditModeProvider>`
  WHEN inspected
  THEN the rendered DOM contains: a "DHARMA" wordmark text node, an amber-tinted logo tile (computed `background-color` references `--accent` `#fbbf24`), an Edit-toggle `<button>`, and a Settings `<button>` — all three interactive elements present in the same `<header>` landmark.
  Tested by: `components/TopBar.test.tsx`

- ID: C-m1-002
  Layer: Component
  Proves: plan.md § Components — Top bar (Edit pencil `aria-pressed`) — covers SPEC AC #2 + SG-m1-05
  GIVEN `<TopBar />` rendered inside `<EditModeProvider>` (default state)
  WHEN the Edit toggle button is queried by role "button" with name matching /edit/i
  THEN it has attribute `aria-pressed="false"` initially.
  AND the button does NOT have `role="switch"` (per ADR-028, TopBar uses toggle-button semantics, not switch).
  AND clicking it does not throw (visible state change is M5's job).
  Tested by: `components/TopBar.test.tsx`

- ID: C-m1-003
  Layer: Component
  Proves: plan.md § Components — Top bar (Settings) — covers SPEC AC #3 + SG-m1-06
  GIVEN `<TopBar />` rendered
  WHEN the Settings button is queried
  THEN it has `aria-label="Settings"`, is a `<button>` element (keyboard-focusable), renders a gear-shaped lucide-react icon (`Settings` icon), has bounding box ≥44×44 px, and clicking it does not throw.
  Tested by: `components/TopBar.test.tsx`

- ID: C-m1-004
  Layer: Component
  Proves: plan.md § Components — Hero (re-author: drop count-up) — covers SPEC AC #6 + AC #7 + SG-m1-08
  GIVEN `<Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />` rendered with `vi.useFakeTimers()`
  WHEN the DOM is inspected synchronously on first paint (before any `vi.advanceTimersByTime` call)
  THEN the text `"0%"` is visible immediately (text node present).
  AND the Hero does NOT render an `<AnimatedPercent>` element (no `[data-component="animated-percent"]` or whatever marker the AnimatedPercent component carries).
  AND the percent-bearing element's computed `font-family` resolves to a value referencing `--font-display` (Instrument Serif Italic).
  AND no `requestAnimationFrame` tween fires during a 2-second simulated tick (count-up explicitly absent).
  Tested by: `components/Hero.test.tsx`

- ID: C-m1-005
  Layer: Component
  Proves: plan.md § Components — Hero (date label) — covers SPEC AC #4
  GIVEN `<Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />`
  WHEN rendered
  THEN the rendered DOM contains a text node matching `"Wed, May 6"` (the dateLabel value passed in, verbatim — note SG-m1-01: SPEC's `·` middle-dot example is illustrative, the helper currently outputs comma-separated form).
  Tested by: `components/Hero.test.tsx`

- ID: C-m1-006
  Layer: Component
  Proves: plan.md § Components — Hero (Building N of 365|366) — covers SPEC AC #5
  GIVEN `<Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />`
  WHEN rendered
  THEN the DOM contains the text `"Building 126 of 365"`.
  AND when rendered with `dayNumber={60} totalDays={366}`, the DOM contains the text `"Building 60 of 366"` (leap-year case).
  Tested by: `components/Hero.test.tsx`

- ID: C-m1-007
  Layer: Component
  Proves: plan.md § Components — BlueprintBar (empty-outline path, zero-total guard) — covers SPEC AC #8 + SG-m1-02
  GIVEN `<BlueprintBar blocks={[]} now="12:00" />` rendered standalone
  WHEN the rendered DOM is inspected
  THEN the section element is present with `aria-label="Day blueprint"`.
  AND the container has the height-36 / `--card-edge` border classes (outlined container).
  AND zero `[data-testid="blueprint-segment"]` elements are rendered (no category segments).
  AND a faint-grid background pattern is applied (computed `background-image` is non-empty OR a `[data-testid="blueprint-grid"]` element is rendered with three vertical hairlines).
  AND the legend section (Health/Mind/Career/Passive) is NOT in the DOM.
  AND no element renders the literal string `NaN`, `Infinity`, or empty `%` value (defends against zero-total division-by-zero).
  AND no console error is logged during render.
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-m1-008
  Layer: Component
  Proves: plan.md § Components — BlueprintBar (NOW pin fallback) — covers plan's empty-array NOW pin fallback
  GIVEN `<BlueprintBar blocks={[]} now="12:00" />` rendered
  WHEN the NOW pin element (`[data-testid="now-pin"]`) is queried
  THEN it is present in the DOM.
  AND its inline `style.left` (or computed left) resolves to `50%` (since `12:00` is the midpoint of a 24-hour day: `(720 / 1440) * 100 = 50`).
  AND when re-rendered with `now="06:00"`, the NOW pin's `left` resolves to `25%`.
  AND no `NaN%` or `Infinity%` is present.
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-m1-009
  Layer: Component
  Proves: plan.md § Components — Schedule timeline (24-hour vertical column) — covers SPEC AC #9
  GIVEN `<Timeline blocks={[]} now="08:00" />` rendered standalone
  WHEN inspected
  THEN exactly 24 `[data-testid="hour-label"]` elements are in the DOM, with text content `"00:00"`, `"01:00"`, …, `"23:00"` in document order.
  AND each label's computed `font-family` references `--font-ui` (JetBrains Mono).
  AND each label's computed `color` references `--ink-dim` (`rgba(245,241,232,.5)`).
  AND a single `[data-testid="hour-grid"]` container element wraps the 24 hour rows.
  Tested by: `components/Timeline.test.tsx`

- ID: C-m1-010
  Layer: Component
  Proves: plan.md § Components — NowLine (pixel position) — covers SPEC AC #10
  GIVEN `<Timeline blocks={[]} now="08:00" />` rendered with `HOUR_HEIGHT_PX = 64`
  WHEN the NowLine element (`[data-testid="now-line"]`) is queried
  THEN it is present in the DOM, has computed `background-color` referencing `--accent`, and its inline-style `top` (or computed `top`) equals `512px` (i.e., `8 * 64`, the pixel offset of `08:00`).
  AND when rendered with `now="00:00"`, `top` equals `0px`.
  AND when rendered with `now="23:59"`, `top` is in the open range `(1534, 1536)` — exact value is `23*64 + (59/60)*64 ≈ 1534.933` (R1-NIT-2: superseded earlier "[1535, 1536)" doc value with the correct math).
  Tested by: `components/NowLine.test.tsx` + `components/Timeline.test.tsx`

- ID: C-m1-011
  Layer: Component
  Proves: plan.md § Edge cases — Auto-scroll-to-now on mount (SSR-safe) — covers SPEC AC #12
  GIVEN `<Timeline blocks={[]} now="12:00" />` mounted with a stub `scrollContainer.scrollTop` setter and `vi.spyOn(window, 'scrollTo')`
  WHEN the component renders for the first time
  THEN during the synchronous render phase, `scrollContainer.scrollTop` is NOT mutated (no scroll write during render).
  AND after `useEffect` fires (post-paint), `scrollContainer.scrollTop` is set exactly once to `Math.max(0, 12*64 - viewportHeight/2)` (centers the now-line).
  AND on a subsequent re-render with the same `now` value, the effect does not fire again (auto-scroll runs once on mount only).
  Tested by: `components/Timeline.test.tsx`

- ID: C-m1-012
  Layer: Component
  Proves: plan.md § Edge cases — Now-line tracks `useNow()` 60s tick — covers SPEC AC #11
  GIVEN `<Timeline />` rendered with `useNow` mocked via `vi.mock('@/lib/useNow')` returning a controlled value, starting at `"08:00"`
  WHEN the mocked `useNow` value is updated to `"08:01"` and `vi.advanceTimersByTime(60_000)` runs
  THEN the NowLine's `top` re-renders from `512px` to `8 * 64 + (1/60)*64 ≈ 513.067px` (within 0.1px tolerance).
  AND the re-render happens within 60s of the simulated clock advance.
  Tested by: `components/Timeline.test.tsx` + `components/NowLine.test.tsx`

- ID: C-m1-013
  Layer: Component
  Proves: plan.md § Edge cases — Reduced-motion: NowLine snap (no transition) — covers SPEC AC #24
  GIVEN `<NowLine now="12:00" />` rendered with `usePrefersReducedMotion()` mocked to `true`
  WHEN the computed style of the NowLine element is read
  THEN `transition` resolves to `none` or `0s` for `top`/`transform` properties.
  AND when re-rendered with `now="13:00"`, no `transitionend` event fires (the position snaps).
  AND the same assertion holds when `usePrefersReducedMotion()` returns `false` (NowLine never animates `top` per plan.md decision; reduced-motion is a no-op for this element).
  Tested by: `components/NowLine.test.tsx`

- ID: C-m1-014
  Layer: Component
  Proves: plan.md § Components — Empty-state card (locked SPEC copy) — covers SPEC AC #15
  GIVEN `<Timeline blocks={[]} now="12:00" />` (which renders `<EmptyBlocks>` internally)
  WHEN the empty-state card is queried
  THEN it contains the verbatim text `"Tap any slot to lay your first block."` (period included, no extra punctuation).
  AND it is rendered using the M0 `<EmptyState>` primitive (carries `[data-component="empty-state"]` or equivalent marker class from `@/components/ui`).
  AND it is positioned inside the timeline column (the schedule region), not anchored to the page background.
  Tested by: `components/EmptyBlocks.test.tsx` + `components/Timeline.test.tsx`

- ID: C-m1-015
  Layer: Component
  Proves: plan.md § Edge cases — Reduced-motion: EmptyState pulse collapsed — covers SPEC AC #16
  GIVEN `<EmptyBlocks />` rendered with `usePrefersReducedMotion()` mocked to `true`
  WHEN the rendered card root's computed style is read
  THEN `animation-name` resolves to `none` (or no `pulse` class is applied).
  AND when `usePrefersReducedMotion()` returns `false`, the pulse animation IS applied (sanity check).
  Tested by: `components/EmptyBlocks.test.tsx`

- ID: C-m1-016
  Layer: Component
  Proves: plan.md § Components — Floating dock (Voice disabled) — covers SPEC AC #17 + SG-m1-04
  GIVEN `<BottomBar />` rendered standalone
  WHEN the Voice button is queried
  THEN it is a `<button>` element (NOT a `<div>`) with `aria-disabled="true"`.
  AND it does NOT have the native HTML `disabled` attribute (must remain focusable for SR users).
  AND its `aria-label` is `"Voice Log (coming in a later release)"` (or per SG-m1-04 resolution at Gate #1).
  AND its computed `opacity` is `0.5` (visibly disabled).
  AND clicking it does not throw and does not invoke any handler.
  AND it remains keyboard-focusable (`tabIndex` is 0 or absent, not `-1`).
  Tested by: `components/BottomBar.test.tsx`

- ID: C-m1-017
  Layer: Component
  Proves: plan.md § Components — Floating dock (`+` button no-op) — covers SPEC AC #19
  GIVEN `<BottomBar />` rendered standalone
  WHEN the `+` button is queried (by `aria-label="Add"`)
  THEN it is a `<button>` element, has `aria-label="Add"`, is enabled (no `aria-disabled`, no `disabled` attribute), opacity is `1`, bounding box is ≥44×44 px.
  AND clicking it does not throw and does not open any sheet/modal (no `[role="dialog"]` enters the DOM).
  Tested by: `components/BottomBar.test.tsx`

- ID: C-m1-018
  Layer: Component
  Proves: plan.md § Components — Floating dock (safe-area inset) — covers SPEC AC #18
  GIVEN `<BottomBar />` rendered standalone
  WHEN the dock's outer wrapper inline `style.paddingBottom` is read
  THEN it is the literal string `"calc(20px + var(--safe-bottom))"` (or equivalent that references `var(--safe-bottom)`).
  AND the wrapper does NOT use Tailwind's `pb-5` alone (the safe-area inset must be present in the computed padding chain).
  Tested by: `components/BottomBar.test.tsx`

- ID: C-m1-019
  Layer: Component
  Proves: plan.md § Components — Page composition (NowCard NOT in DOM) — covers SPEC AC #13
  GIVEN `<BuildingClient />` mounted with `blocks: []` (default `AppState`)
  WHEN the rendered DOM is queried for the NowCard component (`[data-component="now-card"]` or any element rendered by `NowCard.tsx`)
  THEN the result is empty (NowCard is not rendered, not imported, not in the DOM).
  AND a static analysis of the imports in `app/(building)/BuildingClient.tsx` confirms `NowCard` is not imported (verified via `grep -L "NowCard" app/(building)/BuildingClient.tsx`, captured by the test or its harness).
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-m1-020
  Layer: Component
  Proves: plan.md § Components — Page composition (no block cards / brick chips) — covers SPEC AC #14
  GIVEN `<BuildingClient />` mounted with `blocks: []`
  WHEN the rendered DOM is queried
  THEN zero `[data-component="timeline-block"]` elements are present.
  AND zero `[data-component="brick-chip"]` (or `<Brick>`-rendered) elements are present.
  AND zero `[data-component="block-card"]` elements are present.
  AND the only content inside the timeline column is the hour-grid, the NowLine, and the EmptyBlocks card.
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-m1-021
  Layer: Component
  Proves: plan.md § Components — BlueprintBar always renders in M1 (unconditional, even with empty blocks) — covers SPEC AC #8
  GIVEN `<BuildingClient />` mounted with `blocks: []`
  WHEN the rendered DOM is queried for `[aria-label="Day blueprint"]`
  THEN exactly one element matches (BlueprintBar is rendered unconditionally — no `blocks.length > 0` short-circuit).
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-m1-022
  Layer: Component
  Proves: plan.md § Components — Page composition (dropped imports clean) — covers cross-cutting concern: dead-code lint
  GIVEN the imports of `app/(building)/BuildingClient.tsx`
  WHEN parsed (via the TypeScript program API or a string-grep regression test)
  THEN `NowCard`, `TimelineBlock`, `Brick`, `BrickStepper`, `Scaffold`, `EmptyBricks` are NOT among the imports.
  AND no `currentBlockIndex` or `dayPct` import exists if those values are not consumed in the render output.
  AND `npm run lint` against this file produces zero `@typescript-eslint/no-unused-vars` warnings (asserted indirectly by the EVAL-phase lint gate; this ID flags the constraint for BUILDER).
  Tested by: `app/(building)/BuildingClient.imports.test.ts`

### E2E (Playwright)

> All M1 e2e run on `mobile-chrome` (Pixel 7) at 430×900 viewport unless otherwise stated. Base URL `http://localhost:3000`. Route under test: `/`.

- ID: E-m1-001
  Layer: E2E
  Proves: plan.md § Components — Page composition (first-paint render) — covers SPEC AC #25
  GIVEN the dev server is running and `addInitScript` overrides `Date.now` to return a fixed timestamp corresponding to `"08:30"` local time
  WHEN visiting `/` at viewport 430×900
  THEN the page responds 200 and on first paint (no interaction) all of the following are visible: a `<header>` containing "DHARMA" wordmark + Edit button + Settings button; a hero region containing a date string + "Building N of 365" (or 366) + "0%"; a Day Blueprint bar (`[aria-label="Day blueprint"]`); a 24-hour timeline (`[data-testid="hour-grid"]`); the now-line (`[data-testid="now-line"]`); the empty-state card with text `"Tap any slot to lay your first block."`; a floating dock with both Voice and `+` buttons.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-002
  Layer: E2E
  Proves: plan.md § Edge cases — Auto-scroll-to-now on mount — covers SPEC AC #12
  GIVEN `addInitScript` fixes the clock at `"15:00"` and the page is loaded at viewport 430×900
  WHEN the page reaches `networkidle`
  THEN the timeline scroll container's `scrollTop` is non-zero, and the NowLine element's bounding box `top` is within the visible viewport (between `0` and `viewport.height`).
  AND the NowLine is approximately vertically centered in the viewport (within ±100px of viewport mid-height).
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-003
  Layer: E2E
  Proves: plan.md § Edge cases — Reduced-motion honored — covers SPEC AC #24
  GIVEN the browser context is created with `emulateMedia({ reducedMotion: 'reduce' })`
  WHEN visiting `/`
  THEN the empty-state card's computed `animation-name` resolves to `none`.
  AND the NowLine element has no `transition` on `top`/`transform`.
  AND the Hero's `0%` numeral is present synchronously on first paint with no count-up animation.
  AND no element on the page has a non-zero `transition-duration` greater than 50ms.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-004
  Layer: E2E
  Proves: plan.md § Components — Page composition (NowCard NOT rendered) — covers SPEC AC #13
  GIVEN `/` is loaded
  WHEN the page is queried for any element matching `[data-component="now-card"]` (or whatever marker NowCard.tsx renders)
  THEN the result count is exactly `0`.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-005
  Layer: E2E
  Proves: plan.md § Components — Page composition (no block cards / brick chips) — covers SPEC AC #14
  GIVEN `/` is loaded
  WHEN the page is queried for `[data-component="timeline-block"]`, `[data-component="block-card"]`, and `[data-component="brick-chip"]`
  THEN each query returns zero elements.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-006
  Layer: E2E
  Proves: plan.md § Edge cases — No horizontal overflow at 430px — covers SPEC AC #20
  GIVEN viewport 430×900 and `/` is loaded
  WHEN the body's computed `scrollWidth` and `clientWidth` are read
  THEN `scrollWidth <= clientWidth` (no horizontal overflow).
  AND every direct child of `<body>` has bounding-box `right <= 430`.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-007
  Layer: E2E
  Proves: plan.md § Edge cases — Safe-area insets (iOS notch + home indicator) — covers SPEC AC #18
  GIVEN viewport 430×900 with iOS-13 device emulation (notch + home indicator) and `--safe-bottom` resolved to `34px` (typical home-indicator inset) via injected CSS variable override
  WHEN the floating-dock outer wrapper's computed `padding-bottom` is read
  THEN it is at least `54px` (`20px + 34px`), proving `env(safe-area-inset-bottom)` is composed into the padding chain.
  AND the dock's bounding-box `bottom` is at least `34px` above viewport `bottom` (does not clip behind the home indicator).
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-008
  Layer: E2E
  Proves: plan.md § Edge cases — Viewport height < 600px — covers SPEC AC #20
  GIVEN viewport 430×500 (tight height)
  WHEN `/` is loaded
  THEN no horizontal overflow (`body.scrollWidth <= body.clientWidth`).
  AND the timeline `[data-testid="hour-grid"]` is still rendered and is scrollable (the container has `scrollHeight > clientHeight` and `overflow-y` resolves to `auto` or `scroll`).
  AND the floating dock is still bottom-anchored and not occluded by the timeline.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-009
  Layer: E2E
  Proves: plan.md § Components — Day Blueprint bar visible (empty outline) — covers SPEC AC #8
  GIVEN `/` is loaded
  WHEN the BlueprintBar element (`[aria-label="Day blueprint"]`) is queried
  THEN it is visible, has `border` referencing `--card-edge`, contains zero `[data-testid="blueprint-segment"]` children, and renders a `[data-testid="now-pin"]` element at the time-correct horizontal position (computed `left` percentage equals `(currentMinutes / 1440) * 100`, within ±0.5%).
  AND no NaN / Infinity strings appear anywhere in the BlueprintBar's text content.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-010
  Layer: E2E
  Proves: plan.md § Components — Hero (date + dayNumber + 0%) — covers SPEC AC #4–7
  GIVEN `addInitScript` fixes `Date.now` to `2026-05-06T08:30:00` local time
  WHEN `/` is loaded
  THEN the hero region contains a date label matching `/Wed, May 6/` (or `/Wed · May 6/` if SG-m1-01 resolves to middle-dot).
  AND the hero contains the literal text `"Building 126 of 365"` (May 6 is day 126 of 2026).
  AND the hero contains the literal text `"0%"`.
  AND the `0%` element's computed `font-family` resolves to a value referencing `--font-display` (Instrument Serif).
  AND on a wait of 2 seconds, the percent value remains `"0%"` (no count-up).
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-011
  Layer: E2E
  Proves: plan.md § Components — Schedule timeline (24 hour labels + now-line) — covers SPEC AC #9 + #10
  GIVEN `addInitScript` fixes the clock at `"08:00"` and `/` is loaded
  WHEN the page is queried for `[data-testid="hour-label"]`
  THEN exactly 24 elements match, with text `"00:00"`, `"01:00"`, …, `"23:00"` in document order.
  AND `[data-testid="now-line"]` is visible, with computed `background-color` matching `#fbbf24` (`--accent`) (or the resolved RGB form thereof).
  AND the now-line's computed `top` is within ±2px of `512px` (the pixel offset of `08:00` at `HOUR_HEIGHT_PX = 64`).
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-012
  Layer: E2E
  Proves: plan.md § Components — Floating dock (Voice disabled + `+` enabled, both inert) — covers SPEC AC #17 + #19
  GIVEN `/` is loaded
  WHEN the Voice button is clicked AND the `+` button is clicked
  THEN no error is thrown, no `[role="dialog"]` is added to the DOM, no console error logs.
  AND the Voice button has `aria-disabled="true"`, computed `opacity` of `0.5`, accessible name including "Voice".
  AND the `+` button has `aria-label="Add"`, computed `opacity` of `1`, no `aria-disabled`.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-013
  Layer: E2E
  Proves: plan.md § Edge cases — No console errors / no unhandled rejections — covers cross-cutting concern (BlueprintBar zero-total guard, auto-scroll SSR safety)
  GIVEN `/` is loaded with the browser console captured from the very first navigation
  WHEN the page reaches `networkidle` and no interaction has occurred
  THEN the captured console error count is `0`.
  AND the captured unhandled-promise-rejection count is `0`.
  AND specifically, no `Cannot read properties of … (reading 'scrollTop')` SSR-style errors appear.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-014
  Layer: E2E
  Proves: plan.md § Components — HOUR_HEIGHT_PX single source of truth (alignment) — covers cross-cutting concern
  GIVEN `addInitScript` fixes the clock at `"06:00"` and `/` is loaded
  WHEN the bounding-box `top` of the NowLine and the bounding-box `top` of the `[data-testid="hour-label"]` with text `"06:00"` are measured
  THEN the difference between the two `top` values is within ±2 px (now-line lands exactly on the 06:00 grid line, proving NowLine's pixel math and the hour-grid CSS share the same `HOUR_HEIGHT_PX` constant).
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-015
  Layer: E2E
  Proves: plan.md § Components — Empty-state card vs NowLine z-index — covers cross-cutting concern
  GIVEN `addInitScript` fixes the clock such that the now-line falls inside the empty-state card's bounding box and `/` is loaded
  WHEN the NowLine and EmptyState card are both inspected
  THEN the NowLine is visible (not occluded by the EmptyState card) — verified by `page.locator('[data-testid="now-line"]').isVisible()` returning `true` AND a Playwright screenshot showing the amber line crossing the card OR the NowLine's computed `z-index` exceeding the card's.
  Tested by: `tests/e2e/m1.spec.ts`

- ID: E-m1-016
  Layer: E2E
  Proves: plan.md § Components — Top bar safe-area inset (top) — covers SPEC AC #20 + § Edge cases — Safe-area insets
  GIVEN viewport 430×900 with iOS notch emulation and `--safe-top` resolved to `47px` (typical notch inset) via injected CSS variable override
  WHEN the TopBar's bounding-box `top` is read
  THEN it is at least `47px` (does not clip behind the notch).
  Tested by: `tests/e2e/m1.spec.ts`

### Accessibility (axe via Playwright)

- ID: A-m1-001
  Layer: A11y
  Proves: plan.md § Components — Page composition (axe-clean) — covers SPEC AC #21
  GIVEN `/` is loaded at viewport 430×900
  WHEN `@axe-core/playwright` runs against the full page
  THEN there are zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-002
  Layer: A11y
  Proves: plan.md § Design tokens — token-driven contrast — covers SPEC AC #21
  GIVEN `/` is loaded
  WHEN axe is configured with only the `color-contrast` rule
  THEN there are zero violations across the hour labels (`--ink-dim` on `--bg`), hero text (`--ink` on `--bg`), DHARMA wordmark, and EmptyBlocks copy.
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-003
  Layer: A11y
  Proves: plan.md § Components — Top bar a11y (Edit `aria-pressed`, Settings `aria-label`) — covers SPEC AC #2 + #3
  GIVEN `/` is loaded
  WHEN the TopBar's Edit button and Settings button are queried via `getByRole("button", { name: ... })`
  THEN the Edit button has `aria-pressed="false"` and a non-empty accessible name matching /edit/i.
  AND the Settings button has `aria-label="Settings"` and a non-empty accessible name "Settings".
  AND neither button uses `role="switch"` (per ADR-028 reservation, M1 keeps toggle-button semantics on TopBar).
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-004
  Layer: A11y
  Proves: plan.md § Components — Floating dock a11y (Voice `aria-disabled`) — covers SPEC AC #17
  GIVEN `/` is loaded
  WHEN the Voice button is queried by role "button" with name matching /voice/i
  THEN it has `aria-disabled="true"`, has a non-empty accessible name including "Voice", does NOT have the native `disabled` attribute, and is keyboard-focusable (reachable via `Tab`).
  AND the `+` button has `aria-label="Add"`, no `aria-disabled`, and is reachable via `Tab`.
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-005
  Layer: A11y
  Proves: plan.md § Components — Page composition (focus order) — covers SPEC AC #21
  GIVEN `/` is loaded
  WHEN `Tab` is pressed repeatedly from the document start
  THEN the focused-element sequence reaches every interactive element in document order: Edit button → Settings button → `+` button → Voice button (or the order specified by source layout).
  AND every focused element shows a visible focus ring (computed `outline-style !== "none"` OR `box-shadow` contains a focus-ring token).
  AND no element is reached twice in a single tab pass; no element is skipped that should be focusable.
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-006
  Layer: A11y
  Proves: plan.md § Components — NowLine + BlueprintBar landmarks — covers SPEC AC #21
  GIVEN `/` is loaded
  WHEN the NowLine is queried
  THEN it has `role="img"` and an `aria-label` matching `/^Now \d{2}:\d{2}$/`.
  AND the BlueprintBar section has `aria-label="Day blueprint"`.
  AND the empty-state card carries an accessible name containing "Tap any slot to lay your first block.".
  Tested by: `tests/e2e/m1.a11y.spec.ts`

- ID: A-m1-007
  Layer: A11y
  Proves: plan.md § Components — Hero typecheck/lint cleanliness — covers SPEC AC #22 + #23
  GIVEN the EVAL phase runs `npm run typecheck` and `npm run lint` on the M1 diff
  WHEN those commands exit
  THEN both exit with code `0` (zero TypeScript errors, zero ESLint warnings).
  AND no `eslint-disable-next-line` comment is added to the M1 diff EXCEPT where plan.md § "Decisions captured" explicitly justifies one (e.g., `components/Timeline.tsx` auto-scroll-on-mount must run only once and is documented to disable `react-hooks/exhaustive-deps`).
  Tested by: `npm run eval` (composite gate) — this ID exists to make the SPEC AC #22 + #23 lint/typecheck contract auditable from `tests.md`; no separate test file authored.

### Spec gaps

- **SG-m1-01 — `dateLabel` punctuation.** SPEC § Outputs row "Hero" gives the example "Wed · May 6" (middle-dot separator). The existing `lib/dharma.ts:dateLabel` helper outputs `"Wed, Apr 29"` (comma separator). Recommendation: treat SPEC's "e.g.," as illustrative and keep the comma. Decision deferred to user at Gate #1. Tests above (C-m1-005, E-m1-010) accept either format.
- **SG-m1-02 — BlueprintBar's "faint grid" rendering technique.** Two implementations (CSS `linear-gradient` vs inline SVG `<line>`s). Plan locks to (a) gradient. Test C-m1-007 asserts EITHER a non-empty `background-image` OR a `[data-testid="blueprint-grid"]` SVG element, accepting either implementation.
- **SG-m1-03 — Hour-grid CSS gradient mobile rendering.** If gradient antialiases poorly on mobile WebKit, BUILDER falls back to 24 absolutely-positioned `<div>` hairlines. Plan locks gradient default. No M1 test ID asserts the implementation choice; visual quality is captured at Gate #2 (preview gate).
- **SG-m1-04 — Voice button "visibly disabled" copy.** Plan locks to `aria-label="Voice Log (coming in a later release)"`. C-m1-016 and A-m1-004 assert the literal label; if Gate #1 picks a different copy, those IDs need an amend.
- **SG-m1-05 — `aria-pressed` vs `aria-checked` on the Edit toggle (TopBar).** No conflict with ADR-028. Plan locks to `aria-pressed`. C-m1-002 and A-m1-003 assert `aria-pressed="false"` and explicitly that `role="switch"` is NOT used.
- **SG-m1-06 — Settings icon choice.** Lucide-react `Settings` icon (gear). C-m1-003 asserts the icon is rendered; visual identity check at Gate #2.
- **SG-m1-07 — `dayNumber` semantics in M1 vs M8.** Locked: M1 uses `dayOfYear(new Date())`. C-m1-006 and E-m1-010 assert "Building N of 365|366" with the day-of-year computation. M8 PLANNER must reverse this.
- **SG-m1-08 — Hero `pct={0}` mount behavior.** C-m1-004 asserts the rendered `0%` is synchronous on first paint with no count-up. E-m1-010 asserts `0%` remains `0%` after a 2-second wait.
- **SG-m1-09 (new — surfaced during test derivation) — `timeToOffsetPx` defensive parsing of malformed input.** SPEC and plan do not specify what `timeToOffsetPx("")` or `timeToOffsetPx("abc")` should return. Plan implies "clamp to range"; tests U-m1-008 and U-m1-011 assert it returns `0` for unparseable input (defensive default, mirrors plan.md's "guard with `now ? … : noop`" SSR safety note in § Edge cases). If BUILDER prefers throwing, that is a Gate #1 decision and these IDs need amend.
- **SG-m1-10 (new — surfaced during test derivation) — Now-line z-index vs EmptyState card.** Plan calls out "now-line must be visible above the empty-state card" but does not specify the z-index strategy (numeric value, stacking context, etc.). E-m1-015 asserts visibility/stacking observationally without locking the implementation. If reduced-motion or scroll behavior creates an edge case where the line is occluded, BUILDER must fix at the implementation layer; tests already catch the regression.

---
