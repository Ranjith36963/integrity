## Pre-M0 Test Migration (94 IDs from the 8-feature pivot)

> The 94 test IDs from the previous empty-toolkit pivot are tagged below.
> [survives] = test stays valid as-is. [re-author] = same intent, new selectors/assertions for M0 tokens/components. [obsolete] = behaviour M0 doesn't ship; delete the test.
> Translated from `plan.md` § "Migration plan for the 94 pre-pivot test IDs". M0 itself does not delete or rewrite any of these tests; tagging is for M1+ planning.

| ID range       | Tag                                                                 | Reason                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-bld-001..009 | [survives]                                                          | Pure scoring helpers (`brickPct`, `blockPct`, `dayPct`, `currentBlockIndex`, `formatTime`) in `lib/dharma.ts` / `lib/scoring.ts`. M0 leaves them untouched.                                                             |
| U-bld-010..016 | [survives]                                                          | Type / data-shape assertions on `lib/types.ts` / `lib/data.ts`. The `defaultState()` shape from wipe-demo still satisfies them.                                                                                         |
| U-bld-017..019 | [re-author: brick label semantics moved to `<BrickChip>` primitive] | `brickLabel()` assertions shift to the M0 `<BrickChip>` aria-label rendering per ADR-016. Helper may stay; assertion target shifts in M1+.                                                                              |
| U-bld-020..021 | [survives]                                                          | Date helpers (`today`, `dayNumber`, `dateLabel`) from `live-clock`. Untouched in M0.                                                                                                                                    |
| U-bld-022..025 | [survives]                                                          | `useNow` SSR-safety, midnight-rollover, DST. Untouched in M0.                                                                                                                                                           |
| C-bld-001..010 | [re-author: token names changed (`--bg` is now `#07090f`)]          | TopBar / Hero / BlueprintBar component tests that hard-code `#0a1628` or `bg-[--bg]` assertions. Structural intent survives; expected values shift. M1 dispatch owns the re-author.                                     |
| C-bld-011..025 | [survives]                                                          | NowCard / Timeline / TimelineBlock / Brick / Scaffold tests asserting structural behaviour (data-testids, aria-labels, status states). M0 does not touch these components.                                              |
| C-bld-026..033 | [survives]                                                          | BottomBar, EmptyBlocks, EmptyBricks, AnimatedPercent. Untouched in M0.                                                                                                                                                  |
| C-bld-034..038 | [survives]                                                          | Wipe-demo component assertions (Hero hides "Building N of 365" when dayNumber undefined; Timeline empty-state copy). Untouched.                                                                                         |
| C-bld-039..040 | [survives]                                                          | Live-clock component tests (Hero renders "Building 1 of 365" when programStart === today; BlueprintBar consumes live now). Untouched.                                                                                   |
| E-bld-001..021 | [survives] (deferred audit for any pixel-comparison on `#0a1628`)   | Pre-pivot e2e assert text/visibility, not pixel colors — survives as-is. Any future screenshot-compare against the old bg flagged for M1 re-author.                                                                     |
| E-bld-022..024 | [survives]                                                          | Wipe-demo e2e (page renders empty state, Hero shows 0%, no hardcoded blocks visible). Untouched.                                                                                                                        |
| A-bld-001..005 | [re-author: ink-dim contrast re-verified on new `#07090f` bg]       | ADR-011 changes `--ink-dim` from `#94a3b8` to `rgba(245,241,232,.5)`. axe runs at runtime so "0 violations" assertions survive structurally; underlying ratios shift. M0's `tests/e2e/design.a11y.spec.ts` re-verifies. |

Prior obsolete tags from the wipe-demo / live-clock dispatches (U-bld-016/017/018, C-bld-008..018, E-bld-002, E-bld-004..007, E-bld-014, E-bld-019) listed under "Migration of demo-build IDs" below are unchanged by M0.

---

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

---

## Milestone 0 — Design System — Tests

> Every ID below traces to `plan.md` § "Milestone 0 — Design System — Plan". The `Proves:` line names the plan section the test verifies, so EVALUATOR's spec-coverage check is mechanical.
> ID series start fresh from `001` per layer (`U-m0-*`, `C-m0-*`, `E-m0-*`, `A-m0-*`). Pre-pivot `*-bld-*` IDs continue to live above; M0 does not delete or renumber them (see migration table at top of file).

### Unit (Vitest)

- ID: U-m0-001
  GIVEN the parsed CSS output of `app/globals.css` (read with `fs.readFileSync` in the test)
  WHEN the `:root { … }` block is extracted
  THEN it declares `--bg: #07090f`, `--bg-elev: #0c1018`, `--ink: #f5f1e8`, `--ink-dim: rgba(245,241,232,.5)`, `--accent: #fbbf24`, `--accent-deep: #d97706`, `--cat-health: #34d399`, `--cat-mind: #c4b5fd`, `--cat-career: #fbbf24`, `--cat-passive: #64748b` — exact values, exact spelling.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Colors

- ID: U-m0-002
  GIVEN the same parsed `:root` block
  WHEN the typography vars are extracted
  THEN it declares `--font-display: var(--font-instrument-serif)`, `--font-ui: var(--font-jetbrains-mono)`, `--font-body: var(--font-geist-sans)`, and the full type scale `--fs-10: 0.625rem`, `--fs-12: 0.75rem`, `--fs-14: 0.875rem`, `--fs-16: 1rem`, `--fs-22: 1.375rem`, `--fs-32: 2rem`, `--fs-64: 4rem`.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Typography

- ID: U-m0-003
  GIVEN the same parsed `:root` block
  WHEN the spacing vars are extracted
  THEN it declares `--sp-4: 4px`, `--sp-8: 8px`, `--sp-12: 12px`, `--sp-16: 16px`, `--sp-24: 24px`, `--sp-32: 32px`, `--sp-48: 48px`.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Spacing

- ID: U-m0-004
  GIVEN the same parsed `:root` block
  WHEN the motion + safe-area vars are extracted
  THEN it declares `--motion-tap`, `--motion-brick-fill`, `--motion-bloom`, `--motion-modal-in`, `--motion-modal-out`, `--motion-flip`, `--motion-long-press`, `--motion-stagger`, `--safe-bottom: env(safe-area-inset-bottom)`, `--safe-top: env(safe-area-inset-top)`. Each motion var contains a duration token (`100ms`/`220ms`/`360ms`/`600ms`/`180ms`/`30ms`) matching plan.md.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Motion + Safe area

- ID: U-m0-005
  GIVEN `getMotion(token, reduced=false)` from `lib/motion.ts`
  WHEN called with each documented `Duration` (`"tap" | "brickFill" | "modalIn" | "modalOut" | "longPress" | "stagger"`)
  THEN it returns `{ durationMs, easing }` whose `durationMs` matches the table in plan.md (100/600/spring/220/180/30) and whose `easing` is one of `"easeOut" | "easeInOut" | "spring" | "linear"`.
  Tested by: `lib/motion.test.ts`
  Proves: plan.md § Data model — `Duration`/`Easing`/`MotionToken` and § Design tokens — Motion

- ID: U-m0-006
  GIVEN `getMotion(token, reduced=true)` from `lib/motion.ts`
  WHEN called with any `Duration`
  THEN every returned `durationMs` is `0` and spring tokens collapse to a hard-cut sentinel (`easing === "linear"` with `durationMs === 0`); stagger delay is `0`.
  Tested by: `lib/motion.test.ts`
  Proves: plan.md § Design tokens — "Reduced-motion collapse rule" + Edge case 1

- ID: U-m0-007
  GIVEN `lib/haptics.ts` and a stub where `navigator.vibrate` is `vi.fn()`
  WHEN `haptics.light()`, `haptics.medium()`, `haptics.success()`, `haptics.notification()` are each invoked
  THEN `navigator.vibrate` is called once per invocation with patterns `[10]`, `[20]`, `[15,30,15]`, `[20,40,20,40,20]` respectively.
  Tested by: `lib/haptics.test.ts`
  Proves: plan.md § Design tokens — Haptics table

- ID: U-m0-008
  GIVEN `lib/haptics.ts` and an environment where `(navigator as any).vibrate` is `undefined`
  WHEN `haptics.light()` (and each of the other three) is invoked
  THEN no error is thrown, the function returns `undefined`, and no global side effect occurs (silent no-op).
  Tested by: `lib/haptics.test.ts`
  Proves: plan.md § Edge case 8 — Haptics on iOS PWA

- ID: U-m0-009
  GIVEN `lib/haptics.ts` exports a `HapticEvent` union/enum
  WHEN typechecked
  THEN it admits exactly `"light" | "medium" | "success" | "notification"` and rejects any other string literal.
  Tested by: `lib/haptics.test.ts` (uses `expectTypeOf`)
  Proves: plan.md § Data model — `HapticEvent`

- ID: U-m0-010
  GIVEN `usePrefersReducedMotion()` from `lib/reducedMotion.ts` rendered in a component that captures the returned value
  WHEN `window.matchMedia` is mocked to return `{ matches: true, addEventListener, removeEventListener }`
  THEN the hook returns `true`. With `matches: false` it returns `false`.
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` + Edge case 1

- ID: U-m0-011
  GIVEN `usePrefersReducedMotion()` rendered server-side (no `window`)
  WHEN the initial value is read
  THEN the hook returns `false` without throwing (SSR-safe initial value per plan.md).
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` (SSR-safe)

- ID: U-m0-012
  GIVEN a mounted `usePrefersReducedMotion()` consumer
  WHEN the mocked `MediaQueryList` fires `change` with `matches: true`
  THEN the hook re-renders with `true`. On unmount, `removeEventListener("change", …)` is called exactly once with the same handler that was registered.
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` (change listener + cleanup)

### Component (Vitest + Testing Library)

- ID: C-m0-001
  GIVEN `<Button>Tap</Button>` with no props
  WHEN rendered
  THEN it renders a `<button>` element with the primary+md variant classes (matches `buttonVariants({ variant: "primary", size: "md" })` token-class snapshot from plan.md), text "Tap", `min-w-[44px]`, and `h-11`.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` (defaults + cva contract)

- ID: C-m0-002
  GIVEN `<Button variant={v} size={s}>` rendered for every (variant, size) pair in `{primary, secondary, ghost} × {sm, md, lg}`
  WHEN each instance is inspected
  THEN class lists differ across variants (no two render the same class string) and size class height tokens map `sm→h-9`, `md→h-11`, `lg→h-12`.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` (variant matrix)

- ID: C-m0-003
  GIVEN `<Button loading>Tap</Button>`
  WHEN rendered
  THEN children "Tap" are not visible as accessible text, an inline spinner element is in the DOM (e.g. `[data-loading="true"]` or an SVG with `aria-hidden`), the button retains height ≥44px, and `aria-busy="true"` is set.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` loading state

- ID: C-m0-004
  GIVEN `<Button disabled onClick={spy}>Tap</Button>`
  WHEN the user clicks it
  THEN `spy` is not called and the rendered element has `disabled` attribute; `disabled:pointer-events-none disabled:opacity-50` classes are present.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` disabled state

- ID: C-m0-005
  GIVEN `<Modal open onClose={spy} title="Hi">body</Modal>` rendered into a portal
  WHEN the backdrop is clicked AND when ESC is pressed
  THEN `spy` is called once each. When `open={false}`, the dialog node is not in the DOM.
  Tested by: `components/ui/Modal.test.tsx`
  Proves: plan.md § Components — `<Modal>` (close affordances + open prop)

- ID: C-m0-006
  GIVEN `<Modal open>` rendered at viewport ≤430px (jsdom matchMedia stub)
  WHEN computed style of the sheet root is read
  THEN `padding-bottom` resolves to a value referencing `var(--safe-bottom)` (or matches the computed `env(safe-area-inset-bottom)` substitution).
  Tested by: `components/ui/Modal.test.tsx`
  Proves: plan.md § Edge case 6 — Modal/Sheet on iOS Safari

- ID: C-m0-007
  GIVEN `<Sheet open onClose={spy} title="Hi">body</Sheet>`
  WHEN backdrop click and ESC are dispatched
  THEN `spy` is called once each. Sheet root has `data-variant="full"` (or equivalent class) and the same `padding-bottom: var(--safe-bottom)` rule applies.
  Tested by: `components/ui/Sheet.test.tsx`
  Proves: plan.md § Components — `<Sheet>` (close affordances + safe area)

- ID: C-m0-008
  GIVEN `<Chip tone={t} selected={s} size={z}>` rendered for every `(tone, selected, size)` matrix combo (`tone ∈ {neutral, category-health, category-mind, category-career, category-passive}`, `selected ∈ {true,false}`, `size ∈ {sm,md}`)
  WHEN inspected
  THEN selected variants show filled bg classes (referencing `--cat-*` or `--accent`); unselected show outlined classes; `size="sm"` instances have a wrapper enforcing `min-w-[44px] min-h-[44px]` on the hit area even though the visible chip is smaller.
  Tested by: `components/ui/Chip.test.tsx`
  Proves: plan.md § Components — `<Chip>` + Edge case 2 (44px hit area)

- ID: C-m0-009
  GIVEN `<Input id="x" type="number" value="3" onChange={spy} label="Reps" />`
  WHEN rendered and inspected
  THEN a `<label htmlFor="x">Reps</label>` is present, the `<input>` has `inputMode="numeric"`, height ≥44px, and `aria-invalid="false"`.
  Tested by: `components/ui/Input.test.tsx`
  Proves: plan.md § Components — `<Input>` (numeric variant + label wiring)

- ID: C-m0-010
  GIVEN `<Input id="x" type="text" value="" onChange={()=>{}} label="X" error="Required" />`
  WHEN inspected
  THEN the error text "Required" is in the DOM, `aria-invalid="true"`, the input is `aria-describedby` the error element's id, and the error element's color references `--accent-deep`.
  Tested by: `components/ui/Input.test.tsx`
  Proves: plan.md § Components — `<Input>` error state

- ID: C-m0-011
  GIVEN `<Stepper value={5} min={0} max={10} onChange={spy} />`
  WHEN the user clicks `+` once and `−` once
  THEN `spy` is called with `6` then `4`; clicking `+` while `value === max` does not call `spy`; clicking `−` while `value === min` does not call `spy`.
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Components — `<Stepper>` (bounds)

- ID: C-m0-012
  GIVEN `<Stepper value={0} max={1000} onChange={spy} />` with `vi.useFakeTimers()`
  WHEN the user pointer-presses `+` and holds for 3000ms simulated, then releases
  THEN `spy` is called multiple times, the per-tick interval shortens over the first 1500ms (acceleration ramp 1×→10×), and the maximum simulated rate caps at 10× the base rate (no spy call interval shorter than `baseInterval/10`).
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Edge case 5 — Long-press accelerator (caps at 10×)

- ID: C-m0-013
  GIVEN `<Stepper value={5} onChange={spy} />` and a spy on `haptics.light` from `lib/haptics`
  WHEN the user clicks `+`
  THEN `haptics.light` was invoked exactly once for the commit.
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Components — `<Stepper>` (haptic light on each commit)

- ID: C-m0-014
  GIVEN `<Toggle pressed={false} onPressedChange={spy} label="Edit mode" />`
  WHEN the user clicks it
  THEN `spy` is called with `true`. The button has `aria-pressed="false"` initially, role `"switch"` (or `<button aria-pressed>`), accessible name "Edit mode", and the bounding box is ≥44×44 px.
  Tested by: `components/ui/Toggle.test.tsx`
  Proves: plan.md § Components — `<Toggle>` (a11y wiring + 44px)

- ID: C-m0-015
  GIVEN `<EmptyState message="Nothing yet" actionLabel="Add" onAction={spy} />`
  WHEN rendered
  THEN "Nothing yet" is visible, a ghost-variant button with text "Add" is in the DOM, clicking it calls `spy` once.
  Tested by: `components/ui/EmptyState.test.tsx`
  Proves: plan.md § Components — `<EmptyState>` (CTA wiring)

- ID: C-m0-016
  GIVEN `<EmptyState message="X" pulse />` and `usePrefersReducedMotion()` mocked to `true`
  WHEN rendered
  THEN the pulse animation class is absent (or `animation-name: none` is applied) on the card root.
  Tested by: `components/ui/EmptyState.test.tsx`
  Proves: plan.md § Edge case 1 — reduced-motion collapses EmptyState pulse

- ID: C-m0-017
  GIVEN `<BlockCard name="Work" start="08:45" end="17:15" category="passive" status="current" pct={42} />`
  WHEN rendered
  THEN the name "Work", time range "08:45–17:15" (or "08:45-17:15"), the category dot styled with `--cat-passive`, and a numeric/visual representation of `pct=42` are visible. Status `"current"` adds a glow class (e.g. `now-glow` or `data-status="current"`).
  Tested by: `components/ui/BlockCard.test.tsx`
  Proves: plan.md § Components — `<BlockCard>` (status + pct rendering)

- ID: C-m0-018
  GIVEN `<BlockCard … editMode onDelete={spy} />`
  WHEN rendered
  THEN a `×` button with `aria-label="Delete block"` is present; clicking it calls `spy` once and clicking the card body itself does NOT call any onClick handler.
  Tested by: `components/ui/BlockCard.test.tsx`
  Proves: plan.md § Components — `<BlockCard>` (editMode `×` per ADR-008)

- ID: C-m0-019
  GIVEN `<BrickChip kind="tick" name="lunch" done={false} onToggle={spy} />`
  WHEN the user clicks it
  THEN `spy` is called once. Accessible name includes "lunch". Visual state is "empty" (no filled class). Bounding box ≥44×44 px.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` tick variant

- ID: C-m0-020
  GIVEN `<BrickChip kind="goal" name="follow-ups" current={4} target={5} unit="reps" onCommit={spy} />`
  WHEN rendered, then the user opens the inline stepper popover and clicks `+`
  THEN `spy` is called with `5`. The accessible label includes "4/5 reps" before the click and "5/5 reps" after.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` goal variant + ADR-016 aria-label

- ID: C-m0-021
  GIVEN `<BrickChip kind="time" name="meditate" accumulatedSec={900} targetSec={1800} running={false} onToggle={spy} />`
  WHEN rendered
  THEN the visual ring/fill represents 50% (asserted via `aria-valuenow="50"` or computed style on the fill element); accessible label includes "15/30 min" (per phase1plan brick label semantics, allowed precision-rounded).
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` time variant

- ID: C-m0-022
  GIVEN `<BrickChip kind="tick" … editMode onDelete={spy} />`
  WHEN rendered
  THEN a `×` button with `aria-label="Delete brick"` is present; clicking the chip body does NOT invoke `onToggle`.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — shared `editMode`/`onDelete` (ADR-008)

- ID: C-m0-023
  GIVEN `components/ui/index.ts`
  WHEN imported
  THEN it re-exports exactly: `Button`, `Modal`, `Sheet`, `Chip`, `Input`, `Stepper`, `Toggle`, `EmptyState`, `BlockCard`, `BrickChip` (and their associated `*Variants` cva functions where applicable). No extras.
  Tested by: `components/ui/index.test.ts`
  Proves: plan.md § File structure — `components/ui/index.ts` barrel

### E2E (Playwright)

> All M0 e2e run on `mobile-chrome` (Pixel 7) only per ADR-010 (mobile-safari disabled in this sandbox). Base URL `http://localhost:3000`. Harness route: `/_design`.

- ID: E-m0-001
  GIVEN the dev server is running
  WHEN visiting `/_design`
  THEN the page responds 200, `[data-testid="design-harness"]` is in the DOM, and the visible content max-width is ≤430 CSS px.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § File structure — `app/_design/page.tsx` + Edge case 2

- ID: E-m0-002
  GIVEN `/_design` is loaded
  WHEN the page is inspected
  THEN exactly one of each of the 10 primitives is rendered with its `data-testid`: `button`, `modal-trigger`, `sheet-trigger`, `chip`, `input`, `stepper`, `toggle`, `empty-state`, `block-card`, `brick-chip` (each name appears at least once; trigger buttons stand in for portal-based primitives).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § File structure — harness renders every primitive

- ID: E-m0-003
  GIVEN `/_design` is loaded
  WHEN the bounding box of every interactive element (`button, [role="button"], [role="switch"], input, [data-testid="brick-chip"], [data-testid="chip"]`) is measured
  THEN every box has `width >= 44` and `height >= 44` (CSS pixels).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 2 — 44px touch targets

- ID: E-m0-004
  GIVEN `/_design` is loaded with the browser context emulating `prefersReducedMotion: "reduce"`
  WHEN any motion-tagged element (`[data-motion]`) is inspected
  THEN computed `animation-name` is `none` (or `transition-duration` resolves to `0s`); the EmptyState pulse element has no running animation; and the Modal open transition completes within 50ms.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 1 + § Design tokens — reduced-motion collapse rule

- ID: E-m0-005
  GIVEN `/_design` is loaded
  WHEN the body's computed `font-family` is read
  THEN it begins with the Geist Sans family token (matches `/Geist|var\(--font-geist-sans\)/`) and falls back to a system UI family. The page does not exhibit FOIT (no element has `visibility: hidden` waiting on a font load — `font-display: swap` per `next/font`).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 7 — Font loading

- ID: E-m0-006
  GIVEN `/_design` is loaded at viewport 430×844
  WHEN the user opens the `<Modal>` via its trigger
  THEN the modal's bottom inset (computed `padding-bottom`) is ≥ `env(safe-area-inset-bottom)` value (or at least `0px` resolved, with the rule referencing `var(--safe-bottom)` in source). The CTA button inside the modal has its bottom edge at least `var(--safe-bottom)` above the viewport bottom.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 6 — Modal/Sheet on iOS Safari

- ID: E-m0-007
  GIVEN `/_design` is loaded
  WHEN the browser console is observed during page load and basic interaction (open/close modal, toggle Toggle, +/- stepper)
  THEN there are zero console errors and zero unhandled promise rejections.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Components — all primitives render cleanly (Quality Gate: "No console errors")

- ID: E-m0-008
  GIVEN `/_design` is loaded
  WHEN `getComputedStyle(document.documentElement).getPropertyValue('--bg')` is read
  THEN it equals `#07090f`. Same for `--ink` (`#f5f1e8`), `--accent` (`#fbbf24`), and `--cat-passive` (`#64748b`).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Design tokens — Colors (runtime resolution)

### Accessibility (axe via Playwright)

- ID: A-m0-001
  GIVEN `/_design` is loaded
  WHEN `@axe-core/playwright` runs against the full page
  THEN there are zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Edge case 3 — Token contrast on `#07090f` + Acceptance criteria

- ID: A-m0-002
  GIVEN `/_design` is loaded
  WHEN axe is configured with only the `color-contrast` rule and run against text using `--ink` and `--ink-dim` over `--bg`/`--bg-elev`
  THEN there are zero violations. (Plan.md asserts ~17.5:1 for `--ink` and ~8.7:1 for `--ink-dim` on `#07090f` — both pass WCAG AA.)
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Edge case 3 — WCAG AA contrast (ADR-011)

- ID: A-m0-003
  GIVEN `/_design` is loaded
  WHEN every `<button>`, `[role="button"]`, and `[role="switch"]` is enumerated
  THEN each has a non-empty accessible name (text content OR `aria-label` OR `aria-labelledby`).
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — all interactive primitives expose accessible names

- ID: A-m0-004
  GIVEN `/_design` is loaded
  WHEN `Tab` is pressed repeatedly to traverse focusable elements
  THEN every interactive primitive in the harness is reached, the focused element shows a visible focus ring (computed `outline-style !== "none"` OR `box-shadow` contains a focus-ring token), and tab order is the document source order.
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — focus management (Quality Gate: a11y 100)

- ID: A-m0-005
  GIVEN `/_design` is loaded with the `<Modal>` open
  WHEN axe runs again
  THEN there are zero new violations introduced by the open dialog (`role="dialog"`, `aria-modal="true"`, focus trapped inside the modal, ESC closes).
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — `<Modal>` (a11y semantics)

### Spec gaps

- **None blocking.** Plan.md M0 is internally consistent; every Component, Edge case, and Acceptance criterion has at least one test ID above.
- **Note (deferred audit, not an M0 gap):** the migration table flags `A-bld-001..005` and `C-bld-001..010` for re-author at M1 because of the `--bg` re-base. M0's `A-m0-*` tests cover the new harness page only; if axe flags a regression on the legacy Page 1 surface when run there, that is an M1 dispatch concern.
- **Note (not a gap):** plan.md mentions a contrast-pair table at the bottom of the harness page rendered with raw `style={{ color, background }}`. `A-m0-001` runs axe across the whole page and therefore includes that table; no separate ID needed.

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
  AND when rendered with `now="23:59"`, `top` is in the half-open range `[1535, 1536)`.
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

## Milestone 2 — Add Block Flow — Tests

> Every ID below traces to `plan.md` § "Milestone 2 — Add Block Flow — Plan". The `Proves:` line names the plan section the test verifies.
> ID series start fresh from `001` per layer (`U-m2-*`, `C-m2-*`, `E-m2-*`, `A-m2-*`). Pre-M2 IDs (`*-m1-*`, `*-m0-*`, `*-bld-*`) continue to live above; M2 does not delete or renumber them.
> Per migration table at plan.md § "Migration table for prior-pivot tests": `[re-author]` test files preserve their old IDs with `(re-authored M2)` suffix on the affected assertions; `[obsolete: not-imported-in-M2]` IDs (NowCard, Brick, BrickStepper, Scaffold, EmptyBricks) stay dormant — M2 authors no new tests for those components.

### Unit (Vitest)

- ID: U-m2-001
  Layer: Unit
  Proves: plan.md § File structure — `lib/blockValidation.ts:isValidStart` (HH:MM regex)
  GIVEN `isValidStart(start: string)` from `lib/blockValidation.ts`
  WHEN called with `"00:00"`, `"09:00"`, `"23:59"`
  THEN each call returns `true`.
  AND when called with `""`, `"24:00"`, `"9:00"` (single-digit hour), `"09:60"`, `"abc"`, `"09:00 "` (trailing space), it returns `false`.
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-002
  Layer: Unit
  Proves: plan.md § File structure — `lib/blockValidation.ts:isValidEnd` (undefined OR HH:MM ≤ 23:59)
  GIVEN `isValidEnd(end: string | undefined)` from `lib/blockValidation.ts`
  WHEN called with `undefined`, `"23:59"`, `"00:01"`
  THEN each call returns `true`.
  AND when called with `"24:00"`, `"25:30"`, `""`, `"abc"`, it returns `false`.
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-003
  Layer: Unit
  Proves: plan.md § Edge cases — End ≤ Start; End not set → no-end allowed
  GIVEN `endAfterStart(start, end)` from `lib/blockValidation.ts`
  WHEN called with `("09:00", undefined)`
  THEN it returns `true` (no-end is always valid against this predicate).
  AND `endAfterStart("09:00", "10:00")` returns `true`.
  AND `endAfterStart("10:00", "09:00")` returns `false`.
  AND `endAfterStart("09:00", "09:00")` returns `false` (equal is not after).
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-004
  Layer: Unit
  Proves: plan.md § Cross-cutting concerns — Half-open `[start, end)` test fixture (ADR-006 lock)
  GIVEN `overlapsExistingBlock(blocks, candidate)` from `lib/blockValidation.ts`
  WHEN called with `blocks=[{ start:"10:00", end:"11:00", … }]` and `candidate={ start:"11:00", end:"12:00" }`
  THEN it returns `null` (back-to-back blocks do NOT overlap per ADR-006 half-open intervals).
  AND when `candidate={ start:"10:30", end:"11:30" }`, it returns the existing block (overlap on `[10:30, 11:00)`).
  AND when `candidate={ start:"09:00", end:"10:00" }`, it returns `null` (touching from below is not overlap).
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-005
  Layer: Unit
  Proves: plan.md § File structure — `overlapsExistingBlock` no-end candidate as 1-min marker
  GIVEN `overlapsExistingBlock` from `lib/blockValidation.ts`
  WHEN called with `blocks=[{ start:"10:00", end:"11:00" }]` and `candidate={ start:"10:30" }` (no end)
  THEN it returns the existing block (the 1-minute marker `[10:30, 10:31)` lies inside `[10:00, 11:00)`).
  AND when `candidate={ start:"11:00" }` (no end, on the half-open boundary), it returns `null`.
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-006
  Layer: Unit
  Proves: plan.md § File structure — `isValidCustomRange` requires `start ≤ end` AND `weekdays.length > 0`
  GIVEN `isValidCustomRange(rec)` from `lib/blockValidation.ts`
  WHEN called with `{ kind:'custom-range', start:"2026-05-01", end:"2026-05-31", weekdays:[1,2,3,4,5] }`
  THEN it returns `true`.
  AND with `{ kind:'custom-range', start:"2026-05-31", end:"2026-05-01", weekdays:[1] }` (start > end), returns `false`.
  AND with `{ kind:'custom-range', start:"2026-05-01", end:"2026-05-31", weekdays:[] }` (empty weekdays), returns `false`.
  AND with `{ kind:'just-today', date:"2026-05-06" }` it returns `true` (trivially valid for non-custom kinds).
  AND with `{ kind:'every-weekday' }` and `{ kind:'every-day' }` it returns `true`.
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m2-007
  Layer: Unit
  Proves: plan.md § File structure — `lib/uuid.ts` mockable seam
  GIVEN `uuid` exported from `lib/uuid.ts`
  WHEN imported in a Vitest test that calls `vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))`
  THEN `uuid()` returns the literal string `"uuid-1"`.
  AND without the mock, two consecutive `uuid()` calls return distinct non-empty strings (real `crypto.randomUUID()` semantics).
  Tested by: `lib/uuid.test.ts`

- ID: U-m2-008
  Layer: Unit
  Proves: plan.md § Data model — `reducer` handles `ADD_BLOCK` (immutable append)
  GIVEN `reducer(state, action)` from `lib/data.ts` and `state = { blocks: [], categories: [] }`
  WHEN called with `{ type:'ADD_BLOCK', block: { id:'b1', name:'Foo', start:'09:00', recurrence:{kind:'just-today',date:'2026-05-06'}, categoryId:null, bricks:[] } }`
  THEN it returns a NEW state object (not the same reference) with `blocks.length === 1` and `blocks[0].id === 'b1'`.
  AND the input `state.blocks` array is NOT mutated (`Object.isFrozen` style: original state unchanged).
  AND `categories` field is preserved by reference (untouched).
  Tested by: `lib/data.test.ts`

- ID: U-m2-009
  Layer: Unit
  Proves: plan.md § Data model — `reducer` handles `ADD_CATEGORY` and exhaustiveness via `assertNever`
  GIVEN `reducer` from `lib/data.ts`
  WHEN called with `{ type:'ADD_CATEGORY', category:{ id:'c1', name:'Health', color:'#34d399' } }` against `state = { blocks: [], categories: [] }`
  THEN returned state has `categories.length === 1`, `categories[0].id === 'c1'`, blocks preserved.
  AND when called with an unknown action `{ type:'NOPE' } as any`, it throws an Error whose message includes the JSON-stringified action (proves `assertNever` arm fires).
  AND `defaultState()` returns `{ blocks: [], categories: [] }` (deep-equal, no factory data).
  Tested by: `lib/data.test.ts`

- ID: U-m2-010
  Layer: Unit
  Proves: plan.md § Edge cases — `+` button default Start: `roundDownToHour` slice
  GIVEN the local helper `roundDownToHour(hhmm)` (1-line slice in `BuildingClient.tsx`) reachable via export OR via `BuildingClient`'s sheet-open behavior
  WHEN called with `"09:47"`, `"00:00"`, `"23:59"`, `"12:00"`
  THEN it returns `"09:00"`, `"00:00"`, `"23:00"`, `"12:00"` respectively (string slice — no Date math).
  Tested by: `app/(building)/BuildingClient.test.tsx` (or `lib/timeOffset.test.ts` if helper is hoisted)

- ID: U-m2-011
  Layer: Unit
  Proves: plan.md § Cross-cutting concerns — BlueprintBar non-empty path math (categoryId aggregation)
  GIVEN the pure aggregator used by `BlueprintBar` (either exported helper from `BlueprintBar.tsx` or inlined and asserted via render output)
  WHEN given `blocks=[{categoryId:'c1', start:'09:00', end:'10:00'}, {categoryId:'c1', start:'14:00', end:'15:00'}, {categoryId:'c2', start:'12:00', end:'12:30'}, {categoryId:null, start:'08:00', end:'09:00'}, {categoryId:'c1', start:'16:00'}]` (last has no end)
  THEN aggregated minutes per category: `c1 → 120`, `c2 → 30` (no-end and `categoryId:null` excluded).
  AND segment widths sum to `100%` exactly (within ±0.01% rounding).
  AND segments are emitted in `categoryId`-sorted order (`c1` before `c2`).
  Tested by: `components/BlueprintBar.test.tsx`

### Component (Vitest + Testing Library)

- ID: C-m2-001
  Layer: Component
  Proves: plan.md § Components — Floating `+` button wires `onAddPress` — covers SPEC AC #1 + AC #3
  GIVEN `<BottomBar onAddPress={mockHandler} />` rendered standalone (re-authored M2)
  WHEN the `+` button (queried by `aria-label="Add"`) is clicked
  THEN `mockHandler` is called exactly once.
  AND the Voice button's M1 visibly-disabled treatment is unchanged (`aria-disabled="true"`, opacity `0.5`, no native `disabled`).
  AND the `+` button remains M0 primary amber (`<Button>` variant `"primary"`), 44×44 minimum, `aria-label="Add"`.
  Tested by: `components/BottomBar.test.tsx` (re-authored M2)

- ID: C-m2-002
  Layer: Component
  Proves: plan.md § Components — `<AddBlockSheet>` opens with default Start prefill — covers SPEC AC #1 + AC #5
  GIVEN `<AddBlockSheet open={true} defaultStart="09:00" categories={[]} blocks={[]} onSave={mockSave} onCancel={mockCancel} onCreateCategory={mockCreate} />` rendered
  WHEN the sheet renders
  THEN a Title `<Input>` is present, has autofocus (document.activeElement === Title input), is empty.
  AND a Start time `<Input>` is present and its value is `"09:00"`.
  AND an End time `<Input>` is present and its value is empty (`""`).
  AND the recurrence picker has `Just today` selected (`aria-checked="true"`); the other three chips have `aria-checked="false"`.
  AND the sheet's outer `[role="dialog"]` carries `aria-label="Add Block"`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-003
  Layer: Component
  Proves: plan.md § Edge cases — Empty Title disables Save with inline error — covers SPEC AC #4 + AC #11 + AC #22
  GIVEN `<AddBlockSheet open={true} defaultStart="09:00" categories={[]} blocks={[]} … />` with Title left blank
  WHEN the user has not typed in Title
  THEN the Save button has `aria-disabled="true"`.
  AND clicking Save does NOT invoke `onSave`.
  AND when the user types `"Foo"` into Title, Save's `aria-disabled` flips to `false` and clicking Save invokes `onSave` exactly once with a Block whose `name === "Foo"`.
  AND when Title is then cleared back to `""`, Save's `aria-disabled` flips back to `true`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-004
  Layer: Component
  Proves: plan.md § Edge cases — End ≤ Start inline error + Save disabled — covers SPEC AC #23
  GIVEN `<AddBlockSheet open={true} defaultStart="10:00" categories={[]} blocks={[]} … />` with Title `"Foo"` typed
  WHEN End is set to `"09:00"` (before Start)
  THEN an inline `[role="alert"]` is rendered with text matching /End must be after Start/i.
  AND Save's `aria-disabled` is `"true"`.
  AND when End is updated to `"11:00"`, the alert disappears and Save's `aria-disabled` flips to `"false"`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-005
  Layer: Component
  Proves: plan.md § Edge cases — End past 23:59 inline error — covers SPEC AC #24
  GIVEN `<AddBlockSheet open={true} defaultStart="22:00" categories={[]} blocks={[]} … />` with Title `"Foo"` typed
  WHEN End is set to `"24:00"` (or any value rejected by `isValidEnd`)
  THEN an inline `[role="alert"]` matching /before midnight/i is rendered.
  AND Save's `aria-disabled` is `"true"`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-006
  Layer: Component
  Proves: plan.md § Edge cases — Soft overlap warning, Save still enabled — covers SPEC AC #26
  GIVEN `<AddBlockSheet open={true} defaultStart="09:30" categories={[]} blocks={[{id:'b1', name:'Existing', start:'09:00', end:'10:00', recurrence:{kind:'just-today',date:'2026-05-06'}, categoryId:null, bricks:[]}]} … />` with Title `"Foo"` and End `"10:30"`
  WHEN the form is fully populated
  THEN an inline `[role="status"]` is rendered with text containing the existing block's name `"Existing"`.
  AND Save's `aria-disabled` is `"false"` (overlap is a soft warning, not a hard error).
  AND clicking Save invokes `onSave` with the new block.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-007
  Layer: Component
  Proves: plan.md § Components — `<RecurrenceChips>` 4-chip single-select with custom-range sub-form — covers SPEC AC #7 + AC #8
  GIVEN `<RecurrenceChips value={{kind:'just-today',date:'2026-05-06'}} onChange={mockChange} />` rendered
  WHEN inspected
  THEN exactly four chips are present with accessible names matching /Just today/, /Every weekday/, /Every day/, /Custom range/.
  AND the wrapper has `role="radiogroup"`; each chip has `role="radio"` and `aria-checked` reflecting selection.
  AND clicking the `Custom range` chip invokes `onChange` with `{ kind:'custom-range', start:'', end:'', weekdays:[] }` (or equivalent default).
  AND when `value.kind === 'custom-range'`, two date `<Input>`s and 7 weekday chips (Sun..Sat) are revealed.
  AND when `value.kind !== 'custom-range'`, the sub-form is NOT in the DOM.
  Tested by: `components/RecurrenceChips.test.tsx`

- ID: C-m2-008
  Layer: Component
  Proves: plan.md § Edge cases — Custom-range with zero weekdays disables Save — covers SPEC AC #25
  GIVEN `<AddBlockSheet open={true} defaultStart="09:00" categories={[]} blocks={[]} … />` with Title `"Foo"`, recurrence set to `{kind:'custom-range', start:'2026-05-01', end:'2026-05-31', weekdays:[]}`
  WHEN the form is inspected
  THEN an inline `[role="alert"]` matching /at least one weekday/i is rendered.
  AND Save's `aria-disabled` is `"true"`.
  AND when one weekday chip is selected, the alert disappears and Save's `aria-disabled` flips to `"false"`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-009
  Layer: Component
  Proves: plan.md § Components — `<CategoryPicker>` zero categories shows only "+ New" + "Skip" — covers SPEC AC #9
  GIVEN `<CategoryPicker categories={[]} selectedCategoryId={null} onSelect={mockSelect} onSkip={mockSkip} onRequestNewCategory={mockNew} />` rendered
  WHEN inspected
  THEN exactly two interactive elements are present in the picker region: a "+ New" chip/button and a "Skip" chip/button.
  AND no category chips are rendered.
  AND clicking "+ New" invokes `onRequestNewCategory` exactly once.
  AND clicking "Skip" invokes `onSkip` exactly once.
  AND when re-rendered with `categories=[{id:'c1', name:'Health', color:'#34d399'}, {id:'c2', name:'Health', color:'#fb7185'}]` (two same-name categories per AC #30), both render as separate chips with distinct `data-category-id` attributes.
  Tested by: `components/CategoryPicker.test.tsx`

- ID: C-m2-010
  Layer: Component
  Proves: plan.md § Components — `<NewCategoryForm>` Name + 12-color palette grid — covers SPEC AC #10 + SG-m2-11
  GIVEN `<NewCategoryForm onCreate={mockCreate} onCancel={mockCancel} />` rendered
  WHEN inspected
  THEN a Name `<Input>` is present (required).
  AND exactly 12 color swatch chips are rendered in a 4×3 grid; each has `role="radio"` and `aria-label` matching /^Color (1[0-2]|[1-9])$/.
  AND each swatch's inline-style `background` references `var(--cat-N)` (1..12) — NOT inline hex.
  AND the "Done" button has `aria-disabled="true"` initially (Name blank, no color).
  AND after typing a Name AND selecting a color, "Done" flips to `aria-disabled="false"`.
  AND clicking "Done" invokes `onCreate` with `{ id: <uuid>, name: <typed>, color: <var(--cat-N) hex value> }`.
  Tested by: `components/NewCategoryForm.test.tsx`

- ID: C-m2-011
  Layer: Component
  Proves: plan.md § Components — Sheet `<Sheet>` view-toggle: block ↔ newCategory inside one dialog — covers plan.md § Cross-cutting concerns "Sheet nesting decision"
  GIVEN `<AddBlockSheet open={true} defaultStart="09:00" categories={[]} blocks={[]} … />` with Title `"Foo"` typed
  WHEN the user clicks "+ New" in CategoryPicker
  THEN the sheet's `aria-label` updates to `"New Category"`.
  AND the block-form fields (Title/Start/End/Recurrence) are NOT in the visible DOM.
  AND a NewCategoryForm is rendered inside the SAME single `[role="dialog"]` (no second dialog appears — `screen.getAllByRole('dialog')` length is `1`).
  AND when the NewCategoryForm's "Cancel" is clicked, the view returns to the block form, the Title input still holds `"Foo"` (state preserved across view-toggle), and the sheet's `aria-label` returns to `"Add Block"`.
  Tested by: `components/AddBlockSheet.test.tsx`

- ID: C-m2-012
  Layer: Component
  Proves: plan.md § Edge cases — New category persists even if block is Cancelled — covers SPEC AC #28 + AC #29
  GIVEN `<BuildingClient />` mounted (reducer initialised with empty state); user opens sheet, types Title, clicks "+ New", fills NewCategoryForm with name `"Health"` + a color, clicks "Done"
  WHEN the user then clicks Cancel on the block form
  THEN no Block was appended (`state.blocks.length === 0`).
  AND `state.categories.length === 1` and `state.categories[0].name === "Health"` (category persisted via separate dispatch).
  AND when the sheet is reopened, the new "Health" chip appears in CategoryPicker (re-author M2).
  Tested by: `app/(building)/BuildingClient.test.tsx` (re-authored M2)

- ID: C-m2-013
  Layer: Component
  Proves: plan.md § Components — `<SlotTapTargets>` 24 transparent buttons, each calls onSlotTap(hour) — covers SPEC AC #2 + SG-m2-08
  GIVEN `<SlotTapTargets onSlotTap={mockSlotTap} />` rendered standalone
  WHEN inspected
  THEN exactly 24 `<button>` elements with `aria-label` matching `/^Add block at (0\d|1\d|2[0-3]):00$/` are present.
  AND each has computed height equal to `HOUR_HEIGHT_PX` (64px) and is absolutely positioned at `top = hour * HOUR_HEIGHT_PX`.
  AND clicking the button with `aria-label="Add block at 09:00"` calls `mockSlotTap(9)` exactly once.
  AND clicking the `aria-label="Add block at 23:00"` button calls `mockSlotTap(23)`.
  AND when rendered with `editMode={true}`, the component returns null (no buttons rendered — forward-compat for M5).
  Tested by: `components/SlotTapTargets.test.tsx`

- ID: C-m2-014
  Layer: Component
  Proves: plan.md § Components — `<TimelineBlock>` consumes new schema, positions absolutely, height ∝ duration — covers SPEC AC #16 + AC #17 (re-authored M2)
  GIVEN `<TimelineBlock block={{id:'b1', name:'Foo', start:'09:00', end:'10:30', recurrence:{kind:'just-today',date:'2026-05-06'}, categoryId:'c1', bricks:[]}} categories={[{id:'c1', name:'Health', color:'#34d399'}]} />` rendered (re-authored M2)
  WHEN inspected
  THEN the rendered element has `position: absolute`, `top: 576px` (`9 * 64`), `height: 96px` (`(10.5 - 9) * 64`).
  AND the title `"Foo"` is rendered with single-line ellipsis CSS (`text-overflow: ellipsis; overflow: hidden; white-space: nowrap`).
  AND the time-range label renders `"09:00–10:30"` (en-dash; via wrapped `fmtRange`).
  AND a category color dot is present with computed `background-color` matching `#34d399`.
  AND the element's `onClick` is a no-op (clicking does not throw, does not navigate, does not invoke any prop).
  Tested by: `components/TimelineBlock.test.tsx` (re-authored M2 — flips from `[obsolete]`)

- ID: C-m2-015
  Layer: Component
  Proves: plan.md § Edge cases — End not set: TimelineBlock height = HOUR_HEIGHT_PX/12, no en-dash — covers SPEC AC #17 + SG-m2-05
  GIVEN `<TimelineBlock block={{id:'b1', name:'Foo', start:'09:00', categoryId:null, recurrence:{kind:'just-today',date:'2026-05-06'}, bricks:[]}} categories={[]} />` rendered (no `end` field)
  WHEN inspected
  THEN computed `top` is `576px` (`9 * 64`).
  AND computed `height` is approximately `5.333px` (`64 / 12`) within ±0.5px tolerance.
  AND the time-range label renders just `"09:00"` (no en-dash, no second time).
  AND no category color dot is rendered (`categoryId === null`).
  Tested by: `components/TimelineBlock.test.tsx` (re-authored M2)

- ID: C-m2-016
  Layer: Component
  Proves: plan.md § Components — Empty-state card unmounts when `blocks.length > 0` — covers SPEC AC #19 (re-authored M2)
  GIVEN `<BuildingClient />` mounted with default empty state
  WHEN inspected initially
  THEN the EmptyBlocks card with copy `"Tap any slot to lay your first block."` is in the DOM (preserved from M1).
  AND after dispatching `ADD_BLOCK` (via the AddBlockSheet save flow OR direct reducer invocation in test), the EmptyBlocks card is no longer in the DOM (`queryByText('Tap any slot to lay your first block.')` returns `null`).
  AND the new `[data-component="timeline-block"]` IS in the DOM.
  Tested by: `app/(building)/BuildingClient.test.tsx` (re-authored M2)

- ID: C-m2-017
  Layer: Component
  Proves: plan.md § Components — BlueprintBar non-empty path renders colored segments — covers SPEC AC #18 + SG-m2-02 (re-authored M2)
  GIVEN `<BlueprintBar blocks={[{id:'b1',start:'09:00',end:'10:00',categoryId:'c1',recurrence:{kind:'just-today',date:'2026-05-06'},name:'A',bricks:[]}, {id:'b2',start:'12:00',end:'12:30',categoryId:'c2',recurrence:{kind:'just-today',date:'2026-05-06'},name:'B',bricks:[]}, {id:'b3',start:'14:00',end:'15:00',categoryId:null,recurrence:{kind:'just-today',date:'2026-05-06'},name:'C',bricks:[]}]} categories={[{id:'c1',name:'Health',color:'#34d399'}, {id:'c2',name:'Mind',color:'#c4b5fd'}]} now="12:00" />` rendered
  WHEN inspected
  THEN exactly 2 `[data-testid="blueprint-segment"]` elements are present (uncategorized block excluded per SG-m2-02).
  AND segment widths sum to `100%` within ±0.5%.
  AND the c1 segment's computed `background-color` matches `#34d399`; the c2 segment's matches `#c4b5fd`.
  AND segments are rendered in `categoryId`-sorted order (c1 before c2).
  Tested by: `components/BlueprintBar.test.tsx` (re-authored M2)

- ID: C-m2-018
  Layer: Component
  Proves: plan.md § Components — BlueprintBar empty fallback when all blocks uncategorized — covers SG-m2-02 (re-authored M2)
  GIVEN `<BlueprintBar blocks={[{id:'b1',start:'09:00',end:'10:00',categoryId:null,name:'A',recurrence:{kind:'just-today',date:'2026-05-06'},bricks:[]}]} categories={[]} now="12:00" />` rendered
  WHEN inspected
  THEN zero `[data-testid="blueprint-segment"]` elements are present.
  AND the empty-outline state from M1 is rendered (border references `--card-edge`).
  AND no `NaN%` / `Infinity%` strings appear in the DOM.
  Tested by: `components/BlueprintBar.test.tsx` (re-authored M2)

- ID: C-m2-019
  Layer: Component
  Proves: plan.md § Components — Timeline composes SlotTapTargets + TimelineBlock + NowLine layers — covers SPEC AC #2 + AC #16 (re-authored M2)
  GIVEN `<Timeline blocks={[{id:'b1',start:'09:00',end:'10:00',categoryId:null,name:'Foo',recurrence:{kind:'just-today',date:'2026-05-06'},bricks:[]}]} categories={[]} now="08:00" onSlotTap={mockSlotTap} />` rendered
  WHEN inspected
  THEN the schedule column contains: a hour-grid layer (z-index 0), a `<SlotTapTargets>` layer with 24 buttons (z-index 1), one `[data-component="timeline-block"]` (z-index 2), and a `[data-testid="now-line"]` (z-index 3).
  AND the EmptyBlocks card is NOT in the DOM (because `blocks.length > 0`).
  AND clicking `aria-label="Add block at 14:00"` invokes `mockSlotTap(14)`.
  Tested by: `components/Timeline.test.tsx` (re-authored M2)

- ID: C-m2-020
  Layer: Component
  Proves: plan.md § Components — `BuildingClient` wires reducer + sheet + onSave dispatch — covers SPEC AC #14 + AC #20 (re-authored M2)
  GIVEN `<BuildingClient />` mounted (re-authored M2)
  WHEN the BottomBar's `+` button is clicked, the sheet opens, Title `"Foo"` is typed, Save is clicked
  THEN exactly one new Block is appended to internal state (`state.blocks.length === 1`).
  AND the saved block's `id` is a non-empty string (or the mocked `"uuid-1"` if `lib/uuid.ts` is `vi.mock`'d).
  AND the saved block's `name === "Foo"`, `start === <roundDownToHour(now)>`, `recurrence.kind === "just-today"`, `categoryId === null`, `bricks === []`.
  AND the hero's `0%` text is unchanged (scoring is M3, AC #20).
  AND after Save, the sheet is unmounted (no `[role="dialog"]`).
  AND `localStorage.length === 0` after Save (no accidental persistence — M8 lands later).
  Tested by: `app/(building)/BuildingClient.test.tsx` (re-authored M2)

### E2E (Playwright)

> All M2 e2e run on `mobile-chrome` (Pixel 7) at 430×900 viewport unless otherwise stated. Base URL `http://localhost:3000`. Route under test: `/`. Each spec uses `page.addInitScript` to fix `Date.now` so the tests are clock-stable.

- ID: E-m2-001
  Layer: E2E
  Proves: plan.md § Components — Add via `+` button → block appears at default Start — covers SPEC AC #1 + AC #14 + AC #16 + AC #36
  GIVEN `addInitScript` fixes `Date.now` to `2026-05-06T09:47:00` local time and `/` is loaded
  WHEN the user taps the `+` button (`aria-label="Add"`), types `"Foo"` into the Title input, and taps Save
  THEN a `[role="dialog"]` becomes visible with `aria-label="Add Block"` after the `+` tap.
  AND the Start input value is `"09:00"` (rounded DOWN per SG-m2-04).
  AND after Save, the dialog is dismissed (`[role="dialog"]` count is 0).
  AND a `[data-component="timeline-block"]` is visible at vertical `top` ≈ `9 * 64 = 576px` (within ±2px).
  AND the timeline-block element contains the text `"Foo"` and the time text `"09:00"`.
  AND the empty-state card with text `"Tap any slot to lay your first block."` is NOT in the DOM.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-002
  Layer: E2E
  Proves: plan.md § Components — Add via slot-tap → sheet pre-fills hour — covers SPEC AC #2
  GIVEN `addInitScript` fixes the clock at `"08:00"` and `/` is loaded
  WHEN the user taps the SlotTapTarget with `aria-label="Add block at 14:00"`, types `"Bar"` into Title, taps Save
  THEN the sheet opens with Start input value `"14:00"`.
  AND after Save, a `[data-component="timeline-block"]` is visible at vertical `top` ≈ `14 * 64 = 896px` (within ±2px) — may require timeline scroll.
  AND the block contains text `"Bar"`.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-003
  Layer: E2E
  Proves: plan.md § Components — Cancel → no block added, sheet closes — covers SPEC AC #12 + AC #36
  GIVEN `/` is loaded
  WHEN the user taps `+`, types `"Throwaway"` into Title, then taps the Cancel `<X>` icon (top-left of the sheet)
  THEN the dialog is dismissed (`[role="dialog"]` count is 0).
  AND zero `[data-component="timeline-block"]` are present.
  AND the empty-state card `"Tap any slot to lay your first block."` is still visible.
  AND no console error is logged.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-004
  Layer: E2E
  Proves: plan.md § Edge cases — Empty-state card disappears when blocks.length > 0 — covers SPEC AC #19
  GIVEN `/` is loaded; the empty-state card is initially visible
  WHEN the user adds any valid block via `+` (Title `"Foo"`, Save)
  THEN immediately after the dialog closes, the empty-state card is no longer in the DOM.
  AND when (in a follow-up step that exercises a hypothetical "remove" flow) all blocks are removed, the empty-state card MUST re-appear — note: M2 does not ship a remove flow, so this AND-clause is asserted only when `state.blocks.length === 0` at any later point. (Sanity check; full assertion lands in M5.)
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-005
  Layer: E2E
  Proves: plan.md § Edge cases — Validation: empty Title → Save disabled — covers SPEC AC #22
  GIVEN `/` is loaded, sheet opened via `+`
  WHEN the Save button is queried before any Title input
  THEN it has `aria-disabled="true"`.
  AND clicking it does NOT close the sheet, does NOT add a block.
  AND after typing `"X"` into Title, Save's `aria-disabled` is `"false"` and clicking it adds the block.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-006
  Layer: E2E
  Proves: plan.md § Edge cases — Validation: End ≤ Start → inline error, Save disabled — covers SPEC AC #23
  GIVEN `/` is loaded, sheet opened via `+` (default Start `"09:00"` if clock is `"09:30"`), Title typed `"Foo"`
  WHEN the End input is set to `"08:00"`
  THEN an inline `[role="alert"]` with text matching /End must be after Start/i is visible.
  AND Save's `aria-disabled` is `"true"`.
  AND when End is updated to `"10:00"`, the alert disappears and Save's `aria-disabled` is `"false"`.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-007
  Layer: E2E
  Proves: plan.md § Edge cases — Validation: End past 23:59 → inline error — covers SPEC AC #24
  GIVEN `/` is loaded, sheet opened, Title `"Foo"`, Start `"22:00"`
  WHEN End is set to `"24:00"` (or any value rejected by `isValidEnd`)
  THEN an inline `[role="alert"]` matching /before midnight/i is visible.
  AND Save's `aria-disabled` is `"true"`.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-008
  Layer: E2E
  Proves: plan.md § Edge cases — Soft overlap warning, Save still allowed — covers SPEC AC #26
  GIVEN `/` is loaded; user adds a first block "Existing" with Start `"09:00"` End `"10:00"`
  WHEN the user opens the sheet again, Title `"Second"`, Start `"09:30"`, End `"10:30"`
  THEN an inline `[role="status"]` is visible containing the text `"Existing"`.
  AND Save's `aria-disabled` is `"false"` (warning is soft).
  AND clicking Save dismisses the sheet and a SECOND `[data-component="timeline-block"]` is added.
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-009
  Layer: E2E
  Proves: plan.md § Edge cases — Categories: Skip path → categoryId null, no color dot — covers SPEC AC #9 + AC #27
  GIVEN `/` is loaded with zero categories; sheet opened
  WHEN the user types Title `"Foo"`, taps the "Skip" affordance in CategoryPicker, taps Save
  THEN a new timeline block is rendered with NO `[data-testid="category-dot"]` child.
  AND BlueprintBar contains zero `[data-testid="blueprint-segment"]` elements (uncategorized excluded per SG-m2-02).
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-010
  Layer: E2E
  Proves: plan.md § Edge cases — New category inline + reuse on next open — covers SPEC AC #10 + AC #28 + AC #29
  GIVEN `/` is loaded with zero categories
  WHEN the user opens the sheet, types Title `"Foo"`, taps "+ New", types Name `"Health"`, picks color swatch `Color 1`, taps "Done", taps Save
  THEN the saved block has a category color dot whose `background-color` matches `#34d399` (the `--cat-1` value).
  AND when the user re-opens the sheet via `+`, a category chip with name `"Health"` is visible in CategoryPicker (re-author M2).
  AND `state.categories.length === 1` (verifiable via DOM presence of the chip).
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-011
  Layer: E2E
  Proves: plan.md § Edge cases — `prefers-reduced-motion: reduce` collapses sheet open + new-block stagger to instant — covers SPEC AC #35
  GIVEN browser context with `emulateMedia({ reducedMotion: 'reduce' })`; `/` is loaded
  WHEN the user opens the sheet via `+`
  THEN the `[role="dialog"]` is visible synchronously on the next animation frame (no slide-up tween > 50ms).
  AND no element on the page has a non-zero `transition-duration` greater than 50ms during sheet open.
  AND after Save, the new timeline-block appears with no opacity/transform tween (computed `transition-duration` is `0s` or `none`).
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-012
  Layer: E2E
  Proves: plan.md § Edge cases — Page refresh loses state (no persistence in M2) — covers plan.md § Edge cases "Page refresh"
  GIVEN `/` is loaded; user adds a block "Foo"; page is reloaded
  WHEN `page.reload()` completes and `networkidle` is reached
  THEN zero `[data-component="timeline-block"]` are present.
  AND the empty-state card is visible again.
  AND `localStorage.length` evaluated in the page context is `0` (no accidental persistence).
  Tested by: `tests/e2e/m2.spec.ts`

- ID: E-m2-013
  Layer: E2E
  Proves: plan.md § Edge cases — No horizontal overflow when sheet is open — covers SPEC AC #36
  GIVEN viewport 430×900; `/` is loaded; sheet opened via `+`
  WHEN body's `scrollWidth` and `clientWidth` are read
  THEN `scrollWidth <= clientWidth` (no horizontal overflow with sheet open).
  AND every direct child of the dialog has bounding-box `right <= 430`.
  Tested by: `tests/e2e/m2.spec.ts`

### Accessibility (axe via Playwright)

- ID: A-m2-001
  Layer: A11y
  Proves: plan.md § Components — axe-clean on day view (zero blocks AND with one block) — covers SPEC AC #32
  GIVEN `/` is loaded at 430×900 with `addInitScript` clock fixed
  WHEN `@axe-core/playwright` runs against the full page
  THEN there are zero violations of severity `serious` or `critical`.
  AND after a block is added via `+` (Title `"Foo"`, Save) and the sheet closes, axe is re-run against the day view
  THEN there are still zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/m2.a11y.spec.ts`

- ID: A-m2-002
  Layer: A11y
  Proves: plan.md § Components — axe-clean on open AddBlockSheet — covers SPEC AC #32
  GIVEN `/` is loaded; sheet opened via `+`
  WHEN axe runs against the page (sheet open, dialog focused)
  THEN there are zero violations of severity `serious` or `critical`.
  AND the same scan is repeated after switching to the NewCategoryForm sub-view via "+ New" — zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/m2.a11y.spec.ts`

- ID: A-m2-003
  Layer: A11y
  Proves: plan.md § Components — Sheet has `role="dialog"` + `aria-modal="true"` + dynamic `aria-label` — covers SPEC AC #31
  GIVEN `/` is loaded; sheet opened via `+`
  WHEN the dialog element is queried
  THEN it has `role="dialog"`, `aria-modal="true"`, and `aria-label="Add Block"`.
  AND after the user clicks "+ New", the same dialog's `aria-label` updates to `"New Category"` (no second dialog opens — `getAllByRole('dialog')` length is `1`).
  AND on Cancel from NewCategoryForm, the `aria-label` returns to `"Add Block"`.
  Tested by: `tests/e2e/m2.a11y.spec.ts`

- ID: A-m2-004
  Layer: A11y
  Proves: plan.md § Components — Focus trap inside AddBlockSheet — covers SPEC AC #31 + SG-m2-09
  GIVEN `/` is loaded; sheet opened via `+`
  WHEN the document's `activeElement` is read immediately after open
  THEN it is the Title input (autofocus per AC #4).
  AND pressing `Tab` repeatedly cycles focus through interactive elements WITHIN the dialog only (no focus reaches `<body>` or any element outside the dialog).
  AND pressing `Shift+Tab` from the first focusable element cycles to the last focusable element inside the dialog.
  AND on Cancel (sheet close), focus is restored to the `+` button (the original trigger).
  Tested by: `tests/e2e/m2.a11y.spec.ts`

- ID: A-m2-005
  Layer: A11y
  Proves: plan.md § Components — Tab order matches visual order — covers SPEC AC #31
  GIVEN `/` is loaded; sheet opened via `+`
  WHEN `Tab` is pressed sequentially from the Title input onward
  THEN the focused-element sequence is: Title → Start → End → recurrence chips (4 in order) → CategoryPicker chips (in order) → Skip → "+ New" → Save → Cancel.
  AND every focused element has a visible focus ring (computed `outline-style !== "none"` OR `box-shadow` contains a focus-ring token).
  AND no element is focused twice in a single tab pass.
  Tested by: `tests/e2e/m2.a11y.spec.ts`

- ID: A-m2-006
  Layer: A11y
  Proves: plan.md § Design tokens — Category palette WCAG AA on `#07090f` bg — covers SPEC AC #32 + SG-m2-01
  GIVEN `/` is loaded; sheet opened via `+`; user clicks "+ New" to surface the 12-color palette
  WHEN axe is run with only the `color-contrast` rule enabled (or `getComputedStyle` checks each swatch's `background-color` vs `--bg`)
  THEN no swatch fails WCAG AA contrast for non-text UI components (≥ 3:1).
  AND specifically `--cat-4` (`#94a3b8`) renders at the lightened value (NOT the legacy `#64748b` which fails AA on `#07090f`).
  Tested by: `tests/e2e/m2.a11y.spec.ts`

### Spec gaps

- **SG-m2-01 — Category color palette.** Locked at PLAN per plan.md § Design tokens — 12 hex values listed as `--cat-1`..`--cat-12`. Tests A-m2-006 + E-m2-010 + C-m2-010 assert the palette renders. If Gate #1 picks different hexes, the literal `#34d399` references in C-m2-014 / E-m2-010 / A-m2-006 need an amend.
- **SG-m2-02 — Uncategorized block in BlueprintBar.** Locked: **excluded**. Tests C-m2-017 + C-m2-018 + E-m2-009 assert exclusion.
- **SG-m2-03 — Loose Bricks tray location.** Carried to M3. NO M2 test ID covers this; tracked in M3.
- **SG-m2-04 — `+` default Start.** Locked: round DOWN. Tests U-m2-010 + E-m2-001 assert.
- **SG-m2-05 — End = blank rendering.** Locked: thin marker `HOUR_HEIGHT_PX/12`. Test C-m2-015 asserts.
- **SG-m2-06 — Sheet swipe-down with dirty form.** Locked: silent discard. NO dedicated M2 test ID (browser-native gesture; covered by manual Gate #2 review).
- **SG-m2-07 — `categoryId` FK vs inline.** Locked: FK. Schema shape asserted indirectly across U-m2-008 + C-m2-020.
- **SG-m2-08 — Empty timeline row tap target.** Locked: 24 transparent buttons. Test C-m2-013 asserts.
- **SG-m2-09 — Sheet focus trap is local to AddBlockSheet, not M0 `<Sheet>`.** Locked. Test A-m2-004 asserts the trap behavior; the implementation locality is verified at code review (no M0 primitive change).
- **SG-m2-10 — `lib/dharma.ts:fmtRange` no-end behavior.** Locked: widen `fmtRange` to accept `end?: string`. Tests C-m2-014 + C-m2-015 assert the rendered string in both branches.
- **SG-m2-11 — Color picker in NewCategoryForm: required.** Locked. Test C-m2-010 asserts "Done" is `aria-disabled` until both Name and Color are set.
- **SG-m2-12 (new — surfaced during test derivation) — Auto-select newly created category on the block form.** plan.md § Edge cases says "the newly-created category also auto-selects on the block form" but no SPEC AC explicitly asserts this. Test C-m2-012 covers persistence; an additional assertion that the just-created category is pre-selected when returning to the block view is implied by AC #28+#29 but not directly tested. **Recommendation:** treat as plan-locked behavior; add an explicit assertion in C-m2-012 if Gate #1 wants it surfaced.
- **SG-m2-13 (new — surfaced during test derivation) — `[data-testid="category-dot"]` selector contract.** Tests E-m2-009 + C-m2-014 reference `[data-testid="category-dot"]`. plan.md § Components mentions the dot but does not lock the data-testid string. **Recommendation:** lock `data-testid="category-dot"` at Gate #1 so tests and implementation share a stable selector.

### Coverage map (SPEC AC #1..#36 → IDs)

| AC # | Description (short) | IDs |
|------|---------------------|-----|
| #1   | `+` opens sheet, default Start = current hour rounded, recurrence = just-today, categoryId = null | C-m2-001, C-m2-002, E-m2-001 |
| #2   | Empty slot tap opens sheet pre-filled to that hour | C-m2-013, C-m2-019, E-m2-002 |
| #3   | `+` uses M0 `<Button>` primary amber; sheet uses M0 `<Sheet>` | C-m2-001, C-m2-002 |
| #4   | Title required `<Input>` with autofocus | C-m2-002, C-m2-003 |
| #5   | Start required time picker prefilled per trigger | C-m2-002, E-m2-001, E-m2-002 |
| #6   | End optional time picker; clearing returns to no-end | C-m2-015 |
| #7   | Recurrence 4 single-select chips, default Just today | C-m2-002, C-m2-007 |
| #8   | Custom-range chip reveals dates + 7-day weekday picker | C-m2-007, C-m2-008 |
| #9   | Category picker: existing chips + "+ New" + "Skip"; zero categories shows only "+ New" + "Skip" | C-m2-009, E-m2-009 |
| #10  | New-category form: Name input + 12-color palette 4×3 grid | C-m2-010, E-m2-010 |
| #11  | Save sticky bottom amber; disabled until Title non-blank, Start valid, sub-form errors clear | C-m2-003, C-m2-008 |
| #12  | Cancel `<X>` discards state and closes | E-m2-003 |
| #13  | Sheet swipe-down on iOS = Cancel | (deferred to manual review per SG-m2-06) |
| #14  | On Save: new Block appended with `crypto.randomUUID()` id | C-m2-020, E-m2-001 |
| #15  | Sheet slides down on Save (modalOut); reduced-motion → instant | E-m2-011 |
| #16  | New block enters timeline at start row with stagger fade-in | C-m2-014, E-m2-001, E-m2-011 |
| #17  | Block card displays title, time range, category dot when categorized | C-m2-014, C-m2-015 |
| #18  | BlueprintBar updates with new categorized segment | C-m2-017, E-m2-009 |
| #19  | Empty-state card unmounts when blocks.length > 0 | C-m2-016, E-m2-001, E-m2-004 |
| #20  | Hero `0%` does not change in M2 | C-m2-020 |
| #21  | Saved block matches locked `Block` schema | U-m2-008, C-m2-020 |
| #22  | Empty Title → Save disabled with inline message | C-m2-003, E-m2-005 |
| #23  | End ≤ Start → inline error; Save disabled | U-m2-003, C-m2-004, E-m2-006 |
| #24  | End past 23:59 → inline error; Save disabled | U-m2-002, C-m2-005, E-m2-007 |
| #25  | Custom-range zero weekdays → inline error; Save disabled | U-m2-006, C-m2-008 |
| #26  | Times overlap existing → soft inline warning; Save still allowed | U-m2-004, U-m2-005, C-m2-006, E-m2-008 |
| #27  | Save with categoryId=null allowed when zero categories; renders without dot | C-m2-009, C-m2-015, E-m2-009 |
| #28  | New-category form persists Category to AppState even if block Cancelled | C-m2-012, E-m2-010 |
| #29  | Newly created categories appear as chips in subsequent sheets | C-m2-012, E-m2-010 |
| #30  | Two categories with identical Name allowed (no de-dup) | C-m2-009 |
| #31  | All interactive ≥44px; tab order matches visual; sheet `role="dialog"` with focus trap | C-m2-013, A-m2-003, A-m2-004, A-m2-005 |
| #32  | axe zero violations on day view AND on open sheet | A-m2-001, A-m2-002, A-m2-006 |
| #33  | `tsc --noEmit` zero new errors | (covered by `npm run eval` composite gate) |
| #34  | ESLint zero new warnings | (covered by `npm run eval` composite gate) |
| #35  | `prefers-reduced-motion` collapses sheet + stagger to instant | E-m2-011 |
| #36  | Playwright: `+` add, slot-tap add, Cancel no-block, mobile 430px no overflow | E-m2-001, E-m2-002, E-m2-003, E-m2-013 |

