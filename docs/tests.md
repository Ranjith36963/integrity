## Page 1 — Building view — Tests (empty-toolkit pivot)

### wipe-demo

#### Component (Vitest + Testing Library)

- ID: C-bld-034
  GIVEN BuildingClient mounts with no localStorage
  WHEN page renders
  THEN blocks state is `[]` and EmptyBlocks copy ("No blocks yet. Tap + to add your first block.") is visible.
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-bld-035
  GIVEN no blocks
  WHEN page renders
  THEN BlueprintBar is NOT in the DOM.
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-bld-036
  GIVEN no blocks
  WHEN page renders
  THEN NowCard is NOT in the DOM.
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-bld-037
  GIVEN no blocks
  WHEN Hero renders
  THEN AnimatedPercent target is `0`.
  Tested by: `components/Hero.test.tsx`

- ID: C-bld-038
  GIVEN Hero receives `dayNumber={undefined}`
  WHEN it renders
  THEN the "Building N of 365" line is not in the DOM.
  Tested by: `components/Hero.test.tsx`

#### E2E (Playwright)

- ID: E-bld-022
  GIVEN fresh page load
  WHEN visiting `/`
  THEN "No blocks yet. Tap + to add your first block." is visible.
  Tested by: `tests/e2e/empty.spec.ts`

- ID: E-bld-023
  GIVEN fresh page load
  WHEN visiting `/`
  THEN no `.now-glow` element exists.
  Tested by: `tests/e2e/empty.spec.ts`

- ID: E-bld-024
  GIVEN fresh page load
  WHEN visiting `/`
  THEN BottomBar Add button is visible and labeled (`aria-label="Add"`).
  Tested by: `tests/e2e/empty.spec.ts`

### live-clock

#### Unit (Vitest)

- ID: U-bld-022
  GIVEN `vi.setSystemTime(new Date("2026-04-29T11:47:00"))` and `useNow()` mounted in a test renderer
  WHEN the hook returns and `vi.advanceTimersByTime(60_000)` is called after the system time is bumped to `12:48`
  THEN the first render returns `"11:47"` and after the tick the value becomes `"12:48"`. The interval is cleared on unmount (a second advance after unmount produces no further state updates).
  Tested by: `lib/useNow.test.ts`

- ID: U-bld-023
  GIVEN a `Date` of `2026-04-29T11:47:00` (local)
  WHEN `today(d)` is called
  THEN result is the string `"2026-04-29"`. Also verify zero-padding: `today(new Date(2026, 0, 5))` returns `"2026-01-05"`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-024
  GIVEN `programStart="2026-04-01"` and `today="2026-04-29"`
  WHEN `dayNumber(programStart, today)` is computed
  THEN result is `29`. AND `dayNumber(null, "2026-04-29")` returns `undefined`; `dayNumber("", "2026-04-29")` returns `undefined`; `dayNumber("2026-04-29", "2026-04-29")` returns `1`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-025
  GIVEN `today="2026-04-29"`
  WHEN `dateLabel(today)` is called
  THEN result is `"Wed, Apr 29"` (locale fixed to `en-US`, format `weekday:"short", month:"short", day:"numeric"` per SG-bld-11). Also verify `dateLabel("2026-01-05")` returns `"Mon, Jan 5"` (no leading zero on day).
  Tested by: `lib/dharma.test.ts`

#### Component (Vitest + Testing Library)

- ID: C-bld-039
  GIVEN `vi.setSystemTime(new Date("2026-04-29T11:47:00"))` and `BuildingClient` rendered
  WHEN the page mounts
  THEN the Hero shows the live `dateLabel` `"Wed, Apr 29"` (NOT the `wipe-demo` placeholder `""`) and the BlueprintBar's NOW pin reflects `"11:47"` (NOT `"00:00"`).
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-bld-040
  GIVEN `vi.setSystemTime(new Date("2026-04-29T11:47:00"))` and `BuildingClient` rendered with the placeholder `programStart = today()`
  WHEN the Hero renders
  THEN the visible text includes `"Building 1 of 365"` (since `programStart === today` → `dayNumber === 1`). This proves the Hero's day-counter line renders when `dayNumber` is defined, and verifies the placeholder behaviour documented in the plan.
  Tested by: `app/(building)/BuildingClient.test.tsx`

#### Spec gaps

- SG-bld-11 — `dateLabel` format. Spec § "UX Spec — Phase 1 Toolkit" does not specify locale, 12h vs 24h, or weekday-comma style. **Resolution (user approved 2026-05-01):** fixed `en-US` locale, `Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })` → `"Wed, Apr 29"`. Time format already fixed at 24h `HH:MM` by `lib/data.ts` precedent and SG-bld-10. If the user later wants locale-aware labels, that's a follow-up feature; tests assert the `en-US` output today.

### Migration of demo-build IDs (started — wipe-demo pass)

After wipe-demo, these existing IDs are obsolete (delete the test files that contain them, or mark `it.skip` with a "Replaced by wipe-demo" comment):

- U-bld-016 [obsolete: BLOCKS constant gone]
- U-bld-017 [obsolete: BLOCKS constant gone]
- U-bld-018 [obsolete: BLOCKS constant gone]
- C-bld-008 / C-bld-009 / C-bld-010 / C-bld-011 [obsolete: BlueprintBar tests against demo BLOCKS]
- C-bld-012 / C-bld-013 [obsolete: NowCard tests against demo "Work block"]
- C-bld-014 / C-bld-015 / C-bld-017 / C-bld-018 [obsolete: TimelineBlock tests against demo blocks]
- E-bld-002 [obsolete: Hero=57 only true for demo fixture]
- E-bld-004..007, E-bld-014, E-bld-019 [obsolete: assert demo block content]

(Other migration tags will be added as later features land. This file is append-only across features.)

---

## Page 1 — Building view — Tests (legacy demo-build, partially superseded)

Every assertion below maps to an acceptance criterion derived from `/docs/spec.md` (UX Spec — Phase 1 Toolkit). IDs are stable; do not renumber. Suggested file paths are relative to the repo root.

### Unit (Vitest)

- ID: U-bld-001
  GIVEN a tick brick with `done: true`
  WHEN `brickPct` is computed
  THEN result is `100`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-002
  GIVEN a tick brick with `done: false`
  WHEN `brickPct` is computed
  THEN result is `0`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-003
  GIVEN a goal brick with `current=4, target=5`
  WHEN `brickPct` is computed
  THEN result is `80`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-004
  GIVEN a goal brick with `current=999, target=10`
  WHEN `brickPct` is computed
  THEN result is `100` (capped).
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-005
  GIVEN a time brick with `current=15, target=30`
  WHEN `brickPct` is computed
  THEN result is `50`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-006
  GIVEN a time brick with `current=999, target=10`
  WHEN `brickPct` is computed
  THEN result is `100` (capped).
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-007
  GIVEN a brick with `target <= 0`
  WHEN `brickPct` is computed
  THEN result is `0` (no division by zero).
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-008
  GIVEN a block with bricks `[goal 80, time 100, tick 100]`
  WHEN `blockPct` is computed
  THEN result is `(80+100+100)/3 ≈ 93.33`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-009
  GIVEN a block with `bricks: []`
  WHEN `blockPct` is computed
  THEN result is `0`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-010
  GIVEN two blocks of unequal duration with block percentages 50 and 100
  WHEN `dayPct` (Building %) is computed
  THEN result is the **equal-weighted** average `75` (NOT duration-weighted).
  Tested by: `lib/scoring.test.ts`
  Note: This is the spec-violation fix. The pre-existing `dayPct` is duration-weighted and must be corrected.

- ID: U-bld-011
  GIVEN `BLOCKS` from `lib/data.ts` (the canonical sample)
  WHEN `dayPct(BLOCKS)` is computed
  THEN result equals the equal-weighted mean of every `blockPct(b)`.
  Tested by: `lib/scoring.test.ts`

- ID: U-bld-012
  GIVEN `dayPct([])`
  WHEN evaluated
  THEN result is `0` (no division by zero).
  Tested by: `lib/scoring.test.ts`

- ID: U-bld-013
  GIVEN `toMin("11:47")`
  WHEN evaluated
  THEN result is `707` (11\*60 + 47).
  Tested by: `lib/dharma.test.ts` (already covered)

- ID: U-bld-014
  GIVEN a block `{start:"22:00", end:"04:00"}`
  WHEN `duration` is computed
  THEN result is `360` (handles midnight wrap).
  Tested by: `lib/dharma.test.ts` (already covered)

- ID: U-bld-015
  GIVEN `dayOffset("03:59")` with day anchored at 04:00
  WHEN evaluated
  THEN result is `1439` (last minute before next anchor).
  Tested by: `lib/dharma.test.ts` (already covered)

- ID: U-bld-016
  GIVEN `BLOCKS` and `NOW = "11:47"`
  WHEN `currentBlockIndex(BLOCKS, "11:47")` is computed
  THEN result is the index of the block whose `[start,end)` contains 11:47 ("Work block", index 9).
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-017
  GIVEN `NOW = "11:47"` and the same `BLOCKS`
  WHEN `nowOffsetPct` is computed
  THEN result is `(dayOffset("11:47") / sum(duration)) * 100` and lies strictly between 0 and 100.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-018
  GIVEN `BLOCKS` and `NOW = "11:47"`
  WHEN `blockStatus(BLOCKS, "11:47", i)` is called for `i` < / = / > current index
  THEN it returns `"past"` / `"current"` / `"future"` respectively.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-019
  GIVEN a tick brick `done=true`
  WHEN `brickLabel` is called
  THEN result is `"done"`; for `done=false` result is `"—"`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-020
  GIVEN a goal brick `current=4, target=5, unit="reps"`
  WHEN `brickLabel` is called
  THEN result is `"4/5 reps"`.
  Tested by: `lib/dharma.test.ts`

- ID: U-bld-021
  GIVEN a time brick `current=30, target=45`
  WHEN `brickLabel` is called
  THEN result is `"30/45 min"`.
  Tested by: `lib/dharma.test.ts`

### Component (Vitest + Testing Library)

- ID: C-bld-001
  GIVEN `<TopBar />` rendered inside `EditModeProvider`
  WHEN the Edit pencil button is clicked
  THEN provider state flips and the button's `aria-pressed` becomes `"true"`.
  Tested by: `components/TopBar.test.tsx`

- ID: C-bld-002
  GIVEN `<TopBar />`
  WHEN initially rendered
  THEN it shows the text "DHARMA", an Edit button (`aria-label="Edit"`), and a Settings button (`aria-label="Settings"`).
  Tested by: `components/TopBar.test.tsx`

- ID: C-bld-003
  GIVEN `<TopBar />`
  WHEN the buttons' bounding boxes are measured
  THEN both Edit and Settings buttons are at least 44 × 44 CSS pixels.
  Tested by: `components/TopBar.test.tsx`

- ID: C-bld-004
  GIVEN `<Hero dateLabel="Wed, Apr 29" dayNumber={119} totalDays={365} pct={62} />`
  WHEN rendered
  THEN it shows "Wed, Apr 29", "Building 119 of 365", and "DAY COMPLETE" caption.
  Tested by: `components/Hero.test.tsx`

- ID: C-bld-005
  GIVEN `<AnimatedPercent value={62} />` mounted with default `durationMs=1600`
  WHEN raf time advances 1600ms
  THEN the rendered text monotonically increases from `0` to `62` and final value is `62`.
  Tested by: `components/AnimatedPercent.test.tsx`

- ID: C-bld-006
  GIVEN `<AnimatedPercent value={62} />` and `prefers-reduced-motion: reduce`
  WHEN mounted
  THEN the rendered text is `62` on the first paint after raf (no count-up).
  Tested by: `components/AnimatedPercent.test.tsx`
  Note: mock `window.matchMedia` to return `matches: true`.

- ID: C-bld-007
  GIVEN `<AnimatedPercent value={50} durationMs={1000} />`
  WHEN evaluated at `t = 500ms` against the cubic ease-out `1 - (1 - p)^3`
  THEN displayed value equals `Math.round(50 * (1 - (1 - 0.5)^3))` = `Math.round(50 * 0.875)` = `44`.
  Tested by: `components/AnimatedPercent.test.tsx`

- ID: C-bld-008
  GIVEN `<BlueprintBar blocks={BLOCKS} now="11:47" />`
  WHEN rendered
  THEN it renders exactly `BLOCKS.length` segments and each segment's inline `width` percentage equals `duration(b) / total * 100`.
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-bld-009
  GIVEN the same render
  WHEN segments are inspected
  THEN each segment's gradient base color matches `CATEGORY_COLOR[block.category]`.
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-bld-010
  GIVEN the same render
  WHEN the NOW pin is inspected
  THEN it is positioned at `left: nowOffsetPct(BLOCKS, "11:47")%`, has white background, and exposes `aria-label="Now 11:47"` (or equivalent).
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-bld-011
  GIVEN the same render
  WHEN the legend is inspected
  THEN four chips appear with labels HEALTH, MIND, CAREER, PASSIVE in that order, each with the matching token color swatch.
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-bld-012
  GIVEN `<NowCard block={BLOCKS[currentBlockIndex(BLOCKS,"11:47")]} />`
  WHEN rendered
  THEN it shows the "NOW" pill, the block name, the time range "08:45–17:15", category label "PASSIVE", and a `%` numeral that equals `Math.round(blockPct(block))`.
  Tested by: `components/NowCard.test.tsx`

- ID: C-bld-013
  GIVEN `<NowCard …>`
  WHEN inspecting CSS classes
  THEN the outer container has class `now-glow` and the indicator has classes `dot-pulse` and `ring-ping`.
  Tested by: `components/NowCard.test.tsx`

- ID: C-bld-014
  GIVEN `<Timeline blocks={BLOCKS} now="11:47" />`
  WHEN rendered
  THEN it renders exactly `BLOCKS.length` `[data-testid="timeline-block"]` elements in source order.
  Tested by: `components/Timeline.test.tsx`

- ID: C-bld-015
  GIVEN the same render
  WHEN block statuses are inspected
  THEN blocks at index < current have `data-status="past"`, at index === current have `data-status="current"`, at index > current have `data-status="future"`.
  Tested by: `components/Timeline.test.tsx`

- ID: C-bld-016
  GIVEN `<Timeline blocks={[]} now="11:47" />`
  WHEN rendered
  THEN the empty state copy "No blocks yet. Tap + to add your first block." is visible and no `[data-testid="timeline-block"]` exists.
  Tested by: `components/Timeline.test.tsx`

- ID: C-bld-017
  GIVEN `<TimelineBlock block={fitness} status="current" />`
  WHEN rendered
  THEN it shows start time `06:00`, end time `07:00`, the block name, the category dot in `--health` color, and the `%` numeral equal to `Math.round(blockPct(fitness))`.
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-bld-018
  GIVEN `<TimelineBlock status="past" …>`
  WHEN rendered
  THEN the wrapper has `opacity: 0.55` (or equivalent class) so past blocks visibly recede.
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-bld-019
  GIVEN `<TimelineBlock block={emptyBlock} …>` where `emptyBlock.bricks = []`
  WHEN rendered
  THEN the empty-state copy "No bricks yet. Tap + to add a brick." is visible.
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-bld-020
  GIVEN `<Scaffold pct={50} category="health" height={48} />`
  WHEN raf advances past the 80ms mount delay
  THEN the inner `.scaffold__fill` has `height: 50%`.
  Tested by: `components/Scaffold.test.tsx`

- ID: C-bld-021
  GIVEN `<Scaffold pct={75} category="health" />`
  WHEN rendered
  THEN the wrapper has `aria-label="75 percent"` (i.e. `Math.round(pct)` followed by `" percent"`).
  Tested by: `components/Scaffold.test.tsx`

- ID: C-bld-022
  GIVEN a tick brick with `done: false`
  WHEN `<Brick brick={…} category="health" />` is rendered in view mode
  THEN it has class `brick--empty`.
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-023
  GIVEN a goal brick with `current: 80, target: 100`
  WHEN rendered
  THEN it has class `brick--partial` (0 < pct < 100).
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-024
  GIVEN a tick brick with `done: true`
  WHEN rendered
  THEN it has neither `brick--empty` nor `brick--partial`, i.e. full state.
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-025
  GIVEN a tick brick with `done: false` in **view mode**
  WHEN the user clicks the brick
  THEN `onLog` is called with `{ kind: "tick", done: true }` (toggle).
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-026
  GIVEN a goal brick with `current: 4, target: 5` in **view mode**
  WHEN the user clicks the brick
  THEN a stepper appears with current value `4`; clicking `+` calls `onLog` with `{ ...brick, current: 5 }`.
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-027
  GIVEN a brick rendered in **edit mode**
  WHEN inspecting the DOM
  THEN an `×` button with `aria-label="Delete brick"` is present and clicking the brick body itself does **not** call `onLog`.
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-028
  GIVEN `<TimelineBlock>` rendered in **edit mode**
  WHEN inspecting the DOM
  THEN an `×` button with `aria-label="Delete block"` is present.
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-bld-029
  GIVEN `<BottomBar />`
  WHEN rendered
  THEN there is a primary button containing the text "Voice Log" with the amber-gradient background and a secondary `+` button with `aria-label="Add"`.
  Tested by: `components/BottomBar.test.tsx`

- ID: C-bld-030
  GIVEN `<BottomBar />`
  WHEN buttons are measured
  THEN both buttons are at least 44 × 44 CSS px.
  Tested by: `components/BottomBar.test.tsx`

- ID: C-bld-031
  GIVEN bricks rendered in `<NowCard>` and `<TimelineBlock>`
  WHEN they are inspected
  THEN each interactive brick element has `role="button"` (or is a `<button>`) and accessible name matching the brick label.
  Tested by: `components/Brick.test.tsx`

- ID: C-bld-032
  GIVEN a Hero rendered with `pct=0`
  WHEN rendered
  THEN the AnimatedPercent ends at `0`, never goes negative, and the text "DAY COMPLETE" remains visible.
  Tested by: `components/Hero.test.tsx`

- ID: C-bld-033
  GIVEN a Hero rendered with `pct=100`
  WHEN rendered after the count-up completes
  THEN the visible numeral is `100`.
  Tested by: `components/Hero.test.tsx`

### E2E (Playwright)

All E2E tests run on `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 14) per `playwright.config.ts`. Base URL is `http://localhost:3000`.

- ID: E-bld-001
  GIVEN the app is loaded at `/`
  WHEN the page settles
  THEN the DHARMA logo, the date "Wed, Apr 29", and "Building 119 of 365" are visible.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-002
  GIVEN the page is loaded
  WHEN ~1700 ms have elapsed (count-up complete)
  THEN the Hero `%` numeral equals `Math.round(dayPct(BLOCKS))` from the spec-correct equal-weighted scoring.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-003
  GIVEN the page is loaded
  WHEN the Hero numeral is sampled at t≈100ms and t≈1700ms
  THEN the t≈100ms value is strictly less than t≈1700ms (proves count-up animates).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-004
  GIVEN the page is loaded
  WHEN the BlueprintBar is inspected
  THEN it contains exactly 16 segments (matching `BLOCKS.length`) and the NOW pin's `left` style is between 32% and 33% (`nowOffsetPct(BLOCKS,"11:47") ≈ 32.43`).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-005
  GIVEN the page is loaded
  WHEN the NowCard is inspected
  THEN it contains the text "NOW", the name "Work block", the range "08:45–17:15", and the category label "PASSIVE".
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-006
  GIVEN the page is loaded
  WHEN the timeline is inspected
  THEN exactly 16 timeline blocks are rendered in this order: Wake ritual, Meditation, Job apps, Fitness, Cold shower, Prayer, Breakfast, Walk to bus, Commute, Work block, Commute home, Building AI, Face wash, Journal, Meditation, Sleep.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-007
  GIVEN the timeline is rendered
  WHEN block statuses are inspected via `data-status`
  THEN indices 0-8 are `past`, index 9 is `current`, indices 10-15 are `future`.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-008
  GIVEN the page is loaded in view mode (default)
  WHEN the user taps the "lunch" tick brick (currently `done:false`) inside the Work block
  THEN the brick visually fills (no longer `brick--empty`), the Work block `%` increases, and the Hero `%` increases.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-009
  GIVEN the user has tapped "lunch" once
  WHEN the user taps "lunch" again
  THEN the brick returns to empty styling and the Work block `%` decreases.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-010
  GIVEN the page is loaded
  WHEN the user taps a goal brick (e.g. "follow-ups 4/5") in view mode
  THEN a +/- stepper appears anchored to the brick.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-011
  GIVEN the stepper is open on "follow-ups 4/5"
  WHEN the user taps `+`
  THEN the brick label updates to "follow-ups 5/5", the stepper auto-commits or stays open, and the block `%` updates live.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-012
  GIVEN the page is loaded
  WHEN the user taps the Edit pencil in the TopBar
  THEN every `[data-testid="timeline-block"]` reveals an `×` button (`aria-label="Delete block"`) and every brick reveals an `×` button (`aria-label="Delete brick"`).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-013
  GIVEN edit mode is on
  WHEN the user taps the Edit pencil again
  THEN edit affordances disappear and tapping a brick once more triggers the view-mode log behaviour (proves toggle works both ways).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-014
  GIVEN edit mode is on
  WHEN the user taps a brick body (not the × icon)
  THEN no log mutation occurs (block `%` stays the same).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-015
  GIVEN the page is loaded
  WHEN the BottomBar is inspected
  THEN a Voice Log button is visible at the bottom of the viewport with the amber gradient background, and a `+` Add button is to its right.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-016
  GIVEN the BottomBar is on screen
  WHEN the page is scrolled
  THEN the BottomBar remains pinned to the viewport bottom (fixed position).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-017
  GIVEN the page is loaded at viewport width 430 px
  WHEN the body width is sampled
  THEN no horizontal scroll exists (`document.documentElement.scrollWidth <= clientWidth`) and main content max-width does not exceed 430 px.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-018
  GIVEN the page is loaded
  WHEN every interactive element (buttons, bricks) is measured
  THEN each has a bounding box ≥ 44 × 44 CSS pixels.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-019
  GIVEN the browser context is set to `prefers-reduced-motion: reduce`
  WHEN the page loads
  THEN the Hero `%` settles to its final value within 100 ms (no count-up perceptible) and the NOW glow does not animate (computed `animation-name` is `none`).
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-020
  GIVEN the page is loaded
  WHEN the browser console is observed during load + first interaction
  THEN there are zero console errors.
  Tested by: `tests/e2e/building.spec.ts`

- ID: E-bld-021
  GIVEN a stubbed empty data fixture (e.g. via test-only build flag or a `?empty=1` query param — flag in spec gaps)
  WHEN the page loads
  THEN "No blocks yet. Tap + to add your first block." is visible and BlueprintBar / NowCard are not rendered.
  Tested by: `tests/e2e/building.spec.ts`
  Note: depends on resolution of Spec gap SG-bld-04.

### Accessibility (axe via Playwright)

- ID: A-bld-001
  GIVEN the page is loaded at `/`
  WHEN axe runs against the full page
  THEN there are zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/building.a11y.spec.ts`

- ID: A-bld-002
  GIVEN the page is loaded
  WHEN every `<button>` is enumerated
  THEN each has a non-empty accessible name (`aria-label` or text content).
  Tested by: `tests/e2e/building.a11y.spec.ts`

- ID: A-bld-003
  GIVEN the page is loaded
  WHEN axe color-contrast rule is run on text elements (`--ink`, `--ink-dim`, `--ink-faint` against `--bg` / `--card`)
  THEN no violations are reported.
  Tested by: `tests/e2e/building.a11y.spec.ts`

- ID: A-bld-004
  GIVEN the page has loaded
  WHEN focus order is traversed via Tab
  THEN focus moves through: Edit, Settings, (interactive bricks in document order), Voice Log, Add — with a visible focus ring at every stop.
  Tested by: `tests/e2e/building.a11y.spec.ts`

- ID: A-bld-005
  GIVEN edit mode is on
  WHEN axe runs again
  THEN there are zero new violations introduced by the `×` affordances.
  Tested by: `tests/e2e/building.a11y.spec.ts`

### Spec gaps — resolved

User approved all 10 gaps as proposed by the planner on 2026-04-29. Builder must implement the **Resolution** for each.

- SG-bld-01 — Edit-mode `×` icon affordance.
  **Resolution:** `×` is always visible in edit mode (no swipe gesture in Page 1 scope).
- SG-bld-02 — Time-brick logging UX in view mode.
  **Resolution:** `+/-` stepper for Phase 1 — same component as Goal. No real timer.
- SG-bld-03 — NOW pin position semantics.
  **Resolution:** half-open `[start, end)` intervals (matches current `currentBlockIndex`).
- SG-bld-04 — Empty-state E2E reachability.
  **Resolution:** **drop E-bld-021**; rely on `C-bld-016` for empty-blocks coverage. Builder must mark E-bld-021 as `// dropped per SG-bld-04` in any e2e file rather than implementing it.
- SG-bld-05 — Top bar Settings button.
  **Resolution:** stays a no-op for Page 1. Render the icon button; do not wire a handler.
- SG-bld-06 — Voice Log button.
  **Resolution:** stays a no-op for Page 1 (parse behavior is Phase 1.5).
- SG-bld-07 — Hero `%` rounding.
  **Resolution:** `Math.round` to integer. Never shows decimals.
- SG-bld-08 — Equal-weight `dayPct`.
  **Resolution:** **fix** `lib/dharma.ts::dayPct` to a simple mean of `blockPct`. The Hero number changes (~26% → ~57%) — this is intentional, not a regression. Update `lib/dharma.test.ts` to match.
- SG-bld-09 — Brick stagger fade-in scope.
  **Resolution:** stagger applies **only to bricks**, using the existing `brick-in` class with `index * 35ms` delay. Do not stagger blocks/cards/sections.
- SG-bld-10 — Date label format.
  **Resolution:** keep the existing literal `Wed, Apr 29` from `lib/data.ts::TODAY_LABEL`.
