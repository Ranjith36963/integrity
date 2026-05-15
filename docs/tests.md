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

| AC # | Description (short)                                                                               | IDs                                        |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| #1   | `+` opens sheet, default Start = current hour rounded, recurrence = just-today, categoryId = null | C-m2-001, C-m2-002, E-m2-001               |
| #2   | Empty slot tap opens sheet pre-filled to that hour                                                | C-m2-013, C-m2-019, E-m2-002               |
| #3   | `+` uses M0 `<Button>` primary amber; sheet uses M0 `<Sheet>`                                     | C-m2-001, C-m2-002                         |
| #4   | Title required `<Input>` with autofocus                                                           | C-m2-002, C-m2-003                         |
| #5   | Start required time picker prefilled per trigger                                                  | C-m2-002, E-m2-001, E-m2-002               |
| #6   | End optional time picker; clearing returns to no-end                                              | C-m2-015                                   |
| #7   | Recurrence 4 single-select chips, default Just today                                              | C-m2-002, C-m2-007                         |
| #8   | Custom-range chip reveals dates + 7-day weekday picker                                            | C-m2-007, C-m2-008                         |
| #9   | Category picker: existing chips + "+ New" + "Skip"; zero categories shows only "+ New" + "Skip"   | C-m2-009, E-m2-009                         |
| #10  | New-category form: Name input + 12-color palette 4×3 grid                                         | C-m2-010, E-m2-010                         |
| #11  | Save sticky bottom amber; disabled until Title non-blank, Start valid, sub-form errors clear      | C-m2-003, C-m2-008                         |
| #12  | Cancel `<X>` discards state and closes                                                            | E-m2-003                                   |
| #13  | Sheet swipe-down on iOS = Cancel                                                                  | (deferred to manual review per SG-m2-06)   |
| #14  | On Save: new Block appended with `crypto.randomUUID()` id                                         | C-m2-020, E-m2-001                         |
| #15  | Sheet slides down on Save (modalOut); reduced-motion → instant                                    | E-m2-011                                   |
| #16  | New block enters timeline at start row with stagger fade-in                                       | C-m2-014, E-m2-001, E-m2-011               |
| #17  | Block card displays title, time range, category dot when categorized                              | C-m2-014, C-m2-015                         |
| #18  | BlueprintBar updates with new categorized segment                                                 | C-m2-017, E-m2-009                         |
| #19  | Empty-state card unmounts when blocks.length > 0                                                  | C-m2-016, E-m2-001, E-m2-004               |
| #20  | Hero `0%` does not change in M2                                                                   | C-m2-020                                   |
| #21  | Saved block matches locked `Block` schema                                                         | U-m2-008, C-m2-020                         |
| #22  | Empty Title → Save disabled with inline message                                                   | C-m2-003, E-m2-005                         |
| #23  | End ≤ Start → inline error; Save disabled                                                         | U-m2-003, C-m2-004, E-m2-006               |
| #24  | End past 23:59 → inline error; Save disabled                                                      | U-m2-002, C-m2-005, E-m2-007               |
| #25  | Custom-range zero weekdays → inline error; Save disabled                                          | U-m2-006, C-m2-008                         |
| #26  | Times overlap existing → soft inline warning; Save still allowed                                  | U-m2-004, U-m2-005, C-m2-006, E-m2-008     |
| #27  | Save with categoryId=null allowed when zero categories; renders without dot                       | C-m2-009, C-m2-015, E-m2-009               |
| #28  | New-category form persists Category to AppState even if block Cancelled                           | C-m2-012, E-m2-010                         |
| #29  | Newly created categories appear as chips in subsequent sheets                                     | C-m2-012, E-m2-010                         |
| #30  | Two categories with identical Name allowed (no de-dup)                                            | C-m2-009                                   |
| #31  | All interactive ≥44px; tab order matches visual; sheet `role="dialog"` with focus trap            | C-m2-013, A-m2-003, A-m2-004, A-m2-005     |
| #32  | axe zero violations on day view AND on open sheet                                                 | A-m2-001, A-m2-002, A-m2-006               |
| #33  | `tsc --noEmit` zero new errors                                                                    | (covered by `npm run eval` composite gate) |
| #34  | ESLint zero new warnings                                                                          | (covered by `npm run eval` composite gate) |
| #35  | `prefers-reduced-motion` collapses sheet + stagger to instant                                     | E-m2-011                                   |
| #36  | Playwright: `+` add, slot-tap add, Cancel no-block, mobile 430px no overflow                      | E-m2-001, E-m2-002, E-m2-003, E-m2-013     |

---

## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill — Tests

> Every ID below traces to `plan.md` § "Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill — Plan". The `Proves:` line names the plan section the test verifies.
> ID series start fresh from `001` per layer (`U-m3-*`, `C-m3-*`, `E-m3-*`, `A-m3-*`). Pre-M3 IDs continue dormant above; M3 does not delete or renumber them.
> Per migration table at plan.md § "Migration tags": `BrickChip` flips `[obsolete]` → `[re-author]` (built fresh against the locked Brick schema). `BrickStepper`, `BrickTimer`, `Brick` (legacy wrapper), `NowCard`, `EmptyBricks`, `Scaffold` stay `[obsolete]` — M3 authors no new tests for those components.
> Authored by Main Claude per ADR-021 (PLANNER TESTS dispatch hit two consecutive idle timeouts; user authorized "go option 2"). EVALUATOR remains independent — reads spec.md + tests.md, runs gates, judges.
> 3 acceptance criteria are deferred-by-design from this list: AC #38 (one-shot crossing rule — state-injection only, no e2e path), AC #47 (`tsc --noEmit` — composite gate via `npm run eval`), AC #48 (ESLint zero new warnings — composite gate via `npm run eval`). All three are noted in the Coverage map.
> Sandbox `next dev` localhost-bind failure pattern from M1/M2 carries over: e2e + axe IDs (`E-m3-*`, `A-m3-*`) are authored with real assertions but their Playwright run is **deferred to the Vercel preview** at Gate #2.
> No factory data per ADR-039 — fixtures use generic names ("brick A", "category 1", "block one"). Phase-1 illustrative names from spec.md are NOT transcribed into tests.

### Unit (Vitest)

- ID: U-m3-001
  Layer: Unit
  Proves: plan.md § Data models — `brickPct` for `tick` kind (0 / 100)
  GIVEN `brickPct` from `lib/dharma.ts` and a Brick of `kind: 'tick'`
  WHEN called with `{ kind:'tick', done:false, … }`
  THEN it returns `0`.
  AND when called with `{ kind:'tick', done:true, … }`, it returns `100`.
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-002
  Layer: Unit
  Proves: plan.md § Data models — `brickPct` for `goal` kind (renamed `count`/`target`/`unit`); cap at 100; zero-target guard
  GIVEN `brickPct` from `lib/dharma.ts` dispatched by `kind`
  WHEN called with `{ kind:'goal', target:100, count:50, unit:'reps', … }`
  THEN it returns `50`.
  AND `{ kind:'goal', target:100, count:100 }` → `100`.
  AND `{ kind:'goal', target:100, count:200 }` → `100` (capped).
  AND `{ kind:'goal', target:100, count:0 }` → `0`.
  AND `{ kind:'goal', target:0, count:5 }` → `0` (zero-target guard prevents division-by-zero).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-003
  Layer: Unit
  Proves: plan.md § Data models — `brickPct` for `time` kind (renamed `minutesDone`/`durationMin`); cap at 100; zero-duration guard
  GIVEN `brickPct` from `lib/dharma.ts`
  WHEN called with `{ kind:'time', durationMin:30, minutesDone:15, … }`
  THEN it returns `50`.
  AND `{ kind:'time', durationMin:30, minutesDone:60 }` → `100` (capped).
  AND `{ kind:'time', durationMin:30, minutesDone:0 }` → `0`.
  AND `{ kind:'time', durationMin:0, minutesDone:5 }` → `0` (zero-duration guard).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-004
  Layer: Unit
  Proves: plan.md § Data models — `blockPct` empty-bricks floor = 0 (SG-m3-09)
  GIVEN `blockPct` from `lib/dharma.ts`
  WHEN called with a Block whose `bricks: []`
  THEN it returns `0` (the M4 "empty-block tickable as 0/1" rule does NOT apply in M3).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-005
  Layer: Unit
  Proves: plan.md § Data models — `blockPct` non-empty mean of `brickPct`
  GIVEN `blockPct` from `lib/dharma.ts`
  WHEN called with a Block containing `[{kind:'tick', done:true, …}, {kind:'tick', done:false, …}]`
  THEN it returns `50` (`(100 + 0) / 2`).
  AND with `[{kind:'goal', target:100, count:80, …}, {kind:'time', durationMin:30, minutesDone:15, …}]` → `65` (`(80 + 50) / 2`).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-006
  Layer: Unit
  Proves: plan.md § Data models — `dayPct(state)` empty-state floor (SG-m3-10)
  GIVEN `dayPct` from `lib/dharma.ts`, new signature `dayPct(state: AppState)`
  WHEN called with `{ blocks:[], categories:[], looseBricks:[] }`
  THEN it returns `0` (no division by zero).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-007
  Layer: Unit
  Proves: plan.md § Data models — `dayPct(state)` averages over (blocks + looseBricks) per § 0.9
  GIVEN `dayPct(state)` from `lib/dharma.ts`
  WHEN called with one block at `blockPct = 100` and zero loose bricks
  THEN it returns `100`.
  AND with one block at `blockPct = 100` and one loose brick at `brickPct = 0`, returns `50` (each is one top-level unit).
  AND with two blocks at `100` and one loose brick at `50`, returns `83.33` (within ±0.01 rounding).
  AND with zero blocks and one loose brick at `40`, returns `40`.
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-008
  Layer: Unit
  Proves: plan.md § Data models — `categoryDayPct` filtering (cross-category brick attribution; null exclusion)
  GIVEN `categoryDayPct(state, categoryId)` from `lib/dharma.ts`
  WHEN called against a state with one block `categoryId:'c1'` containing tick bricks (one categoryId:'c2' done:true, one categoryId:'c1' done:true) plus one loose brick `categoryId:'c1', kind:'goal', target:10, count:5`, plus one loose brick `categoryId:null, kind:'tick', done:true`
  THEN `categoryDayPct(state, 'c1')` averages: the c1-attributed brick(s) inside the block + the loose c1 brick. Bricks attribute to THEIR own category (not parent block's). The block's own contribution is included only because `block.categoryId === 'c1'`. The c2-brick is excluded from this query.
  AND `categoryDayPct(state, 'c2')` returns the c2 brick's `brickPct` only.
  AND `categoryDayPct(state, 'c-nonexistent')` returns `0`.
  AND the null-category loose brick is EXCLUDED from any category-filtered query (but remains counted in `dayPct(state)`).
  Tested by: `lib/dharma.test.ts`

- ID: U-m3-009
  Layer: Unit
  Proves: plan.md § Data models — `reducer` `ADD_BRICK` routes by `brick.parentBlockId !== null` (block.bricks append)
  GIVEN `reducer(state, action)` from `lib/data.ts` and `state = { blocks:[{ id:'b1', bricks:[], … }], categories:[], looseBricks:[] }`
  WHEN called with `{ type:'ADD_BRICK', brick:{ id:'r1', name:'brick A', kind:'tick', done:false, categoryId:null, parentBlockId:'b1' } }`
  THEN returned state has `blocks[0].bricks.length === 1` and `blocks[0].bricks[0].id === 'r1'`.
  AND the input `state.blocks` array is NOT mutated (new state ≠ old state by reference; old state's `blocks[0].bricks` still empty).
  AND `looseBricks` preserved unchanged.
  AND when `parentBlockId` references a block id that doesn't exist, the action is a no-op (state returned unchanged or with same shape — implementation choice, but no throw).
  Tested by: `lib/data.test.ts`

- ID: U-m3-010
  Layer: Unit
  Proves: plan.md § Data models — `reducer` `ADD_BRICK` routes `parentBlockId === null` to `state.looseBricks`
  GIVEN `reducer` from `lib/data.ts` and `state = { blocks:[], categories:[], looseBricks:[] }`
  WHEN called with `{ type:'ADD_BRICK', brick:{ id:'r2', name:'brick B', kind:'goal', target:100, count:0, unit:'', categoryId:null, parentBlockId:null } }`
  THEN returned state has `looseBricks.length === 1` and `looseBricks[0].id === 'r2'`.
  AND `state.blocks` preserved by reference (untouched).
  AND immutable update: original state unchanged.
  Tested by: `lib/data.test.ts`

- ID: U-m3-011
  Layer: Unit
  Proves: plan.md § Data models — `assertNever` exhaustiveness preserved with M3 Action union; `defaultState()` includes `looseBricks: []`
  GIVEN `reducer` from `lib/data.ts`
  WHEN called with an unknown action `{ type:'NOPE' } as any` against any valid state
  THEN it throws an Error whose message includes the JSON-stringified action (proves `assertNever` arm fires under the M3 Action union including `ADD_BRICK`).
  AND `defaultState()` returns `{ blocks:[], categories:[], looseBricks:[] }` (deep-equal, no factory data — ADR-039).
  Tested by: `lib/data.test.ts`

- ID: U-m3-012
  Layer: Unit
  Proves: plan.md § File structure — `lib/celebrations.ts` `useCrossUpEffect` cross-up detection (one-shot per crossing); covers SPEC AC #36, #37, #38 (state-injection only)
  GIVEN `useCrossUpEffect(value, threshold, fn)` from `lib/celebrations.ts` rendered via a Vitest test harness component
  WHEN `value` transitions from `99` to `100` (threshold = 100)
  THEN `fn` is called exactly once.
  AND when `value` re-renders at `100` again with no intervening drop, `fn` is NOT called a second time (one-shot per crossing).
  AND when `value` drops to `90` and then re-renders at `100`, `fn` fires again (the crossing reset).
  AND when `value` jumps from `50` to `100` directly, `fn` fires once.
  AND the same semantics hold whether the cross is a block-100 case (bloom + chime + `success` haptic side-effects) or the day-100 case (fireworks + `notification` haptic side-effects).
  Tested by: `lib/celebrations.test.ts`

- ID: U-m3-013
  Layer: Unit
  Proves: plan.md § File structure — `lib/blockValidation.ts:isValidBrickGoal` (integer ≥ 1)
  GIVEN `isValidBrickGoal(target: number)` from `lib/blockValidation.ts`
  WHEN called with `1`, `100`, `9999`
  THEN each returns `true`.
  AND with `0`, `-1`, `1.5` (non-integer), `NaN`, returns `false`.
  Tested by: `lib/blockValidation.test.ts`

- ID: U-m3-014
  Layer: Unit
  Proves: plan.md § File structure — `lib/blockValidation.ts:isValidBrickTime` (integer ≥ 1)
  GIVEN `isValidBrickTime(durationMin: number)` from `lib/blockValidation.ts`
  WHEN called with `1`, `30`, `1440`
  THEN each returns `true`.
  AND with `0`, `-5`, `2.5`, `NaN`, returns `false`.
  Tested by: `lib/blockValidation.test.ts`

### Component (Vitest + Testing Library)

- ID: C-m3-001
  Layer: Component
  Proves: plan.md § Components — `<BrickChip>` `tick` render; checkbox state; aria-label — covers SPEC AC #21, #22, #43
  GIVEN `<BrickChip brick={{ kind:'tick', name:'brick A', done:false, categoryId:'c1', parentBlockId:null, id:'r1' }} categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} />`
  WHEN rendered
  THEN the chip displays the title `"brick A"`.
  AND a checkbox-style badge renders `☐` (unchecked icon).
  AND the foreground gradient overlay's inline `width` is `"0%"` (brickPct = 0).
  AND the chip's outer button has `aria-label="brick A, tick, 0% complete"`.
  AND when re-rendered with `done:true`, the badge becomes `✓` and `aria-label` becomes `"brick A, tick, 100% complete"`.
  Tested by: `components/BrickChip.test.tsx`

- ID: C-m3-002
  Layer: Component
  Proves: plan.md § Components — `<BrickChip>` `goal` render; count/target/unit display; foreground width = brickPct% — covers SPEC AC #22, #27, #43
  GIVEN `<BrickChip brick={{ kind:'goal', name:'brick B', target:100, count:50, unit:'reps', categoryId:'c1', parentBlockId:'b1', id:'r2' }} categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} />`
  WHEN rendered
  THEN the chip displays the title `"brick B"` and the badge renders `"50 / 100 reps"`.
  AND the foreground gradient overlay's inline `width` is `"50%"`.
  AND `aria-label` includes `"50 of 100 reps"` (per spec AC #43).
  AND with `unit:''`, the badge renders `"50 / 100"` (no trailing space).
  Tested by: `components/BrickChip.test.tsx`

- ID: C-m3-003
  Layer: Component
  Proves: plan.md § Components — `<BrickChip>` `time` render; minutesDone/durationMin display — covers SPEC AC #22, #43
  GIVEN `<BrickChip brick={{ kind:'time', name:'brick C', durationMin:30, minutesDone:15, categoryId:'c1', parentBlockId:'b1', id:'r3' }} categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} />`
  WHEN rendered
  THEN the chip displays the title `"brick C"` and the badge renders `"15 / 30 m"` followed by a play icon (lucide `Play`, faded — non-functional in M3).
  AND the foreground gradient overlay's inline `width` is `"50%"`.
  AND `aria-label` includes `"15 of 30 minutes"`.
  Tested by: `components/BrickChip.test.tsx`

- ID: C-m3-004
  Layer: Component
  Proves: plan.md § Components — `<BrickChip>` uncategorized fallback (`--surface-2` background) — covers SPEC AC #22, #43
  GIVEN `<BrickChip brick={{ kind:'tick', name:'brick D', done:false, categoryId:null, parentBlockId:null, id:'r4' }} categories={[]} />`
  WHEN rendered
  THEN the chip's background uses `var(--surface-2)` (asserted via computed style or a `data-uncategorized` attribute on the outer element).
  AND `aria-label` is `"brick D, tick, 0% complete"` (no category name in the label per spec AC #43; categoryless chips do not error).
  Tested by: `components/BrickChip.test.tsx`

- ID: C-m3-005
  Layer: Component
  Proves: plan.md § Components — `<BrickChip>` touch target ≥ 44 px (ADR-031, SG-m3-13)
  GIVEN `<BrickChip>` rendered with both `size="md"` (default, expanded view) and `size="sm"` (collapsed tray row)
  WHEN measured via `getBoundingClientRect()` after a paint
  THEN the outer button's `height` is `≥ 44` for both sizes.
  AND the M3 `onClick` is a no-op (M4 wires logging) — clicking the chip causes no state change.
  Tested by: `components/BrickChip.test.tsx`

- ID: C-m3-006
  Layer: Component
  Proves: plan.md § Components — `<HeroRing>` SVG render; stroke-dashoffset math; reduced-motion — covers SPEC AC #24, #49
  GIVEN `<HeroRing pct={0} />`, `<HeroRing pct={50} />`, `<HeroRing pct={100} />` (post-mount, `mounted` flag set per SG-m3-17)
  WHEN each rendered
  THEN the filled-arc `<circle>` has `stroke-dasharray={C}` and `stroke-dashoffset={ (1 - pct/100) * C }` where `C = 2 * Math.PI * 56`.
  AND at `pct=0`, dashoffset === C (empty arc); at `pct=100`, dashoffset === 0 (full arc).
  AND under `prefers-reduced-motion: reduce` (mocked via `matchMedia`), the dashoffset transition collapses to instant (no `brickFill` motion class applied; final value rendered immediately).
  Tested by: `components/HeroRing.test.tsx`

- ID: C-m3-007
  Layer: Component
  Proves: plan.md § Components — `<HeroRing>` a11y attrs (role + aria-label + aria-live) — covers SPEC AC #42
  GIVEN `<HeroRing pct={42} />`
  WHEN rendered
  THEN the outer `<svg>` (or wrapper) has `role="img"`, `aria-label="Day score: 42%"`, `aria-live="polite"`.
  AND the inner numeral has `aria-hidden="true"` (the ring's `aria-label` is the canonical reading).
  AND when re-rendered with `pct={67}`, `aria-label` becomes `"Day score: 67%"`.
  Tested by: `components/HeroRing.test.tsx`

- ID: C-m3-008
  Layer: Component
  Proves: plan.md § Components — `<HeroRing>` SSR safety (server renders 0%, client hydrates) — covers SG-m3-17
  GIVEN `<HeroRing pct={75} />` rendered first via `renderToString` and then hydrated on the client
  WHEN the SSR pass runs
  THEN the server output's filled-arc `stroke-dashoffset` equals the full circumference (empty arc, pct=0 regardless of input).
  AND after client hydration completes (one `useEffect` tick), the dashoffset reflects the actual `pct=75`.
  AND no React hydration-mismatch warning is logged (asserted via `console.error` spy).
  Tested by: `components/HeroRing.test.tsx`

- ID: C-m3-009
  Layer: Component
  Proves: plan.md § Components — `<LooseBricksTray>` visibility predicate (hidden when literal-empty) — covers SPEC AC #5
  GIVEN `<BuildingClient>` (or test host) rendering `<LooseBricksTray>` only when `state.blocks.length > 0 || state.looseBricks.length > 0`
  WHEN parent state is `{ blocks: [], categories: [], looseBricks: [] }`
  THEN the tray is NOT in the DOM (`queryByRole('region', { name: /loose bricks/i })` returns `null`).
  AND when a block is added, the tray appears (collapsed) and the M1 empty-state card unmounts.
  AND when only a loose brick exists (zero blocks), the tray still appears.
  Tested by: `app/(building)/BuildingClient.test.tsx`

- ID: C-m3-010
  Layer: Component
  Proves: plan.md § Components — `<LooseBricksTray>` collapsed default; "+ Brick" pill in trailing position — covers SPEC AC #6, #7
  GIVEN `<LooseBricksTray looseBricks={[{ id:'r1', kind:'tick', done:false, name:'brick A', categoryId:null, parentBlockId:null }]} categories={[]} onAddBrick={vi.fn()} />`
  WHEN rendered
  THEN the outer region's `aria-expanded` is `"false"` (collapsed default).
  AND the `<BrickChip>` for `"brick A"` is in the DOM with `size="sm"`.
  AND the `+ Brick` pill is the LAST tappable element in the collapsed row (asserted via DOM order or `data-testid` ordering).
  AND the tray's measured max-height is `≤ 56 px` in collapsed state.
  Tested by: `components/LooseBricksTray.test.tsx`

- ID: C-m3-011
  Layer: Component
  Proves: plan.md § Components — `<LooseBricksTray>` chevron toggles expanded; aria-expanded updates — covers SPEC AC #9, #44
  GIVEN `<LooseBricksTray looseBricks={[{ id:'r1', kind:'tick', done:false, name:'brick A', … }]} categories={[]} onAddBrick={vi.fn()} />`
  WHEN the chevron toggle button is clicked
  THEN the outer region's `aria-expanded` becomes `"true"`.
  AND the bricks render as `size="md"` chips in vertical list order (`role="list"` `<ul>`).
  AND a `+ Brick` ghost button is at the TOP of the expanded view (full-width).
  AND clicking the chevron again returns to collapsed (`aria-expanded="false"`).
  AND the chevron icon switches between `ChevronUp` (collapsed) and `ChevronDown` (expanded).
  Tested by: `components/LooseBricksTray.test.tsx`

- ID: C-m3-012
  Layer: Component
  Proves: plan.md § Components — `<LooseBricksTray>` "+ Brick" pill always visible; calls `onAddBrick` — covers SPEC AC #7, SG-m3-15
  GIVEN `<LooseBricksTray looseBricks={[…]} onAddBrick={onAddBrick} … />`
  WHEN the `+ Brick` pill (collapsed row's trailing item) is clicked
  THEN `onAddBrick` is called once (caller wires AddBrickSheet to `parentBlockId: null`, `categoryId: null`).
  AND the same `+ Brick` button (top of expanded view) calls the same handler.
  AND with `looseBricks: []` (zero loose bricks but tray-visible because at least one block exists), the pill is STILL present in the collapsed row (it's the only tappable item).
  Tested by: `components/LooseBricksTray.test.tsx`

- ID: C-m3-013
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` Title required + autofocus — covers SPEC AC #10
  GIVEN `<AddBrickSheet open={true} parentBlockId={null} defaultCategoryId={null} categories={[]} onSave={vi.fn()} onCreateCategory={vi.fn()} onCancel={vi.fn()} />`
  WHEN rendered
  THEN the Title `<input>` has focus (asserted via `document.activeElement`).
  AND with empty Title, Save button has `aria-disabled="true"` (or `disabled`).
  AND typing a non-blank Title clears the disabled state on Save.
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-014
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` type selector (Tick default; per-type field reveal/hide) — covers SPEC AC #11, #12, #13
  GIVEN `<AddBrickSheet open={true} … />` rendered
  WHEN inspecting the type selector
  THEN three chips render in a `role="radiogroup"`: Tick (default `aria-checked="true"`), Goal (`aria-checked="false"`), Time (`aria-checked="false"`).
  AND no per-type fields render under the default Tick selection.
  AND clicking Goal changes `aria-checked` to true on Goal, false on Tick; reveals `target` (number) + `unit` (text) inputs.
  AND clicking Time hides Goal's fields and reveals a single `durationMin` (number) input.
  AND clicking back to Tick hides all per-type fields.
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-015
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` Goal validation (target ≥ 1); Save disabled until valid — covers SPEC AC #12, #15
  GIVEN `<AddBrickSheet open={true} … />` with type set to Goal and Title `"brick A"`
  WHEN target is `0` (or empty / non-integer)
  THEN Save is `aria-disabled="true"`.
  AND when target is `1`, Save becomes enabled.
  AND when target is `100` and unit is blank, Save is enabled (unit is optional per spec AC #12).
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-016
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` Time validation (durationMin ≥ 1); Save disabled until valid — covers SPEC AC #13, #15
  GIVEN `<AddBrickSheet open={true} … />` with type set to Time and Title `"brick C"`
  WHEN `durationMin` is `0` (or negative or non-integer)
  THEN Save is `aria-disabled="true"`.
  AND when `durationMin` is `30`, Save is enabled.
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-017
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` `<CategoryPicker>` pre-fill (inside-block defaults to parent block's `categoryId`; standalone blank) — covers SPEC AC #14, SG-m3-04
  GIVEN `<AddBrickSheet open={true} parentBlockId="b1" defaultCategoryId="c1" categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} … />`
  WHEN rendered
  THEN the `<CategoryPicker>` shows category `c1` with `aria-checked="true"` (pre-filled).
  AND when re-rendered with `parentBlockId={null}` and `defaultCategoryId={null}`, no category is pre-selected (all chips `aria-checked="false"`).
  AND when the parent block is uncategorized (`parentBlockId="b1"`, `defaultCategoryId={null}`), no pre-fill is applied.
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-018
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` single `<Sheet>` instance with `view: 'brick' | 'newCategory'` — covers SPEC AC #17, mirrors M2 C-m2-008/011
  GIVEN `<AddBrickSheet open={true} … />` rendered with at least one existing category
  WHEN the user taps `+ New` on the CategoryPicker
  THEN exactly ONE `<dialog>` element is in the DOM (`getAllByRole('dialog').length === 1`).
  AND the sheet's interior swaps from the brick form to the `<NewCategoryForm>` view.
  AND on the new-category Done, the form returns to the brick view AND the new category is auto-selected on the brick form.
  AND on Cancel from the new-category view, the form returns to the brick view WITHOUT persisting the in-progress category.
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-019
  Layer: Component
  Proves: plan.md § Components — `<AddBrickSheet>` swipe-down silent discard; Cancel discards — covers SPEC AC #16, #18, #20, #49
  GIVEN `<AddBrickSheet open={true} … onCancel={onCancel} />` with Title typed (form is dirty)
  WHEN the user taps Cancel (X icon)
  THEN `onCancel` is called once.
  AND no toast / undo affordance renders (silent discard per SG-m2-06 mirror).
  AND the sheet uses M0's `modalOut` motion token on close.
  AND simulating an iOS swipe-down dismiss has the same effect.
  AND under `prefers-reduced-motion: reduce` (mocked), close is instant (no `modalOut` duration).
  Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m3-020
  Layer: Component
  Proves: plan.md § Components — `<Hero>` wraps numeral in `<HeroRing>`; consumes `dayPct(state)` — covers SPEC AC #25
  GIVEN `<Hero pct={42} sub="…" />` rendered (consumer passes `dayPct(state)`)
  WHEN inspecting the DOM
  THEN `<HeroRing pct={42}>` is in the tree wrapping the numeral text node.
  AND the numeral text reads `"42%"` (`Math.round(42)`).
  AND when re-rendered with `pct={67.4}`, the numeral reads `"67%"`.
  AND when re-rendered with `pct={0}`, the numeral reads `"0%"` and the ring's filled arc is empty.
  Tested by: `components/Hero.test.tsx`

- ID: C-m3-021
  Layer: Component
  Proves: plan.md § Components — `<TimelineBlock>` tap-to-expand toggles; `aria-expanded`; bricks list `role="list"` — covers SPEC AC #1, #2, #45, SG-m3-16
  GIVEN `<TimelineBlock block={{ id:'b1', name:'block one', start:'09:00', end:'10:00', recurrence:{kind:'just-today', date:'…'}, categoryId:'c1', bricks:[{ id:'r1', kind:'tick', done:false, name:'brick A', categoryId:'c1', parentBlockId:'b1' }] }} categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} onAddBrick={vi.fn()} />`
  WHEN the block card is clicked
  THEN the outer `<button>` (or interactive element) sets `aria-expanded="true"`.
  AND a `<ul role="list">` renders with one `<li>` per `block.bricks[]` (in insertion order — SG-m3-16).
  AND a `+ Add brick` ghost button is below the list.
  AND clicking the card again returns `aria-expanded="false"` and the list/button unmount.
  AND clicking the `+ Add brick` button calls `onAddBrick("b1")`.
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-m3-022
  Layer: Component
  Proves: plan.md § Components — `<TimelineBlock>` scaffold left-bar height = `blockPct%`; color resolution — covers SPEC AC #26
  GIVEN `<TimelineBlock block={{ … bricks:[{kind:'tick', done:true, …}, {kind:'tick', done:false, …}], categoryId:'c1' }} categories={[{ id:'c1', name:'category 1', color:'#34d399' }]} />` (blockPct = 50)
  WHEN inspecting the scaffold left-bar element
  THEN its inner fill `<div>`'s inline `height` style is `"50%"`.
  AND its `background` resolves to the category color hex `"#34d399"`.
  AND when `block.categoryId === null`, the scaffold uses `var(--text-dim)`.
  AND when `bricks: []`, the scaffold height is `0%` (M3 floor — SG-m3-09).
  Tested by: `components/TimelineBlock.test.tsx`

- ID: C-m3-023
  Layer: Component
  Proves: plan.md § Components — `<BlueprintBar>` segment opacity = `0.3 + (blockPct/100 × 0.7)` clamped `[0.3, 1]` — covers SPEC AC #28
  GIVEN `<BlueprintBar blocks={[{ id:'b1', start:'09:00', end:'10:00', categoryId:'c1', bricks:[{kind:'tick', done:true, …}], … }]} categories={[{ id:'c1', color:'#34d399' }]} />` (block at blockPct = 100)
  WHEN inspecting the segment for `c1`
  THEN its inline `opacity` is `1.0` (`0.3 + (100/100 × 0.7) = 1.0`).
  AND when `blockPct = 50`, opacity is `0.65`.
  AND when `blockPct = 0` (empty bricks), opacity is `0.3` (the floor).
  AND uncategorized blocks (`categoryId: null`) remain excluded from the bar (M2 SG-m2-02 invariant — no segment rendered).
  Tested by: `components/BlueprintBar.test.tsx`

- ID: C-m3-024
  Layer: Component
  Proves: plan.md § Components — `<BuildingClient>` wires `<AddBrickSheet>` open/close + `ADD_BRICK` reducer dispatch + same-tick re-render — covers SPEC AC #3, #4, #8, #29
  GIVEN `<BuildingClient />` rendered with one block in initial state
  WHEN the user clicks the block, then `+ Add brick`, fills Title `"brick A"` (default Tick), and Saves
  THEN the reducer is dispatched with `{ type:'ADD_BRICK', brick: { id, name:'brick A', kind:'tick', done:false, categoryId:<block's>, parentBlockId:<block.id> } }`.
  AND the resulting state's `blocks[i].bricks` contains one entry with the new brick.
  AND the AddBrickSheet closes after Save.
  AND when the same flow runs via `<LooseBricksTray>` `+ Brick` pill, the reducer is dispatched with `parentBlockId: null` and the brick lands in `state.looseBricks`.
  AND adding a brick re-renders BlueprintBar opacity / Hero pct / scaffold height in the same React tick (no flash of stale data).
  Tested by: `app/(building)/BuildingClient.test.tsx`

### E2E (Playwright)

- ID: E-m3-001
  Layer: E2E
  Proves: plan.md § Components — full happy path: Add tick brick inside a block — covers SPEC AC #1, #2, #3, #4, #21, #22, #50
  GIVEN a fresh Building view with at least one block (preceding step adds it via M2's `+` flow OR seeded into the URL hash for test convenience)
  WHEN the user taps the block card → expanded view opens → taps `+ Add brick` → types Title `"brick A"` → leaves Type as Tick (default) → taps Save
  THEN the Add Brick sheet closes.
  AND the block remains expanded; the new brick chip `"brick A"` renders in the list at 0% (foreground gradient width = 0).
  AND no horizontal overflow at 430 px viewport.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-002
  Layer: E2E
  Proves: plan.md § Components — Add goal brick inside a block — covers SPEC AC #11, #12, #15, #19
  GIVEN a Building view with at least one block, expanded
  WHEN user taps `+ Add brick` → Title `"brick B"` → Type chip `Goal` → target `100` → unit `"reps"` → Save
  THEN the new chip renders with badge `"0 / 100 reps"` and foreground width `0%`.
  AND the chip is appended to that block's list in insertion order.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-003
  Layer: E2E
  Proves: plan.md § Components — Add time brick inside a block — covers SPEC AC #13, #15, #19
  GIVEN a Building view with at least one block, expanded
  WHEN user taps `+ Add brick` → Title `"brick C"` → Type chip `Time` → target minutes `30` → Save
  THEN the new chip renders with badge `"0 / 30 m"` plus the play-icon glyph.
  AND foreground width is `0%`.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-004
  Layer: E2E
  Proves: plan.md § Components — Add standalone brick via Loose Bricks tray — covers SPEC AC #5, #7, #8, #19
  GIVEN a Building view that has at least one block (so the tray is visible per SPEC AC #5)
  WHEN the user taps the tray's `+ Brick` pill → Title `"brick D"` → leaves Type as Tick → Save
  THEN the AddBrickSheet closes.
  AND the new chip `"brick D"` renders inside the Loose Bricks tray's collapsed row at 0%.
  AND `state.looseBricks.length === 1` (asserted via DOM presence + chip count in the tray region).
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-005
  Layer: E2E
  Proves: plan.md § Components — Validation paths in AddBrickSheet — covers SPEC AC #15, #22, #23
  GIVEN AddBrickSheet open
  WHEN Title is empty
  THEN Save is `aria-disabled="true"`.
  AND when Type is Goal but target is `0`, Save is disabled.
  AND when Type is Time but durationMin is `0`, Save is disabled.
  AND once all required fields are valid (Title non-blank + per-type valid), Save becomes enabled and a `success` haptic fires on tap.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-006
  Layer: E2E
  Proves: plan.md § Components — Sheet swipe-down + Cancel both silent-discard — covers SPEC AC #16, #18, #20
  GIVEN AddBrickSheet open with Title typed (dirty form)
  WHEN the user taps the Cancel `X` icon
  THEN the sheet closes.
  AND no toast / undo affordance renders.
  AND no brick is appended anywhere (state unchanged).
  AND simulating an iOS swipe-down on the sheet's drag handle has the same effect.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-007
  Layer: E2E
  Proves: plan.md § Components — Block tap-to-expand toggles correctly — covers SPEC AC #1, #2, #29, SG-m3-06
  GIVEN a Building view with at least one block (collapsed by default)
  WHEN the user taps the block card
  THEN it expands (visible bricks list region appears below the card metadata) and `aria-expanded="true"`.
  AND tapping the block again collapses (`aria-expanded="false"`).
  AND while the block is expanded, taps on the inner `<BrickChip>`s are no-ops (M3 ships no brick logging — M4).
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-008
  Layer: E2E
  Proves: plan.md § Components — Loose Bricks tray hidden in literal-empty state — covers SPEC AC #5, SG-m3-08
  GIVEN a fresh Building view with `state.blocks=[]` AND `state.looseBricks=[]`
  WHEN the page renders
  THEN the Loose Bricks tray is NOT in the DOM (`queryByRole('region', { name: /loose bricks/i })` returns null).
  AND the M1 empty-state card `"Tap any slot to lay your first block."` IS visible.
  AND once a block is added via the `+` flow, the tray appears (collapsed) and the empty-state card unmounts.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-009
  Layer: E2E
  Proves: plan.md § Components — Loose Bricks tray chevron expand/collapse — covers SPEC AC #9, #50
  GIVEN a Building view with the tray visible AND at least one loose brick
  WHEN the user taps the chevron-up icon
  THEN the tray expands (max-height grows from ≈ 56 px to ≈ 40 vh).
  AND the chevron icon flips to chevron-down.
  AND tapping it again collapses the tray.
  AND the expand/collapse state resets to collapsed on page refresh (no M8 persistence).
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-010
  Layer: E2E
  Proves: plan.md § Files unchanged — `<SlotTapTargets>` pass-through preserved (M2 C-m2-013 invariant); negative test for M3
  GIVEN a Building view with at least one block AND Edit Mode toggled ON via the `<TopBar>` pencil
  WHEN inspecting the DOM under the timeline grid
  THEN `<SlotTapTargets>` returns null in edit mode (no slot buttons render — preserves M2 C-m2-013).
  AND in view mode, the 24 hour-row buttons render as before.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-011
  Layer: E2E
  Proves: plan.md § Components — Edit-mode no-op: block tap-to-expand still works in edit mode — covers SPEC AC #40
  GIVEN a Building view with at least one block AND Edit Mode toggled ON
  WHEN the user taps the block card
  THEN it expands (M3 ships no edit-mode-specific affordances; the tap behavior is the same as view mode).
  AND `+ Add brick` is still tappable.
  AND the Loose Bricks tray's `+ Brick` pill is still tappable.
  AND no jiggle / × / drag-handle affordances render (those are M5).
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-012
  Layer: E2E
  Proves: plan.md § Components — Mobile viewport 430 px: no horizontal overflow with sheet open — covers SPEC AC #50
  GIVEN viewport set to 430 × 932 (M2 baseline)
  WHEN the AddBrickSheet is open with Type = Goal and all fields filled
  THEN `document.documentElement.scrollWidth === 430` (no horizontal scrollbar).
  AND when the Loose Bricks tray is expanded with 5+ chips, page-level horizontal overflow is still zero.
  Tested by: `tests/e2e/m3.spec.ts`

- ID: E-m3-013
  Layer: E2E
  Proves: plan.md § Components — `<HeroRing>` renders + reflects 0% at session start — covers SPEC AC #24, #25, #50
  GIVEN a fresh Building view (no blocks, no loose bricks; literal-empty state)
  WHEN the page first renders post-mount
  THEN the `<HeroRing>` SVG is visible.
  AND the numeral text reads `"0%"`.
  AND the filled arc's `stroke-dashoffset` equals the full circumference (empty arc).
  AND when a block is added (no bricks yet), HeroRing stays at `"0%"` (block with `bricks: []` floors at 0 in M3).
  Tested by: `tests/e2e/m3.spec.ts`

### Accessibility (axe via Playwright)

- ID: A-m3-001
  Layer: A11y
  Proves: plan.md § Components — axe-core zero violations on day view (post-add-brick) — covers SPEC AC #46
  GIVEN a Building view with one block containing one tick brick AND the Loose Bricks tray collapsed with one loose brick
  WHEN axe-core runs against the day view
  THEN it returns zero violations across all rule categories.
  Tested by: `tests/e2e/m3.a11y.spec.ts`

- ID: A-m3-002
  Layer: A11y
  Proves: plan.md § Components — axe-core zero violations on AddBrickSheet open + focus trap — covers SPEC AC #41, #46
  GIVEN AddBrickSheet open
  WHEN axe-core runs against the page
  THEN it returns zero violations.
  AND tabbing through the sheet's interactive elements cycles focus within the sheet (focus trap; no escape to the underlying page).
  AND tab order matches visual order (Title → Type chips → per-type fields → Category picker → Save → Cancel — bidirectional via Shift+Tab).
  Tested by: `tests/e2e/m3.a11y.spec.ts`

- ID: A-m3-003
  Layer: A11y
  Proves: plan.md § Components — axe-core zero violations on expanded block; `role="list"` + `aria-expanded` — covers SPEC AC #45, #46
  GIVEN a Building view with at least one block expanded (containing one or more bricks)
  WHEN axe-core runs against the page
  THEN it returns zero violations.
  AND the block's outer interactive element has `aria-expanded="true"`.
  AND the bricks list has `role="list"` with one `role="listitem"` per brick (or implicit via `<ul>` / `<li>`).
  Tested by: `tests/e2e/m3.a11y.spec.ts`

- ID: A-m3-004
  Layer: A11y
  Proves: plan.md § Components — axe-core zero violations on expanded Loose Bricks tray; `role="region"` + `aria-expanded` + `aria-controls` — covers SPEC AC #44, #46
  GIVEN a Building view with the Loose Bricks tray expanded (containing at least one loose brick)
  WHEN axe-core runs against the page
  THEN it returns zero violations.
  AND the tray's outer element has `role="region"` and `aria-label="Loose bricks"` and `aria-expanded="true"`.
  AND the chevron toggle button has `aria-controls` pointing at the bricks list region's id.
  Tested by: `tests/e2e/m3.a11y.spec.ts`

- ID: A-m3-005
  Layer: A11y
  Proves: plan.md § Components — `<HeroRing>` `aria-live="polite"` announces day-score change — covers SPEC AC #42
  GIVEN a Building view rendered with `dayPct = 0`
  WHEN state changes such that `dayPct` updates to a new value (state-injection helper since M3 has no logging UI)
  THEN the `<HeroRing>` `aria-label` updates to reflect the new percentage (`"Day score: <new>%"`).
  AND the polite live region is asserted via accessibility-tree snapshot — `aria-live="polite"` attribute is present and the label changed.
  Tested by: `tests/e2e/m3.a11y.spec.ts`

- ID: A-m3-006
  Layer: A11y
  Proves: plan.md § Components — Touch targets ≥ 44 px on M3 surfaces — covers SPEC AC #41, ADR-031, SG-m3-13
  GIVEN a Building view with the Loose Bricks tray collapsed (containing one loose brick) AND AddBrickSheet open with type-selector visible
  WHEN measuring each interactive element's bounding rect
  THEN `<BrickChip>` (sm + md) ≥ 44 px tall.
  AND the `+ Brick` pill ≥ 44 px tall.
  AND the chevron toggle button ≥ 44 × 44 px.
  AND each type-selector chip card (Tick / Goal / Time) ≥ 44 × 44 px.
  Tested by: `tests/e2e/m3.a11y.spec.ts`

### Spec gaps

- **SG-m3-01 — Brick category FK.** **LOCKED** (mirrors M2 SG-m2-07 ratification). Tests assume `categoryId: string | null` on every Brick.
- **SG-m3-02 — Loose Bricks tray location: pinned above dock.** **LOCKED Gate #2 (M2 ship-react).** Tests `C-m3-009..012`, `E-m3-008..009` enforce.
- **SG-m3-03 — Bricks: embedded under blocks (`block.bricks[]`) + flat for standalone (`state.looseBricks[]`).** **LOCKED.** Tests `U-m3-009..010` enforce the routing.
- **SG-m3-04 — Inside-block brick category default = parent block's `categoryId`.** **LOCKED.** Test `C-m3-017` enforces.
- **SG-m3-05 — 100% bloom + chime + fireworks: ship the wiring in M3 (state-injection-tested only).** **LOCKED.** Test `U-m3-012` covers the cross-detection logic; the user-driven trigger arrives in M4.
- **SG-m3-06 — Block expand: tap-to-expand in view mode; max-height transition 200 ms; re-tap collapses; no FLIP.** **LOCKED.** Test `C-m3-021` + `E-m3-007` enforce.
- **SG-m3-07 — `<HeroRing>` introduced now (SVG `stroke-dasharray` / `stroke-dashoffset`).** **LOCKED.** Tests `C-m3-006..008` + `C-m3-020` enforce.
- **SG-m3-08 — `+ Brick` verb lives only inside the Loose Bricks tray.** **LOCKED.** Tests `C-m3-012` + `E-m3-004` enforce; no test exercises a BottomBar long-press menu (none exists).
- **SG-m3-09 — Empty-block scoring: `blockPct({ bricks: [] }) === 0` in M3.** **LOCKED.** Test `U-m3-004` enforces.
- **SG-m3-10 — `dayPct(state)` averages over `(blocks ∪ looseBricks)`; empty-state floor 0.** **LOCKED.** Tests `U-m3-006..007` enforce; the call-site migration of `Hero pct={…}` is covered by `C-m3-020`.
- **SG-m3-11 — Bloom + fireworks reduced-motion suppressed; chime + haptics still fire.** **LOCKED.** `C-m3-006` covers reduced-motion ring; `U-m3-012` covers the cross-up logic; `C-m3-019` covers reduced-motion sheet close.
- **SG-m3-12 — Chime asset = `public/sounds/chime.mp3`, OS handles mute.** **LOCKED.** Tests do NOT assert against the static asset directly; the celebrations module verification (`U-m3-012`) covers the `fn()` invocation, with the Audio API call stubbed.
- **SG-m3-13 — BrickChip touch target ≥ 44 px.** **LOCKED.** Tests `C-m3-005` + `A-m3-006` enforce.
- **SG-m3-14 — `<LooseBricksTray>` z-index < `<AddBrickSheet>` z-index.** **LOCKED.** No dedicated test — covered implicitly by the M2 `<AddBlockSheet>` z-index reuse + the "no horizontal overflow" e2e. Add a test if regression appears.
- **SG-m3-15 — `+ Brick` pill always visible in collapsed row.** **LOCKED.** Test `C-m3-012` enforces (including the zero-loose-bricks case).
- **SG-m3-16 — `Block.bricks` ordering = insertion order in expanded view.** **LOCKED.** Test `C-m3-021` enforces (asserts list order matches `block.bricks[]`).
- **SG-m3-17 — `<HeroRing>` SSR safety: server renders 0%, client hydrates.** **LOCKED.** Test `C-m3-008` enforces.
- **SG-m3-18 — Stagger fade-in: 30 ms on first paint of expanded block; 0 ms for single-element insert.** **LOCKED.** Coverage: `E-m3-001..004` happy paths assert chip presence after Save; `C-m3-021` initial render asserts list order. The stagger is governed by Framer Motion variants on the parent list — asserted via the `motion` token contract.

### Coverage map (SPEC AC #1..#50 → IDs)

| AC  | Description                                                                       | Test IDs                                                        |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| #1  | Tap-to-expand toggles block state                                                 | C-m3-021, E-m3-007, E-m3-011                                    |
| #2  | Expanded reveals BrickChip list + `+ Add brick` button                            | C-m3-021, E-m3-001                                              |
| #3  | `+ Add brick` opens AddBrickSheet (parentBlockId + categoryId pre-fill)           | C-m3-024, E-m3-001                                              |
| #4  | On Save inside-block: brick appended to `block.bricks[]`                          | U-m3-009, C-m3-024, E-m3-001                                    |
| #5  | Loose Bricks tray visibility predicate                                            | C-m3-009, E-m3-008                                              |
| #6  | Tray pinned above dock; collapsed default; max-height 56 px                       | C-m3-010                                                        |
| #7  | `+ Brick` pill opens AddBrickSheet (parentBlockId: null, categoryId: null)        | C-m3-012, E-m3-004                                              |
| #8  | On Save standalone: brick appended to `state.looseBricks[]`                       | U-m3-010, C-m3-024, E-m3-004                                    |
| #9  | Tray chevron expand/collapse; resets on refresh                                   | C-m3-011, E-m3-009                                              |
| #10 | Title required + autofocus                                                        | C-m3-013                                                        |
| #11 | Type selector (Tick/Goal/Time, default Tick)                                      | C-m3-014, E-m3-002                                              |
| #12 | Goal reveal/hide + target/unit fields                                             | C-m3-014, C-m3-015, E-m3-002                                    |
| #13 | Time reveal/hide + durationMin field                                              | C-m3-014, C-m3-016, E-m3-003                                    |
| #14 | Category picker pre-fill (inside-block / standalone)                              | C-m3-017                                                        |
| #15 | Save disabled until Title + per-type valid                                        | C-m3-013, C-m3-015, C-m3-016, E-m3-005                          |
| #16 | Cancel discards sheet state                                                       | C-m3-019, E-m3-006                                              |
| #17 | New-category creation (single Sheet + view toggle)                                | C-m3-018                                                        |
| #18 | Sheet swipe-down silent discard                                                   | C-m3-019, E-m3-006                                              |
| #19 | On Save: brick appended to appropriate slot                                       | U-m3-009, U-m3-010, E-m3-002, E-m3-003, E-m3-004                |
| #20 | Sheet slides down via M0 `modalOut`; reduced-motion → instant                     | C-m3-019                                                        |
| #21 | New chip enters at progress = 0 (empty fill)                                      | C-m3-001, E-m3-001                                              |
| #22 | Chip displays title + type-badge + category color (uncategorized → `--surface-2`) | C-m3-001, C-m3-002, C-m3-003, C-m3-004                          |
| #23 | Saved brick matches Brick discriminated union                                     | U-m3-009, U-m3-010, E-m3-005                                    |
| #24 | HeroRing stroke-dashoffset = `(1 − pct/100) × C`                                  | C-m3-006, C-m3-008, E-m3-013                                    |
| #25 | Hero numeral updates synchronously with ring                                      | C-m3-020, E-m3-013                                              |
| #26 | Block scaffold left-bar height = `blockPct%`; color resolved                      | C-m3-022                                                        |
| #27 | BrickChip foreground gradient width = `brickPct%`; brickFill animation            | C-m3-002, C-m3-003                                              |
| #28 | BlueprintBar segment opacity = `0.3 + (blockPct/100 × 0.7)`                       | C-m3-023                                                        |
| #29 | State changes re-render dependent views in same React tick                        | C-m3-024, E-m3-007                                              |
| #30 | brickPct tick (0/100)                                                             | U-m3-001                                                        |
| #31 | brickPct goal (50%, 100, cap, 0, zero-target)                                     | U-m3-002                                                        |
| #32 | brickPct time (50%, 100, cap, 0, zero-duration)                                   | U-m3-003                                                        |
| #33 | blockPct empty → 0; non-empty → mean                                              | U-m3-004, U-m3-005                                              |
| #34 | dayPct(state) empty → 0; mixed mean                                               | U-m3-006, U-m3-007                                              |
| #35 | categoryDayPct filtering (cross-cat brick attribution; null exclusion)            | U-m3-008                                                        |
| #36 | Block 100% cross-up: bloom + chime + `success` haptic                             | U-m3-012                                                        |
| #37 | Day 100% cross-up: fireworks + `notification` haptic                              | U-m3-012                                                        |
| #38 | One-shot per crossing rule (drop + cross again refires)                           | U-m3-012 (deferred-by-design — state injection only)            |
| #39 | Reduced-motion suppresses bloom + fireworks; haptics + chime still fire           | C-m3-006, C-m3-019, U-m3-012                                    |
| #40 | Edit-mode no-op: expand + tray "+Brick" still functional                          | E-m3-011                                                        |
| #41 | Touch targets ≥ 44 px; tab order; focus trap                                      | A-m3-002, A-m3-006                                              |
| #42 | HeroRing role + aria-label + aria-live                                            | C-m3-007, A-m3-005                                              |
| #43 | BrickChip aria-label per kind + type-specific suffix                              | C-m3-001, C-m3-002, C-m3-003, C-m3-004                          |
| #44 | LooseBricksTray role="region" + aria-expanded + aria-controls                     | C-m3-011, A-m3-004                                              |
| #45 | Block aria-expanded + bricks list role="list"                                     | C-m3-021, A-m3-003                                              |
| #46 | axe-core zero violations on 4 surfaces                                            | A-m3-001, A-m3-002, A-m3-003, A-m3-004                          |
| #47 | `tsc --noEmit` zero new errors                                                    | (covered by `npm run eval` composite gate — deferred-by-design) |
| #48 | ESLint zero new warnings                                                          | (covered by `npm run eval` composite gate — deferred-by-design) |
| #49 | `prefers-reduced-motion`: ring + chip + bloom + fireworks collapse                | C-m3-006, C-m3-019                                              |
| #50 | Playwright: full happy paths + tray + HeroRing + mobile 430 px                    | E-m3-001, E-m3-004, E-m3-009, E-m3-012, E-m3-013                |

---

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

## Milestone 4b — Goal Brick Stepper — Tests

Derived from `/docs/plan.md § Milestone 4b — Goal Brick Stepper — Plan` (commit `f116a21`). M4b adds the **second** user-driven verb (count steppers on goal bricks): one new reducer arm (`LOG_GOAL_BRICK`), `−` / `+` controls inside `<BrickChip>` for `kind === "goal"`, and a `lib/longPress.ts` auto-repeat hook. Tick + time chip behavior is regression-checked unchanged. Coverage spans 27 SPEC ACs across Unit/Data, Component, E2E, and A11y layers; auto-repeat assertions use `vi.useFakeTimers()` (Vitest) and explicit Playwright waits with ±20 ms tolerance (E2E). All A-m4b-_ and E-m4b-_ tests seed deterministic state (fixture / `addInitScript`) — no `if ((await x.count()) > 0)` vacuous-pass guards, per EVALUATOR's M4a flag.

### Unit (Vitest)

#### U-m4b-001

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing one block with a goal brick `{ id: "g1", kind: "goal", count: 3, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }`
**THEN** the returned state's matching brick has `count === 4`; `target`, `unit`, and all other fields are deep-equal to the input.
Proves: plan.md § Locked schema additions (reducer arm sketch — increment path) — covers SPEC AC #4

#### U-m4b-002

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing one block with a goal brick `{ id: "g1", kind: "goal", count: 4, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: -1 }`
**THEN** the returned state's matching brick has `count === 3`; all other fields deep-equal.
Proves: plan.md § Locked schema additions (decrement path) — covers SPEC AC #5

#### U-m4b-003

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing a goal brick `{ id: "g1", kind: "goal", count: 10, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }` (clamp at top)
**THEN** the returned state is the **same reference** as the input state (`prevState === nextState`); brick `count` remains `10`.
Proves: plan.md § Locked schema additions ("identity short-circuit … return the original state by reference") + § Cross-cutting concerns #5 — covers SPEC AC #4 (clamp), edge-case "Tap + at count === target"

#### U-m4b-004

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` containing a goal brick `{ id: "g1", kind: "goal", count: 0, target: 10 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: -1 }` (clamp at bottom)
**THEN** the returned state is the same reference as the input state; brick `count` remains `0`.
Proves: plan.md § Locked schema additions (clamp identity short-circuit) — covers SPEC AC #5 (clamp), edge-case "Tap − at count === 0"

#### U-m4b-005

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a goal brick `{ id: "lg1", kind: "goal", count: 2, target: 5 }` only in `state.looseBricks` (no blocks contain it)
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "lg1", delta: 1 }`
**THEN** the returned state's `looseBricks` entry has `count === 3`; `state.blocks` array is reference-equal to the input's `state.blocks` (only loose array changes).
Proves: plan.md § File structure (`lib/data.ts` row — "Routes by `brickId` across `state.blocks[*].bricks[]` then `state.looseBricks[]`") — covers SPEC AC #4

#### U-m4b-006

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a goal brick `{ id: "g1", count: 2, target: 5 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "does-not-exist", delta: 1 }`
**THEN** the returned state is the same reference as the input state (id-not-found → no-op identity).
Proves: plan.md § Edge cases ("Brick id collision: defensive — reducer matches by id AND `kind === \"goal\"`") — covers SPEC AC #4 defensiveness

#### U-m4b-007

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a tick brick `{ id: "t1", kind: "tick", done: false }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "t1", delta: 1 }` (kind mismatch — id matches a tick brick)
**THEN** the returned state is the same reference as the input; the tick brick still has `done === false`; no `count` field appears on it.
Proves: plan.md § Locked schema additions ("Non-goal id matches are no-ops") + § Edge cases (brick-id-collision defense) — covers SPEC AC #18 (tick brick unchanged)

#### U-m4b-008

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with a time brick `{ id: "tm1", kind: "time", elapsedMs: 0, durationMs: 600000 }`
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "tm1", delta: 1 }` (kind mismatch — id matches a time brick)
**THEN** the returned state is the same reference as the input; the time brick is deep-equal to the input.
Proves: plan.md § Locked schema additions (kind-guard) — covers SPEC AC #19 (time brick unchanged)

#### U-m4b-009

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` `prevState` with a goal brick `{ id: "g1", count: 2, target: 5 }`
**WHEN** the reducer returns `nextState` for `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }` (real change)
**THEN** `prevState !== nextState` (new top-level reference) AND `prevState.blocks` array reference is preserved on the previous state (no in-place mutation observable on the prior reference).
Proves: plan.md § Locked schema additions ("The reducer never mutates in place") — covers SPEC AC #4 (immutability invariant)

#### U-m4b-010

Target file: `lib/data.test.ts`
**GIVEN** the reducer's exhaustive `Action` union now including `LOG_GOAL_BRICK` (M4b extension)
**WHEN** an unknown action shape (`{ type: "__never__" } as never`) is passed to the reducer
**THEN** TypeScript compile fails OR the `default` branch's `assertNever` throws at runtime, proving the new union member is exhaustively handled.
Proves: plan.md § Locked schema additions ("`assertNever` arm preserved") + § Decisions to honor ("`assertNever` exhaustiveness") — covers SPEC AC #24

#### U-m4b-011

Target file: `lib/data.test.ts`
**GIVEN** a goal brick `{ id: "g1", count: 0, target: 0 }` (degenerate `target === 0` case)
**WHEN** the reducer is called with `{ type: "LOG_GOAL_BRICK", brickId: "g1", delta: 1 }`
**THEN** the returned state is the same reference as the input (clamp at the degenerate boundary).
Proves: plan.md § Edge cases ("`target === 0` (degenerate user input)") — defensive coverage

#### U-m4b-012

Target file: `lib/longPress.test.ts`
**GIVEN** the module `lib/longPress.ts` exporting named constants `HOLD_MS` and `INTERVAL_MS`
**WHEN** the constants are imported and read
**THEN** `HOLD_MS === 500` AND `INTERVAL_MS === 50` (literal equality, not `>=`).
Proves: plan.md § Long-press / auto-repeat strategy ("`HOLD_MS = 500`, `INTERVAL_MS = 50`") + SG-m4b-02 lock — pins the timing constants numerically

#### U-m4b-013

Target file: `lib/longPress.test.ts`
**GIVEN** `vi.useFakeTimers()` is active and the `useLongPressRepeat` hook is mounted (via `renderHook`) with an `onTick` spy and `enabled: true`
**WHEN** the returned `onPointerDown` is invoked, then `vi.advanceTimersByTime(500)` (HOLD_MS), then `vi.advanceTimersByTime(50)` repeated 3 times, then `onPointerUp` is invoked, then `vi.advanceTimersByTime(500)` more
**THEN** `onTick` was called: 1 × on `pointerdown` (initial), then 1 × at `t = 500 ms` (auto-repeat starts), then 3 × at 50 ms intervals, total 5 calls; **after** `pointerup`, no further calls fire even after the additional 500 ms wait.
Proves: plan.md § Long-press / auto-repeat strategy ("on `pointerdown`, … (a) immediately calls `onTick()`, … (c) `setInterval(intervalMs)` … On `pointerup` … both timers are cleared") — covers SPEC AC #10, #11

#### U-m4b-014

Target file: `lib/longPress.test.ts`
**GIVEN** `useLongPressRepeat` mounted with `onTick` spy and `enabled: true`, fake timers active, `onPointerDown` invoked, then `vi.advanceTimersByTime(700)` (past HOLD_MS, into auto-repeat)
**WHEN** the hook is re-rendered (or its prop) with `enabled: false`, then `vi.advanceTimersByTime(200)`
**THEN** no further `onTick` calls fire after the `enabled: false` flip; the in-flight interval is cleared proactively.
Proves: plan.md § Long-press / auto-repeat strategy ("when the button becomes disabled during a held press … the hook clears its timers proactively") + § Cross-cutting concerns #7 — covers SPEC AC #11 (auto-repeat stops on cap)

### Component (Vitest + Testing Library)

#### C-m4b-001

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ kind: "goal", id: "g1", name: "pushups", count: 2, target: 10, unit: "reps" }` and an `onGoalLog` spy
**WHEN** the rendered DOM is queried by role
**THEN** there are exactly two `<button>` elements inside the chip: one with accessible name `"Decrease pushups"` and one with accessible name `"Increase pushups"`. The outer chip wrapper is a `<div role="group">` (not a `<button>`); a flex layout positions title left, then `−`, then a centered numeric badge, then `+`.
Proves: plan.md § Components > BrickChip ("DOM shape for `kind === \"goal\"`: outer `<div role=\"group\">` … (c) the two stepper buttons") + SG-m4b-01 (flanking layout) — covers SPEC AC #1 (controls render), #21 (aria-labels)

#### C-m4b-002

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered for a goal brick at the M3/M4a chip layout, in a fixed-width container
**WHEN** `getBoundingClientRect()` is read on the `−` `<button>` and the `+` `<button>` (or `getComputedStyle().minWidth` / `.minHeight` is read)
**THEN** each control has both `min-width` ≥ 44 (px) and `min-height` ≥ 44 (px) per ADR-031.
Proves: plan.md § Components > BrickChip ("each button is its own `<button type=\"button\">` with `min-width: 44px`, `min-height: 44px`") + § Decisions to honor (ADR-031) — covers SPEC AC #1

#### C-m4b-003

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 0, target: 10 }`
**WHEN** the DOM is queried for the `−` and `+` buttons
**THEN** the `−` button has the `disabled` attribute set; the `+` button does NOT have `disabled`.
Proves: plan.md § Components > BrickChip ("`−` is `disabled` … when `count === 0`") — covers SPEC AC #3

#### C-m4b-004

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 10, target: 10 }`
**WHEN** the DOM is queried for the `−` and `+` buttons
**THEN** the `+` button has the `disabled` attribute set; the `−` button does NOT have `disabled`.
Proves: plan.md § Components > BrickChip ("`+` is `disabled` when `count === target`") — covers SPEC AC #3

#### C-m4b-005

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, an `onGoalLog` spy, and `lib/haptics.light` mocked
**WHEN** the user fires a single tap (`pointerdown` → `pointerup` within < 500 ms) on the `+` button
**THEN** `onGoalLog` is called exactly once with `("g1", 1)`; `haptics.light` is called exactly once; `haptics.medium` is NOT called.
Proves: plan.md § Components > BrickChip ("`pointerdown` on `+` → `haptics.light()` + `onGoalLog?.(brick.id, 1)` synchronously") — covers SPEC AC #4, #8

#### C-m4b-006

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, an `onGoalLog` spy, and `lib/haptics.light` mocked
**WHEN** the user fires a single tap on the `−` button
**THEN** `onGoalLog` is called exactly once with `("g1", -1)`; `haptics.light` is called exactly once; `haptics.medium` is NOT called.
Proves: plan.md § Components > BrickChip (decrement path mirrored) — covers SPEC AC #5, #8

#### C-m4b-007

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 10, target: 10 }` (at cap), `onGoalLog` and `lib/haptics.light` / `lib/haptics.medium` spies
**WHEN** the user attempts to tap the `+` button (the chip's renderer must allow the haptic-classifier path to fire even though the underlying `<button disabled>` would normally swallow `pointerdown`; per plan.md the chip computes the clamp-haptic decision **before** dispatch — verify this by simulating the press path the renderer uses)
**THEN** `onGoalLog` is NOT called (clamp path); `haptics.light` is NOT called; `haptics.medium` IS called exactly once.
Proves: plan.md § Components > BrickChip ("each clamp tick fires `medium` … computed from `brick.count` and `delta` against `[0, target]` **before** dispatch") + SG-m4b-05 — covers SPEC AC #9

#### C-m4b-008

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 0, target: 10 }` (at floor) and `haptics` spies
**WHEN** the chip's renderer evaluates a `−` press through the same clamp-haptic-before-dispatch path
**THEN** `onGoalLog` is NOT called; `haptics.light` is NOT called; `haptics.medium` IS called exactly once.
Proves: plan.md § Components > BrickChip (clamp-haptic, decrement at floor) + SG-m4b-05 — covers SPEC AC #9

#### C-m4b-009

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10, unit: "reps" }` (unit non-empty) and again with `{ count: 3, target: 10, unit: "" }` (unit empty)
**WHEN** the badge text content is read for each render
**THEN** the first renders `"3 / 10 reps"` (single space separator before unit); the second renders `"3 / 10"` with no trailing whitespace.
Proves: plan.md § Components > BrickChip ("Badge text format: `\"${count} / ${target}${unit ? ' ' + unit : ''}\"`") + § Edge cases ("`unit` is empty string") — covers SPEC AC #7

#### C-m4b-010

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10 }` and `useReducedMotion()` stubbed `false`
**WHEN** the `data-testid="brick-fill"` div is inspected
**THEN** its computed (or inline) `width` is `30%` and its `transition` includes `width 600ms ease-in-out` (M3 token `brickFill`).
Proves: plan.md § Components > BrickChip ("Chip foreground gradient width = `(count / target) × 100%`") + § Visual cascade step 3 — covers SPEC AC #6

#### C-m4b-011

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same goal chip as C-m4b-010 but with `useReducedMotion()` stubbed `true`
**WHEN** the `data-testid="brick-fill"` div is inspected
**THEN** its `transition` for `width` is `none` (or `0ms`) — fill animation collapses to instant; `width` is still `30%`.
Proves: plan.md § Reduced motion ("Chip foreground gradient `width` transition: collapses to `none`") — covers SPEC AC #20

#### C-m4b-012

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, `vi.useFakeTimers()` active, `onGoalLog` spy, `haptics.light` mocked
**WHEN** the user dispatches a `pointerdown` on `+`, then `vi.advanceTimersByTime(500)` (HOLD_MS), then `vi.advanceTimersByTime(50)` four times (auto-repeat ticks), then `pointerup`
**THEN** `onGoalLog` is called 1 (initial) + 1 (HOLD_MS auto-repeat start) + 4 (interval ticks) = 6 times, all with `("g1", 1)`; `haptics.light` is called 6 times; `haptics.medium` is never called (no clamp).
Proves: plan.md § Long-press / auto-repeat strategy + § Components > BrickChip (long-press wired) — covers SPEC AC #10, #13

#### C-m4b-013

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same harness as C-m4b-012, mid-burst at 4 auto-repeat ticks
**WHEN** the user dispatches `pointerup` on the `+` button, then `vi.advanceTimersByTime(500)` more
**THEN** no additional `onGoalLog` calls fire after `pointerup`; haptic call count freezes at the pre-release count.
Proves: plan.md § Long-press / auto-repeat ("On `pointerup`, `pointercancel`, or `pointerleave`, both timers are cleared") + § Edge cases ("Long-press release mid-burst: all timers cleared within one frame") — covers SPEC AC #11

#### C-m4b-014

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ count: 3, target: 10 }`, `useReducedMotion()` stubbed `false`, `vi.useFakeTimers()` active
**WHEN** an auto-repeat tick fires (the chip's internal scale-press flag should set, then clear after ~80 ms)
**THEN** at the moment of tick the active stepper button's `transform` (or a corresponding state-driven class) reflects `scale(0.95)`; after `vi.advanceTimersByTime(80)`, the transform returns to `scale(1)`. The non-active stepper button's transform is unaffected.
Proves: plan.md § Components > BrickChip ("`transform: scale(0.95)` for ~80 ms, returning to `scale(1)` on the active stepper button only") + SG-m4b-03 — covers SPEC AC #20 (visual feedback path)

#### C-m4b-015

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same harness as C-m4b-014 but with `useReducedMotion()` stubbed `true`
**WHEN** an auto-repeat tick fires
**THEN** no `transform: scale(0.95)` is applied to either stepper button at any point; `haptics.light` and `onGoalLog` continue to fire normally.
Proves: plan.md § Reduced motion ("Long-press scale-press visual feedback (M4b new): suppressed under `prefers-reduced-motion: reduce`. Haptics + dispatch unaffected") + SG-m4b-03 — covers SPEC AC #20

#### C-m4b-016

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ id: "g1", count: 3, target: 10 }`, `onGoalLog` spy, `vi.useFakeTimers()` active
**WHEN** the user fires a keyboard `Enter` (and separately a `Space`) on the `+` button, then `vi.advanceTimersByTime(2000)`
**THEN** `onGoalLog` is called exactly once per activation (one for Enter, one for Space — total 2); no auto-repeat ticks fire from keyboard activation even after 2 s of advanced time.
Proves: plan.md § Components > BrickChip ("native `<button>` already handles Enter and Space … keyboard does NOT auto-repeat") — covers SPEC AC #22

#### C-m4b-017

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip>` rendered with a goal brick `{ name: "pushups", count: 3, target: 10, unit: "reps" }`
**WHEN** the DOM is queried by accessible name
**THEN** the `−` button's `aria-label` is exactly `"Decrease pushups"`; the `+` button's `aria-label` is exactly `"Increase pushups"`; the lucide `Minus` / `Plus` icon glyphs each carry `aria-hidden="true"`.
Proves: plan.md § A11y ("`aria-label=\"Decrease ${brick.name}\"` / `\"Increase ${brick.name}\"`") + AC #21 quote — covers SPEC AC #21

#### C-m4b-018

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick `<BrickChip>` (M4a brick `{ kind: "tick", done: false }`) rendered alongside an `onGoalLog` spy and an `onTickToggle` spy
**WHEN** the chip's tick `<button>` is clicked
**THEN** `onTickToggle` is called once with the brick id; `onGoalLog` is NOT called; the rendered chip remains a single `<button>` (not the goal `<div role="group">` shape).
Proves: plan.md § File structure (`components/BrickChip.tsx` row — "Tick chips remain a single `<button>` exactly as M4a") — covers SPEC AC #18 (regression check)

#### C-m4b-019

Target file: `components/BrickChip.test.tsx`
**GIVEN** a time `<BrickChip>` (M3-shape brick `{ kind: "time", elapsedMs: 0, durationMs: 600000 }`) rendered with `onGoalLog` and `onTickToggle` spies
**WHEN** the chip is clicked and a `+` / `−` query is attempted
**THEN** neither spy is called; no `−` or `+` button is found in the chip's subtree (time chip is still a single inert `<button>` per M3 / M4a).
Proves: plan.md § File structure ("time chips remain a single inert `<button>` with `cursor: default`") + § Out of scope — covers SPEC AC #19 (regression check)

#### C-m4b-020

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered with a block containing a goal brick and an `onGoalLog` spy threaded as a prop
**WHEN** the inner goal `<BrickChip>`'s `+` button is clicked
**THEN** `onGoalLog` is called with the brick's id and `delta: 1`; the prop is threaded through unchanged (no in-component dispatch).
Proves: plan.md § Components > TimelineBlock ("Threads `onGoalLog` to each `<BrickChip>`") — covers SPEC AC #4 (threading)

#### C-m4b-021

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray>` rendered with one loose goal brick and an `onGoalLog` spy threaded as a prop
**WHEN** the inner goal chip's `+` button is clicked
**THEN** `onGoalLog` is called with the loose brick's id and `delta: 1`.
Proves: plan.md § Components > Timeline + LooseBricksTray ("Pass-through prop only … threads it to each `<BrickChip>`") — covers SPEC AC #4 (loose goal path)

#### C-m4b-022

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient>` rendered with a state where `dayPct(state) === 99` because exactly one goal brick is at `count: target − 1`, and `playChime` + `haptics.notification` spies
**WHEN** the user clicks `+` on that goal brick (real user gesture through the threaded `onGoalLog`)
**THEN** the `LOG_GOAL_BRICK` dispatch fires; `dayPct` recomputes to 100; `useCrossUpEffect` fires `fireDayComplete`; `haptics.notification` is called once; `playChime` is called once; `<Fireworks active={true} />` is rendered.
Proves: plan.md § Components > BuildingClient (day-100 wiring reused for goal path) + § Visual cascade step 8 — covers SPEC AC #16

### E2E (Playwright)

#### E-m4b-001

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app at `/` seeded (via `addInitScript` test fixture) with one block containing one goal brick `{ id: "g1", count: 0, target: 10, unit: "reps" }`, block expanded
**WHEN** the user taps the `+` stepper button once
**THEN** within one frame the chip's `data-testid="brick-fill"` width animates toward `10%`; the badge text updates to `"1 / 10 reps"`; the block scaffold left-bar height grows; the HeroRing arc length grows; the BlueprintBar segment opacity for that block increases.
Proves: plan.md § Visual cascade — covers SPEC AC #4, #6, #7, #14

#### E-m4b-002

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the same fixture as E-m4b-001 but seeded at `count: 5`
**WHEN** the user taps the `−` stepper button once
**THEN** the chip's brick-fill width animates from `50%` down to `40%`; the badge updates to `"4 / 10 reps"`; cascade visuals shrink correspondingly.
Proves: plan.md § Visual cascade (decrement path) — covers SPEC AC #5, #6, #7

#### E-m4b-003

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick `{ count: 0, target: 10 }`, block expanded
**WHEN** the user presses the `+` button at `t=0`, holds, and `expect.poll`s the badge text against successive checkpoints (`t=550 ms` → `"2 / 10"` (initial + 1 auto-repeat), `t=600 ms` → `"3 / 10"`, etc.) with ±20 ms tolerance
**THEN** auto-repeat ticks fire approximately 50 ms apart after the 500 ms hold threshold; each polled checkpoint observes the count incrementing by ~1 per 50 ms window.
Proves: plan.md § Long-press / auto-repeat strategy — covers SPEC AC #10, #13

#### E-m4b-004

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick `{ count: 8, target: 10 }`, block expanded
**WHEN** the user presses and holds the `+` button continuously for ~1.5 s
**THEN** within ~600 ms the badge text reads `"10 / 10"` and the brick-fill width is `100%`; for the remainder of the hold the badge does NOT advance past `10`; the `+` button has the `disabled` attribute set.
Proves: plan.md § Edge cases ("Long-press at `count === target − 1`: first auto-repeat tick brings count to `target`; subsequent interval fires would be clamps but the `disabled` short-circuit … prevents any churn") — covers SPEC AC #11

#### E-m4b-005

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a block containing one goal brick `{ count: 9, target: 10 }` (one tap away from blockPct === 100), with the chime audio counter wired (`window.__chimePlays` per M4a pattern)
**WHEN** the user taps `+` once
**THEN** the block card receives a bloom animation class/data-attr; the chime counter increments by exactly 1 (block-100 path).
Proves: plan.md § Components > TimelineBlock ("a goal stepper push that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic") — covers SPEC AC #15

#### E-m4b-006

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a state where `dayPct(state) === 99` because exactly one goal brick is at `count: target − 1` (and no other incomplete bricks remain)
**WHEN** the user taps `+` once
**THEN** a fireworks overlay (`[data-testid="fireworks"]`) appears within one frame; after ~1.6 s (≤ 2.0 s wait) the overlay is unmounted (or its `active` flag is `false`).
Proves: plan.md § Components > BuildingClient (day-100 cross-up reused for goal path) — covers SPEC AC #16

#### E-m4b-007

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with a goal brick at `count: 9, target: 10`, the user taps `+` once (block bloom fires), then taps `−` once (block drops to 90%, bloom not replayed), then taps `+` once again (block back to 100%)
**WHEN** the third tap completes
**THEN** the bloom animation class/data-attr re-applies on the block card (one-shot per crossing rule re-fires).
Proves: plan.md § Visual cascade step 9 ("Cross-down via `−` resets the gate; re-cross-up replays celebration") — covers SPEC AC #17

#### E-m4b-008

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the page emulated at mobile viewport `430 × 932`, seeded with a goal brick `{ name: "pushups", count: 0, target: 99, unit: "reps" }` (long-ish text), block expanded
**WHEN** the chip is queried and the steppers are tapped
**THEN** `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow on `<body>`); the `−` and `+` buttons are visually present, do NOT overlap the badge or fill gradient, and remain tappable.
Proves: plan.md § File structure ("Layout: title flex-1 left-aligned; then `−` button; then badge … then `+` button") + SG-m4b-01 — covers SPEC AC #2

#### E-m4b-009

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the app seeded with one tick brick (`{ kind: "tick", done: false }`) AND one goal brick (`{ count: 2, target: 5 }`) AND one time brick (`{ kind: "time", elapsedMs: 0 }`) all in one block
**WHEN** the user taps the tick chip's surface, then taps the time chip's surface
**THEN** the tick chip toggles `aria-pressed` from `"false"` to `"true"` and fills (M4a behavior preserved); the time chip's badge does NOT change and no timer starts (M3/M4a inert behavior preserved); the goal chip's count is unaffected by either tap.
Proves: plan.md § File structure (tick/time chip preservation) — covers SPEC AC #18, #19

#### E-m4b-010

Target file: `tests/e2e/m4b.spec.ts`
**GIVEN** the browser context with `prefers-reduced-motion: reduce` emulated, app seeded with a goal brick `{ count: 4, target: 5 }`
**WHEN** the user presses and holds `+` for ~700 ms (past HOLD_MS)
**THEN** the brick-fill `width` transition is `none` (animation snaps to each new value); during the hold no `transform: scale(0.95)` is applied to either stepper button at any frame; haptics (mocked `window.__hapticsLog`) and dispatch counter still increment normally; the brick reaches `count: 5` and the cap-bloom (block-100 path if applicable) chime counter increments.
Proves: plan.md § Reduced motion (full M4b reduced-motion contract) — covers SPEC AC #20

### Accessibility (axe via Playwright)

#### A-m4b-001

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view rendered with at least one tick brick, one goal brick (at intermediate `count`), and one time brick visible (mixed kinds, deterministic fixture via `addInitScript` — no count guards)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config.
Proves: plan.md § A11y ("axe-core target per AC #23: zero violations on the building view with at least one goal brick rendered") — covers SPEC AC #23

#### A-m4b-002

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ name: "pushups", count: 3, target: 10 }` (deterministic fixture)
**WHEN** the page DOM is inspected
**THEN** the `−` button has `aria-label="Decrease pushups"`; the `+` button has `aria-label="Increase pushups"`; the outer wrapper has `role="group"` with an aria-label that includes the brick name and the goal context (`"…, goal, … of …"` per plan.md § Components).
Proves: plan.md § A11y (full ARIA contract) + SG-m4b-01 — covers SPEC AC #21

#### A-m4b-003

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ count: 0, target: 10 }` (at floor) AND a separate goal brick `{ count: 10, target: 10 }` (at cap)
**WHEN** the page DOM is inspected
**THEN** the floor brick's `−` button has the `disabled` attribute AND is not in the keyboard tab order (browser default for `<button disabled>`); the cap brick's `+` button has the `disabled` attribute AND is not in the keyboard tab order; the still-enabled sibling button on each chip remains keyboard-tabbable and retains its accessible name.
Proves: plan.md § A11y ("`disabled` attribute removes the button from the tab order at the clamp boundary … chip remains visible and the user can keyboard-tab to the still-enabled sibling button") — covers SPEC AC #3, #21

#### A-m4b-004

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick `{ count: 3, target: 10 }`, the page focused on `body`
**WHEN** the user presses Tab repeatedly until focus lands on the chip's `−` button, presses Enter, then presses Tab once more (lands on `+`), then presses Space
**THEN** each press fires exactly one dispatch (the badge shows `"2 / 10"` after Enter on `−`, then `"3 / 10"` after Space on `+`); both buttons are reachable in tab order; both activate via Enter and via Space.
Proves: plan.md § A11y ("native `<button>` semantics provide keyboard activation via Enter and Space; one tap = one dispatch") — covers SPEC AC #22

#### A-m4b-005

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick (deterministic fixture)
**WHEN** `getBoundingClientRect()` is read on the `−` and `+` buttons
**THEN** each button's measured height ≥ 44 px AND width ≥ 44 px (ADR-031 enforced by computed CSS).
Proves: plan.md § Decisions to honor (ADR-031 explicit) — covers SPEC AC #1

#### A-m4b-006

Target file: `tests/e2e/m4b.a11y.spec.ts`
**GIVEN** the day view seeded with a goal brick (`{ count: 0, target: 10 }`) — i.e., one stepper button is `disabled`
**WHEN** axe-core runs against the document
**THEN** zero violations are reported; in particular, the disabled button still exposes its accessible name (axe rule `button-name` passes) and the chip's outer `<div role="group">` is correctly recognized.
Proves: plan.md § A11y ("`disabled` controls retain accessible names" — anti-vacuous-pass: state is seeded so the disabled control is guaranteed to exist) — covers SPEC AC #23

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                                                          | Covering test IDs                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| #1  | Goal chip renders `−` and `+` controls; each ≥ 44 px tap target                                                                             | C-m4b-001, C-m4b-002, A-m4b-005                                                          |
| #2  | Controls don't overlap badge or fill at 430 px viewport (no overflow)                                                                       | E-m4b-008                                                                                |
| #3  | `−` disabled at `count === 0`; `+` disabled at `count === target` (visual + `disabled` attribute)                                           | C-m4b-003, C-m4b-004, A-m4b-003                                                          |
| #4  | Tap `+` dispatches `LOG_GOAL_BRICK` `delta: 1`; reducer increments + clamps                                                                 | U-m4b-001, U-m4b-005, U-m4b-006, U-m4b-009, C-m4b-005, C-m4b-020, C-m4b-021, E-m4b-001   |
| #5  | Tap `−` dispatches `LOG_GOAL_BRICK` `delta: -1`; reducer decrements + clamps                                                                | U-m4b-002, C-m4b-006, E-m4b-002                                                          |
| #6  | Brick-fill width animates `(count/target) × 100%` via `brickFill` (600 ms easeInOut)                                                        | C-m4b-010, E-m4b-001, E-m4b-002                                                          |
| #7  | Badge text format `"${count} / ${target}${unit ? ' ' + unit : ''}"` updates synchronously                                                   | C-m4b-009, E-m4b-001, E-m4b-002                                                          |
| #8  | Haptic `light` fires on every successful (non-clamped) tick                                                                                 | C-m4b-005, C-m4b-006                                                                     |
| #9  | Haptic `medium` fires on clamp (rejected tap at cap or floor)                                                                               | C-m4b-007, C-m4b-008                                                                     |
| #10 | Press-and-hold ≥ 500 ms triggers auto-repeat at ~50 ms intervals                                                                            | U-m4b-013, C-m4b-012, E-m4b-003                                                          |
| #11 | Auto-repeat stops on release OR on hitting cap                                                                                              | U-m4b-013, U-m4b-014, C-m4b-013, E-m4b-004                                               |
| #12 | Same long-press semantics apply to `−` (auto-repeats down to 0)                                                                             | U-m4b-013 (hook is symmetric), C-m4b-012 (same path used for `−` per plan.md), E-m4b-002 |
| #13 | Each auto-repeat tick fires `light` haptic; clamp tick fires `medium`                                                                       | C-m4b-012, C-m4b-007, C-m4b-008, E-m4b-003                                               |
| #14 | Cascade visuals (chip + scaffold + BlueprintBar + HeroRing) all update on the same render tick                                              | E-m4b-001                                                                                |
| #15 | Block 100% celebration fires on stepper-push cross-up (bloom + chime + `success` haptic)                                                    | E-m4b-005                                                                                |
| #16 | Day 100% celebration fires on stepper-push cross-up (fireworks + chime + `notification` haptic)                                             | C-m4b-022, E-m4b-006                                                                     |
| #17 | Cross-down via `−` then re-cross-up via `+` replays celebration (one-shot per crossing)                                                     | E-m4b-007                                                                                |
| #18 | Tick bricks render and behave identically to M4a (regression)                                                                               | U-m4b-007, C-m4b-018, E-m4b-009                                                          |
| #19 | Time bricks render identically to M3 (still inert)                                                                                          | U-m4b-008, C-m4b-019, E-m4b-009                                                          |
| #20 | Reduced-motion → fill instant; long-press visual feedback suppressed; haptics + audio unaffected                                            | C-m4b-011, C-m4b-014, C-m4b-015, E-m4b-010                                               |
| #21 | `−` / `+` aria-labels: `"Decrease ${name}"` / `"Increase ${name}"`                                                                          | C-m4b-001, C-m4b-017, A-m4b-002, A-m4b-003                                               |
| #22 | Keyboard-focusable; Enter/Space triggers same dispatch as a tap                                                                             | C-m4b-016, A-m4b-004                                                                     |
| #23 | axe-core: zero violations                                                                                                                   | A-m4b-001, A-m4b-006                                                                     |
| #24 | `tsc --noEmit`: zero new errors                                                                                                             | gate (composite — `npm run eval`); also U-m4b-010 (assertNever)                          |
| #25 | ESLint: zero new errors                                                                                                                     | gate (composite — `npm run eval`)                                                        |
| #26 | Vitest: reducer tests (incr/decr/clamp top/clamp bottom) + chip tests (controls / disabled / dispatch / long-press auto-repeat)             | U-m4b-001..014, C-m4b-001..022                                                           |
| #27 | Playwright: tap `+` on goal chip → fill + badge update; long-press → ~50 ms auto-repeat; cross-to-target → bloom; mobile 430 px no overflow | E-m4b-001, E-m4b-003, E-m4b-005, E-m4b-008                                               |

**Spec gaps surfaced for VERIFIER:** none. SG-m4b-01 through SG-m4b-05 are resolved in plan.md and reflected directly in the test IDs above. M4a deferred-cleanup items (U-m4a-009 prose drift, C-m4a-002 / C-m4a-003 prose, A-m4a-\* vacuous-pass guards, E-m4a-005 weak assertion) remain explicitly out of scope per plan.md § Migration / obsolete IDs and per the M4b TESTS dispatch prompt.

## Milestone 4d — Add chooser (Block or Brick) — Tests

This entry covers M4d. Test ID prefixes:

- `U-m4d-` — unit (Vitest, no DOM)
- `C-m4d-` — component (Vitest + Testing Library)
- `E-m4d-` — Playwright e2e
- `A-m4d-` — Playwright a11y (axe-core via Playwright)

E2E and a11y specs continue the **deferred-to-preview** pattern from M4a/M4b: tests live in `tests/e2e/m4d.spec.ts` and `tests/e2e/m4d.a11y.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox. EVALUATOR's M4b report flagged this as an open-loop debt (M4a + M4b combined have ~17 such guards). M4d perpetuates the pattern for consistency; a future TESTS-mode dispatch will land deterministic seeding helpers (per `status.md` open loop and ADR-039 ships-empty constraint). Flag, not block.

AC #16 locks no schema/reducer changes, so the unit-test surface is intentionally tiny (two IDs). Most coverage lives in `C-m4d-*` because M4d is a routing-and-rendering feature exercised through `<BuildingClient>`'s sheet state.

### Unit (Vitest)

#### U-m4d-001

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />` rendered twice (two separate `render()` calls in one test) with identical props
**WHEN** the rendered DOM of each instance is compared (innerHTML or `prettyDOM` snapshot)
**THEN** the two instances produce byte-identical DOM (no hidden state, no random ids, no timestamp leak).
Proves: plan.md § Components > AddChooserSheet ("pure routing surface, no internal state") — covers SPEC AC #16 (purity) by ruling out a hidden-state regression.

#### U-m4d-002

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** the module `components/AddChooserSheet` exports `AddChooserSheet` as a React component
**WHEN** the prop signature is read at type-check time (`Parameters<typeof AddChooserSheet>[0]`)
**THEN** the prop type contains `open: boolean`, `onPick: (choice: 'block' | 'brick') => void`, `onCancel: () => void`; calling `onPick('block')` and `onPick('brick')` typecheck; calling `onPick('other' as any)` does not (this is enforced by `tsc --noEmit`, the assertion just exercises the type at runtime).
Proves: plan.md § Components > AddChooserSheet (prop signature lock) — covers SPEC AC #22 (`tsc --noEmit` clean).

### Component (Vitest + Testing Library)

#### C-m4d-001

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />` rendered
**WHEN** the DOM is queried by role
**THEN** there are exactly two buttons with accessible names `"Add Block"` and `"Add Brick"` plus one Cancel control (X icon button); the outer wrapper has `role="dialog"` and `aria-label="Add"`.
Proves: plan.md § Components > AddChooserSheet ("two stacked `<Button>`s plus X cancel") + § A11y — covers SPEC AC #1, #18, #19.

#### C-m4d-002

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true}>` rendered in a fixed-width container
**WHEN** `getBoundingClientRect()` is read on the Add Block button, the Add Brick button, and the Cancel control (or `getComputedStyle().minWidth` / `.minHeight`)
**THEN** each button reports `min-width` ≥ 44 (px) AND `min-height` ≥ 44 (px) per ADR-031.
Proves: plan.md § Components > AddChooserSheet + § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### C-m4d-003

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />` rendered with focus on `body`
**WHEN** the user presses Tab three times (lands on Add Block, then Add Brick, then Cancel), then `Enter` on Add Block in a separate render, then `Space` on Add Brick in a third render
**THEN** Tab order is Add Block → Add Brick → Cancel (`document.activeElement` after each Tab matches); Enter on Add Block fires `onPick('block')` once; Space on Add Brick fires `onPick('brick')` once.
Proves: plan.md § A11y ("native `<button>` activation via Enter and Space") — covers SPEC AC #20.

#### C-m4d-004

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />` with both spies fresh
**WHEN** the user clicks the X Cancel control (test 1) and then re-renders and clicks the backdrop overlay (test 2)
**THEN** `onCancel` is called exactly once per test; `onPick` is never called in either test.
Proves: plan.md § Components > AddChooserSheet (Cancel + backdrop dismiss) — covers SPEC AC #4, #13.

#### C-m4d-005

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} />` with `lib/haptics.light` mocked
**WHEN** the user clicks the Add Block button
**THEN** `onPick` is called exactly once with `'block'`; `haptics.light` is called exactly once.
Proves: plan.md § Components > AddChooserSheet (Add Block tap) — covers SPEC AC #2.

#### C-m4d-006

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} />` with `lib/haptics.light` mocked
**WHEN** the user clicks the Add Brick button
**THEN** `onPick` is called exactly once with `'brick'`; `haptics.light` is called exactly once.
Proves: plan.md § Components > AddChooserSheet (Add Brick tap) — covers SPEC AC #3.

#### C-m4d-007

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={false} onPick={vi.fn()} onCancel={vi.fn()} />` rendered
**WHEN** the DOM is queried for the chooser's role=dialog or for the Add Block / Add Brick buttons
**THEN** none of these are present (`queryByRole` returns null). The chooser is fully unmounted (or hidden via `<Sheet>`'s `open=false` contract).
Proves: plan.md § Components > AddChooserSheet (open=false ⇒ nothing rendered) — covers SPEC AC #12 (Sheet contract).

#### C-m4d-008

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true}>` rendered with `useReducedMotion()` stubbed `true`
**WHEN** the chooser's outer animation wrapper is inspected (`style.transition` or the equivalent motion class)
**THEN** the slide-in transition is `none` (or `0ms`); the chooser still renders with both buttons visible (animation suppressed but content present).
Proves: plan.md § Reduced motion (chooser inherits `<Sheet>`'s reduced-motion behavior) — covers SPEC AC #17.

#### C-m4d-009

Target file: `app/(building)/BuildingClient.test.tsx` (or a dedicated `BuildingClient.m4d.test.tsx` if defaultState mocking is needed)
**GIVEN** `<BuildingClient />` rendered (empty default state)
**WHEN** the user clicks the dock `+` button (`<BottomBar onAddPress>`)
**THEN** `<AddChooserSheet>` is open in the DOM (`role="dialog"` with `aria-label="Add"` is queryable); `<AddBlockSheet>` is NOT open.
Continuation: when the user clicks the chooser's "Add Block" button, the chooser closes (no longer queryable) AND `<AddBlockSheet>` opens with the `Title` input visible and `defaultStart` set to the rounded current hour (M2 logic).
Proves: plan.md § Wiring map (dock + → chooser → AddBlockSheet) — covers SPEC AC #1, #2.

#### C-m4d-010

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered, dock `+` clicked so chooser is open
**WHEN** the user clicks "Add Brick" inside the chooser
**THEN** chooser closes; `<AddBrickSheet>` opens; the brick form's `parentBlockId` indicator (component prop or visible "Loose brick" hint, depending on plan) reflects `parentBlockId: null`; the CategoryPicker is not pre-filled (matches the tray path).
Proves: plan.md § Wiring map (dock + → chooser → AddBrickSheet, parentBlockId null) — covers SPEC AC #3.

#### C-m4d-011

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with empty state and the system time mocked to `2026-05-09T08:30:00`
**WHEN** the user clicks an empty hour slot at hour `13` in `<Timeline>` (via `<SlotTapTargets>`)
**THEN** the chooser opens AND captures hour `13`. Continuation A: clicking "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` rendered as `"13:00"`. Continuation B (separate render): clicking "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null`; the captured hour is discarded (the brick form has no time/start surface to inspect, but `parentBlockId: null` proves the routing).
Proves: plan.md § Wiring map (slot tap → chooser → AddBlockSheet w/ defaultStart OR AddBrickSheet) — covers SPEC AC #5, #6, #7.

#### C-m4d-012

Target file: `components/TimelineBlock.test.tsx` (or `BuildingClient.test.tsx` — wherever the inside-block "+ Add brick" path is exercised today)
**GIVEN** `<BuildingClient />` rendered with one block in state (or `<TimelineBlock>` rendered standalone in expanded state); the "+ Add brick" ghost button visible
**WHEN** the user clicks "+ Add brick"
**THEN** `<AddBrickSheet>` opens directly with `parentBlockId` = this block's id and `categoryId` pre-filled to the block's `categoryId` (M3 behavior preserved); `<AddChooserSheet>` is NOT mounted at any point during the interaction.
Proves: plan.md § Wiring map (inside-block bypass) + first-class invariant — covers SPEC AC #8 (regression).

#### C-m4d-013

Target file: `components/LooseBricksTray.test.tsx` (or `BuildingClient.test.tsx`)
**GIVEN** `<BuildingClient />` rendered with at least one loose brick (so the tray is visible and expanded), or `<LooseBricksTray>` rendered standalone in expanded view
**WHEN** the user clicks the "+ Brick" / "Add Brick" pill inside the tray
**THEN** `<AddBrickSheet>` opens directly with `parentBlockId: null` and no category pre-fill (M3 behavior preserved); `<AddChooserSheet>` is NOT mounted at any point.
Proves: plan.md § Wiring map (tray bypass) + first-class invariant — covers SPEC AC #9 (regression).

#### C-m4d-014

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with literal-empty default state (no blocks, no loose bricks; tray hidden; empty-state card visible)
**WHEN** the user clicks the dock `+` → "Add Brick" inside the chooser → fills the AddBrickSheet form (Title `"My Brick"`, type Tick) → clicks Save
**THEN** the new brick appears in `<LooseBricksTray>` (which now renders because `state.looseBricks.length > 0`); the empty-state card unmounts; `state.blocks.length` is still `0`.
Proves: plan.md § Wiring map (empty-state first-brick) + spec AC #10 — covers SPEC AC #10.

#### C-m4d-015

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with literal-empty default state, system time mocked
**WHEN** the user clicks an empty hour slot (hour `H`) → "Add Brick" inside the chooser → fills the form → Save
**THEN** the same outcome as C-m4d-014 (loose brick in tray, empty-state unmounts); the captured hour `H` is correctly discarded (no time/start field populated on the saved brick).
Proves: plan.md § Wiring map (slot → Brick discards hour) — covers SPEC AC #11.

#### C-m4d-016

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered, dock `+` clicked once so chooser is open
**WHEN** the user clicks the dock `+` a second time (the dock button may be obscured by the chooser backdrop in real DOM, but `fireEvent.click` bypasses)
**THEN** the chooser remains open exactly once (only one `role="dialog"` with `aria-label="Add"` in the DOM; `state.chooserState.open === true` once).
Proves: plan.md § Edge cases ("two rapid taps on dock + don't double-mount") — covers SPEC § Edge cases (rapid-tap debounce).

#### C-m4d-017

Target file: `app/(building)/BuildingClient.test.tsx` (replaces the M2 direct-path assertion)
**GIVEN** `<BuildingClient />` rendered (replays the M2 `C-m2-020` user journey but via the M4d chooser)
**WHEN** the user taps the dock `+`, then taps "Add Block" in the chooser, then types title `"Foo"`, then clicks Save
**THEN** a new block named `"Foo"` is appended to `state.blocks`; the EmptyBlocks card unmounts; the M2 contract holds end-to-end through the new chooser routing.
Proves: SG-m4d-04 (M2 dock-+ test re-targeted through chooser); migration of M2 `C-m2-020` direct-path semantics — covers SPEC AC #1, #2, #16.

### E2E (Playwright)

#### E-m4d-001

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps the dock `+` button, then taps "Add Block" inside the chooser
**THEN** `<AddChooserSheet>` is briefly visible after the first tap; after the second tap the chooser is gone and `<AddBlockSheet>` is visible (the Title input is rendered).
Proves: plan.md § Wiring map (dock + → chooser → AddBlockSheet) — covers SPEC AC #1, #2.

#### E-m4d-002

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps the dock `+`, then taps "Add Brick" inside the chooser
**THEN** the chooser closes; `<AddBrickSheet>` is visible; the brick form's type selector renders three options (Tick / Goal / Time).
Proves: plan.md § Wiring map (dock + → chooser → AddBrickSheet with three measurement types preserved from M3) — covers SPEC AC #3.

#### E-m4d-003

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state, viewport at desktop default
**WHEN** the user taps an empty hour slot at hour `H` in `<Timeline>`, then taps "Add Block" inside the chooser
**THEN** `<AddBlockSheet>` opens with the start time input pre-filled to `H:00`.
Proves: plan.md § Wiring map (slot → chooser → AddBlockSheet with defaultStart) — covers SPEC AC #5, #6.

#### E-m4d-004

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps an empty slot, then taps "Add Brick" inside the chooser
**THEN** `<AddBrickSheet>` opens; no `start` / `time` input field is present in the brick form (bricks are time-agnostic; the captured hour is discarded).
Proves: plan.md § Wiring map (slot → chooser → AddBrickSheet, hour discarded) — covers SPEC AC #7.

#### E-m4d-005

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the page emulated at mobile viewport `430 × 932`
**WHEN** the user taps the dock `+` and the chooser opens
**THEN** `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow); both Add Block and Add Brick buttons have `getBoundingClientRect().height >= 44` and `width >= 44`; the Cancel control is also tappable (≥ 44 px).
Proves: plan.md § Mobile + § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### E-m4d-006

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the browser context with `prefers-reduced-motion: reduce` emulated
**WHEN** the user taps the dock `+`
**THEN** the chooser is visible immediately (no observable slide-in animation duration > 50 ms; the chooser's outer transition resolves to `none` or `0ms`).
Proves: plan.md § Reduced motion — covers SPEC AC #17.

### Accessibility (axe via Playwright)

#### A-m4d-001

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the app at `/` with the chooser open (tap dock `+` first)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config.
Proves: plan.md § A11y — covers SPEC AC #21.

#### A-m4d-002

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open
**WHEN** the page DOM is inspected and the user presses Tab from the chooser's first focusable element
**THEN** the outer wrapper has `role="dialog"`, `aria-label="Add"`; initial focus is inside the chooser; Tab order cycles Add Block → Add Brick → Cancel (then traps back to Add Block); Shift+Tab cycles in reverse.
Proves: plan.md § A11y (focus trap + tab order) — covers SPEC AC #18, #20.

#### A-m4d-003

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open at the default desktop viewport
**WHEN** `getBoundingClientRect()` is read on Add Block, Add Brick, and Cancel
**THEN** each measured `width` ≥ 44 px AND `height` ≥ 44 px (ADR-031 enforced via computed CSS).
Proves: plan.md § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### A-m4d-004

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open
**WHEN** the user presses `Escape`
**THEN** the chooser closes (no `role="dialog"` with `aria-label="Add"` in the DOM); no `onPick` is observed (no downstream sheet opens).
Note: stretch test verifying the dialog convention beyond explicit AC — if Esc isn't wired, this is a future polish item flagged for `status.md`.
Proves: dialog convention (a11y best practice) — covers SPEC AC #13 (silent dismiss) by extension.

### M2 / M3 test migration notes (per SG-m4d-04)

The following pre-existing tests must be amended in BUILDER's red→green sequence so they walk through the chooser instead of asserting direct routing. Each is a one-line adjustment:

- `C-m2-020` (M2): "saves a block: name='Foo'..." — must click "Add Block" inside the chooser between the dock + tap and the Title input. (Replaced semantically by `C-m4d-017`.)
- `C-m2-016` (M2): "Empty-state card unmounts when blocks.length > 0" — same chooser-walk amendment as above.
- `C-m2-012` (M2): "New category persists if block Cancelled" — opens via dock + (or sheet trigger); chooser-walk amendment.
- Any M2 / M3 slot-tap → AddBlockSheet test (search `onSlotTap` in `*.test.tsx`) — chooser-walk amendment.

BUILDER finds these via `grep -rn "Add Block\|AddBlockSheet" *.test.tsx` and threads "click Add Block in chooser" between the trigger and the form interaction. EVALUATOR validates that the migration is mechanical, not semantic (no AC change).

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                                  | Covering test IDs                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| #1  | Dock + opens AddChooserSheet (not AddBlockSheet directly)                                                           | C-m4d-009, C-m4d-017, E-m4d-001                                                        |
| #2  | Chooser → "Add Block" → AddBlockSheet w/ defaultStart=current hour; haptic light                                    | C-m4d-005, C-m4d-009, C-m4d-017, E-m4d-001                                             |
| #3  | Chooser → "Add Brick" → AddBrickSheet w/ parentBlockId:null, no category pre-fill; haptic light                     | C-m4d-006, C-m4d-010, E-m4d-002                                                        |
| #4  | Chooser X Cancel closes the chooser; no downstream sheet opens                                                      | C-m4d-004                                                                              |
| #5  | Slot tap opens AddChooserSheet (not AddBlockSheet directly); chooser captures the hour                              | C-m4d-011, E-m4d-003                                                                   |
| #6  | Slot → "Add Block" → AddBlockSheet w/ defaultStart=captured hour                                                    | C-m4d-011, E-m4d-003                                                                   |
| #7  | Slot → "Add Brick" → AddBrickSheet w/ parentBlockId:null; captured hour discarded                                   | C-m4d-011, C-m4d-015, E-m4d-004                                                        |
| #8  | Inside-block "+ Add brick" bypasses chooser; AddBrickSheet opens directly w/ real parentBlockId + category pre-fill | C-m4d-012                                                                              |
| #9  | Tray "+ Brick" pill bypasses chooser; AddBrickSheet opens directly w/ parentBlockId:null                            | C-m4d-013                                                                              |
| #10 | Empty state: dock + → chooser → "Add Brick" → Save → tray renders new chip; empty-state card unmounts               | C-m4d-014                                                                              |
| #11 | Empty state: slot tap → chooser → "Add Brick" → Save → same outcome as #10                                          | C-m4d-015                                                                              |
| #12 | Chooser uses M0 `<Sheet>` w/ modalIn / modalOut animations                                                          | C-m4d-007 (open=false ⇒ unmount), C-m4d-008                                            |
| #13 | Backdrop tap dismisses chooser silently                                                                             | C-m4d-004, A-m4d-004                                                                   |
| #14 | iOS swipe-down dismisses silently (M2 SG-m2-06 pattern)                                                             | inherited from `<Sheet>` (M0 — covered by M0 unit tests); flagged for preview tap-test |
| #15 | Two stacked `<Button>`s ≥ 44 px each: Add Block primary amber, Add Brick secondary                                  | C-m4d-001, C-m4d-002, A-m4d-003, E-m4d-005                                             |
| #16 | No reducer / action / AppState changes — UI routing only                                                            | U-m4d-001, U-m4d-002, C-m4d-017                                                        |
| #17 | Reduced motion: chooser slide-in collapses to instant                                                               | C-m4d-008, E-m4d-006                                                                   |
| #18 | Chooser has `role="dialog"`, `aria-label="Add"`, focus trap                                                         | C-m4d-001, A-m4d-002                                                                   |
| #19 | Each button has `aria-label="Add Block"` / `aria-label="Add Brick"`                                                 | C-m4d-001                                                                              |
| #20 | Tab order: Add Block → Add Brick → Cancel; Enter/Space activate                                                     | C-m4d-003, A-m4d-002                                                                   |
| #21 | axe-core: zero violations on the open chooser                                                                       | A-m4d-001                                                                              |
| #22 | `tsc --noEmit`: zero new errors                                                                                     | gate (`npm run eval`); also U-m4d-002                                                  |
| #23 | ESLint: zero new errors                                                                                             | gate (`npm run eval`)                                                                  |
| #24 | Vitest: chooser component test + BuildingClient integration + M3 regression for direct paths                        | U-m4d-001..002, C-m4d-001..017                                                         |
| #25 | Playwright (deferred-to-preview): empty-state path + slot-tap defaultStart match                                    | E-m4d-001..006                                                                         |

**Spec gaps surfaced for VERIFIER:** none. SG-m4d-01 through SG-m4d-05 are resolved in plan.md and reflected in the test IDs above. AC #14 (iOS swipe-down) is inherited from M0 `<Sheet>` and intentionally not re-tested at the M4d level — covered by M0 + flagged for preview tap-test.

## Milestone 4c — Time Brick Timer — Tests

This entry covers M4c — the third and final brick-logging verb (after M4a tick and M4b goal). Test ID prefixes:

- `U-m4c-` — unit (Vitest, no DOM): reducer arms, `lib/timer.ts` lifecycle with fake timers, `useLongPress` (sibling helper) lifecycle.
- `C-m4c-` — component (Vitest + Testing Library): `<BrickChip>` time variant, `<TimerSheet>`, `<BuildingClient>` wiring of the timer hook + sheet.
- `E-m4c-` — Playwright e2e (`tests/e2e/m4c.spec.ts`): tap-to-start / tap-to-stop, long-press → sheet, block-collapse independence, second-timer auto-stops first.
- `A-m4c-` — Playwright a11y (`tests/e2e/m4c.a11y.spec.ts`): axe-core zero violations on building view + open sheet, `aria-pressed` correctness, reduced-motion path.

E2E and a11y specs continue the **deferred-to-preview** pattern from M4a/M4b/M4d: tests live in `tests/e2e/m4c.*.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox (Playwright's chromium binary is missing in this environment — established M0..M4d pattern; flagged in `status.md` as vacuous-pass debt). A future TESTS-mode dispatch owes a deterministic seeding helper that lifts these guards across M4a/M4b/M4c/M4d in one pass; M4c does NOT introduce that helper (out of scope; would touch four prior test files).

The M4c surface is unit-heavy (reducer + timer hook + long-press helper) because the timer's correctness is a math + lifecycle problem, not a render problem. Component coverage focuses on the chip's two-gesture (tap vs long-press) routing and the sheet's clamp/save/cancel paths. E2E + a11y are thin (5 + 4 IDs) and explicitly preview-deferred.

### Unit (Vitest)

#### U-m4c-001

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: null` and a single `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 0 }`
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t1" })` is called
**THEN** the returned state has `runningTimerBrickId === "t1"`; the brick is unchanged (`minutesDone === 0`); all other fields (categories, blocks, looseBricks) preserve referential equality where their contents are unchanged.
Proves: plan.md § Locked schema additions ("`START_TIMER` writes the new id") + plan.md § Library modules ("Single-timer invariant enforcement") — covers SPEC AC #3.

#### U-m4c-002

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"` (timer A is running)
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t2" })` is called (start timer B)
**THEN** the returned state has `runningTimerBrickId === "t2"`; no separate `STOP_TIMER` was needed; both bricks' `minutesDone` are unchanged (whatever the last `TICK_TIMER` for `t1` wrote stays as A's captured value).
Proves: plan.md § Reducer arms ("the swap IS the stop") + plan.md § Edge cases ("Tap a stopped time chip while another timer is running") — covers SPEC AC #11.

#### U-m4c-003

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "START_TIMER", brickId: "t1" })` is called (re-start the already-running brick — defensive idempotence)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); no spurious re-render is triggered.
Proves: plan.md § Reducer arms (`if (state.runningTimerBrickId === action.brickId) return state`) — covers SPEC AC #3 (invariant) by ruling out a duplicate-dispatch state churn.

#### U-m4c-004

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t1" })` is called
**THEN** the returned state has `runningTimerBrickId === null`.
Proves: plan.md § Reducer arms (`STOP_TIMER` clears the field) — covers SPEC AC #4.

#### U-m4c-005

Target file: `lib/data.test.ts`
**GIVEN** `state` with `runningTimerBrickId: null` (no timer running)
**WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t1" })` is called
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the no-op early return is hit.
**AND GIVEN** `state` with `runningTimerBrickId: "t1"`, **WHEN** `reducer(state, { type: "STOP_TIMER", brickId: "t2" })` is called (stop a non-running brick), **THEN** same-ref no-op (mismatched id branch).
Proves: plan.md § Reducer arms (two `STOP_TIMER` no-op branches) — covers SPEC § Edge cases (stopping a non-running brick is harmless).

#### U-m4c-006

Target file: `lib/data.test.ts`
**GIVEN** `state` containing one block with one `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 5 }` and `runningTimerBrickId: "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "t1", minutesDone: 7 })` is called
**THEN** the returned state has the brick's `minutesDone === 7`; `runningTimerBrickId` unchanged at `"t1"`; the block array reference changed (one brick mutated → one block mutated → array re-rolled), but `state.categories` and `state.looseBricks` preserve referential equality.
Proves: plan.md § Reducer arms (`TICK_TIMER` writes minutes; array-identity preservation pattern) — covers SPEC AC #7.

#### U-m4c-007

Target file: `lib/data.test.ts`
**GIVEN** `state` with a `kind: "time"` brick whose `minutesDone === 7` and `runningTimerBrickId === "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "t1", minutesDone: 7 })` is called (no minute boundary crossed)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the identity short-circuit fired.
Proves: plan.md § Reducer arms ("Identity short-circuit when minutesDone is unchanged") + § Cross-cutting concerns #5 — covers SPEC § Edge cases (no spurious cross-up effect re-runs at 1 s tick cadence).

#### U-m4c-008

Target file: `lib/data.test.ts`
**GIVEN** `state` containing a `kind: "tick"` brick (NOT time) with `id: "tk1"`, plus a `kind: "time"` brick with `id: "t1"`
**WHEN** `reducer(state, { type: "TICK_TIMER", brickId: "tk1", minutesDone: 7 })` is called (wrong-kind id)
**THEN** the returned state is the **same reference** as the input state; the `b.kind !== "time"` guard fires; no field is mutated.
Proves: plan.md § Reducer arms (`apply` matches by `id` AND `kind === "time"`) — covers SPEC § Edge cases ("Brick id collision" defense-in-depth).

#### U-m4c-009

Target file: `lib/data.test.ts`
**GIVEN** `state` with one `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 5 }` (in `state.looseBricks` to also exercise the loose path)
**WHEN** `reducer(state, { type: "SET_TIMER_MINUTES", brickId: "t1", minutes: 12 })` is called (in-range)
**THEN** the brick's `minutesDone === 12`.
**AND** when `minutes: 30` is dispatched (overflow > durationMin), `minutesDone` clamps to `25`.
**AND** when `minutes: -3` is dispatched (under-zero), `minutesDone` clamps to `0`.
**AND** when `minutes: 12` is dispatched while `minutesDone === 12` already, the returned state is the same reference (identity short-circuit).
Proves: plan.md § Reducer arms (`SET_TIMER_MINUTES` clamp at `[0, durationMin]` + identity short-circuit) — covers SPEC AC #15, #18.

#### U-m4c-010

Target file: `lib/data.test.ts`
**GIVEN** any prior `state` shape used by M2/M3/M4a/M4b reducer tests
**WHEN** the test file is loaded under `tsc --noEmit`
**THEN** every `AppState` literal compiles only when it includes `runningTimerBrickId: null` (or a non-null id); the field is required (not optional). `defaultState()` returns a value with `runningTimerBrickId: null` (deep-equal); no other field changed.
Proves: plan.md § Locked schema additions (additive `runningTimerBrickId: string | null` extension) + plan.md § Migration / obsolete IDs — covers SPEC AC #31 (`tsc --noEmit` clean).

#### U-m4c-011

Target file: `lib/data.test.ts`
**GIVEN** the M4c-extended `Action` union
**WHEN** the reducer's `default` arm is reached with an action of type `"NOPE"` (cast through `any`)
**THEN** the call throws (`assertNever` exhaustiveness preserved across the four new union members `START_TIMER` / `STOP_TIMER` / `TICK_TIMER` / `SET_TIMER_MINUTES`).
Proves: plan.md § Cross-cutting concerns #6 (`assertNever` preserved) — covers SPEC AC #31.

#### U-m4c-012

Target file: `lib/timer.test.ts` (NEW)
**GIVEN** a test host that renders `useTimer(state, dispatch)` via `renderHook` from `@testing-library/react`, with `vi.useFakeTimers()` engaged and `vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"))`; initial state has `runningTimerBrickId: null` and a `kind: "time"` brick `{ id: "t1", durationMin: 25, minutesDone: 0 }`
**WHEN** the hook is re-rendered with `runningTimerBrickId: "t1"` (timer started), then `vi.advanceTimersByTime(60_000)` (one minute)
**THEN** `dispatch` is called exactly once with `{ type: "TICK_TIMER", brickId: "t1", minutesDone: 1 }` (the floor of 60_000 / 60_000 + initialMinutesDone 0).
**AND** `dispatch` is NOT called for any of the 59 sub-minute interval ticks (the `lastDispatchedMinutesRef` short-circuit fired 59 times).
Proves: plan.md § Library modules > `useTimer` (interval starts on `runningTimerBrickId` non-null; `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`; identity short-circuit) — covers SPEC AC #5, #6.

#### U-m4c-013

Target file: `lib/timer.test.ts`
**GIVEN** the same test host, `vi.useFakeTimers()`, `runningTimerBrickId: "t1"` for two simulated minutes (so `dispatch` has been called twice)
**WHEN** the host re-renders with `runningTimerBrickId: null` (timer stopped), then `vi.advanceTimersByTime(120_000)` (two more minutes)
**THEN** `dispatch` is called **zero** additional times (interval torn down by `useEffect` cleanup).
Proves: plan.md § Library modules ("Stops the interval when `runningTimerBrickId === null`") — covers SPEC AC #5.

#### U-m4c-014

Target file: `lib/timer.test.ts`
**GIVEN** the test host with `runningTimerBrickId: "t1"`, `vi.useFakeTimers()` active, `vi.setSystemTime` set
**WHEN** the test simulates tab-background by NOT advancing wall-clock (`Date.now()` jumps via a second `vi.setSystemTime` to +120_000 ms) without firing intervals, then dispatches a synthetic `document.visibilityState = "visible"` + `document.dispatchEvent(new Event("visibilitychange"))`
**THEN** `dispatch` is called once with `{ type: "TICK_TIMER", brickId: "t1", minutesDone: 2 }` (the corrective tick computed from `Date.now() - startedAt`).
Proves: plan.md § Library modules ("`visibilitychange` listener dispatches a corrective `TICK_TIMER` on `visible`") — covers SPEC AC #24.

#### U-m4c-015

Target file: `lib/timer.test.ts`
**GIVEN** the hook running for `t1` with `minutesDone: 0`, `vi.useFakeTimers()` engaged, two minutes simulated (so `lastDispatchedMinutesRef === 2`)
**WHEN** the host re-renders with the same `runningTimerBrickId: "t1"` but the brick's `minutesDone` updated to `10` (a `SET_TIMER_MINUTES` happened mid-run); `vi.advanceTimersByTime(60_000)`
**THEN** the next `TICK_TIMER` dispatched carries `minutesDone: 11` (new floor `10` + one elapsed minute since the effect re-ran and re-captured `startedAt`); not `3` (would be the bug — keeping the old base) and not `10` (would be no-op — but a minute elapsed).
Proves: plan.md § Edge cases ("Manual entry while running" — effect re-runs and captures new `initialMinutesDoneRef`) + plan.md § Components > `<TimerSheet>` ("Save updates `minutesDone`; the next tick computes from the new floor") — covers SPEC AC #16.

#### U-m4c-016

Target file: `lib/longPress.test.ts`
**GIVEN** a test component that consumes `useLongPress({ holdMs: 500, onTap, onLongPress })` (the new sibling helper) and renders a `<button>` with the returned pointer handlers; `vi.useFakeTimers()` engaged
**WHEN** the test fires `pointerdown` on the button, then `pointerup` after `vi.advanceTimersByTime(200)` (under threshold)
**THEN** `onTap` is called exactly once; `onLongPress` is NOT called.
**AND** in a second render, when `pointerdown` is fired and `vi.advanceTimersByTime(500)` elapses without `pointerup`, `onLongPress` is called exactly once.
**AND** in a third render, when `pointerdown` is followed by 500 ms elapse (firing `onLongPress`) THEN `pointerup`, `onTap` is NOT called (the consumed-ref guard fired).
**AND** in a fourth render, when `pointerdown` is followed by 200 ms then `pointercancel`, neither callback fires.
**AND** in a fifth render, when the host unmounts mid-press, the timeout is cleared (no callback fires after unmount).
Proves: plan.md § Library modules ("`useLongPress` — single-fire hook") + § Cross-cutting concerns #9 (click suppression) — covers SPEC AC #13 (long-press threshold), AC #1 / #2 (tap not double-firing).

### Component (Vitest + Testing Library)

#### C-m4c-001

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"t1", kind:"time", durationMin:25, minutesDone:5, name:"Read", categoryId:null, parentBlockId:null }} categories={[]} running={false} onTimerToggle={vi.fn()} onTimerOpenSheet={vi.fn()} />` rendered
**WHEN** the DOM is queried
**THEN** there is exactly one `<button>` (whole-chip tap target); it has `aria-pressed="false"`; the rendered glyph is the lucide `Play` icon (▶); the badge text is `"5 / 25 m"`; the chip's accessible name is `"Read, 5 of 25 minutes, stopped, tap to start"` (per AC #28).
Proves: plan.md § Components > `<BrickChip>` time variant (Play glyph when stopped; AC #28 aria-label string) — covers SPEC AC #9, #28, #29.

#### C-m4c-002

Target file: `components/BrickChip.test.tsx`
**GIVEN** the same chip but with `running={true}` and `minutesDone: 12`
**WHEN** the DOM is queried
**THEN** `aria-pressed="true"`; the glyph is the lucide `Pause` icon (⏸); the badge text is `"12 / 25 m"`; the accessible name is `"Read, 12 of 25 minutes, running, tap to stop"`.
Proves: plan.md § Components > `<BrickChip>` time variant (Pause glyph when running; AC #28 running variant) — covers SPEC AC #9, #28, #29.

#### C-m4c-003

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip with `running={false}`, `onTimerToggle` and `onTimerOpenSheet` spies, `lib/haptics` mocked, `vi.useFakeTimers()` engaged
**WHEN** the user fires `pointerdown` then `pointerup` within < 500 ms (a tap)
**THEN** `onTimerToggle` is called exactly once with `"t1"`; `onTimerOpenSheet` is NOT called; `haptics.light` is called exactly once.
Proves: plan.md § Components > `<BrickChip>` ("Tap behaviour: `onClick` fires `haptics.light()` then `onTimerToggle?.(brick.id)`") — covers SPEC AC #1, #10.

#### C-m4c-004

Target file: `components/BrickChip.test.tsx`
**GIVEN** a running time chip with `running={true}`
**WHEN** the user taps the chip (pointerdown + pointerup < 500 ms)
**THEN** `onTimerToggle` is called once with `"t1"`; `haptics.light` is called once. (The parent decides `START_TIMER` vs `STOP_TIMER` based on `state.runningTimerBrickId === brick.id` — see C-m4c-013.)
Proves: plan.md § Components > `<BrickChip>` ("parent decides which action") — covers SPEC AC #2, #10.

#### C-m4c-005

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip, `onTimerToggle` and `onTimerOpenSheet` spies, `lib/haptics` mocked, `vi.useFakeTimers()` engaged
**WHEN** the user fires `pointerdown` and then `vi.advanceTimersByTime(500)` elapses without `pointerup` (then `pointerup` fires)
**THEN** `onTimerOpenSheet` is called exactly once with `"t1"`; `onTimerToggle` is NOT called; `haptics.medium` is called exactly once (the long-press lift haptic).
Proves: plan.md § Components > `<BrickChip>` ("Long-press behaviour: `onLongPress` calls `haptics.medium()` and `onTimerOpenSheet`") — covers SPEC AC #13.

#### C-m4c-006

Target file: `components/BrickChip.test.tsx`
**GIVEN** a stopped time chip rendered with `useReducedMotion()` mocked to return `true`
**WHEN** the chip is inspected for the running-state pulse animation (when re-rendered with `running={true}`)
**THEN** no `transform` or scale animation is applied (computed style or motion-class absent); the glyph is static. The badge and `aria-pressed` still update normally.
Proves: plan.md § Reduced motion ("Chip running-state pulse: suppressed under `prefers-reduced-motion`") — covers SPEC AC #27.

#### C-m4c-007

Target file: `components/TimerSheet.test.tsx` (NEW)
**GIVEN** `<TimerSheet open={true} brick={{ id:"t1", kind:"time", durationMin:25, minutesDone:8, ... }} onSave={onSave} onCancel={onCancel} />` rendered
**WHEN** the DOM is queried
**THEN** the sheet has `role="dialog"` with title `"Set minutes"`; the `<input type="number">` has `aria-label="Minutes done"`, `min="0"`, `max="25"`, `step="1"`, and a defaultValue of `"8"`; there are exactly two action buttons with accessible names `"Save minutes"` and `"Cancel"`, each with `min-height ≥ 44px`.
Proves: plan.md § Components > `<TimerSheet>` (DOM structure + a11y) — covers SPEC AC #14.

#### C-m4c-008

Target file: `components/TimerSheet.test.tsx`
**GIVEN** `<TimerSheet open={true} brick={{ ..., durationMin:25, minutesDone:8 }} onSave={onSave} onCancel={onCancel} />` with `lib/haptics` mocked
**WHEN** the user types `"15"` into the input and clicks Save
**THEN** `onSave` is called exactly once with `15` (a parsed integer); `onCancel` is NOT called; `haptics.medium` is NOT called (no clamp triggered).
Proves: plan.md § Components > `<TimerSheet>` (Save → parsed integer → onSave) — covers SPEC AC #15.

#### C-m4c-009

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the same sheet, `lib/haptics` mocked
**WHEN** the user types `"30"` (overflow — durationMin is 25) and clicks Save
**THEN** `onSave` is called exactly once with `25` (the clamp from the sheet's pre-dispatch logic); `haptics.medium` is called exactly once **before** `onSave` (the clamp cue).
Proves: plan.md § Components > `<TimerSheet>` ("If the parsed value (pre-clamp) was > durationMin, fire haptics.medium() BEFORE calling onSave") — covers SPEC AC #18.

#### C-m4c-010

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the same sheet, `lib/haptics` mocked
**WHEN** the user types `"-3"` (under-zero) and clicks Save
**THEN** `onSave` is called exactly once with `0` (silent clamp); `haptics.medium` is NOT called (under-zero is silent per plan § Edge cases).
**AND** when the input is left blank (NaN) and Save is clicked, `onSave` is called with `0` (the `Number()`-NaN-fallback path).
Proves: plan.md § Components > `<TimerSheet>` (`Math.max(0, Math.min(durationMin, parsedValue))` + NaN fallback) — covers SPEC § Edge cases (manual entry < 0).

#### C-m4c-011

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the sheet open with the input pre-filled to `"8"`
**WHEN** the user types into the input then clicks Cancel
**THEN** `onCancel` is called exactly once; `onSave` is NOT called.
Proves: plan.md § Components > `<TimerSheet>` (Cancel discards) — covers SPEC AC #17.

#### C-m4c-012

Target file: `components/TimerSheet.test.tsx`
**GIVEN** the sheet open, focus initially on the body
**WHEN** the user presses Tab repeatedly
**THEN** focus cycles input → Save → Cancel → input (focus trap mirrors the M4d `<AddChooserSheet>` pattern). Shift+Tab cycles in reverse.
Proves: plan.md § Components > `<TimerSheet>` ("Focus trap follows the M4d AddChooserSheet pattern") — covers SPEC AC #30 (a11y baseline).

#### C-m4c-013

Target file: `app/(building)/BuildingClient.m4c.test.tsx` (NEW dedicated file per the M4b precedent)
**GIVEN** `<BuildingClient />` rendered with `defaultState()` mocked to seed one block containing one `kind: "time"` brick `{ id:"t1", durationMin:25, minutesDone:0 }`, `runningTimerBrickId: null`
**WHEN** the user taps the rendered time chip
**THEN** the reducer dispatches `{ type: "START_TIMER", brickId: "t1" }` (verified by spying `dispatch` or by re-querying the DOM and asserting `aria-pressed="true"` post-tap); the chip's glyph flips to Pause.
**AND** when the user taps the same chip again, the reducer dispatches `{ type: "STOP_TIMER", brickId: "t1" }`; the glyph flips back to Play.
Proves: plan.md § Components > `<BuildingClient>` (`handleTimerToggle` decides START vs STOP off `state.runningTimerBrickId === brickId`) — covers SPEC AC #1, #2, #10.

#### C-m4c-014

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with two time bricks `t1` and `t2` seeded, `runningTimerBrickId: "t1"`, `vi.useFakeTimers()` engaged
**WHEN** the user taps the chip for `t2`
**THEN** the chip for `t1` shows `aria-pressed="false"` and the Play glyph; the chip for `t2` shows `aria-pressed="true"` and the Pause glyph; only one chip in the DOM has `aria-pressed="true"` (single-running invariant verified at the UI level).
Proves: plan.md § Library modules ("Single-timer invariant enforcement") + plan.md § Edge cases ("Tap a stopped time chip while another timer is running") — covers SPEC AC #11, #12.

#### C-m4c-015

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with `runningTimerBrickId: null` and one time brick `t1`, `lib/timer`'s `useTimer` exported, `vi.useFakeTimers()` engaged with `vi.setSystemTime`
**WHEN** the user taps `t1` (start), then `vi.advanceTimersByTime(60_000)`, then re-renders the DOM
**THEN** the chip's badge text reads `"1 / 25 m"` (the reducer received the `TICK_TIMER` from the live `useTimer` hook); `aria-pressed` remains `"true"`.
Proves: plan.md § Components > `<BuildingClient>` (`useTimer(state, dispatch)` called once near the top) + plan.md § Visual cascade — covers SPEC AC #5, #6, #7, #19.

#### C-m4c-016

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with `runningTimerBrickId: "t1"`, `vi.useFakeTimers()`, the timer running for one minute (so the chip is rendered in a parent block)
**WHEN** the parent block is collapsed (the chip is unmounted from the DOM), then `vi.advanceTimersByTime(120_000)`, then the block is re-expanded (chip remounts)
**THEN** the chip's badge reads `"3 / 25 m"` (the timer ticked while the chip was unmounted — `lib/timer.ts` is unaware of expand/collapse). `aria-pressed="true"` on the remounted chip.
Proves: plan.md § Edge cases ("Block expand / collapse during a running timer") — covers SPEC AC #22, #23.

#### C-m4c-017

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with one time brick, `vi.useFakeTimers()` engaged
**WHEN** the user long-presses the chip (`pointerdown` + 500 ms elapse + `pointerup`)
**THEN** `<TimerSheet>` is open in the DOM (`role="dialog"` with title `"Set minutes"` queryable); the input is pre-filled with the brick's current `minutesDone`.
**AND** when the user types `"30"` and clicks Save, the sheet closes; the brick's `minutesDone` becomes `25` (clamped); `haptics.medium` was called once.
**AND** when the user long-presses again and clicks Cancel, the sheet closes; no further dispatch.
Proves: plan.md § Components > `<BuildingClient>` (`handleTimerOpenSheet` + `handleTimerSave` + `handleTimerCancel` wiring) — covers SPEC AC #13, #14, #15, #17, #18.

#### C-m4c-018

Target file: `app/(building)/BuildingClient.m4c.test.tsx`
**GIVEN** `<BuildingClient />` rendered with one time brick `t1` running, `minutesDone: 5`, `vi.useFakeTimers()` engaged
**WHEN** the user long-presses to open the sheet, types `"10"`, clicks Save, then `vi.advanceTimersByTime(60_000)` elapses
**THEN** the brick's `minutesDone` becomes `11` (10 from the manual save + 1 elapsed minute). The timer was NOT stopped by the manual entry; `runningTimerBrickId === "t1"` throughout.
Proves: plan.md § Components > `<TimerSheet>` ("The sheet does NOT stop the timer when opened" + "running timer's next tick computes a NEW startedAt-based delta from the new minutesDone floor") — covers SPEC AC #16.

#### C-m4c-019

Target file: `components/TimelineBlock.test.tsx`
**GIVEN** `<TimelineBlock>` rendered standalone with one time brick, `runningTimerBrickId="t1"`, `onTimerToggle` and `onTimerOpenSheet` spies threaded as props
**WHEN** the rendered chip is inspected
**THEN** the chip receives `running={true}` (because `"t1" === "t1"`); when the chip's `onTimerToggle` is invoked, the `onTimerToggle` spy on `<TimelineBlock>` is called with `"t1"` (pass-through plumbing).
**AND** when `runningTimerBrickId="t2"` (another brick), the chip receives `running={false}`.
Proves: plan.md § Components > `<TimelineBlock>` (pass-through props + `running` derived as `runningTimerBrickId === brick.id`) — covers SPEC AC #11.

#### C-m4c-020

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray>` rendered standalone with one time brick, `runningTimerBrickId="t1"`, the three new prop spies threaded
**WHEN** the chip is inspected and tapped
**THEN** the chip's `running={true}` (mirror of C-m4c-019 for the loose path); tap and long-press handlers invoke the threaded spies. Tick / goal chip behaviour is unchanged (regression: spying `onTickToggle` / `onGoalLog` still works for non-time bricks rendered alongside).
Proves: plan.md § Components > `<LooseBricksTray>` (pass-through plumbing) + § Migration / obsolete IDs (M4a/M4b regression preserved) — covers SPEC AC #25, #26.

### E2E (Playwright) — deferred to preview

#### E-m4c-001

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with at least one `kind: "time"` brick rendered (under `if ((await chip.count()) > 0)` guard; preview has the brick seeded via the fixture path documented in `status.md`)
**WHEN** the user taps the chip
**THEN** the chip's accessible name updates from `…stopped, tap to start` to `…running, tap to stop`; the rendered glyph swaps from `Play` to `Pause`; `aria-pressed="true"` after tap.
Proves: plan.md § Components > `<BrickChip>` time variant (tap-to-start) — covers SPEC AC #1, #9, #28, #29.

#### E-m4c-002

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one running time brick (chip has `aria-pressed="true"` after E-m4c-001's tap)
**WHEN** the user waits 5 seconds (`page.waitForTimeout(5_000)` — preview only; sandbox skips), then re-reads the badge
**THEN** the badge's `m` integer prefix reads no smaller than the pre-wait value; if 60 s+ wait is feasible in preview, the badge advances by 1 (or more) minutes. (Preview-only assertion; sandbox guards the count and skips.)
Proves: plan.md § Library modules > `useTimer` (1 s tick interval drives `TICK_TIMER`) + plan.md § Visual cascade — covers SPEC AC #5, #6, #7, #8, #19.

#### E-m4c-003

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one running time brick whose parent block is expanded
**WHEN** the user taps the block header to collapse the block, waits 5 s (the chip is unmounted), then taps to re-expand
**THEN** the re-mounted chip's badge reads a higher minutes value than before the collapse (the timer kept running while the chip was off-DOM); `aria-pressed="true"` on the remounted chip.
Proves: plan.md § Edge cases ("Block expand / collapse during a running timer") — covers SPEC AC #22, #23.

#### E-m4c-004

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with two time bricks `A` and `B` rendered (one in a block, one in the loose tray, or two in the same block); A is running (`aria-pressed="true"`)
**WHEN** the user taps B's chip
**THEN** A's chip shows `aria-pressed="false"` and the Play glyph; B's chip shows `aria-pressed="true"` and the Pause glyph. Exactly one chip on the page has `aria-pressed="true"`.
Proves: plan.md § Library modules ("Single-timer invariant enforcement") — covers SPEC AC #11, #12.

#### E-m4c-005

Target file: `tests/e2e/m4c.spec.ts`
**GIVEN** the app at `/` with one stopped time brick `{ durationMin: 25, minutesDone: 5 }`
**WHEN** the user long-presses the chip (Playwright `page.mouse.down()` + 600 ms wait + `page.mouse.up()`), types `"30"` into the sheet's input, clicks Save
**THEN** the sheet closes; the chip's badge reads `"25 / 25 m"` (clamped). When the user long-presses again, types `"7"`, clicks Cancel, the sheet closes and the badge still reads `"25 / 25 m"` (Cancel discarded).
Proves: plan.md § Components > `<TimerSheet>` (long-press → sheet → Save clamp + Cancel discard) — covers SPEC AC #13, #14, #15, #17, #18.

### Accessibility (axe via Playwright) — deferred to preview

#### A-m4c-001

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick rendered (under `count() > 0` guard) in both stopped and running states (run the assertion twice — once before tapping, once after)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config in BOTH states.
Proves: plan.md § A11y — covers SPEC AC #30.

#### A-m4c-002

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick rendered, the chip long-pressed so `<TimerSheet>` is open
**WHEN** axe-core runs against the document
**THEN** zero violations are reported (the sheet's `role="dialog"`, input's `aria-label="Minutes done"`, button labels, and contrast all pass).
Proves: plan.md § A11y (`<TimerSheet>` accessibility) — covers SPEC AC #30.

#### A-m4c-003

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the app at `/` with one time brick (under guard)
**WHEN** the chip's `aria-pressed` attribute is read before the tap, and again after
**THEN** the attribute reads `"false"` initially and `"true"` after the tap (mirrors the chip's running state at all times).
**AND** the chip's accessible name (read via Playwright's `getByRole('button', { name: ... })`) matches the AC #28 string for both states.
Proves: plan.md § A11y (`aria-pressed={running}` + AC #28 aria-label) — covers SPEC AC #28, #29.

#### A-m4c-004

Target file: `tests/e2e/m4c.a11y.spec.ts`
**GIVEN** the browser context emulated with `prefers-reduced-motion: reduce`, app at `/` with one time brick (under guard)
**WHEN** the user taps the chip and inspects the chip's computed transform / motion class
**THEN** no scale-pulse animation runs (`getComputedStyle(...).transition` is `none` or `0ms` for the relevant property; or the motion-class for the pulse is absent). The chip's foreground gradient `width` retargets without smooth interpolation (jumps per tick). Haptics + chime cross-up paths are unaffected (verified separately by C-m4c-006 + the M4a celebration tests).
Proves: plan.md § Reduced motion (chip pulse + gradient transition collapse under reduced motion) — covers SPEC AC #27.

### M3 / M4a / M4b test migration notes

M4c's additive `runningTimerBrickId: string | null` field on `AppState` will surface as TypeScript errors in any pre-existing test that constructs an `AppState` literal. BUILDER fixes these in place during the TDD red phase (the typecheck flags them on first failed test). The list below is exhaustive at the time of TESTS authoring (verified via `grep -n "blocks: \[\], categories: \[\]" lib/data.test.ts` and the M4b BuildingClient mock); BUILDER greps once more before the red phase to catch any added since:

| File                                         | Line    | Symbol / context                               | Migration                                              |
| -------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------------------ |
| `lib/data.test.ts`                           | 23      | `U-m2-009` `AppState` literal in `assertNever` | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 31      | `U-m2-009` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 47      | `U-m2-009` `AppState` literal in ADD_CATEGORY  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 58      | `U-m2-009` `AppState` literal in ADD_CATEGORY  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 65–67   | `U-m2-009` `defaultState()` deep-equal         | extend expected to include `runningTimerBrickId: null` |
| `lib/data.test.ts`                           | 170     | `U-m3-009` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 212     | `U-m3-010` `AppState` literal                  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 234     | `U-m3-011` `AppState` literal in `assertNever` | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 241–243 | `U-m3-011` `defaultState()` deep-equal         | extend expected to include `runningTimerBrickId: null` |
| `lib/data.test.ts`                           | 470     | `U-m4a-*` `AppState` literal (LOG_TICK_BRICK)  | add `runningTimerBrickId: null`                        |
| `lib/data.test.ts`                           | 835     | `U-m4b-*` `AppState` literal (LOG_GOAL_BRICK)  | add `runningTimerBrickId: null`                        |
| `app/(building)/BuildingClient.m4b.test.tsx` | 32–55   | mocked `defaultState` factory                  | add `runningTimerBrickId: null` to the mocked return   |

Each is a one-line additive edit; no AC changes. EVALUATOR validates the migration is mechanical, not semantic. The `U-m2-009` and `U-m3-011` `defaultState()` deep-equal IDs **expand their assertion** to include the new field — the test's intent (defaultState is empty, no factory data) is unchanged; only the literal shape grows by one field. Any test added between this TESTS dispatch and BUILDER's red phase will surface during `tsc --noEmit` and gets the same one-line fix. None of the existing M4a / M4b / M4d test IDs are obsoleted.

Deferred-cleanup items inherited from prior milestones (M4a's 4 deferred tests.md cleanup items, M4b's 1 deferred item, M4d's 12 vacuous-pass-guarded e2e/a11y items) are explicitly OUT of scope for the M4c TESTS dispatch and remain owned by separate TESTS-mode re-dispatches for those milestones.

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                              | Covering test IDs                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| #1  | Tap stopped time chip → `START_TIMER` (≥ 44 px tap target)                                                      | C-m4c-003, C-m4c-013, U-m4c-016, E-m4c-001                                                         |
| #2  | Tap running time chip → `STOP_TIMER`                                                                            | C-m4c-004, C-m4c-013                                                                               |
| #3  | `START_TIMER` reducer sets `runningTimerBrickId = brickId`; idempotent on re-start                              | U-m4c-001, U-m4c-003                                                                               |
| #4  | `STOP_TIMER` reducer sets `runningTimerBrickId = null`                                                          | U-m4c-004, U-m4c-005                                                                               |
| #5  | `lib/timer.ts` runs single setInterval when running; stops when null                                            | U-m4c-012, U-m4c-013, E-m4c-002                                                                    |
| #6  | Each tick dispatches `TICK_TIMER` w/ floored minutes                                                            | U-m4c-012, E-m4c-002                                                                               |
| #7  | `TICK_TIMER` reducer updates brick's `minutesDone`                                                              | U-m4c-006, U-m4c-007, U-m4c-008, C-m4c-015                                                         |
| #8  | Foreground gradient width = `(minutesDone / durationMin) × 100%`; reduced-motion jumps                          | E-m4c-002, A-m4c-004                                                                               |
| #9  | Badge `${minutesDone} / ${durationMin} m`; ▶/⏸ glyph swap                                                       | C-m4c-001, C-m4c-002, E-m4c-001                                                                    |
| #10 | Haptic `light` on Start; `light` on Stop                                                                        | C-m4c-003, C-m4c-004, C-m4c-013                                                                    |
| #11 | Starting B while A runs auto-stops A (state-level)                                                              | U-m4c-002, C-m4c-014, C-m4c-019, E-m4c-004                                                         |
| #12 | After auto-stop, A's glyph reverts to ▶; B becomes ⏸                                                            | C-m4c-014, E-m4c-004                                                                               |
| #13 | Long-press (≥ 500 ms) opens `<TimerSheet>`                                                                      | U-m4c-016, C-m4c-005, C-m4c-017, E-m4c-005                                                         |
| #14 | Sheet has number input pre-filled, Save / Cancel buttons                                                        | C-m4c-007, C-m4c-017, E-m4c-005                                                                    |
| #15 | Save dispatches `SET_TIMER_MINUTES` clamped `[0, durationMin]`                                                  | U-m4c-009, C-m4c-008, C-m4c-017, E-m4c-005                                                         |
| #16 | Sheet does not stop the timer; new `minutesDone` becomes the new floor                                          | U-m4c-015, C-m4c-018                                                                               |
| #17 | Cancel closes the sheet without dispatching                                                                     | C-m4c-011, C-m4c-017, E-m4c-005                                                                    |
| #18 | Manual entry > durationMin → clamp + `medium` haptic                                                            | U-m4c-009, C-m4c-009, E-m4c-005                                                                    |
| #19 | Block scaffold, BlueprintBar, HeroRing, hero numeral all update on each `TICK_TIMER`                            | C-m4c-015, E-m4c-002                                                                               |
| #20 | Block 100% cross-up: bloom + chime + `success`                                                                  | inherited from M4a (`U-m4a-013`, `C-m4a-013`, etc.); reused unchanged via plan.md § Visual cascade |
| #21 | Day 100% cross-up: fireworks + chime + `notification`                                                           | inherited from M4a (`C-m4a-014`, `U-m4a-014`); reused unchanged via plan.md § Visual cascade       |
| #22 | Collapsing the block does NOT stop the timer                                                                    | C-m4c-016, E-m4c-003                                                                               |
| #23 | Re-expanding shows latest accumulated `minutesDone`                                                             | C-m4c-016, E-m4c-003                                                                               |
| #24 | Tab-background recovery via `visibilitychange`                                                                  | U-m4c-014                                                                                          |
| #25 | Tick bricks unchanged                                                                                           | C-m4c-020 (regression in tray); inherited from M4a (`C-m4a-*`)                                     |
| #26 | Goal bricks unchanged                                                                                           | C-m4c-020 (regression in tray); inherited from M4b (`C-m4b-*`)                                     |
| #27 | Reduced motion: chip pulse suppressed; gradient jumps                                                           | C-m4c-006, A-m4c-004                                                                               |
| #28 | Composite `aria-label` per AC #28 string                                                                        | C-m4c-001, C-m4c-002, A-m4c-003                                                                    |
| #29 | `aria-pressed={running}` on the tap surface                                                                     | C-m4c-001, C-m4c-002, A-m4c-003, E-m4c-001                                                         |
| #30 | axe-core: zero violations                                                                                       | A-m4c-001, A-m4c-002, C-m4c-012                                                                    |
| #31 | `tsc --noEmit`: zero new errors                                                                                 | gate (`npm run eval`); also U-m4c-010, U-m4c-011                                                   |
| #32 | ESLint: zero new errors                                                                                         | gate (`npm run eval`)                                                                              |
| #33 | Vitest: reducer + `lib/timer.ts` lifecycle tests                                                                | U-m4c-001..015 (reducer + timer); U-m4c-016 (`useLongPress`)                                       |
| #34 | Playwright (deferred-to-preview): tap, collapse-keeps-running, second-timer-auto-stops, long-press manual entry | E-m4c-001..005, A-m4c-001..004                                                                     |

### Sandbox / preview note

Per the established M4a/M4b/M4d pattern: this sandbox cannot launch chromium (binary missing — confirmed by the prior milestones' EVALUATOR reports and `status.md`). The 5 `E-m4c-*` and 4 `A-m4c-*` IDs above are authored as full GIVEN/WHEN/THEN specs but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the same `if ((await chip.count()) > 0)` guard pattern as `tests/e2e/m4a.spec.ts` and `tests/e2e/m4b.spec.ts`, which yields a vacuous PASS when the chip is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md` under M4a's "open loops" — and a future TESTS-mode dispatch owes a deterministic seeding helper (a `?seed=m4c-running-timer` query-param fixture, or an `__APP_TEST_SEED__` window hook, or an injected reducer initial state) that lifts the guards across all four milestones in one pass. M4c does NOT introduce that helper (it would touch four prior test files and is therefore out of scope per ADR-022). The 9 deferred-to-preview IDs are net-additive to the 17 vacuous-pass-guarded items already tracked from M4a + M4b + M4d (~26 items total post-M4c); they will all be cleared in the same future cleanup dispatch.

### Spec gaps surfaced for VERIFIER

None. SG-m4c-01 through SG-m4c-08 are resolved in plan.md and reflected directly in the test IDs above (`U-m4c-012` for SG-m4c-01/02, `U-m4c-014` for SG-m4c-08, `U-m4c-009` for SG-m4c-03's defensive integer floor, `C-m4c-014` for SG-m4c-05, `C-m4c-007` for SG-m4c-06, `U-m4c-016` for SG-m4c-07).

**Two items VERIFIER may want to flag and either accept or escalate** (mirroring plan.md § Open questions for VERIFIER — answers should be one-line confirmations, not re-plans):

1. **ADR-017 partial-fulfillment.** The tests cover timer behaviour within a session (start, stop, single-running, manual entry, tab-background recovery, block-collapse independence) but do NOT cover localStorage persistence of `runningTimerBrickId` + `startedAt` across page refresh. Spec AC #34 explicitly does not require persistence; M8 will land it. If VERIFIER reads ADR-017 strictly, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.`. Otherwise PASS.
2. **`useTimer` dep-array width.** `U-m4c-015` asserts the manual-entry-while-running path works (effect re-runs when `state.blocks[].bricks[]` changes the running brick's `minutesDone`). The plan accepts a wider-than-minimal `useEffect` dep array (the whole `state`) to make this work without a derived selector. If VERIFIER prefers a tight dep (the running brick's `minutesDone` only), `U-m4c-015` still holds — it asserts the observable outcome, not the dep-array shape — but `lib/timer.ts`'s implementation would refactor to a `useMemo` selector. Either implementation passes `U-m4c-015`; flag for awareness.

## Milestone 4e — Brick duration + overlap engine — Tests

This entry covers M4e — the universal duration axis (ADR-042) and the overlap engine. Test ID prefixes:

- `U-m4e-` — unit (Vitest, no DOM): `lib/overlap.ts` truth table + selectors, `lib/data.ts` `ADD_BRICK` invariant arm, `withDurationDefaults` migration helper.
- `C-m4e-` — component (Vitest + Testing Library): `<AddBrickSheet>` toggle + reveal + overlap chip + save paths, `<AddBlockSheet>` overlap upgrade, `<BrickChip>` secondary-line (tick / goal / time variants), `<LooseBricksTray>` filtered input contract, `<Timeline>` union renderer, `<TimedLooseBrickCard>` positioning + interactivity, `<BuildingClient>` selector wiring + reducer-initializer migration.
- `E-m4e-` — Playwright e2e (`tests/e2e/m4e.spec.ts`): toggle-OFF regression byte-identity, timed-loose-brick → timeline promotion, AddBrickSheet overlap + Save-disable, fix-overlap → Save-enable, AddBlockSheet overlap against a timed loose brick.
- `A-m4e-` — Playwright a11y (`tests/e2e/m4e.a11y.spec.ts`): axe-core zero violations, `role="switch"` + `aria-checked` correctness, `role="alert"` warning chip announcement, `aria-disabled` + `aria-describedby` hint on disabled Save.

E2E + a11y specs continue the **deferred-to-preview** pattern from M4a/M4b/M4c/M4d: tests live in `tests/e2e/m4e.*.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox (Playwright's chromium binary is missing in this environment — established M0..M4d pattern; flagged in `status.md` as vacuous-pass debt). A future TESTS-mode dispatch owes a deterministic seeding helper that lifts these guards across M4a/M4b/M4c/M4d/M4e in one pass; M4e does NOT introduce that helper (it would touch five prior test files).

M4e's surface is selector-heavy (the pure-function overlap engine is the core add) plus a focused set of UI extensions in two Add sheets and three rendering surfaces. Unit coverage is deep on the overlap truth table and the reducer invariant (where correctness is purely a math/identity problem); component coverage focuses on the toggle reveal, the overlap chip render, the Save-disable, and the byte-identity regression when `hasDuration === false`. E2E + a11y are thin (5 + 4 IDs) and explicitly preview-deferred per the M4a–M4d pattern.

### Pre-M4e Brick literal migration table

M4e's additive `hasDuration: boolean` field on `BrickBase` will surface as TypeScript errors in any pre-existing test that constructs a `Brick` literal without the field. The plan locks the migration to **explicit `hasDuration: false` per literal** (preferred when the test cares about brick shape) OR **wrapping the literal in `withDurationDefaults(...)`** (when routed through a fixture helper). BUILDER fixes these in place during the TDD red phase (the typecheck flags them on first failed test). The list below is exhaustive at the time of TESTS authoring (verified via `grep -cE 'kind: "(tick|goal|time)"'` across `lib/`, `components/`, `app/(building)/`); BUILDER greps once more before the red phase to catch any added since:

| File                                         | Literal count | Migration                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/data.test.ts`                           | 34            | add `hasDuration: false` to every brick literal in M3/M4a/M4b reducer-arm tests (where the test does not care about M4e)                                                                                                                                                                                                                                                                                          |
| `lib/dharma.test.ts`                         | 9             | add `hasDuration: false` to every brick literal (these tests exercise `toMin` / formatting helpers and are M4e-agnostic)                                                                                                                                                                                                                                                                                          |
| `lib/scoring.test.ts`                        | 2             | add `hasDuration: false` (block-percent math; M4e-agnostic)                                                                                                                                                                                                                                                                                                                                                       |
| `lib/timer.test.ts`                          | 1             | add `hasDuration: false` to the seeded time brick (M4c timer hook; M4e-agnostic)                                                                                                                                                                                                                                                                                                                                  |
| `components/BrickChip.test.tsx`              | 10            | add `hasDuration: false` to existing tick / goal / time chip literals; **new M4e IDs (C-m4e-014..021) introduce timed-brick variants explicitly**                                                                                                                                                                                                                                                                 |
| `components/Brick.test.tsx`                  | 5             | add `hasDuration: false` (obsolete-shim test file; literal shape only)                                                                                                                                                                                                                                                                                                                                            |
| `components/TimelineBlock.test.tsx`          | 13            | add `hasDuration: false` to nested-brick literals inside seeded blocks                                                                                                                                                                                                                                                                                                                                            |
| `components/LooseBricksTray.test.tsx`        | 4             | add `hasDuration: false` to existing loose-brick literals; **new M4e IDs (C-m4e-022..023) introduce timed loose bricks**                                                                                                                                                                                                                                                                                          |
| `components/TimerSheet.test.tsx`             | 1             | add `hasDuration: false` to the seeded time brick                                                                                                                                                                                                                                                                                                                                                                 |
| `components/BlueprintBar.test.tsx`           | 1             | add `hasDuration: false` to the one nested-brick literal                                                                                                                                                                                                                                                                                                                                                          |
| `app/(building)/BuildingClient.m4b.test.tsx` | 1             | add `hasDuration: false` to the mocked `defaultState` factory's seeded goal brick                                                                                                                                                                                                                                                                                                                                 |
| `app/(building)/BuildingClient.m4c.test.tsx` | 2             | add `hasDuration: false` to the seeded time bricks (both `t1` and `t2`)                                                                                                                                                                                                                                                                                                                                           |
| `components/Timeline.test.tsx`               | 0             | **no brick literals**; but the `Timeline` prop signature changes from `blocks: Block[]` to `items: TimelineItem[]` per the plan — every `<Timeline blocks={...} />` call site (lines 227 / 252 / 268, plus the `defaultProps.blocks = []`) is migrated to `<Timeline items={selectTimelineItems(state)} />` or to a hand-rolled `items={[{kind:"block", block}]}` literal where the test does not seed full state |
| `components/AddBrickSheet.test.tsx`          | 0             | **no brick literals** today; **new M4e IDs (C-m4e-001..013) construct timed-brick payloads via `handleSave` mocks**                                                                                                                                                                                                                                                                                               |
| `components/AddBlockSheet.test.tsx`          | 0             | **no brick literals** today; **new M4e ID (C-m4e-024..026) seeds a timed loose brick in `state` for the collision-check**                                                                                                                                                                                                                                                                                         |
| `app/(building)/BuildingClient.m4d.test.tsx` | 0             | **no brick literals** today; nothing to migrate                                                                                                                                                                                                                                                                                                                                                                   |
| `app/(building)/BuildingClient.test.tsx`     | 0             | **no brick literals** today; `<LooseBricksTray>` prop call site (`looseBricks={state.looseBricks}`) becomes `looseBricks={selectTrayBricks(state)}` per the plan, and `<Timeline blocks={state.blocks}>` becomes `<Timeline items={selectTimelineItems(state)}>` — covered by C-m4e-027                                                                                                                           |

Each is a one-line additive edit; no AC changes. EVALUATOR validates the migration is mechanical, not semantic. None of the existing M2/M3/M4a/M4b/M4c/M4d test IDs are obsoleted. The `<Timeline>` prop-signature change (`blocks: Block[]` → `items: TimelineItem[]`) is a cross-cutting rename — BUILDER handles inline as typecheck errors surface; M2's `C-m1-009..013` test IDs continue to apply unchanged (they construct `items=[{kind:"block", block}]` instead of `blocks=[block]`).

Deferred-cleanup items inherited from prior milestones (M4a's 4 deferred tests.md cleanup items, M4b's 1 deferred item, M4c's vacuous-pass items, M4d's 12 vacuous-pass-guarded e2e/a11y items) are explicitly OUT of scope for the M4e TESTS dispatch and remain owned by separate TESTS-mode re-dispatches for those milestones.

### Unit (Vitest)

#### U-m4e-001

Target file: `lib/overlap.test.ts` (NEW)
**GIVEN** two intervals `a = { start: "09:00", end: "10:00" }` and `b = { start: "09:30", end: "10:30" }` (b starts strictly before a ends, a starts strictly before b ends — classic overlap)
**WHEN** `intervalsOverlap(a, b)` is called
**THEN** the return value is `true`. **AND** by symmetry, `intervalsOverlap(b, a)` is also `true`.
Proves: plan.md § Library modules `intervalsOverlap` (half-open intersection formula `as < be && bs < ae`) — covers SPEC AC #11.

#### U-m4e-002

Target file: `lib/overlap.test.ts`
**GIVEN** two intervals `a = { start: "09:00", end: "10:00" }` and `b = { start: "10:00", end: "11:00" }` (touching at `10:00` — half-open `[a.start, a.end)` excludes `10:00`)
**WHEN** `intervalsOverlap(a, b)` is called
**THEN** the return value is `false` (back-to-back boundary sharing is NOT an overlap per ADR-006). **AND** `intervalsOverlap(b, a)` also returns `false`.
Proves: plan.md § Edge cases ("Back-to-back tasks share a boundary") + ADR-006 honor — covers SPEC AC #11 + § Edge cases.

#### U-m4e-003

Target file: `lib/overlap.test.ts`
**GIVEN** two intervals `a = { start: "09:00", end: "09:30" }` and `b = { start: "10:00", end: "10:30" }` (separated by 30 min)
**WHEN** `intervalsOverlap(a, b)` is called
**THEN** the return value is `false` (`a.end <= b.start` so `as < be` holds but `bs < ae` fails).
Proves: plan.md § Library modules `intervalsOverlap` (negative branch) — covers SPEC AC #11.

#### U-m4e-004

Target file: `lib/overlap.test.ts`
**GIVEN** two intervals `a = { start: "09:00", end: "10:00" }` and `b = { start: "09:00", end: "10:00" }` (identical, both non-empty)
**WHEN** `intervalsOverlap(a, b)` is called
**THEN** the return value is `true` (intervals are identical and non-degenerate).
Proves: plan.md § Edge cases ("Two tasks share both Start and End") — covers SPEC AC #11 + § Edge cases.

#### U-m4e-005

Target file: `lib/overlap.test.ts`
**GIVEN** two intervals `a = { start: "09:00", end: "11:00" }` and `b = { start: "09:30", end: "10:30" }` (b fully contained inside a)
**WHEN** `intervalsOverlap(a, b)` is called
**THEN** the return value is `true`. **AND** by symmetry, `intervalsOverlap(b, a)` is also `true` (the "container is also overlapped by containee" case).
Proves: plan.md § Edge cases ("One task fully contains another") — covers SPEC AC #11 + § Edge cases.

#### U-m4e-006

Target file: `lib/overlap.test.ts`
**GIVEN** a `candidate = { start: "09:30", end: "10:30" }` and a list of `TimedItem`s `[{kind:"block", id:"b1", start:"09:00", end:"10:00", name:"A", categoryId:null}, {kind:"block", id:"b2", start:"10:00", end:"11:00", name:"B", categoryId:null}, {kind:"block", id:"b3", start:"12:00", end:"13:00", name:"C", categoryId:null}]`
**WHEN** `findOverlaps(candidate, items)` is called (no `excludeId`)
**THEN** the returned array has length 2 and contains `b1` and `b2` in that order (sorted by start asc); `b3` is absent (`12:00 > 10:30` no collision).
Proves: plan.md § Library modules `findOverlaps` (filter + multi-collision + sort by start asc) — covers SPEC AC #15, #18.

#### U-m4e-007

Target file: `lib/overlap.test.ts`
**GIVEN** a `candidate = { start: "09:30", end: "10:30" }` and a list `[{kind:"block", id:"b1", start:"09:00", end:"10:00", name:"A", categoryId:null}, {kind:"brick", id:"r1", start:"09:00", end:"10:00", name:"B", categoryId:null}]` (both start at 09:00; one is a block, one is a brick)
**WHEN** `findOverlaps(candidate, items)` is called
**THEN** the returned array length is 2 and order is `[b1 (block), r1 (brick)]` (tie on start broken by kind — "block" before "brick").
**AND** when the test adds a second block `{kind:"block", id:"b2", start:"09:00", end:"10:00", name:"AA", categoryId:null}` to the input, the returned order is `[b2 (AA), b1 (A), r1]` (ties on start AND kind broken by name alphabetic).
Proves: plan.md § Library modules `findOverlaps` (sort tiebreakers: kind, then name) — covers SPEC AC #18.

#### U-m4e-008

Target file: `lib/overlap.test.ts`
**GIVEN** a `candidate = { start: "09:30", end: "10:30" }` and a list containing one block whose `id === "self"` overlapping the candidate, plus a second block whose `id === "other"` also overlapping
**WHEN** `findOverlaps(candidate, items, "self")` is called (excludeId set to the first block's id)
**THEN** the returned array length is 1 and contains only `"other"`; the `"self"` block is filtered out.
**AND** when `findOverlaps(candidate, items, undefined)` is called against the same input, both are returned (excludeId === undefined is the M4e default and filters nothing).
Proves: plan.md § Library modules `findOverlaps` (`excludeId` filter for M5 edit-mode; M4e passes `undefined`) — covers SPEC AC #12, #17.

#### U-m4e-009

Target file: `lib/overlap.test.ts`
**GIVEN** an empty items list `[]` and any candidate
**WHEN** `findOverlaps(candidate, [])` is called
**THEN** the returned array is `[]` (length 0). No throw, no undefined.
Proves: plan.md § Library modules `findOverlaps` (empty input edge case; filter-then-sort short-circuit) — covers SPEC AC #15 (boundary).

#### U-m4e-010

Target file: `lib/overlap.test.ts`
**GIVEN** an `AppState` with two blocks (`b1` 09:00–10:00 with `end` set, `b2` with `end` undefined) and one loose brick `{ id:"r1", kind:"tick", hasDuration:true, start:"09:30", end:"10:30", ... }` and a second loose brick `{ id:"r2", kind:"goal", hasDuration:false, ... }` (no time fields), and one nested brick inside `b1` `{ id:"n1", kind:"time", hasDuration:true, start:"09:15", end:"09:45", ... }`
**WHEN** `selectAllTimedItems(state)` is called
**THEN** the returned array has length 3: one block (`b1`), and two bricks (`n1` nested + `r1` loose). The no-end block (`b2`) is skipped. The loose brick `r2` without duration is excluded. Each item has the `kind` discriminant + the original `id`, `name`, `start`, `end`, `categoryId`.
Proves: plan.md § Library modules `selectAllTimedItems` (filters `!bl.end` and `!b.hasDuration`; walks both `state.blocks[*].bricks[*]` and `state.looseBricks`) — covers SPEC AC #16, #17.

#### U-m4e-011

Target file: `lib/overlap.test.ts`
**GIVEN** an empty `AppState` (`{ blocks: [], looseBricks: [], ... }`)
**WHEN** `selectAllTimedItems(state)` is called
**THEN** the returned array is `[]`.
**AND** `selectTrayBricks(state)` returns `[]`.
**AND** `selectTimelineItems(state)` returns `[]`.
Proves: plan.md § Library modules (all three selectors handle empty state) — covers SPEC AC #27, #28 (boundary).

#### U-m4e-012

Target file: `lib/overlap.test.ts`
**GIVEN** an `AppState` whose `looseBricks` contains three bricks: `{ id:"r1", hasDuration:false }`, `{ id:"r2", hasDuration:true, start:"10:00", end:"11:00", ... }`, `{ id:"r3", hasDuration:false }`
**WHEN** `selectTrayBricks(state)` is called
**THEN** the returned array has length 2 and contains exactly `r1` and `r3` (in original `looseBricks` order — the selector is `looseBricks.filter`, not a re-sort). The timed `r2` is excluded.
Proves: plan.md § Library modules `selectTrayBricks` (filters `b.hasDuration !== true`) — covers SPEC AC #27.

#### U-m4e-013

Target file: `lib/overlap.test.ts`
**GIVEN** an `AppState` with two blocks (`b1` start 10:00, `b2` start 08:00) and three loose bricks (`r1` hasDuration:true start 09:00, `r2` hasDuration:false, `r3` hasDuration:true start 11:00)
**WHEN** `selectTimelineItems(state)` is called
**THEN** the returned array has length 4 (2 blocks + 2 timed bricks; `r2` excluded). The order by `start` asc is: `b2 (08:00)`, `r1 (09:00)`, `b1 (10:00)`, `r3 (11:00)`. Each entry is shaped `{kind:"block", block}` or `{kind:"brick", brick}` (the union the plan locks).
Proves: plan.md § Library modules `selectTimelineItems` (union of blocks + timed loose bricks, sorted by start asc, brick-shape discriminated) — covers SPEC AC #28, #30.

#### U-m4e-014

Target file: `lib/overlap.test.ts`
**GIVEN** an `AppState` with one timed loose brick that has `hasDuration: true` but `start === undefined` (defense-in-depth; should never happen post-invariant but tests the selector guard)
**WHEN** `selectTimelineItems(state)` is called
**THEN** the returned array does NOT include the malformed brick (the `br.start !== undefined` guard fires).
**AND** `selectAllTimedItems(state)` also excludes it (same guard pattern).
Proves: plan.md § Library modules (defensive `br.start !== undefined` guards) — covers SPEC § Schema invariant (defense-in-depth).

#### U-m4e-015

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` and an action `{ type: "ADD_BRICK", brick: { id:"r1", kind:"tick", done:false, name:"Run", categoryId:null, parentBlockId:null, hasDuration:true, start:"09:00", end:"09:30", recurrence:{kind:"just-today", date:"2026-05-14"} } }` (all three optional fields populated)
**WHEN** `reducer(state, action)` is called
**THEN** the returned state has the brick appended to `state.looseBricks` (since `parentBlockId === null`); the brick's `hasDuration: true` + `start: "09:00"` + `end: "09:30"` + `recurrence` are all present on the stored shape.
Proves: plan.md § Reducer invariant enforcement (`ADD_BRICK` happy path with `hasDuration: true`) — covers SPEC AC #6, #32.

#### U-m4e-016

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` and an action `{ type: "ADD_BRICK", brick: { id:"r1", kind:"tick", done:false, name:"Run", ..., hasDuration:true, start:"09:00", end:undefined, recurrence:{kind:"just-today", date:"2026-05-14"} } }` (hasDuration true but `end` missing — invariant violation)
**WHEN** `reducer(state, action)` is called
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the brick is NOT added to `looseBricks` (no append; identity preserved).
**AND** the same path is exercised with `start: undefined` and again with `recurrence: undefined` (three separate sub-assertions for each missing field).
Proves: plan.md § Reducer invariant enforcement (`hasDuration === true && !allPresent` rejection branch) — covers SPEC AC #32.

#### U-m4e-017

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` and an action `{ type: "ADD_BRICK", brick: { id:"r1", kind:"tick", done:false, name:"Run", ..., hasDuration:false, start:"09:00", end:undefined, recurrence:undefined } }` (hasDuration false but `start` defined — invariant violation)
**WHEN** `reducer(state, action)` is called
**THEN** the returned state is the **same reference** as the input state; the brick is NOT added.
**AND** the same path is exercised with `end: "09:30"` (only) and again with `recurrence: {kind:"just-today", date:"2026-05-14"}` (only).
Proves: plan.md § Reducer invariant enforcement (`hasDuration === false && (any field defined)` rejection branch) — covers SPEC AC #32.

#### U-m4e-018

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` and an action `{ type: "ADD_BRICK", brick: { id:"r1", kind:"tick", done:false, name:"Run", ..., hasDuration:false } }` (no time fields at all — valid M3/M4a/M4b/M4c shape)
**WHEN** `reducer(state, action)` is called
**THEN** the returned state has the brick appended to `state.looseBricks`; the brick's `hasDuration` reads `false`; `start`, `end`, `recurrence` are all `undefined` on the stored shape.
Proves: plan.md § Reducer invariant enforcement (`hasDuration === false` + no fields = valid path; preserves M3/M4a/b/c byte-identity) — covers SPEC AC #5.

#### U-m4e-019

Target file: `lib/data.test.ts`
**GIVEN** a pre-M4e Brick literal `{ id:"r1", kind:"tick", done:false, name:"Run", categoryId:null, parentBlockId:null }` cast through `any` (no `hasDuration` field present)
**WHEN** `withDurationDefaults(brick)` is called
**THEN** the returned brick has `hasDuration: false` filled in; `start`, `end`, `recurrence` remain absent; every other field (`id`, `kind`, `done`, `name`, `categoryId`, `parentBlockId`) is preserved byte-identically (`Object.keys` matches the input plus `hasDuration`).
Proves: plan.md § Locked schema additions `withDurationDefaults` (fills the flag when missing) — covers SPEC § Edge cases (pre-M4e migration), SPEC AC #5.

#### U-m4e-020

Target file: `lib/data.test.ts`
**GIVEN** a post-M4e Brick literal `{ ..., hasDuration: true, start: "09:00", end: "09:30", recurrence: { kind: "just-today", date: "2026-05-14" } }`
**WHEN** `withDurationDefaults(brick)` is called
**THEN** the returned brick is **the same reference** as the input (`Object.is(out, brick) === true`); the helper short-circuits when `hasDuration` is already a boolean.
**AND** when called on `{ ..., hasDuration: false }` (no time fields), same-ref short-circuit fires.
Proves: plan.md § Locked schema additions `withDurationDefaults` (idempotency when flag already set) — covers SPEC § Edge cases (migration helper is a no-op on already-migrated bricks).

#### U-m4e-021

Target file: `lib/data.test.ts`
**GIVEN** the M4e-extended `Action` union and the M4e-extended `BrickBase` shape
**WHEN** the reducer's `default` arm is reached with an action of type `"NOPE"` (cast through `any`)
**THEN** the call throws (`assertNever` exhaustiveness preserved — no new union arms were added in M4e per plan § Locked schema additions; the four M4c arms plus M3's `ADD_BRICK` are all still exhaustive).
**AND** every existing `defaultState()` deep-equal assertion still passes (no new field on `AppState`; the change is on `BrickBase`).
Proves: plan.md § Decisions to honor ("`assertNever` exhaustiveness preserved by NOT adding any new `Action` types") — covers SPEC AC #33.

### Component (Vitest + Testing Library)

#### C-m4e-001

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** `<AddBrickSheet open={true} parentBlockId={null} state={emptyState} categories={[]} onSave={vi.fn()} onCancel={vi.fn()} onCreateCategory={vi.fn()} />` rendered (with `state` containing zero blocks and zero loose bricks)
**WHEN** the DOM is queried
**THEN** exactly one element with `role="switch"` is present (`getByRole('switch', { name: /duration/i })`); its `aria-checked` attribute reads `"false"`; the Start, End, and Recurrence form rows are NOT in the DOM (`queryByLabelText(/start/i)` returns `null`; same for `/end/i`; `queryByRole('radiogroup')` for the recurrence chip group returns `null`).
Proves: plan.md § Components `<AddBrickSheet>` (toggle row inserted between score-type chips and Save; defaults OFF; no time fields rendered when OFF) — covers SPEC AC #1.

#### C-m4e-002

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the same sheet rendered as C-m4e-001, `lib/haptics` mocked
**WHEN** the user clicks the Duration toggle (`fireEvent.click(getByRole('switch'))`)
**THEN** the toggle's `aria-checked` flips to `"true"`; `haptics.light` is called exactly once; the Start, End, and Recurrence rows ARE now in the DOM (`getByLabelText(/start/i)`, `getByLabelText(/end/i)`, `getByRole('radiogroup', { name: /recurrence/i })` all resolve).
**AND** no `<AnimatePresence>` or `motion.div` wrapper exists around the three fields (a regression check for SG-m4e-07's instant-reveal lock — assert via `container.querySelector('[data-framer-appear-id]')` returns `null`, or assert the fields' computed `transition` style is `none`).
Proves: plan.md § Components `<AddBrickSheet>` (`handleDurationToggle` fires `haptics.light` then reveals fields) + § Motion ("Field reveal: instant; no `<AnimatePresence>`") — covers SPEC AC #2.

#### C-m4e-003

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet rendered with `parentBlockId="bk1"` and `state` containing one block `{ id:"bk1", start:"06:00", end:"06:40", ... }` and the toggle OFF
**WHEN** the user clicks the Duration toggle ON
**THEN** the Start input is populated with `"06:00"` (the parent block's `start`); the End input is populated with `"06:40"` (the parent block's `end`); the Recurrence chip group has the "Just today" chip selected (`aria-checked="true"`).
**AND** when the same sheet is rendered with `parentBlockId={null}` (loose brick) and the system clock mocked to `10:23:00` local time, toggle ON populates Start with `"10:00"` (current hour rounded down) and End with `"10:30"` (Start + 30 min).
Proves: plan.md § Components `<AddBrickSheet>` (default values when toggle flips ON — nested uses parent's start/end; loose uses current-hour-floor + 30 min) — covers SPEC AC #3.

#### C-m4e-004

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet rendered with the toggle ON and Start/End populated to `"09:00"`/`"09:30"`, plus a non-blank title and a tick score-type selected
**WHEN** the user clicks the Duration toggle OFF (back to OFF)
**THEN** the Start, End, and Recurrence rows are no longer in the DOM (regression with C-m4e-001); `haptics.light` is called (this flip's haptic).
**AND** when the user then clicks Save, `onSave` is called exactly once with a brick whose shape is `{ ..., hasDuration: false }` and **no** `start`, `end`, or `recurrence` keys (the in-progress entries are discarded silently per AC #4).
Proves: plan.md § Components `<AddBrickSheet>` (`handleSave` reads `hasDuration` as the source of truth; toggle-OFF discards) — covers SPEC AC #4, AC #5.

#### C-m4e-005

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with a non-blank title, a goal score-type selected, the toggle ON, Start `"09:00"`, End `"09:30"`, Recurrence default `{kind:"just-today", date:<today>}`, no overlapping items in `state`
**WHEN** the user clicks Save
**THEN** `onSave` is called exactly once with a brick `{ ..., hasDuration: true, start: "09:00", end: "09:30", recurrence: { kind: "just-today", date: ... } }`; all three optional fields are populated.
Proves: plan.md § Components `<AddBrickSheet>` (Save with toggle ON writes all three fields per AC #6) — covers SPEC AC #6, AC #10.

#### C-m4e-006

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with the toggle ON, Start `"09:00"`, End `"09:00"` (zero-duration window — invalid)
**WHEN** the DOM is queried after the End input change
**THEN** an inline `role="alert"` element is in the DOM with text content matching `/end must be after start/i`; the Save button has `aria-disabled="true"`.
**AND** when End is changed to `"08:00"` (start > end), the same `role="alert"` is present and Save remains `aria-disabled="true"`.
Proves: plan.md § Components `<AddBrickSheet>` (inline `endAfterStart` alert + Save-disable on zero/negative duration) — covers SPEC AC #21 + § Edge cases.

#### C-m4e-007

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with the toggle ON, Start `"23:00"`, End `"01:00"` (straddles midnight — single-day invariant violation)
**WHEN** the DOM is queried after the End change
**THEN** an inline `role="alert"` element is in the DOM with text matching `/same day/i` (the `isValidEnd` regex from `blockValidation.ts` returns false); Save has `aria-disabled="true"`.
Proves: plan.md § Edge cases ("Toggle ON, Start/End straddle midnight") + plan.md § Components `<AddBrickSheet>` (reuse `isValidEnd` from blockValidation) — covers SPEC § Edge cases + AC #21.

#### C-m4e-008

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with a non-blank title, toggle ON, Start `"09:00"`, End `"09:30"`, and `state` containing one block `{ id:"bk1", start:"08:30", end:"09:30", name:"Stretch", ... }` (the new brick window overlaps the block's `[08:30, 09:30)`)
**WHEN** the DOM is queried
**THEN** an element with `data-testid="overlap-warning"` is in the DOM; it carries `role="alert"`; its text content matches `/overlaps with.*Block.*Stretch.*08:30.*09:30/i` (kind capitalized, name + window present); the Save button has `aria-disabled="true"`.
Proves: plan.md § Components `<AddBrickSheet>` (overlap chip render + Save-disable) — covers SPEC AC #19, AC #20, AC #21.

#### C-m4e-009

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet rendered with toggle ON, Start/End that overlap 4 existing timed items (3 blocks + 1 timed loose brick) in `state`
**WHEN** the DOM is queried for the overlap warning chip
**THEN** the chip text contains the names of the first 3 items (sorted per AC #18 — start asc, then kind, then name) followed by `+1 more`. The 4th item's name is NOT in the chip's accessible text.
Proves: plan.md § Components `<AddBrickSheet>` (max 3 listed + "+N more") — covers SPEC AC #20.

#### C-m4e-010

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet from C-m4e-008 (overlap active, Save disabled), `lib/haptics` mocked
**WHEN** the user clicks the disabled Save button (`fireEvent.click(saveButton)`)
**THEN** `haptics.medium` is called exactly once; `onSave` is NOT called; the sheet does not close (a `vi.fn()` cancel spy is not called; the sheet's parent `open` prop is unchanged).
Proves: plan.md § Components `<AddBrickSheet>` (`handleSave` early-returns with `haptics.medium()` on `!isValid`; reused for overlap case) — covers SPEC AC #22.

#### C-m4e-011

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet from C-m4e-008 (overlap active, Save disabled)
**WHEN** the user changes the End input from `"09:30"` to `"08:30"` (resolves the overlap since the new candidate `[09:00, 08:30)` is invalid — but the test then changes Start to `"08:00"` and End to `"08:30"` to create a valid non-overlapping window)
**THEN** the `data-testid="overlap-warning"` element is no longer in the DOM (`queryByTestId(...)` returns `null`); the Save button's `aria-disabled` reads `"false"` (or the attribute is absent).
**AND** clicking Save now calls `onSave` exactly once with the resolved brick.
Proves: plan.md § Components `<AddBrickSheet>` (overlap chip dismisses only by changing Start/End; Save re-enables when overlap clears) — covers SPEC AC #21, AC #23.

#### C-m4e-012

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with toggle ON, Recurrence "Custom range" selected, zero weekdays checked
**WHEN** the DOM is queried after the weekday picker renders
**THEN** an inline `role="alert"` element is in the DOM with text matching `/pick at least one weekday/i`; Save has `aria-disabled="true"`.
**AND** when the user checks Monday, the alert disappears and Save's `aria-disabled` clears (assuming title/start/end/overlap all valid).
Proves: plan.md § Components `<AddBrickSheet>` (reuse `isValidCustomRange` from blockValidation) — covers SPEC AC #9.

#### C-m4e-013

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with toggle ON, all four recurrence chips rendered (`"Just today"`, `"Every weekday"`, `"Every day"`, `"Custom range"`)
**WHEN** the DOM is queried
**THEN** exactly 4 elements with `role="radio"` are within the parent `role="radiogroup"` (single-select); the default-selected chip is `"Just today"` (`aria-checked="true"` on that chip only).
**AND** when the user selects `"Custom range"`, the chip's `aria-checked` flips to `"true"` and the inline date-range + weekday picker is visible.
Proves: plan.md § Components `<AddBrickSheet>` (RecurrenceChips reuse verbatim from M2; SG-m4e-08 lock) — covers SPEC AC #7, AC #8, AC #10.

#### C-m4e-014

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"r1", kind:"tick", done:false, name:"Run", categoryId:null, parentBlockId:null, hasDuration:true, start:"06:00", end:"06:40", recurrence:{kind:"just-today", date:"2026-05-14"} }} categories={[]} onTickToggle={vi.fn()} />` rendered
**WHEN** the DOM is queried
**THEN** there is exactly one element with `data-testid="brick-time-window"` containing the text `"06:00–06:40"` (en-dash separator); the element's computed font family includes `JetBrains` (`var(--font-mono)` resolves) and color matches `var(--ink-dim)`; the chip's primary name text `"Run"` is rendered above this element in DOM order.
Proves: plan.md § Components `<BrickChip>` (secondary-line time-window badge for `hasDuration === true` on the tick variant) — covers SPEC AC #24.

#### C-m4e-015

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"r1", kind:"goal", target:5, count:3, unit:"reps", name:"Pushups", ..., hasDuration:true, start:"07:00", end:"07:30", recurrence:{...} }} ... />` rendered
**WHEN** the DOM is queried
**THEN** the `data-testid="brick-time-window"` element is present with text `"07:00–07:30"`; the existing goal-variant `count / target` badge (e.g., `"3 / 5"`) is unchanged and still in the DOM.
Proves: plan.md § Components `<BrickChip>` (secondary-line on goal variant; coexists with existing count badge) — covers SPEC AC #24, AC #26.

#### C-m4e-016

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"t1", kind:"time", durationMin:25, minutesDone:5, name:"Read", ..., hasDuration:true, start:"08:00", end:"08:30", recurrence:{...} }} running={false} onTimerToggle={vi.fn()} onTimerOpenSheet={vi.fn()} categories={[]} />` rendered
**WHEN** the DOM is queried
**THEN** the `data-testid="brick-time-window"` element is present with text `"08:00–08:30"`; the existing time-variant performance badge `"5 / 25 m"` is still rendered (it sits to the right of the name row, per plan § Components `<BrickChip>` placement); both badges coexist.
Proves: plan.md § Components `<BrickChip>` (time-window badge coexists with the `minutesDone / durationMin` performance badge per AC #26) — covers SPEC AC #24, AC #26.

#### C-m4e-017

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"r1", kind:"tick", done:false, name:"Run", ..., hasDuration:false }} ... />` rendered (no time fields, hasDuration explicitly false)
**WHEN** the DOM is queried
**THEN** `queryByTestId('brick-time-window')` returns `null` (no secondary line rendered); the chip's other content (name, `aria-pressed`, tap target, lucide check icon) is byte-identical to the pre-M4e tick variant output.
**AND** the same regression-pass holds for `kind:"goal", hasDuration:false` and `kind:"time", hasDuration:false` chips (three sub-assertions).
Proves: plan.md § Components `<BrickChip>` (`hasDuration === false` ⇒ chip output is byte-identical to M4a/M4b/M4c) — covers SPEC AC #25.

#### C-m4e-018

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick chip with `hasDuration: true`, `start: "06:00"`, `end: "06:40"` (the AddBrickSheet just saved it)
**WHEN** the chip's accessible name is read via `getByRole('button').accessibleName` (or `toHaveAccessibleName` matcher — NOT raw `textContent`)
**THEN** the accessible name **contains** `"scheduled 06:00 to 06:40"` (or an equivalent semantic surface — if the BUILDER falls back to `aria-describedby` per the plan-flagged fallback, the test asserts via `expect(button).toHaveAccessibleDescription(/scheduled 06:00 to 06:40/i)` as a secondary path).
**AND** the test wraps both assertions in an OR so either implementation passes — see § Spec gaps surfaced for VERIFIER for the open question.
Proves: plan.md § Components `<BrickChip>` (aria-label suffix OR aria-describedby fallback — accessible-name path; either implementation satisfies AC #24's a11y surface) — covers SPEC AC #24 (a11y dimension).

#### C-m4e-019

Target file: `components/BrickChip.test.tsx`
**GIVEN** a tick chip with `hasDuration: false`
**WHEN** the chip's accessible name is read via `getByRole('button').accessibleName`
**THEN** the accessible name is byte-identical to the pre-M4e tick string (no scheduled suffix, no aria-describedby span). For a `{ done: false }` tick: `"Run, not done, tap to toggle"` exactly.
Proves: plan.md § Components `<BrickChip>` (no aria suffix when `hasDuration === false` — regression preserve) — covers SPEC AC #25.

#### C-m4e-020

Target file: `components/TimedLooseBrickCard.test.tsx` (NEW)
**GIVEN** `<TimedLooseBrickCard brick={{ id:"r1", kind:"tick", hasDuration:true, start:"09:00", end:"09:30", name:"Run", categoryId:"c1", ... }} categories={[{ id:"c1", color:"#fbbf24", ... }]} onTickToggle={vi.fn()} ... />` rendered standalone inside a fixed-height parent
**WHEN** the DOM is queried
**THEN** the outer wrapper has `data-testid="timed-loose-brick"`; its inline `style.top` is `${timeToOffsetPx("09:00", HOUR_HEIGHT_PX)}px`; its inline `style.height` is `${timeToOffsetPx("09:30", HOUR_HEIGHT_PX) - timeToOffsetPx("09:00", HOUR_HEIGHT_PX)}px`; the computed `border-style` is `dashed` and `border-width` is `1.5px`; the border-color resolves to `#fbbf24` (the brick's category color).
**AND** when the brick's `categoryId` is `null`, the border-color falls back to `var(--ink-dim)`.
Proves: plan.md § Components `<TimedLooseBrickCard>` (absolute positioning math + dashed 1.5 px outline; category color or `--ink-dim` fallback) — covers SPEC AC #30, AC #31.

#### C-m4e-021

Target file: `components/TimedLooseBrickCard.test.tsx`
**GIVEN** the same card from C-m4e-020 rendered with `onTickToggle` spy
**WHEN** the user taps the inner brick chip (`fireEvent.click(getByRole('button'))`)
**THEN** `onTickToggle` is called exactly once with `"r1"`; the card's outer wrapper does NOT swallow the event (the chip inside is fully interactive — tap, long-press, glyph swap all work).
**AND** when the card is rendered with a goal brick `{ kind:"goal", count:3, target:5, ... }`, the inner BrickStepper renders and is interactive (`onGoalLog` spy invoked on stepper tap).
Proves: plan.md § Components `<TimedLooseBrickCard>` ("inner `<BrickChip>` is fully interactive" — chip-as-body pattern) — covers SPEC AC #30 (interactivity unchanged).

#### C-m4e-022

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray looseBricks={[{id:"r1", hasDuration:false, ...}, {id:"r2", hasDuration:false, ...}]} ... />` rendered (caller has already filtered via `selectTrayBricks(state)`)
**WHEN** the DOM is queried
**THEN** exactly 2 brick chips are rendered (`getAllByRole('button', { name: /^(?!Add).*$/ })` or equivalent); no chip with the timed-brick secondary-line `data-testid="brick-time-window"` is present (the tray only ever receives `hasDuration: false` bricks by contract).
Proves: plan.md § Components `<LooseBricksTray>` (component is dumb; receives pre-filtered list per the locked decision) — covers SPEC AC #29.

#### C-m4e-023

Target file: `components/LooseBricksTray.test.tsx`
**GIVEN** `<LooseBricksTray looseBricks={[]} blocksExist={false} ... />` rendered (caller passed an empty filtered list AND `blocks.length === 0`)
**WHEN** the DOM is queried
**THEN** the tray's container is NOT in the DOM (`queryByTestId('loose-bricks-tray')` returns `null`); M3's tray-visibility contract holds.
**AND** when the test re-renders with `looseBricks={[]} blocksExist={true}`, the tray IS in the DOM (the empty-tray empty-state copy renders because blocks exist).
Proves: plan.md § Components `<LooseBricksTray>` ("tray-visibility contract from M3 preserved: tray hidden iff filtered list is empty AND no blocks exist") — covers SPEC AC #29.

#### C-m4e-024

Target file: `components/AddBlockSheet.test.tsx`
**GIVEN** `<AddBlockSheet open={true} state={stateWithOneBlock} ... />` rendered (where `stateWithOneBlock` has one block `{ id:"bk1", start:"09:00", end:"10:00", name:"Standup", ... }`), title `"Run"` typed, Start `"09:30"`, End `"10:30"` (overlaps the existing block)
**WHEN** the DOM is queried
**THEN** an element with `data-testid="overlap-warning"` is present with `role="alert"` (upgrade from M2's `role="status"`); its text contains `"Block: Standup, 09:00–10:00"`; the Save button has `aria-disabled="true"`.
Proves: plan.md § Components `<AddBlockSheet>` (M2 retroactive upgrade: `role="status"` → `role="alert"` + Save-disable) — covers SPEC AC #13, AC #19, AC #20, AC #21.

#### C-m4e-025

Target file: `components/AddBlockSheet.test.tsx`
**GIVEN** `<AddBlockSheet open={true} state={stateWithTimedLooseBrick} ... />` rendered (where `state.looseBricks` contains one brick `{ id:"r1", hasDuration:true, start:"09:30", end:"10:00", name:"Pushups", kind:"goal", ... }`), title `"Run"` typed, Start `"09:00"`, End `"10:30"`
**WHEN** the DOM is queried
**THEN** the overlap warning chip is present (`data-testid="overlap-warning"`, `role="alert"`); its text contains `"Brick: Pushups, 09:30–10:00"` (kind capitalized to "Brick"); Save's `aria-disabled === "true"`.
Proves: plan.md § Components `<AddBlockSheet>` (overlap engine includes timed loose bricks via `selectAllTimedItems`) — covers SPEC AC #14, AC #20.

#### C-m4e-026

Target file: `components/AddBlockSheet.test.tsx`
**GIVEN** the sheet from C-m4e-024 with overlap active, `lib/haptics` mocked
**WHEN** the user clicks the disabled Save button
**THEN** `haptics.medium` is called exactly once; `onSave` is NOT called; the sheet does not close.
Proves: plan.md § Components `<AddBlockSheet>` (medium haptic on disabled-Save — mirrors AddBrickSheet pattern) — covers SPEC AC #22.

#### C-m4e-027

Target file: `app/(building)/BuildingClient.m4e.test.tsx` (NEW dedicated file per the M4b / M4c precedent)
**GIVEN** `<BuildingClient />` rendered with `defaultState()` mocked to seed: one block `bk1` with one nested non-timed tick brick, two loose bricks (`r1` hasDuration:false, `r2` hasDuration:true with `start:"10:00"` `end:"10:30"`)
**WHEN** the DOM is queried
**THEN** `<LooseBricksTray>` renders exactly 1 chip (the non-timed `r1`); the timed `r2` is NOT in the tray.
**AND** `<Timeline>` renders exactly 2 items at the right hour rows: one `TimelineBlock` for `bk1` at `bk1.start`, one `TimedLooseBrickCard` (`data-testid="timed-loose-brick"`) for `r2` at offset `timeToOffsetPx("10:00", HOUR_HEIGHT_PX)`.
**AND** the `hasLooseBricks` prop threaded into Timeline is `true` (because `selectTrayBricks(state).length === 1 > 0`); `<EmptyBlocks>` is NOT shown.
Proves: plan.md § Components `<BuildingClient>` (selector swap: `selectTrayBricks(state)` for the tray, `selectTimelineItems(state)` for the timeline, and the `hasLooseBricks` source change) — covers SPEC AC #27, AC #28, AC #29, AC #30.

#### C-m4e-028

Target file: `app/(building)/BuildingClient.m4e.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a `defaultState()` mock that returns one timed loose brick `{ id:"r1", hasDuration:true, start:"10:00", end:"10:30", ... }` and no blocks
**WHEN** the DOM is queried
**THEN** `<LooseBricksTray>` is NOT in the DOM (filtered list is empty AND `state.blocks.length === 0`); `<Timeline>` renders the one timed brick on the 10:00 row; `<EmptyBlocks>` is NOT shown (because there IS a timeline item — the timed loose brick counts as "something on the timeline" for the M3 empty-state heuristic; if BUILDER reads the M3 heuristic strictly as "no blocks", `<EmptyBlocks>` would render — assert which path applies based on the plan's `showTray = blocks.length > 0 || selectTrayBricks(state).length > 0` lock; this AC asserts the `showTray === false` branch).
Proves: plan.md § Components `<BuildingClient>` (`showTray = state.blocks.length > 0 || selectTrayBricks(state).length > 0` lock; tray hides when filtered-empty + no blocks) — covers SPEC AC #29 + § Edge cases ("Last loose brick with duration ON promotes to Timeline").

#### C-m4e-029

Target file: `app/(building)/BuildingClient.m4e.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a `defaultState()` mock that returns a state with one pre-M4e Brick literal (cast through `any` to bypass strict TS) where `hasDuration` is absent
**WHEN** the component mounts (the lazy `useReducer` initializer runs once)
**THEN** the brick's `hasDuration` reads `false` post-mount (the `withDurationDefaults` defensive migration filled the flag); the tray renders the brick as a non-timed chip; no `data-testid="brick-time-window"` is present on the chip.
Proves: plan.md § Components `<BuildingClient>` ("lazy `useReducer` initializer wrapping `defaultState()` calls `withDurationDefaults` over every brick") + SG-m4e-06 lock — covers SPEC § Edge cases ("Existing brick literal pre-M4e").

#### C-m4e-030

Target file: `components/Timeline.test.tsx`
**GIVEN** `<Timeline items={[{kind:"block", block: blockA}, {kind:"brick", brick: timedBrick}]} categories={[]} now="08:00" ... />` rendered with both items at distinct hour rows (block at 09:00–10:00, timed brick at 11:00–11:30)
**WHEN** the DOM is queried
**THEN** exactly one `<TimelineBlock>` is rendered for `blockA` AND exactly one `<TimedLooseBrickCard>` (`data-testid="timed-loose-brick"`) is rendered for `timedBrick`; both are at their respective `timeToOffsetPx` `top` values.
**AND** when the `items` array is empty `[]`, neither component is rendered and the hour-label grid is still drawn (M2 invariant preserved).
Proves: plan.md § Components `<Timeline>` (union renderer; `items` prop replaces `blocks`; conditional `TimelineBlock` vs `TimedLooseBrickCard`) — covers SPEC AC #28, AC #30.

### E2E (Playwright) — deferred to preview

#### E-m4e-001

Target file: `tests/e2e/m4e.spec.ts`
**GIVEN** the app at `/` with the AddChooserSheet routed to AddBrickSheet open (under `if ((await sheet.count()) > 0)` guard; preview has the harness seeded via the fixture path documented in `status.md`)
**WHEN** the user types a title, taps the Duration toggle ON, picks Start `"09:00"` and End `"09:30"`, leaves Recurrence as "Just today", and taps Save
**THEN** the new brick is on the Timeline at the 09:00 row (`data-testid="timed-loose-brick"` queryable with its `style.top` matching the 09:00 offset); the LooseBricksTray's chip count does NOT include this brick; the AddBrickSheet has closed.
Proves: plan.md § Components `<AddBrickSheet>` + `<TimedLooseBrickCard>` + `<BuildingClient>` (the full save-and-promote flow) — covers SPEC AC #6, AC #30, AC #31, AC #36 (E-m4e-01).

#### E-m4e-002

Target file: `tests/e2e/m4e.spec.ts`
**GIVEN** the app at `/` with one existing block 09:00–10:00 already on the timeline, AddBrickSheet open with toggle ON, Start `"09:30"`, End `"10:30"` (overlaps the block)
**WHEN** the DOM is queried
**THEN** an element with `data-testid="overlap-warning"` is visible (`role="alert"`); the Save button has `aria-disabled="true"`; tapping Save fires `medium` haptic (preview-only assertion — verified via `window.navigator.vibrate` spy or the haptics log).
Proves: plan.md § Components `<AddBrickSheet>` (overlap chip live + Save-disable + haptic) — covers SPEC AC #19, AC #20, AC #21, AC #22, AC #36 (E-m4e-02).

#### E-m4e-003

Target file: `tests/e2e/m4e.spec.ts`
**GIVEN** the AddBrickSheet from E-m4e-002 (overlap active, Save disabled)
**WHEN** the user changes End from `"10:30"` to `"09:30"` (clears the overlap by ending before the block starts) — actually: changes Start to `"08:00"` AND End to `"08:30"` (a clean non-overlapping window before the existing block)
**THEN** the `data-testid="overlap-warning"` element disappears; the Save button's `aria-disabled` is `"false"` (or attribute absent); tapping Save closes the sheet and the new brick appears on the timeline at the 08:00 row.
Proves: plan.md § Components `<AddBrickSheet>` (overlap chip clears + Save re-enables on field adjustment) — covers SPEC AC #23, AC #36 (E-m4e-03).

#### E-m4e-004

Target file: `tests/e2e/m4e.spec.ts`
**GIVEN** the app at `/` with one timed loose brick already on the timeline at 10:00–10:30, AddBlockSheet open with title `"Standup"`, Start `"09:45"`, End `"10:15"` (overlaps the timed brick)
**WHEN** the DOM is queried
**THEN** the AddBlockSheet shows `data-testid="overlap-warning"` (`role="alert"`) with text including `"Brick: <name>, 10:00–10:30"`; Save's `aria-disabled === "true"`.
Proves: plan.md § Components `<AddBlockSheet>` (block↔brick collision detection via `selectAllTimedItems`) — covers SPEC AC #14, AC #19, AC #20, AC #21, AC #36 (E-m4e-04).

#### E-m4e-005

Target file: `tests/e2e/m4e.spec.ts`
**GIVEN** the AddBrickSheet open at `/`, toggle LEFT OFF (default), title typed, a tick score-type selected
**WHEN** the user taps Save
**THEN** the saved brick has no time-window badge on its chip (`data-testid="brick-time-window"` is absent); the chip lives in the LooseBricksTray (not the Timeline); the brick's `hasDuration` reads `false` (verified via DOM data attribute or by re-opening to confirm the toggle reads OFF when editing in M5 — for M4e, assert tray placement only). The chip's accessible name matches the pre-M4e tick byte-identical string (no `"scheduled"` suffix).
Proves: plan.md § Components `<AddBrickSheet>` (toggle-OFF save path is byte-identical to M3/M4a path; regression-free) — covers SPEC AC #5, AC #25, AC #36 (E-m4e-05).

### Accessibility (axe via Playwright) — deferred to preview

#### A-m4e-001

Target file: `tests/e2e/m4e.a11y.spec.ts`
**GIVEN** the app at `/` with AddBrickSheet open (under `count() > 0` guard)
**WHEN** the Duration toggle's attributes are read via Playwright (`getByRole('switch', { name: /duration/i }).getAttribute('aria-checked')`)
**THEN** the toggle has `role="switch"` and `aria-checked` reads `"false"` initially; after the user taps it, `aria-checked` reads `"true"`. **AND** the toggle's visible bounding box is ≥ 44 × 44 CSS px (per ADR-031).
Proves: plan.md § A11y (`<Toggle>` M0 primitive a11y verbatim) — covers SPEC AC #1, AC #37 (A-m4e-01).

#### A-m4e-002

Target file: `tests/e2e/m4e.a11y.spec.ts`
**GIVEN** the app at `/` with AddBrickSheet open, toggle ON, Start/End values that collide with an existing block (overlap warning is rendering for the first time)
**WHEN** the warning element is queried via `getByRole('alert')` and its text content is read
**THEN** the warning element has `role="alert"` (announced by screen readers on first appearance); the announcement text includes the colliding item's name and window per AC #20.
**AND** the user changes Start/End to resolve the overlap; the alert element is removed from the DOM (no leftover live region) and re-rendering an overlap creates a fresh `role="alert"` node (re-announcement guarantee).
Proves: plan.md § A11y ("warning chip role=alert") — covers SPEC AC #19, AC #20, AC #37 (A-m4e-02).

#### A-m4e-003

Target file: `tests/e2e/m4e.a11y.spec.ts`
**GIVEN** the app at `/` with AddBrickSheet open, toggle ON, overlap active (Save disabled)
**WHEN** the Save button's attributes are read via Playwright
**THEN** the button has `aria-disabled="true"`; it has an `aria-describedby` attribute pointing to a DOM element (`#brick-save-hint`); that element exists, is `sr-only`, and contains the hint text `"Resolve the overlap to save."`.
**AND** when the overlap clears, `aria-disabled` becomes `"false"` (or the attribute is dropped) AND `aria-describedby` is dropped (or still present pointing to the same hint span — both implementations acceptable since the hint is only relevant when disabled).
Proves: plan.md § A11y ("disabled Save aria-disabled + aria-describedby") — covers SPEC AC #21, AC #22, AC #37 (A-m4e-03).

#### A-m4e-004

Target file: `tests/e2e/m4e.a11y.spec.ts`
**GIVEN** the app at `/` with AddBrickSheet open, toggle ON, overlap warning visible (the worst-case a11y surface — every M4e-new element rendered at once)
**WHEN** axe-core runs against the document (via `AxeBuilder({ page }).analyze()`)
**THEN** zero violations are reported across all rule categories enabled in the project's axe config; the toggle, the form fields, the inline alerts, the overlap chip, the Recurrence chip group, and the Save button all pass color-contrast, name-role-value, focus-visible, and landmark rules.
Proves: plan.md § A11y (axe-core target — every M4e a11y feature passes simultaneously) — covers SPEC AC #37 (A-m4e-04).

### Sandbox / preview note

Per the established M4a/M4b/M4c/M4d pattern: this sandbox cannot launch chromium (binary missing — confirmed by the prior milestones' EVALUATOR reports and `status.md`). The 5 `E-m4e-*` and 4 `A-m4e-*` IDs above are authored as full GIVEN/WHEN/THEN specs but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the same `if ((await x.count()) > 0)` guard pattern as `tests/e2e/m4a.spec.ts`/`m4b.spec.ts`/`m4c.spec.ts`/`m4d.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md` under M4a's "open loops" — and a future TESTS-mode dispatch owes a deterministic seeding helper (a `?seed=m4e-overlap-active` query-param fixture, or an `__APP_TEST_SEED__` window hook, or an injected reducer initial state) that lifts the guards across all five milestones in one pass. M4e does NOT introduce that helper (it would touch five prior test files and is therefore out of scope per ADR-022). The 9 deferred-to-preview IDs (5 E + 4 A) are net-additive to the ~26 vacuous-pass-guarded items already tracked from M4a + M4b + M4c + M4d (~35 items total post-M4e); they will all be cleared in the same future cleanup dispatch.

### Spec gaps surfaced for VERIFIER

None genuinely unresolvable. SG-m4e-01 through SG-m4e-08 are resolved in plan.md and reflected directly in the test IDs above (SG-m4e-01 default-OFF: `C-m4e-001`; SG-m4e-02 chip vertical order: `C-m4e-014`; SG-m4e-03 dashed outline: `C-m4e-020`; SG-m4e-04 M0 primitive reuse: `C-m4e-001` + `A-m4e-001`; SG-m4e-05 live detection: `C-m4e-008`, `C-m4e-011`; SG-m4e-06 `withDurationDefaults`: `U-m4e-019`, `U-m4e-020`, `C-m4e-029`; SG-m4e-07 instant reveal: `C-m4e-002`; SG-m4e-08 RecurrenceChips reuse: `C-m4e-013`).

**One item VERIFIER may want to flag and either accept or escalate** (mirroring plan.md § Open questions for VERIFIER — the answer should be a one-line confirmation, not a re-plan):

1. **BrickChip aria-label suffix vs aria-describedby (plan-flagged).** Plan-locked preference is appending `", scheduled HH:MM to HH:MM"` to `buildAriaLabel`'s return for `hasDuration === true` bricks; fallback is a separate `aria-describedby` span if exact-string match in M4a/M4b/M4c tests breaks. **`C-m4e-018` is authored to pass under EITHER implementation** — it asserts the accessible-name OR accessible-description contains the scheduling text via Testing Library matchers (`toHaveAccessibleName(/scheduled/)` OR `toHaveAccessibleDescription(/scheduled/)`), not raw `textContent`. **`C-m4e-019` asserts the byte-identity for `hasDuration === false`** (no suffix, no describedby). VERIFIER's call: accept the dual-path test (one ID covers both implementations) OR escalate as `ADR needed: lock the aria surface to one path`. Either way, A-m4e-04 axe-core has zero violations under both implementations, and SPEC AC #24's a11y dimension is satisfied.

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                                    | Covering test IDs                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| #1  | AddBrickSheet renders a "Duration" toggle row below score-type chips, default OFF                                     | C-m4e-001, A-m4e-001                                                        |
| #2  | Toggling ON instantly reveals (no animation gate) Start / End / Recurrence                                            | C-m4e-002                                                                   |
| #3  | Default Start/End values: parent block's window if nested, else current-hour-floor + 30 min                           | C-m4e-003                                                                   |
| #4  | Toggling OFF immediately hides the three fields; in-progress entries discarded                                        | C-m4e-004                                                                   |
| #5  | Save with toggle OFF → brick saves `hasDuration: false`, no time fields (M3/M4a/M4b/M4c byte-identical)               | C-m4e-004, C-m4e-017, C-m4e-019, U-m4e-018, E-m4e-005                       |
| #6  | Save with toggle ON → brick saves `hasDuration: true` and all three fields populated                                  | C-m4e-005, U-m4e-015, E-m4e-001                                             |
| #7  | Recurrence chip group renders 4 chips, single-select, default "Just today"                                            | C-m4e-013                                                                   |
| #8  | "Custom range" selection expands to date inputs + 7-day weekday picker (M2 verbatim)                                  | C-m4e-013                                                                   |
| #9  | "Custom range" with zero weekdays selected → inline error, Save disabled                                              | C-m4e-012                                                                   |
| #10 | Recurrence stored as the `Recurrence` discriminated union per ADR-019                                                 | C-m4e-005, C-m4e-013                                                        |
| #11 | `intervalsOverlap(a, b)` returns true iff `a.start < b.end && b.start < a.end` (half-open per ADR-006)                | U-m4e-001, U-m4e-002, U-m4e-003, U-m4e-004, U-m4e-005                       |
| #12 | `findOverlaps(candidate, items, excludeId?)` excludes the `excludeId` item                                            | U-m4e-008                                                                   |
| #13 | Block↔block collisions detected (M2 retroactive)                                                                      | C-m4e-024                                                                   |
| #14 | Brick↔block collisions detected (timed brick vs. any block)                                                           | C-m4e-008, C-m4e-025, E-m4e-002, E-m4e-004                                  |
| #15 | Brick↔brick collisions detected (two timed bricks)                                                                    | U-m4e-006, U-m4e-007                                                        |
| #16 | Bricks with `hasDuration === false` are excluded from the overlap input set                                           | U-m4e-010                                                                   |
| #17 | The candidate-being-added is NOT in the input set (no self-overlap)                                                   | U-m4e-008, U-m4e-010                                                        |
| #18 | Sort order of returned overlap list: start asc; ties broken by kind (block-before-brick); ties broken by name         | U-m4e-006, U-m4e-007, C-m4e-009                                             |
| #19 | Engine runs on every field-change tick (no debounce required)                                                         | C-m4e-008, C-m4e-011, E-m4e-002, A-m4e-002                                  |
| #20 | Warning chip copy `"⚠ overlaps with [Kind: Name, HH:MM–HH:MM]"`; max 3 listed + "+N more"                             | C-m4e-008, C-m4e-009, C-m4e-024, C-m4e-025, E-m4e-002, A-m4e-002            |
| #21 | Save disabled while overlap list non-empty; re-enabled when empty + other validation passes                           | C-m4e-006, C-m4e-008, C-m4e-011, C-m4e-024, E-m4e-002, E-m4e-003, A-m4e-003 |
| #22 | Tapping disabled Save fires `medium` haptic + surfaces a tooltip-style hint; sheet stays open                         | C-m4e-010, C-m4e-026, E-m4e-002, A-m4e-003                                  |
| #23 | Overlap chip is dismissible only by changing Start/End (not via X button)                                             | C-m4e-011, E-m4e-003                                                        |
| #24 | When `brick.hasDuration === true`, every brick chip renders `HH:MM–HH:MM` badge below the name                        | C-m4e-014, C-m4e-015, C-m4e-016, C-m4e-018                                  |
| #25 | When `brick.hasDuration === false`, no secondary line renders — chip output byte-identical to M4a/M4b/M4c             | C-m4e-017, C-m4e-019, E-m4e-005                                             |
| #26 | Time-brick chip's existing `minutesDone / durationMin` performance badge is unchanged; both coexist                   | C-m4e-016                                                                   |
| #27 | `selectTrayBricks(state)` returns `state.looseBricks.filter(b => !b.hasDuration)`                                     | U-m4e-011, U-m4e-012, C-m4e-027                                             |
| #28 | `selectTimelineItems(state)` returns `[...blocks, ...looseBricks.filter(b=>b.hasDuration)]` sorted by start asc       | U-m4e-011, U-m4e-013, C-m4e-027, C-m4e-030                                  |
| #29 | `<LooseBricksTray>` renders only `selectTrayBricks(state)`; tray-visibility contract from M3                          | C-m4e-022, C-m4e-023, C-m4e-027, C-m4e-028                                  |
| #30 | `<Timeline>` renders `selectTimelineItems(state)`; same hour-row math as blocks                                       | C-m4e-020, C-m4e-021, C-m4e-027, C-m4e-030, E-m4e-001                       |
| #31 | Timed loose brick card has dashed 1.5 px outline + category color (or `--ink-dim` fallback)                           | C-m4e-020, E-m4e-001                                                        |
| #32 | Reducer rejects `ADD_BRICK` action that violates the presence invariant (returns state unchanged)                     | U-m4e-015, U-m4e-016, U-m4e-017, U-m4e-018, U-m4e-014                       |
| #33 | `tsc --noEmit`: zero new errors                                                                                       | gate (`npm run eval`); also U-m4e-021                                       |
| #34 | ESLint: zero new errors                                                                                               | gate (`npm run eval`)                                                       |
| #35 | Vitest coverage matches plan.md § Test strategy (overlap, reducer, AddBrickSheet, AddBlockSheet, BrickChip, etc.)     | U-m4e-001..021, C-m4e-001..030                                              |
| #36 | Playwright (deferred-to-preview): E-m4e-01..05 (toggle ON save, overlap chip, fix-overlap, AddBlockSheet, toggle-OFF) | E-m4e-001, E-m4e-002, E-m4e-003, E-m4e-004, E-m4e-005                       |
| #37 | A11y: `<Toggle>` switch+aria-checked; warning chip role=alert; Save aria-disabled + aria-describedby; axe zero        | A-m4e-001, A-m4e-002, A-m4e-003, A-m4e-004                                  |

## Milestone 4f — Collapse to two brick kinds; rip the timer — Tests

This entry covers M4f — the schema collapse to two brick kinds (`tick` + `units`), the `count → done` rename, the timer-infrastructure rip, the new `<UnitsEntrySheet>`, and the fixture migration. It is derived from the corrected `plan.md` M4f entry (post `docs(plan-m4f): correct audio scope` — audio is RETAINED in M4f). Test ID prefixes:

- `U-m4f-` — unit (Vitest, no DOM): `lib/data.ts` reducer arms (`SET_UNITS_DONE`, `ADD_BRICK` defensive kind reject, `findUnitsBrickById`, `defaultState`), `lib/dharma.ts` scoring (`brickPct` / `brickLabel`), `lib/overlap.ts` re-pointed M2 regression, schema-shape contract assertions.
- `C-m4f-` — component (Vitest + Testing Library): `<UnitsEntrySheet>` (NEW), `<BrickChip>` two-variant collapse, `<AddBrickSheet>` kind-selector reduction.
- `E-m4f-` — Playwright e2e (`tests/e2e/m4f.spec.ts`): add units brick → open sheet → save, tick-chip no-sheet regression, two-chip kind selector, free-text unit parity, no-live-timer. Deferred-to-preview.
- `A-m4f-` — Playwright a11y (`tests/e2e/m4f.a11y.spec.ts`): `<UnitsEntrySheet>` dialog role + labelledby, input accessible name, disabled-Save describedby + sr-only hint, axe-core zero violations. Deferred-to-preview.

E2E + a11y specs continue the **deferred-to-preview** pattern from M4a/M4b/M4c/M4d/M4e: tests live in `tests/e2e/m4f.*.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox (Playwright's chromium binary is missing in this environment — established M0..M4e pattern; flagged in `status.md` as vacuous-pass debt). A future TESTS-mode dispatch owes a deterministic seeding helper that lifts these guards across all milestones in one pass; M4f does NOT introduce that helper (out of scope per ADR-022 — it would touch six prior test files).

M4f's surface is reducer-heavy (the schema collapse is a type + reducer problem) plus one new sheet component and two component edits. Unit coverage is deep on the `SET_UNITS_DONE` arm (clamp, find-by-id loose+nested, no-op branches), the defensive `ADD_BRICK` kind reject, and the scoring rename. Component coverage focuses on `<UnitsEntrySheet>` validation/a11y/haptics and the two-variant collapse of `<BrickChip>` + `<AddBrickSheet>`. E2E + a11y are thin (5 + 4 IDs) and explicitly preview-deferred.

### Schema-shape ACs and `tsc` coverage (M4e precedent)

Several M4f ACs (#1, #2, #3, #4, #5, #6) are partly **compile-time** assertions about the `Brick` / `AppState` / `Action` type shapes — the same situation M4e handled for its AC #33 (mapped to `gate (npm run eval)` + a runtime anchor `U-m4e-021`). M4f follows the identical pattern: each structural AC is paired with a **runtime assertion** wherever one is meaningful (a reducer test that constructs a `units` brick and reads `.done`; an `assertNever` exhaustiveness test; a `defaultState()` deep-equal). The purely-structural residue (e.g., "no `kind: "goal"` literal type remains") is covered by `tsc --noEmit` (AC #39's gate) — the coverage map below marks those cells `tsc-gate + <runtime ID>`. This is consistent with how M4e mapped AC #33.

### Pre-M4f Brick literal migration

The schema collapse turns every pre-M4f `kind: "goal"` and `kind: "time"` literal into a `tsc` error. Migration is mechanical and locked by plan.md § Test fixture migration plan (no `migrateToUnits()` helper — inline sed): `kind: "goal"` → `kind: "units"`; `count: N` → `done: N`; `kind: "time"` → `kind: "units"` with `unit: "minutes"`, `target: <durationMin>`, `done: <minutesDone>`. BUILDER fixes these in the Phase A bulk-migration commit (plan.md § Migration ordering). The per-file literal counts are in plan.md's migration table (`lib/data.test.ts` 13 goal + heavy time, `lib/dharma.test.ts` 3 goal, `lib/overlap.test.ts` 2 goal, etc.). None of the migrated assertions change semantics — EVALUATOR validates the migration is mechanical, not behavioral. M4e IDs that exercised the duration toggle against `kind: "time"` re-point to `kind: "units"` with `unit: "minutes"` and stay green (AC #37; see `U-m4f-018` regression anchor).

### Retired test IDs

The timer infrastructure is deleted (ADR-043 / M4f), so the M4c test files whose subject no longer exists are deleted outright, retiring their IDs. Each is recorded here with a one-line pointer per AC #36.

**From `lib/timer.test.ts` (file deleted — `lib/timer.ts` / `useTimer` removed):**

- `U-m4c-012` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `U-m4c-013` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `U-m4c-014` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `U-m4c-015` — retired — M4c timer infrastructure removed per ADR-043 / M4f.

**From `components/TimerSheet.test.tsx` (file deleted — `<TimerSheet>` removed):**

- `C-m4c-007` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-008` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-009` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-010` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-011` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-012` — retired — M4c timer infrastructure removed per ADR-043 / M4f.

**From `app/(building)/BuildingClient.m4c.test.tsx` (file deleted — M4c timer integration removed):**

- `C-m4c-013` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-014` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-015` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-016` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-017` — retired — M4c timer infrastructure removed per ADR-043 / M4f.
- `C-m4c-018` — retired — M4c timer infrastructure removed per ADR-043 / M4f.

**From `tests/e2e/m4c.spec.ts` + `tests/e2e/m4c.a11y.spec.ts` (timer e2e/a11y subject removed):**

- `E-m4c-001`..`E-m4c-005` — retired — M4c timer e2e behavior removed per ADR-043 / M4f.
- `A-m4c-001`..`A-m4c-004` — retired — M4c timer a11y surface removed per ADR-043 / M4f.

**Note (audio retained):** `U-m4c-008`/`U-m4c-009`/`U-m4c-010` target `lib/audio.test.ts` and are **NOT retired** — `lib/audio.ts` + `lib/audio.test.ts` + the M4a block/day chimes are retained (user decision 2026-05-14; plan.md § Audio cleanup). Likewise the M4a `Fireworks.test.tsx`-targeted IDs stay. Retired-ID total: **25 M4c IDs** (`U-m4c-012..015`, `C-m4c-007..018`, `E-m4c-001..005`, `A-m4c-001..004`).

**M4b stepper-on-chip IDs:** any M4b ID that specifically asserts ±1 stepper buttons / scale-press / long-press auto-repeat / clamp haptic on the brick chip also retires (the stepper is deleted per SG-m4f-02). M4b's reducer-level `LOG_GOAL_BRICK` semantics re-point to `SET_UNITS_DONE` (absolute-value) and are re-authored as M4f IDs (`U-m4f-001..006`). The precise M4b stepper ID list is enumerated by BUILDER against the M4b tests.md entry during the Phase B/C migration; this dispatch does not re-list them because the M4b entry was not in the dispatch inputs — **flagged for VERIFIER** (see § Spec gaps).

**M2 IDs `U-m2-004` / `U-m2-005`:** NOT retired — **re-pointed** to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03 (`overlapsExistingBlock` is deleted). IDs stay stable; only the imported symbol changes. The re-pointed assertions are also re-stated as `U-m4f-016` / `U-m4f-017` so the M4f entry carries an explicit, runnable copy of the re-point (the original `U-m2-*` IDs remain in the M2 entry, re-pointed).

### Unit (Vitest)

#### U-m4f-001

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "units"` brick `{ id: "u1", target: 30, unit: "minutes", done: 0, hasDuration: false, ... }`
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "u1", done: 20 })` is called
**THEN** the returned state has the loose brick's `done === 20`; `target` and `unit` unchanged; `state.blocks` and `state.categories` preserve referential equality; `state.looseBricks` is a new array reference.
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (loose-path find-by-id; absolute-value write) — covers SPEC AC #7.

#### U-m4f-002

Target file: `lib/data.test.ts`
**GIVEN** `state` containing one block `b1` whose `bricks` array holds one nested `kind: "units"` brick `{ id: "n1", target: 100, unit: "reps", done: 10, ... }`
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "n1", done: 55 })` is called
**THEN** the returned state has the nested brick's `done === 55`; the `b1` block reference changed (one nested brick re-rolled → one block re-rolled); `state.looseBricks` and `state.categories` preserve referential equality.
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (nested-path find-by-id; array-identity preservation) — covers SPEC AC #7.

#### U-m4f-003

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "units"` brick `{ id: "u1", target: 30, unit: "minutes", done: 5, ... }`
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "u1", done: -7 })` is called (negative)
**THEN** the brick's `done === 0` (`Math.max(0, Math.floor(-7))`).
**AND** when `done: 20.9` is dispatched, the brick's `done === 20` (`Math.floor(20.9)`).
**AND** when `done: -3.4` is dispatched, the brick's `done === 0` (`Math.max(0, Math.floor(-3.4))`).
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (`Math.max(0, Math.floor(action.done))` clamp — three layers of defense) — covers SPEC AC #7, plan.md § Edge cases (negative / decimal defense).

#### U-m4f-004

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "units"` brick `{ id: "u1", done: 5, ... }`
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "u1", done: 5 })` is called (value already 5)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the `b.done === clamped` identity short-circuit fired; no spurious re-render.
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (identity short-circuit when `done` unchanged) — covers SPEC AC #7 (invariant; no churn).

#### U-m4f-005

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "units"` brick `{ id: "u1", ... }` and one block with no matching brick
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "does-not-exist", done: 9 })` is called
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); no throw; the `!blocksChanged && !looseChanged` early return fired.
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (`AC #8: missing id ⇒ unchanged`) — covers SPEC AC #8.

#### U-m4f-006

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "tick"` brick `{ id: "t1", done: false, ... }`
**WHEN** `reducer(state, { type: "SET_UNITS_DONE", brickId: "t1", done: 12 })` is called (the action targets a tick brick — wrong kind)
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the `b.kind !== "units"` guard fired inside `apply`; the tick brick's `done` is still `false` (not coerced to a number).
Proves: plan.md § Reducer edits `SET_UNITS_DONE` (`AC #9: no-op on tick brick`) — covers SPEC AC #9.

#### U-m4f-007

Target file: `lib/data.test.ts`
**GIVEN** `state` and an `ADD_BRICK` action whose `brick.kind` is `"goal"` (a stale pre-M4f kind, cast through `as unknown as Brick` to bypass the collapsed type)
**WHEN** `reducer(state, action)` is called
**THEN** the returned state is the **same reference** as the input state (`Object.is(out, state) === true`); the defensive `k !== "tick" && k !== "units"` guard rejected the payload; the brick is NOT appended to `looseBricks`.
**AND** the same rejection holds for a payload with `brick.kind === "time"`.
Proves: plan.md § Reducer edits (defensive `ADD_BRICK` invariant — runtime guard against bad fixtures) — covers SPEC AC #10.

#### U-m4f-008

Target file: `lib/data.test.ts`
**GIVEN** `state` and a valid `ADD_BRICK` action with `brick.kind === "units"`, `{ target: 30, unit: "minutes", done: 0, hasDuration: false, ... }`, `parentBlockId: null`
**WHEN** `reducer(state, action)` is called
**THEN** the brick is appended to `state.looseBricks`; its `kind === "units"`, `target === 30`, `unit === "minutes"`, `done === 0`.
**AND** the same action with `brick.kind === "tick"` (`done: false`) is also accepted and appended.
**AND** the M4e duration-presence invariant is still enforced — a `units` brick with `hasDuration: true` but `end: undefined` is rejected (`Object.is(out, state)`), confirming M4e's `ADD_BRICK` rules survive the collapse.
Proves: plan.md § Reducer edits (`ADD_BRICK` accepts the two new variants; M4e duration invariant preserved) — covers SPEC AC #10, AC #6.

#### U-m4f-009

Target file: `lib/data.test.ts`
**GIVEN** `state` with one loose `kind: "tick"` brick `{ id: "t1", done: false, ... }`
**WHEN** `reducer(state, { type: "LOG_TICK_BRICK", brickId: "t1" })` is called
**THEN** the brick's `done` flips to `true`; a second `LOG_TICK_BRICK` flips it back to `false` — behavior byte-identical to M4a (the collapse did not touch the tick arm).
Proves: plan.md § Reducer edits (`LOG_TICK_BRICK` unchanged from M4a) — covers SPEC AC #11.

#### U-m4f-010

Target file: `lib/data.test.ts`
**GIVEN** the post-M4f `Action` union and `AppState` type
**WHEN** the reducer's `default` arm is reached with an action of type `"NOPE"` (cast through `any`)
**THEN** the call throws (`assertNever` exhaustiveness preserved — the switch now covers exactly `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`; the 5 deleted arms are gone).
**AND** `defaultState()` returns `{ blocks: [], categories: [], looseBricks: [] }` deep-equal with **no** `runningTimerBrickId` key (`"runningTimerBrickId" in defaultState() === false`).
Proves: plan.md § Reducer edits (`assertNever` exhaustiveness after 5 deletions + 1 addition; `defaultState` drops `runningTimerBrickId`) — covers SPEC AC #3, AC #4, AC #5 (runtime anchors for the structural ACs).

#### U-m4f-011

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` with one loose `kind: "units"` brick `u1`, one nested `kind: "units"` brick `n1` inside a block, and one loose `kind: "tick"` brick `t1`
**WHEN** `findUnitsBrickById(state, "u1")` is called
**THEN** it returns the `u1` brick object (`kind === "units"`).
**AND** `findUnitsBrickById(state, "n1")` returns the nested units brick (searches `block.bricks`).
**AND** `findUnitsBrickById(state, "t1")` returns `null` (`t1` is a tick brick — wrong kind).
**AND** `findUnitsBrickById(state, "missing")` returns `null` (no such id).
Proves: plan.md § Reducer edits (new helper `findUnitsBrickById` — loose + nested search, kind-discriminated, null on miss) — covers SPEC AC #7 (the helper that feeds `<BuildingClient>`'s sheet wiring).

#### U-m4f-012

Target file: `lib/data.test.ts`
**GIVEN** the post-M4f `Brick` union constructed at runtime
**WHEN** a `kind: "units"` literal `{ id, parentBlockId, name, categoryId, kind: "units", target: 30, unit: "minutes", done: 0, hasDuration: false }` is assigned to a `Brick`-typed variable and its fields are read
**THEN** `.kind === "units"`, `.target` is a `number`, `.unit` is a `string`, `.done` is a `number`; there is no `.count` field (`"count" in brick === false`) — the rename `count → done` holds.
**AND** a `kind: "tick"` literal exposes `.done` as a `boolean`.
**AND** (compile-time, `tsc` gate) the `Brick` union has exactly two members — assigning `kind: "goal"` or `kind: "time"` is a type error.
Proves: plan.md § Locked schema (post-M4f) (`Brick` has two variants; units shape; `count → done`) — covers SPEC AC #1, AC #2 (runtime anchors; structural residue → `tsc` gate).

#### U-m4f-013

Target file: `lib/data.test.ts`
**GIVEN** an `AppState` literal and a `BrickBase`-bearing `units` brick
**WHEN** the brick is constructed with M4e fields `hasDuration: true`, `start: "06:00"`, `end: "06:40"`, `recurrence: { kind: "just-today", date: "2026-05-15" }`
**THEN** all four M4e `BrickBase` fields are present and readable on the `units` variant; the M4e `ADD_BRICK` presence invariant (`hasDuration === true ⇒ start/end/recurrence all present`) still rejects a malformed literal (cross-ref `U-m4f-008`).
**AND** (compile-time, `tsc` gate) `AppState` has no `runningTimerBrickId` field — referencing `state.runningTimerBrickId` is a type error.
Proves: plan.md § Locked schema (post-M4f) (M4e `BrickBase` fields unchanged; `AppState.runningTimerBrickId` removed) — covers SPEC AC #6, AC #3 (runtime anchor + `tsc` residue).

#### U-m4f-014

Target file: `lib/dharma.test.ts`
**GIVEN** the post-M4f `brickPct(b)`
**WHEN** called with a `kind: "tick"` brick whose `done === true`
**THEN** it returns `100`; with `done === false` it returns `0`.
**AND** with a `kind: "units"` brick `{ target: 30, done: 20 }` it returns `(20/30)*100` ≈ `66.67`.
**AND** with `{ target: 30, done: 45 }` (overachievement) it returns `100` (`Math.min(done/target, 1) * 100`).
**AND** with `{ target: 0, done: 5 }` it returns `0` (zero-target guard — no division by zero).
Proves: plan.md § Scoring migration `brickPct` (2-arm switch; `done/target` ratio; zero-target guard; overachievement cap) — covers SPEC AC #38.

#### U-m4f-015

Target file: `lib/dharma.test.ts`
**GIVEN** the post-M4f `brickLabel(b)`
**WHEN** called with a `kind: "tick"` brick `done === true`
**THEN** it returns `"done"`; with `done === false` it returns `"todo"`.
**AND** with a `kind: "units"` brick `{ done: 20, target: 30, unit: "minutes" }` it returns `"20/30 minutes"` (no `"min"` suffix — the unit string is in the data).
**AND** with `unit: "reps"`, `done: 50`, `target: 100` it returns `"50/100 reps"`.
**AND** a representative day with one tick brick (`done`) + one `units` brick at `done: 15 / target: 30` yields `dayPct` consistent with the renamed fields (regression anchor for plan.md § Risks R3 — scoring math drift).
Proves: plan.md § Scoring migration `brickLabel` (2-arm; units arm renders `done/target unit`) + § Risks R3 (no ratio drift) — covers SPEC AC #38.

#### U-m4f-016

Target file: `lib/blockValidation.test.ts` (re-point of `U-m2-004`)
**GIVEN** two blocks whose time windows overlap (`b1` 09:00–10:00, `b2` 09:30–10:30) — the M2 scenario that `U-m2-004` previously exercised via `overlapsExistingBlock`
**WHEN** the overlap is evaluated via `lib/overlap.ts:intervalsOverlap({start:"09:00",end:"10:00"}, {start:"09:30",end:"10:30"})` (the re-pointed symbol per SG-m4f-03)
**THEN** the return value is `true` — the M2 block-overlap regression coverage is preserved against the surviving function; `overlapsExistingBlock` is deleted from `lib/blockValidation.ts`.
Proves: plan.md § File deletions + SG-m4f-03 (`overlapsExistingBlock` deleted; `U-m2-004` re-pointed to `intervalsOverlap`, same half-open math per ADR-006) — covers SPEC AC #17.

#### U-m4f-017

Target file: `lib/blockValidation.test.ts` (re-point of `U-m2-005`)
**GIVEN** two blocks whose windows are back-to-back (`b1` 09:00–10:00, `b2` 10:00–11:00 — touching at the boundary) — the M2 scenario `U-m2-005` previously exercised
**WHEN** the overlap is evaluated via `lib/overlap.ts:intervalsOverlap({start:"09:00",end:"10:00"}, {start:"10:00",end:"11:00"})`
**THEN** the return value is `false` (half-open `[start, end)` — boundary sharing is not overlap, ADR-006); the M2 no-false-positive regression is preserved.
**AND** the M4f build confirms `isValidBrickTime` is also deleted (time bricks gone) — any import of it is a `tsc` error.
Proves: plan.md § File deletions (`overlapsExistingBlock` + `isValidBrickTime` deleted; `U-m2-005` re-pointed) — covers SPEC AC #17.

#### U-m4f-018

Target file: `app/(building)/BuildingClient.m4e.test.tsx` (re-pointed M4e regression)
**GIVEN** an M4e test that previously asserted the duration toggle / overlap engine against a `kind: "time"` brick, now re-pointed to `kind: "units"` with `unit: "minutes"`, `target: 30`
**WHEN** the re-pointed test runs (`hasDuration: true`, `start: "06:00"`, `end: "06:40"` on the units brick)
**THEN** every M4e duration-axis assertion (time-window badge renders, overlap detected, Save-disable) still passes — the M4e contract holds for the `units` kind; the M4e ID stays green and stable.
Proves: plan.md § Test fixture migration plan (M4e time-kind duration tests re-point to units-kind; M4e IDs remain green) + § Risks R2 (M4e regression on units bricks with `hasDuration: true`) — covers SPEC AC #37.

### Component (Vitest + Testing Library)

#### C-m4f-001

Target file: `components/UnitsEntrySheet.test.tsx` (NEW)
**GIVEN** `<UnitsEntrySheet brick={{ id:"u1", kind:"units", target:30, unit:"minutes", done:12, name:"Meditate", categoryId:null, parentBlockId:null, hasDuration:false }} open={true} onClose={vi.fn()} onSave={vi.fn()} />` rendered
**WHEN** the DOM is queried
**THEN** the sheet heading text content is `"Meditate"` (the brick `name`); a sub-heading element reads `"Today's minutes"` (`"Today's " + brick.unit`); the single number input's `value` is `"12"` (pre-filled with `brick.done`).
Proves: plan.md § Component design `<UnitsEntrySheet>` (heading = name; subhead = `Today's <unit>`; input pre-filled with `done`) — covers SPEC AC #27, AC #28.

#### C-m4f-002

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the same sheet rendered with `brick.unit === "reps"`, `brick.done === 0`
**WHEN** the DOM is queried
**THEN** the sub-heading reads `"Today's reps"`; the number input has attributes `type="number"`, `inputMode="numeric"`, `min="0"`, `step="1"`; its `value` is `"0"`.
Proves: plan.md § Component design `<UnitsEntrySheet>` (`inputMode="numeric"` + min/step HTML hints; subhead reflects any free-text unit) — covers SPEC AC #28, AC #33.

#### C-m4f-003

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the sheet open with `brick.done === 12`, `onSave` and `onClose` spies, `lib/haptics` mocked
**WHEN** the user clears the input, types `"20"`, and clicks Save
**THEN** `onSave` is called exactly once with `("u1", 20)`; `onClose` is called exactly once; `haptics.light` is called once (the valid-Save haptic).
Proves: plan.md § Component design `<UnitsEntrySheet>` (Save with valid value dispatches `SET_UNITS_DONE` via `onSave` + closes; light haptic) — covers SPEC AC #29.

#### C-m4f-004

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the sheet open, `onSave` and `onClose` spies, `lib/haptics` mocked
**WHEN** the user clears the input entirely (empty string) and inspects the Save button
**THEN** the Save button has `aria-disabled="true"` (greyed out); clicking it does NOT call `onSave`; it fires `haptics.medium` exactly once; a hint with text `"Enter a number to save."` is surfaced (the `#units-save-hint` `sr-only` span is present and referenced via `aria-describedby`).
**AND** the sheet stays open (`onClose` is not called).
Proves: plan.md § Component design `<UnitsEntrySheet>` (empty value → Save disabled + medium haptic + sr-only hint on disabled-tap) — covers SPEC AC #30.

#### C-m4f-005

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the sheet open, `onSave` spy
**WHEN** the user types `"-5"` into the input
**THEN** the Save button has `aria-disabled="true"` (the regex `^\d+$` rejects the minus sign); clicking Save does not call `onSave`.
**AND** when the user types `"20.5"`, Save is likewise `aria-disabled` (the regex rejects the decimal point).
**AND** when the user types `"   "` (whitespace only), Save is `aria-disabled` (`draft.trim()` is empty).
Proves: plan.md § Component design `<UnitsEntrySheet>` (validation rule 2 — non-negative-integer regex `^\d+$` against `draft.trim()`) + § Edge cases (negative / decimal) — covers SPEC AC #30 (the disabled side of the contract).

#### C-m4f-006

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the sheet open with `brick.done === 12`, `onSave` and `onClose` spies
**WHEN** the user types a new value `"99"` then clicks Cancel
**THEN** `onClose` is called exactly once; `onSave` is NOT called (the in-progress edit is discarded); no haptic fires on Cancel.
Proves: plan.md § Component design `<UnitsEntrySheet>` (Cancel closes without dispatching; no Cancel haptic) — covers SPEC AC #31.

#### C-m4f-007

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** `<UnitsEntrySheet>` rendered
**WHEN** the sheet DOM is inspected
**THEN** the modal layout is provided by the M0 `<Sheet>` primitive — the root has `role="dialog"` and `aria-modal="true"` (inherited from `<Sheet>`); the sheet content is composed of M0 `<Input>` (number) + M0 `<Button>` (Save + Cancel), with no new primitive introduced.
**AND** on `open` transitioning to `true`, the number input receives focus and its current value is selected (auto-focus + select per plan.md § Auto-focus).
Proves: plan.md § Component design `<UnitsEntrySheet>` (composes M0 `<Sheet>` for layout/animation; auto-focus + select on open) — covers SPEC AC #32.

#### C-m4f-008

Target file: `components/UnitsEntrySheet.test.tsx`
**GIVEN** the sheet open for `brick` `u1` (`done: 5`), then re-rendered with a different `units` brick `u2` (`done: 40`, `unit: "pages"`)
**WHEN** the `brick` prop changes id while `open` stays `true`
**THEN** the heading updates to `u2`'s name; the sub-heading updates to `"Today's pages"`; the input re-seeds to `"40"` (the `useEffect` keyed on `brick?.id` re-runs) — the single-sheet swap contract holds (matches M4d's AddChooserSheet pattern).
Proves: plan.md § Component design `<UnitsEntrySheet>` (`useEffect` keyed on `brick?.id` re-seeds the draft on brick swap) + § Edge cases (units chip tapped while sheet open for a different brick) — covers SPEC AC #28 (re-seed) + plan.md § Edge cases.

#### C-m4f-009

Target file: `components/BrickChip.test.tsx`
**GIVEN** `<BrickChip brick={{ id:"u1", kind:"units", target:30, unit:"minutes", done:20, name:"Meditate", categoryId:null, parentBlockId:null, hasDuration:false }} categories={[]} onUnitsOpenSheet={vi.fn()} />` rendered
**WHEN** the DOM is queried
**THEN** the chip's primary line text content matches `"20 / 30 minutes"`; there are no `+1` / `-1` stepper `<button>`s anywhere in the chip subtree (`queryAllByRole('button', { name: /increment|decrement|\+1|-1/i })` is empty).
Proves: plan.md § Component edits `<BrickChip>` (units variant renders `<done> / <target> <unit>`; no stepper buttons) — covers SPEC AC #24, AC #26.

#### C-m4f-010

Target file: `components/BrickChip.test.tsx`
**GIVEN** a `units` brick chip with `onUnitsOpenSheet` spy, `lib/haptics` mocked
**WHEN** the user taps the chip (the whole-chip `<button>`)
**THEN** `onUnitsOpenSheet` is called exactly once with `"u1"`; `haptics.light` is called exactly once; no `<UnitsEntrySheet>` is mounted by the chip itself (the parent `<BuildingClient>` owns the sheet).
Proves: plan.md § Component edits `<BrickChip>` (units chip tap fires `onUnitsOpenSheet(brick.id)` + light haptic) — covers SPEC AC #25.

#### C-m4f-011

Target file: `components/BrickChip.test.tsx`
**GIVEN** a `kind: "tick"` brick chip rendered with the M4a tick handler
**WHEN** the user taps the tick chip
**THEN** `done` flips per M4a (the tick variant is byte-identical post-collapse); `onUnitsOpenSheet` is NOT called (no sheet opens for a tick brick); the tick chip retains `aria-pressed` (it is still a toggle).
Proves: plan.md § Component edits `<BrickChip>` (tick variant unchanged; tap flips `done`, no sheet) — covers SPEC AC #25 (tick side of the contract).

#### C-m4f-012

Target file: `components/BrickChip.test.tsx`
**GIVEN** a `units` brick chip with `hasDuration: true`, `start: "06:00"`, `end: "06:40"`
**WHEN** the DOM is queried
**THEN** the M4e time-window badge (`data-testid="brick-time-window"`, text `"06:00–06:40"`) renders below the primary line — identically for the `units` variant; the chip still renders only two variant branches (tick / units); there is no `kind: "time"` rendering branch reachable.
Proves: plan.md § Component edits `<BrickChip>` (two variants only; M4e time-window badge renders when `hasDuration === true`) — covers SPEC AC #23, AC #24.

#### C-m4f-013

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** `<AddBrickSheet open={true} parentBlockId={null} state={emptyState} categories={[]} onSave={vi.fn()} onCancel={vi.fn()} onCreateCategory={vi.fn()} />` rendered
**WHEN** the kind selector is queried
**THEN** the kind selector renders exactly two chips with accessible labels `"Tick"` and `"Units"`; there is no chip with label `"Time"` (`queryByRole('radio', { name: /time/i })` returns `null`); the selector keeps `role="radiogroup"` + `aria-checked` semantics.
Proves: plan.md § Component edits `<AddBrickSheet>` (kind selector 3 chips → 2; "Time" chip removed) — covers SPEC AC #18.

#### C-m4f-014

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet rendered with the kind selector
**WHEN** the user selects the "Units" chip
**THEN** a Target input (`<input type="number" min="1" step="1">`, required) and a Unit input (`<input type="text">`, required, `placeholder="minutes / reps / pages"`) are revealed.
**AND** when the user selects the "Tick" chip, neither Target nor Unit input is in the DOM.
Proves: plan.md § Component edits `<AddBrickSheet>` (selecting "Units" reveals Target + Unit inputs — the M4b reveal renamed from goal) — covers SPEC AC #19.

#### C-m4f-015

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with a non-blank title, "Units" selected, Target `"30"`, Unit `"minutes"`, the M4e duration toggle OFF, no overlapping items
**WHEN** the user clicks Save
**THEN** `onSave` is called exactly once with a brick `{ kind: "units", target: 30, unit: "minutes", done: 0, hasDuration: false }` (and no `start`/`end`/`recurrence`).
**AND** when the same sheet has the M4e duration toggle ON with `start: "09:00"`, `end: "09:30"`, Save constructs `{ kind: "units", target: 30, unit: "minutes", done: 0, hasDuration: true, start: "09:00", end: "09:30", recurrence: {...} }`.
Proves: plan.md § Component edits `<AddBrickSheet>` (Save constructs `kind: "units"` with `done: 0` + M4e duration fields if toggle ON) — covers SPEC AC #20.

#### C-m4f-016

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with "Units" selected, `lib/haptics` mocked
**WHEN** the Target input is empty (or `"0"`, or `"-1"`, or a non-integer `"2.5"`), OR the Unit input is empty, OR an overlap exists in `state`
**THEN** the Save button has `aria-disabled="true"` in each case; tapping disabled Save fires `haptics.medium` and does not call `onSave`.
**AND** when Target is a valid integer `≥ 1`, Unit is non-empty, and no overlap exists, Save's `aria-disabled` is `"false"`.
Proves: plan.md § Component edits `<AddBrickSheet>` (Save disabled on invalid Target / empty Unit / overlap — M4e contract preserved) — covers SPEC AC #21.

#### C-m4f-017

Target file: `components/AddBrickSheet.test.tsx`
**GIVEN** the sheet with "Units" selected, the M4e duration toggle ON, and `state` containing one block whose window the new brick overlaps
**WHEN** the DOM is queried
**THEN** the M4e overlap warning chip (`data-testid="overlap-warning"`, `role="alert"`) is in the DOM with the colliding item's name + window; the Save button carries `aria-describedby` pointing at an `sr-only` hint span; Save's `aria-disabled` is `"true"` — the M4e overlap chip + `aria-describedby` + sr-only hint + Save-disable behavior is unchanged by the kind-selector collapse.
Proves: plan.md § Component edits `<AddBrickSheet>` (M4e overlap chip + `aria-describedby` + sr-only hint preserved) — covers SPEC AC #22.

### E2E (Playwright) — deferred to preview

#### E-m4f-001

Target file: `tests/e2e/m4f.spec.ts`
**GIVEN** the app at `/`, AddBrickSheet open, "Units" kind chip selected, title `"Meditate"`, Target `"30"`, Unit `"minutes"`
**WHEN** the user taps Save, then taps the resulting units brick chip, types `"20"` in the UnitsEntrySheet, and taps Save
**THEN** the UnitsEntrySheet opens on chip tap; after Save the chip's primary line renders `"20 / 30 minutes"`.
Proves: plan.md § Test strategy E2E (add units brick → open sheet → type 20 → Save → chip renders "20 / 30 minutes") — covers SPEC AC #42 (E-m4f-01).

#### E-m4f-002

Target file: `tests/e2e/m4f.spec.ts`
**GIVEN** the app at `/` with a `kind: "tick"` brick chip present
**WHEN** the user taps the tick chip
**THEN** no sheet opens (no `role="dialog"` appears); the tick brick's `done` visibly flips (M4a regression — checkmark toggles).
Proves: plan.md § Test strategy E2E (tap a tick chip → no sheet; `done` flips — M4a regression) — covers SPEC AC #42 (E-m4f-02).

#### E-m4f-003

Target file: `tests/e2e/m4f.spec.ts`
**GIVEN** the app at `/` with AddBrickSheet open
**WHEN** the kind selector is inspected
**THEN** exactly two kind chips are visible — "Tick" and "Units"; no "Time" chip is present anywhere in the sheet.
Proves: plan.md § Test strategy E2E (AddBrickSheet shows exactly two kind chips, no "Time") — covers SPEC AC #42 (E-m4f-03).

#### E-m4f-004

Target file: `tests/e2e/m4f.spec.ts`
**GIVEN** the app at `/`, a units brick created with `unit: "reps"`, `target: 100`
**WHEN** the user taps the chip, types `"50"`, and Saves
**THEN** the chip renders `"50 / 100 reps"` — a free-text unit other than `"minutes"` behaves identically (free-text unit parity; the unit is just a string).
Proves: plan.md § Test strategy E2E (free-text unit parity — "reps" works the same as "minutes") — covers SPEC AC #42 (E-m4f-04).

#### E-m4f-005

Target file: `tests/e2e/m4f.spec.ts`
**GIVEN** the app at `/` with a units brick that has `unit: "minutes"`
**WHEN** the user observes the brick over time and inspects all surfaces
**THEN** no live timer is observable anywhere — `done` never auto-increments; there is no `<TimerSheet>` long-press behavior; the only way `done` changes is a manual typed value via `<UnitsEntrySheet>`.
**AND** the M4a block-complete and day-complete chimes are unaffected and still play on cross-up — they are retained celebration audio, not timer behavior.
Proves: plan.md § Test strategy E2E (no live timer anywhere; block/day chimes retained) — covers SPEC AC #42 (E-m4f-05).

### Accessibility (axe via Playwright) — deferred to preview

#### A-m4f-001

Target file: `tests/e2e/m4f.a11y.spec.ts`
**GIVEN** the app at `/` with `<UnitsEntrySheet>` open (under `count() > 0` guard)
**WHEN** the sheet root attributes are read via Playwright
**THEN** the sheet has `role="dialog"` and an `aria-labelledby` attribute whose value is the `id` of the heading element (`#units-entry-heading`), and that heading element exists and contains the brick name.
Proves: plan.md § Component design `<UnitsEntrySheet>` Accessibility wiring (`role="dialog"` + `aria-labelledby` → heading) — covers SPEC AC #43 (A-m4f-01).

#### A-m4f-002

Target file: `tests/e2e/m4f.a11y.spec.ts`
**GIVEN** the app at `/` with `<UnitsEntrySheet>` open for a units brick whose `unit === "minutes"`
**WHEN** the number input's accessible name is read via Playwright
**THEN** the input has an accessible name of the form `"Enter minutes done today"` (via `aria-label` `Enter ${brick.unit} done today` or an associated `<label>`).
Proves: plan.md § Component design `<UnitsEntrySheet>` Accessibility wiring (number input `aria-label="Enter <unit> done today"`) — covers SPEC AC #43 (A-m4f-02).

#### A-m4f-003

Target file: `tests/e2e/m4f.a11y.spec.ts`
**GIVEN** the app at `/` with `<UnitsEntrySheet>` open and the number input cleared (empty → Save disabled)
**WHEN** the Save button's attributes are read via Playwright
**THEN** the Save button has `aria-disabled="true"` and an `aria-describedby` attribute pointing at a DOM element that exists, is `sr-only`, and contains the hint `"Enter a number to save."`.
**AND** when a valid value is typed, `aria-disabled` becomes `"false"` (or the attribute is dropped).
Proves: plan.md § Component design `<UnitsEntrySheet>` Accessibility wiring (disabled Save `aria-describedby` + sr-only hint — mirrors M4e pattern) — covers SPEC AC #43 (A-m4f-03), AC #30.

#### A-m4f-004

Target file: `tests/e2e/m4f.a11y.spec.ts`
**GIVEN** the app at `/` with `<UnitsEntrySheet>` open, exercised across three states — (a) a valid value, (b) an empty value (Save disabled), (c) a value greater than `target`
**WHEN** axe-core runs against the document in each state (`AxeBuilder({ page }).analyze()`)
**THEN** zero violations are reported in all three states across every rule category enabled in the project's axe config (color-contrast, name-role-value, focus-visible, landmark).
Proves: plan.md § Component design `<UnitsEntrySheet>` Accessibility wiring (axe-core zero violations on open / empty / over-target) — covers SPEC AC #43 (A-m4f-04).

### Sandbox / preview note

Per the established M4a/M4b/M4c/M4d/M4e pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 5 `E-m4f-*` and 4 `A-m4f-*` IDs above are authored as full GIVEN/WHEN/THEN specs but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the same `if ((await x.count()) > 0)` guard pattern as `tests/e2e/m4a..m4e.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md` — and a future TESTS-mode dispatch owes a deterministic seeding helper that lifts the guards across all milestones in one pass. M4f does NOT introduce that helper (out of scope per ADR-022; it would touch six prior test files). The 9 deferred-to-preview IDs (5 E + 4 A) are net-additive; the 9 M4c deferred items (`E-m4c-001..005` + `A-m4c-001..004`) retire with the `tests/e2e/m4c.*.spec.ts` deletions, so the net vacuous-pass count is roughly flat post-M4f.

### Vitest headcount delta (AC #41)

Per plan.md § Risks and AC #41, the M4f headcount **drops then grows back**:

- **Retired (deleted files):** 25 M4c IDs (`U-m4c-012..015`, `C-m4c-007..018`, `E-m4c-001..005`, `A-m4c-001..004`) + the M4b stepper-on-chip IDs (count TBD by BUILDER against the M4b entry — see § Spec gaps) + the `[obsolete]` `components/Brick.test.tsx` and `components/ui/BrickChip.test.tsx` IDs.
- **Added (M4f):** 18 `U-m4f` + 17 `C-m4f` + 5 `E-m4f` + 4 `A-m4f` = **44 M4f IDs**.
- The fixture-migrated IDs (M2/M3/M4a/M4b/M4e — `kind: "goal"`/`"time"` literals rewritten) keep their original IDs and stay green; they are not part of the delta.

SHIPPER reports the exact net delta in `status.md` after the suite runs (the M4b stepper-ID count and the obsolete-file ID count are only knowable once BUILDER has the M4b/M4a tests.md entries in hand). The plan's "drops by ~10–25, grows back" estimate (AC #41) is consistent with 25+ retired vs 44 added.

### Spec gaps surfaced for VERIFIER

None genuinely unresolvable. SG-m4f-01 through SG-m4f-08 are all resolved in plan.md and reflected in the test IDs above (SG-m4f-01 `count → done` rename: `U-m4f-012`, `U-m4f-015`; SG-m4f-02 delete `<BrickStepper>`: `C-m4f-009` asserts no stepper buttons; SG-m4f-03 delete `overlapsExistingBlock` + re-point: `U-m4f-016`, `U-m4f-017`; SG-m4f-04 tap trigger: `C-m4f-010`; SG-m4f-05 no units-completion audio / chimes retained: see note below; SG-m4f-06 integers only: `U-m4f-003`, `C-m4f-005`; SG-m4f-07 no timer-state migration: covered by the clean rip — `E-m4f-005`; SG-m4f-08 ADR-042 prose harmonization: a `docs(harness)` edit, not a testable AC).

Two items for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **M4b stepper-on-chip retired-ID enumeration.** The dispatch's "Retired test IDs" section asks to enumerate M4c timer IDs (done above — 25 IDs). It also notes M4b stepper-on-chip IDs retire (stepper deleted per SG-m4f-02). The M4b tests.md entry was **not** in this dispatch's inputs, so the M4f entry cannot enumerate those M4b IDs by number — it states the retirement rule and defers the literal list to BUILDER (who reads the M4b entry during Phase B/C migration). VERIFIER's call: accept the deferred enumeration (the rule is unambiguous — any M4b ID asserting ±1 buttons / scale-press / long-press auto-repeat / clamp haptic retires) OR re-dispatch with the M4b tests.md entry attached so the M4f entry can list them explicitly. Plan-locked preference: accept the deferred enumeration — the M4b reducer-level `LOG_GOAL_BRICK` semantics are already re-authored as `U-m4f-001..006`, so no M4b coverage is lost; only the literal ID strings are deferred.

2. **`tsc`-gate coverage for purely-structural ACs.** AC #1–#6 are partly compile-time. The coverage map below pairs each with a runtime anchor (`U-m4f-010`, `U-m4f-012`, `U-m4f-013`) and marks the structural residue `tsc-gate`. This mirrors exactly how M4e's AC #33 was mapped (`gate (npm run eval)` + `U-m4e-021`). VERIFIER's call: confirm the `tsc-gate + runtime-anchor` pairing is sufficient coverage for the structural ACs (consistent with M4e precedent) — no escalation expected.

**SG-m4f-05 note (audio):** plan.md § Audio cleanup (corrected) locks audio as RETAINED — `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every M4a block/day `playChime()` call site stay. M4f authors **no audio tests** — there is no audio change to verify. The existing M4a/M4c audio IDs (`U-m4c-008..010` on `lib/audio.test.ts`) are **not retired** and continue to run. `E-m4f-005` asserts the block/day chimes still play (a retained-feature regression check, not a new audio feature).

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                               | Covering test IDs                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| #1  | `Brick` union has exactly two variants (`tick`, `units`); no `goal`/`time`                                       | `U-m4f-012`; tsc-gate (AC #39)                                       |
| #2  | Units variant shape `{kind:"units";target;unit;done}`; `count` renamed `done`                                    | `U-m4f-012`; tsc-gate (AC #39)                                       |
| #3  | `AppState.runningTimerBrickId` removed from the type                                                             | `U-m4f-010`, `U-m4f-013`; tsc-gate (AC #39)                          |
| #4  | `Action` union drops `START/STOP/TICK/SET_TIMER_MINUTES` + `LOG_GOAL_BRICK`                                      | `U-m4f-010`; tsc-gate (AC #39)                                       |
| #5  | `Action` union contains `SET_UNITS_DONE {brickId;done}`                                                          | `U-m4f-001`, `U-m4f-010`; tsc-gate (AC #39)                          |
| #6  | M4e `BrickBase` fields (`hasDuration`,`start?`,`end?`,`recurrence?`) + invariant unchanged                       | `U-m4f-008`, `U-m4f-013`; tsc-gate (AC #39)                          |
| #7  | `SET_UNITS_DONE` finds by id (loose then nested), sets `done = Math.max(0,Math.floor(done))`                     | `U-m4f-001`, `U-m4f-002`, `U-m4f-003`, `U-m4f-004`, `U-m4f-011`      |
| #8  | `SET_UNITS_DONE` on a non-existent id returns state unchanged (no throw)                                         | `U-m4f-005`                                                          |
| #9  | `SET_UNITS_DONE` on a tick brick is rejected (state unchanged)                                                   | `U-m4f-006`                                                          |
| #10 | `ADD_BRICK` rejects any `kind` not `tick`/`units`; M4e duration invariant kept                                   | `U-m4f-007`, `U-m4f-008`                                             |
| #11 | `LOG_TICK_BRICK` unchanged from M4a                                                                              | `U-m4f-009`                                                          |
| #12 | `lib/timer.ts` + `lib/timer.test.ts` deleted                                                                     | retired-IDs (`U-m4c-012..015`); tsc-gate (AC #39)                    |
| #13 | `components/TimerSheet.tsx` + `TimerSheet.test.tsx` deleted                                                      | retired-IDs (`C-m4c-007..012`); tsc-gate (AC #39)                    |
| #14 | `lib/audio.ts` + `chime.mp3` + M4a block/day chime calls RETAINED                                                | `E-m4f-005` (chimes still play); SG-m4f-05 note                      |
| #15 | Any `useTimer` hook file deleted                                                                                 | retired-IDs (`U-m4c-012..015`); tsc-gate (AC #39)                    |
| #16 | No source file imports a deleted timer path (`grep lib/timer\|TimerSheet\|useTimer` zero)                        | tsc-gate + ESLint-gate (AC #39, #40); `U-m4f-017`                    |
| #17 | `overlapsExistingBlock` (+ `isValidBrickTime`) deleted; M2 regression re-pointed                                 | `U-m4f-016`, `U-m4f-017`                                             |
| #18 | Kind selector renders exactly two chips ("Tick"/"Units"); no "Time"                                              | `C-m4f-013`, `E-m4f-003`                                             |
| #19 | Selecting "Units" reveals Target (`number,min1,step1`) + Unit (`text`) inputs                                    | `C-m4f-014`                                                          |
| #20 | Save with "Units" constructs `{kind:"units",target,unit,done:0}` + M4e duration fields                           | `C-m4f-015`, `E-m4f-001`                                             |
| #21 | Save disabled on invalid Target / empty Unit / overlap                                                           | `C-m4f-016`                                                          |
| #22 | M4e overlap chip + `aria-describedby` + sr-only hint + Save-disable unchanged                                    | `C-m4f-017`                                                          |
| #23 | `<BrickChip>` renders only two variants; time-variant branch deleted                                             | `C-m4f-012`                                                          |
| #24 | Units chip primary line `"<done> / <target> <unit>"`; M4e time-window badge still renders                        | `C-m4f-009`, `C-m4f-012`                                             |
| #25 | Tap units chip → opens `<UnitsEntrySheet>`; tap tick chip → flips `done`, no sheet                               | `C-m4f-010`, `C-m4f-011`, `E-m4f-001`, `E-m4f-002`                   |
| #26 | No ±1 stepper buttons anywhere on the chip                                                                       | `C-m4f-009`                                                          |
| #27 | Sheet heading = brick `name`; sub-heading `"Today's <unit>"`                                                     | `C-m4f-001`, `C-m4f-002`                                             |
| #28 | Single `number` input (`inputMode=numeric,min0,step1`) pre-filled with current `done`                            | `C-m4f-001`, `C-m4f-002`, `C-m4f-008`                                |
| #29 | Save with a valid non-negative integer dispatches `SET_UNITS_DONE` + closes                                      | `C-m4f-003`, `E-m4f-001`                                             |
| #30 | Save empty → disabled + `medium` haptic + `"Enter a number to save."` hint on disabled-tap                       | `C-m4f-004`, `C-m4f-005`, `A-m4f-003`                                |
| #31 | Cancel closes the sheet without dispatching                                                                      | `C-m4f-006`                                                          |
| #32 | Sheet uses M0 `<Sheet>` primitive for layout + animation                                                         | `C-m4f-007`                                                          |
| #33 | Number input opens numeric keypad on mobile (`inputMode="numeric"`)                                              | `C-m4f-002`                                                          |
| #34 | All `kind:"goal"` fixtures migrated to `kind:"units"` (`count → done`); no goal-kind assertion remains           | `U-m4f-001`..`U-m4f-015` (migrated fixtures); § Pre-M4f migration    |
| #35 | All `kind:"time"` fixtures migrated to `kind:"units"` (`unit:"minutes"`,`target`,`done`); no time-kind assertion | `U-m4f-014`, `U-m4f-018`; § Pre-M4f migration                        |
| #36 | `lib/timer.test.ts` + `TimerSheet.test.tsx` deleted; their M4c IDs explicitly retired in tests.md                | § Retired test IDs (25 M4c IDs listed)                               |
| #37 | M4e duration-toggle tests re-pointed to units-kind stay green                                                    | `U-m4f-018`                                                          |
| #38 | `lib/dharma.ts`/`scoring.ts` scoring uses `done/target`; M4b assertions hold post-rename                         | `U-m4f-014`, `U-m4f-015`                                             |
| #39 | `tsc --noEmit`: zero errors                                                                                      | gate (`npm run eval`); anchors `U-m4f-010`, `U-m4f-012`, `U-m4f-013` |
| #40 | ESLint: zero errors                                                                                              | gate (`npm run eval`)                                                |
| #41 | Vitest full suite passes; headcount delta documented                                                             | gate (`npm run eval`); § Vitest headcount delta                      |
| #42 | Playwright (deferred-to-preview): E-m4f-01..05                                                                   | `E-m4f-001`, `E-m4f-002`, `E-m4f-003`, `E-m4f-004`, `E-m4f-005`      |
| #43 | A11y (deferred-to-preview, axe-core): A-m4f-01..04                                                               | `A-m4f-001`, `A-m4f-002`, `A-m4f-003`, `A-m4f-004`                   |

All 43 ACs map to at least one test ID (or a `tsc`/ESLint gate paired with a runtime anchor, per the M4e precedent). Every `U-/C-/E-/A-m4f` ID maps back to at least one AC — no orphans.

## Milestone 4g — Timer-era dead-code sweep — Tests

This entry covers M4g — the deletion of inert `@deprecated` timer-era props from five components, the rename of one mislabelled test ID, and the fix of one stale `lib/data.ts` comment. It is derived from the `plan.md` M4g entry (`## Milestone 4g — Timer-era dead-code sweep — Plan`, committed `bafd6e2`).

### Testing nuance — why this entry is mostly a gate-mapping table

M4g is **pure subtraction with zero behavior change** (plan.md § Context; spec.md § Intent). It writes **no new feature behavior, no new component, no new prop, no new reducer arm.** Per the plan's § Ordering / commit strategy, strict per-test red→green TDD **does not apply** to M4g: there is no behavior to drive red→green, and a per-component "prop is absent" type-probe test would be a throwaway artifact with no lasting value (a vacuous `expect`-style test). The plan explicitly sanctions a **2-commit bulk** delivery instead of per-test commits — this tests.md entry records that sanction in writing so the EVALUATOR's test-integrity gate has a documented basis for accepting it.

Consequently this entry does **not** fabricate behavioral `it()` blocks for the subtraction work. Each of the 8 ACs is mapped honestly to **either**:

- **(a) a named gate or grep** that proves it — the `npx tsc --noEmit` gate, the `npm run lint` gate, the full Vitest suite staying green, or a scoped source grep; **or**
- **(b) a concrete test ID** — and there is exactly one genuine test-artifact change in M4g: the `U-m4f-016` → `U-m3-013` relabel (AC #5).

No new `U-m4g-` / `C-m4g-` test ID is created. M4g adds zero tests and removes zero tests (plan.md § Edge cases — "Test-count regression": the rename changes a `describe` string only, same two `it()` blocks).

### Renamed test ID — `U-m4f-016` → `U-m3-013` (AC #5, plan.md § SG-m4g-01 resolution)

This is the **only genuine test artifact M4g touches.** It is a relabel, not a new test:

- **What moves:** the `describe` block in `lib/blockValidation.test.ts` (currently at file line ~199) that exercises `isValidBrickUnitsTarget` (the M4f rename of `isValidBrickGoal`, integer ≥ 1) is currently mislabelled with the `describe`-string token `U-m4f-016`. That token **collides** with the genuine `U-m4f-016` G/W/T at tests.md line 5271 (the `intervalsOverlap` re-point of `U-m2-004`). M4g re-attaches the mislabelled `describe` to its **true ancestral ID `U-m3-013`** — the canonical, already-existing test ID for this exact function (`U-m3-013` at tests.md line 2307, "`lib/blockValidation.ts:isValidBrickGoal` — integer ≥ 1"; the assertion at file line ~199 is literally the M4f-renamed body of `U-m3-013`).
- **The `describe` string becomes exactly:** `describe("U-m3-013: isValidBrickUnitsTarget validates target is integer ≥ 1", () => {` — only the leading `U-m4f-016` token changes to `U-m3-013`.
- **Assertion body unchanged:** the two `it()` blocks and every `expect` inside the `describe` are **preserved verbatim** (AC #5: "its assertion is unchanged and green"). No assertion is added, removed, or edited. The test stays green.
- **Collision cleared:** after the rename, `U-m4f-016` (tests.md line 5271, the `intervalsOverlap` re-point) is **collision-free** — it is the sole bearer of that ID. `U-m3-013` appears as the Unit ID for `isValidBrickUnitsTarget` and nowhere else in `lib/blockValidation.test.ts`. `U-m4f-016` / `U-m4f-017` (the genuine `intervalsOverlap` re-points elsewhere in the same file) are untouched.
- **No new ID assigned.** Per plan.md § SG-m4g-01, `U-m3-013` is the test's true M3 origin, not a fabricated detached ID — so no `U-m4g-` prefix is minted. The `U-m3-013` entry already in tests.md (line 2307) needs no edit: its function moniker `isValidBrickGoal` is the pre-M4f name, but ID hygiene only requires the ID string to be stable and non-colliding, which it is. (The BUILDER may optionally tidy the line-197 banner comment in the test file to drop the now-misleading `U-m4f-016` cross-reference — optional polish, not AC-required.)

**No retired IDs.** M4g deletes no test file and no test. The "Retired test IDs" section is intentionally empty for this milestone — see § Retired test IDs below.

### Retired test IDs

**None.** M4g removes no test and deletes no test file. Every existing `U-/C-/E-/A-` ID across all milestones remains live and green. The only ID-space change is the `U-m4f-016` → `U-m3-013` relabel above, which is a rename, not a retirement (the assertion persists under its true ancestral ID).

### Unit (Vitest)

M4g authors **no new unit test.** The only unit-layer change is the `U-m4f-016` → `U-m3-013` relabel documented above; the relabelled `U-m3-013` continues to run from `lib/blockValidation.test.ts` exactly as before, asserting `isValidBrickUnitsTarget` (integer ≥ 1). Its GIVEN/WHEN/THEN is unchanged from the existing `U-m3-013` entry (tests.md line 2307) — re-pointed at the M4f-renamed function `isValidBrickUnitsTarget` rather than `isValidBrickGoal`, with the same `1 / 100 / 9999 → true` and `0 / -1 / 1.5 / NaN → false` assertions.

### Component (Vitest + Testing Library)

M4g authors **no new component test.** The five component edits (`BrickChip`, `TimelineBlock`, `Timeline`, `LooseBricksTray`, `TimedLooseBrickCard`) delete only `@deprecated` `Props` declarations that **no destructure reads and no call site passes** (plan.md § File-by-file change list — every removed prop is inert; the destructures already omit them). Therefore every existing `C-` ID for these five components renders **byte-identical DOM** before and after M4g and stays green with no edit. This zero-behavior-change invariant is the substance of AC #8, proven by the **full Vitest suite staying green** (gate, see mapping below) — not by a new bespoke component test.

### E2E (Playwright)

**None.** M4g changes no user-visible behavior, no rendering, no routing, no interaction. There is no e2e surface to add. Every existing `E-` ID is unaffected.

### Accessibility (axe via Playwright)

**None.** M4g adds no component, no DOM, no ARIA surface. There is no a11y surface to add. Every existing `A-` ID is unaffected.

### AC → verification mapping (all 8 ACs accounted for)

Every M4g acceptance criterion is mapped below to **either** the exact gate/grep that proves it **or** the one concrete test-ID change. No AC is left unmapped. The grep verification is read as "zero hits in non-comment source": per AC #4 and plan.md § Risks R3, hits inside kept history/migration comments (SG-m4g-02) and inside `docs/` / `CHANGELOG.md` are **expected and excluded** — they are not failures.

| AC# | Acceptance criterion (paraphrased)                                                                                                                 | Verified by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | `components/BrickChip.tsx` `Props` declares none of `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`          | **Gate-verified.** `npx tsc --noEmit` (zero errors) confirms the file still compiles after the five prop-line deletions + a scoped grep `grep -n "onUnitsLog\|onGoalLog\|runningTimerBrickId\|onTimerToggle\|onTimerOpenSheet\|running?:" components/BrickChip.tsx` returns zero `Props`-declaration hits. Note (plan.md § File-by-file #1): BrickChip's inert timer-state prop is declared `running?: boolean;`, NOT `runningTimerBrickId` — the substantive deletion is `running`; AC #1's literal text re `runningTimerBrickId` is satisfied trivially since BrickChip never declared that name. |
| #2  | `components/TimelineBlock.tsx` `Props` declares none of `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`      | **Gate-verified.** `npx tsc --noEmit` (zero errors) + a scoped grep `grep -n "onUnitsLog\|onGoalLog\|runningTimerBrickId\|onTimerToggle\|onTimerOpenSheet" components/TimelineBlock.tsx` returns zero `Props`-declaration hits.                                                                                                                                                                                                                                                                                                                                                                     |
| #3  | `Timeline.tsx`, `LooseBricksTray.tsx`, `TimedLooseBrickCard.tsx` `Props` declare neither `onUnitsLog` nor `onGoalLog`                              | **Gate-verified.** `npx tsc --noEmit` (zero errors) + a scoped grep `grep -n "onUnitsLog\|onGoalLog" components/Timeline.tsx components/LooseBricksTray.tsx components/TimedLooseBrickCard.tsx` returns zero `Props`-declaration hits (history comments excluded per AC #4 / SG-m4g-02).                                                                                                                                                                                                                                                                                                            |
| #4  | `grep` for each removed prop name across `app/`, `components/`, `lib/` returns zero hits, excepting `CHANGELOG.md`, `docs/`, migration comments    | **Gate-verified (grep).** `grep -rn "onUnitsLog\|onGoalLog\|runningTimerBrickId\|onTimerToggle\|onTimerOpenSheet" app/ components/ lib/` returns zero **non-comment source** hits. Per plan.md § Risks R3, the kept one-line history/migration comments (BrickChip lines 2–9, Timeline line 11, TimedLooseBrickCard line 11 — SG-m4g-02) and any `docs/` / `CHANGELOG.md` strings are expected hits and excluded by AC #4's own wording.                                                                                                                                                            |
| #5  | The mislabelled `U-m4f-016` `describe` in `lib/blockValidation.test.ts` is renamed to an accurate, non-colliding ID; assertion unchanged and green | **Test-ID change.** The `describe` is relabelled to its true ancestral ID **`U-m3-013`** (see § Renamed test ID above). The two `it()` blocks and every `expect` are preserved verbatim. Proven green by the **full Vitest suite** (gate). The genuine `U-m4f-016` at tests.md line 5271 is now collision-free.                                                                                                                                                                                                                                                                                     |
| #6  | The `findUnitsBrickById` comment in `lib/data.ts` no longer mentions `lib/timer.ts` or `findTimeBrickById`                                         | **Gate-verified (grep — docs/comment check, not a runtime test).** Per plan.md § `lib/data.ts` comment fix, the stale line is replaced with `* findUnitsBrickById — M4f helper. Searches state for a units-kind brick by id.` After the fix, `grep -n "timer\.ts\|findTimeBrickById" lib/data.ts` returns zero hits.                                                                                                                                                                                                                                                                                |
| #7  | `tsc --noEmit` zero errors; `npm run lint` zero errors / ≤13 warnings; full Vitest suite green; no net test-count regression                       | **Gate-verified.** `npx tsc --noEmit` → zero errors. `npm run lint` → zero errors, ≤13 warnings (plan.md § Risks R4: removing unused prop declarations can only hold or reduce the warning count). Full **Vitest suite** → green. Test count: M4g adds zero tests, removes zero tests; the `U-m3-013` relabel changes a `describe` string only — same two `it()` blocks (plan.md § Edge cases, "Test-count regression").                                                                                                                                                                            |
| #8  | No behavior change: every existing component test passes; no snapshot / rendered DOM / scoring output differs from the M4f ship                    | **Gate-verified.** The full **Vitest suite** staying green proves zero behavior change: the ten removed props were inert (no destructure read them, no call site passed them — plan.md § Call-graph summary), so every `C-` component test renders byte-identical DOM. Per plan.md § Edge cases R1, any new `tsc` error or red test is **not** a tolerated outcome — it would reveal a secretly-live prop and is a finding to investigate, never to silence by re-adding the prop.                                                                                                                  |

**Coverage summary:** ACs #1, #2, #3, #4, #6, #7, #8 are **gate-verified** (six gate/grep checks: `tsc --noEmit`, `npm run lint`, full Vitest suite green, plus scoped source greps for the removed prop names and the stale comment). AC #5 is the **one genuine test-ID change** (`U-m4f-016` → `U-m3-013` relabel, assertion verbatim). No AC is unmapped.

### Spec gaps surfaced for VERIFIER

None unresolved. SG-m4g-01 (the new ID for the renamed `U-m4f-016` test) and SG-m4g-02 (migration-comment policy) are both **resolved in plan.md** (§ SG-m4g-01 resolution → relabel to `U-m3-013`; § SG-m4g-02 resolution → keep one-line history comments, delete only `@deprecated` tags + signatures) and are reflected in this entry. One item for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **No new behavioral test for a subtraction milestone.** This tests.md entry deliberately authors **zero new `U-/C-/E-/A-m4g` IDs** — M4g writes no new behavior, so per plan.md § Ordering / commit strategy the honest tests.md entry is a gate-mapping table plus the one `U-m3-013` relabel, not fabricated `expect(true)`-style tests. VERIFIER's call: confirm that a gate-mapping table (AC → `tsc`/lint/Vitest gate or grep) is sufficient spec-coverage for a pure-subtraction milestone with zero behavior change — consistent with how M4f mapped its purely-structural ACs (#39/#40/#41) to `gate (npm run eval)`. No escalation expected; the plan explicitly sanctioned the 2-commit bulk and this entry records that sanction.

All 8 M4g ACs map to at least one gate/grep or the one test-ID change. M4g introduces no new test ID and retires none.

## Milestone 8 — Persistence — Tests

This entry covers M8 — `lib/persist.ts` (`loadState`/`saveState`/`PersistedState`/`STORAGE_KEY`/`migrate`/`defaultPersisted`), the `usePersistedState()` hook in `lib/usePersistedState.ts`, two-pass hydration wired into `BuildingClient`, and the AC #13 day-number swap (`BuildingClient` wires the **pre-existing** `lib/dharma.ts:dayNumber()` helper in place of `dayOfYear()` — the helper is not new and is not re-authored; see § Retired test IDs). It is derived from the `plan.md` M8 entry (`## Milestone 8 — Persistence — Plan`, committed `b25d174`, day-number section amended per VERIFIER FAIL retry 1). Feature slug: `m8`. ID prefixes: `U-m8-`, `C-m8-`, `E-m8-`, `A-m8-`.

### Testing approach — what is bespoke vs gate-verified

M8 has a **large genuine unit + component surface** (the persist module is pure and the hydration ordering is behavior-rich), so unlike M4g this entry authors real GIVEN/WHEN/THEN `it()` blocks for the persistence engine and the hydration wiring. Two ACs are honestly gate-verified rather than bespoke-tested, consistent with how M4f/M4g mapped purely-structural ACs to `npm run eval`:

- **AC #14 (no regression — every M1–M4g Vitest/component test passes unmodified)** → gate-verified by the **full Vitest suite staying green** under `npm run eval`. M8 changes no UI surface, so a bespoke "nothing changed" test would be vacuous; the binding proof is that no prior test file is edited and all prior IDs stay green. (`U-m8-009` plus `C-m8-001`/`C-m8-007` give runtime anchors for the schema-lock and zero-UI-delta portions, but the regression guarantee itself is the suite gate.)
- **AC #15 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest green; E2E clears `localStorage` per case)** → gate-verified by `npm run eval` (lint + typecheck + vitest + e2e + a11y). The `localStorage`-cleared-per-case requirement is realized as a `test.beforeEach` in the E2E specs (see § E2E) — not a bespoke assertion.

All other 13 ACs map to at least one concrete test ID below. One nuance: **AC #13 (`programStart`-relative day number)** is a pure wiring task — `BuildingClient` swaps `dayOfYear(new Date())` for the **pre-existing** `lib/dharma.ts:dayNumber()` helper. The helper's math is already covered green by the existing `U-bld-024` (`lib/dharma.test.ts`); M8 therefore authors **no** bespoke unit test for the helper and verifies AC #13 only at the wiring layer (`C-m8-007`). The pre-VERIFIER draft's `U-m8-012`/`U-m8-013` were removed for re-testing the helper against a wrong, clamped signature that contradicted the locked `U-bld-024` contract — see § Unit and § Retired test IDs.

### Mutation-resistance notes (read before reviewing the IDs)

Per the dispatch's explicit requirement, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **Round-trip tests assert exact restored values** — `U-m8-002`/`C-m8-004` assert the precise `done` value of each brick (`true`/`false` for tick, the exact integer for units), block ids, category ids, and `programStart` — not "state is non-empty". A mutant that restores a default-but-non-empty state must fail.
- **Malformed-JSON / unknown-version tests assert two things** — the default IS returned AND no exception escapes (`expect(() => loadState()).not.toThrow()` plus a deep-equal on the returned default). A mutant that lets the parse error propagate fails the no-throw arm; a mutant that returns `undefined` fails the deep-equal arm.
- **The two-pass ordering test (`C-m8-003`, R2)** asserts that `saveState` does NOT fire on the empty-default first render and does NOT clobber a pre-seeded real `dharma:v1` before hydration completes — a mutant that drops the `if (!mounted) return` guard fails it.
- **Schema-lock test (`C-m8-001`)** asserts no `HYDRATE` (or any new) action type exists on the `Action` union and that `reducer` never receives an unknown action — a mutant that re-seeds via a new action variant fails it.

### Test ID layout

| Layer                                 | IDs             | Count  |
| ------------------------------------- | --------------- | ------ |
| Unit (Vitest)                         | `U-m8-001..011` | 11     |
| Component / integration (Vitest+TL)   | `C-m8-001..007` | 7      |
| E2E (Playwright, deferred-to-preview) | `E-m8-001..003` | 3      |
| Accessibility (axe via Playwright)    | `A-m8-001`      | 1      |
| **Total**                             |                 | **22** |

_`U-m8-012`/`U-m8-013` from the pre-VERIFIER draft were removed (see § Unit and § Retired test IDs) — the `U-m8-` series ends at `011` with no renumbering of surviving IDs and no gap re-used._

### Unit (Vitest)

All `U-m8-*` IDs mock `localStorage` (a fresh in-memory stub installed on `globalThis.localStorage` in `beforeEach`, cleared in `afterEach`) so the persist module is exercised in isolation with no real browser storage.

#### U-m8-001

Target file: `lib/persist.test.ts` (NEW)
**GIVEN** the `lib/persist.ts` module
**WHEN** its exports are inspected
**THEN** `STORAGE_KEY` is the exact string `"dharma:v1"`; `SCHEMA_VERSION` is the number `1`; `loadState`, `saveState`, `defaultPersisted`, and `migrate` are all `typeof === "function"`; the `PersistedState` type is exported (compile-time, `tsc` gate — a `PersistedState`-typed literal `{ schemaVersion: 1, programStart: "2026-05-15", blocks: [], categories: [], looseBricks: [] }` type-checks).
Proves: plan.md § `lib/persist.ts` API (module surface; `STORAGE_KEY`/`SCHEMA_VERSION` constants) — covers SPEC AC #1.

#### U-m8-002

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and a `PersistedState` value with one block `{ id: "b1" }` holding one nested `kind: "units"` brick `{ id: "n1", done: 25 }`, one category `{ id: "c1" }`, one loose `kind: "tick"` brick `{ id: "t1", done: true }`, and `programStart: "2026-05-01"`
**WHEN** `saveState(state)` is called, then `loadState()` is called
**THEN** `loadState()` returns a value deep-equal to the saved state — the block id is `"b1"`, the nested units brick's `done === 25` (exact integer), the category id is `"c1"`, the loose tick brick's `done === true` (exact boolean, not coerced), and `programStart === "2026-05-01"`.
**AND** the raw `localStorage.getItem("dharma:v1")` string `JSON.parse`s to an object whose top-level keys are exactly `schemaVersion`, `programStart`, `blocks`, `categories`, `looseBricks` and whose `schemaVersion === 1` — the ADR-044 shape (cross-ref `U-m8-003`).
Proves: plan.md § `lib/persist.ts` API (`saveState`/`loadState` round-trip; exact `done` value fidelity for both brick kinds) — covers SPEC AC #2, AC #3, AC #7.

#### U-m8-003

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and an `AppState` `{ blocks: [b1], categories: [c1], looseBricks: [t1], programStart: "2026-05-01" }`
**WHEN** `saveState(state)` is called
**THEN** `localStorage.getItem("dharma:v1")` is a non-null JSON string; `JSON.parse` of it equals `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [b1], categories: [c1], looseBricks: [t1] }` — `schemaVersion` is the literal `1` and is present even though it is NOT a field of the input `AppState` (added at the persist boundary per SG-m8-04); the parsed object has **no** key other than those five (no leaked runtime-only field).
Proves: plan.md § Data model / SG-m8-04 resolution (`saveState` writes the ADR-044 wrapper shape; `schemaVersion` is a boundary-only key) — covers SPEC AC #2.

#### U-m8-004

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (`getItem` returns `null` — first run) and the system clock set/known to today
**WHEN** `loadState()` is called
**THEN** it returns a `PersistedState` with `blocks`, `categories`, `looseBricks` all `[]` (empty arrays), `schemaVersion === 1`, and `programStart` equal to today's ISO date (the `today()` helper's value) — the empty-state default.
**AND** no exception is thrown.
Proves: plan.md § `lib/persist.ts` API (`loadState` no-key path → `defaultPersisted()`; `programStart` stamped to today) — covers SPEC AC #3, AC #12.

#### U-m8-005

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is the malformed string `"{not valid json"` (un-parseable)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()` — no exception escapes; AND the return value is deep-equal to `defaultPersisted()` (empty `blocks`/`categories`/`looseBricks`, `schemaVersion: 1`, `programStart` = today).
**AND** `loadState` does **not** call `localStorage.removeItem` — the corrupt key is left in place for the next `saveState` to overwrite (SG-m8-05 passive disposition; assert the `removeItem` spy was not called).
Proves: plan.md § `lib/persist.ts` API + § Edge cases (malformed JSON → `defaultPersisted()`, no throw, passive overwrite) — covers SPEC AC #8.

#### U-m8-006

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for `{ schemaVersion: 2, programStart: "2026-05-01", blocks: [], categories: [], looseBricks: [] }` (a future/unknown version)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()` — `migrate` returned `null` for the unknown version and `loadState` fell back to the default.
**AND** the same holds for `schemaVersion: 0` and for a missing `schemaVersion` key (both → `null` from `migrate` → default).
Proves: plan.md § `lib/persist.ts` API `migrate` (unknown/future/absent `schemaVersion` → `null` → `defaultPersisted()`; forward-incompatible data not guessed at) — covers SPEC AC #9.

#### U-m8-007

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **partial** object `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [b1] }` (`categories` and `looseBricks` absent)
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` has `blocks` equal to `[b1]` (the present collection is preserved verbatim), `categories === []` and `looseBricks === []` (each absent collection filled with a fresh empty array), and `programStart === "2026-05-01"`.
**AND** when `blocks` is present but not an array (e.g. `blocks: "oops"`), it is also coerced to `[]` (`Array.isArray(...) ? value : []`).
Proves: plan.md § `lib/persist.ts` API `migrate` (partial object → absent/non-array collections filled with `[]`) — covers SPEC AC #10.

#### U-m8-008

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `getItem` is stubbed to **throw** (e.g. `new DOMException("denied")` — Safari private mode / storage disabled)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()`.
**AND** given a `localStorage` whose `setItem` is stubbed to throw (quota exceeded), `expect(() => saveState(anyValidState)).not.toThrow()` — the error is swallowed inside `saveState`'s `try/catch`, no rethrow.
Proves: plan.md § `lib/persist.ts` API + § Edge cases (`getItem`/`setItem` throwing → `loadState` returns default, `saveState` swallows; app never crashes) — covers SPEC AC #11.

#### U-m8-009

Target file: `lib/persist.test.ts`
**GIVEN** the `migrate(raw: unknown)` function exercised directly
**WHEN** called with `null`, `undefined`, a number, a string, and an array
**THEN** every non-(non-null-object) input returns `null`.
**AND** when called with a well-versioned object `{ schemaVersion: 1, programStart: "2026-05-01", blocks: [], categories: [], looseBricks: [] }` it returns a `PersistedState` (not `null`); the returned object's `schemaVersion === 1`.
**AND** the only version-branching site is `migrate` — `loadState` itself contains no `schemaVersion` literal comparison (assert by inspection / the migrator-scaffold invariant; M5's `case 2` extension is a single-function change).
Proves: plan.md § `lib/persist.ts` API `migrate` (scaffold version-gate; non-object → `null`; `migrate` is the sole version-logic site — ADR-044) — covers SPEC AC #9.

#### U-m8-010

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with a prior-session `dharma:v1` whose `programStart` is `"2026-03-10"` (an old date, not today)
**WHEN** `loadState()` is called
**THEN** the returned `programStart === "2026-03-10"` — preserved verbatim, **not** re-stamped to today; the string passes straight through `migrate`.
**AND** when `programStart` is present but not a string (e.g. `programStart: 123`), `migrate` coerces it to `today()` (defensive default for a corrupt field).
Proves: plan.md § `lib/persist.ts` API `migrate` + § Edge cases (`programStart` already set → preserved; non-string → `today()`) — covers SPEC AC #12.

#### U-m8-011

Target file: `lib/persist.test.ts`
**GIVEN** the `defaultPersisted()` factory
**WHEN** it is called twice
**THEN** each call returns a fresh object with `schemaVersion === 1`, `blocks`/`categories`/`looseBricks` all `[]`, and `programStart` equal to today's ISO date; the two returned `blocks` arrays are **distinct references** (no shared mutable default) — `defaultPersisted().blocks !== defaultPersisted().blocks`.
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` shape; fresh-object factory, no shared-array footgun) — covers SPEC AC #3.

_(IDs `U-m8-012` and `U-m8-013` were removed during VERIFIER FAIL retry 1 — they re-tested the math of the **pre-existing** `lib/dharma.ts:dayNumber()` helper, which is already covered green by `U-bld-024`. AC #13 is a pure wiring task; its coverage lives at the component layer in `C-m8-007`. No `U-m8-` ID is reused for the gap — the series ends at `U-m8-011`. See § Retired test IDs.)_

### Component (Vitest + Testing Library)

`C-m8-*` IDs render the `usePersistedState()` hook (via a tiny test harness component or `renderHook`) and/or `BuildingClient`, with a mocked `localStorage`. The `dharma:v1` key is cleared before each test.

#### C-m8-001

Target file: `lib/usePersistedState.test.tsx` (NEW)
**GIVEN** the `usePersistedState()` hook and the post-M8 `Action` union from `lib/types.ts`
**WHEN** the hook is rendered and its returned tuple inspected
**THEN** the tuple is `[state, dispatch]` where `state` is an `AppState` and `dispatch` is a function; the `Action` union contains **no** `HYDRATE` member and no other M8-added action variant (compile-time `tsc` gate: an action literal `{ type: "HYDRATE" }` is a type error; runtime: dispatching every existing action type — `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE` — succeeds, and the reducer is never handed an unknown type).
**AND** `reducer` (from `lib/data.ts`) is byte-identical to M4f — the hook re-seeds state via direct `setState`, not via a new action (plan.md § Hydration design, § Risks R3).
Proves: plan.md § Hydration design + § Risks R3 (schema lock: no new `Action`; hook re-seeds via `setState`) — covers SPEC AC #14 (runtime anchor for the `Action`-lock portion).

#### C-m8-002

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` containing a valid `dharma:v1` with one block, one category, and one loose brick
**WHEN** `usePersistedState()` is rendered and the state is read **synchronously on the first render** (before effects flush — simulating SSR / first client paint)
**THEN** the first-render `state` is the empty default — `blocks: []`, `categories: []`, `looseBricks: []` — **not** the persisted values; the lazy `useReducer`/`useState` initializer returned `projectToAppState(defaultPersisted())` and `loadState()` was **not** called during render (assert the `loadState` spy has zero calls at first-render time).
Proves: plan.md § Hydration design pass-one + § Risks R1 (SSR / first paint = empty default; `loadState` never called in render) — covers SPEC AC #4.

#### C-m8-003

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` **pre-seeded** with a real `dharma:v1` holding one block `b1` (a user's prior-session day), and `saveState` wrapped in a spy
**WHEN** `usePersistedState()` is rendered and effects are allowed to flush (`act`)
**THEN** the two-pass ordering holds: `saveState` is **not** called on the empty-default first render — at the moment just after first paint and before the hydration effect, the `saveState` spy has **zero** calls; the pre-seeded `dharma:v1` still contains `b1` (it was NOT overwritten with `[]`).
**AND** after the hydration effect runs (`setState(loadedAppState)` + `setMounted(true)`), the state holds `b1`; only a **subsequent** mutating dispatch — never the hydration itself or the first render — triggers the first `saveState`.
Proves: plan.md § Hydration design step 4 + § Risks R2 (the `if (!mounted) return` guard prevents the empty-default save effect from clobbering a real persisted value before hydration completes) — covers SPEC AC #4, AC #5 (R2 ordering guarantee).

#### C-m8-004

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` containing a valid `dharma:v1` with block `b1` (holding a nested `kind: "units"` brick `n1` with `done: 40`), category `c1`, and loose `kind: "tick"` brick `t1` with `done: true`
**WHEN** `usePersistedState()` is rendered and effects flush
**THEN** after mount the hook's `state` deep-equals the persisted state — `state.blocks[0].id === "b1"`, the nested brick `n1.done === 40` (exact), `state.categories[0].id === "c1"`, `state.looseBricks[0].done === true` (exact), and `state.programStart` equals the persisted `programStart`; `schemaVersion` is **not** present on `state` (stripped at the boundary — `"schemaVersion" in state === false`).
Proves: plan.md § Hydration design pass-two + § Data model / SG-m8-04 (post-mount rehydration restores exact persisted blocks/categories/loose bricks; `schemaVersion` projected away) — covers SPEC AC #5, AC #7.

#### C-m8-005

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness, mounted and hydrated (mocked `localStorage`, `saveState` spied)
**WHEN** each of the five mutating actions is dispatched in turn — `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`
**THEN** after each dispatch `localStorage["dharma:v1"]` `JSON.parse`s to the **post-dispatch** state — e.g. after `ADD_BLOCK` the persisted `blocks` array contains the new block; after `LOG_TICK_BRICK` the persisted brick's `done` reflects the flip; the save effect fired exactly once per mutating dispatch (the `[mounted, state]`-deps effect — no per-handler wiring).
Proves: plan.md § Hydration design step 4 + SG-m8-01 (save-on-every-mutating-dispatch; all five actions covered by the single deps effect) — covers SPEC AC #6.

#### C-m8-006

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness, mounted and hydrated, with a units brick `u1` at `done: 5`
**WHEN** the full mutate→reload cycle is simulated: dispatch `SET_UNITS_DONE { brickId: "u1", done: 22 }`, then **unmount** the harness and **re-render a fresh** `usePersistedState()` against the same mocked `localStorage`
**THEN** the freshly-mounted hook, after its hydration effect flushes, holds `u1` with `done === 22` (the exact pre-reload value) — the day survived the reload; every block, category, and loose-brick id and every brick `done` value matches the pre-reload `AppState`.
Proves: plan.md § Hydration design (full save→reload→rehydrate round-trip through the hook) — covers SPEC AC #7.

#### C-m8-007

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a mocked `localStorage` whose `dharma:v1` carries `programStart: "2026-05-01"`, and the system "today" known to be `"2026-05-15"`
**WHEN** the component mounts, effects flush, and the Hero top bar is queried
**THEN** the Hero renders `Building 15 of <daysInYear>` — the day number is `dayNumber("2026-05-01", "2026-05-15") === 15`, computed `programStart`-relative, **not** `dayOfYear(new Date())`; `totalDays` is still `daysInYear(...)` (one-year arc unchanged); the `<Hero>` prop signature (`dayNumber?: number`, `totalDays: number`) is unchanged.
**AND** on a first run (no `dharma:v1`, `programStart` stamped to today) the Hero renders `Building 1 of <daysInYear>`.
Proves: plan.md § Day-number design (AC #13 full swap — `BuildingClient` feeds `dayNumber(state.programStart, todayIso)` to `<Hero>`; no prop-signature change) — covers SPEC AC #13, AC #14 (Hero prop-signature-unchanged anchor).

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent (this realizes the AC #15 "clears `localStorage` between cases" requirement). Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only.

#### E-m8-001

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/`
**WHEN** the page renders and the building view is inspected (under `count() > 0` guard)
**THEN** the app shows the empty-state default — no console hydration-mismatch warning is emitted; the Hero day number reads `Building 1 of <N>`; `localStorage["dharma:v1"]`, once first-run save fires, is valid JSON with `schemaVersion: 1` and empty `blocks`/`categories`/`looseBricks`.
Proves: plan.md § Test surface preview E2E (first-run-empty; no hydration-mismatch) — covers SPEC AC #4, AC #15 (first-run-empty case).

#### E-m8-002

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared, the app at `/`
**WHEN** the user adds a block and a brick, ticks the brick (or types a units value), then **reloads the page** (`page.reload()`)
**THEN** after the reload the same block, brick, and the brick's exact `done` state are still present on the timeline / tray (under `count() > 0` guard) — the day survived the reload; `localStorage["dharma:v1"]` holds the post-mutation state.
Proves: plan.md § Test surface preview E2E (mutate-then-reload-persists, including brick `done`) — covers SPEC AC #6, AC #7, AC #15 (mutate-then-reload case).

#### E-m8-003

Target file: `tests/e2e/m8.spec.ts`
**GIVEN** a browser with `localStorage` cleared, then `dharma:v1` set to the corrupt string `"{not json"` via `page.evaluate`
**WHEN** the app is loaded fresh at `/`
**THEN** the app renders normally — no uncaught exception, no crash, no error overlay; the building view shows the empty-state default (under `count() > 0` guard); a subsequent mutation followed by reload persists correctly (the corrupt key was overwritten by the next `saveState`).
Proves: plan.md § Test surface preview E2E + § Edge cases (corrupt-key-recovers without crash; passive overwrite-on-next-save) — covers SPEC AC #8, AC #11, AC #15 (corrupt-key case).

### Accessibility (axe via Playwright) — deferred to preview

#### A-m8-001

Target file: `tests/e2e/m8.a11y.spec.ts`
**GIVEN** the app at `/` after a fresh load (`localStorage` cleared) and again after a hydration cycle from a pre-seeded `dharma:v1` with one block + one brick (under `count() > 0` guard)
**WHEN** axe-core runs against the document in both states (`AxeBuilder({ page }).analyze()`)
**THEN** zero violations are reported in both states across every rule category enabled in the project's axe config (color-contrast, name-role-value, focus-visible, landmark) — M8 adds no DOM surface, so the building page's a11y posture is unchanged before and after hydration.
Proves: plan.md § Test surface preview Accessibility (axe smoke — no a11y regression; M8 is zero-UI-surface) — covers SPEC AC #14 (a11y portion of the no-regression guarantee).

### Sandbox / preview note

Per the established M4a–M4g pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `E-m8-*` and 1 `A-m8-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m4*.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md`. M8 does NOT introduce a deterministic seeding helper (out of scope per ADR-022). The 4 deferred-to-preview IDs (3 E + 1 A) are net-additive; M8 retires no E2E/a11y ID.

### Retired test IDs

**None — no existing test is retired or amended.** M8 deletes no test file and no test.

- **`U-bld-024` survives unchanged.** `U-bld-024` (`lib/dharma.test.ts:266-272`) covers the `lib/dharma.ts:dayNumber()` helper's math (`number | undefined` return, `null`/`""`/`undefined` → `undefined`, no clamp). M8 wires this **pre-existing** helper into `BuildingClient` without changing its signature or behavior — `lib/dharma.ts` is byte-identical post-M8 (plan.md § Day-number design, § Modified files `lib/dharma.ts` row, § Risks R5). Therefore `U-bld-024` is **not** retired, **not** amended, and stays green untouched. AC #13 verification lives at the wiring layer (`C-m8-007`), not by re-testing the helper.
- **`dayOfYear()` and its tests survive unchanged.** `dayOfYear()` and `lib/dayOfYear.test.ts` are explicitly **kept** (plan.md § File structure — `dayOfYear` stays with its tests; only `BuildingClient`'s import line drops `dayOfYear`, and `daysInYear` is retained).

Every existing `U-/C-/E-/A-` ID across all milestones — including `U-bld-024` — remains live and green. M8 is purely additive: 22 new `m8` IDs, zero retirements.

**Draft-only note (not a retirement):** the pre-VERIFIER draft of this entry contained `U-m8-012`/`U-m8-013`, which re-tested the `dayNumber()` helper math against a _wrong_ signature (`(programStart: string, today: string): number`, clamped `>= 1`) that contradicted the locked `U-bld-024` contract. Both were removed during VERIFIER FAIL retry 1 — they were never shipped IDs, so this is a draft correction, not a retirement of a live test. The `U-m8-` series now ends at `011`.

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                   | Test ID(s)                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| #1  | `lib/persist.ts` exports `loadState`/`saveState`/`PersistedState`/storage-key `"dharma:v1"`          | `U-m8-001`                                                                                             |
| #2  | `saveState` writes `dharma:v1` in the ADR-044 shape `{ schemaVersion:1, programStart, blocks, ... }` | `U-m8-002`, `U-m8-003`                                                                                 |
| #3  | `loadState` parses & returns persisted state; no-key → empty default, `programStart` = today         | `U-m8-002`, `U-m8-004`, `U-m8-011`                                                                     |
| #4  | SSR + first client paint = empty default; no hydration-mismatch warning                              | `C-m8-002`, `C-m8-003`, `E-m8-001`                                                                     |
| #5  | After mount, app rehydrates from `dharma:v1`; persisted blocks/categories/loose bricks render        | `C-m8-003`, `C-m8-004`                                                                                 |
| #6  | Every mutating action leaves `dharma:v1` updated to post-dispatch state                              | `C-m8-005`, `E-m8-002`                                                                                 |
| #7  | After reload the exact pre-reload `AppState` is restored (every `done` value exact)                  | `U-m8-002`, `C-m8-004`, `C-m8-006`, `E-m8-002`                                                         |
| #8  | Malformed JSON → empty default; no exception escapes                                                 | `U-m8-005`, `E-m8-003`                                                                                 |
| #9  | Unknown/future `schemaVersion` → empty default; no exception escapes                                 | `U-m8-006`, `U-m8-009`                                                                                 |
| #10 | Partial persisted object → missing collections filled with `[]`                                      | `U-m8-007`                                                                                             |
| #11 | `localStorage` getItem/setItem throwing → default returned / error swallowed; no crash               | `U-m8-008`, `E-m8-003`                                                                                 |
| #12 | First run stamps `programStart` = today; subsequent loads preserve it unchanged                      | `U-m8-004`, `U-m8-010`                                                                                 |
| #13 | Top-bar day number computed `programStart`-relative (`programStart` = day 1), replacing `dayOfYear`  | `C-m8-007` (wiring) + `U-bld-024` (pre-existing, proves the `dayNumber()` helper math AC #13 wires to) |
| #14 | No UI/component/interaction change; every M1–M4g Vitest/component test passes unmodified             | **gate (`npm run eval`)** + anchors `C-m8-001`, `C-m8-007`, `A-m8-001`                                 |
| #15 | Quality gates: `tsc --noEmit` clean; ESLint 0 err / ≤13 warn; full Vitest green; E2E clears storage  | **gate (`npm run eval`)** + E2E `beforeEach` realizes the clear-per-case requirement (`E-m8-001..003`) |

**Gate-verified ACs:** #14 and #15 — consistent with how M4f/M4g mapped purely-structural / quality-gate ACs to `npm run eval`. All other 13 ACs map to at least one concrete test ID. AC #13's day-number-helper math is proven by the pre-existing `U-bld-024`; its M8-specific wiring is proven by `C-m8-007`. No AC is unmapped; every `m8` test ID maps back to at least one AC.

### Spec gaps surfaced for VERIFIER

**None unresolved.** All five SG-m8 gaps (SG-m8-01 save cadence, SG-m8-02 hook vs inline effect, SG-m8-03 day-number swap scope, SG-m8-04 `programStart`/`schemaVersion` placement, SG-m8-05 corrupt-key disposition) are **resolved in plan.md** and reflected in the IDs above (synchronous save → `C-m8-005`; `usePersistedState()` hook → all `C-m8-*`; AC #13 wiring-only swap → `C-m8-007`, with the pre-existing `dayNumber()` helper math already covered by `U-bld-024`; `programStart` on `AppState` / `schemaVersion` boundary-only → `U-m8-003` + `C-m8-004`; passive overwrite → `U-m8-005` + `E-m8-003`). No ADR is reversed: ADR-044 (persisted schema) and ADR-018 (transport — single `dharma:v1` key, two-pass load) are both honored. One non-blocking item for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **Two gate-verified ACs.** AC #14 (no regression) and AC #15 (quality gates) are mapped to the `npm run eval` gate rather than bespoke `it()` blocks, because M8 changes no UI surface — a "nothing changed" test would be vacuous. VERIFIER's call: confirm this is acceptable spec-coverage, consistent with the M4f (#39/#40/#41 → `gate (npm run eval)`) and M4g precedents. Runtime anchors (`C-m8-001` for the `Action`-lock, `C-m8-007` for the `<Hero>` prop-signature, `A-m8-001` for a11y) are provided so the gate is not the _only_ evidence for the schema-lock and zero-UI-delta portions. No escalation expected.

All 15 M8 ACs map to at least one test ID (bespoke `m8` ID, the pre-existing `U-bld-024`, or the `npm run eval` gate). M8 adds 22 `m8` test IDs (11 U + 7 C + 3 E + 1 A) and retires none.
