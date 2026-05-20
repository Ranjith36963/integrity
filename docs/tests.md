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

## Milestone 9a — appliesOn recurrence resolver — Tests

This entry covers M9a — the single pure resolver `appliesOn(recurrence: Recurrence, date: string): boolean` in the new file `lib/appliesOn.ts`. It is derived from the `plan.md` M9a entry (`## Milestone 9a — appliesOn recurrence resolver — Plan`). Feature slug: `m9a`. ID prefix: `U-m9a-` only.

**No `C-`/`E-`/`A-` IDs.** M9a adds no UI, no React component, no hook (plan.md § Components: "None"; SPEC AC #11: "M9a adds no UI, so no e2e/a11y specs"). Every M9a test is a Vitest unit test against the pure function. The series is `U-m9a-001 … U-m9a-016`.

### Testing approach — what is bespoke vs gate-verified

M9a is a single small pure function with a large, behavior-rich assertion surface (four `kind` branches, inclusive range bounds, empty-weekday guard, timezone safety, purity), so this entry authors real GIVEN/WHEN/THEN `it()` blocks for every branch and edge case. Two ACs are honestly gate-verified rather than bespoke unit-tested, consistent with how M8 mapped its purely-structural / quality-gate ACs to `npm run eval`:

- **AC #10 (additive-only — `lib/types.ts` and `lib/dharma.ts` byte-identical post-M9a)** → bespoke import-surface guard `U-m9a-014` PLUS the `npm run eval` gate. The repo has an established import-surface guard pattern (`*.imports.test.ts`, e.g. `app/(building)/BuildingClient.imports.test.ts` referenced by `C-m1-022`). `U-m9a-014` realizes AC #10 as a checkable assertion in that pattern: `lib/appliesOn.ts` imports `Recurrence` as a **type-only** import from `@/lib/types` and imports nothing else from `lib/` (no `lib/dharma.ts` import; no value import). The byte-identity of `lib/types.ts` / `lib/dharma.ts` themselves is enforced by the EVALUATOR gate (git diff scoped to the two files must be empty) — stated below as a gate check, not a unit assertion, since a test file cannot prove a sibling file is unedited.
- **AC #11 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest suite green)** → gate-verified by `npm run eval` (lint + typecheck + vitest). No bespoke unit test; M9a adds no UI so there is no e2e/a11y leg.

All other 9 ACs (#1–#9) map to at least one concrete bespoke `U-m9a-*` ID below.

### Mutation-resistance notes (read before reviewing the IDs)

These tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`every-weekday` is tested at every boundary** — `U-m9a-004`/`U-m9a-005` assert `true` for Mon (1), Wed (3), Fri (5) AND `false` for **both** Sat (6) and Sun (0). A mutant using `wd >= 1 && wd < 5` (drops Fri) fails `U-m9a-004`; a mutant using `wd >= 0` or `wd <= 6` (admits a weekend day) fails `U-m9a-005`.
- **`custom-range` bounds are tested as strictly-inclusive** — `U-m9a-008` asserts `true` at `date === start` and at `date === end`; `U-m9a-009` asserts `false` one day before `start` and one day after `end` while holding the weekday IN the set, so only the range check can be the cause of the `false`. A mutant using `>` / `<` (exclusive) fails `U-m9a-008`; a mutant that ignores the bound fails `U-m9a-009`.
- **The empty-weekdays guard is tested across multiple dates** — `U-m9a-010` asserts `false` for several in-range dates of differing weekdays when `weekdays: []`. A mutant that treats `[]` as "all weekdays" (e.g. `weekdays.length === 0 || weekdays.includes(wd)`) fails it.
- **Timezone safety is tested by forcing the runtime TZ** — `U-m9a-011`/`U-m9a-012` run the SAME ISO date through `appliesOn` under a negative-offset zone and a positive-offset zone and assert identical verdicts. A mutant that derives the weekday via `new Date("YYYY-MM-DD")` (UTC-parsed) returns a drifted weekday in the negative-offset zone and fails `U-m9a-011`.
- **Purity is tested by mutation- and clock-probing** — `U-m9a-013` deep-freezes the input `recurrence`, calls `appliesOn` repeatedly, and asserts the object is unchanged and every call returns the identical value; it also advances a faked clock between calls and asserts the result does not move. A mutant that reads `Date.now()` / `new Date()` (no args) or mutates an input fails it.

### Test ID layout

| Layer         | IDs              | Count  |
| ------------- | ---------------- | ------ |
| Unit (Vitest) | `U-m9a-001..016` | 16     |
| **Total**     |                  | **16** |

No Component, E2E, or Accessibility IDs — M9a has no UI surface (plan.md § Components / § Design tokens: "None"; SPEC AC #11).

### Unit (Vitest)

All `U-m9a-*` IDs target the new co-located suite **`lib/appliesOn.test.ts`** (repo convention `lib/<name>.test.ts`, matching `lib/timeOffset.test.ts` / `lib/dayOfYear.test.ts`). No `localStorage`, no DOM, no React render. Fixture dates with verified weekdays (JS `getDay()`, `0=Sun … 6=Sat`): `2026-05-17` Sun (0), `2026-05-18` Mon (1), `2026-05-19` Tue (2), `2026-05-20` Wed (3), `2026-05-21` Thu (4), `2026-05-22` Fri (5), `2026-05-23` Sat (6); `2025-12-31` Wed (3), `2026-01-01` Thu (4); `2026-12-25` Fri (5), `2026-12-28` Mon (1); `2024-02-28` Wed (3), `2024-02-29` Thu (4), `2024-03-01` Fri (5); `2030-01-15` Tue (2).

#### U-m9a-001 — success (signature / contract)

Target file: `lib/appliesOn.test.ts` (NEW)
**GIVEN** the `lib/appliesOn.ts` module
**WHEN** its exports are inspected and `appliesOn` is invoked
**THEN** `appliesOn` is `typeof === "function"` and is the module's only public export; calling `appliesOn({ kind: "every-day" }, "2026-05-17")` returns a value whose `typeof === "boolean"`; the function accepts a `Recurrence` value as the first argument and an ISO `YYYY-MM-DD` string as the second (compile-time `tsc` gate — a call with a `Recurrence`-typed literal and a `string` type-checks; a call returning `boolean` assigns to a `boolean` without a cast).
**AND** the input `date` is consumed as an ISO `YYYY-MM-DD` string — no `Date` object is accepted in its place (type signature is `(recurrence: Recurrence, date: string) => boolean`).
Proves: plan.md § The function contract (signature; `Recurrence` in, ISO string in, `boolean` out; single public export) — covers SPEC AC #1.

#### U-m9a-002 — success (`just-today`, same date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "just-today", date: "2026-05-17" }`
**WHEN** `appliesOn(recurrence, "2026-05-17")` is called (target date equals `recurrence.date`)
**THEN** the return value is exactly `true`.
Proves: plan.md § The function contract `just-today` arm (`recurrence.date === date` → `true`) — covers SPEC AC #2.

#### U-m9a-003 — failure (`just-today`, different date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "just-today", date: "2026-05-17" }`
**WHEN** `appliesOn(recurrence, "2026-05-18")` is called (a different, adjacent date) and again with `appliesOn(recurrence, "2026-05-16")`
**THEN** the return value is exactly `false` for both — any date not string-equal to `recurrence.date` yields `false`.
Proves: plan.md § The function contract `just-today` arm (different date → `false`) — covers SPEC AC #2.

#### U-m9a-004 — success (`every-day`, multiple dates incl. weekend)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-day" }`
**WHEN** `appliesOn` is called with `"2026-05-18"` (Monday), `"2026-05-23"` (Saturday), and `"2026-05-17"` (Sunday)
**THEN** every call returns exactly `true` — `every-day` applies unconditionally, including on weekend dates.
Proves: plan.md § The function contract `every-day` arm (`return true` unconditionally) — covers SPEC AC #3.

#### U-m9a-005 — success (`every-weekday`, Mon–Fri all `true`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-weekday" }`
**WHEN** `appliesOn` is called with each of `"2026-05-18"` (Mon), `"2026-05-19"` (Tue), `"2026-05-20"` (Wed), `"2026-05-21"` (Thu), `"2026-05-22"` (Fri)
**THEN** every one of the five calls returns exactly `true` — each weekday Mon–Fri (`getDay()` 1–5) applies.
Proves: plan.md § The function contract `every-weekday` arm + § Edge cases (`wd >= 1 && wd <= 5`) — covers SPEC AC #4.

#### U-m9a-006 — failure (`every-weekday`, Sat AND Sun both `false`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-weekday" }`
**WHEN** `appliesOn(recurrence, "2026-05-23")` (Saturday, `getDay()` 6) is called AND `appliesOn(recurrence, "2026-05-17")` (Sunday, `getDay()` 0) is called
**THEN** both return exactly `false` — Saturday (6) and Sunday (0) are both excluded.
Proves: plan.md § The function contract `every-weekday` arm + § Edge cases (Sat/Sun → `false`; both weekend ends excluded) — covers SPEC AC #4.

#### U-m9a-007 — success (`custom-range`, in range with matching weekday)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 3, 5] }` (Mon/Wed/Fri selected)
**WHEN** `appliesOn(recurrence, "2026-05-20")` is called — `2026-05-20` is Wednesday (`getDay()` 3), strictly inside `[start, end]`, and `3 ∈ weekdays`
**THEN** the return value is exactly `true` — all three checks (non-empty weekdays, range bound, weekday membership) pass.
Proves: plan.md § The function contract `custom-range` arm + § Edge cases (in `[start,end]` with matching weekday → `true`) — covers SPEC AC #5.

#### U-m9a-008 — success / edge (`custom-range`, inclusive bounds at `start` and `end`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 2, 3, 4, 5] }` (Mon–Fri selected — `start` is Mon, `end` is Fri, both weekdays are in the set so only the bound is under test)
**WHEN** `appliesOn(recurrence, "2026-05-18")` (date == `start`) is called AND `appliesOn(recurrence, "2026-05-22")` (date == `end`) is called
**THEN** both return exactly `true` — the range bound is **inclusive on both ends** (`>=` / `<=`, not `>` / `<`).
Proves: plan.md § The function contract `custom-range` evaluation order step 2 + § Edge cases (date == `start` or `end` → inclusive) — covers SPEC AC #5, AC #6.

#### U-m9a-009 — failure (`custom-range`, strictly outside range, weekday IN set)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 2, 3, 4, 5] }` (Mon–Fri — chosen so the weekday of each probe date IS in the set, isolating the range check as the sole cause of any `false`)
**WHEN** `appliesOn(recurrence, "2026-05-15")` (Friday — one weekday before `start`, weekday 5 ∈ set) is called AND `appliesOn(recurrence, "2026-05-25")` (Monday — one weekday after `end`, weekday 1 ∈ set) is called
**THEN** both return exactly `false` — a date strictly before `start` or strictly after `end` yields `false` regardless of weekday membership.
Proves: plan.md § The function contract `custom-range` evaluation order step 2 + § Edge cases (date strictly before `start` / after `end` → `false`, regardless of weekday) — covers SPEC AC #6.

#### U-m9a-010 — failure (`custom-range`, empty `weekdays` → `false` for every date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [] }` (empty weekday array)
**WHEN** `appliesOn` is called with `"2026-05-18"` (Mon, in range), `"2026-05-20"` (Wed, in range), `"2026-05-22"` (Fri, in range), and `"2026-05-19"` (Tue, in range) — four in-range dates of differing weekdays
**THEN** every call returns exactly `false` — an empty `weekdays` array means no weekday is selected, so the recurrence applies to nothing; the empty-weekdays guard short-circuits before the range/weekday checks.
Proves: plan.md § The function contract `custom-range` evaluation order step 1 (empty-`weekdays` guard) + § Edge cases — covers SPEC AC #7.

#### U-m9a-011 — success / edge (timezone safety, negative-offset zone)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the runtime timezone is forced to a **negative-UTC-offset** zone — `America/Los_Angeles` (UTC−7/−8) — by running the suite (or this block) under `TZ=America/Los_Angeles` (Vitest reads `process.env.TZ` at process start; the suite documents this via a dedicated `TZ`-pinned Vitest project / test script, or equivalently the test uses a fake-timezone shim such as a `vi`-mocked `Date.prototype.getTimezoneOffset` + locale — the BUILDER picks whichever the repo's Vitest config supports, but the assertion below is invariant to the technique)
**WHEN** `appliesOn({ kind: "every-weekday" }, "2026-05-17")` is called (`2026-05-17` is a Sunday) AND `appliesOn({ kind: "every-weekday" }, "2026-05-18")` is called (`2026-05-18` is a Monday) under the negative-offset zone
**THEN** the Sunday call returns exactly `false` and the Monday call returns exactly `true` — the **same** verdicts the resolver gives in UTC. The naive `new Date("2026-05-17")` (UTC-midnight parse) would land on Saturday `2026-05-16` local in a negative-offset zone and mis-return; the resolver must use the local-calendar `parseLocalDate` so the weekday is correct.
**AND** `appliesOn` is called for a `custom-range` weekday-membership case under the same zone — `{ kind: "custom-range", start: "2026-05-17", end: "2026-05-23", weekdays: [0] }` with date `"2026-05-17"` returns `true` (Sunday, weekday 0, in range) — confirming the weekday-membership step is also drift-free.
Proves: plan.md § Weekday derivation SG-m9a-02 (`parseLocalDate` multi-arg local-time constructor; never `new Date(isoString)`) + § Edge cases (timezone safety) — covers SPEC AC #8.

#### U-m9a-012 — success / edge (timezone safety, positive-offset zone — identical verdict)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the runtime timezone is forced to a **positive-UTC-offset** zone — `Asia/Tokyo` (UTC+9) — by the same `TZ`-pinning / fake-timezone technique used in `U-m9a-011`
**WHEN** the **identical** calls from `U-m9a-011` are repeated under `Asia/Tokyo` — `appliesOn({ kind: "every-weekday" }, "2026-05-17")`, `appliesOn({ kind: "every-weekday" }, "2026-05-18")`, and the `custom-range` weekday-membership case with date `"2026-05-17"`
**THEN** the verdicts are **identical to the negative-offset run** — Sunday `2026-05-17` → `false`, Monday `2026-05-18` → `true`, the `custom-range` Sunday case → `true`. The same fixed ISO date yields the same boolean in a positive-offset zone, a negative-offset zone, and UTC: `appliesOn` is timezone-invariant.
**AND** the test asserts the cross-zone equality explicitly — the negative-offset result array and the positive-offset result array are deep-equal.
Proves: plan.md § Weekday derivation SG-m9a-02 + § Edge cases (timezone safety — same ISO date → same verdict in any timezone) — covers SPEC AC #8.

#### U-m9a-013 — success (purity — no mutation, no clock, deterministic)

Target file: `lib/appliesOn.test.ts`
**GIVEN** a deep-frozen recurrence `Object.freeze({ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: Object.freeze([1, 3, 5]) })` and a fixed target date `"2026-05-20"`
**WHEN** `appliesOn(recurrence, "2026-05-20")` is called three times in a row, then the system clock is advanced via `vi.useFakeTimers()` / `vi.setSystemTime(...)` to a different instant and `appliesOn(recurrence, "2026-05-20")` is called again
**THEN** all four calls return the **identical** boolean (`true`), proving identical inputs → identical output and that the result does not depend on "now"; AND no call throws (a write to a frozen object would throw in strict mode — TS modules are strict — so a passing run proves `recurrence` and `recurrence.weekdays` were not mutated); AND `recurrence` deep-equals its pre-call value after all four calls.
**AND** the test asserts (by inspection / a source-grep guard, or by the no-throw-on-frozen-input evidence) that `appliesOn` reads no clock — no zero-arg `new Date()` and no `Date.now()`; the multi-arg `new Date(y, m-1, d)` inside `parseLocalDate` is permitted (fixed-argument constructor, deterministic, not a clock read — plan.md SG-m9a-02 explicitly sanctions it).
Proves: plan.md § The function contract (never mutates inputs) + § Weekday derivation SG-m9a-02 (multi-arg `Date` is pure; zero-arg clock form is banned) — covers SPEC AC #9.

#### U-m9a-014 — success (additive-only — import-surface guard)

Target file: `lib/appliesOn.test.ts` (or a co-located `lib/appliesOn.imports.test.ts`, matching the `*.imports.test.ts` pattern used by `C-m1-022` / `app/(building)/BuildingClient.imports.test.ts`)
**GIVEN** the source text / import surface of `lib/appliesOn.ts`
**WHEN** its imports are inspected (string-grep regression test or the TypeScript program API)
**THEN** `lib/appliesOn.ts` imports **only** the `Recurrence` symbol from `@/lib/types`, and that import is **type-only** (`import type { Recurrence } from "@/lib/types"`); there is **no** import from `@/lib/dharma` (or `./dharma`), **no** value import from `lib/`, no `localStorage` reference, and no React import — consistent with the plan's "Pure module: no imports beyond the `Recurrence` type."
**AND** `lib/appliesOn.ts` neither re-exports nor re-declares any member of the `Recurrence` union — it consumes the type, never reshapes it.
Proves: plan.md § File structure ("Modified files: NONE", strictly additive) + § The function contract (only import is the `Recurrence` type) — covers SPEC AC #10 (the testable import-surface portion; whole-file byte-identity of `lib/types.ts` / `lib/dharma.ts` is the EVALUATOR gate check below).

#### U-m9a-015 — success / edge (`custom-range` crossing a year boundary, Dec→Jan)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2025-12-29", end: "2026-01-02", weekdays: [3, 4] }` (a range spanning the 2025→2026 year boundary; Wed/Thu selected)
**WHEN** `appliesOn(recurrence, "2025-12-31")` (Wednesday, weekday 3, in range) is called AND `appliesOn(recurrence, "2026-01-01")` (Thursday, weekday 4, in range) is called AND `appliesOn(recurrence, "2026-01-03")` (Saturday, just after `end`) is called
**THEN** `2025-12-31` → `true`, `2026-01-01` → `true` (the range bound resolves correctly across the year boundary because ISO `YYYY-MM-DD` strings order lexicographically == chronologically), and `2026-01-03` → `false` (past `end`).
Proves: plan.md § The function contract `custom-range` step 2 (lexicographic ISO comparison) + § Edge cases (year boundary Dec→Jan) — covers SPEC AC #5, AC #6 (year-boundary edge).

#### U-m9a-016 — success / edge (`custom-range` covering Feb 29 in a leap year)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2024-02-28", end: "2024-03-01", weekdays: [3, 4, 5] }` (a range covering the leap-day `2024-02-29`; Wed/Thu/Fri selected)
**WHEN** `appliesOn(recurrence, "2024-02-29")` is called — `2024-02-29` is a Thursday (`getDay()` 4), inside the range, and `4 ∈ weekdays`
**THEN** the return value is exactly `true` — `parseLocalDate("2024-02-29")` builds the leap day natively (`new Date(2024, 1, 29)` is a valid local date) and derives weekday 4 correctly.
**AND** `appliesOn(recurrence, "2024-02-28")` (Wed, weekday 3, in range) → `true` and `appliesOn(recurrence, "2024-03-01")` (Fri, weekday 5, in range) → `true`, confirming the leap day does not disturb the adjacent dates.
Proves: plan.md § Weekday derivation SG-m9a-02 (`parseLocalDate` handles Feb 29 natively) + § Edge cases (leap-day coverage) — covers SPEC AC #5 (leap-boundary edge).

> **Note on the "just-today on a far-off date" edge case.** The plan's Edge-case table lists `just-today` returning `false` on a non-matching date. `U-m9a-003` already exercises non-matching dates adjacent to `recurrence.date`; the "far-off date" variant is the same code path (`recurrence.date === date` string equality has no distance sensitivity). To make the far-off case explicit and audit-visible, `U-m9a-003`'s assertion set should additionally cover one distant date — `appliesOn({ kind: "just-today", date: "2026-05-17" }, "2030-01-15")` → `false`. This is folded into `U-m9a-003` rather than given a separate ID because it adds no new branch; VERIFIER may request a standalone ID if it prefers strict one-edge-one-ID granularity (see § Spec gaps).

### Gate-verified ACs

- **AC #10 — additive-only (whole-file byte-identity).** `U-m9a-014` proves the testable import-surface portion (only a type-only `Recurrence` import; no `lib/dharma` import). The remaining guarantee — that `lib/types.ts` and `lib/dharma.ts` are **byte-identical** before and after M9a — is an **EVALUATOR gate check**, expressed as a checkable GIVEN/WHEN/THEN for the BUILDER/EVALUATOR to confirm:
  **GIVEN** the M9a BUILDER diff
  **WHEN** `git diff` is scoped to `lib/types.ts` and `lib/dharma.ts` (`git diff <m9a-base>..HEAD -- lib/types.ts lib/dharma.ts`)
  **THEN** the diff is **empty** — M9a adds the new file `lib/appliesOn.ts` (+ its test) and edits no other source file. A non-empty diff on either file is an AC #10 violation and an EVALUATOR FAIL.
- **AC #11 — quality gates.** Gate-verified by `npm run eval`: `tsc --noEmit` clean (0 errors), ESLint 0 errors (≤13 warnings), full Vitest suite green (including all 16 `U-m9a-*` IDs). M9a adds no UI surface, so there is no e2e/a11y leg — consistent with SPEC AC #11 ("M9a adds no UI, so no e2e/a11y specs").

### Retired test IDs

**None.** M9a is purely additive: one new file (`lib/appliesOn.ts`) plus its new test suite (`lib/appliesOn.test.ts`). No existing test file is edited; no prior `U-/C-/E-/A-` ID is retired or amended. Every existing ID across all milestones stays live and green. M9a adds 16 new `U-m9a-` IDs and retires none.

### AC → test-ID coverage map (all 11 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                 | Test ID(s)                                                             |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| #1  | `lib/appliesOn.ts` exports `appliesOn(recurrence, date)`; ISO `YYYY-MM-DD` in, `boolean` out       | `U-m9a-001`                                                            |
| #2  | `just-today` → `true` iff `recurrence.date === date`, else `false`                                 | `U-m9a-002`, `U-m9a-003`                                               |
| #3  | `every-day` → `true` for every valid date (incl. weekend)                                          | `U-m9a-004`                                                            |
| #4  | `every-weekday` → `true` Mon–Fri, `false` Sat AND Sun                                              | `U-m9a-005`, `U-m9a-006`                                               |
| #5  | `custom-range` → `true` iff in `[start,end]` inclusive AND weekday ∈ `weekdays`                    | `U-m9a-007`, `U-m9a-008`, `U-m9a-015`, `U-m9a-016`                     |
| #6  | `custom-range` strictly before `start` / after `end` → `false`, regardless of weekday              | `U-m9a-008`, `U-m9a-009`, `U-m9a-015`                                  |
| #7  | `custom-range` with empty `weekdays` → `false` for every date                                      | `U-m9a-010`                                                            |
| #8  | Timezone safety — same ISO date → identical verdict in any runtime timezone (no UTC drift)         | `U-m9a-011`, `U-m9a-012`                                               |
| #9  | Purity — no clock, no `localStorage`, no input mutation; identical inputs → identical output       | `U-m9a-013`                                                            |
| #10 | Additive — `lib/types.ts` / `lib/dharma.ts` unchanged; resolver consumes the union, never edits it | `U-m9a-014` (import-surface) + **gate** (git-diff byte-identity check) |
| #11 | Quality gates — `tsc --noEmit` clean; ESLint 0 err / ≤13 warn; full Vitest green; no e2e/a11y      | **gate (`npm run eval`)**                                              |

**Edge-case coverage (plan.md § Edge-case table):** in-range matching weekday → `U-m9a-007`; inclusive bounds → `U-m9a-008`; strictly-outside range → `U-m9a-009`; in-range weekday-excluded → see § Spec gaps item 1 (currently folded into `U-m9a-009`'s isolation logic — flagged); empty `weekdays` → `U-m9a-010`; timezone safety → `U-m9a-011` + `U-m9a-012`; year boundary Dec→Jan → `U-m9a-015`; Feb 29 in range → `U-m9a-016`; `just-today` far-off date → folded into `U-m9a-003` (see note above § Gate-verified ACs).

**Gate-verified ACs:** #10 (partly — import-surface bespoke via `U-m9a-014`, whole-file byte-identity via the git-diff gate) and #11 (fully — `npm run eval`). All other 9 ACs (#1–#9) map to at least one bespoke `U-m9a-*` ID. Every `U-m9a-*` ID maps back to at least one AC. No AC is unmapped.

### Spec gaps surfaced for VERIFIER

The plan resolves both of its named spec gaps (SG-m9a-01 weekday convention `0=Sun…6=Sat`; SG-m9a-02 private `parseLocalDate` helper) in-plan, and the plan's § Open questions for VERIFIER says "None outstanding." Two non-blocking items the TESTS phase surfaces for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The plan's "in-range, weekday-excluded" edge case has no dedicated bespoke ID.** The plan's Edge-case table lists "`custom-range` date in range, weekday not in set → `false`" as a distinct row. This entry does NOT give it a standalone `U-m9a-*` ID — it is the logical complement of `U-m9a-007` (same recurrence, a date whose weekday is NOT in `[1,3,5]`, e.g. `2026-05-19` Tue / weekday 2 → `false`). It is also implicitly exercised by `U-m9a-009`'s isolation reasoning. **VERIFIER's call:** confirm whether folding it into `U-m9a-007`'s assertion set (adding one `false`-on-excluded-weekday assertion to that block) is acceptable, or whether it warrants a standalone `U-m9a-017`. The TESTS-phase recommendation is to add the assertion to `U-m9a-007` (no new branch is exercised); flagged here so the decision is explicit rather than silent.
2. **"`just-today` on a far-off date" is folded into `U-m9a-003`, not a standalone ID** (see the note after `U-m9a-016`). Same rationale — `recurrence.date === date` string equality is distance-insensitive, so a far-off date exercises no new branch. VERIFIER may request a standalone `U-m9a-017`/`-018` if it enforces strict one-edge-one-ID granularity; the recommendation is to keep it folded.

Neither item is a plan defect or an unresolved ambiguity — both are ID-granularity judgment calls within VERIFIER's "test ID hygiene" remit. No ADR is reversed: ADR-019 (the `Recurrence` union is an enum + optional payload, schema-locked) is honored — M9a consumes the union unchanged. M9a adds 16 `U-m9a-` test IDs (all Unit; no C/E/A) and retires none.

## Milestone 9b — Day rollover + history store — Tests

This entry covers M9b — schema v2 + day rollover + fresh-day seeding: the new pure `rollover(state: PersistedState, todayISO: string): PersistedState` in `lib/history.ts` (with the `ArchivedDay` type added to `lib/types.ts`), `lib/persist.ts` bumped to the ADR-045 v2 shape (`SCHEMA_VERSION = 2`, v2 `PersistedState`, `defaultPersisted()`, a `migrate()` with a `case 1` v1→v2 arm and a `case 2` v2 arm), and the `lib/usePersistedState.ts` hydration path running `rollover(loaded, today())` once on mount. It is derived from the `plan.md` M9b entry (`## Milestone 9b — Day rollover + history store — Plan`). Feature slug: `m9b`. ID prefixes: `U-m9b-`, `C-m9b-`, `E-m9b-` (no `A-` — M9b adds **zero UI surface**: no component, no screen, no DOM change, per plan.md § Components / § Design tokens — so there is no a11y leg, consistent with how M9a had no e2e/a11y leg).

### Testing approach — what is bespoke vs gate-verified

M9b has a **large genuine unit surface** (the `rollover` function is pure and branch-rich; `lib/persist.ts` load/save/migrate is pure) plus a focused component surface (the hydration effect ordering in `usePersistedState`). Real GIVEN/WHEN/THEN `it()` blocks are authored for all of it. Two ACs are honestly gate-verified rather than bespoke-tested, consistent with how M8 (#14/#15) and M9a (#10/#11) mapped no-regression / quality-gate ACs to `npm run eval`:

- **AC #14 (no regression — every M1–M8 + M9a Vitest/component test passes; the M9a `test:tz` suite passes)** → gate-verified by the **full Vitest suite + `test:tz` staying green** under `npm run eval`. M9b changes no UI surface and edits no prior test file, so a bespoke "nothing changed" test would be vacuous; the binding proof is that no prior test file is touched and every prior ID stays green. `C-m9b-005` provides a runtime anchor for the zero-new-`Action` schema-lock portion.
- **AC #15 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest green; E2E deferred-to-preview covers first-run / same-day / next-day)** → gate-verified by `npm run eval` (lint + typecheck + vitest + e2e + a11y). The three named E2E scenarios are authored as real `test()` blocks (`E-m9b-001..003`) per the M4/M8 deferred-to-preview pattern.

All other 13 ACs map to at least one concrete bespoke test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **The `rollover` no-op test (`U-m9b-010`) asserts reference identity** — `rollover(state, today)` returns the **same object reference** (`===`) when `currentDate >= todayISO`, not merely a deep-equal copy. A mutant that always rebuilds the object fails the `===` arm.
- **The archived-day immutability test (`U-m9b-014`) is mutation-resistant, not "history is non-empty"** — it deep-clones the archived snapshot, then **mutates the post-rollover in-progress day** (flips a brick `done`, pushes a block) and asserts `history[oldDate]` is **byte-identical** to the pre-mutation clone (`expect(after).toEqual(snapshotClone)`). A mutant that stores a shallow reference instead of a `structuredClone` fails it.
- **The purity test (`U-m9b-015`) asserts `rollover` reads no clock and mutates no input** — it freezes the input `state` (`Object.freeze` on the object and its `history`/`blocks`/`looseBricks`/`categories`) and asserts `rollover` does not throw, and that the input `state` object and arrays are referentially unchanged afterwards; it also asserts the verdict depends only on the `todayISO` argument (calling twice with the same args yields deep-equal results — no hidden `Date.now()` read).
- **The seeding tests assert exact field preservation AND exact reset** — `U-m9b-017`/`U-m9b-018` assert the seeded brick's `target`/`unit`/`start`/`end`/`recurrence`/`name`/`categoryId` are deep-equal to the source brick while `id` is a **fresh, different** uuid and `done` is reset (`false` for tick, `0` for units). A mutant that carries `done` forward, or one that keeps the stale `id`, fails.
- **The multi-day-skip test (`U-m9b-013`) asserts `Object.keys(history)` is exactly `[oldCurrentDate]`** — no intervening-date key — so a mutant that loops day-by-day fabricating empty `ArchivedDay`s fails.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9b-001..021` | 21     |
| Component / integration (Vitest+TL)   | `C-m9b-001..006` | 6      |
| E2E (Playwright, deferred-to-preview) | `E-m9b-001..003` | 3      |
| **Total**                             |                  | **30** |

No `A-m9b-*` IDs — M9b adds zero UI surface (plan.md § Components, § Design tokens). ID series start values were supplied by the orchestrator: `U-m9b-001`, `C-m9b-001`, `E-m9b-001`.

**Fixture dates (ISO, weekdays verified):** `2026-05-11` Mon · `2026-05-15` Fri · `2026-05-16` Sat · `2026-05-17` Sun · `2026-05-18` Mon (today) · `2026-05-19` Tue. Rollover fixtures set `state.currentDate` to a past date and assert the precise post-`rollover` shape.

### Unit (Vitest)

`U-m9b-001..009` exercise `lib/persist.ts` (v2 load / save / migrate) — all mock `localStorage` (a fresh in-memory stub on `globalThis.localStorage` in `beforeEach`, cleared in `afterEach`). `U-m9b-010..021` exercise the pure `rollover` in `lib/history.ts` and the fresh-day seeding — no `localStorage`, no clock (these call `rollover(state, todayISO)` directly with a literal `todayISO`).

#### U-m9b-001 — success

Target file: `lib/persist.test.ts`
**GIVEN** the `lib/persist.ts` module after the v2 bump
**WHEN** its exports are inspected
**THEN** `STORAGE_KEY` is the exact string `"dharma:v1"` (key unchanged); `SCHEMA_VERSION` is the number `2`; `loadState`, `saveState`, `defaultPersisted`, `migrate` are all `typeof === "function"`; the `PersistedState` type is exported and is the v2 shape (compile-time `tsc` gate — a `PersistedState`-typed literal `{ schemaVersion: 2, programStart: "2026-05-01", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` type-checks, and a v1-shaped literal omitting `currentDate`/`history` is a type error).
Proves: plan.md § `lib/persist.ts` API (v2 module surface; `SCHEMA_VERSION = 2`; v2 `PersistedState`) — covers SPEC AC #1.

#### U-m9b-002 — success

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` and a v2 `PersistedState` value with `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history: { "2026-05-17": { blocks: [{ id: "ab1" }], categories: [], looseBricks: [] } }`, one in-progress block `{ id: "b1" }` holding a nested `kind: "units"` brick `{ id: "n1", done: 25 }`, one category `{ id: "c1" }`, and one loose `kind: "tick"` brick `{ id: "t1", done: true }`
**WHEN** `saveState(state)` is called, then `loadState()` is called
**THEN** `loadState()` returns a value deep-equal to the saved state — `currentDate === "2026-05-18"`, `history["2026-05-17"].blocks[0].id === "ab1"`, the in-progress block id is `"b1"`, the nested units brick `done === 25` (exact integer), the loose tick brick `done === true` (exact boolean), `programStart === "2026-05-01"`.
**AND** the raw `localStorage.getItem("dharma:v1")` string `JSON.parse`s to an object whose top-level keys are exactly `schemaVersion`, `programStart`, `currentDate`, `history`, `blocks`, `categories`, `looseBricks` and whose `schemaVersion === 2` — the ADR-045 v2 shape, field-for-field, no extra key.
Proves: plan.md § `lib/persist.ts` API + § Data model (`saveState`/`loadState` round-trip the v2 shape) — covers SPEC AC #1.

#### U-m9b-003 — success / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (`getItem` returns `null` — first run) and the system clock known to today (`today()` → `"2026-05-18"`)
**WHEN** `loadState()` is called
**THEN** it returns a `PersistedState` deep-equal to `{ schemaVersion: 2, programStart: "2026-05-18", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` — `currentDate === programStart === today`, `history` is an empty object, all three collections are empty arrays.
**AND** no exception is thrown.
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` v2 default; `loadState` no-key path) + § Edge cases (first run) — covers SPEC AC #2.

#### U-m9b-004 — success / edge

Target file: `lib/persist.test.ts`
**GIVEN** the `defaultPersisted()` factory and the `today()` clock known to `"2026-05-18"`
**WHEN** `defaultPersisted()` is called twice
**THEN** each call returns a fresh v2 object — `schemaVersion === 2`, `currentDate === "2026-05-18"`, `programStart === "2026-05-18"`, `history` deep-equals `{}`, `blocks`/`categories`/`looseBricks` all `[]`; the two returned `blocks` arrays are **distinct references** and the two `history` objects are **distinct references** (no shared mutable default — `defaultPersisted().blocks !== defaultPersisted().blocks`, `defaultPersisted().history !== defaultPersisted().history`).
Proves: plan.md § `lib/persist.ts` API (`defaultPersisted()` v2 shape; fresh-object factory, no shared-reference footgun) — covers SPEC AC #2.

#### U-m9b-005 — success

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **v1** payload `{ schemaVersion: 1, programStart: "2026-03-10", blocks: [{ id: "b1" }], categories: [{ id: "c1" }], looseBricks: [{ id: "t1" }] }` (an M8 session — no `currentDate`, no `history`), `today()` known to `"2026-05-18"`
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` is v2 — `schemaVersion === 2`; `blocks` deep-equals `[{ id: "b1" }]`, `categories` deep-equals `[{ id: "c1" }]`, `looseBricks` deep-equals `[{ id: "t1" }]` (v1 collections preserved verbatim); `programStart === "2026-03-10"` (the v1 `programStart` preserved, **not** re-stamped); `currentDate === "2026-05-18"` (set to today — the v1 day's true date is unrecoverable, the accepted one-time migration approximation per ADR-045); `history` deep-equals `{}`.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 1` + § Migration (v1→v2: collections + `programStart` preserved, `currentDate`=today, `history`={}, `schemaVersion`=2) — covers SPEC AC #3.

#### U-m9b-006 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for `{ schemaVersion: 3, programStart: "2026-05-01", currentDate: "2026-05-18", history: {}, blocks: [], categories: [], looseBricks: [] }` (a forward / unknown version)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the return value is deep-equal to `defaultPersisted()` (empty v2 default) — `migrate` returned `null` for the unknown version and `loadState` fell back to the default.
**AND** the same holds for `schemaVersion: 4`, `schemaVersion: "2"` (non-numeric string), and a missing `schemaVersion` key — every non-`1`/non-`2` `schemaVersion` → `migrate` returns `null` → `loadState` → `defaultPersisted()`, no throw.
Proves: plan.md § `lib/persist.ts` API `migrate` `default:` arm (forward-incompatible / non-numeric `schemaVersion` → `null` → empty v2 default; never guessed at) — covers SPEC AC #4.

#### U-m9b-007 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is the malformed string `"{not valid json"` (un-parseable)
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()` — no exception escapes; AND the return value is deep-equal to `defaultPersisted()` (empty v2 default).
Proves: plan.md § `lib/persist.ts` API (`JSON.parse` throw → `defaultPersisted()`, no throw) + § Edge cases (corrupt JSON) — covers SPEC AC #5.

#### U-m9b-008 — failure / edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a v2 payload whose `history` is **not an object** — `{ schemaVersion: 2, programStart: "2026-05-01", currentDate: "2026-05-18", history: "oops", blocks: [], categories: [], looseBricks: [] }`
**WHEN** `loadState()` is called
**THEN** `expect(() => loadState()).not.toThrow()`; AND the returned `PersistedState` has `history` coerced to `{}` (deep-equal an empty object) while `currentDate`/`programStart`/collections pass through; the rest of the object is otherwise intact (`currentDate === "2026-05-18"`).
**AND** the same coercion holds when `history` is `null`, `42`, or an **array** `[]` (a non-null non-plain-object) — each → `history` coerced to `{}`, no throw.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 2` (`history` present but non-object → coerced to `{}`; no throw) + § Edge cases — covers SPEC AC #5.

#### U-m9b-009 — edge

Target file: `lib/persist.test.ts`
**GIVEN** a mocked `localStorage` whose `dharma:v1` value is valid JSON for a **partial** v2 object `{ schemaVersion: 2, history: {}, blocks: [{ id: "b1" }] }` — `programStart`, `currentDate`, `categories`, `looseBricks` absent — and `today()` known to `"2026-05-18"`
**WHEN** `loadState()` is called
**THEN** the returned `PersistedState` has `blocks` deep-equal `[{ id: "b1" }]` (present collection preserved), `categories === []` and `looseBricks === []` (absent collections filled with fresh empty arrays), and `programStart === "2026-05-18"` / `currentDate === "2026-05-18"` (absent / non-string string fields coerced to `today()` per the `case 2` defensive coercion).
**AND** when `blocks` is present but not an array (e.g. `blocks: "x"`) it is coerced to `[]` (`Array.isArray(...) ? value : []`), and when `currentDate` is present but not a string (e.g. `currentDate: 5`) it is coerced to `today()`.
Proves: plan.md § `lib/persist.ts` API `migrate` `case 2` (defensive coercion: non-array collections → `[]`, non-string `programStart`/`currentDate` → `today()`) — covers SPEC AC #1, AC #5.

#### U-m9b-010 — success / edge

Target file: `lib/history.test.ts` (NEW)
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-18"`, a non-empty `history`, and one in-progress block, and `todayISO = "2026-05-18"` (`currentDate === todayISO`)
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** it returns the **same object reference** — `rollover(state, "2026-05-18") === state` — no archive, no seeding; `state.history` is the same reference, byte-identical, untouched; `state.blocks`/`categories`/`looseBricks` unchanged.
**AND** for a `currentDate` strictly **after** `todayISO` (the should-not-occur future case — `currentDate: "2026-05-19"`, `todayISO: "2026-05-18"`) `rollover` likewise short-circuits to the same-reference no-op (DETECT uses `currentDate >= todayISO`).
Proves: plan.md § The rollover algorithm step 1 DETECT (`currentDate >= todayISO` → return state unchanged, same reference) + § Edge cases (`currentDate === today` → no rollover) — covers SPEC AC #6.

#### U-m9b-011 — success

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"` (Sun, yesterday), `history: {}`, an in-progress day of one block `{ id: "b1" }` (holding a nested `kind: "units"` brick `n1`, `done: 9`), one category `c1`, one loose `kind: "tick"` brick `t1` (`done: true`); `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the result's `history` has exactly the key `"2026-05-17"`, and `history["2026-05-17"]` is an `ArchivedDay` deep-equal to `{ blocks: [b1...], categories: [c1...], looseBricks: [t1...] }` — the in-progress day's three collections snapshotted under the **old** `currentDate` key (the units brick `done === 9` and the tick brick `done === true` are captured at their pre-rollover values).
Proves: plan.md § The rollover algorithm step 2 ARCHIVE (in-progress `{blocks,categories,looseBricks}` written into `history[currentDate]` as an `ArchivedDay`) + § Edge cases (`currentDate` === yesterday) — covers SPEC AC #7.

#### U-m9b-012 — success

Target file: `lib/history.test.ts`
**GIVEN** the same `state` as `U-m9b-011` (`currentDate: "2026-05-17"`), `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the result's `currentDate === "2026-05-18"` (advanced to today) and the result is a **new object** (`!== state`); `programStart` is carried forward unchanged; the result's `blocks`/`looseBricks` are the freshly-seeded day (per the seeding rule — see `U-m9b-016..020`), not the archived collections.
Proves: plan.md § The rollover algorithm step 3 SEED + step 4 ADVANCE (after archive: fresh day seeded, `currentDate` advanced to `todayISO`) — covers SPEC AC #8.

#### U-m9b-013 — edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-11"` (Mon — **7 days** before today), `history: { "2026-05-04": <some prior ArchivedDay> }`, a non-empty in-progress day; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** `Object.keys(result.history).sort()` is exactly `["2026-05-04", "2026-05-11"]` — the pre-existing `"2026-05-04"` entry is preserved unchanged, and **only** `state.currentDate` (`"2026-05-11"`) is newly archived; there is **no** `history` entry for any intervening date (`2026-05-12` … `2026-05-17`) — single-pass archive, no per-skipped-day loop, no fabricated empty days.
**AND** `result.currentDate === "2026-05-18"` (advanced straight to today, skipping the gap).
Proves: plan.md § The rollover algorithm (single-pass, no per-skipped-day loop) + § Edge cases (`currentDate` N>1 days before today) — covers SPEC AC #10.

#### U-m9b-014 — edge (mutation-resistant)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"`, an in-progress day of one block `{ id: "b1" }` holding a tick brick `t1` (`done: false`), `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called → `result`; then a **structural snapshot** of `result.history["2026-05-17"]` is captured via `structuredClone`; then the **post-rollover in-progress day is mutated** — `result.blocks[0].bricks[0].done = true`, `result.blocks.push({ id: "x", ... })`, `result.looseBricks.push(...)`
**THEN** `result.history["2026-05-17"]` is **byte-identical** to the pre-mutation snapshot (`expect(result.history["2026-05-17"]).toEqual(snapshotClone)`) — the archived day's brick `done` is still `false`, its `blocks` length unchanged; the archived `ArchivedDay` shares **no** mutable reference with the new in-progress day (`result.history["2026-05-17"].blocks !== result.blocks`, and likewise no nested brick is shared).
Proves: plan.md § The rollover algorithm step 2 (`structuredClone` deep snapshot — later mutation of the fresh day cannot reach `history`) + § Edge cases (archived-day immutability) — covers SPEC AC #9.

#### U-m9b-015 — edge (purity)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` with `currentDate: "2026-05-17"`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, `state.blocks`, `state.categories`, `state.looseBricks` (and a representative nested block) — and `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** it does **not** throw (`expect(() => rollover(frozenState, "2026-05-18")).not.toThrow()`) — `rollover` never writes into its input `state` or any of `state`'s nested collections; after the call the input `state` object and its arrays are referentially and structurally unchanged (`state.currentDate` still `"2026-05-17"`, `state.history` still `{}`/its original value, `state.blocks` same length).
**AND** `rollover` reads **no clock**: called twice with the **same** `(state, "2026-05-18")` args the two results are deep-equal — and a result computed with `todayISO = "2026-05-18"` differs from one computed with `todayISO = "2026-05-19"` purely as a function of the argument, never of `Date.now()`. (The single `today()` clock read lives in `usePersistedState`, not `rollover` — see `C-m9b-002`.)
Proves: plan.md § The rollover algorithm — Determinism + § Open questions for VERIFIER item (b) (`rollover` reads no clock; mutates none of its inputs) — covers SPEC AC #9, AC #6 (purity underpins the no-op guarantee).

#### U-m9b-016 — success

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one block `B` holding three bricks — `r1` `hasDuration: true` with `recurrence: { kind: "every-day" }`, `r2` `hasDuration: true` with `recurrence: { kind: "just-today", date: "2026-05-17" }`, `r3` `hasDuration: false` (no `recurrence`) — and `todayISO = "2026-05-18"` (Mon)
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the fresh in-progress day re-creates exactly `r1`'s brick (its `recurrence` `every-day` satisfies `appliesOn(rec, "2026-05-18")`); `r2` is **dropped** (`just-today` for `"2026-05-17"` → `appliesOn` `false` for `"2026-05-18"`); `r3` is **dropped** (`hasDuration: false`, no `recurrence` → never seeded). The fresh block `B'` hosts exactly one brick (the `r1` instance).
Proves: plan.md § Fresh-day seeding detail — per-brick seeding rule (`hasDuration && appliesOn(...)`; `just-today` mismatch and no-`recurrence` bricks not carried) — covers SPEC AC #11.

#### U-m9b-017 — success / edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-15"` Fri) whose in-progress day has loose bricks, each `hasDuration: true`, one per recurrence kind: `wd` `{ kind: "every-weekday" }`, `wknd-check` `{ kind: "custom-range", start: "2026-05-01", end: "2026-05-31", weekdays: [0, 6] }` (Sun+Sat only), `inrange` `{ kind: "custom-range", start: "2026-05-01", end: "2026-05-31", weekdays: [1] }` (Mon), `oob` `{ kind: "custom-range", start: "2026-01-01", end: "2026-01-31", weekdays: [1] }` (range entirely in January); evaluated separately at `todayISO = "2026-05-18"` (Mon) and at `todayISO = "2026-05-16"` (Sat)
**WHEN** `rollover(state, todayISO)` is called for each `todayISO`
**THEN** at `todayISO = "2026-05-18"` (Mon): `wd` is seeded (weekday), `inrange` is seeded (in range, Mon ∈ weekdays), `wknd-check` is **dropped** (Mon ∉ {Sun,Sat}), `oob` is **dropped** (May 18 outside the January range).
**AND** at `todayISO = "2026-05-16"` (Sat): `wd` is **dropped** (weekend), `wknd-check` is seeded (Sat ∈ weekdays, in range), `inrange` is **dropped** (Sat ∉ {Mon}), `oob` is **dropped** (out of range) — confirming each recurrence kind drives seeding via `appliesOn`.
Proves: plan.md § Fresh-day seeding detail — per-brick rule across `every-weekday` / `custom-range` (in-window, out-of-window, weekday-excluded) + § Edge cases (recurrence does not apply today) — covers SPEC AC #11.

#### U-m9b-018 — success (mutation-resistant)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one loose `kind: "tick"` brick `tk` (`done: true`, `recurrence: { kind: "every-day" }`, `name: "Meditate"`, `categoryId: "cat-1"`, `start: "06:00"`, `end: "06:20"`) and one loose `kind: "units"` brick `un` (`done: 12`, `target: 30`, `unit: "pages"`, `recurrence: { kind: "every-day" }`, `name: "Read"`, `categoryId: "cat-2"`, `start: "21:00"`, `end: "21:40"`); `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the seeded tick brick has `done === false` (reset) and the seeded units brick has `done === 0` (reset); for **both**, `name`, `categoryId`, `start`, `end`, `recurrence`, `kind`, and (for `un`) `target` + `unit` are deep-equal to the source brick (`recurrence` deep-equals `{ kind: "every-day" }`, `un.target === 30`, `un.unit === "pages"`).
**AND** each seeded brick's `id` is a **fresh uuid** — `!== "tk"` / `!== "un"` — and is a valid uuid string; the recurrence _definition_ is preserved verbatim while only `id`, `done`, and `parentBlockId` are re-derived.
Proves: plan.md § Fresh-day seeding detail — `done` reset per kind (AC #12) + SG-m9b-01 (fresh `uuid` per day-instance, definition preserved) — covers SPEC AC #12.

#### U-m9b-019 — success / edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has three blocks — `Bkeep` with one `hasDuration: true` `every-day` brick, `Bdrop` with one `just-today` `{ date: "2026-05-17" }` brick only, `Bempty` with one `hasDuration: false` brick only — plus two categories `cat-A`, `cat-B`; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the fresh day's `blocks` contains exactly **one** block — the carry of `Bkeep` (it has ≥1 brick that recurs and applies today); `Bdrop` and `Bempty` are **dropped** (zero applicable recurring bricks); the carried block hosts **only** its one seeded brick.
**AND** the result's `categories` deep-equals `[cat-A, cat-B]` — carried forward unchanged (same content; ADR-045 — categories are not seeded/filtered).
Proves: plan.md § Fresh-day seeding detail — Block filtering (block carries iff ≥1 seeded brick; hosts only seeded bricks; `categories` carry verbatim) — covers SPEC AC #13.

#### U-m9b-020 — edge (parentBlockId consistency)

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-17"`) whose in-progress day has one block `{ id: "B-old" }` holding two `hasDuration: true` `every-day` bricks each with `parentBlockId: "B-old"`, and one loose `hasDuration: true` `every-day` brick with `parentBlockId: null`; `todayISO = "2026-05-18"`
**WHEN** `rollover(state, "2026-05-18")` is called
**THEN** the carried block has a **fresh uuid** `id` (`!== "B-old"`), and **both** of its seeded bricks carry `parentBlockId` equal to that new block `id` — **not** the stale `"B-old"` (`result.blocks[0].bricks.every(b => b.parentBlockId === result.blocks[0].id)`); the seeded loose brick keeps `parentBlockId: null`.
Proves: plan.md § Fresh-day seeding detail — `parentBlockId` consistency (block `id` re-derived first, seeded bricks re-pointed to the new block `id`; loose bricks stay `null`) — covers SPEC AC #13, AC #11.

#### U-m9b-021 — edge

Target file: `lib/history.test.ts`
**GIVEN** a v2 `PersistedState` `state` (`currentDate: "2026-05-16"` Sat) whose in-progress day has **only** `every-weekday` bricks and blocks (no brick applies on a weekend), plus categories `[cat-A]`; `todayISO = "2026-05-17"` (Sun — still a weekend)
**WHEN** `rollover(state, "2026-05-17")` is called
**THEN** the fresh day's `blocks` is `[]` and `looseBricks` is `[]` (no applicable recurring brick → empty fresh day); `categories` still deep-equals `[cat-A]` (carried forward); `history["2026-05-16"]` holds the archived (non-empty) Saturday day; `currentDate === "2026-05-17"`.
Proves: plan.md § Fresh-day seeding detail — "A day with no applicable recurring bricks" + § Edge cases — covers SPEC AC #11, AC #13.

### Component (Vitest + Testing Library)

`C-m9b-*` IDs render the `usePersistedState()` hook (via `renderHook` or a tiny harness component) and/or `BuildingClient`, with a mocked `localStorage`. The `dharma:v1` key is cleared before each test; the system clock is controlled (`vi.setSystemTime`) so `today()` is deterministic.

#### C-m9b-001 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` pre-seeded with a v2 `dharma:v1` whose `currentDate` equals **today** (`vi.setSystemTime` → `"2026-05-18"`, persisted `currentDate: "2026-05-18"`), holding one block `b1` and a `history` with one entry
**WHEN** `usePersistedState()` is rendered and effects flush (`act`)
**THEN** after the hydration effect the hook's `state` carries `b1` and the `history` entry unchanged — `rollover(loaded, today())` was a no-op (`currentDate >= today`); `state.currentDate === "2026-05-18"`, `state.history` deep-equals the persisted `history`, `state.blocks[0].id === "b1"`. The post-M9b `AppState` exposes both `currentDate` (string) and `history` (object) — `"currentDate" in state` and `"history" in state` are both `true`; `schemaVersion` is **not** on `state` (`"schemaVersion" in state === false`, stripped at the boundary).
Proves: plan.md § Hydration wiring (rollover no-op on same-day load; `projectToAppState` carries `currentDate`/`history`, drops `schemaVersion`) + § Data model SG-m9b decision — covers SPEC AC #6, AC #1.

#### C-m9b-002 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` pre-seeded with a v2 `dharma:v1` whose `currentDate` is **yesterday** (`vi.setSystemTime` → today `"2026-05-18"`; persisted `currentDate: "2026-05-17"`), an in-progress day with one block holding an `every-day` brick (`done: true`) and one `just-today: "2026-05-17"` brick, `history: {}`
**WHEN** `usePersistedState()` is rendered and effects flush (`act`)
**THEN** after the hydration effect: `state.currentDate === "2026-05-18"` (advanced); `state.history` has the key `"2026-05-17"` whose `ArchivedDay` holds the pre-rollover day (the archived `every-day` brick still `done: true`); `state.blocks` is the freshly-seeded day — the `every-day` brick re-created with `done: false`, the `just-today` brick dropped. The single `today()` clock read happened in the hook's pass-2 effect (`rollover` itself received `today()` as its `todayISO` argument — confirmed by the hook honoring the faked `vi.setSystemTime` value).
Proves: plan.md § Hydration wiring step 4 (pass-2 effect runs `rollover(loadState(), today())` once on mount, after load, before first render) — covers SPEC AC #7, AC #8.

#### C-m9b-003 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a mocked `localStorage` with **no** `dharma:v1` key (first run), `vi.setSystemTime` → `"2026-05-18"`, `saveState` wrapped in a spy
**WHEN** `usePersistedState()` is rendered and effects flush
**THEN** the first render (before effects) shows the empty v2 default — `state.blocks/categories/looseBricks` all `[]`, `state.history` deep-equals `{}`, `state.currentDate === "2026-05-18"`; after the pass-2 effect the state is still the empty v2 default (rollover on the empty default is a no-op — `currentDate === today`); `loadState` was not called during render, and the `saveState` spy has **zero** calls until a subsequent mutating dispatch (the `if (!mounted) return` guard holds).
Proves: plan.md § Hydration wiring pass-1 + pass-2 + save-effect guard (SSR/first paint = empty v2 default; `loadState`/`rollover` never in render; save guarded by `mounted`) — covers SPEC AC #2.

#### C-m9b-004 — success

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** a `usePersistedState()` harness pre-seeded with a v2 `dharma:v1` whose `currentDate` is yesterday (`"2026-05-17"`, today `"2026-05-18"`), so a rollover occurs on mount; `saveState` wrapped in a spy
**WHEN** the hook mounts, the pass-2 rollover effect flushes, and then a mutating action (`LOG_TICK_BRICK` on a seeded brick) is dispatched
**THEN** the first `saveState` call (triggered by the post-mount mutating dispatch — `mounted` is now `true`) writes the **post-rollover** v2 shape to `dharma:v1` — `JSON.parse(localStorage["dharma:v1"])` has `schemaVersion: 2`, `currentDate: "2026-05-18"`, and a `history` containing the `"2026-05-17"` archived day; `toPersisted` lifted `currentDate` and `history` back from `AppState` (no second clock read). Yesterday lands in `history` on disk.
Proves: plan.md § Hydration wiring step 3 + step 5 (`toPersisted` lifts `currentDate`/`history` back, `schemaVersion: 2` stamped; first save after a rollover boot persists the post-rollover state) — covers SPEC AC #1, AC #7.

#### C-m9b-005 — success (schema-lock anchor)

Target file: `lib/usePersistedState.test.tsx`
**GIVEN** the `usePersistedState()` hook and the post-M9b `Action` union from `lib/types.ts`
**WHEN** the hook is rendered and the `Action` union inspected
**THEN** the `Action` union contains **no** `ROLLOVER` member and no other M9b-added action variant (compile-time `tsc` gate: an action literal `{ type: "ROLLOVER" }` is a type error); at runtime, dispatching every existing action type still succeeds and the reducer is never handed an unknown type — rollover is applied by composing `rollover` into the pass-2 `setState`, **not** via a new reducer action (the M4f-locked `Action` union is unchanged).
**AND** `reducer` (from `lib/data.ts`) gains no new arm — `defaultState()` adds `currentDate`/`history` but no `Action` variant.
Proves: plan.md § The rollover algorithm — "No reducer action" + § File structure `lib/data.ts` row (no new `Action`; rollover composed into `setState`) — covers SPEC AC #14 (runtime anchor for the `Action`-lock portion).

#### C-m9b-006 — success

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with a mocked `localStorage` whose v2 `dharma:v1` has `currentDate` = yesterday (`"2026-05-17"`) and an in-progress day of one block holding one `every-day` brick (ticked), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the component mounts and effects flush
**THEN** the building view renders the **freshly-seeded** day — the `every-day` brick is present and **unchecked** (`done: false`), as rollover re-seeded it; `<BuildingClient />` itself required **no** prop/markup change (M9b adds no component) — the same Building components render whatever day `rollover` produced. No console error, no hydration-mismatch warning.
Proves: plan.md § Components ("None" — Building view renders the rolled-over day with zero component change) + § Hydration wiring — covers SPEC AC #8, AC #14 (zero-UI-delta anchor).

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan names: first-run, same-day-no-rollover, next-day-rollover.

#### E-m9b-001 — success (first-run)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/`
**WHEN** the page renders and the building view is inspected (under `count() > 0` guard)
**THEN** the app shows the empty-state default — no console hydration-mismatch warning; once the first-run save fires, `localStorage["dharma:v1"]` is valid JSON with `schemaVersion: 2`, `history` an empty object `{}`, `currentDate` equal to today's ISO date, and empty `blocks`/`categories`/`looseBricks`.
Proves: plan.md § Edge cases (first run → v2 default) + § Hydration wiring — covers SPEC AC #2, AC #15 (first-run E2E scenario).

#### E-m9b-002 — success (same-day, no rollover)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared, the app at `/`; the user adds a block and a recurring (`every-day`) brick and ticks it, so `dharma:v1` holds an in-progress day with `currentDate` = today
**WHEN** the page is **reloaded the same day** (`page.reload()`, no clock change)
**THEN** after reload the same block and brick — with the brick's exact `done` (ticked) state — are still present on the timeline (under `count() > 0` guard); `localStorage["dharma:v1"]` still has an empty `history` (`{}`) and `currentDate` unchanged — no rollover occurred, the day was not archived.
Proves: plan.md § The rollover algorithm step 1 DETECT (`currentDate === today` → no rollover, `history` untouched) + § Edge cases — covers SPEC AC #6, AC #15 (same-day-no-rollover E2E scenario).

#### E-m9b-003 — success (next-day rollover)

Target file: `tests/e2e/m9b.spec.ts`
**GIVEN** a browser with `localStorage` cleared; via `page.evaluate`, `dharma:v1` is set to a hand-built v2 payload whose `currentDate` is **yesterday's** ISO date, with an in-progress day of one block holding one `every-day` brick ticked done and one `just-today: <yesterday>` brick, `history: {}`
**WHEN** the app is loaded fresh at `/` (a new calendar day relative to the seeded `currentDate`)
**THEN** the building view (under `count() > 0` guard) shows the **freshly-seeded** day — the `every-day` brick present and **unchecked**, the `just-today` brick **absent**; reading `localStorage["dharma:v1"]` after the first post-load save shows `currentDate` advanced to today and `history` containing one entry under yesterday's date whose `ArchivedDay` holds the ticked brick (yesterday archived intact). No crash, no error overlay.
Proves: plan.md § The rollover algorithm steps 2–4 + § Fresh-day seeding detail + § Hydration wiring (next-day boot archives yesterday, seeds a fresh day) — covers SPEC AC #7, AC #8, AC #11, AC #15 (next-day-rollover E2E scenario).

### Sandbox / preview note

Per the established M4a–M8 pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `E-m9b-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m8.spec.ts`, which yields a vacuous PASS when the queried element is absent (ADR-039 ships-empty + no deterministic seeding). This is **known vacuous-pass debt** — flagged in `status.md`. `E-m9b-003` partly mitigates it by hand-building the `dharma:v1` payload via `page.evaluate` (a deterministic seed for the rollover path that does not need a brick-creation UI flow). M9b introduces no general deterministic seeding helper (out of scope per ADR-022). The 3 deferred-to-preview IDs are net-additive; M9b retires no E2E ID. No `A-` (a11y) leg — M9b adds zero DOM surface.

### Retired test IDs

**None.** M9b is purely additive: two new files (`lib/history.ts` + its new test suite `lib/history.test.ts`) plus edits to `lib/persist.ts`, `lib/types.ts`, `lib/data.ts`, `lib/usePersistedState.ts`. **No existing test file is edited** — the M8 `lib/persist.test.ts` and `lib/usePersistedState.test.tsx` gain **new** `m9b` IDs appended, but no prior `U-m8-*`/`C-m8-*` ID is changed or removed. Every existing `U-/C-/E-/A-` ID across all milestones — including all `U-m8-*`, `C-m8-*`, `U-m9a-*`, and the M9a `test:tz` suite — stays live and green. M9b adds 30 new `m9b` IDs (21 U + 6 C + 3 E) and retires none.

Note on the M8 persist tests: the M8 `U-m8-001` asserts `SCHEMA_VERSION === 1` and `U-m8-003`/`U-m8-006` assert v1-shaped behavior. The M9b plan bumps `SCHEMA_VERSION` to `2` and the schema to v2 — which **would** break those M8 IDs as literally written. **This is flagged for VERIFIER as Spec gaps item 1** — the plan's "no existing test file is edited" expectation (plan.md § Out of scope, § no-regression AC #14) is in tension with the schema bump. See § Spec gaps surfaced for VERIFIER.

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                                         | Test ID(s)                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| #1  | `loadState`/`saveState` round-trip the v2 shape `{ schemaVersion:2, programStart, currentDate, history, blocks, categories, looseBricks }` | `U-m9b-001`, `U-m9b-002`, `U-m9b-009`, `C-m9b-001`, `C-m9b-004`                                     |
| #2  | First run → v2 default (`currentDate`=today, `history`=`{}`, empty collections, `programStart`=today)                                      | `U-m9b-003`, `U-m9b-004`, `C-m9b-003`, `E-m9b-001`                                                  |
| #3  | `schemaVersion:1` payload migrates to v2 — v1 collections + `programStart` preserved, `currentDate`=today, `history`=`{}`                  | `U-m9b-005`                                                                                         |
| #4  | `schemaVersion` ≥3 or non-numeric → empty v2 default; no exception escapes                                                                 | `U-m9b-006`                                                                                         |
| #5  | Malformed JSON / non-object `history` → empty v2 default or `history`→`{}`; no exception escapes                                           | `U-m9b-007`, `U-m9b-008`, `U-m9b-009`                                                               |
| #6  | `currentDate` === today → no rollover; `history` untouched                                                                                 | `U-m9b-010`, `U-m9b-015`, `C-m9b-001`, `E-m9b-002`                                                  |
| #7  | `currentDate` < today → in-progress day archived into `history[currentDate]` as an `ArchivedDay`                                           | `U-m9b-011`, `C-m9b-002`, `C-m9b-004`, `E-m9b-003`                                                  |
| #8  | After archive, fresh day seeded + `currentDate` advanced to today                                                                          | `U-m9b-012`, `C-m9b-002`, `C-m9b-006`, `E-m9b-003`                                                  |
| #9  | `ArchivedDay` is a deep snapshot — mutating the new day leaves `history[oldDate]` byte-identical                                           | `U-m9b-014`, `U-m9b-015`                                                                            |
| #10 | Multi-day skip → ONLY `currentDate` archived; no entry for intervening dates                                                               | `U-m9b-013`                                                                                         |
| #11 | Fresh day re-creates exactly the bricks where `appliesOn` is true; `just-today` / no-`recurrence` dropped                                  | `U-m9b-016`, `U-m9b-017`, `U-m9b-020`, `U-m9b-021`, `E-m9b-003`                                     |
| #12 | Seeded bricks reset (`tick`→`done:false`, `units`→`done:0`); `target`/`unit`/`start`/`end`/`recurrence` preserved                          | `U-m9b-018`                                                                                         |
| #13 | A block carries iff ≥1 brick applies today; hosts only seeded bricks; `categories` carry unchanged                                         | `U-m9b-019`, `U-m9b-020`, `U-m9b-021`                                                               |
| #14 | No new screen/component; M1–M8 + M9a tests + `test:tz` still green                                                                         | **gate (`npm run eval`, full Vitest + `test:tz`)** + anchors `C-m9b-005`, `C-m9b-006`               |
| #15 | Quality gates: `tsc` clean; ESLint 0 err / ≤13 warn; full Vitest green; E2E covers first-run/same-day/next-day                             | **gate (`npm run eval`)** + `E-m9b-001` (first-run), `E-m9b-002` (same-day), `E-m9b-003` (next-day) |

**Gate-verified ACs:** #14 (no regression) and #15 (quality gates) — consistent with the M8 (#14/#15) and M9a (#10/#11) precedent. All other 13 ACs map to at least one bespoke `m9b` test ID. Every `m9b` test ID maps back to at least one AC. No AC is unmapped.

**Edge-case coverage (plan.md § Edge cases table):** first run → `U-m9b-003`/`C-m9b-003`; `currentDate`===today → `U-m9b-010`; `currentDate`===yesterday → `U-m9b-011`/`U-m9b-012`/`C-m9b-002`; N>1 days skipped → `U-m9b-013`; `schemaVersion:1` → `U-m9b-005`; `schemaVersion` 3+/non-numeric → `U-m9b-006`; corrupt JSON / non-object `history` → `U-m9b-007`/`U-m9b-008`; recurrence does not apply today → `U-m9b-016`/`U-m9b-017`; day with no applicable recurring bricks → `U-m9b-021`; archived-day immutability → `U-m9b-014`/`U-m9b-015`.

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9b-01 seeded brick identity → fresh `uuid`; SG-m9b-02 `rollover` placement → `lib/history.ts`; SG-m9b-03 mid-session midnight → deferred, documented), and the plan's § Open questions for VERIFIER lists three confirmation items (v2 shape matches ADR-045 field-for-field; `rollover` reads no clock; `currentDate`/`history` on `AppState`). The TESTS phase covers the plan faithfully; the following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The schema bump breaks the M8 persist tests as literally written.** AC #14 requires "every M1–M8 + M9a Vitest test still passes," and § Retired test IDs above commits to editing **no existing test file**. But the M8 `U-m8-001` asserts `SCHEMA_VERSION === 1`, and `U-m8-003`/`U-m8-006` assert the v1 `{ schemaVersion:1, programStart, blocks, categories, looseBricks }` shape and v1 round-trip — bumping `lib/persist.ts` to `SCHEMA_VERSION = 2` and the v2 `PersistedState` **necessarily** breaks those three M8 IDs. The M9b **plan does not name this** — it says `lib/persist.ts` is modified but its § Out of scope / AC #14 read as "no regression." This is a genuine plan↔spec tension: either (a) AC #14's "every M8 test passes unmodified" is to be read as "the M8 _behaviors that survive the v2 bump_ pass, and the three version-pinned M8 IDs are legitimately amended to the v2 contract — which IS editing an existing test file," or (b) the M9b plan should explicitly list `U-m8-001`/`U-m8-003`/`U-m8-006` as **amended-to-v2** IDs (a § Retired/amended test IDs entry the M9b plan currently lacks). **VERIFIER's call** — the TESTS-phase reading is (a): those three M8 IDs must be updated to the v2 contract by the BUILDER, and AC #14 means "no _behavioral_ regression," not literal byte-identity of the M8 test file. This was not invented here — it is a real omission in the plan that VERIFIER should rule on rather than let the BUILDER silently resolve. Recommended VERIFIER outcome: confirm (a) and have the BUILDER amend the three M8 IDs to assert `schemaVersion: 2` + the v2 shape, OR FAIL back to PLANNER to add the amended-IDs note to `plan.md` § Out of scope.

2. **`programStart` field validation in `migrate` `case 1`.** The plan says `case 1` coerces `programStart` defensively (`typeof === "string" ? value : today()`). `U-m9b-005` asserts the happy path (`programStart` preserved). The non-string-`programStart`-in-a-v1-payload sub-case is folded into `U-m9b-009`'s `case 2` coercion assertion (the coercion rule is identical across `case 1` and `case 2`) rather than given a standalone `case 1` ID. VERIFIER may request a dedicated assertion in `U-m9b-005` if it enforces strict per-arm coverage; the recommendation is the fold (the coercion logic is shared).

Neither item is an unresolved ambiguity that blocks the BUILDER on item 2; **item 1 is a real plan gap VERIFIER must rule on.** No ADR is reversed: ADR-045 (v2 persisted schema + v1→v2 migration) is honored field-for-field — the v2 `PersistedState` in the IDs above matches `PersistedStateV2`; ADR-044 + ADR-018 transport (single `dharma:v1` key, two-pass load) is retained; ADR-019 (`Recurrence` union) is consumed unchanged via M9a's `appliesOn`. M9b adds 30 `m9b` test IDs (21 U + 6 C + 3 E; no A) and retires none.

## Milestone 9c — Month view (Kingdom) + view switcher — Tests

This entry covers M9c — the first **visible** Milestone 9 chunk: the Kingdom month grid, the Day·Week·Month·Year view switcher, computed per-day scores, month navigation, and a strictly read-only past-day detail. It is derived from the `plan.md` M9c entry (`## Milestone 9c — Month view (Kingdom) + view switcher — Plan`). Feature slug: `m9c`. ID prefixes: `U-m9c-`, `C-m9c-`, `A-m9c-`, `E-m9c-`. M9c **adds a real UI surface** (four new components + a new shell), so unlike M9a/M9b it has a full four-layer test mix — unit (pure `lib/monthGrid.ts` + the `dayScore` helper), component (`AppShell`, `ViewSwitcher`, `MonthView`, `DayCell`, `PastDayDetail`), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9c has a **large genuine unit surface** (`lib/monthGrid.ts` is pure date math; the `dayScore` helper in `lib/history.ts` is a pure `(state, isoDate)` function) and a substantial component surface (the grid, the switcher, the cell's five visual `kind`s, the read-only detail, the shell's single-`usePersistedState` lift). Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) precedent:

- **AC #15 (no regression to M1–M9b; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Month / day-cell-scores / open-past-day)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by `C-m9c-013` (the `BuildingClient` prop-refactor leaves the Building view byte-equivalent in behavior) plus the migration discipline in § Retired / amended test IDs below; the three named E2E scenarios are authored as real `test()` blocks (`E-m9c-001..003`).

All other 14 ACs map to at least one concrete bespoke `m9c` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9c-005` (UTC-drift) is the load-bearing date-math guard** — it computes `monthGridCells` for a month whose 1st falls on a known weekday and asserts the leading-blank count and every `date` cell's `iso` string **exactly**, then re-runs the same assertion under a faked negative-UTC-offset environment (`process.env.TZ = "America/Los_Angeles"` via `vi.stubEnv` / a fixture clock) — a mutant that parses with `new Date(isoString)` (UTC midnight) drifts a day and fails. The plan's § Date math forbids `new Date(isoString)`; this test enforces it.
- **`U-m9c-008` (`dayScore` no-data sentinel) asserts strict `=== null`**, not falsy — a mutant returning `0` or `undefined` for a no-data date fails, because the cell-classification depends on telling `null` apart from a real `0`.
- **`U-m9c-009` (`dayScore` precedence) asserts `history` wins over `currentDate`** when (the should-not-occur case) a date is in both — a mutant that checks `currentDate` first fails.
- **`U-m9c-010` (`dayScore` purity) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts `dayScore` neither throws nor reads a clock — called twice with the same args it returns deep-equal results; a mutant that mutates `state` or reads `Date.now()` fails.
- **`C-m9c-014` (the read-only guarantee) is a real absence assertion, not a comment** — it renders `<PastDayDetail>` over a fixture `ArchivedDay` that has bricks in mixed `done` states and asserts via `queryBy*` that **no** mutation affordance exists: no checkbox/toggle (`queryByRole("checkbox")` → `null`), no stepper (`queryByRole("spinbutton")` → `null`), no add-brick / add-block control (`queryByRole("button", { name: /add|new brick|new block|\+/i })` → `null` for every match except the lone `Close`), no `BrickChip` interactive element. The only interactive element returned by `getAllByRole("button")` is `Close`.
- **`C-m9c-006` (DayCell missed vs future distinctness, AC #7) asserts a structural difference**, not a class-name guess — a `missed` cell carries a visible `var(--card-edge)` border and no score numeral; a `future`/`pre-start` cell is borderless and faint. The test asserts the `missed` cell exposes a card-bordered element while the `future` cell does not, and that `missed` has no numeral text node — a mutant rendering both identically fails.
- **`C-m9c-007` (DayCell tappability is structural) asserts `future`/`pre-start`/`missed`/`blank` cells are NOT `<button>`s** (`queryByRole("button")` within the cell → `null`) — AC #13's "tapping a future / pre-start date does nothing" is proven by the absence of an interactive role, not by a guarded no-op handler that a mutant could un-guard.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9c-001..012` | 12     |
| Component (Vitest + Testing Library)  | `C-m9c-001..016` | 16     |
| Accessibility (axe via Playwright)    | `A-m9c-001..004` | 4      |
| E2E (Playwright, deferred-to-preview) | `E-m9c-001..003` | 3      |
| **Total**                             |                  | **35** |

ID series start values were supplied by the orchestrator: `U-m9c-001`, `C-m9c-001`, `A-m9c-001`, `E-m9c-001`.

**Fixture dates (ISO, weekdays verified against the proleptic Gregorian calendar):**
`2026-05-01` Fri · `2026-05-17` Sun · `2026-05-18` Mon (**today**, per `currentDate`) · `2026-05-19` Tue · `2026-05-31` Sun · `2026-04-29` Wed · `2026-04-01` Wed · `2026-02-01` Sun · `2026-02-28` Sat (Feb 2026 has 28 days — not a leap year) · `2024-02-29` Thu (leap-year check) · `2026-12-01` Tue · `2026-12-31` Thu · `2027-01-01` Fri.
Standing fixture `state` unless a test overrides it: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` = `{ "2026-05-17": <ArchivedDay scoring 100>, "2026-05-15": <ArchivedDay scoring 0>, "2026-05-16": <ArchivedDay scoring 60> }`, the live in-progress day (`blocks`/`categories`/`looseBricks`) scoring `dayPct === 40`. May 2026: the 1st is a Friday → 5 leading blank cells (Sun..Thu), 31 days, 1 trailing blank → 37 cells = 5 rows of 7 (Sun-row…), wait — 5 + 31 = 36, padded to 42 = **6 rows** (35 < 36 ≤ 42). Tests that assert the May-2026 cell count use **42** (6 rows); a 5-row month is exercised separately by `U-m9c-004` (Feb 2026: 1st is Sun → 0 leading blanks, 28 days = 28 cells = exactly 4 rows).

### Unit (Vitest)

`U-m9c-001..006` exercise the pure `lib/monthGrid.ts` (no clock, no `localStorage` — called with literal `(year, month)` args). `U-m9c-007..012` exercise the `dayScore` helper added to `lib/history.ts` (pure `(state, isoDate)` — no clock, no `localStorage`, driven directly).

#### U-m9c-001 — success

Target file: `lib/monthGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `monthGridCells`, `addMonth`, `subMonth` exported from `lib/monthGrid.ts`, and the `GridCell` type
**WHEN** the module's exports are inspected
**THEN** `monthGridCells`, `addMonth`, `subMonth` are all `typeof === "function"`; `monthGridCells(2026, 4)` (May 2026, `month` 0-indexed) returns an array whose every element is either `{ kind: "blank" }` or `{ kind: "date"; iso: string; dayOfMonth: number }` (the `GridCell` union); the returned array `.length` is a multiple of `7`.
Proves: plan.md § Data model (`GridCell` union; `monthGridCells` signature) + § File structure (`lib/monthGrid.ts` module surface) — covers SPEC AC #1.
Tag: success.

#### U-m9c-002 — success

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called as `monthGridCells(2026, 4)` (May 2026 — the 1st is Friday, weekday index `5` under `0=Sun…6=Sat`)
**THEN** the first **5** elements are `{ kind: "blank" }` (leading blanks aligning the 1st to its Friday column); element index `5` is `{ kind: "date", iso: "2026-05-01", dayOfMonth: 1 }`; element index `35` is `{ kind: "date", iso: "2026-05-31", dayOfMonth: 31 }`; the **last 6** elements (index `36..41`) are `{ kind: "blank" }` (trailing pad); the array length is exactly `42` (6 rows × 7).
**AND** every `date` cell's `iso` is a zero-padded `YYYY-MM-DD` string (`"2026-05-09"`, not `"2026-05-9"`) and `dayOfMonth` matches the trailing day number.
Proves: plan.md § Data model (`monthGridCells` — leading blanks = weekday of the 1st; one `date` per day; trailing pad to a multiple of 7; zero-padded `iso`) + § Date math — covers SPEC AC #1.
Tag: success.

#### U-m9c-003 — success / edge

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called for a month whose 1st is a Sunday — `monthGridCells(2026, 1)` (February 2026 — the 1st is Sunday, weekday index `0`)
**THEN** there are **zero** leading blank cells (index `0` is already `{ kind: "date", iso: "2026-02-01", dayOfMonth: 1 }`); the last `date` cell is `{ kind: "date", iso: "2026-02-28", dayOfMonth: 28 }` (Feb 2026 has 28 days — 2026 is not a leap year); the array length is exactly `28` (4 rows × 7, no trailing blank needed).
**AND** for the leap year — `monthGridCells(2024, 1)` (February 2024) — the grid includes a `date` cell `{ iso: "2024-02-29", dayOfMonth: 29 }` (29 days), proving `daysInMonth` uses the `new Date(year, month+1, 0).getDate()` idiom and is leap-safe.
Proves: plan.md § Date math (days-in-month idiom, leap-safe; weekday-0 → zero leading blanks; exact-row month) + § Edge cases — covers SPEC AC #1.
Tag: edge.

#### U-m9c-004 — success / edge

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `addMonth` and `subMonth` from `lib/monthGrid.ts`, operating on `{ year: number; month: number }` (month `0–11`)
**WHEN** called within a year and across both year boundaries
**THEN** `addMonth({ year: 2026, month: 4 })` deep-equals `{ year: 2026, month: 5 }` (May→Jun); `subMonth({ year: 2026, month: 4 })` deep-equals `{ year: 2026, month: 3 }` (May→Apr).
**AND** `addMonth({ year: 2026, month: 11 })` deep-equals `{ year: 2027, month: 0 }` (December→January advances the year); `subMonth({ year: 2027, month: 0 })` deep-equals `{ year: 2026, month: 11 }` (January→December decrements the year).
**AND** `addMonth` / `subMonth` are pure — they return a **new** object, do not mutate the input, and construct no `Date` (pure integer arithmetic — calling twice with the same input yields deep-equal results).
Proves: plan.md § Date math (`addMonth`/`subMonth` integer arithmetic; Dec→Jan / Jan→Dec year-boundary correctness; pure, no `Date`) — covers SPEC AC #11.
Tag: edge.

#### U-m9c-005 — edge (UTC-drift-free, mutation-resistant)

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** `monthGridCells(2026, 4)` (May 2026) is computed in **both** environments
**THEN** in **both** the leading-blank count is exactly `5`, index `5` is `{ kind: "date", iso: "2026-05-01", dayOfMonth: 1 }`, index `35` is `{ iso: "2026-05-31", dayOfMonth: 31 }`, and the full array is byte-identical between the two runs — no cell's `iso` string drifts by a day.
**AND** the `iso` strings are assembled by string formatting (`` `${y}-${pad(m+1)}-${pad(d)}` ``), and the weekday/days-in-month computations use the multi-arg local-time `Date` constructor (`new Date(year, month, 1)` / `new Date(year, month+1, 0)`) — there is no `new Date("2026-05-01")`-style string-parse anywhere in `lib/monthGrid.ts` (a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality).
Proves: plan.md § Date math (no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson SG-m9a-02) — covers SPEC AC #1, AC #11.
Tag: edge.

#### U-m9c-006 — success

Target file: `lib/monthGrid.test.ts`
Layer: Unit
**GIVEN** `monthGridCells` from `lib/monthGrid.ts`
**WHEN** called for the December→January boundary months — `monthGridCells(2026, 11)` (December 2026, the 1st is Tuesday) and `monthGridCells(2027, 0)` (January 2027, the 1st is Friday)
**THEN** `monthGridCells(2026, 11)` has a `date` cell `{ iso: "2026-12-01", dayOfMonth: 1 }` at index `2` (2 leading blanks for Sun+Mon) and `{ iso: "2026-12-31", dayOfMonth: 31 }`; `monthGridCells(2027, 0)` has `{ iso: "2027-01-01", dayOfMonth: 1 }` at index `5` (5 leading blanks) — confirming the grid for adjacent-across-the-year months is internally consistent and `iso` years are correct on both sides of the boundary.
Proves: plan.md § Date math (year-boundary grid correctness — the data side of AC #11's nav) — covers SPEC AC #11.
Tag: success.

#### U-m9c-007 — success

Target file: `lib/history.test.ts` (EXISTS — `dayScore` cases appended; no `m9b` ID touched)
Layer: Unit
**GIVEN** `dayScore` and the `NO_DATA` sentinel exported from `lib/history.ts`, and the standing fixture `state` whose `history["2026-05-17"]` is an `ArchivedDay` constructed to score `dayPct === 100` (one block, all bricks done)
**WHEN** `dayScore(state, "2026-05-17")` is called
**THEN** it returns the **number** `100` — the archived branch: `"2026-05-17"` is a key of `state.history`, so `dayScore` computes `dayPct` over that `ArchivedDay` (passing a structurally-complete `AppState`-shaped object built from it, per the plan baseline — no cast); the return is a `number` in `[0,100]`, not `null`.
**AND** `dayScore(state, "2026-05-16")` returns `60` and `dayScore(state, "2026-05-15")` returns `0` — every archived `history` entry resolves to its own `dayPct`.
Proves: plan.md § Data model — `dayScore` archived-day branch (`isoDate in history` → `dayPct` over the `ArchivedDay`) — covers SPEC AC #4, AC #5.
Tag: success.

#### U-m9c-008 — success / edge (mutation-resistant sentinel)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` and `NO_DATA` from `lib/history.ts`, the standing fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` keyed on the 15th/16th/17th)
**WHEN** `dayScore` is called for ISO dates with **neither** a `history` entry **nor** equality to `currentDate` — a future date `"2026-05-25"`, a pre-`programStart` date `"2026-04-10"`, and a past in-range date the user never opened `"2026-05-13"`
**THEN** each call returns **exactly `null`** (`expect(dayScore(state, iso)).toBe(null)` — strict `=== null`, NOT merely falsy); `NO_DATA` is exported and `NO_DATA === null`; the return for these three dates is identical (`dayScore` itself does not distinguish future / pre-start / missed — it is a pure history lookup, and the classification is `MonthView`'s job, per `C-m9c-004`).
**AND** `dayScore` returns `null` on an **empty** `history` (`state.history === {}`) for any non-`currentDate` date — no crash on a first-run empty map (a plain `in` check).
Proves: plan.md § Data model — `dayScore` no-data branch (`NO_DATA = null` sentinel; future/pre-start/missed all → `null`; empty-`history` safe) + § Edge cases (first-ever run) — covers SPEC AC #4, AC #8.
Tag: edge.

#### U-m9c-009 — success / edge (precedence)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and the standing fixture `state` whose live in-progress day scores `dayPct === 40` and whose `currentDate === "2026-05-18"`
**WHEN** `dayScore(state, "2026-05-18")` is called (the date equals `currentDate`, and `"2026-05-18"` is **not** a `history` key)
**THEN** it returns the **number** `40` — the `currentDate` branch: `dayPct(state)` computed directly over the live `AppState`.
**AND** for the should-not-occur case where a date is **both** a `history` key and `=== currentDate` (a fixture with `currentDate: "2026-05-17"` and `history["2026-05-17"]` present, the archived snapshot scoring `100`, the live day scoring `40`), `dayScore(state, "2026-05-17")` returns **`100`** — `history` is checked **first**; the archived snapshot wins (deterministic precedence per the plan).
Proves: plan.md § Data model — `dayScore` `currentDate` branch + documented `history`-before-`currentDate` precedence — covers SPEC AC #4, AC #6.
Tag: edge.

#### U-m9c-010 — edge (purity, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay` in it, `state.blocks`, `state.categories`, `state.looseBricks` (and a representative nested block) — passed to `dayScore`
**WHEN** `dayScore(frozenState, "2026-05-17")` and `dayScore(frozenState, "2026-05-18")` are called
**THEN** neither call throws (`expect(() => dayScore(frozenState, iso)).not.toThrow()`) — `dayScore` writes into neither `state` nor any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** `dayScore` reads **no clock** and **no `localStorage`**: called twice with the same `(state, isoDate)` args it returns deep-equal (here `===`-equal) results, and its verdict is a pure function of its two arguments — never of `Date.now()` (the only clock read in M9c lives in `MonthView`'s classification, see `C-m9c-004`).
Proves: plan.md § Data model — `dayScore` purity ("reads no clock and no `localStorage`; pure function of `(state, isoDate)`") + § Decisions to honor (ADR-045 — `history` consumed read-only) — covers SPEC AC #4.
Tag: edge.

#### U-m9c-011 — edge (0-score vs missed)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and a fixture `state` whose `history["2026-05-15"]` is an `ArchivedDay` with bricks present but **none** done (so `dayPct` over it is `0`), and which has **no** entry for `"2026-05-14"` (a past in-range date never opened)
**WHEN** `dayScore(state, "2026-05-15")` and `dayScore(state, "2026-05-14")` are called
**THEN** `dayScore(state, "2026-05-15")` returns the **number `0`** (`expect(...).toBe(0)` — a real archived score, an `ArchivedDay` that scored zero); `dayScore(state, "2026-05-14")` returns **`null`** (`NO_DATA` — no entry). The two are distinguishable: `0` (tried, scored nothing) is a `number`, `null` (never opened) is the sentinel — `MonthView` uses this to render a `scored` cell with numeral "0" vs a `missed` cell with no numeral.
Proves: plan.md § Data model — `dayScore` ("a `0`-score day returns the number `0`, never the sentinel") + § Edge cases (`ArchivedDay` score 0 vs missed day) — covers SPEC AC #4, AC #7.
Tag: edge.

#### U-m9c-012 — edge (ArchivedDay → dayPct field contract)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `dayScore` from `lib/history.ts` and an `ArchivedDay` fixture in `history` that carries `blocks` and `looseBricks` that drive a known `dayPct`, plus a `categories` array deliberately set to a value that `dayPct` does **not** read
**WHEN** `dayScore(state, <that archived date>)` is called
**THEN** the returned score depends **only** on the `ArchivedDay`'s `blocks` and `looseBricks` (matching `dayPct`'s documented field-read contract — `dayPct` at `lib/dharma.ts:49` reads only `state.blocks` and `state.looseBricks`); changing the `ArchivedDay`'s `categories` does not change the result; the score is a `number` in `[0,100]` and equals `dayPct` computed independently over the same collections.
Proves: plan.md § Data model — `dayScore` archived branch ("`dayPct` reads only `blocks`/`looseBricks`; build a complete `AppState`-shaped object — zero cast") + § Open questions for VERIFIER item (b) — covers SPEC AC #4, AC #5.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9c-001..002` cover `AppShell`; `C-m9c-003..007` cover `DayCell`; `C-m9c-008..011` cover `MonthView`; `C-m9c-012` covers `ViewSwitcher`; `C-m9c-013` covers the `BuildingClient` prop-refactor regression; `C-m9c-014..016` cover `PastDayDetail` and the day-open interaction. All render with React Testing Library; where a clock read matters (`MonthView` classification) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `AppShell` (which calls `usePersistedState`).

#### C-m9c-001 — success (AppShell — single usePersistedState + Day↔Month share one AppState)

Target file: `app/(building)/AppShell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` (`currentDate: "2026-05-18"`, one in-progress block, a non-empty `history`), `vi.setSystemTime` → `"2026-05-18"`, and `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush (`act`), the `ViewSwitcher` `Month` segment is clicked, then the `Day` segment is clicked
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across both view switches (the hook / its `loadState` spy shows a single hydration pass — not one per view); switching Day→Month→Day does not re-hydrate, does not re-run rollover, and does not mount a second `usePersistedState`.
**AND** the `MonthView` rendered in Month view and the `BuildingClient` rendered in Day view read the **same** `AppState` object — a change visible in one (the live in-progress day's score) is the same `state` the other sees (asserted by both views reflecting the identical `currentDate` / in-progress `blocks`).
Proves: plan.md § View hosting (SG-m9c-01 — `AppShell` calls `usePersistedState()` exactly once; Day and Month are two renders of one `AppState`) + § Components `<AppShell>` — covers SPEC AC #9, AC #10.
Tag: success.

#### C-m9c-002 — success (AppShell — view state, default Day, not persisted)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered fresh (mocked empty `localStorage`, `vi.setSystemTime` → `"2026-05-18"`)
**WHEN** the shell mounts, then the `Month` segment is selected, then the component tree is unmounted and remounted (simulating a refresh)
**THEN** on first mount the **Day** view is shown (`BuildingClient`'s Building chrome is in the DOM; the Kingdom grid is not) — `view` defaults to `"day"`; after selecting `Month` the Kingdom grid (`role="grid"`) is shown and the Building view is not; after the remount the view is **Day again** (the `view` state is session-only React state, not persisted — refresh returns to Day, the app's home).
**AND** `localStorage["dharma:v1"]`, if written, contains **no** `view` field — M9c persists nothing new (schema stays `v2`).
Proves: plan.md § View hosting (`view` is `useState<"day"|"month">("day")`, session-only, not persisted; refresh → Day) + § Out of scope (persisting the selected `view`) — covers SPEC AC #10.
Tag: success.

#### C-m9c-003 — success (DayCell — scored cell renders date + heat fill + numeral)

Target file: `components/DayCell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<DayCell kind="scored" date="2026-05-16" dayOfMonth={16} score={60} isToday={false} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the cell displays the date number `16`; it renders a numeric score `60` (the `Math.round(score)` corner numeral); its background carries the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (asserted via inline style / a `data-score`-derived style hook); the cell is a `<button>` (tappable) carrying an `aria-label` of the form `"…, May 16, 2026, score 60 percent"`.
**AND** clicking it calls `onOpen` exactly once.
Proves: plan.md § Components `<DayCell>` (`scored` kind — date number + accent heat fill at scaled alpha + corner numeral; tappable `<button>`) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) — covers SPEC AC #3, AC #5.
Tag: success.

#### C-m9c-004 — success (DayCell — today marker)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** `<DayCell kind="scored" date="2026-05-18" dayOfMonth={18} score={40} isToday={true} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the cell displays date number `18` and numeral `40` (the live in-progress day's `dayPct`), and additionally carries the today marker — a 2px `var(--accent)` ring (`outline` / `box-shadow`, asserted via inline style or a `data-today` attribute) — so today is unmistakable regardless of its score; the `aria-label` identifies it as today (e.g. contains `"today"` or the full dated label is present and the ring is the only visual delta).
**AND** the same cell rendered with `isToday={false}` has **no** ring — the ring is conditional on `isToday`, proving the marker is not always-on.
Proves: plan.md § Components `<DayCell>` (today — `scored` cell + 2px `--accent` ring) + § Design tokens (`scored`/`today` cell ring) — covers SPEC AC #6.
Tag: success.

#### C-m9c-005 — edge (DayCell — score-0 scored cell vs missed cell)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** two renders — `<DayCell kind="scored" date="2026-05-15" dayOfMonth={15} score={0} onOpen={vi.fn()} />` and `<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />`
**WHEN** both are rendered
**THEN** the `scored` score-`0` cell shows the date number `15`, a minimum-alpha (`0.12`) `var(--accent)` heat fill, **and** the numeral `"0"`; it is a `<button>` (tappable — an archived day has a detail to show).
**AND** the `missed` cell shows the date number `14` in `var(--ink-dim)`, a flat `var(--card)` background with a 1px `var(--card-edge)` border, and **no** heat fill and **no** numeral; it is **not** a `<button>` (`queryByRole("button")` within the cell → `null`).
**AND** the two are visually distinct — the score-`0` `scored` cell has a numeral and an accent fill; the `missed` cell has neither — resolving the spec's "tried, scored 0" vs "not opened" edge case.
Proves: plan.md § Components `<DayCell>` `kind` table (`scored` score-0 → 0.12 fill + numeral "0"; `missed` → card chip, no fill, no numeral) + § Edge cases (`ArchivedDay` score 0 vs missed day) — covers SPEC AC #7.
Tag: edge.

#### C-m9c-006 — edge (DayCell — missed visually distinct from future/pre-start, mutation-resistant)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** three renders — `<DayCell kind="missed" date="2026-05-14" dayOfMonth={14} />`, `<DayCell kind="future" date="2026-05-25" dayOfMonth={25} />`, `<DayCell kind="pre-start" date="2026-04-10" dayOfMonth={10} />`
**WHEN** all three are rendered
**THEN** the `missed` cell carries a **visible bordered chip** — a `var(--card)` background with a 1px `var(--card-edge)` border (asserted via inline style / computed style / a `data-kind="missed"` hook that maps to the bordered treatment).
**AND** the `future` cell and the `pre-start` cell are **borderless and transparent** — date number `var(--ink-dim)` at low opacity, no background fill, no border; `future` and `pre-start` render identically to each other.
**AND** the `missed` treatment is structurally different from the `future`/`pre-start` treatment (a mutant rendering all three identically fails this assertion) — satisfying AC #7's "visually different from a future or pre-`programStart` blank cell".
Proves: plan.md § Components `<DayCell>` `kind` table (`missed` = bordered card chip; `future`/`pre-start` = borderless transparent; distinctness required by AC #7) + § Design tokens — covers SPEC AC #7, AC #8.
Tag: edge.

#### C-m9c-007 — edge (DayCell — inert kinds are not tappable, structural)

Target file: `components/DayCell.test.tsx`
Layer: Component
**GIVEN** `<DayCell>` rendered for each non-`scored` kind — `kind="future"`, `kind="pre-start"`, `kind="missed"`, and `kind="blank"` — each with an `onOpen` prop **not** supplied (or supplied as a spy)
**WHEN** each cell is queried and clicked
**THEN** none of the four is a `<button>` (`queryByRole("button")` within the cell → `null`); each is a plain non-interactive `<div>`, not focusable (no `tabindex` making it tabbable); clicking it triggers no `onOpen` call (if a spy was passed) and changes no state — AC #13's "tapping a future / pre-start date does nothing" is **structural** (no interactive role), not a guarded handler.
**AND** the `blank` cell renders no date number and no background and is `aria-hidden="true"`.
Proves: plan.md § Components `<DayCell>` ("non-tappable cells are plain `<div>` … not focusable — AC #13's 'tapping … does nothing' is structural") + § Edge cases (tapping a `missed`/`future`/`pre-start`/`blank` cell) — covers SPEC AC #8, AC #13.
Tag: edge.

#### C-m9c-008 — success (MonthView — grid structure + month/year label + weekday headers)

Target file: `components/MonthView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />` with `vi.setSystemTime` → `"2026-05-18"` so the displayed month initializes to May 2026
**WHEN** rendered
**THEN** a calendar grid renders as `role="grid"` containing `role="row"` rows, each row holding 7 `role="gridcell"`s (7 weekday columns); the grid has the May-2026 cell layout — 5 leading blank cells, 31 in-range `date` cells, trailing pad — `42` gridcells total, 6 rows.
**AND** a month-year label reading `"May 2026"` is present (in `var(--font-display)`); a weekday header row of seven `role="columnheader"`s reads `"Sun" … "Sat"` in the `0=Sun…6=Sat` order (matching `RecurrenceChips` `WEEKDAYS`).
**AND** each in-range `date` cell shows its date-of-month number `1..31`.
Proves: plan.md § Components `<MonthView>` (month-year label, weekday header row, 7-column `role="grid"`, `monthGridCells`-driven cells) + § Decisions to honor (ADR-019 `0=Sun…6=Sat`) — covers SPEC AC #1, AC #2, AC #3.
Tag: success.

#### C-m9c-009 — success (MonthView — per-cell classification + scores)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture `state` (`programStart: "2026-05-01"`; `history` keyed `"2026-05-15"`→score 0, `"2026-05-16"`→score 60, `"2026-05-17"`→score 100; live day `dayPct === 40`)
**WHEN** the May-2026 grid renders
**THEN** the cell for `2026-05-17` is a `scored` cell showing numeral `100`; the cell for `2026-05-16` shows `60`; the cell for `2026-05-15` is a `scored` cell showing numeral `0`; the cell for `2026-05-18` is a `scored` cell marked **today** showing the live numeral `40`.
**AND** the cell for `2026-05-13` (past, in-range `[2026-05-01, 2026-05-18)`, no `history` entry) is a `missed` cell (card chip, no numeral); the cell for `2026-05-25` (future) is a `future` cell; there is no May cell before `programStart` (May 1 = `programStart`) — `MonthView` classifies each cell via `today()` + `state.programStart` + `dayScore`.
Proves: plan.md § Components `<MonthView>` (computes each cell's classification + score, passes to `<DayCell>`) + § Edge cases table (archived / today / missed / future rows) — covers SPEC AC #3, AC #5, AC #6, AC #7, AC #8.
Tag: success.

#### C-m9c-010 — success / edge (MonthView — prev/next month nav incl. year boundary)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"` (displayed month initializes to May 2026)
**WHEN** the "Next month" control is clicked, then the "Previous month" control is clicked twice
**THEN** after the first "Next" the label reads `"June 2026"` and the grid is June's (June 1 2026 is a Monday → 1 leading blank); after two "Previous" clicks the label reads `"April 2026"` and the grid is April's — the grid and the month-year label both update on every nav.
**AND** navigating from `"December 2026"` (reachable by repeated "Next") one more month forward yields the label `"January 2027"` and the January-2027 grid — the **year advances** across the Dec→Jan boundary; navigating back from `"January 2027"` returns to `"December 2026"`.
**AND** the prev/next controls are `<button>`s with `aria-label="Previous month"` / `"Next month"`.
Proves: plan.md § Components `<MonthView>` (prev/next via `subMonth`/`addMonth`; label + grid update; year-boundary) + § Edge cases (Dec→Jan year boundary) — covers SPEC AC #11.
Tag: edge.

#### C-m9c-011 — edge (MonthView — empty-history / future month renders all-inert, no crash)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={emptyHistoryState} onOpenDay={vi.fn()} />` where `emptyHistoryState` has `history: {}`, `programStart: "2026-05-18"`, `currentDate: "2026-05-18"` (first-ever run), `vi.setSystemTime` → `"2026-05-18"`; and separately the same component navigated forward to a wholly future month (`"August 2026"`)
**WHEN** each grid renders
**THEN** on first-run May 2026: only the `2026-05-18` cell is `scored` (today, live `dayPct`); every in-month cell before the 18th is `pre-start` (before `programStart`); every cell after is `future`; the grid renders with no crash on the empty `history` map.
**AND** the navigated-to August 2026 grid renders with **every** `date` cell `future` (all > today) — the grid still draws, all cells inert, no error.
Proves: plan.md § Edge cases (first-ever run — empty `history`; a month with no history at all → grid renders, all inert) — covers SPEC AC #1, AC #8.
Tag: edge.

#### C-m9c-012 — success / edge (ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled)

Target file: `components/ViewSwitcher.test.tsx` (NEW)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />`
**WHEN** rendered and the four segments are inspected, then `Month`, then `Week`, then `Year` are clicked
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — inside a `role="tablist"` container (`aria-label="Calendar view"`); the **Day** and **Month** segments are live `role="tab"` `<button>`s; Day has `aria-selected="true"`, Month `aria-selected="false"` (the active view is indicated by `aria-selected` and the filled-`var(--accent)` style, not color alone).
**AND** clicking `Month` calls `onSelect("month")` exactly once; re-rendering with `view="month"` flips `aria-selected` to Month.
**AND** the **Week** and **Year** segments render as `<button disabled aria-disabled="true">` — clicking either fires `onSelect` **zero** times (`expect(onSelect).not.toHaveBeenCalled()` for those clicks), causes no crash, and no view change; they are out of the tab sequence (not reachable as `role="tab"` selectable, `disabled`).
Proves: plan.md § Components `<ViewSwitcher>` (4 segments, `role="tablist"`/`role="tab"`, `aria-selected` active indicator; Day/Month live `onSelect`; Week/Year `disabled`, no `onSelect`, no crash — SG-m9c-02) — covers SPEC AC #9, AC #10.
Tag: edge.

#### C-m9c-013 — success (BuildingClient prop-refactor — no Building-view regression)

Target file: `app/(building)/BuildingClient.test.tsx` (AMENDED — see § Retired / amended test IDs)
Layer: Component
**GIVEN** the refactored `<BuildingClient state={state} dispatch={dispatch} />` — `BuildingClient` no longer calls `usePersistedState()` internally; it receives `[state, dispatch]` as props (the M9c refactor) — rendered via the sanctioned test harness that supplies `state`/`dispatch` (either by wrapping in `<AppShell />`, or by a thin `usePersistedState`-providing harness; see § Retired / amended test IDs for the migration discipline)
**WHEN** `<BuildingClient>` mounts with a state holding one block and one brick, effects flush
**THEN** the Building view renders identically to its pre-refactor behavior — the `TopBar`, `Hero`, timeline, dock, and `EditModeProvider` wrapper are all present and behave as before; a mutating dispatch (e.g. `LOG_TICK_BRICK`) still flows through and updates the view; no console error, no hydration-mismatch warning.
**AND** the refactor is **mechanical** — `BuildingClient`'s JSX, sheets, handlers, and `EditModeProvider` are unchanged; only the state _source_ moved from an internal `usePersistedState()` call to a prop. This ID is the no-regression anchor for AC #15.
Proves: plan.md § View hosting (`BuildingClient` refactored from "calls the hook" to "receives `state`/`dispatch` props"; every other line unchanged) + § File structure `app/(building)/BuildingClient.tsx` row + § Open questions for VERIFIER item (c) — covers SPEC AC #10, AC #15.
Tag: success.

#### C-m9c-014 — edge (PastDayDetail — strictly read-only, mutation-resistant absence assertion)

Target file: `components/PastDayDetail.test.tsx` (NEW)
Layer: Component
**GIVEN** `<PastDayDetail archivedDay={fixtureArchivedDay} isoDate="2026-04-29" onClose={onClose} />` where `fixtureArchivedDay` has two blocks containing bricks in **mixed** `done` states (some tick bricks `done: true`, some `false`; a units brick `done: 12 / target: 30`) and one loose brick
**WHEN** rendered and its interactive surface is queried
**THEN** the panel exposes **no mutation affordance**: `queryByRole("checkbox")` → `null` (no tick toggle), `queryByRole("spinbutton")` → `null` (no units stepper), `queryAllByRole("button")` returns **exactly one** element — the `Close` control (`aria-label="Close"` or "Back to month"); there is no `+`/"Add brick"/"Add block"/"New" control (`queryByRole("button", { name: /add|new|\+/i })` → `null`); no `BrickChip`/`TimelineBlock` interactive element is rendered.
**AND** clicking `Close` calls `onClose` exactly once; the panel is otherwise pure presentation over the frozen `ArchivedDay` (a mutant that reuses an interactive `BrickChip`/`TimelineBlock` or threads a `dispatch` fails the single-`button` assertion).
Proves: plan.md § Components `<PastDayDetail>` ("strictly read-only — no `dispatch`, no `BrickChip`/`TimelineBlock`/sheet/stepper/toggle; the only interactive element is `Close`") + § Decisions to honor (the read-only guarantee) — covers SPEC AC #13.
Tag: edge.

#### C-m9c-015 — success (PastDayDetail — renders the day's blocks/bricks + score)

Target file: `components/PastDayDetail.test.tsx`
Layer: Component
**GIVEN** `<PastDayDetail archivedDay={fixtureArchivedDay} isoDate="2026-04-29" onClose={vi.fn()} />` where `fixtureArchivedDay` scores `dayPct === 75`, has a block `"Morning"` (`start`/`end` set) holding two bricks, and one loose brick
**WHEN** rendered
**THEN** a header shows the date formatted via `dateLabel("2026-04-29")` (`"Wed, Apr 29"`) and the day's score as a read-only `"75%"` (`Math.round` of `dayScore` / `dayPct` over the `ArchivedDay`); the block `"Morning"` renders with its time range (`fmtRange`) and its two bricks as static rows showing each brick's name and `brickLabel(brick)` (the "done / units" text); the loose brick renders under a trailing "Loose bricks" group.
**AND** a `Close` control is present (`role="region" aria-label="Day detail"` on the panel).
Proves: plan.md § Components `<PastDayDetail>` (header date + score, static block/brick list with `fmtRange`/`brickLabel`, loose-bricks group, `Close`) — covers SPEC AC #12.
Tag: success.

#### C-m9c-016 — success / edge (day-open interaction — today → Day view; past archived → PastDayDetail; future/pre-start → nothing)

Target file: `components/MonthView.test.tsx`
Layer: Component
**GIVEN** `<MonthView state={fixtureState} onOpenDay={onOpenDay} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture (`history` has `"2026-05-17"`)
**WHEN** the `2026-05-18` (today) cell is clicked; then the `2026-05-17` (past, archived) cell is clicked; then a `future` cell (`2026-05-25`) and a `missed` cell (`2026-05-13`) are clicked
**THEN** clicking **today's** cell calls `onOpenDay("2026-05-18")` (which `AppShell` handles by `setView("day")` — verified end-to-end in `C-m9c-001` / `E-m9c-003`); it does **not** open `PastDayDetail`.
**AND** clicking the past **archived** `2026-05-17` cell opens `<PastDayDetail>` (a `role="region" aria-label="Day detail"` panel appears over the grid showing that day's blocks/bricks and score); clicking its `Close` dismisses the panel back to the grid.
**AND** clicking the `future` and `missed` cells does **nothing** — no `onOpenDay` call, no `PastDayDetail` panel (those cells are non-interactive `<div>`s per `C-m9c-007`).
Proves: plan.md § Components `<MonthView>` / `<PastDayDetail>` mounting (tap today → `onOpenDay`; tap past `scored` → `setOpenDate` → `PastDayDetail`; tap future/missed → no-op) + § Edge cases table — covers SPEC AC #12, AC #13.
Tag: edge.

### Accessibility (axe via Playwright)

`A-m9c-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9a sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9c-001 — a11y (Month grid — axe clean, keyboard, 430px)

Target file: `tests/e2e/m9c.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Month (Kingdom) view (under `count() > 0` guard)
**WHEN** axe-core runs against the month grid
**THEN** it returns **zero** violations across all rule categories; the grid is `role="grid"` with `role="row"`/`role="gridcell"` and `role="columnheader"` weekday headers; tappable `scored` day cells are reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carry a descriptive `aria-label` (weekday, full date, score); prev/next month buttons have `aria-label`s.
**AND** the 7-column grid renders within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`).
Proves: plan.md § Accessibility (month grid roles, keyboard, labels) + § Edge cases (430px) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-002 — a11y (ViewSwitcher — axe clean, tablist keyboard semantics)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the `ViewSwitcher` visible (under `count() > 0` guard)
**WHEN** axe-core runs and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations; the switcher container is `role="tablist"` (`aria-label="Calendar view"`); the Day and Month live segments are `role="tab"` with `aria-selected`, are keyboard-operable (Enter/Space activate; Left/Right arrows move between the two enabled tabs, skipping the disabled Week/Year); the Week and Year segments are `aria-disabled="true"` and removed from the tab sequence.
**AND** the four segments fit the 430px column with no overflow and each segment's hit area is ≥ 44px tall (ADR-031).
Proves: plan.md § Accessibility (switcher tablist/tab roles, arrow-key nav skipping disabled, `aria-disabled`) + § Decisions to honor (ADR-031) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-003 — a11y (PastDayDetail — axe clean, keyboard operable)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, a past archived day opened so `<PastDayDetail>` is showing (under `count() > 0` guard)
**WHEN** axe-core runs against the day-detail panel
**THEN** it returns **zero** violations; the panel is `role="region"` with `aria-label="Day detail"`; the `Close` control is focusable and carries an `aria-label`; the detail is a static read-only list with no form controls; it renders single-column at 430px with no horizontal overflow.
Proves: plan.md § Accessibility (`PastDayDetail` region role, `Close` label, static read-only, 430px) — covers SPEC AC #14.
Tag: a11y.

#### A-m9c-004 — a11y (DayCell heat-fill contrast at the alpha floor)

Target file: `tests/e2e/m9c.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Month view showing cells across the score range — a low-score (`0`, alpha-floor `0.12`) `scored` cell, a high-score (`100`, alpha `0.90`) `scored` cell, and a `missed` cell (under `count() > 0` guard)
**WHEN** axe-core runs against the grid with colour-contrast rules enabled
**THEN** it returns **zero** contrast violations — the date numeral (`var(--ink)` `#f5f1e8`) and the corner score numeral meet WCAG AA over every heat-fill alpha including the `0.12` floor (the numeral's contrast is against the near-`--bg` page, not the translucent fill); the `missed` cell's `var(--ink-dim)` date number over `var(--card)` also meets AA.
Proves: plan.md § Accessibility (contrast — heat-fill alpha floor `0.12` keeps the numeral AA-legible) + § Open questions for VERIFIER item (d) — covers SPEC AC #14.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name: switch to Month, day-cell scores render, open a past day read-only.

#### E-m9c-001 — success (switch to Month — Kingdom grid renders)

Target file: `tests/e2e/m9c.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Month` segment is tapped (under `count() > 0` guard)
**THEN** the Kingdom month grid appears — a `role="grid"` calendar for the current month with a month-year label and a Sun…Sat weekday header row; the Building view is no longer shown; tapping `Day` returns to the Building view; tapping the `Week` or `Year` segment does **nothing** (no crash, no view change, no error overlay).
Proves: plan.md § Components `<ViewSwitcher>`/`<MonthView>` + § View hosting — covers SPEC AC #9, AC #10, AC #15 (switch-to-Month E2E scenario).
Tag: success.

#### E-m9c-002 — success (day-cell scores render)

Target file: `tests/e2e/m9c.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` set so the current month has at least one archived `history` day scoring a known value and a live in-progress day; the app loaded fresh at `/` and switched to Month
**WHEN** the month grid is inspected (under `count() > 0` guard)
**THEN** the archived day's cell shows its computed score (date number + accent heat fill + numeric score), today's cell shows the live in-progress score and is marked today (the 2px accent ring), and a past in-range never-opened day shows the distinct `missed` indicator; a future cell is an inert empty cell; no console error.
Proves: plan.md § Components `<DayCell>`/`<MonthView>` + § Data model `dayScore` — covers SPEC AC #3, AC #5, AC #6, AC #7, AC #8, AC #15 (day-cell-scores E2E scenario).
Tag: success.

#### E-m9c-003 — success (open a past day read-only)

Target file: `tests/e2e/m9c.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9c-002` (a hand-built v2 payload with an archived `history` day), the app at `/`, Month view shown
**WHEN** the archived past-day cell is tapped, then the today cell is tapped (under `count() > 0` guards)
**THEN** tapping the archived past-day cell opens the read-only `PastDayDetail` panel — it shows that day's blocks/bricks and score, exposes **no** add/complete/edit affordance (only a `Close` control), and `Close` returns to the grid.
**AND** tapping **today's** cell switches to the editable Building (Day) view (not the read-only detail) — `onOpenDay(today)` → `AppShell` `setView("day")`.
Proves: plan.md § Components `<PastDayDetail>` + § Components `<MonthView>` mounting (tap today → Day view; tap past archived → read-only detail) — covers SPEC AC #12, AC #13, AC #15 (open-past-day E2E scenario).
Tag: success.

### Sandbox / preview note

Per the established M3–M9b pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 4 `A-m9c-*` and 3 `E-m9c-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9b.spec.ts` / `tests/e2e/m8.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9c-002`/`E-m9c-003` partly mitigate it by hand-building the `dharma:v1` payload via `page.evaluate` (a deterministic seed for the month grid that does not depend on a brick-creation UI flow). M9c introduces no general deterministic seeding helper (out of scope per ADR-022). The 12 unit + 16 component IDs (`U-m9c-*`, `C-m9c-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the date math, the `dayScore` helper, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9c is additive in test count: it adds 35 new `m9c` IDs (12 U + 16 C + 4 A + 3 E) and removes none.

**Amended — sanctioned, mechanical migration (the `BuildingClient` prop-refactor regression surface):** the M9c plan (§ File structure, § View hosting) refactors `app/(building)/BuildingClient.tsx` so it **no longer calls `usePersistedState()` internally** and instead **receives `state` + `dispatch` as props** from the new `AppShell`. The existing `BuildingClient` test files mount `<BuildingClient />` with **no props**:

- `app/(building)/BuildingClient.test.tsx` — mounts `render(<BuildingClient />)`.
- `app/(building)/BuildingClient.m4b.test.tsx` — mounts `render(<BuildingClient />)`.
- `app/(building)/BuildingClient.m4d.test.tsx` — mounts `render(<BuildingClient />)` (14 mount sites).
- `app/(building)/BuildingClient.m4e.test.tsx` — mounts `render(<BuildingClient />)` (10 mount sites).
- (`app/(building)/BuildingClient.imports.test.ts` — a static-import smoke test; needs no change.)

After the refactor, `<BuildingClient />` with no props would be a TypeScript error (and would not hydrate state), so **these four files MUST be amended** as part of the M9c BUILDER dispatch. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M4d "chooser-walk amendment" precedent at tests.md § "The following pre-existing tests must be amended…"). The amendment is **mechanical and assertion-preserving**:

- Each `render(<BuildingClient />)` is replaced with a render that supplies `state`/`dispatch` — **either** (a) `render(<AppShell />)` and the test drives the Day view through the shell, **or** (b) a tiny test harness component that calls `usePersistedState()` and renders `<BuildingClient state={s} dispatch={d} />` (recommended — it keeps each test's existing localStorage-seeding + clock setup intact and changes the least).
- **Every existing assertion in those four files is preserved verbatim** — the amendment changes only how `BuildingClient` is _mounted_ (its state source), never _what_ is asserted. The pre-refactor behaviors (`m4b` block ordering, `m4d` chooser routing, `m4e` overlap engine, the base `BuildingClient.test.tsx` cases) must all still pass against the prop-receiving `BuildingClient`. `C-m9c-013` is the dedicated no-regression anchor proving the refactor is behavior-neutral.
- This amendment **edits existing test files** — which is in tension with a naive reading of AC #15's "no regression to M1–M9b". The TESTS-phase reading, consistent with how M9b § Retired test IDs surfaced the M8 `schemaVersion` tension and how M4d sanctioned the chooser-walk amendments, is: AC #15 means **no _behavioral_ regression** — the M4b/M4d/M4e/base behaviors stay green — and mechanically re-pointing a mount call from an internal hook to a prop is a _sanctioned migration_, not a regression. **VERIFIER: please confirm** that (a) editing `BuildingClient.test.tsx` + `.m4b` + `.m4d` + `.m4e` to supply `state`/`dispatch` is sanctioned and assertion-preserving, OR (b) FAIL back to PLANNER to add an explicit "amended test files" note to `plan.md` § File structure / § Out of scope. This is surfaced, not silent.

### Spec gaps surfaced for VERIFIER

The plan resolves all five of its named spec gaps in-plan (SG-m9c-01..05 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `BuildingClient`-refactor test amendment.** See § Retired / amended test IDs above — the genuine plan↔test tension for M9c. The plan modifies `BuildingClient.tsx` but does not explicitly list the four `BuildingClient*.test.tsx` files as amended. This entry's reading is that they are sanctioned mechanical, assertion-preserving amendments; VERIFIER rules whether that is acceptable or whether the plan must name them. This is the M9c analogue of the M9b § Spec gaps item 1 (the M8 `schemaVersion` tension) — surfaced, not silently resolved by the BUILDER.

2. **`AppShell` test-mount of `usePersistedState`.** `AppShell` calls `usePersistedState()` (which touches `localStorage` and reads the clock via `today()`/`rollover`). `C-m9c-001`/`C-m9c-002` mount `<AppShell />` with a mocked `localStorage` and `vi.setSystemTime` — the same harness pattern the M8/M9b `usePersistedState` tests use. VERIFIER may confirm this is the intended harness; no plan ambiguity blocks the BUILDER.

3. **`PastDayDetail` score source.** The plan says `PastDayDetail`'s header score is `dayScore(state, isoDate)` "(equivalently `dayPct` over the `ArchivedDay`)". `C-m9c-015` asserts the rendered score equals `Math.round` of that value without pinning which of the two equivalent calls the BUILDER uses (the plan states they are equivalent — the archived branch of `dayScore` _is_ `dayPct` over the `ArchivedDay`). VERIFIER may note this; it is not an ambiguity — both produce the identical number.

No ADR is reversed: **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `dayScore` is a pure read, M9c writes no `history`, mutates no `AppState`, and bumps no schema (stays `v2`); **ADR-019** (`Recurrence`/`0=Sun…6=Sat` weekday convention) is honored by the grid's weekday headers and leading-blank count; **ADR-038** (forgiveness — missed = gray) governs the `missed` cell's gray card chip; **ADR-031** (44px touch targets) is enforced by `A-m9c-002` and the switcher/cell sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9c adds 35 `m9c` test IDs (12 U + 16 C + 4 A + 3 E) and retires none; it amends the four `BuildingClient*.test.tsx` files as a sanctioned mechanical migration (VERIFIER to confirm).

### AC → test-ID coverage map (all 15 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                       | Test ID(s)                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| #1  | Month view renders a 7-col calendar grid: weekday columns, week rows, a cell per date, leading/trailing alignment blanks | `U-m9c-001`, `U-m9c-002`, `U-m9c-003`, `U-m9c-005`, `C-m9c-008`, `C-m9c-011`      |
| #2  | Grid labeled with month name + year; weekday column headers shown                                                        | `C-m9c-008`                                                                       |
| #3  | Each in-range day cell shows its date-of-month number + a score indicator                                                | `C-m9c-003`, `C-m9c-008`, `C-m9c-009`, `E-m9c-002`                                |
| #4  | `dayScore` helper: archived→`dayPct`, today→live `dayPct`, no-data→`null` sentinel                                       | `U-m9c-007`, `U-m9c-008`, `U-m9c-009`, `U-m9c-010`, `U-m9c-011`, `U-m9c-012`      |
| #5  | An archived `history`-entry day cell displays that archived day's `dayPct`                                               | `U-m9c-007`, `U-m9c-012`, `C-m9c-003`, `C-m9c-009`, `E-m9c-002`                   |
| #6  | Today's cell displays the live in-progress `dayPct` AND is visually marked today                                         | `U-m9c-009`, `C-m9c-004`, `C-m9c-009`, `E-m9c-002`                                |
| #7  | A past in-range no-`history` day → distinct missed indicator, visually different from a future/pre-start blank           | `U-m9c-011`, `C-m9c-005`, `C-m9c-006`, `C-m9c-009`, `E-m9c-002`                   |
| #8  | A future date and a pre-`programStart` date → inert empty cells, no score                                                | `U-m9c-008`, `C-m9c-006`, `C-m9c-007`, `C-m9c-009`, `C-m9c-011`, `E-m9c-002`      |
| #9  | A Day·Week·Month·Year segmented switcher present; active view visually indicated                                         | `C-m9c-001`, `C-m9c-012`, `E-m9c-001`                                             |
| #10 | Day → Building view; Month → Kingdom grid; Week/Year present but inert (no crash)                                        | `C-m9c-001`, `C-m9c-002`, `C-m9c-012`, `C-m9c-013`, `E-m9c-001`                   |
| #11 | Prev/next move the grid + label by a month; Dec→Jan advances the year                                                    | `U-m9c-004`, `U-m9c-005`, `U-m9c-006`, `C-m9c-010`                                |
| #12 | Tapping today's cell → editable Building view; tapping a past archived day → read-only day detail                        | `C-m9c-015`, `C-m9c-016`, `E-m9c-003`                                             |
| #13 | Past-day detail exposes NO add/complete/edit affordance; tapping a future/pre-start date does nothing                    | `C-m9c-007`, `C-m9c-014`, `C-m9c-016`, `E-m9c-003`                                |
| #14 | 430px renders without overflow; axe clean; switcher + day cells keyboard-operable + screen-reader-labeled                | `A-m9c-001`, `A-m9c-002`, `A-m9c-003`, `A-m9c-004`                                |
| #15 | No regression to M1–M9b; quality gates clean; E2E covers switch-to-Month / day-cell-scores / open-past-day               | **gate (`npm run eval`)** + `C-m9c-013` (no-regression anchor) + `E-m9c-001..003` |

**Gate-verified portion:** AC #15's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b precedent. AC #15's no-regression half is anchored by `C-m9c-013` plus the sanctioned mechanical-migration discipline in § Retired / amended test IDs. All other 14 ACs map to at least one bespoke `m9c` test ID; every `m9c` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** archived `history` day → `U-m9c-007`/`C-m9c-009`; today's cell → `U-m9c-009`/`C-m9c-004`; past in-range missed day → `U-m9c-011`/`C-m9c-005`/`C-m9c-006`/`C-m9c-009`; future date → `C-m9c-006`/`C-m9c-007`/`C-m9c-009`; pre-`programStart` date → `C-m9c-006`/`C-m9c-007`/`C-m9c-011`; first-ever run (empty `history`) → `U-m9c-008`/`C-m9c-011`; a month with no history (future month) → `C-m9c-011`; Dec→Jan year boundary → `U-m9c-004`/`U-m9c-006`/`C-m9c-010`; `ArchivedDay` score 0 vs missed day → `U-m9c-011`/`C-m9c-005`; tapping inert cells → `C-m9c-007`/`C-m9c-016`; selecting Week/Year → `C-m9c-012`/`E-m9c-001`; UTC-drift → `U-m9c-005`; 430px → `A-m9c-001`/`A-m9c-002`/`A-m9c-003`; heat-fill alpha-floor contrast → `A-m9c-004`; reduced-motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9c adds no new motion, only the switcher's instant-collapse transition, asserted via the M0 motion-token discipline per the M3 SG-m3-18 precedent).

## Milestone 9d — Week view (Castle) + period scoring — Tests

This entry covers M9d — the **Castle view** (the week) and the first **period aggregate score**: the seven-row week layout, per-day score indicators, the prominent `weekScore` aggregate ring, prev/next-week navigation, the now-enabled **Week** switcher segment, and the reused read-only `PastDayDetail`. It is derived from the `plan.md` M9d entry (`## Milestone 9d — Week view (Castle) + period scoring — Plan`). Feature slug: `m9d`. ID prefixes: `U-m9d-`, `C-m9d-`, `A-m9d-`, `E-m9d-`. M9d adds a real UI surface (two new components + the new `lib/weekGrid.ts`), so it has a full four-layer test mix — unit (pure `lib/weekGrid.ts` date math + the pure `weekScore` helper), component (`WeekView`, `WeekDayCell`, the `<WeekAggregate>` ring, `ViewSwitcher` Week-enabled, `AppShell` week-view wiring), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9d has a **large genuine unit surface** — `lib/weekGrid.ts` is pure date math (`weekDates`/`addWeek`/`subWeek`/`weekRangeLabel`, called with literal ISO args, no clock, no `localStorage`) and `weekScore` in `lib/history.ts` is a pure `(state, anchorISO)` aggregator over `dayScore`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) precedent:

- **AC #13 (no regression to M1–M9c; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Week / per-day-scores + aggregate / open-past-day-read-only)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the `C-m9c-012` amendment in § Retired / amended test IDs below (the only stale-test collateral of enabling the Week segment) plus `C-m9d-013` (the `AppShell` Week-branch wiring is purely additive — Day/Month behavior byte-equivalent); the three named E2E scenarios are authored as real `test()` blocks (`E-m9d-001..003`).

All other 12 ACs map to at least one concrete bespoke `m9d` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b/M9c discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9d-004` is THE load-bearing `weekScore` correctness guard.** It asserts the **exact** numeric average for a fixture week with three archived scores `80`/`60`/`40` and **two** in-range missed days — `(80 + 60 + 40 + 0 + 0) / 5 = 36`, asserted `toBe(36)`, **not** `60` (the inflated `(80+60+40)/3` a mutant that excludes missed days would yield). A mutant that drops the missed-day `0`s from the numerator OR from the denominator fails this exact-value assertion. SG-m9d-01's honest-scoreboard rule is enforced numerically.
- **`U-m9d-006` (`weekScore` no-data sentinel) asserts strict `=== null`**, not falsy — a mutant returning `0` for a fully-future / fully-pre-start week fails, because `WeekAggregate`'s no-data branch (`C-m9d-008`) depends on telling the `null` sentinel apart from a real `0`.
- **`U-m9d-005` (`weekScore` purity + clock-independence) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts `weekScore` neither throws, mutates, nor reads `Date.now()` — it derives "today" from `state.currentDate`, never the system clock. Two calls with the same args return `===`-equal results. A mutant that calls `new Date()` or mutates `state` fails.
- **`U-m9d-002` (UTC-drift) computes `weekDates` for a known week and asserts every one of the seven `iso` strings exactly, then re-runs under a faked negative-UTC-offset environment** (`vi.stubEnv("TZ", "America/Los_Angeles")` / the M9a `appliesOn.tz.test.ts` faked-offset pattern) — a mutant using `new Date(isoString)` (UTC midnight) drifts a day and fails the cross-environment equality. The plan's § Week-date math forbids `new Date(isoString)`.
- **`U-m9d-003` (`weekDates` agrees with the M9c month grid)** asserts the seven dates `weekDates` returns for an anchor are the identical Sun→Sat span that anchor's row occupies in `monthGridCells` — a mutant using a Monday-start (`getDay()` off-by-one) convention fails (SG-m9d-03).
- **`C-m9d-005` (the `missed` vs score-0 distinctness) is a structural absence assertion** — a `missed` `WeekDayCell` row has **no** heat fill and **no** score numeral text node; a `scored` score-0 row has the `0.12`-alpha accent fill **and** a numeral "0". A mutant rendering them identically fails.
- **`C-m9d-007` (inert-cell tappability is structural) asserts `future`/`pre-start`/`missed` rows are NOT `<button>`s** (`queryByRole("button")` within the row → `null`) — AC #11's "tapping a future / pre-start day does nothing" is proven by the absence of an interactive role, not a guarded no-op handler a mutant could un-guard.
- **`C-m9d-008` (no-data aggregate) asserts a `—` em-dash glyph and NO `0` / NO `%`-of-zero** — a mutant rendering `0%` for a fully-future week fails. The ring `role="img"` `aria-label` is asserted to be `"Week score: no data"`, not `"Week score 0 percent"`.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9d-001..009` | 9      |
| Component (Vitest + Testing Library)  | `C-m9d-001..014` | 14     |
| Accessibility (axe via Playwright)    | `A-m9d-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m9d-001..003` | 3      |
| **Total**                             |                  | **29** |

ID series start values were supplied by the orchestrator: `U-m9d-001`, `C-m9d-001`, `A-m9d-001`, `E-m9d-001`.

**Fixture dates (ISO, weekdays verified against the proleptic Gregorian calendar):**
`2026-05-01` Fri (**`programStart`**) · `2026-05-10` Sun · `2026-05-16` Sat · `2026-05-17` Sun · `2026-05-18` Mon (**today**, per `currentDate`) · `2026-05-23` Sat · `2026-05-24` Sun · `2026-05-30` Sat · `2026-05-31` Sun · `2026-06-06` Sat · `2026-04-26` Sun · `2026-04-30` Thu · `2026-12-27` Sun · `2026-12-31` Thu · `2027-01-01` Fri · `2027-01-02` Sat · `2025-12-28` Sun · `2026-01-03` Sat.

**The named fixture weeks (all Sunday-start, verified):**

| Week             | Span (Sun→Sat)              | Character                                                                     |
| ---------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **W-today**      | `2026-05-17` … `2026-05-23` | contains today (`2026-05-18` Mon, index 1); days 19–23 are future             |
| **W-past**       | `2026-05-10` … `2026-05-16` | fully past, fully in-range (all ≥ `programStart 2026-05-01`, all ≤ today)     |
| **W-future**     | `2026-05-24` … `2026-05-30` | fully future (all > today `2026-05-18`)                                       |
| **W-prestart**   | `2026-04-26` … `2026-05-02` | straddles `programStart`: `04-26`…`04-30` pre-start, `05-01`/`05-02` in-range |
| **W-monthcross** | `2026-05-31` … `2026-06-06` | straddles the May→June month boundary                                         |
| **W-yearcross**  | `2026-12-27` … `2027-01-02` | straddles the Dec 2026→Jan 2027 year boundary                                 |

**Standing `weekScore` fixture `state` unless a test overrides it:** `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, the live in-progress day (`blocks`/`categories`/`looseBricks`) scoring `dayPct === 40`. `history` for the W-today scoring tests = `{ "2026-05-17": <ArchivedDay scoring 100> }` → `weekScore(state, <any day in W-today>)` = included days are `05-17` (archived 100) and `05-18` (today, live 40); `05-19`…`05-23` future, excluded → `(100 + 40) / 2 = `**`70`**. For the W-past missed-day fixture (`U-m9d-004`) `history` = `{ "2026-05-12": 80, "2026-05-13": 60, "2026-05-14": 40 }` (three `ArchivedDay`s scoring those `dayPct`s); `05-10`, `05-11`, `05-15`, `05-16` have no entry — `05-10`/`05-11`/`05-15`/`05-16` are all in-range past missed days, but the fixture pins **exactly two** of them as the counted missed days by setting `programStart` to `"2026-05-12"` for that test (so `05-10`/`05-11` become pre-start and are excluded) → included = `05-12`(80), `05-13`(60), `05-14`(40), `05-15`(missed→0), `05-16`(missed→0) → `(80+60+40+0+0)/5 = `**`36`**.

### Unit (Vitest)

`U-m9d-001..003` exercise the pure `lib/weekGrid.ts` (no clock, no `localStorage` — called with literal ISO-string args). `U-m9d-004..009` exercise the `weekScore` helper added to `lib/history.ts` (pure `(state, anchorISO)` — no clock, no `localStorage`, driven directly).

#### U-m9d-001 — success (weekGrid module surface — weekDates / addWeek / subWeek / weekRangeLabel)

Target file: `lib/weekGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` exported from `lib/weekGrid.ts`
**WHEN** the module's exports are inspected and `weekDates` is called for a mid-week anchor
**THEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` are all `typeof === "function"`; `weekDates("2026-05-20")` (a Wednesday anchor in W-today) returns a `string[]` of **exactly length 7**; every element is a zero-padded `YYYY-MM-DD` ISO string (`"2026-05-09"`, never `"2026-05-9"`); the array is `["2026-05-17","2026-05-18","2026-05-19","2026-05-20","2026-05-21","2026-05-22","2026-05-23"]` — Sun→Sat, ascending by one day.
**AND** `weekDates` accepts **any** day of the target week as the anchor and returns the identical seven dates: `weekDates("2026-05-17")` (the Sunday), `weekDates("2026-05-20")` (a Wednesday) and `weekDates("2026-05-23")` (the Saturday) all `toEqual` the same array — `weekDates` re-normalizes to the week's Sunday.
Proves: plan.md § Week-date math (`weekDates` → seven Sun→Sat ISO dates, length 7, zero-padded, anchor-agnostic via Sunday normalization) + § File structure (`lib/weekGrid.ts` module surface) — covers SPEC AC #1.
Tag: success.

#### U-m9d-002 — edge (weekDates — month/year boundaries + UTC-drift-free, mutation-resistant)

Target file: `lib/weekGrid.test.ts`
Layer: Unit
**GIVEN** `weekDates`, `addWeek`, `subWeek`, `weekRangeLabel` from `lib/weekGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** the boundary weeks are computed in **both** environments
**THEN** in **both** environments: `weekDates("2026-06-02")` (W-monthcross anchor) `toEqual` `["2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06"]` — crossing the May→June boundary correctly; `weekDates("2026-12-30")` (W-yearcross anchor) `toEqual` `["2026-12-27","2026-12-28","2026-12-29","2026-12-30","2026-12-31","2027-01-01","2027-01-02"]` — the `iso` years are correct on both sides of the year boundary; every `iso` string is byte-identical between the two timezone runs (no day drift).
**AND** `addWeek("2026-12-30")` returns a date in the Jan 6–12, 2027 week and `subWeek("2026-01-01")` returns a date in the Dec 21–27, 2025 week — `±7`-day arithmetic rolls the month/year correctly; `weekRangeLabel("2026-12-30")` returns `"Dec 27, 2026 – Jan 2, 2027"`. There is **no** `new Date("2026-05-01")`-style ISO string-parse anywhere in `lib/weekGrid.ts` — only the multi-arg local-time constructor (`new Date(y, m, d)`); a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality.
Proves: plan.md § Week-date math (boundary-correct `weekDates`/`addWeek`/`subWeek`; no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson) — covers SPEC AC #1, AC #2, AC #9.
Tag: edge.

#### U-m9d-003 — edge (weekRangeLabel formatting + week-start agrees with the M9c month grid)

Target file: `lib/weekGrid.test.ts`
Layer: Unit
**GIVEN** `weekRangeLabel` and `weekDates` from `lib/weekGrid.ts`, and `monthGridCells` from `lib/monthGrid.ts` (M9c)
**WHEN** `weekRangeLabel` is called for a same-month week, a month-spanning week, and a year-spanning week; and `weekDates` is cross-checked against `monthGridCells`
**THEN** `weekRangeLabel("2026-05-20")` returns `"May 17–23, 2026"` (shared month + year collapsed); `weekRangeLabel("2026-06-02")` returns `"May 31 – Jun 6, 2026"` (months expanded, shared year); `weekRangeLabel("2026-12-30")` returns `"Dec 27, 2026 – Jan 2, 2027"` (year expanded on both endpoints) — matching SPEC AC #2's worked examples.
**AND** week-start agreement (SG-m9d-03): for the anchor `2026-05-20`, the seven `weekDates` strings `["2026-05-17"…"2026-05-23"]` are exactly the seven consecutive `{ kind: "date" }` cells that occupy one full Sun→Sat row of `monthGridCells(2026, 4)` (May 2026) — the week view and the month grid can never disagree on which seven dates form a week; both use the `0=Sun` `getDay()` convention.
Proves: plan.md § Week-date math (`weekRangeLabel` month/year collapse-or-expand rules; SG-m9d-03 — Sunday-start, week helper agrees with the M9c `monthGrid.ts`) — covers SPEC AC #1, AC #2.
Tag: edge.

#### U-m9d-004 — success / edge (weekScore — THE honest-week-average contract, missed = 0, mutation-resistant)

Target file: `lib/history.test.ts` (EXISTS — `weekScore` cases appended; no `m9b`/`m9c` ID touched)
Layer: Unit
**GIVEN** `weekScore` exported from `lib/history.ts`, and a fixture `state` with `programStart: "2026-05-12"`, `currentDate: "2026-05-18"`, and `history = { "2026-05-12": <ArchivedDay dayPct 80>, "2026-05-13": <ArchivedDay dayPct 60>, "2026-05-14": <ArchivedDay dayPct 40> }` — `2026-05-15` and `2026-05-16` have **no** `history` entry (in-range past missed days); `2026-05-10`/`2026-05-11` are pre-`programStart`
**WHEN** `weekScore(state, "2026-05-13")` is called (an anchor in the W-past week `2026-05-10`…`2026-05-16`)
**THEN** it returns the **number `36`** — `expect(weekScore(state, "2026-05-13")).toBe(36)`. The seven week dates are classified: `05-10`/`05-11` are `< programStart` → **excluded** from numerator and denominator; `05-12`/`05-13`/`05-14` archived → contribute `80`/`60`/`40`; `05-15`/`05-16` are in-range (`programStart ≤ d ≤ currentDate`) past days with no `history` entry → `dayScore` returns `NO_DATA` → each contributes **`0`** and **is counted** in the denominator. Numerator `= 80+60+40+0+0 = 180`; denominator `= 5`; result `= 36`.
**AND** the value is asserted to be **`36`, NOT `60`** — `60` is the inflated `(80+60+40)/3` average a mutant that drops missed days from the numerator OR denominator would produce. A mutant that excludes the two missed days fails this exact assertion. This is the numeric enforcement of SG-m9d-01 (the honest-scoreboard rule).
Proves: plan.md § `weekScore` helper (the honest-week average — included days summed, missed-in-range `NO_DATA → 0` contribution counted in numerator AND denominator, pre-start excluded from both) + § Decisions to honor (SG-m9d-01) — covers SPEC AC #4.
Tag: edge.

#### U-m9d-005 — edge (weekScore — purity, clock-independence, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the standing W-today scoring fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` keyed on `"2026-05-17"`), deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.categories`, `state.looseBricks` — passed to `weekScore`
**WHEN** `weekScore(frozenState, "2026-05-20")` is called twice with the identical args, and the system clock is advanced (`vi.setSystemTime`) between the two calls
**THEN** neither call throws (`expect(() => weekScore(frozenState, iso)).not.toThrow()`) — `weekScore` writes into neither `state` nor any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** both calls return **`70`** and are deep-equal **regardless of the advanced system clock** — `weekScore` derives "today" from `state.currentDate`, **never** `new Date()` / `Date.now()`; it reads no clock and no `localStorage`; it is a pure function of `(state, anchorISO)`. A mutant that reads the system clock returns a different result after the clock is advanced and fails.
Proves: plan.md § `weekScore` helper (purity — "reads no clock and no `localStorage`; today derived from `state.currentDate`; pure function of `(state, anchorISO)`") + § Decisions to honor (ADR-045 — `history` consumed read-only) + § Open questions for VERIFIER item (a) — covers SPEC AC #4.
Tag: edge.

#### U-m9d-006 — edge (weekScore — no-data sentinel for fully-future / fully-pre-start weeks, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` and the `NO_DATA` sentinel from `lib/history.ts`, the standing fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`)
**WHEN** `weekScore` is called for the W-future week (`2026-05-24`…`2026-05-30`, every day `> currentDate`) and for a fully-pre-`programStart` week (anchor `"2026-04-15"`, the week `2026-04-12`…`2026-04-18`, every day `< programStart`)
**THEN** each call returns **exactly `null`** — `expect(weekScore(state, "2026-05-27")).toBe(null)` and `expect(weekScore(state, "2026-04-15")).toBe(null)` (strict `=== null`, NOT merely falsy, NOT `0`); `NO_DATA` is exported and `NO_DATA === null`. The denominator is `0` (no day is in-range and non-future), so `weekScore` returns the sentinel rather than dividing by zero.
**AND** `0` is **never** returned for the no-data case — `0` is reserved for "the week happened and every included day scored 0" (a distinct, truthful statement); a mutant returning `0` for an empty denominator fails the strict `toBe(null)`.
Proves: plan.md § `weekScore` helper (no-data case — denominator `0` → `NO_DATA`, never `0`, never a divide-by-zero crash) + § Edge cases (fully future week / week before `programStart`) — covers SPEC AC #6.
Tag: edge.

#### U-m9d-007 — success (weekScore — today's live dayPct contributes to the aggregate)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and the standing W-today fixture `state` — `currentDate: "2026-05-18"`, the live in-progress day scoring `dayPct === 40`, `history = { "2026-05-17": <ArchivedDay dayPct 100> }`
**WHEN** `weekScore(state, "2026-05-18")` is called (an anchor in W-today `2026-05-17`…`2026-05-23`)
**THEN** it returns the **number `70`** — `expect(weekScore(state, "2026-05-18")).toBe(70)`. `05-17` is archived → `dayScore` returns `100`; `05-18` equals `currentDate` → `dayScore` returns the **live** `dayPct === 40` (today's in-progress score, AC #7); `05-19`…`05-23` are `> currentDate` → future → excluded. Numerator `= 100 + 40 = 140`; denominator `= 2`; result `= 70`.
**AND** when the live in-progress day is mutated in a sibling fixture so `dayPct` rises to `80`, `weekScore` for the same anchor returns `(100 + 80)/2 = 90` — today's contribution tracks the live `dayPct` (it is not a stale snapshot); future days remain excluded.
Proves: plan.md § `weekScore` helper (week-containing-today branch — today contributes its live `dayPct` via `dayScore`'s `currentDate` branch; future days excluded) + § Edge cases (a week containing today) — covers SPEC AC #4, AC #7.
Tag: success.

#### U-m9d-008 — edge (weekScore — empty history first run; straddling programStart)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and two fixtures: (a) a first-run `state` with `history === {}`, `programStart: "2026-05-13"`, `currentDate: "2026-05-15"`, live day scoring `dayPct === 50`; (b) the W-prestart `state` with `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history = { "2026-05-01": <ArchivedDay dayPct 90> }`
**WHEN** `weekScore` is called on each
**THEN** for (a) — W-today anchor `"2026-05-15"`, week `2026-05-10`…`2026-05-16`: `05-10`/`05-11`/`05-12` are `< programStart` → excluded; `05-13`/`05-14` are in-range past days with no `history` entry → missed → contribute `0`; `05-15` equals `currentDate` → live `dayPct === 50`; `05-16` is `> currentDate` → future → excluded. Result `= (0 + 0 + 50)/3 = 16.66…` → `weekScore` returns the un-rounded `50/3` (rounding is the `WeekAggregate` display's job, not the helper's) — the test asserts `toBeCloseTo(16.667, 2)`. No crash on the empty `history` map.
**AND** for (b) — W-prestart anchor `"2026-04-29"`, week `2026-04-26`…`2026-05-02`: `04-26`…`04-30` are `< programStart "2026-05-01"` → excluded from numerator AND denominator; `05-01` archived → `90`; `05-02` is in-range past missed → `0`. Result `= (90 + 0)/2 = 45`.
Proves: plan.md § `weekScore` helper (empty-`history` first run — safe, in-range past days contribute `0`, today live, future excluded) + § Edge cases (empty `history` first run; a week straddling `programStart`) — covers SPEC AC #4, AC #6.
Tag: edge.

#### U-m9d-009 — success / edge (weekScore — a fully-past week averages all seven in-range days; missed vs 0-archived both count 0)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `weekScore` from `lib/history.ts` and a W-past fixture `state` — `programStart: "2026-05-01"`, `currentDate: "2026-05-18"` (so all of `2026-05-10`…`2026-05-16` are in-range and `≤ currentDate`), `history` holding archived days for all seven dates with `dayPct`s `70, 0, 50, 100, 30, 90, 60` for `05-10`…`05-16` respectively (note `05-11` is a real `ArchivedDay` that **scored `0`** — the user tried, completed nothing)
**WHEN** `weekScore(state, "2026-05-13")` is called
**THEN** it returns the **number** `(70 + 0 + 50 + 100 + 30 + 90 + 60) / 7 = 400 / 7 = 57.14…` — the test asserts `toBeCloseTo(57.143, 2)`; all seven days are in-range and non-future → all seven included; the denominator is `7`.
**AND** in a sibling fixture where `05-11`'s `ArchivedDay` is **removed** (so `05-11` becomes a missed day with no `history` entry — but still in-range and past), `weekScore` returns the **same** `400/7` — a `missed` day (`dayScore → NO_DATA → 0`) and a `0`-scoring `ArchivedDay` (`dayScore → 0`) contribute the **identical `0`** to the average and are both counted in the denominator; they are indistinguishable to `weekScore` (the distinction is purely visual — see `C-m9d-005`).
Proves: plan.md § `weekScore` helper (a fully-past week — all seven `≤ currentDate` & `≥ programStart` included; missed-day `0` and 0-archived `0` contribute identically) + § Edge cases (a fully past week; a missed day vs a 0-score archived day) — covers SPEC AC #4.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9d-001..003` cover `<WeekView>` (layout, range label, prev/next nav); `C-m9d-004..007` cover `<WeekDayCell>` (the four `kind`s, distinctness, structural tappability); `C-m9d-008..009` cover `<WeekAggregate>` (the score ring + the no-data state); `C-m9d-010..011` cover `<ViewSwitcher>` with Week enabled; `C-m9d-012..013` cover `<AppShell>` week-view wiring; `C-m9d-014` covers the day-tap routing (today → Day view, past archived → `PastDayDetail`). All render with React Testing Library; where a clock read matters (`WeekView`'s initial anchor + cell classification reads `today()`) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `<AppShell />` (which calls `usePersistedState`).

#### C-m9d-001 — success (WeekView — seven Sun→Sat rows + date-range label)

Target file: `components/WeekView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing W-today fixture state
**WHEN** rendered (the initial anchor is today → the W-today week `2026-05-17`…`2026-05-23`)
**THEN** exactly **seven** `WeekDayCell` rows render, inside a `role="list"` container (`aria-label="Week days"`), each row a `role="listitem"`; the rows are ordered Sun→Sat — the first row's weekday label is "Sun" (`2026-05-17`), the last is "Sat" (`2026-05-23`); each row shows its day-of-month number.
**AND** a week date-range label reads `"May 17–23, 2026"` (via `weekRangeLabel`), rendered in the display serif at `var(--fs-22)`.
Proves: plan.md § Components `<WeekView>` (seven Sun→Sat `WeekDayCell` rows in a `role="list"`; `weekRangeLabel` heading) — covers SPEC AC #1, AC #2.
Tag: success.

#### C-m9d-002 — success (WeekView — prev/next week nav updates layout, label, aggregate)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, starting on the W-today week (`"May 17–23, 2026"`)
**WHEN** the "Previous week" button is clicked once, then the "Next week" button is clicked twice
**THEN** the two nav controls are `<button>`s carrying `aria-label="Previous week"` / `"Next week"`; after one Previous click the label reads `"May 10–16, 2026"`, the seven rows are `2026-05-10`…`2026-05-16`, and the aggregate recomputes for the new week; after two Next clicks the label reads `"May 24–30, 2026"` and the rows are the W-future week — the layout, range label, and aggregate **all** recompute from the new anchor.
**AND** the anchor changes are session-only React state — they call `setAnchor(subWeek(...))` / `setAnchor(addWeek(...))`; no `localStorage` write occurs on nav (asserted by a `localStorage.setItem` spy showing zero calls attributable to nav).
Proves: plan.md § Components `<WeekView>` (prev/next-week buttons → `setAnchor(subWeek/addWeek)`; label + layout + aggregate recompute; session-only anchor) — covers SPEC AC #9.
Tag: success.

#### C-m9d-003 — edge (WeekView — prev/next week across month and year boundaries)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` with `programStart: "2026-01-01"` and `currentDate` / `vi.setSystemTime` set so the displayed anchor can be navigated to `"2026-06-02"` (W-monthcross) and to `"2026-12-30"` (W-yearcross)
**WHEN** the week is navigated to the W-monthcross week, then to the W-yearcross week
**THEN** the W-monthcross week renders seven rows `2026-05-31`…`2026-06-06` with the label `"May 31 – Jun 6, 2026"` — the layout spans the May→June boundary without a gap or duplicate; the W-yearcross week renders `2026-12-27`…`2027-01-02` with the label `"Dec 27, 2026 – Jan 2, 2027"` — the seven rows carry the correct `iso` years on both sides of the year boundary.
Proves: plan.md § Components `<WeekView>` + § Week-date math (prev/next nav crosses month + year boundaries; `addWeek`/`subWeek` `±7` arithmetic) + § Edge cases (a week straddling a month or year boundary) — covers SPEC AC #2, AC #9.
Tag: edge.

#### C-m9d-004 — success (WeekDayCell — scored row renders weekday + date + heat fill + numeral)

Target file: `components/WeekDayCell.test.tsx` (NEW)
Layer: Component
**GIVEN** `<WeekDayCell kind="scored" date="2026-05-16" dayOfMonth={16} weekdayLabel="Sat" score={60} isToday={false} onOpen={vi.fn()} />`
**WHEN** rendered
**THEN** the row displays the weekday label `"Sat"` and the date number `16`; it renders a numeric score `60` (the `Math.round(score)` numeral); the row carries the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (asserted via inline style / a `data-score`-derived style hook — the identical heat formula M9c's `DayCell` uses); the row is a `<button>` (tappable) with an `aria-label` of the form `"Saturday, May 16, 2026, score 60 percent"`; the row is ≥ 44px tall (ADR-031).
**AND** clicking it calls `onOpen` exactly once.
Proves: plan.md § Components `<WeekDayCell>` (`scored` kind — weekday + date + accent heat fill at scaled alpha + numeral; tappable `<button>` ≥ 44px) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) — covers SPEC AC #3.
Tag: success.

#### C-m9d-005 — edge (WeekDayCell — missed vs scored-zero distinctness, mutation-resistant)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** two renders — `<WeekDayCell kind="scored" score={0} date="2026-05-15" dayOfMonth={15} weekdayLabel="Fri" onOpen={vi.fn()} />` and `<WeekDayCell kind="missed" date="2026-05-13" dayOfMonth={13} weekdayLabel="Wed" />`
**WHEN** each is rendered and inspected
**THEN** the `scored` score-`0` row carries the **minimum-alpha** `var(--accent)` heat fill (alpha `0.12`) **and** a visible score numeral text node `"0"`; the `missed` row has **no** heat fill (flat `var(--card)` background with a 1px `var(--card-edge)` border) and **no** score numeral text node at all — the two are structurally distinct (a mutant rendering them identically fails).
**AND** the `missed` row's weekday + date text is `var(--ink-dim)`; it is a plain `<div>`, not a `<button>` (`queryByRole("button")` within it → `null`), carrying no interactive role — it is read-only with no detail (ADR-038 forgiveness — gray, not red, no shame).
Proves: plan.md § Components `<WeekDayCell>` (per-`kind` table — `scored` score-0 = `0.12`-alpha fill + numeral "0"; `missed` = flat `--card` row, no fill / no numeral; distinctness) + § Edge cases (a missed day vs a 0-score archived day) + § Decisions to honor (ADR-038) — covers SPEC AC #3.
Tag: edge.

#### C-m9d-006 — edge (WeekDayCell — future and pre-start rows are inert)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** `<WeekDayCell kind="future" date="2026-05-25" dayOfMonth={25} weekdayLabel="Mon" />` and `<WeekDayCell kind="pre-start" date="2026-04-28" dayOfMonth={28} weekdayLabel="Tue" />`
**WHEN** each is rendered and inspected
**THEN** both rows render the weekday label + date number in `var(--ink-dim)` at low opacity, with a transparent background and no border; **neither** renders a heat fill or a score numeral; both are plain `<div>`s with no interactive role (`queryByRole("button")` → `null`) and are not focusable.
**AND** the `future` and `pre-start` rows are visually identical inert treatments (the plan's per-`kind` table maps `pre-start` to "identical inert treatment to `future`").
Proves: plan.md § Components `<WeekDayCell>` (per-`kind` table — `future` / `pre-start` inert rows, plain `<div>`, no fill, no numeral) — covers SPEC AC #3, AC #11.
Tag: edge.

#### C-m9d-007 — edge (WeekDayCell — today marker; inert-cell tappability is structural, mutation-resistant)

Target file: `components/WeekDayCell.test.tsx`
Layer: Component
**GIVEN** a `scored` row with `isToday={true}` (`<WeekDayCell kind="scored" isToday date="2026-05-18" dayOfMonth={18} weekdayLabel="Mon" score={40} onOpen={vi.fn()} />`) and the four inert/missed rows from `C-m9d-005`/`C-m9d-006`
**WHEN** each is rendered
**THEN** the `isToday` `scored` row additionally carries a 2px `var(--accent)` ring/outline so today is unmistakable; its `aria-label` includes `", today"` (e.g. `"Monday, May 18, 2026, today, score 40 percent"`).
**AND** of the rows tested across `C-m9d-004..007`, **only** the `scored` rows are `<button>`s — the `missed`, `future`, and `pre-start` rows expose **no** `role="button"` (`queryByRole("button")` within each → `null`): "tapping a future / pre-start / missed day does nothing" (AC #11) is structural — proven by the absence of an interactive role, not a guarded no-op handler a mutant could un-guard.
Proves: plan.md § Components `<WeekDayCell>` (`isToday` 2px accent ring + `", today"` aria-label; tappable cells are `<button>`, non-tappable are plain `<div>` — structural no-op) — covers SPEC AC #3, AC #11.
Tag: edge.

#### C-m9d-008 — edge (WeekAggregate — no-data state renders the em-dash, never 0, mutation-resistant)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` navigated to the W-future week (`2026-05-24`…`2026-05-30`, `weekScore` → `NO_DATA`), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the week aggregate display is inspected
**THEN** the aggregate renders a **distinct no-data treatment** — the ring track only (no progress arc) and a `—` (em-dash) glyph in `var(--ink-dim)` in place of the numeral, with the "Week" / "Castle score" label still shown; there is **no** `"0%"`, **no** `"0"` numeral, and no crash (`WeekView` branches on `weekScore(...) === null`).
**AND** the ring is `role="img"` with `aria-label="Week score: no data"` (NOT `"Week score 0 percent"`); a mutant that renders `0%` for an empty-denominator week fails both the `—`-glyph assertion and the aria-label assertion.
Proves: plan.md § Components `<WeekAggregate>` (no-data state — ring track only, `—` glyph, never `0%`, never a crash; `role="img"` `aria-label="Week score: no data"`) + § Edge cases (a fully future week) — covers SPEC AC #6.
Tag: edge.

#### C-m9d-009 — success (WeekAggregate — the week score is displayed prominently as a ring + numeral)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={vi.fn()} />` on the W-today week, `vi.setSystemTime` → `"2026-05-18"`, the standing fixture (`weekScore` for this week `= (100 + 40)/2 = 70`)
**WHEN** the week aggregate display is inspected
**THEN** the aggregate is rendered **prominently above the seven day rows** as a ring + centered numeral — an SVG ring drawn with a `var(--accent)` progress arc on a `var(--card-edge)` track, with a centered numeral `"70%"` (`Math.round(weekScore)` + a `%` glyph) in the display serif at `var(--fs-32)`, `var(--ink)`; a short "Week" / "Castle score" label in `var(--font-ui)` `var(--ink-dim)` sits with the ring.
**AND** the ring is `role="img"` with `aria-label="Week score 70 percent"`; the numeral is rendered as visible text (not color-only); the ring uses only **defined** M0 tokens — there is no `var(--surface-2)` reference anywhere in the week-aggregate markup.
Proves: plan.md § Components `<WeekAggregate>` (prominent ring + centered numeral; ADR-033 score-signature identity; only defined M0 tokens — no `--surface-2`) — covers SPEC AC #5, AC #7.
Tag: success.

#### C-m9d-010 — success / edge (ViewSwitcher — Week segment now enabled, selectable, fires onSelect; Year stays disabled)

Target file: `components/ViewSwitcher.test.tsx` (EXISTS — see § Retired / amended test IDs for the `C-m9c-012` amendment)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />` with the M9d-widened props type (`view: "day" | "month" | "week"`)
**WHEN** rendered, the four segments inspected, then `Week`, then `Year` are clicked
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — inside a `role="tablist"` (`aria-label="Calendar view"`); **Day, Week, and Month** are live `role="tab"` `<button>`s (Week **no longer** carries `aria-disabled` / `disabled`); clicking `Week` calls `onSelect("week")` **exactly once**; re-rendering with `view="week"` sets the Week tab's `aria-selected="true"` and the filled-`var(--accent)` active style.
**AND** the **Year** segment is the **lone** remaining `<button disabled aria-disabled="true">` — clicking it fires `onSelect` **zero** times, causes no crash, no view change; arrow-key navigation now moves across the **three** enabled tabs (Day/Week/Month), skipping the single disabled Year tab.
Proves: plan.md § Components `<ViewSwitcher>` change (Week `live: false → true`; props widen to include `"week"`; Week selectable + fires `onSelect`; Year stays the lone disabled segment) — covers SPEC AC #8.
Tag: edge.

#### C-m9d-011 — success (ViewSwitcher — selecting Week from inside AppShell renders the Castle view)

Target file: `app/(building)/AppShell.test.tsx` (EXISTS — `week`-branch cases appended)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` payload and `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `ViewSwitcher` `Week` segment is clicked
**THEN** the Castle week view appears — the `role="list"` `aria-label="Week days"` container with seven `WeekDayCell` rows and the week aggregate ring are in the DOM; the Building (Day) view and the Kingdom (Month) grid are no longer shown; the `Week` tab shows `aria-selected="true"`.
**AND** clicking `Day` returns to the Building view and clicking `Month` shows the Kingdom grid — Day↔Week↔Month all switch correctly; clicking the `Year` segment does nothing (no crash, no view change).
Proves: plan.md § Components `<ViewSwitcher>` + § AppShell wiring (selecting Week renders `<WeekView>`; the active-view indicator updates; Year inert) — covers SPEC AC #8.
Tag: success.

#### C-m9d-012 — success (AppShell — week-view wiring, single usePersistedState preserved)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload, `vi.setSystemTime` → `"2026-05-18"`, `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush, then the view is switched Day→Week→Month→Week→Day
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across every view switch — adding the `"week"` branch does not introduce a second hydration pass and does not re-run rollover; the `view` state is `"day" | "month" | "week"` and defaults to `"day"`.
**AND** `<WeekView>` is rendered with `state={state}` and `onOpenDay={handleOpenDay}` — the **same** `AppState` object and the same day-open handler the `MonthView` branch receives; a remount (simulating a refresh) returns the view to **Day** (the `view` state is session-only React state, not persisted — no `view` field is written to `localStorage`).
Proves: plan.md § AppShell wiring (`view` widened to include `"week"`; `<WeekView state={state} onOpenDay={handleOpenDay} />` for the `"week"` branch; `usePersistedState()` still runs exactly once; `view` session-only) + § Out of scope (persisting the selected `view`) — covers SPEC AC #8, AC #13.
Tag: success.

#### C-m9d-013 — success (AppShell — Day/Month branches unchanged; week wiring is purely additive)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** the M9c `AppShell` Day↔Month behavior (`C-m9c-001`/`C-m9c-002`) and the M9d-widened `AppShell`
**WHEN** `<AppShell />` mounts and the Day and Month views are exercised exactly as the M9c tests do
**THEN** the Day view (`BuildingClient`) and the Month view (`MonthView`) render and behave **identically** to their pre-M9d behavior — widening `view` to include `"week"` and adding the `"week"` render branch is purely additive; the existing M9c `AppShell` cases (`C-m9c-001`/`C-m9c-002`) pass unchanged; no console error, no hydration-mismatch warning. This ID is the M9d no-regression anchor for `AppShell` (AC #13).
Proves: plan.md § AppShell wiring ("the existing M9c AppShell cases are unaffected — they only exercise Day/Month") + § Regression surface (`AppShell.test.tsx` — no stale assertion; the `"week"` branch is purely additive) — covers SPEC AC #13.
Tag: success.

#### C-m9d-014 — edge (WeekView — day-tap routing: today → Day view; past archived → PastDayDetail; future/pre-start → nothing)

Target file: `components/WeekView.test.tsx`
Layer: Component
**GIVEN** `<WeekView state={fixtureState} onOpenDay={onOpenDay} />`, `vi.setSystemTime` → `"2026-05-18"`, the standing W-today fixture (`history` has `"2026-05-17"`)
**WHEN** the `2026-05-18` (today) row is clicked; then the `2026-05-17` (past, archived) row is clicked; then a `future` row (`2026-05-21`) and a `pre-start` row (in a fixture with the anchor navigated to W-prestart) are clicked
**THEN** clicking **today's** row calls `onOpenDay("2026-05-18")` exactly once (which `AppShell` handles by `setView("day")` → the editable Building view — verified end-to-end in `C-m9d-011`/`E-m9d-003`); it does **not** open `PastDayDetail`.
**AND** clicking the past **archived** `2026-05-17` row opens `<PastDayDetail>` — a `role="region" aria-label="Day detail"` panel appears over the week list showing that day's blocks/bricks and score (mounted with `archivedDay={state.history["2026-05-17"]}`, `isoDate="2026-05-17"`, `onClose` — byte-identical to `MonthView`'s usage); clicking its `Close` dismisses the panel back to the week list.
**AND** clicking the `future` row and the `pre-start` row does **nothing** — no `onOpenDay` call, no `PastDayDetail` panel (those rows are non-interactive `<div>`s per `C-m9d-006`/`C-m9d-007`).
Proves: plan.md § Components `<WeekView>` (cell-tap routing — tap today → `onOpenDay`; tap past `scored` → `setOpenDate` → `PastDayDetail` reused verbatim; tap future/pre-start → no-op) + § Edge cases (tapping today / a past `scored` day / a `future` or `pre-start` day) — covers SPEC AC #10, AC #11.
Tag: edge.

### Accessibility (axe via Playwright)

`A-m9d-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9c sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9d-001 — a11y (Week view — axe clean, list semantics, keyboard, 430px)

Target file: `tests/e2e/m9d.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Week (Castle) view (under `count() > 0` guard)
**WHEN** axe-core runs against the week view
**THEN** it returns **zero** violations across all rule categories; the seven day rows live in a `role="list"` (`aria-label="Week days"`) container with each `WeekDayCell` a `role="listitem"`; tappable `scored` rows are reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carry a descriptive `aria-label` (weekday, full date, score, `", today"` when applicable); the prev/next-week buttons carry `aria-label`s and are keyboard-operable; inert `missed`/`future`/`pre-start` rows are non-focusable.
**AND** the vertical seven-row list and the centered aggregate ring render within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`); each row's hit area is ≥ 44px tall (ADR-031).
Proves: plan.md § Accessibility (`WeekView` list/listitem roles, keyboard, labels, 430px, 44px) + § Edge cases (430px viewport) — covers SPEC AC #12.
Tag: a11y.

#### A-m9d-002 — a11y (WeekAggregate ring + ViewSwitcher — axe clean, contrast, tablist keyboard)

Target file: `tests/e2e/m9d.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Week view visible with the aggregate ring and the `ViewSwitcher` (under `count() > 0` guard)
**WHEN** axe-core runs with colour-contrast rules enabled and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations — the aggregate ring is `role="img"` with an `aria-label` (`"Week score N percent"` or `"Week score: no data"`) and its numeral is rendered as visible text (not color-only); the `WeekDayCell` date/score text (`var(--ink)` over the heat fill, AA-safe at the `0.12` alpha floor) and the no-data `—` glyph + labels (`var(--ink-dim)` on `--bg`, AA) meet WCAG AA.
**AND** the `ViewSwitcher` is `role="tablist"`; Day/Week/Month are live `role="tab"` with `aria-selected`, keyboard-operable (Enter/Space activate; Left/Right arrows move across the **three** enabled tabs, skipping the disabled Year); each segment's hit area is ≥ 44px (ADR-031); the four segments fit the 430px column with no overflow.
Proves: plan.md § Accessibility (aggregate ring `role="img"` + label; heat-fill alpha-floor `0.12` AA contrast; switcher tablist/tab roles, three-tab arrow nav skipping Year, 44px) + § Decisions to honor (ADR-031, ADR-033) — covers SPEC AC #12.
Tag: a11y.

#### A-m9d-003 — a11y (PastDayDetail opened from the Week view — axe clean, keyboard operable)

Target file: `tests/e2e/m9d.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Week view with a past archived day opened so `<PastDayDetail>` is showing (under `count() > 0` guard)
**WHEN** axe-core runs against the day-detail panel
**THEN** it returns **zero** violations; the panel is `role="region"` with `aria-label="Day detail"`; the `Close` control is focusable and carries an `aria-label`; the detail is a static read-only list with no form controls (reused verbatim from M9c — no M9d edit); it renders single-column at 430px with no horizontal overflow.
Proves: plan.md § Accessibility (`PastDayDetail` reused verbatim — region role, `Close` label, static read-only, 430px) + § Decisions to honor (the read-only guarantee) — covers SPEC AC #12.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name (AC #13): switch to Week, per-day scores + the aggregate render, open a past day read-only.

#### E-m9d-001 — success (switch to Week — Castle view renders)

Target file: `tests/e2e/m9d.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Week` segment is tapped (under `count() > 0` guard)
**THEN** the Castle week view appears — a `role="list"` (`aria-label="Week days"`) of seven day rows, a week date-range label, and the prominent aggregate ring; the Building view is no longer shown; tapping `Day` returns to the Building view and tapping `Month` shows the Kingdom grid; tapping the `Year` segment does **nothing** (no crash, no view change, no error overlay).
Proves: plan.md § Components `<ViewSwitcher>`/`<WeekView>` + § AppShell wiring — covers SPEC AC #8, AC #13 (switch-to-Week E2E scenario).
Tag: success.

#### E-m9d-002 — success (per-day scores + the week aggregate render)

Target file: `tests/e2e/m9d.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` such that the current week has at least one archived `history` day scoring a known value, today's live in-progress day, and at least one in-range past missed day; the app loaded fresh at `/` and switched to Week
**WHEN** the week view is inspected (under `count() > 0` guard)
**THEN** the archived day's row shows its computed score (weekday + date + accent heat fill + numeric score), today's row shows the live in-progress score and the 2px accent ring, an in-range past never-opened day shows the distinct `missed` treatment (flat card, no numeral), and a future day is an inert row; the week aggregate ring displays the computed `weekScore` as a prominent percentage; no console error.
Proves: plan.md § Components `<WeekDayCell>`/`<WeekAggregate>` + § `weekScore` helper — covers SPEC AC #3, AC #4, AC #5, AC #7, AC #13 (per-day-scores + aggregate E2E scenario).
Tag: success.

#### E-m9d-003 — success (open a past day read-only from the Week view; prev/next nav)

Target file: `tests/e2e/m9d.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9d-002` (a hand-built v2 payload with an archived `history` day in the current week), the app at `/`, Week view shown
**WHEN** the archived past-day row is tapped, then `Close`d; then today's row is tapped; then the prev/next-week controls are used (under `count() > 0` guards)
**THEN** tapping the archived past-day row opens the read-only `PastDayDetail` panel — it shows that day's blocks/bricks and score, exposes **no** add/complete/edit affordance (only a `Close` control), and `Close` returns to the week list.
**AND** tapping **today's** row switches to the editable Building (Day) view (not the read-only detail); and tapping `Previous week` / `Next week` moves the seven-row layout, the range label, and the aggregate to the adjacent week — including across a month boundary — with no crash.
Proves: plan.md § Components `<WeekView>`/`<PastDayDetail>` (tap today → Day view; tap past archived → read-only detail; prev/next nav) — covers SPEC AC #9, AC #10, AC #13 (open-past-day-read-only E2E scenario).
Tag: success.

### Sandbox / preview note

Per the established M3–M9c pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `A-m9d-*` and 3 `E-m9d-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9c.spec.ts` / `tests/e2e/m9b.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9d-002`/`E-m9d-003` partly mitigate it by hand-building the `dharma:v1` v2 payload via `page.evaluate` (a deterministic week seed that does not depend on a brick-creation UI flow). M9d introduces no general deterministic seeding helper (out of scope per ADR-022). The 9 unit + 14 component IDs (`U-m9d-*`, `C-m9d-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the week-date math, the `weekScore` helper, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9d adds 29 new `m9d` IDs (9 U + 14 C + 3 A + 3 E) and removes none.

**Amended — sanctioned, expected M9d collateral (the Week-segment enable regression surface):** enabling the Week `ViewSwitcher` segment (AC #8) makes one M9c test ID stale. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M9c `BuildingClient` prop-lift precedent at M9c § Retired / amended test IDs; the M4d chooser-walk precedent):

- **`C-m9c-012` (`components/ViewSwitcher.test.tsx`) — the M9c test "ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled".** M9c's `C-m9c-012` asserts the **Week** and **Year** segments both render as `<button disabled aria-disabled="true">`, that clicking **Week** fires `onSelect` **zero** times, and that Week is out of the tab sequence (file lines ~65 / ~85 per the plan's § Regression surface). AC #8 of M9d **enables the Week segment** — Week now renders as a live `role="tab"` with no `aria-disabled`, is selectable, and **does** call `onSelect("week")`. Those Week-specific sub-assertions are therefore stale and **MUST be amended** by the BUILDER in the M9d dispatch. The amendment is **mechanical and assertion-preserving for everything not about Week**:
  - The "Week segment is disabled / clicking does NOT call `onSelect`" sub-assertion is **inverted** to assert Week is now a **live** tab — selectable, fires `onSelect("week")` exactly once, `aria-selected` toggles when `view="week"`. (This overlaps with M9d's own `C-m9d-010`, which is the canonical AC #8 coverage; the `C-m9c-012` amendment keeps the M9c file internally consistent.)
  - The "Week and Year rendered as disabled buttons" sub-assertion is **narrowed** to assert **only the Year** segment is the disabled `<button aria-disabled="true">`.
  - The sibling "Year segment is disabled" sub-assertion stays **valid and unchanged** — Year remains `live: false` (M9e).
  - **Every `C-m9c-012` sub-assertion not about the Week segment is preserved verbatim** — the four-segment render, the `role="tablist"`/`role="tab"` structure, the `aria-label="Calendar view"`, the `aria-selected` active-indicator behavior for Day/Month, and the Day/Month live `onSelect` calls all stay. The amendment touches only the Week-vs-Year disabled-state assertions.
- **No other M9c / M1–M9c test ID is amended or retired.** Per the M9d plan § Regression surface, the M9c `AppShell` tests (`C-m9c-001`/`C-m9c-002`) exercise only Day↔Month and never asserted Week was unreachable — widening `view` to include `"week"` is purely additive and they pass unchanged (anchored by the new `C-m9d-013`). The `ViewSwitcher` props-type widening (`"day" | "month"` → `"day" | "month" | "week"`) is source-only and breaks no test that does not also assert the old Week-disabled state.

**VERIFIER: please ratify the `C-m9c-012` amendment** as expected, sanctioned M9d collateral — the single stale-test surface of enabling the Week segment — exactly as M9c's `BuildingClient` prop-lift amendments and M4d's chooser-walk amendments were ratified. The amendment is surfaced here, not silent; it edits one existing test file (`components/ViewSwitcher.test.tsx`) and is assertion-preserving for every sub-assertion not about the Week segment's disabled state. If VERIFIER prefers, the alternative ruling is to FAIL back to PLANNER to add an explicit "amended test IDs" note to `plan.md` § Regression surface (which already flags `C-m9c-012` for VERIFIER).

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9d-01..03 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `C-m9c-012` amendment.** See § Retired / amended test IDs above — the genuine plan↔test regression surface for M9d. The M9d plan § Regression surface explicitly flags `C-m9c-012` as "sanctioned-for-amendment" and asks VERIFIER to ratify it; this entry documents the exact, assertion-preserving amendment (invert the Week sub-assertion, narrow the disabled-buttons sub-assertion to Year only). This is the M9d analogue of the M9c `BuildingClient`-refactor amendment — surfaced, not silently resolved by the BUILDER.
2. **`weekScore` returns the un-rounded average; `WeekAggregate` rounds for display.** The plan states `weekScore` returns a `number` in `[0,100]` and `WeekAggregate` displays `${Math.round(weekScore)}`. `U-m9d-008`/`U-m9d-009` therefore assert the helper's un-rounded value via `toBeCloseTo` (e.g. `50/3 ≈ 16.667`, `400/7 ≈ 57.143`), and `C-m9d-009` asserts the rounded `"70%"` at the display layer. VERIFIER may confirm rounding lives only in the component, not the helper — the plan implies this ("the centered numeral is `${Math.round(weekScore)}`") but does not state the helper is un-rounded in so many words. This is not an ambiguity that blocks the BUILDER; both readings of an exact-integer fixture (e.g. `weekScore → 70`) agree.
3. **`HeroRing` reuse vs the purpose-built ring.** The plan's baseline is a purpose-built SVG ring inside `WeekView` using only defined M0 tokens, and the BUILDER MAY instead reuse `components/HeroRing.tsx` only if doing so introduces no new `var(--surface-2)` reference. `C-m9d-009` asserts the rendered outcome (a ring + `"70%"` numeral, `role="img"`, no `--surface-2`) without pinning which implementation the BUILDER picks — either satisfies the test. VERIFIER may note this; it is a sanctioned BUILDER choice within the plan, not a gap.

No ADR is reversed: **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `weekScore` is a pure read built on `dayScore`, M9d writes no `history`, mutates no `AppState`, and bumps no schema (stays `v2`); **ADR-019** (`0=Sun…6=Sat` weekday convention) is honored by `weekDates`'s Sunday derivation, cross-checked against the M9c month grid in `U-m9d-003`; **ADR-033** (the single-% ring is the score signature) governs the `<WeekAggregate>` ring; **ADR-038** (forgiveness — missed = gray) governs the `missed` `WeekDayCell` row (`C-m9d-005`); **ADR-031** (44px touch targets) is enforced by `A-m9d-001`/`A-m9d-002` and the row/button sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9d adds 29 `m9d` test IDs (9 U + 14 C + 3 A + 3 E) and retires none; it amends `C-m9c-012` in `components/ViewSwitcher.test.tsx` as sanctioned, expected M9d collateral (VERIFIER to ratify).

### AC → test-ID coverage map (all 13 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                            | Test ID(s)                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| #1  | Week view renders a seven-day Sun→Saturday layout for the week containing a reference date (M9c Sunday-start convention)      | `U-m9d-001`, `U-m9d-002`, `U-m9d-003`, `C-m9d-001`                                             |
| #2  | View labeled with the week's date range (e.g. "May 17–23, 2026"), crossing month/year boundaries correctly                    | `U-m9d-002`, `U-m9d-003`, `C-m9d-001`, `C-m9d-003`                                             |
| #3  | Each day shows its date + a per-day score indicator, reusing the M9c cell vocabulary (archived/today/missed/future/pre-start) | `C-m9d-004`, `C-m9d-005`, `C-m9d-006`, `C-m9d-007`, `E-m9d-002`                                |
| #4  | `weekScore` helper: average of `dayScore` over in-range non-future days; missed-in-range = 0; future + pre-start excluded     | `U-m9d-004`, `U-m9d-005`, `U-m9d-007`, `U-m9d-008`, `U-m9d-009`, `E-m9d-002`                   |
| #5  | The Week view displays the week aggregate score prominently as the Castle score                                               | `C-m9d-009`, `E-m9d-002`                                                                       |
| #6  | A week with no in-range non-future days → a no-data aggregate, never `0`, never a crash                                       | `U-m9d-006`, `U-m9d-008`, `C-m9d-008`                                                          |
| #7  | Today's day contributes its live `dayPct` to the week aggregate                                                               | `U-m9d-007`, `C-m9d-009`, `E-m9d-002`                                                          |
| #8  | The Week switcher segment is now enabled; selecting it renders the Castle view; Year stays disabled                           | `C-m9d-010`, `C-m9d-011`, `C-m9d-012`, `E-m9d-001`                                             |
| #9  | Prev/next controls move the week, updating layout + range label + aggregate; nav crosses month + year boundaries              | `U-m9d-002`, `C-m9d-002`, `C-m9d-003`, `E-m9d-003`                                             |
| #10 | Tapping today's day → editable Building view; tapping a past in-range day with history → read-only `PastDayDetail`            | `C-m9d-014`, `E-m9d-003`                                                                       |
| #11 | Tapping a future day or a pre-`programStart` day does nothing                                                                 | `C-m9d-006`, `C-m9d-007`, `C-m9d-014`                                                          |
| #12 | 430px renders without overflow; axe a11y clean; week days + nav controls keyboard-operable + screen-reader-labeled            | `A-m9d-001`, `A-m9d-002`, `A-m9d-003`                                                          |
| #13 | No regression to M1–M9c; quality gates clean; E2E covers switch-to-Week / per-day-scores + aggregate / open-past-day          | **gate (`npm run eval`)** + `C-m9c-012` amendment + `C-m9d-012`/`C-m9d-013` + `E-m9d-001..003` |

**Gate-verified portion:** AC #13's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b/M9c precedent. AC #13's no-regression half is anchored by the sanctioned `C-m9c-012` amendment (the only stale-test surface) plus `C-m9d-012`/`C-m9d-013` (the `AppShell` week-branch wiring is purely additive — Day/Month behavior byte-equivalent). All other 12 ACs map to at least one bespoke `m9d` test ID; every `m9d` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** a week containing today → `U-m9d-007`/`C-m9d-014`; a fully past week → `U-m9d-009`; a fully future week → `U-m9d-006`/`C-m9d-008`; a week straddling `programStart` → `U-m9d-008`/`C-m9d-006`; a week straddling a month/year boundary → `U-m9d-002`/`U-m9d-003`/`C-m9d-003`; empty `history` first run → `U-m9d-008`; a missed day vs a 0-score archived day → `U-m9d-004`/`U-m9d-009` (both contribute `0` to the average) + `C-m9d-005` (distinct `WeekDayCell` rendering); tapping a future/pre-start/missed day → `C-m9d-006`/`C-m9d-007`/`C-m9d-014`; tapping today's day → `C-m9d-014`/`E-m9d-003`; tapping a past `scored` day → `C-m9d-014`/`E-m9d-003`; selecting the Year segment → `C-m9d-010`/`C-m9d-011`/`E-m9d-001`; prev/next week across month/year boundary → `C-m9d-003`/`E-m9d-003`; 430px → `A-m9d-001`/`A-m9d-002`/`A-m9d-003`; heat-fill alpha-floor contrast → `A-m9d-002`; reduced motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9d adds no week-slide animation; the switcher's instant-collapse transition is inherited unchanged from M9c, per the M9c precedent).

## Milestone 9e — Year view (Empire) + the complete calendar — Tests

This entry covers M9e — the **Empire view** (the year) and the **last two period aggregates**: a 3×4 twelve-month grid, per-month scores, a prominent `yearScore` aggregate ring, prev/next-year navigation, the now-enabled **Year** switcher segment (after M9e all four of Day · Week · Month · Year are live), and a year→month tap-through that opens the M9c Month (Kingdom) view at the tapped month. It is derived from the `plan.md` M9e entry (`## Milestone 9e — Year view (Empire) + the complete calendar — Plan`). Feature slug: `m9e`. ID prefixes: `U-m9e-`, `C-m9e-`, `A-m9e-`, `E-m9e-`. M9e adds a real UI surface (two new components — `YearView` hosting an inline `YearAggregate` ring + `MonthCell` — plus the new `lib/yearGrid.ts`), so it has a full four-layer test mix — unit (pure `lib/yearGrid.ts` date math + the pure `monthScore`/`yearScore` helpers), component (`YearView`, `MonthCell`, the `YearAggregate` ring, `ViewSwitcher` all-four-live, `AppShell` year-branch + tap-through, `MonthView`'s additive `initialMonth` prop), accessibility (axe via Playwright), and E2E (deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M9e has a **large genuine unit surface** — `lib/yearGrid.ts` is pure date math (`monthDates`/`yearMonths`/`addYear`/`subYear`, called with literal integer/ISO args, no clock, no `localStorage`) and `monthScore`/`yearScore` in `lib/history.ts` are pure `(state, year[, monthIndex])` aggregators over `dayScore`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) / M9d (#13) precedent:

- **AC #12 (no regression to M1–M9d; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers switch-to-Year / month scores + the year aggregate / tap-a-month-opens-Month)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the **four** sanctioned amendments in § Retired / amended test IDs below — `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the complete stale-test collateral of enabling the Year segment, plus `C-m9e-009` (the `AppShell` year-branch + `monthTarget` wiring is purely additive — Day/Week/Month behavior byte-equivalent) and `C-m9e-011` (the `MonthView` `initialMonth` prop is optional — prop-omitting call sites byte-identical); the three named E2E scenarios are authored as real `test()` blocks (`E-m9e-001..003`).

All other 12 ACs map to at least one concrete bespoke `m9e` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a/M9b/M9c/M9d discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m9e-004` is THE load-bearing `monthScore` correctness guard.** It asserts the **exact** numeric average for a fixture month with two archived scores `90`/`30` and **two** in-range missed days inside a four-day in-range window — `(90 + 30 + 0 + 0) / 4 = 30`, asserted `toBe(30)`, **not** `60` (the inflated `(90+30)/2` a mutant that excludes missed days would yield). A mutant that drops the missed-day `0`s from the numerator OR from the denominator fails this exact-value assertion. AC #4's honest-scoreboard rule is enforced numerically.
- **`U-m9e-007` is THE load-bearing `yearScore` correctness guard — the SG-m9e-01 numeric proof.** It pins a fixture year where **day-averaging and month-averaging give different numbers** and asserts the **day-averaged** result. The fixture has exactly one scored day in February (`dayPct 100`) and exactly two scored days in March (`dayPct 0`, `dayPct 0`), every other in-range day pre-`programStart` or future and excluded → day-averaging gives `(100 + 0 + 0) / 3 = 33.33…`; averaging the two non-null `monthScore`s (`Feb monthScore = 100`, `Mar monthScore = 0`) gives `(100 + 0) / 2 = 50`. The test asserts `yearScore` `toBeCloseTo(33.333, 2)` and **explicitly NOT `50`** — a mutant that averages the twelve `monthScore`s instead of the days fails. SG-m9e-01 is enforced numerically.
- **`U-m9e-006` (`monthScore` no-data sentinel) and `U-m9e-008` (`yearScore` no-data sentinel) assert strict `=== null`**, not falsy — a mutant returning `0` for a fully-future / fully-pre-start month or year fails, because `MonthCell`'s no-data tile (`C-m9e-005`) and `YearAggregate`'s no-data ring (`C-m9e-007`) depend on telling the `null` sentinel apart from a real `0`.
- **`U-m9e-009` (`monthScore`/`yearScore` purity + clock-independence) freezes the input `state`** (`Object.freeze` on `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.looseBricks`, `state.categories`) and asserts both helpers neither throw nor mutate, and that advancing the system clock (`vi.setSystemTime`) between two identical-arg calls leaves the result unchanged — both derive "today" from `state.currentDate`, never the system clock (ADR-046). A mutant that calls `new Date()` / `Date.now()` or mutates `state` fails.
- **`U-m9e-002` (UTC-drift) computes `monthDates` for known months and asserts every ISO string exactly, then re-runs under a faked negative-UTC-offset environment** (`vi.stubEnv("TZ", "America/Los_Angeles")` / the M9a `appliesOn.tz.test.ts` faked-offset pattern) — a mutant using `new Date(isoString)` (UTC midnight) drifts a day and fails the cross-environment equality. The plan's § Year/month date math forbids `new Date(isoString)`.
- **`U-m9e-003` (leap year) asserts `monthDates(2028, 1)` has length 29** — a mutant hard-coding 28 days for February, or using a wrong days-in-month technique, fails.
- **`C-m9e-004` (the no-data tile vs scored-0 tile distinctness) is a structural absence assertion** — a `score === null` `MonthCell` has **no** heat fill and **no** score numeral text node (only a `—` glyph); a `score === 0` `MonthCell` has the `0.12`-alpha accent fill **and** a numeral "0". A mutant rendering them identically fails.
- **`C-m9e-007` (no-data year aggregate) asserts a `—` em-dash glyph and NO `0` / NO `%`-of-zero** — a mutant rendering `0%` for a fully-future year fails. The ring `role="img"` `aria-label` is asserted to be `"Year score: no data"`, not `"Year score 0 percent"`.
- **`C-m9e-006` (all four switcher segments live) asserts NO segment carries `aria-disabled` / `disabled`** — a mutant that leaves Year `live: false` fails, because the assertion enumerates all four tabs and asserts none is disabled and all four fire `onSelect`.
- **`C-m9e-010` (tap-through to an out-of-range month) renders `MonthView` for a fully-future month AND a pre-`programStart` month and asserts no crash** — SG-m9e-03 is proven by an actual render, not a guarded no-op.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m9e-001..009` | 9      |
| Component (Vitest + Testing Library)  | `C-m9e-001..012` | 12     |
| Accessibility (axe via Playwright)    | `A-m9e-001..002` | 2      |
| E2E (Playwright, deferred-to-preview) | `E-m9e-001..003` | 3      |
| **Total**                             |                  | **26** |

ID series start values were supplied by the orchestrator: `U-m9e-001`, `C-m9e-001`, `A-m9e-001`, `E-m9e-001`.

**Fixture dates (ISO, weekdays/lengths verified against the proleptic Gregorian calendar):**
`2026-05-01` (M9d-era **`programStart`**) · `2026-05-18` (today, per `currentDate`) · `2026-02-2x`, `2026-03-2x` (used in the SG-m9e-01 year fixture) · `2028-02-29` (leap day) — and the explicitly-overridden `programStart`/`currentDate` each fixture below names.

**The named fixtures (all pin an explicit `programStart` + `currentDate` — never the clock):**

| Fixture        | `programStart` / `currentDate`                                              | Character                                                                                                          |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **F-monthwin** | `programStart: "2026-06-08"`, `currentDate: "2026-06-11"`                   | The four-day in-range window `06-08…06-11` inside June 2026 — the load-bearing `monthScore` fixture (`U-m9e-004`). |
| **F-yearwin**  | `programStart: "2026-02-20"`, `currentDate: "2026-03-15"`                   | One scored Feb day + two scored Mar days — the SG-m9e-01 day-vs-month divergence fixture (`U-m9e-007`).            |
| **F-standing** | `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`                   | The M9d-era standing state — live in-progress day scores `dayPct === 40`; used for current-month / today-live IDs. |
| **F-firstrun** | `programStart: "2026-05-18"`, `currentDate: "2026-05-18"`, `history === {}` | First run — today is `programStart`, empty `history`, live day `dayPct === 50`.                                    |

### Unit (Vitest)

`U-m9e-001..003` exercise the pure `lib/yearGrid.ts` (no clock, no `localStorage` — called with literal integer/ISO args). `U-m9e-004..009` exercise the `monthScore` / `yearScore` helpers added to `lib/history.ts` (pure `(state, year[, monthIndex])` — no clock, no `localStorage`, driven directly).

#### U-m9e-001 — success (yearGrid module surface — monthDates / yearMonths / addYear / subYear)

Target file: `lib/yearGrid.test.ts` (NEW)
Layer: Unit
**GIVEN** `monthDates`, `yearMonths`, `addYear`, `subYear` exported from `lib/yearGrid.ts`
**WHEN** the module's exports are inspected and each is called for a known year
**THEN** `monthDates`, `yearMonths`, `addYear`, `subYear` are all `typeof === "function"`; `monthDates(2026, 0)` (January 2026, `monthIndex` 0-indexed) returns a `string[]` of **exactly length 31**, every element a zero-padded `YYYY-MM-DD` ISO string ascending by one day, first `"2026-01-01"`, last `"2026-01-31"`; `monthDates(2026, 3)` (April) has length 30; `monthDates(2026, 1)` (February 2026, non-leap) has length 28.
**AND** `yearMonths(2026)` returns **exactly 12** `{ year, monthIndex, name }` descriptors, ordered Jan→Dec — `monthIndex` `0…11`, `year` `2026` on all twelve, `name[0] === "January"` and `name[11] === "December"`; `addYear(2026) === 2027` and `subYear(2026) === 2025` (integer arithmetic, no `Date` object).
Proves: plan.md § Year/month date math (`monthDates` → in-month ISO list, correct length; `yearMonths` → twelve descriptors; `addYear`/`subYear` integer arithmetic) + § File structure (`lib/yearGrid.ts` module surface) — covers SPEC AC #1, AC #2, AC #9.
Tag: success.

#### U-m9e-002 — edge (monthDates — UTC-drift-free across timezones, mutation-resistant)

Target file: `lib/yearGrid.test.ts`
Layer: Unit
**GIVEN** `monthDates` from `lib/yearGrid.ts`, exercised once under the default test environment and once under a faked negative-UTC-offset timezone (`vi.stubEnv("TZ", "America/Los_Angeles")` — or the M9a `appliesOn.tz.test.ts` faked-offset pattern)
**WHEN** `monthDates` is computed for several months in **both** environments
**THEN** in **both** environments `monthDates(2026, 0)` `toEqual` the identical 31-element array (`"2026-01-01"`…`"2026-01-31"`) and `monthDates(2026, 11)` `toEqual` the identical 31-element December array (`"2026-12-01"`…`"2026-12-31"`); every `iso` string is **byte-identical** between the two timezone runs — no day drift, no `"2026-01-00"` or `"2026-02-01"` bleed at the month edges.
**AND** there is **no** `new Date("2026-01-01")`-style ISO string-parse anywhere in `lib/yearGrid.ts` — only the multi-arg local-time constructor (`new Date(y, m, d)`, including the `new Date(year, monthIndex + 1, 0).getDate()` last-day technique); a mutant that string-parses an ISO date drifts to the previous day in a negative-offset zone and fails the cross-environment equality.
Proves: plan.md § Year/month date math (boundary-correct `monthDates`; no `new Date(isoString)`; multi-arg local-time constructor; UTC-drift-free per the M9a `parseLocalDate` lesson) — covers SPEC AC #1, AC #3.
Tag: edge.

#### U-m9e-003 — edge (monthDates — leap year handled automatically)

Target file: `lib/yearGrid.test.ts`
Layer: Unit
**GIVEN** `monthDates` and `yearMonths` from `lib/yearGrid.ts`
**WHEN** `monthDates` is called for February of a leap year and a non-leap year, and the full year date list is assembled
**THEN** `monthDates(2028, 1)` (February 2028, a leap year) returns a `string[]` of **exactly length 29** — last element `"2028-02-29"`; `monthDates(2027, 1)` (February 2027, non-leap) has **length 28** — last element `"2027-02-28"`; no special-casing — the length follows `new Date(year, monthIndex + 1, 0).getDate()`.
**AND** concatenating `monthDates(2028, 0)`…`monthDates(2028, 11)` yields **366** dates for the leap year 2028 and `monthDates(2027, 0)`…`monthDates(2027, 11)` yields **365** for 2027 — the year date list `yearScore` consumes is leap-aware automatically.
Proves: plan.md § Year/month date math (leap year automatic — `monthDates(2028, 1)` is 29 days; the year list is 365/366) + § Edge cases (leap year) — covers SPEC AC #1, AC #5.
Tag: edge.

#### U-m9e-004 — success / edge (monthScore — THE honest-month-average contract, missed = 0, mutation-resistant)

Target file: `lib/history.test.ts` (EXISTS — `monthScore` cases appended; no `m9b`/`m9c`/`m9d` ID touched)
Layer: Unit
**GIVEN** `monthScore` exported from `lib/history.ts`, and the **F-monthwin** fixture `state` — `programStart: "2026-06-08"`, `currentDate: "2026-06-11"`, `history = { "2026-06-08": <ArchivedDay dayPct 90>, "2026-06-09": <ArchivedDay dayPct 30> }` — `2026-06-10` and `2026-06-11` have **no** `history` entry; the in-progress day's `dayPct` is irrelevant here because `currentDate` is `06-11` and that day is also un-archived
**WHEN** `monthScore(state, 2026, 5)` is called (June 2026, `monthIndex` 5)
**THEN** it returns the **number `30`** — `expect(monthScore(state, 2026, 5)).toBe(30)`. June's 30 dates are classified: `06-01`…`06-07` are `< programStart "2026-06-08"` → **excluded** from numerator and denominator; `06-08`/`06-09` archived → contribute `90`/`30`; `06-10`/`06-11` are in-range (`programStart ≤ d ≤ currentDate`) past/today days with no `history` entry → `dayScore` returns `NO_DATA` (or the live `dayPct` for `06-11` if the in-progress day scores — in this fixture the in-progress day scores `0`) → each contributes **`0`** and **is counted** in the denominator; `06-12`…`06-30` are `> currentDate` → future → excluded. Numerator `= 90+30+0+0 = 120`; denominator `= 4`; result `= 30`.
**AND** the value is asserted to be **`30`, NOT `60`** — `60` is the inflated `(90+30)/2` average a mutant that drops the two missed in-range days from the numerator OR denominator would produce. A mutant that excludes the missed days fails this exact assertion. This is the numeric enforcement of AC #4's honest-scoreboard rule.
Proves: plan.md § `monthScore` & `yearScore` helpers (`monthScore` — included days summed, missed-in-range `NO_DATA → 0` contribution counted in numerator AND denominator, pre-start + future excluded from both) — covers SPEC AC #4.
Tag: edge.

#### U-m9e-005 — success (monthScore — current month is partial; today's live dayPct counts)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `monthScore` from `lib/history.ts` and the **F-standing** fixture `state` — `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, the live in-progress day scoring `dayPct === 40`, `history` holding archived days for `2026-05-01`…`2026-05-17` each scoring `dayPct 70` (seventeen archived days)
**WHEN** `monthScore(state, 2026, 4)` is called (May 2026, the current month)
**THEN** it returns the **number `68.33…`** — the test asserts `toBeCloseTo(68.333, 2)`. May's days `05-01`…`05-17` are archived `70` (seventeen days); `05-18` equals `currentDate` → `dayScore` returns the **live** `dayPct === 40` (today's in-progress score, AC #7); `05-19`…`05-31` are `> currentDate` → future → excluded from numerator AND denominator. Numerator `= 70*17 + 40 = 1230`; denominator `= 18` (only the in-range non-future days); result `= 1230/18 = 68.333…`.
**AND** months after the current month return the no-data sentinel — `expect(monthScore(state, 2026, 5)).toBe(null)` (June 2026 — every day `> currentDate "2026-05-18"` → future → `denominator === 0` → `NO_DATA`). The current month averages **only** its in-range non-future days, not all 31.
Proves: plan.md § `monthScore` & `yearScore` helpers (current-month branch — averages only in-range non-future days incl. today's live `dayPct`; a fully-future month → `denominator === 0` → `NO_DATA`) + § Edge cases (current year — partial current month) — covers SPEC AC #4, AC #7.
Tag: success.

#### U-m9e-006 — edge (monthScore — no-data sentinel for fully-future / fully-pre-start months, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `monthScore` and the `NO_DATA` sentinel from `lib/history.ts`, the **F-standing** fixture `state` (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`)
**WHEN** `monthScore` is called for a fully-future month (`monthScore(state, 2026, 6)` — July 2026, every day `> currentDate`) and for a fully-pre-`programStart` month (`monthScore(state, 2026, 3)` — April 2026, every day `< programStart "2026-05-01"`)
**THEN** each call returns **exactly `null`** — `expect(monthScore(state, 2026, 6)).toBe(null)` and `expect(monthScore(state, 2026, 3)).toBe(null)` (strict `=== null`, NOT merely falsy, NOT `0`); `NO_DATA` is exported and `NO_DATA === null`. The denominator is `0` (no day is in-range and non-future), so `monthScore` returns the sentinel rather than dividing by zero.
**AND** `0` is **never** returned for the no-data case — `0` is reserved for "the month happened and every included day scored 0" (a distinct, truthful statement — a fully-unopened in-range past month, see `U-m9e-004`'s missed-day handling); a mutant returning `0` for an empty denominator fails the strict `toBe(null)`.
Proves: plan.md § `monthScore` & `yearScore` helpers (no-data case — `denominator === 0` → `NO_DATA`, never `0`, never a divide-by-zero crash) + § Edge cases (fully future month / month before `programStart`) — covers SPEC AC #3, AC #4.
Tag: edge.

#### U-m9e-007 — edge (yearScore — averages DAYS directly, NOT the twelve monthScores — THE SG-m9e-01 guard)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `yearScore` and `monthScore` from `lib/history.ts`, and the **F-yearwin** fixture `state` — `programStart: "2026-02-20"`, `currentDate: "2026-03-15"`, `history = { "2026-02-25": <ArchivedDay dayPct 100>, "2026-03-05": <ArchivedDay dayPct 0>, "2026-03-10": <ArchivedDay dayPct 0> }`; every other in-range day (`02-20`…`02-24`, `02-26`…`02-28`, `03-01`…`03-04`, `03-06`…`03-09`, `03-11`…`03-14`, `03-15`) is an in-range past/today day with no `history` entry — but to pin the divergence cleanly the fixture sets `history` to ALSO archive every other in-range day at `dayPct 100` so the only "low" days are the two `0`-scoring March days **and** narrows the comparison to the three named days by an explicit assertion (see below)
**WHEN** `yearScore(state, 2026)` is computed and compared against the arithmetic mean of the twelve `monthScore(state, 2026, m)` values
**THEN** for the three-named-day reading the fixture is reduced to its essentials: with only `02-25` (`100`), `03-05` (`0`), `03-10` (`0`) in-range and scored and **all other dates pre-`programStart` or future or explicitly excluded**, `yearScore` averages the three in-range non-future scored days **directly** → `(100 + 0 + 0) / 3 = 33.33…` — the test asserts `toBeCloseTo(33.333, 2)`.
**AND** the mean of the twelve `monthScore`s is **different**: `monthScore(2026, 1)` (Feb) `= 100` (its one in-range day), `monthScore(2026, 2)` (Mar) `= 0` (its two in-range days both `0`), the other ten months `= NO_DATA` → averaging the two non-null month scores gives `(100 + 0) / 2 = 50`. The test asserts `yearScore` is **`33.333`, explicitly NOT `50`** — a mutant that computes `yearScore` as the mean of the twelve (or the non-null) `monthScore`s fails. This is the numeric enforcement of SG-m9e-01: `yearScore` averages days directly (the same day-averaging `weekScore` uses), never the month aggregates.
Proves: plan.md § `monthScore` & `yearScore` helpers (`yearScore` averages `dayScore` over the year's in-range non-future days directly — NOT the mean of the twelve `monthScore`s; SG-m9e-01 RESOLVED → average days) + § Open questions for VERIFIER (SG-m9e-01) — covers SPEC AC #5.
Tag: edge.

#### U-m9e-008 — edge (yearScore — no-data sentinel + first-run single-day year, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** `yearScore` and the `NO_DATA` sentinel from `lib/history.ts`, and two fixtures: (a) the **F-standing** fixture (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`); (b) the **F-firstrun** fixture (`programStart: "2026-05-18"`, `currentDate: "2026-05-18"`, `history === {}`, live in-progress day scoring `dayPct === 50`)
**WHEN** `yearScore` is called for a fully-future year and a fully-pre-start year against fixture (a), and for the current year against the first-run fixture (b)
**THEN** for (a) — `expect(yearScore(state, 2027)).toBe(null)` (every day of 2027 is `> currentDate "2026-05-18"` → future → `denominator === 0` → `NO_DATA`) and `expect(yearScore(state, 2025)).toBe(null)` (every day of 2025 is `< programStart "2026-05-01"` → pre-start → `denominator === 0` → `NO_DATA`); strict `=== null`, NOT `0`, no divide-by-zero crash.
**AND** for (b) — `yearScore(state, 2026)` returns the **number `50`** (`expect(...).toBe(50)`): in 2026 every day before `2026-05-18` is `< programStart` → excluded; `2026-05-18` equals `currentDate` → contributes the live `dayPct === 50`; every day after is future → excluded; numerator `= 50`, denominator `= 1`, result `= 50` — the first-run year reflects only the single in-range day, no crash on the empty `history` map.
Proves: plan.md § `monthScore` & `yearScore` helpers (`yearScore` no-data case — `denominator === 0` → `NO_DATA`, never `0`) + § Edge cases (fully future year; year before `programStart`; first run — only the current day counts) — covers SPEC AC #5, AC #6, AC #7.
Tag: edge.

#### U-m9e-009 — edge (monthScore / yearScore — purity, clock-independence, mutation-resistant)

Target file: `lib/history.test.ts`
Layer: Unit
**GIVEN** the **F-standing** fixture `state`, deeply **frozen** — `Object.freeze` applied to `state`, `state.history`, each `ArchivedDay`, `state.blocks`, `state.categories`, `state.looseBricks` — passed to both `monthScore` and `yearScore`
**WHEN** `monthScore(frozenState, 2026, 4)` and `yearScore(frozenState, 2026)` are each called twice with identical args, and the system clock is advanced (`vi.setSystemTime` to a date in a later year) **between** the two calls of each
**THEN** neither helper throws (`expect(() => monthScore(frozenState, 2026, 4)).not.toThrow()`, likewise `yearScore`) — neither writes into `state` or any nested collection; after the calls `state` is referentially and structurally unchanged.
**AND** for each helper the two calls return **deep-equal results regardless of the advanced system clock** — both derive "today" from `state.currentDate`, **never** `new Date()` / `Date.now()`; they read no clock and no `localStorage`; each is a pure function of its arguments. A mutant that reads the system clock returns a different result after the clock is advanced and fails. (ADR-046 — period aggregates are pure; "today" is `state.currentDate`.)
Proves: plan.md § `monthScore` & `yearScore` helpers (purity — both pure, "today" = `state.currentDate`, never the clock; honor ADR-046 verbatim) + § Open questions for VERIFIER item (a) + § ADR needed (ADR-046 is the heart of m9e) — covers SPEC AC #4, AC #5.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m9e-001..003` cover `<YearView>` (the 3×4 grid layout, year label, prev/next nav); `C-m9e-004..005` cover `<MonthCell>` (scored / no-data / current-month, distinctness, tappability); `C-m9e-006..007` cover `<YearAggregate>` (the score ring + the no-data state) and the `<ViewSwitcher>` all-four-live state; `C-m9e-008` covers the `ViewSwitcher` round-trip; `C-m9e-009..010` cover `<AppShell>` year-branch + the year→month tap-through; `C-m9e-011` covers `<MonthView>`'s additive `initialMonth` prop; `C-m9e-012` is the no-regression anchor. All render with React Testing Library; where a clock read matters (`YearView`'s initial displayed year reads `today()`) the system clock is controlled via `vi.setSystemTime` so `today()` is deterministic at `"2026-05-18"`; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test that mounts `<AppShell />` (which calls `usePersistedState`).

#### C-m9e-001 — success (YearView — 3×4 twelve-month grid + month-name labels + year label)

Target file: `components/YearView.test.tsx` (NEW)
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the **F-standing** fixture state
**WHEN** rendered (the initial displayed year is the current year, 2026)
**THEN** exactly **twelve** `MonthCell`s render, inside a `role="list"` container (`aria-label="Months of 2026"`); each cell shows its month name — the first cell reads "January", the last "December", in calendar order; the grid wrapper carries `gridTemplateColumns: repeat(3, 1fr)` (a 3×4 layout).
**AND** the view is labeled with the displayed year — a `<h2>` (`var(--font-display)`, `var(--fs-22)`, `var(--ink)`) reading `"2026"`.
Proves: plan.md § Components `<YearView>` (twelve `<MonthCell>`s in a `role="list"` 3×4 grid; year label `<h2>`) + § File structure (`components/YearView.tsx`) — covers SPEC AC #1, AC #2.
Tag: success.

#### C-m9e-002 — success (YearView — per-month score indicator + the prominent year aggregate)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, the **F-standing** fixture (`programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `history` with archived days in May scoring known values, the live in-progress day scoring `dayPct === 40`)
**WHEN** the twelve month cells and the year aggregate are inspected
**THEN** each `MonthCell` shows a score indicator reflecting that month's `monthScore` — months Jan–Apr (entirely pre-`programStart`) show the **distinct no-data treatment** (a `—` glyph, no heat fill — `monthScore === null`); May (the current month) shows a numeral + heat fill driven by `monthScore(state, 2026, 4)`; Jun–Dec (fully future) show the `—` no-data tile; the current month (May) carries the today-style `var(--accent)` accent outline.
**AND** the year aggregate is rendered **prominently** — a `YearAggregate` ring above the grid showing `Math.round(yearScore(state, 2026))` as a centered `%` numeral; today's live `dayPct` is reflected in both the May cell and the year aggregate (`YearView` passes the same live `state` to `monthScore`/`yearScore`).
Proves: plan.md § Components `<YearView>`/`<MonthCell>`/`YearAggregate` (per-month score indicator + distinct no-data treatment; the prominent year aggregate ring; current-month accent) + § Edge cases (current year — partial current month; year containing `programStart`) — covers SPEC AC #3, AC #6, AC #7.
Tag: success.

#### C-m9e-003 — success (YearView — prev/next year nav updates the 12 cells, the year label, the aggregate)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** `<YearView state={fixtureState} onOpenMonth={vi.fn()} />`, `vi.setSystemTime` → `"2026-05-18"`, starting on the displayed year 2026
**WHEN** the "Previous year" button is clicked once, then the "Next year" button is clicked twice
**THEN** the two nav controls are `<button>`s carrying `aria-label="Previous year"` / `"Next year"` with ≥ 44px hit areas (ADR-031); after one Previous click the year label reads `"2025"`, all twelve cells re-derive their `monthScore` for 2025 (a fully-pre-`programStart` year → all twelve are the `—` no-data tile), and the `YearAggregate` recomputes to the `—` no-data state; after two Next clicks the label reads `"2027"` and the twelve cells + aggregate recompute for 2027 (a fully-future year → all twelve `—`, aggregate `—`).
**AND** the displayed-year change is session-only React state — `setDisplayedYear((y) => subYear(y))` / `addYear(y)`; no `localStorage` write occurs on nav (asserted by a `localStorage.setItem` spy showing zero calls attributable to nav); prev/next is **instant** — no slide animation.
Proves: plan.md § Components `<YearView>` (prev/next-year buttons → `setDisplayedYear(subYear/addYear)`; the twelve cells + label + aggregate recompute; session-only displayed year; instant nav) + § Edge cases (prev/next far past `programStart` / into the future — an all-no-data year renders without crashing) — covers SPEC AC #9.
Tag: success.

#### C-m9e-004 — edge (MonthCell — scored tile: heat fill + numeral; scored-0 vs no-data distinctness, mutation-resistant)

Target file: `components/MonthCell.test.tsx` (NEW)
Layer: Component
**GIVEN** three renders — `<MonthCell year={2026} monthIndex={4} name="May" score={60} onOpen={vi.fn()} />`, `<MonthCell year={2026} monthIndex={3} name="April" score={0} onOpen={vi.fn()} />`, and `<MonthCell year={2026} monthIndex={6} name="July" score={null} onOpen={vi.fn()} />`
**WHEN** each is rendered and inspected
**THEN** the `score={60}` tile shows the month name `"May"` and a numeric score `60` (the `Math.round(score)` numeral) with the `var(--accent)` heat fill at the score-scaled alpha `0.12 + (60/100)*0.78 = 0.588` (the M9c/M9d heat formula, asserted via inline style / a `data-score`-derived style hook); the `score={0}` tile carries the **minimum-alpha** heat fill (alpha `0.12`) **and** a visible numeral text node `"0"`.
**AND** the `score={null}` tile has **no** heat fill (flat `var(--card)` background with a 1px `var(--card-edge)` border) and **no** score numeral text node at all — only a `—` (em-dash) glyph in `var(--ink-dim)`; the `score={0}` tile and the `score={null}` tile are **structurally distinct** ("0" numeral vs "—" glyph — a mutant rendering them identically fails). All three are ≥ 44px tall (ADR-031) `<button>`s.
Proves: plan.md § Components `<MonthCell>` (scored tile — heat fill at scaled alpha + numeral; `score === 0` → `0.12` alpha + "0"; `score === null` → flat `--card` tile, no fill, `—` glyph; the two are visually distinct) + § Design tokens (heat scale `0.12 + (score/100)*0.78`) + § Edge cases (month with 0 score vs month never opened) — covers SPEC AC #3.
Tag: edge.

#### C-m9e-005 — success (MonthCell — every cell is tappable; current-month accent outline)

Target file: `components/MonthCell.test.tsx`
Layer: Component
**GIVEN** four renders — a `scored` cell, a `score={0}` cell, a `score={null}` (no-data) cell, and a `scored` cell with `isCurrentMonth` — each with an `onOpen` spy
**WHEN** each cell is rendered, inspected, and clicked
**THEN** **every** cell — scored, scored-0, AND no-data — is a `<button>` (`getByRole("button")` succeeds for all four) and clicking it calls its `onOpen` spy **exactly once** — there are **no inert month cells** (SG-m9e-03 — the `null` vs number split is a visual distinction only, not an interactivity one).
**AND** the `isCurrentMonth` cell additionally carries a `2px solid var(--accent)` outline (`outlineOffset: 1px`) — the today-marker treatment — and its `aria-label` includes `", current month"`; each cell's `aria-label` is `"<Month> <year>, score <N> percent"` for a scored cell and `"<Month> <year>, no data"` for a `null` cell.
Proves: plan.md § Components `<MonthCell>` (every month is a tappable `<button>` — no inert cells, SG-m9e-03; `isCurrentMonth` → `2px var(--accent)` outline; `aria-label` grammar) + § Accessibility (`MonthCell` labels) — covers SPEC AC #3, AC #10.
Tag: success.

#### C-m9e-006 — edge (YearAggregate — the year score ring + the no-data em-dash state, mutation-resistant)

Target file: `components/YearView.test.tsx`
Layer: Component
**GIVEN** two `<YearView>` renders — one navigated to a year whose `yearScore` is a known number (e.g. the current year 2026 against a fixture whose `yearScore` rounds to `72`), and one navigated to a fully-future year (`yearScore` → `NO_DATA`), `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `YearAggregate` ring is inspected in each
**THEN** the scored render shows the year aggregate **prominently above the grid** as an SVG ring — a `var(--accent)` progress arc on a `var(--card-edge)` track, a centered numeral `"72%"` (`Math.round(yearScore)` + `%`) in `var(--font-display)` `var(--fs-32)` `var(--ink)`, with a `"Year"` label below in `var(--font-ui)` `var(--fs-10)` `var(--ink-dim)`; the ring is `role="img"` with `aria-label="Year score 72 percent"`.
**AND** the no-data render shows a **distinct no-data treatment** — the ring track only (no progress arc) and a `—` (em-dash) glyph in `var(--ink-dim)` in place of the numeral, the `"Year"` label still shown; there is **no** `"0%"`, **no** `"0"` numeral, and no crash (`YearView` branches on `yearScore(...) === null`); the ring's `aria-label` is `"Year score: no data"` (NOT `"Year score 0 percent"`). The ring uses only **defined** M0 tokens — there is no `var(--surface-2)` reference anywhere in the year-aggregate markup. A mutant that renders `0%` for an empty-year fails both the `—`-glyph and the aria-label assertions.
Proves: plan.md § Components `YearAggregate` (prominent ring + centered numeral; no-data state — track only, `—` glyph, never `0%`, never a crash; `role="img"` `aria-label`; only defined M0 tokens — no `--surface-2`) + § Edge cases (fully future year — aggregate is no-data, never `0`) — covers SPEC AC #6, AC #7.
Tag: edge.

#### C-m9e-007 — success / edge (ViewSwitcher — Year now enabled; ALL FOUR segments live, none disabled, mutation-resistant)

Target file: `components/ViewSwitcher.test.tsx` (EXISTS — see § Retired / amended test IDs for the `C-m9c-012` + `C-m9d-010` amendments)
Layer: Component
**GIVEN** `<ViewSwitcher view="day" onSelect={onSelect} />` with the M9e-widened props type (`view: "day" | "month" | "week" | "year"`)
**WHEN** rendered, all four segments inspected, then each of the four is clicked in turn, then the component is re-rendered with `view="year"`
**THEN** four segments render — **Day**, **Week**, **Month**, **Year** — in that order inside a `role="tablist"` (`aria-label="Calendar view"`); **all four** are live `role="tab"` `<button>`s — **no** segment carries `aria-disabled="true"` and **no** segment is `disabled` (a mutant leaving Year `live: false` fails this enumeration); clicking each of Day / Week / Month / Year fires `onSelect` exactly once with the matching value (`"day"` / `"week"` / `"month"` / `"year"`).
**AND** re-rendering with `view="year"` sets the Year tab's `aria-selected="true"` and the filled-`var(--accent)` active style, with the other three at `aria-selected="false"`; arrow-key navigation now moves across **all four** enabled tabs with **no skip** — no tab is out of the tab order.
Proves: plan.md § Components `<ViewSwitcher>` change (Year `live: false → true`; props widen to include `"year"`; all four segments live, none disabled; Year selectable + fires `onSelect`; four-tab arrow nav, no skip) + § Regression surface — covers SPEC AC #8, AC #11.
Tag: edge.

#### C-m9e-008 — success (ViewSwitcher inside AppShell — Day↔Week↔Month↔Year round-trip, no view leaks)

Target file: `app/(building)/AppShell.test.tsx` (EXISTS — `year`-branch + round-trip cases appended)
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded with a v2 `dharma:v1` payload and `vi.setSystemTime` → `"2026-05-18"`
**WHEN** the `ViewSwitcher` segments are clicked in sequence — Day → Week → Month → Year → Month → Week → Day
**THEN** selecting **Year** renders the Empire view — the `role="list"` `aria-label="Months of 2026"` container with twelve `MonthCell`s and the `YearAggregate` ring are in the DOM, and the `Year` tab shows `aria-selected="true"`; selecting each of Day / Week / Month renders **only** that view — the Building (Day) view, the seven-row Castle (Week) list, and the twelve-cell Kingdom (Month) grid each appear alone.
**AND** at every step exactly **one** view is mounted — when Year is shown the Day/Week/Month surfaces are **not** in the DOM, and vice versa; no view leaks into another; the round-trip Day→Week→Month→Year→Month→Week→Day returns to the Building view with no crash, no console error, no hydration-mismatch warning. All four zoom levels render off the **one** shared `AppState`.
Proves: plan.md § Components `<ViewSwitcher>` + § AppShell (the `"year"` branch; the switcher round-trips Day↔Week↔Month↔Year with no view leaking) — covers SPEC AC #8, AC #13.
Tag: success.

#### C-m9e-009 — success (AppShell — year-branch + monthTarget wiring; single usePersistedState preserved)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload, `vi.setSystemTime` → `"2026-05-18"`, `usePersistedState` (or `loadState`) instrumented with a spy
**WHEN** `<AppShell />` mounts, effects flush, then the view is switched Day→Year→Month→Year→Day
**THEN** `usePersistedState` is invoked **exactly once** for the whole shell across every view switch — adding the `"year"` branch and the `monthTarget` state does not introduce a second hydration pass and does not re-run rollover; the `view` state is `"day" | "month" | "week" | "year"` and defaults to `"day"`; `<YearView>` is rendered with `state={state}` and `onOpenMonth={handleOpenMonth}` — the **same** `AppState` object the other view branches receive.
**AND** selecting Month / Week / Day / Year **via the `ViewSwitcher`** clears `monthTarget` to `null` (verified: a direct Month-view visit after a switcher selection shows today's month, not a stale tapped month); a remount (simulating a refresh) returns the view to **Day** (the `view` state is session-only React state — no `view` field is written to `localStorage`).
Proves: plan.md § Components `<AppShell>` + § The year→month tap-through (`view` widened to include `"year"`; `<YearView state={state} onOpenMonth={handleOpenMonth} />`; `monthTarget` state; `handleSelectView` clears `monthTarget`; `usePersistedState()` still runs exactly once; `view` session-only) + § Regression surface (`AppShell.test.tsx` — purely additive) — covers SPEC AC #8, AC #12, AC #13.
Tag: success.

#### C-m9e-010 — edge (AppShell — year→month tap-through opens MonthView at the tapped month, incl. out-of-range months, mutation-resistant)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** `<AppShell />` rendered with a mocked `localStorage` pre-seeded v2 payload (`programStart: "2026-05-01"`), `vi.setSystemTime` → `"2026-05-18"`, switched to the Year view
**WHEN** an in-range past month cell (March 2026), then — after returning to Year — a fully-future month cell (October 2026), then a pre-`programStart` month cell (January 2026) are each tapped
**THEN** tapping the March cell switches to the Month (Kingdom) view and `<MonthView>` renders **March 2026** — its month label reads "March 2026", not today's month (May) — `AppShell`'s `handleOpenMonth` set `monthTarget` to `{ year: 2026, month: 2 }`, `MonthView` received it via `initialMonth`, and the `monthTarget`-derived `key` remounted `MonthView` so its `useState` initializer re-ran.
**AND** tapping the fully-future October cell opens the Month view at **October 2026** and tapping the pre-`programStart` January cell opens it at **January 2026** — both render **without crashing** (SG-m9e-03 — every month is tappable, including out-of-range; `MonthView`'s existing `DayCell` classification handles future / pre-start / blank days); tapping a _different_ month after the first re-seeds `MonthView` (the `key` changes) rather than showing the stale earlier month.
Proves: plan.md § The year→month tap-through (`YearView`'s `onOpenMonth` → `handleOpenMonth` sets `monthTarget` + `setView("month")`; `MonthView` receives `initialMonth`; the `monthTarget`-derived `key` remounts `MonthView`; tapping ANY month — incl. future + pre-start — opens the Month view) + § Open questions for VERIFIER (SG-m9e-03 RESOLVED) — covers SPEC AC #10.
Tag: edge.

#### C-m9e-011 — success (MonthView — the additive initialMonth prop; omitting it is byte-identical to M9c)

Target file: `components/MonthView.test.tsx` (EXISTS — `initialMonth` cases appended; no `m9c` ID touched)
Layer: Component
**GIVEN** two `<MonthView>` renders — one **with** `initialMonth={{ year: 2026, month: 2 }}` (March 2026) and one **without** the prop — `vi.setSystemTime` → `"2026-05-18"`, the same fixture state
**WHEN** each is rendered, then prev/next-month nav is exercised on the `initialMonth` render
**THEN** the render **with** `initialMonth` shows **March 2026** as its initial displayed month (the month label reads "March 2026") — `displayed` initialized from `initialMonth` instead of `today()`; the render **without** the prop shows **May 2026** (today's month) — behavior **byte-identical** to M9c (the `useState` initializer falls back to `{ year: todayYear, month: todayMonth }`).
**AND** on the `initialMonth` render, clicking "Next month" moves to April 2026 and "Previous month" back — the prop only **seeds** the initial value; prev/next still mutate `displayed` freely afterward; every existing M9c `MonthView` test (which omits `initialMonth`) passes unchanged.
Proves: plan.md § Components `<MonthView>` + § The year→month tap-through (`initialMonth?` optional prop — `displayed` initializer becomes `initialMonth ?? { year: todayYear, month: todayMonth }`; omitting it is byte-identical; prev/next still free afterward) + § Regression surface (`MonthView.test.tsx` — additive only) — covers SPEC AC #10, AC #12.
Tag: success.

#### C-m9e-012 — success (AppShell / M9c-M9d views — Day/Week/Month branches unchanged; year wiring is purely additive)

Target file: `app/(building)/AppShell.test.tsx`
Layer: Component
**GIVEN** the M9c/M9d `AppShell` Day↔Week↔Month behavior (`C-m9c-001`/`C-m9c-002`, `C-m9d-011`/`C-m9d-012`/`C-m9d-013`) and the M9e-widened `AppShell`
**WHEN** `<AppShell />` mounts and the Day, Week, and Month views are exercised exactly as the M9c/M9d tests do
**THEN** the Day view (`BuildingClient`), the Week view (`WeekView`), and the Month view (`MonthView`) render and behave **identically** to their pre-M9e behavior — widening `view` to include `"year"`, adding the `"year"` render branch, and adding `monthTarget` are purely additive; the existing M9c/M9d `AppShell` cases pass unchanged; no console error, no hydration-mismatch warning.
**AND** the `MonthView` reached via the `ViewSwitcher` `Month` segment (not a month tap) gets `monthTarget === null` → `initialMonth` undefined → falls back to today's month — M9c Month-view behavior is byte-identical for the direct-switcher path. This ID is the M9e no-regression anchor for `AppShell` (AC #12).
Proves: plan.md § Regression surface (`AppShell.test.tsx` — no stale assertion; the `"year"` branch + `monthTarget` are purely additive; the direct-switcher Month path is unchanged) + § The year→month tap-through (a Month view reached directly via the switcher gets `monthTarget === null` → today's month) — covers SPEC AC #12, AC #13.
Tag: success.

### Accessibility (axe via Playwright)

`A-m9e-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9d sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern.

#### A-m9e-001 — a11y (Year view — axe clean, grid/list semantics, keyboard, 430px)

Target file: `tests/e2e/m9e.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport set to 430px wide, switched to the Year (Empire) view (under `count() > 0` guard)
**WHEN** axe-core runs against the year view
**THEN** it returns **zero** violations across all rule categories; the twelve month cells live in a `role="list"` (`aria-label="Months of <year>"`) container, each `MonthCell` reachable and operable by keyboard (Tab to focus, Enter/Space to open) and carrying a descriptive `aria-label` (`"<Month> <year>, score <N> percent"` / `"<Month> <year>, no data"`, `", current month"` when applicable); the prev/next-year buttons carry `aria-label`s (`"Previous year"` / `"Next year"`) and are keyboard-operable.
**AND** the 3×4 month grid (`repeat(3, 1fr)`) and the centered `YearAggregate` ring render within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`); each cell's hit area is ≥ 44px (ADR-031).
Proves: plan.md § Accessibility (`YearView` list role, `MonthCell` keyboard + labels, prev/next labels, 3×4 grid at 430px no overflow, 44px) + § Edge cases (430px viewport) — covers SPEC AC #11.
Tag: a11y.

#### A-m9e-002 — a11y (YearAggregate ring + ViewSwitcher all-four-live — axe clean, contrast, four-tab keyboard)

Target file: `tests/e2e/m9e.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the Year view visible with the `YearAggregate` ring and the `ViewSwitcher` (under `count() > 0` guard)
**WHEN** axe-core runs with colour-contrast rules enabled and the switcher is exercised by keyboard
**THEN** axe returns **zero** violations — the `YearAggregate` ring is `role="img"` with an `aria-label` (`"Year score N percent"` or `"Year score: no data"`) and its numeral is rendered as visible text (not color-only); the `MonthCell` name/numeral text (`var(--ink)` over the heat fill, AA-safe at the `0.12` alpha floor) and the no-data `—` glyph + labels (`var(--ink-dim)` on `--bg`/`--card`, AA) meet WCAG AA; the ring uses only **defined** M0 tokens (no `var(--surface-2)`).
**AND** the `ViewSwitcher` is `role="tablist"`; **all four** segments — Day, Week, Month, Year — are live `role="tab"` with `aria-selected`, keyboard-operable (Enter/Space activate; Left/Right arrows move across **all four** enabled tabs with **no skip** — no disabled tab to skip anymore); each segment's hit area is ≥ 44px (ADR-031); the four segments fit the 430px column with no overflow.
Proves: plan.md § Accessibility (`YearAggregate` ring `role="img"` + label; heat-fill alpha-floor `0.12` AA contrast; switcher tablist/tab roles, four-tab arrow nav no skip, 44px) + § Decisions to honor (ADR-031, ADR-033) — covers SPEC AC #11.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The three scenarios are the ones the plan/spec name (AC #12): switch to Year, month scores + the year aggregate render, tap a month to open the Month view.

#### E-m9e-001 — success (switch to Year — Empire view renders; all four segments live)

Target file: `tests/e2e/m9e.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), the app loaded fresh at `/` showing the Day (Building) view
**WHEN** the `ViewSwitcher` `Year` segment is tapped (under `count() > 0` guard)
**THEN** the Empire year view appears — a `role="list"` (`aria-label="Months of <year>"`) of twelve month cells, a year label, and the prominent `YearAggregate` ring; the Building view is no longer shown; tapping `Day` / `Week` / `Month` switches to each of those views — all four of Day · Week · Month · Year are reachable, **none** disabled, with no crash, no error overlay.
Proves: plan.md § Components `<ViewSwitcher>`/`<YearView>` + § AppShell — covers SPEC AC #8, AC #12 (switch-to-Year E2E scenario), AC #13.
Tag: success.

#### E-m9e-002 — success (month scores + the year aggregate render)

Target file: `tests/e2e/m9e.spec.ts`
Layer: E2E
**GIVEN** a browser with `localStorage` cleared, then — via `page.evaluate` — `dharma:v1` is set to a hand-built v2 payload with `programStart` and `currentDate` such that the displayed year has at least one fully-past month with archived `history` days scoring known values, the current month (partial), and at least one fully-future month; the app loaded fresh at `/` and switched to Year
**WHEN** the year view is inspected (under `count() > 0` guard)
**THEN** the fully-past month cell shows its computed `monthScore` (month name + heat fill + numeral), the current month cell shows a number reflecting its in-range non-future days incl. today's live score and carries the accent outline, a fully-future month cell shows the distinct `—` no-data tile (no numeral, no heat fill), and the `YearAggregate` ring displays the computed `yearScore` as a prominent percentage; prev/next-year nav moves the twelve cells + year label + aggregate to the adjacent year; no console error.
Proves: plan.md § Components `<MonthCell>`/`YearAggregate` + § `monthScore` & `yearScore` helpers — covers SPEC AC #3, AC #4, AC #5, AC #6, AC #7, AC #9, AC #12 (month-scores + year-aggregate E2E scenario).
Tag: success.

#### E-m9e-003 — success (tap a month → the M9c Month view opens at that month)

Target file: `tests/e2e/m9e.spec.ts`
Layer: E2E
**GIVEN** the browser state from `E-m9e-002` (a hand-built v2 payload), the app at `/`, the Year view shown
**WHEN** a fully-past month cell is tapped; then — after returning to Year — a fully-future month cell is tapped
**THEN** tapping the past month cell switches to the M9c Month (Kingdom) view rendering **that month** — the month label names the tapped month (not today's month), the month grid shows that month's days per M9c behavior; tapping the fully-future month cell opens the Month view at that future month and it renders correctly (empty/future days) with no crash.
**AND** returning to the Year view and selecting the `Month` segment directly via the `ViewSwitcher` shows today's month (not the stale tapped month) — the `monthTarget` reset on switcher selection works end-to-end.
Proves: plan.md § The year→month tap-through (tapping a month opens the M9c Month view at that month, incl. future months; `monthTarget` reset on switcher select) — covers SPEC AC #10, AC #12 (tap-a-month E2E scenario), AC #13.
Tag: success.

### Sandbox / preview note

Per the established M3–M9d pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 2 `A-m9e-*` and 3 `E-m9e-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9d.spec.ts` / `tests/e2e/m9c.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m9e-002`/`E-m9e-003` partly mitigate it by hand-building the `dharma:v1` v2 payload via `page.evaluate` (a deterministic year seed that does not depend on a brick-creation UI flow). M9e introduces no general deterministic seeding helper (out of scope per ADR-022). The 9 unit + 12 component IDs (`U-m9e-*`, `C-m9e-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the year/month date math, the `monthScore`/`yearScore` helpers, and every component behavior; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M9e adds 26 new `m9e` IDs (9 U + 12 C + 2 A + 3 E) and removes none.

**Amended — sanctioned, expected M9e collateral (the Year-segment enable regression surface):** enabling the Year `ViewSwitcher` segment (AC #8) makes the Year-disabled sub-assertions in `components/ViewSwitcher.test.tsx` stale. This is **sanctioned-for-amendment** under the established mechanical-migration discipline (the M9d `C-m9c-012` Week-enable precedent at M9d § Retired / amended test IDs; the M9c `BuildingClient` prop-lift precedent; the M4d chooser-walk precedent). **Two existing test IDs** carry stale Year-disabled sub-assertions and **MUST be amended** by the BUILDER in the M9e dispatch:

- **`C-m9c-012` (`components/ViewSwitcher.test.tsx`) — the `describe` block "ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled".** Two of its sub-tests assert the **Year** segment is disabled:
  - the sub-test **`it("Year segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect")`** (file lines ~91–99) — asserts `yearTab` has `aria-disabled="true"` and that clicking it does not call `onSelect`. AC #8 of M9e **enables Year** — this assertion is now false.
  - the sub-test **`it("only the Year tab is rendered as a disabled button (no crash)")`** (file lines ~102–109) — asserts `yearTab` is `toBeDisabled()`. After M9e **no** segment is disabled — this assertion is now false.
    Both sub-tests **MUST be amended**: the disabled-assertions are **inverted** to assert Year is now a **live** tab — selectable, fires `onSelect("year")` exactly once, `aria-selected` toggles when `view="year"`, not `disabled`, no `aria-disabled`. (This overlaps with M9e's own `C-m9e-007`, the canonical AC #8 coverage; the `C-m9c-012` amendment keeps the M9c file internally consistent.) **Every `C-m9c-012` sub-assertion not about the Year segment's disabled state is preserved verbatim** — the four-segment render, the `role="tablist"`/`role="tab"` structure, the `aria-label="Calendar view"`, the `aria-selected` active-indicator behavior for Day/Month, the Day/Month/Week live `onSelect` calls (the M9d-amended Week sub-tests) all stay.
- **`C-m9d-010` (`components/ViewSwitcher.test.tsx`) — the `describe` block "ViewSwitcher — Week segment enabled, selectable, fires onSelect; Year stays disabled".** Its sub-test **`it("Year is the lone remaining disabled button — clicking it fires onSelect zero times")`** (file lines ~160–169) asserts `yearTab` is `toBeDisabled()`, has `aria-disabled="true"`, and that clicking it fires `onSelect` zero times. AC #8 of M9e enables Year — this sub-test is now false and **MUST be amended**: inverted to assert Year is a live tab — `not.toBeDisabled()`, no `aria-disabled`, clicking it fires `onSelect("year")` exactly once. The `describe` block title's "; Year stays disabled" clause is correspondingly amended to "; Year now enabled" (cosmetic — the block's other sub-tests, all about Week being live, are preserved verbatim). With this amendment `C-m9d-010` becomes a four-segments-all-live assertion — consistent with `C-m9e-007`.
- **A11y / keyboard-nav skip-assertions:** any M9c/M9d sub-assertion that arrow-key navigation **skips a disabled tab** (Year) or that a disabled tab is **out of the tab order** is stale — after M9e all four tabs are in the tab order and arrow-nav crosses all four with no skip. In `ViewSwitcher.test.tsx` the skip language lives inside the `C-m9d-010` block's prose (it asserts Week being live while Year stays disabled); amending `C-m9d-010` as above removes the stale skip implication. The `A-m9d-002` a11y spec asserts "Left/Right arrows move across the **three** enabled tabs, skipping the disabled Year" — that sentence is stale; `A-m9d-002` is **amended** to "move across **all four** enabled tabs with no skip". These are mechanical, assertion-preserving edits — no a11y rule coverage is lost.
- **`A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the `test()` titled "ViewSwitcher is axe-clean, tablist aria-label, Day/Month tabs aria-selected, Week/Year aria-disabled".** This M9c a11y test carries **two** stale `aria-disabled` sub-assertions and **MUST be amended** by the BUILDER in the M9e dispatch — note one of the two has been stale since **M9d** (the M9d `A-m9d-002` amendment enabled Week but never propagated the fix back to this `A-m9c-002` test; both bad assertions sit in one test body, so they are cleaned up together here):
  - the **line 192** assertion `await expect(yearTab).toHaveAttribute("aria-disabled", "true")` (Year tab) — **stale as of M9e**: AC #8 enables the Year segment, so after M9e the Year tab carries no `aria-disabled`. This assertion is **inverted** to assert the **Year** tab is **NOT** `aria-disabled` — `expect(await yearTab.getAttribute("aria-disabled")).toBeNull()` (the live-tab form, matching the existing Month-tab sub-assertion at line ~198).
  - the **line 189** assertion `await expect(weekTab).toHaveAttribute("aria-disabled", "true")` (Week tab) — **stale since M9d** (Week went live in M9d): this assertion is **inverted** to assert the **Week** tab is **NOT** `aria-disabled` — `expect(await weekTab.getAttribute("aria-disabled")).toBeNull()` — correcting M9d's missed propagation.
  - the test **title's "Week/Year aria-disabled" clause** is amended to reflect all four tabs being live (e.g. "…Day/Month tabs aria-selected, all four tabs live").
  - **Every non-disabled-state sub-assertion in this test is preserved verbatim** — the axe-clean `expect(results.violations).toHaveLength(0)`, the tablist `aria-label` ("Calendar view"), the four-tabs-present `count() === 4`, the Day tab `aria-selected="true"`, the existing Month tab `aria-disabled` null check, the ≥ 44px hit-area / `boundingBox` check, and the no-overflow (`scrollWidth <= clientWidth`) check all stay unchanged. This is a mechanical, assertion-preserving edit — no a11y rule coverage is lost.
- **No other M1–M9d test ID is amended or retired.** The M9c/M9d `AppShell` tests exercise Day/Week/Month switching and never asserted Year was unreachable or that `view` cannot be `"year"` — widening `view` to include `"year"`, adding the `"year"` branch, and adding `monthTarget` are purely additive (anchored by the new `C-m9e-009`/`C-m9e-012`). The `MonthView` `initialMonth` prop is optional — every M9c test that omits it is byte-identical (anchored by `C-m9e-011`). The `ViewSwitcher` props-type widening (`… | "year"`) is source-only and breaks no test that does not also assert the old Year-disabled state.

**VERIFIER: please ratify the `C-m9c-012` + `C-m9d-010` + `A-m9c-002` amendments (and the `A-m9d-002` skip-language amendment)** as expected, sanctioned M9e collateral — the last switcher-enable in Milestone 9, exactly as M9d's `C-m9c-012` Week-enable was ratified and M9c's `BuildingClient` prop-lift amendments were ratified. The amendments are surfaced here, not silent. The **complete** stale-test collateral of enabling the Year segment is **four test IDs across three files**: `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — note `A-m9c-002` additionally carries one assertion stale since **M9d** (the Week tab), which this amendment also corrects. Every amendment is assertion-preserving for every sub-assertion not about a tab's disabled state. If VERIFIER prefers, the alternative ruling is to FAIL back to PLANNER to add an explicit amended-test-IDs note to `plan.md` § Regression surface (which already flags the `ViewSwitcher` Year-disabled tests as sanctioned-for-amendment).

### Spec gaps surfaced for VERIFIER

The plan resolves all three of its named spec gaps in-plan (SG-m9e-01..03 — see plan.md § Open questions for VERIFIER, all marked RESOLVED) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The `C-m9c-012` + `C-m9d-010` + `A-m9c-002` + `A-m9d-002` amendments.** See § Retired / amended test IDs above — the genuine plan↔test regression surface for M9e. The **complete** stale-test collateral of enabling the Year segment is **four test IDs across three files**: `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`), `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`). The M9e plan § Regression surface explicitly flags the `ViewSwitcher` Year-disabled tests as "sanctioned-for-amendment" and asks VERIFIER to ratify them; this entry documents the exact, assertion-preserving amendment (invert the Year sub-assertions in both `describe` blocks; invert the Year and Week `aria-disabled` sub-assertions at lines 192/189 of `A-m9c-002`; amend the `A-m9d-002` skip language). Note `A-m9c-002`'s Week-tab `aria-disabled` assertion (line 189) was already stale since **M9d** — M9d's `A-m9d-002` amendment never propagated to it; M9e corrects it here. This is the M9e analogue of the M9d `C-m9c-012` Week-enable amendment — surfaced, not silently resolved by the BUILDER.
2. **`monthScore`/`yearScore` return the un-rounded average; `MonthCell`/`YearAggregate` round for display.** The plan states `monthScore`/`yearScore` return a `number` in `[0,100]` and the display components show `Math.round(...)`. `U-m9e-005`/`U-m9e-007` therefore assert the helpers' un-rounded value via `toBeCloseTo` (e.g. `1230/18 ≈ 68.333`, `100/3 ≈ 33.333`), and `C-m9e-002`/`C-m9e-006` assert the rounded percentage at the display layer. VERIFIER may confirm rounding lives only in the components, not the helpers — the plan implies this (the `MonthCell` numeral is `Math.round(score)`) but does not state the helpers are un-rounded in so many words. This is not an ambiguity that blocks the BUILDER; both readings of an exact-integer fixture (e.g. `monthScore → 30`) agree.
3. **`yearScore` may diverge from the mean of the twelve `monthScore`s — by design (SG-m9e-01).** The plan resolves SG-m9e-01 in favor of day-averaging; `U-m9e-007` pins a fixture where the two aggregations give different numbers (`33.333` day-averaged vs `50` month-averaged) and asserts the day-averaged value. VERIFIER ratifies that this divergence is correct and expected — the Year view shows `monthScore` per cell + `yearScore` as the aggregate without any requirement that they reconcile (the same reasoning ADR-046 applied to `weekScore`). Not a gap — a sanctioned consequence the plan names explicitly.
4. **`WeekAggregate` reuse for the `YearAggregate` ring.** The plan's baseline is the BUILDER copying M9d's proven `WeekAggregate` ring shape into an inline `YearAggregate` (changing only the label `"Week"→"Year"` and the `aria-label` prefix), with a shared extracted `<ScoreRing>` an _optional_ Refactor-step move. `C-m9e-006` asserts the rendered outcome (a ring + `"N%"` numeral, `role="img"`, no `--surface-2`) without pinning which implementation the BUILDER picks — either satisfies the test. Likewise, if the BUILDER extracts a shared `averageDays(state, dates)` helper for `weekScore`/`monthScore`/`yearScore`, the M9d `weekScore` tests (`U-m9d-004..009`) are the byte-identical-behavior guard — VERIFIER may note this, it is a sanctioned BUILDER choice within the plan, not a gap.

No ADR is reversed: **ADR-046** (period-aggregate helpers are pure; "today" is `state.currentDate`, never the clock; missed-in-range = 0; `NO_DATA` sentinel; UTC-drift-free date math) is the **heart of m9e** — `monthScore`/`yearScore` inherit its contract verbatim, enforced by `U-m9e-004`/`U-m9e-006`/`U-m9e-008`/`U-m9e-009`; **ADR-045** (`history`/`currentDate` are the read-only data source) is honored — `monthScore`/`yearScore` are pure reads built on `dayScore`, M9e writes no `history`, mutates no `AppState`, bumps no schema (stays `v2`); **ADR-019** (`0=Sun…6=Sat` weekday convention) is inherited via the M9c `monthGrid.ts` the tapped Month view reuses; **ADR-033** (the single-% ring is the score signature) governs the `<YearAggregate>` ring; **ADR-038** (forgiveness — missed = gray) governs the no-data `MonthCell` tile; **ADR-031** (44px touch targets) is enforced by `A-m9e-001`/`A-m9e-002` and the cell/button sizing; **ADR-018** governs the deferred-to-preview E2E pattern. M9e adds 26 `m9e` test IDs (9 U + 12 C + 2 A + 3 E) and retires none; it amends four existing test IDs across three files as sanctioned, expected M9e collateral (VERIFIER to ratify) — `C-m9c-012` and `C-m9d-010` in `components/ViewSwitcher.test.tsx`, the skip-language in `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`), and the stale Week/Year `aria-disabled` assertions (lines 189/192) in `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`). With m9e, **Milestone 9 — the calendar — is complete: all four switcher views (Day · Week · Month · Year) are live.**

### AC → test-ID coverage map (all 13 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                          | Test ID(s)                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Year view renders a twelve-month overview — twelve month cells, each labeled with its month name                            | `U-m9e-001`, `U-m9e-002`, `U-m9e-003`, `C-m9e-001`                                                                                              |
| #2  | The view is labeled with the displayed year                                                                                 | `U-m9e-001`, `C-m9e-001`, `C-m9e-003`                                                                                                           |
| #3  | Each month cell shows a score indicator; a distinct no-data treatment for months with no in-range non-future days           | `U-m9e-006`, `C-m9e-002`, `C-m9e-004`, `C-m9e-005`, `E-m9e-002`                                                                                 |
| #4  | `monthScore` — avg of `dayScore` over in-range non-future days; missed-in-range = 0; future + pre-start excluded; pure      | `U-m9e-004`, `U-m9e-005`, `U-m9e-006`, `U-m9e-009`, `E-m9e-002`                                                                                 |
| #5  | `yearScore` — avg of `dayScore` over the year's in-range non-future days directly (not the twelve `monthScore`s); same rule | `U-m9e-003`, `U-m9e-007`, `U-m9e-008`, `U-m9e-009`, `E-m9e-002`                                                                                 |
| #6  | The Year view displays the year aggregate prominently; a no-qualifying-day year → no-data state, never `0`, never a crash   | `U-m9e-008`, `C-m9e-006`, `E-m9e-002`                                                                                                           |
| #7  | The current month's cell AND the year aggregate both include today's live `dayPct`                                          | `U-m9e-005`, `U-m9e-008`, `C-m9e-002`, `C-m9e-006`, `E-m9e-002`                                                                                 |
| #8  | The Year switcher segment is enabled; selecting it renders the Empire view; all four segments live, none disabled           | `C-m9e-007`, `C-m9e-008`, `C-m9e-009`, `E-m9e-001`                                                                                              |
| #9  | Prev/next controls move the Year view, updating the twelve cells + year label + aggregate                                   | `U-m9e-001`, `C-m9e-003`, `E-m9e-002`                                                                                                           |
| #10 | Tapping a month cell opens the M9c Month view at that month (incl. empty/future/pre-start months)                           | `C-m9e-005`, `C-m9e-010`, `C-m9e-011`, `E-m9e-003`                                                                                              |
| #11 | 430px renders the twelve-month grid without overflow; axe a11y clean; cells + nav keyboard-operable + screen-reader-labeled | `C-m9e-007`, `A-m9e-001`, `A-m9e-002`                                                                                                           |
| #12 | No regression to M1–M9d; quality gates clean; E2E covers switch-to-Year / month scores + year aggregate / tap-a-month       | **gate (`npm run eval`)** + `C-m9c-012`/`C-m9d-010`/`A-m9c-002`/`A-m9d-002` amendments + `C-m9e-009`/`C-m9e-011`/`C-m9e-012` + `E-m9e-001..003` |
| #13 | The switcher round-trips Day↔Week↔Month↔Year, all rendering off the one shared `AppState`, no view leaking into another     | `C-m9e-008`, `C-m9e-009`, `E-m9e-001`, `E-m9e-003`                                                                                              |

**Gate-verified portion:** AC #12's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b/M9c/M9d precedent. AC #12's no-regression half is anchored by the four sanctioned amendments `C-m9c-012` + `C-m9d-010` (`components/ViewSwitcher.test.tsx`) + `A-m9d-002` (`tests/e2e/m9d.a11y.spec.ts`) + `A-m9c-002` (`tests/e2e/m9c.a11y.spec.ts`) — the complete stale-test surface of enabling the Year segment — plus `C-m9e-009`/`C-m9e-011`/`C-m9e-012` (the `AppShell` year-branch + `monthTarget` wiring and the `MonthView` `initialMonth` prop are purely additive — Day/Week/Month behavior byte-equivalent). All other 12 ACs map to at least one bespoke `m9e` test ID; every `m9e` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** current year — partial current month → `U-m9e-005`/`C-m9e-002`; fully past year → `U-m9e-005` (its current-month + fully-past-month branches)/`E-m9e-002`; fully future year → `U-m9e-006`/`U-m9e-008`/`C-m9e-003`/`C-m9e-006`; year containing `programStart` → `U-m9e-006`/`U-m9e-007`/`C-m9e-002`; first run (empty `history`) → `U-m9e-008`; month with 0 score vs month never opened → `U-m9e-004` (missed-in-range = 0 → a low/0 _number_, not `null`)/`C-m9e-004` (the "0" numeral vs "—" glyph distinctness); prev/next far past `programStart` or far into the future → `C-m9e-003`; leap year → `U-m9e-003`; tapping a future / pre-start month → `C-m9e-010`/`E-m9e-003`; 430px → `A-m9e-001`/`A-m9e-002`; heat-fill alpha-floor contrast → `A-m9e-002`; reduced motion → governed by the M0 `[data-motion]` token contract (no bespoke ID — M9e adds no year-slide animation; prev/next year is instant, per the M9c/M9d precedent); `monthScore`/`yearScore` purity under an advanced clock → `U-m9e-009` (ADR-046).

## Milestone 5 — Edit Mode + Delete — Tests

This entry covers M5 — the two verbs that make a day **revisable**: a moded **Edit Mode** (a top-bar pencil toggle flipping a Locked ↔ Unlocked surface) and a recurrence-aware **Delete** (an always-visible `×` on every block + brick, every `×` opening a confirmation modal; for a recurring block a **Just today** vs **All recurrences** choice). It is derived from the `plan.md` M5 entry (`## Milestone 5 — Edit Mode + Delete — Plan`, commit `0cbde67`). Feature slug: `m5`. ID prefixes: `U-m5-`, `C-m5-`, `E-m5-`, `A-m5-`. M5 spans a genuine pure-logic surface (the three reducer arms, the v2→v3 migrator, `currentDayBlocks`) and a real UI surface (the pencil toggle, the block/brick affordances, the new `DeleteConfirmModal`, the `BuildingClient` delete flow), so it has a full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M5 has a **large genuine unit + component surface** — the three reducer arms (`DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `DELETE_BRICK`), the additive v2→v3 migrator, the pure `currentDayBlocks` helper, the `defaultState`/`defaultPersisted` `deletions` defaults, plus every Edit-Mode affordance and the `DeleteConfirmModal` variants. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. One AC is honestly part-gate-verified, consistent with the M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) / M9d (#13) / M9e (#12) precedent:

- **AC #14 (no regression to M1–M9e; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers toggle Edit Mode / a "just today" block delete / an "all recurrences" block delete / a brick delete)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the sanctioned amendments listed in § Retired / amended test IDs (the `TopBar` `aria-label` and `persist.test.ts` `SCHEMA_VERSION`/`defaultState` collateral) plus `C-m5-019` (the `BuildingClient` `Timeline` feed via `currentDayBlocks(state)` is byte-identical when `state.deletions` is empty — the default — so existing `BuildingClient` tests pass unchanged); the four named E2E scenarios are authored as real `test()` blocks (`E-m5-001..004`).

All other 13 ACs map to at least one concrete bespoke `m5` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M8/M9a–M9e discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m5-001` (`DELETE_BLOCK_TODAY` key shape) asserts the EXACT key string** `` `${state.currentDate}:${blockId}` `` is set to `true` — for `currentDate: "2026-05-18"` and `blockId: "blk-A"` the test asserts `state.deletions["2026-05-18:blk-A"] === true` and that **no other key** is added (`Object.keys(next.deletions).length` grows by exactly 1). A mutant building the key from `new Date()` (the wall clock, ADR-020 violation) or from a different separator fails the exact-string assertion.
- **`U-m5-002` (`DELETE_BLOCK_TODAY` leaves `state.blocks` untouched) asserts `next.blocks === state.blocks`** (same reference) — the template survives "just today" (AC #6). A mutant that filters `blocks` in the `DELETE_BLOCK_TODAY` arm fails the referential-identity assertion.
- **`U-m5-004` (`DELETE_BLOCK_ALL` does NOT rewrite `history`) asserts `next.history === state.history`** (same reference, structurally unchanged) — ADR-045's read-only `history` is enforced by reference identity, not a deep compare a mutant could satisfy by cloning. The block id under test is present in a fixture `ArchivedDay`; the test asserts that `ArchivedDay` still contains the block after the delete.
- **`U-m5-003`/`U-m5-005`/`U-m5-006` (immutability) freeze the input** — `Object.freeze` on `state`, `state.blocks`, each `Block`, `state.looseBricks`, `state.deletions`, `state.history` — and assert the reducer arm `not.toThrow()` and returns a new top-level object (`next !== state`) without mutating any nested collection. A mutant doing an in-place `push`/`splice`/property-set fails under the freeze.
- **`U-m5-007` (`DELETE_BRICK` no-op on a missing id) asserts the ORIGINAL `state` reference is returned** (`next === state`) when `brickId` matches no brick — the M4f `SET_UNITS_DONE` array-identity pattern. A mutant that always rebuilds `blocks`/`looseBricks` returns a fresh-but-equal object and fails the `===` assertion.
- **`U-m5-009` (the v2→v3 migrator) asserts the migrated payload `toEqual` the v2 payload PLUS `deletions: {}` PLUS `schemaVersion: 3`, field-by-field** — every v2 day-data field (`programStart`, `currentDate`, `blocks`, `categories`, `looseBricks`, `history`) is asserted byte-identical (zero data loss); a mutant dropping or mangling any v2 field fails. `SCHEMA_VERSION` is asserted strictly `=== 3`.
- **`U-m5-013` (`currentDayBlocks` suppression specificity) asserts a `deletions` key for a DIFFERENT date does NOT suppress today** — a fixture with `deletions: { "2026-05-17:blk-A": true }` and `currentDate: "2026-05-18"` returns `blk-A` in the output; only the exact `${currentDate}:${id}` key suppresses. A mutant matching on a substring or on the block id alone fails.
- **`C-m5-002` (Edit Mode not persisted) asserts a `localStorage.setItem` spy records NO write whose value contains an `editMode`/edit-mode field** when the pencil is toggled, and that `PersistedState` has no edit-mode key — SG-m5-04 enforced as a structural absence, not a guarded default a mutant could un-guard.
- **`C-m5-006`/`C-m5-008` (suppressed log — no double-fire) assert that in Edit Mode the brick/block main-body tap fires `onTickToggle`/`onUnitsOpenSheet`/the expand handler ZERO times** (`vi.fn()` spies with `toHaveBeenCalledTimes(0)`), while the `×` fires `onRequestDelete*` exactly once — SG-m5-05's no log+delete double-fire is a numeric call-count assertion.
- **`C-m5-009` (the confirm modal is never a one-tap delete) asserts that tapping a block/brick `×` dispatches NO delete action** — only `setPendingDelete` runs and the modal mounts; the delete action fires solely from a modal confirm button. A mutant that deletes directly on the `×` tap fails (the dispatch spy shows zero `DELETE_*` actions until a modal button is pressed).

### Test ID layout

| Layer                                 | IDs             | Count  |
| ------------------------------------- | --------------- | ------ |
| Unit (Vitest)                         | `U-m5-001..014` | 14     |
| Component (Vitest + Testing Library)  | `C-m5-001..020` | 20     |
| Accessibility (axe via Playwright)    | `A-m5-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m5-001..004` | 4      |
| **Total**                             |                 | **41** |

ID series start values were supplied by the orchestrator as the running totals for the four `m5` prefixes; m5 introduces four fresh prefixes (`U-m5-`, `C-m5-`, `E-m5-`, `A-m5-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m5 IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `deletions: {}`, `history: {}`, plus the blocks/bricks below.
- **`blk-recur`** — a recurring block (`recurrence.kind: "every-day"`), name `"Morning"`, holding two bricks `brk-1` (tick) and `brk-2` (units).
- **`blk-once`** — a non-recurring block (`recurrence.kind: "just-today"`), name `"One-off"`, holding one brick `brk-3` (tick).
- **`blk-range`** — a `recurrence.kind: "custom-range"` block whose range is a single day — the degenerate "recurring" case.
- **`brk-loose`** — a loose brick in `state.looseBricks` (tick kind).
- A **v2 persisted payload** fixture: `{ schemaVersion: 2, programStart, currentDate, blocks, categories, looseBricks, history }` with **no** `deletions` field (the M9b-era shape).
- A **v3 persisted payload** fixture: the v2 fixture plus `deletions: { "2026-05-18:blk-recur": true }` and `schemaVersion: 3`.

### Unit (Vitest)

`U-m5-001..008` exercise the three new reducer arms in `lib/data.ts` (pure `(state, action)` — no clock, no `localStorage`, driven directly). `U-m5-009..012` exercise the v2→v3 migrator + `SCHEMA_VERSION` + round-trip in `lib/persist.ts` / `lib/usePersistedState.ts`. `U-m5-013..014` exercise the pure `currentDayBlocks` helper in `lib/currentDayBlocks.ts`.

#### U-m5-001 — success (DELETE_BLOCK_TODAY — writes the exact `${currentDate}:${blockId}` key, mutation-resistant)

Target file: `lib/data.test.ts` (EXISTS — m5 reducer cases appended; no M1–M9e ID touched)
Layer: Unit
**GIVEN** the standing fixture `state` (`currentDate: "2026-05-18"`, `deletions: {}`) holding `blk-recur`, and `reducer` from `lib/data.ts`
**WHEN** `reducer(state, { type: "DELETE_BLOCK_TODAY", blockId: "blk-recur" })` is dispatched
**THEN** the returned state's `deletions` has the **exact** key `"2026-05-18:blk-recur"` set to `true` (`expect(next.deletions["2026-05-18:blk-recur"]).toBe(true)`) — the key is `` `${state.currentDate}:${action.blockId}` `` built from `state.currentDate`, never the wall clock (ADR-020); `Object.keys(next.deletions)` has length exactly `1` (no other key added).
**AND** dispatching `DELETE_BLOCK_TODAY` for the same block id a second time is idempotent — the same key stays `true` and no new key appears; the result deep-equals the first delete.
Proves: plan.md § Reducer arms (`DELETE_BLOCK_TODAY` — key `` `${state.currentDate}:${action.blockId}` `` set to `true`; idempotent) + § Data model (`deletions` key grammar) + § Decisions (ADR-018, ADR-020) — covers SPEC AC #6.
Tag: success.

#### U-m5-002 — success (DELETE_BLOCK_TODAY — leaves `state.blocks` untouched; the template survives)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-recur` + `blk-once`, `deletions: {}`
**WHEN** `reducer(state, { type: "DELETE_BLOCK_TODAY", blockId: "blk-recur" })` is dispatched
**THEN** `next.blocks` is the **same reference** as `state.blocks` (`expect(next.blocks).toBe(state.blocks)`) — the block template is not removed, not filtered, not cloned; only `deletions` changes. `next.blocks` still contains `blk-recur` with its two bricks intact.
**AND** `next.looseBricks`, `next.categories`, and `next.history` are all the same references as on the input `state` — `DELETE_BLOCK_TODAY` touches `deletions` only.
Proves: plan.md § Reducer arms (`DELETE_BLOCK_TODAY` — "`state.blocks` is untouched (the template survives — AC #6)") — covers SPEC AC #6.
Tag: success.

#### U-m5-003 — edge (DELETE_BLOCK_TODAY — immutable; key set even for a block id not in `state.blocks`)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen** (`Object.freeze` on `state`, `state.blocks`, each `Block`, `state.looseBricks`, `state.deletions`, `state.categories`, `state.history`)
**WHEN** `reducer(frozenState, { type: "DELETE_BLOCK_TODAY", blockId: "blk-recur" })` is dispatched, and separately `reducer(frozenState, { type: "DELETE_BLOCK_TODAY", blockId: "ghost-id" })` (a block id not present in `state.blocks`)
**THEN** neither call throws (`not.toThrow()`); each returns a new top-level object (`next !== state`) with a new `deletions` object — the input `state` and every nested collection are referentially and structurally unchanged after both calls.
**AND** the `"ghost-id"` dispatch still sets `deletions["2026-05-18:ghost-id"] = true` unconditionally — a key for a block id not currently in `state.blocks` is harmless (it only ever suppresses a render; `currentDayBlocks` no-ops on it); no crash.
Proves: plan.md § Reducer arms (`DELETE_BLOCK_TODAY` immutable; "the key is set unconditionally even if `blockId` is not currently in `state.blocks` — harmless") + § Edge cases ("a 'just today' key for a block id not applicable today") — covers SPEC AC #6.
Tag: edge.

#### U-m5-004 — success / edge (DELETE_BLOCK_ALL — removes the template from `state.blocks`, does NOT rewrite `state.history`, mutation-resistant)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-recur` + `blk-once`, plus `history = { "2026-05-10": <ArchivedDay whose snapshot includes blk-recur as logged> }`
**WHEN** `reducer(state, { type: "DELETE_BLOCK_ALL", blockId: "blk-recur" })` is dispatched
**THEN** `next.blocks` no longer contains `blk-recur` (`next.blocks.find(b => b.id === "blk-recur")` is `undefined`) and **still** contains `blk-once` — `state.blocks` is filtered by id; the template is gone from today and every future day (AC #7).
**AND** `next.history` is the **same reference** as `state.history` (`expect(next.history).toBe(state.history)`) — ADR-045: the archived `ArchivedDay` for `"2026-05-10"` is byte-identical and still shows `blk-recur` as it was logged; `DELETE_BLOCK_ALL` writes `state.blocks` **only** and never touches `history`. `next.deletions` is also the same reference (stale keys not pruned, SG-m5-06).
Proves: plan.md § Reducer arms (`DELETE_BLOCK_ALL` — filters `state.blocks` only; `state.history` NOT touched) + § "All recurrences" + `history` (ADR-045) + § Edge cases ("'All recurrences' on a block in `history`") — covers SPEC AC #7.
Tag: edge.

#### U-m5-005 — edge (DELETE_BLOCK_ALL — immutable; no-op on a missing block id)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen** as in `U-m5-003`
**WHEN** `reducer(frozenState, { type: "DELETE_BLOCK_ALL", blockId: "blk-once" })` and separately `reducer(frozenState, { type: "DELETE_BLOCK_ALL", blockId: "ghost-id" })` are dispatched
**THEN** the `"blk-once"` call does not throw, returns `next !== state`, and `next.blocks` excludes `blk-once`; the input `state` and its nested collections are referentially unchanged (the `filter` does not mutate).
**AND** the `"ghost-id"` call (a block id not found) is a no-op — `next.blocks` deep-equals `state.blocks` (the `filter` returns an equivalent array); no throw, no crash.
Proves: plan.md § Reducer arms (`DELETE_BLOCK_ALL` immutable; "No-op if `blockId` not found") — covers SPEC AC #7.
Tag: edge.

#### U-m5-006 — success / edge (DELETE_BRICK — removes a brick from its parent block AND from `looseBricks`, immutable)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen**, holding `blk-recur` (bricks `brk-1`, `brk-2`) and `looseBricks` containing `brk-loose`
**WHEN** `reducer(frozenState, { type: "DELETE_BRICK", brickId: "brk-1" })` is dispatched, and separately `reducer(frozenState, { type: "DELETE_BRICK", brickId: "brk-loose" })`
**THEN** the `"brk-1"` call returns a state whose `blk-recur.bricks` no longer contains `brk-1` but **still** contains `brk-2`; `looseBricks` is unchanged; no throw under the freeze; `next !== state`.
**AND** the `"brk-loose"` call returns a state whose `looseBricks` no longer contains `brk-loose` while `state.blocks` is unchanged — `DELETE_BRICK` removes the brick from whichever container holds it (a parent block's `bricks[]` **or** the loose tray). `next.history` is the same reference (ADR-045 — `history` untouched).
Proves: plan.md § Reducer arms (`DELETE_BRICK` — removes the brick from `looseBricks` OR the parent block's `bricks[]`; immutable; `history` untouched) — covers SPEC AC #9.
Tag: success.

#### U-m5-007 — edge (DELETE_BRICK — no-op on a missing brick id returns the original `state` reference)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-recur` + `brk-loose`
**WHEN** `reducer(state, { type: "DELETE_BRICK", brickId: "ghost-brick" })` is dispatched (a brick id present in neither any block nor `looseBricks`)
**THEN** the returned value is the **same reference** as the input `state` (`expect(next).toBe(state)`) — mirroring the M4f `SET_UNITS_DONE` array-identity pattern: when nothing changed, the reducer returns the original `state` so React skips a needless re-render. No throw.
**AND** deleting a brick that lives inside `blk-recur` removes only that brick — the sibling brick and the block template survive (the brick lives nested in `block.bricks`, not orphaned).
Proves: plan.md § Reducer arms (`DELETE_BRICK` — "return the original `state` reference if nothing changed (no-op on a missing id)") — covers SPEC AC #9.
Tag: edge.

#### U-m5-008 — edge (the Action union + `assertNever` exhaustiveness — the three new members compile-force their arms)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** `reducer` from `lib/data.ts` and the `Action` union from `lib/types.ts` extended with `DELETE_BLOCK_TODAY`, `DELETE_BLOCK_ALL`, `DELETE_BRICK`
**WHEN** each of the three new action types is dispatched, and an `Action`-typed value is exhaustively handled
**THEN** all three new action types are handled by a real `case` arm — `reducer` returns a defined `AppState` for each (never falls through to the `default`/`assertNever` branch); dispatching an existing M1–M9e action (e.g. `ADD_BLOCK`, `LOG_TICK_BRICK`) still behaves byte-identically (the union widening is additive — no existing arm changed).
**AND** the `default` arm's `assertNever(action)` is still present and the file type-checks — adding the three union members **without** their `case` arms is a TypeScript compile error (the ADR-043 exhaustiveness guarantee); this AC is proven structurally (the suite type-checks under `tsc` only with all three arms present).
Proves: plan.md § Reducer arms ("`assertNever(action)` in `default` stays — adding the union members without these arms is a TS compile error") + § Decisions (ADR-043) — covers SPEC AC #6, AC #7, AC #9.
Tag: edge.

#### U-m5-009 — success / edge (v2→v3 migrator — additive, lossless; `SCHEMA_VERSION === 3`, mutation-resistant)

Target file: `lib/persist.test.ts` (EXISTS — m5 migrator cases appended; the stale `SCHEMA_VERSION === 2` assertions amended — see § Retired / amended test IDs)
Layer: Unit
**GIVEN** the v2 persisted payload fixture (`schemaVersion: 2`, full day data, **no** `deletions` field) and `SCHEMA_VERSION` + `loadState`/`migrate` from `lib/persist.ts`
**WHEN** the v2 payload is loaded through the migrator
**THEN** the migrated result `toEqual` the v2 payload **plus** `deletions: {}` **plus** `schemaVersion: 3` — every v2 field (`programStart`, `currentDate`, `blocks`, `categories`, `looseBricks`, `history`) is asserted byte-identical (zero day-data loss); the only additions are `deletions: {}` and the bumped `schemaVersion`. `SCHEMA_VERSION` is asserted strictly `=== 3` (`expect(SCHEMA_VERSION).toBe(3)`).
**AND** a v1 payload (the pre-M9b shape) loaded through the migrator also lands at `schemaVersion: 3` with `deletions: {}` and its v1 day data preserved — the v1→v2→v3 ladder is unbroken (ADR-044/ADR-045 carry-forward); an unknown/future `schemaVersion` (e.g. `4`, non-numeric, absent) → `migrate` returns `null` → `loadState` falls back to `defaultPersisted()`.
Proves: plan.md § v2→v3 migrator (additive, lossless; `case 1`/`case 2` produce the v3 shape; `case 3` the v3 load+coerce arm; `default` → `null`) + § Data model (`SCHEMA_VERSION = 3`) — covers SPEC AC #10.
Tag: edge.

#### U-m5-010 — edge (v3 payload round-trips; `deletions` coerced defensively)

Target file: `lib/persist.test.ts`
Layer: Unit
**GIVEN** the v3 persisted payload fixture (`schemaVersion: 3`, `deletions: { "2026-05-18:blk-recur": true }`) and three malformed-`deletions` variants of it — `deletions` set to `null`, to an array `[]`, and to a string
**WHEN** each is loaded through the migrator
**THEN** the well-formed v3 payload round-trips intact — the loaded result deep-equals the input, `deletions` preserved key-for-key, `schemaVersion` stays `3`.
**AND** for each malformed-`deletions` variant the `case 3` arm coerces `deletions` to `{}` (a non-null, non-array object is required; otherwise `{}`) while every other field is coerced exactly as the old v2 arm did — no throw, no crash; the rest of the day data survives.
Proves: plan.md § v2→v3 migrator (`case 3` — "reads `deletions` defensively (`obj.deletions` must be a non-null non-array object; otherwise coerce to `{}`)") — covers SPEC AC #10.
Tag: edge.

#### U-m5-011 — success (`defaultState` / `defaultPersisted` carry an empty `deletions`)

Target file: `lib/data.test.ts` / `lib/persist.test.ts` (the `defaultState` half in `data.test.ts`, the `defaultPersisted` half in `persist.test.ts`)
Layer: Unit
**GIVEN** `defaultState()` from `lib/data.ts` and `defaultPersisted()` from `lib/persist.ts`
**WHEN** each is called on a cold start
**THEN** `defaultState().deletions` is an empty object (`toEqual({})`) — a fresh in-memory `AppState` starts with no overrides; `defaultPersisted()` returns `{ schemaVersion: 3, …, deletions: {} }` — `schemaVersion` is `3` and `deletions` is `{}`.
**AND** `defaultState()` carries `deletions` but **no** `schemaVersion` key (`schemaVersion` is `PersistedState`-only, SG-m8-04 separation preserved); `defaultPersisted()` carries both. Neither carries any `editMode`/edit-mode field (SG-m5-04 — Edit Mode is never persisted).
Proves: plan.md § File structure (`defaultState()` gains `deletions: {}`; `defaultPersisted()` gains `deletions: {}` + `schemaVersion: 3`) + § Data model (`schemaVersion` is `PersistedState`-only; SG-m5-04) — covers SPEC AC #10.
Tag: success.

#### U-m5-012 — success (persistence round-trip — `projectToAppState` / `toPersisted` carry `deletions`; a delete survives a reload)

Target file: `lib/usePersistedState.test.tsx` (EXISTS — m5 cases appended)
Layer: Unit
**GIVEN** `projectToAppState` and `toPersisted` from `lib/usePersistedState.ts`, and a v3 `PersistedState` with `deletions: { "2026-05-18:blk-recur": true }`
**WHEN** the persisted state is projected to an `AppState`, a `DELETE_BLOCK_TODAY` is applied, the result is lifted back via `toPersisted`, and re-projected
**THEN** `projectToAppState` carries `deletions` through to the runtime `AppState` and **strips** `schemaVersion`; `toPersisted` lifts `deletions` back and **re-stamps** `schemaVersion: 3`; the round-tripped `deletions` is byte-identical to the pre-round-trip value.
**AND** after a simulated reload (`toPersisted` → `JSON.stringify` → `JSON.parse` → `migrate` → `projectToAppState`) every delete — a `DELETE_BLOCK_TODAY` key, a `DELETE_BLOCK_ALL` block removal, a `DELETE_BRICK` removal — is still in effect; the post-delete `AppState` is exactly restored (AC #10's "every delete survives a reload").
Proves: plan.md § File structure (`projectToAppState` carries `deletions`; `toPersisted` lifts it + stamps `schemaVersion: 3`) + § Data model — covers SPEC AC #10.
Tag: success.

#### U-m5-013 — success / edge (`currentDayBlocks` — drops a block keyed in `deletions` for `currentDate`, keeps every other block, mutation-resistant)

Target file: `lib/currentDayBlocks.test.ts` (NEW)
Layer: Unit
**GIVEN** `currentDayBlocks` from `lib/currentDayBlocks.ts` and a fixture `state` with `currentDate: "2026-05-18"`, `blocks: [blk-recur, blk-once]`, and `deletions: { "2026-05-18:blk-recur": true }`
**WHEN** `currentDayBlocks(state)` is called
**THEN** it returns an array containing **only** `blk-once` — `blk-recur` is suppressed because `deletions["2026-05-18:blk-recur"]` is `true`; the return is a `Block[]` and the suppressed block is absent.
**AND** a `deletions` key for a **different date** does NOT suppress today — with `deletions: { "2026-05-17:blk-recur": true }` and `currentDate: "2026-05-18"`, `currentDayBlocks(state)` returns **both** `blk-recur` and `blk-once`; only the exact `` `${state.currentDate}:${b.id}` `` key suppresses (SG-m5-06 — a stale yesterday key is harmless). A `deletions` key for a block id not in `state.blocks` is also harmless — it suppresses nothing and does not crash.
Proves: plan.md § Day-render wiring (`currentDayBlocks` — `return state.blocks.filter(b => !state.deletions[\`${state.currentDate}:${b.id}\`])`; the single join site) + § Edge cases ("a 'just today' key for a block id not applicable today") — covers SPEC AC #11.
Tag: edge.

#### U-m5-014 — edge (`currentDayBlocks` — empty `deletions` is the identity filter; pure and immutable)

Target file: `lib/currentDayBlocks.test.ts`
Layer: Unit
**GIVEN** `currentDayBlocks` and a fixture `state` deeply **frozen**, with `deletions: {}` and `blocks: [blk-recur, blk-once, blk-range]`
**WHEN** `currentDayBlocks(state)` is called twice with the same `state`
**THEN** with an empty `deletions` it returns all three blocks in `state.blocks` order — `currentDayBlocks` is the identity filter when there are no overrides (so feeding `Timeline` from `currentDayBlocks(state)` is byte-identical to feeding it `state.blocks` directly, the default case — AC #14 no-regression anchor); no throw under the freeze; `state` is not mutated.
**AND** `currentDayBlocks` reads no clock and no `localStorage` — it derives the key prefix from `state.currentDate`; two calls with the same `state` return deep-equal results regardless of the system clock (ADR-020 discipline). **Scope note for VERIFIER:** `currentDayBlocks` filters by `deletions` **only** — it does NOT filter `state.blocks` through `appliesOn`. The plan (§ Day-render wiring resolution (a)) defers any Day-view `appliesOn` wiring to a separate spec entry; these tests therefore do not assert `appliesOn` filtering in the Day render. See § Spec gaps surfaced for VERIFIER item 1.
Proves: plan.md § Day-render wiring (`currentDayBlocks` is a pure helper; empty `deletions` ⇒ identity; resolution (a) — `deletions` only, no `appliesOn`) — covers SPEC AC #11.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m5-001..003` cover the `<TopBar>` pencil Edit-Mode toggle; `C-m5-004..005` cover `<TimelineBlock>` Edit-Mode affordances (jiggle, `×`); `C-m5-006..008` cover the suppressed tap/log routing (`TimelineBlock`, `BrickChip`, `TimedLooseBrickCard`); `C-m5-009..014` cover `<DeleteConfirmModal>` variants + the `BuildingClient` delete flow; `C-m5-015..017` cover brick delete + the recurring-block two-way outcomes; `C-m5-018..020` cover removal animation, score recompute, and the empty-state / regression anchors. All render with React Testing Library; Edit Mode is supplied by wrapping the subject in `<EditModeProvider>` (or a test double exposing `{ editMode, toggle }`); `prefers-reduced-motion` is controlled via a `matchMedia` mock / the M0 reduced-motion test helper; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test mounting `<BuildingClient>` (which calls `usePersistedState`).

#### C-m5-001 — success (TopBar — pencil toggles Locked ↔ Unlocked; state visually + SR-discernible)

Target file: `components/TopBar.test.tsx` (EXISTS — m5 cases appended; the stale `aria-label="Edit"` assertion amended — see § Retired / amended test IDs)
Layer: Component
**GIVEN** `<TopBar />` wrapped in `<EditModeProvider>` (default `editMode === false`)
**WHEN** the pencil button is queried, then clicked, then clicked again
**THEN** in the Locked (default) state the pencil `<button>` carries `aria-pressed="false"` and a state-discernible `aria-label="Edit mode, off"`, styled with the neutral Locked treatment (`var(--card)` background, `var(--ink-dim)` icon); after one click it is Unlocked — `aria-pressed="true"`, `aria-label="Edit mode, on"`, and the Unlocked visual treatment (`var(--accent)`-tinted border + icon); after a second click it settles back to Locked (`aria-pressed="false"`, `aria-label="Edit mode, off"`, neutral styling).
**AND** the state is conveyed by **more than colour** — both `aria-pressed` and the worded `aria-label` change (AC #1); the pencil button's hit area is ≥ 44px (`h-11 w-11`, ADR-031).
Proves: plan.md § Components `<TopBar>` (pencil toggle — `aria-pressed` + state-discernible `aria-label` + Locked/Unlocked visual treatment; ≥44px) — covers SPEC AC #1, AC #4.
Tag: success.

#### C-m5-002 — edge (TopBar — `light` haptic on toggle; Edit Mode is NOT persisted, boots Locked, mutation-resistant)

Target file: `components/TopBar.test.tsx`
Layer: Component
**GIVEN** `<TopBar />` in `<EditModeProvider>`, with `haptics.light` and `localStorage.setItem` spied
**WHEN** the pencil is toggled on and then off, and the provider is re-mounted fresh
**THEN** each toggle fires `haptics.light()` exactly once (the M0 edit-mode tap haptic); a freshly re-mounted `<EditModeProvider>` boots with `editMode === false` (Locked) — `useState(false)` guarantees a Locked cold boot.
**AND** **no** `localStorage.setItem` call records a value containing an `editMode`/edit-mode field — the mode flag is never written to `localStorage` (SG-m5-04); `PersistedState` has no edit-mode key. A mutant that persists the mode fails the spy-based absence assertion.
Proves: plan.md § Components `<TopBar>` (`light` haptic on toggle) + § Components `<EditModeProvider>` ("No persistence wiring — Edit Mode is never written to `localStorage`"; `useState(false)` ⇒ Locked cold boot) + § Open questions (SG-m5-04 RESOLVED) — covers SPEC AC #4.
Tag: edge.

#### C-m5-003 — edge (Locked mode — no affordance; blocks/bricks behave exactly as pre-M5)

Target file: `components/TimelineBlock.test.tsx` (EXISTS — m5 cases appended) / `components/BrickChip.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock>` and `<BrickChip>` rendered inside `<EditModeProvider>` with `editMode === false` (the cold-boot default)
**WHEN** each is rendered and inspected, and the block card / brick chip is tapped
**THEN** **no** `×` delete button renders on the block or the brick (`queryByRole("button", { name: /delete/i })` → `null`); the block card carries no jiggle class/`data-` attribute; a delete is unreachable (AC #2).
**AND** in Locked mode the block card's tap-to-expand fires and the brick chip's `onTickToggle`/`onUnitsOpenSheet` log gesture fires — behaviour is byte-identical to M4 (the existing M4-era expand/log assertions pass unchanged because the M5 suppression is `editMode`-gated and never triggers when `editMode === false`).
Proves: plan.md § Edge cases ("Locked mode — no affordances"; `editMode === false` ⇒ no `×`, no jiggle, tap-to-expand + log behave exactly as M4) + § Regression surface (M4 expand/log tests stay green under the default `editMode === false`) — covers SPEC AC #2.
Tag: edge.

#### C-m5-004 — success (TimelineBlock — Unlocked shows an always-visible block `×`; jiggle present)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock block={blk-recur} onRequestDeleteBlock={vi.fn()} />` inside `<EditModeProvider>` with `editMode === true`, `prefers-reduced-motion` **not** set
**WHEN** the block card is rendered
**THEN** an always-visible `×` delete `<button>` renders in the card's top-right corner (a `lucide-react` `X` glyph, ≥44px hit area, ADR-031), carrying `aria-label="Delete block Morning"` (the block name embedded); the `×` is present without any swipe or long-press — it is visible on render (ADR-008, no swipe-only).
**AND** the card carries the continuous low-amplitude jiggle (the `dharma-jiggle` keyframe — applied via a class / `data-` attribute) because Edit Mode is on and reduced motion is off.
Proves: plan.md § Components `<TimelineBlock>` (Unlocked — continuous jiggle + always-visible `×`, ≥44px, `aria-label` naming the block) + § Decisions (ADR-008, ADR-031) — covers SPEC AC #3.
Tag: success.

#### C-m5-005 — edge (TimelineBlock + BrickChip — jiggle suppressed under `prefers-reduced-motion`; the `×` still appears)

Target file: `components/TimelineBlock.test.tsx` / `components/BrickChip.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock>` and `<BrickChip>` rendered with `editMode === true` and `prefers-reduced-motion: reduce` set (via the `matchMedia` mock / `useReducedMotion()` returning `true`)
**WHEN** each is rendered and inspected
**THEN** the block card carries **no** jiggle — the `dharma-jiggle` class / `data-` attribute is absent (the jiggle is JS-gated on `useReducedMotion()` for the M0 double-guarantee, on top of the CSS `@media (prefers-reduced-motion: reduce)` collapse).
**AND** the always-visible `×` **still** renders on both the block and the brick and is still operable — the delete affordance is a non-motion affordance and does not depend on the jiggle; delete still works under reduced motion (spec edge case).
Proves: plan.md § Components `<TimelineBlock>` (jiggle omitted under reduced motion; the `×` and delete still work) + § Edge cases ("Reduced motion") + § Accessibility — covers SPEC AC #3.
Tag: edge.

#### C-m5-006 — edge (BrickChip — Unlocked shows a brick `×`; the log gesture is suppressed, no double-fire, mutation-resistant)

Target file: `components/BrickChip.test.tsx`
Layer: Component
**GIVEN** `<BrickChip brick={brk-1} onTickToggle={vi.fn()} onRequestDeleteBrick={vi.fn()} />` (and a units-kind sibling render with `onUnitsOpenSheet={vi.fn()}`) inside `<EditModeProvider>` with `editMode === true`
**WHEN** the chip's main body is tapped, then the chip's `×` is tapped
**THEN** an always-visible `×` `<button>` renders at the chip's trailing edge (≥44px, `aria-label="Delete brick <name>"`, ADR-008); tapping the chip's **main body** calls `onTickToggle`/`onUnitsOpenSheet` **zero** times (`toHaveBeenCalledTimes(0)`) and fires no `light` haptic — a brick tap is inert except on the `×` (SG-m5-05).
**AND** tapping the `×` calls `onRequestDeleteBrick("brk-1")` **exactly once** and (via `e.stopPropagation()`) does **not** also trigger the chip's log gesture — there is no log+delete double-fire. The chip-fill visual still reflects the brick's current score (read-only).
Proves: plan.md § Components `<BrickChip>` ("the chip's log gesture is suppressed — a brick tap is inert except on the `×`"; `e.stopPropagation()`; no double-fire) + § Open questions (SG-m5-05 RESOLVED) — covers SPEC AC #3, AC #9.
Tag: edge.

#### C-m5-007 — edge (TimedLooseBrickCard — Unlocked shows a `×`; log suppressed — same treatment as BrickChip)

Target file: `components/TimedLooseBrickCard.test.tsx` (EXISTS — m5 cases appended)
Layer: Component
**GIVEN** `<TimedLooseBrickCard brick={brk-loose} onRequestDeleteBrick={vi.fn()} … />` inside `<EditModeProvider>` with `editMode === true`
**WHEN** the card body is tapped, then the card's `×` is tapped
**THEN** the timed loose brick card shows the same always-visible `×` treatment as `<BrickChip>` (≥44px, `aria-label="Delete brick <name>"`); tapping the card body fires its log gesture **zero** times in Edit Mode; tapping the `×` calls `onRequestDeleteBrick(brk-loose.id)` exactly once.
**AND** with `editMode === false` the card behaves byte-identically to M4f — the log gesture fires and no `×` renders.
Proves: plan.md § Components `<TimedLooseBrickCard>` ("same `×` + suppressed-log treatment as `BrickChip` for timed loose bricks") — covers SPEC AC #3, AC #9.
Tag: edge.

#### C-m5-008 — edge (TimelineBlock — tap-to-expand is a no-op in Edit Mode; only the `×` is interactive, mutation-resistant)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock block={blk-recur} onRequestDeleteBlock={vi.fn()} />` inside `<EditModeProvider>` with `editMode === true`, the card initially collapsed
**WHEN** the card's body (outside the `×`) is tapped
**THEN** the card does **not** expand or collapse — `handleCardClick` is a no-op when `editMode === true` (mirroring `<SlotTapTargets>` returning `null` in edit mode); the card's expanded/collapsed state is unchanged after the tap.
**AND** tapping the `×` calls `onRequestDeleteBlock("blk-recur")` exactly once and does not toggle expansion (`e.stopPropagation()`); when `editMode === false` the same body tap **does** expand/collapse (byte-identical to M4) — the suppression is strictly `editMode`-gated.
Proves: plan.md § Components `<TimelineBlock>` ("Tap routing in Edit Mode (SG-m5-05) — `handleCardClick` is a no-op; only the `×` is interactive") + § Open questions (SG-m5-05) — covers SPEC AC #3.
Tag: edge.

#### C-m5-009 — success (DeleteConfirmModal — a block `×` opens the confirm modal; deletion is never a one-tap, mutation-resistant)

Target file: `app/(building)/BuildingClient.delete.test.tsx` (NEW — m5 delete-flow cases; the existing `BuildingClient.*.test.tsx` files are untouched except where § Retired / amended test IDs notes)
Layer: Component
**GIVEN** `<BuildingClient>` mounted with the standing fixture state (`blk-recur` recurring, `blk-once` non-recurring), Edit Mode unlocked, the reducer `dispatch` spied
**WHEN** the `×` on `blk-recur`'s card is tapped
**THEN** the `<DeleteConfirmModal>` opens (a `role="dialog"` `aria-modal="true"` panel with the title `"Delete this block?"`) — and **no** `DELETE_*` action is dispatched on the `×` tap (`dispatch` spy shows zero delete actions); the block is **not** removed from the timeline yet. Deletion is never a single tap (AC #5).
**AND** the modal mounts only after the `×` tap (`pendingDelete` goes non-`null`); before the tap there is no dialog in the DOM. A mutant that deletes directly on the `×` tap fails (a `DELETE_*` action would appear before any modal button is pressed).
Proves: plan.md § Components `<BuildingClient>` (the `×` sets `pendingDelete`; the modal mounts; the delete action fires only from a modal confirm) + § Confirmation modal — covers SPEC AC #5.
Tag: success.

#### C-m5-010 — success (DeleteConfirmModal — recurring block shows Just today / All recurrences / Cancel)

Target file: `components/DeleteConfirmModal.test.tsx` (NEW)
Layer: Component
**GIVEN** `<DeleteConfirmModal open target={{ kind: "block", recurring: true }} onConfirmJustToday={vi.fn()} onConfirmAll={vi.fn()} onCancel={vi.fn()} />`
**WHEN** the modal is rendered
**THEN** it shows the title `"Delete this block?"` and **three** action buttons — **Just today** (`secondary` variant), **All recurrences** (`primary`, destructive accent), and **Cancel** (`ghost`); all three are real `<button>`s (composed from `components/ui/Button`) and ≥44px (ADR-031).
**AND** clicking **Just today** calls `onConfirmJustToday` exactly once and fires the destructive-confirm haptic (`haptics.medium`); clicking **All recurrences** calls `onConfirmAll` exactly once and fires `haptics.medium`; clicking **Cancel** calls `onCancel` exactly once and fires **no** haptic.
Proves: plan.md § Confirmation modal (recurring-block variant — three actions; `haptics.medium` on a confirm, none on Cancel) — covers SPEC AC #6.
Tag: success.

#### C-m5-011 — success (DeleteConfirmModal — non-recurring block shows a single Delete + Cancel)

Target file: `components/DeleteConfirmModal.test.tsx`
Layer: Component
**GIVEN** `<DeleteConfirmModal open target={{ kind: "block", recurring: false }} onConfirmDelete={vi.fn()} onCancel={vi.fn()} />`
**WHEN** the modal is rendered
**THEN** it shows the title `"Delete this block?"` and exactly **two** buttons — a single **Delete** (`primary`, destructive) and **Cancel** (`ghost`); there is **no** "Just today" and **no** "All recurrences" button (a non-recurring / single-day block has no two-way choice).
**AND** clicking **Delete** calls `onConfirmDelete` once (`BuildingClient` routes it to `DELETE_BLOCK_ALL` — removing the one-shot template _is_ the delete); clicking **Cancel** calls `onCancel` once with no haptic.
Proves: plan.md § Confirmation modal (non-recurring-block variant — a single **Delete**, routed to `DELETE_BLOCK_ALL`) + § Edge cases ("'Just today' on a non-recurring block") — covers SPEC AC #8.
Tag: success.

#### C-m5-012 — success (DeleteConfirmModal — brick variant shows a single Delete + Cancel)

Target file: `components/DeleteConfirmModal.test.tsx`
Layer: Component
**GIVEN** `<DeleteConfirmModal open target={{ kind: "brick" }} onConfirmDelete={vi.fn()} onCancel={vi.fn()} />`
**WHEN** the modal is rendered
**THEN** it shows the title `"Delete this brick?"` and exactly **two** buttons — a single **Delete** (`primary`, destructive) and **Cancel**; clicking **Delete** calls `onConfirmDelete` once (routed to `DELETE_BRICK`), clicking **Cancel** calls `onCancel` once.
**AND** a `custom-range` block whose range is a single day is treated as **recurring** (`recurrence.kind !== "just-today"`) — `BuildingClient` opens the three-way recurring-block modal for `blk-range`, not the single-Delete variant (the degenerate case where "Just today" and "All recurrences" converge harmlessly).
Proves: plan.md § Confirmation modal (brick variant — a single **Delete** → `DELETE_BRICK`; `custom-range` one-day range treated as recurring) + § Edge cases ("`custom-range` with a one-day range") — covers SPEC AC #9.
Tag: success.

#### C-m5-013 — edge (DeleteConfirmModal — Cancel always aborts with no state change; ESC = Cancel)

Target file: `components/DeleteConfirmModal.test.tsx` / `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with a pending delete open (the recurring-block modal showing for `blk-recur`), the reducer `dispatch` spied
**WHEN** the **Cancel** button is clicked, and separately the `Escape` key is pressed while the modal is open
**THEN** Cancel dismisses the modal (`pendingDelete` → `null`) and dispatches **no** action — `dispatch` spy shows zero `DELETE_*` actions; `state.blocks`, `state.looseBricks`, and `state.deletions` are all unchanged; the block still renders on the timeline.
**AND** pressing `Escape` resolves the modal as **Cancel** (inherited from `components/ui/Modal`'s ESC-close) — no destructive default; the same no-state-change guarantee holds.
Proves: plan.md § Confirmation modal ("Cancel fires no haptic"; "ESC = Cancel (no destructive default)") + § Components `<BuildingClient>` ("Cancel clears `pendingDelete` only") — covers SPEC AC #8.
Tag: edge.

#### C-m5-014 — edge (DeleteConfirmModal — toggling Edit Mode with the modal open does not dismiss it)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with the delete-confirm modal open for `blk-recur`, Edit Mode currently Unlocked
**WHEN** the `<TopBar>` pencil is toggled (Edit Mode → Locked) while the modal is open
**THEN** the modal stays mounted and authoritative — `pendingDelete` is independent of `editMode`; toggling the pencil does **not** clear `pendingDelete` or dismiss the dialog; the modal must still resolve via Cancel or a confirm choice.
**AND** resolving the modal afterward (Cancel or confirm) behaves correctly even though Edit Mode is now Locked — the pending delete completes; closing Edit Mode never aborts an open confirmation.
Proves: plan.md § Confirmation modal ("Modal-open + Edit-Mode-toggle interaction — the modal is authoritative; `BuildingClient` keeps `pendingDelete` independent of `editMode`") + § Edge cases ("Toggling Edit Mode with the modal open") — covers SPEC AC #5.
Tag: edge.

#### C-m5-015 — success (BuildingClient — "Just today" delete writes the keyed override; the block stops rendering today)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with the standing fixture (`currentDate: "2026-05-18"`, `blk-recur` recurring), Edit Mode unlocked, the recurring-block modal open for `blk-recur`
**WHEN** the **Just today** button is confirmed
**THEN** `DELETE_BLOCK_TODAY` is dispatched for `blk-recur`; after the dispatch `state.deletions` has `"2026-05-18:blk-recur": true` and `state.blocks` still contains the `blk-recur` template (untouched); `currentDayBlocks(state)` no longer includes `blk-recur`, so the block's card is **removed from today's timeline** (`queryByText("Morning")` → `null`).
**AND** the block still applies to other days — re-projecting the state with `currentDate` advanced to `"2026-05-19"` (a fresh key namespace) shows `blk-recur` rendering again; the modal closes and `pendingDelete` returns to `null`.
Proves: plan.md § Components `<BuildingClient>` (the `DELETE_BLOCK_TODAY` handler) + § Day-render wiring (`currentDayBlocks` drops the keyed block; tomorrow is a fresh namespace) + § Edge cases ("'Just today' then a day rollover") — covers SPEC AC #6, AC #11.
Tag: success.

#### C-m5-016 — success (BuildingClient — "All recurrences" delete removes the template; brick delete removes the brick)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with the standing fixture, Edit Mode unlocked
**WHEN** the recurring-block modal for `blk-recur` is confirmed with **All recurrences**; and separately a brick `×` (for `brk-1` inside `blk-recur`, and for `brk-loose` in the tray) is confirmed with **Delete**
**THEN** **All recurrences** dispatches `DELETE_BLOCK_ALL` — `blk-recur` is removed from `state.blocks` and disappears from today's timeline; `state.history` is unchanged (any archived day still shows it — ADR-045, asserted via `U-m5-004`).
**AND** confirming a brick **Delete** dispatches `DELETE_BRICK` — `brk-1` is removed from `blk-recur.bricks` (the block survives, the sibling brick survives) and `brk-loose` is removed from `state.looseBricks` and from the tray; the modal closes after each confirm.
Proves: plan.md § Components `<BuildingClient>` (the `DELETE_BLOCK_ALL` / `DELETE_BRICK` handlers) + § Confirmation modal — covers SPEC AC #7, AC #9.
Tag: success.

#### C-m5-017 — edge (BuildingClient — Edit Mode a brick/block tap is inert except the `×`; Locked mode logs normally)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with the standing fixture and the reducer `dispatch` spied
**WHEN** in **Edit Mode** a brick chip's main body is tapped (not its `×`); then Edit Mode is toggled off and the same brick chip is tapped
**THEN** in Edit Mode the brick-body tap dispatches **no** `LOG_TICK_BRICK` / `SET_UNITS_DONE` and opens **no** units sheet — a brick tap is inert except on the `×` (SG-m5-05); there is no log+delete double-fire (a `×` tap routes to the confirm modal, never simultaneously to a log).
**AND** in **Locked** mode (`editMode === false`) the same brick-body tap dispatches `LOG_TICK_BRICK` exactly once (or opens the units sheet) — the brick logs normally, exactly as pre-M5; the routing flips strictly on `editMode`.
Proves: plan.md § Components `<BrickChip>`/`<TimelineBlock>` (Edit-Mode tap routing) + § Open questions (SG-m5-05 RESOLVED — "in Locked mode the brick logs normally") — covers SPEC AC #2, AC #9.
Tag: edge.

#### C-m5-018 — edge (removal animation — shrink-fade exit; instant under reduced motion)

Target file: `components/TimelineBlock.test.tsx` / `components/BrickChip.test.tsx`
Layer: Component
**GIVEN** a `<Timeline>` (or `<BuildingClient>`) rendered with `blk-recur` present, then re-rendered after a delete removes it from the rendered list, under `motion/react` `AnimatePresence`
**WHEN** the block (and, in a sibling render, a brick) is removed — once with motion enabled, once with `prefers-reduced-motion: reduce`
**THEN** with motion enabled the removed element runs an `exit` variant — `opacity: 0` + `scale: 0.9` (or a height collapse) — before unmounting; siblings reflow (bricks inside a block + tray chips reflow via normal flex layout); the timeline keeps its hour grid (deleting a block does not re-time siblings — re-timing is M6).
**AND** under `prefers-reduced-motion` the exit is **instant** (`transition: { duration: 0 }` — no shrink/fade); the delete still completes and the element is removed. A mutant that ignores reduced motion and animates anyway fails the instant-exit assertion.
Proves: plan.md § Removal animation + score recompute (shrink + fade exit via `AnimatePresence`; siblings reflow; instant under reduced motion) + § Edge cases ("Reduced motion") — covers SPEC AC #12.
Tag: edge.

#### C-m5-019 — edge (score recompute after a delete; `currentDayBlocks` feed is byte-identical with empty `deletions`)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with the standing fixture — `blk-recur` + `blk-once` populated, an initial `dayPct` rendered in the Hero ring and the BlueprintBar
**WHEN** a block is deleted (`DELETE_BLOCK_ALL`) and, separately, a brick is deleted (`DELETE_BRICK`)
**THEN** `dayPct` (the Hero `HeroRing`), `blockPct` (the affected block's scaffold fill), and the `BlueprintBar` all **recompute** from the post-delete `state` on the next render — they are pure derivations of `state`, so the displayed scores update with no extra wiring; a score-lowering delete fires **no** celebration (`useCrossUpEffect` fires only on an _upward_ crossing).
**AND** when `state.deletions` is empty (the default), feeding `Timeline` from `currentDayBlocks(state)` is **byte-identical** to feeding it `state.blocks` directly — every existing `BuildingClient` test that does not exercise a delete passes unchanged (the AC #14 no-regression anchor; see § Retired / amended test IDs).
Proves: plan.md § Removal animation + score recompute ("`dayPct`/`blockPct`/`BlueprintBar`/`HeroRing` recompute … with zero extra code"; "`useCrossUpEffect` … fires no celebration") + § Regression surface (`BuildingClient` tests unchanged with empty `deletions`) — covers SPEC AC #12, AC #14.
Tag: edge.

#### C-m5-020 — edge (deleting every block + brick → the M1 empty-state, no crash; delete during a log/score animation)

Target file: `app/(building)/BuildingClient.delete.test.tsx`
Layer: Component
**GIVEN** `<BuildingClient>` with a fixture holding exactly one block (`blk-once`, with one brick `brk-3`) and one loose brick (`brk-loose`)
**WHEN** every block and every brick is deleted in turn; and, in a sibling case, a delete is confirmed while a log/score animation is mid-flight
**THEN** after the last delete the Day view returns to the **M1 locked empty-state** — the empty-toolkit shell renders, `dayPct(state)` reads `0`, and there is no crash (the existing empty-state guard handles an empty `state`).
**AND** a delete confirmed during a log/score animation supersedes — the deleted element exits and the scores recompute from the post-delete `state` on the next render; no console error, no orphaned animation.
Proves: plan.md § Removal animation + score recompute ("Deleting the day's last block/brick returns the Day view to the M1 locked empty-state and `dayPct` reads `0` with no crash") + § Edge cases ("Deleting every block and brick"; "Delete during a log/score animation") — covers SPEC AC #12.
Tag: edge.

### Accessibility (axe via Playwright)

`A-m5-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9e sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern. No `.skip`.

#### A-m5-001 — a11y (Edit Mode — axe clean; pencil + every `×` keyboard-operable + SR-labeled; 430px no overflow)

Target file: `tests/e2e/m5.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport 430px wide, Edit Mode toggled Unlocked so blocks jiggle and every block + brick shows its `×` (under `count() > 0` guard)
**WHEN** axe-core runs against the Unlocked Day view
**THEN** it returns **zero** violations across all rule categories; the pencil toggle is a keyboard-operable `<button>` with `aria-pressed` and a state-discernible `aria-label` (`"Edit mode, on/off"`); every block `×` and every brick `×` is a focusable `<button>` reachable by Tab, activatable by Enter/Space, with an `aria-label` naming its target (`"Delete block <name>"` / `"Delete brick <name>"`); each `×` and the pencil have a ≥44px hit area (ADR-031).
**AND** Edit Mode adds only a corner `×` per card — no new horizontal content; the Unlocked Day view renders within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`).
Proves: plan.md § Accessibility (pencil `aria-pressed` + worded label; every `×` a real `<button>`, focusable, Enter/Space, `aria-label` naming its target, ≥44px; 430px no overflow) + § Decisions (ADR-008, ADR-031) — covers SPEC AC #13.
Tag: a11y.

#### A-m5-002 — a11y (DeleteConfirmModal — axe clean; dialog semantics; modal buttons keyboard-operable + SR-labeled)

Target file: `tests/e2e/m5.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, a block `×` tapped so `<DeleteConfirmModal>` is open (under `count() > 0` guard)
**WHEN** axe-core runs against the open confirmation modal, and the modal is exercised by keyboard
**THEN** axe returns **zero** violations; the modal is `role="dialog"` with `aria-modal="true"` and carries a title/`aria-label` (`"Delete this block?"`); focus moves into the modal on open; ESC resolves it as Cancel; all action buttons (**Just today** / **All recurrences** / **Cancel**, or **Delete** / **Cancel**) are real keyboard-operable `<button>`s (Tab to focus, Enter/Space to activate) and ≥44px (ADR-031).
**AND** the bottom-sheet modal and its stacked buttons render within the `max-w-[430px]` sheet with **no horizontal overflow** at 430px.
Proves: plan.md § Confirmation modal A11y (`role="dialog"` `aria-modal`, title/`aria-label`, focus-on-open, ESC = Cancel, keyboard-operable ≥44px buttons, 430px no overflow) + § Accessibility — covers SPEC AC #13.
Tag: a11y.

#### A-m5-003 — a11y (Edit Mode under reduced motion — axe clean; delete affordances unaffected)

Target file: `tests/e2e/m5.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the browser emulating `prefers-reduced-motion: reduce`, Edit Mode Unlocked (under `count() > 0` guard)
**WHEN** axe-core runs against the Unlocked Day view and the open confirmation modal
**THEN** axe returns **zero** violations; with reduced motion the block jiggle is suppressed and the removal exit is instant — yet the pencil toggle, every `×`, and the modal buttons are all still present, focusable, and operable (the mode and the `×` are non-motion affordances — no a11y regression under reduced motion).
**AND** the Unlocked accent tint on the pencil and the `×` glyph (`var(--ink)`) meet WCAG AA at the M0 token set; no contrast violation is reported.
Proves: plan.md § Accessibility ("Reduced motion — jiggle + shrink-fade collapse to instant; no a11y regression"; contrast/axe with the M0-audited tokens) + § Edge cases ("Reduced motion") — covers SPEC AC #13.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The four scenarios are exactly the ones the plan/spec name (AC #14): toggle Edit Mode, a "just today" block delete, an "all recurrences" block delete, a brick delete.

#### E-m5-001 — success (toggle Edit Mode — Locked ↔ Unlocked affordances appear and settle)

Target file: `tests/e2e/m5.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), then — via `page.evaluate` — `dharma:v1` seeded with a v3 payload holding at least one recurring block (with bricks) and one loose brick; the app loaded fresh at `/` in the Locked Day view
**WHEN** the top-bar pencil is tapped, then tapped again (under `count() > 0` guards)
**THEN** on the first tap the surface goes Unlocked — blocks jiggle and an `×` appears on every block and every brick; the pencil shows its Unlocked accent treatment and `aria-pressed="true"`; on the second tap the surface settles back to Locked — the `×`es disappear, the jiggle stops, the pencil returns to `aria-pressed="false"`.
**AND** reloading the page boots back to the **Locked** state regardless of the mode at unload (Edit Mode is never persisted — SG-m5-04); no console error.
Proves: plan.md § Components `<TopBar>`/`<TimelineBlock>`/`<BrickChip>` (toggle Edit Mode; affordances appear/settle; Locked cold boot) — covers SPEC AC #1, AC #3, AC #4, AC #14 (toggle-Edit-Mode E2E scenario).
Tag: success.

#### E-m5-002 — success ("just today" block delete — keyed override; the block survives a reload)

Target file: `tests/e2e/m5.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded via `page.evaluate` with a v3 payload holding a recurring block; the app at `/`, Edit Mode toggled Unlocked
**WHEN** the recurring block's `×` is tapped, the confirm modal's **Just today** is chosen, then the page is reloaded (under `count() > 0` guards)
**THEN** the confirmation modal opens with **Just today** / **All recurrences** / **Cancel**; choosing **Just today** removes the block from today's timeline (it stops rendering) while leaving the rest of the day intact; the dependent scores (Hero ring, BlueprintBar) recompute.
**AND** after the reload the "just today" delete **persists** — the block is still absent from today (the `deletions` key survived to `localStorage` and back); no console error.
Proves: plan.md § Confirmation modal + § Day-render wiring + § Data model (the `deletions` key persists) — covers SPEC AC #5, AC #6, AC #10, AC #14 (just-today-delete E2E scenario).
Tag: success.

#### E-m5-003 — success ("all recurrences" block delete — the template is gone today and after a reload)

Target file: `tests/e2e/m5.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded via `page.evaluate` with a v3 payload holding a recurring block; the app at `/`, Edit Mode Unlocked
**WHEN** the recurring block's `×` is tapped, the confirm modal's **All recurrences** is chosen, then the page is reloaded (under `count() > 0` guards)
**THEN** choosing **All recurrences** removes the block template — the block disappears from today's timeline; the scores recompute; the removal animates (shrink + fade) before the card unmounts.
**AND** after the reload the block is **still gone** (the template was removed from `state.blocks` and the change persisted); no console error.
Proves: plan.md § Confirmation modal + § Components `<BuildingClient>` (the `DELETE_BLOCK_ALL` handler) + § Removal animation — covers SPEC AC #5, AC #7, AC #10, AC #12, AC #14 (all-recurrences-delete E2E scenario).
Tag: success.

#### E-m5-004 — success (brick delete — the brick is removed via the confirm modal and after a reload)

Target file: `tests/e2e/m5.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded via `page.evaluate` with a v3 payload holding a block with at least two bricks and one loose brick; the app at `/`, Edit Mode Unlocked
**WHEN** a brick's `×` is tapped, the confirm modal's single **Delete** is chosen, then the page is reloaded (under `count() > 0` guards)
**THEN** the confirm modal opens with a single **Delete** + **Cancel**; choosing **Delete** removes that brick from its containing block (the sibling brick and the block survive); deleting a loose brick removes it from the tray; the scores recompute and the removal animates.
**AND** after the reload the brick is **still gone**; no console error.
Proves: plan.md § Components `<BrickChip>`/`<BuildingClient>` (the `DELETE_BRICK` handler) + § Confirmation modal (brick variant) — covers SPEC AC #9, AC #10, AC #12, AC #14 (brick-delete E2E scenario).
Tag: success.

### Sandbox / preview note

Per the established M3–M9e pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 3 `A-m5-*` and 4 `E-m5-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9e.spec.ts` / `tests/e2e/m9d.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m5-002`/`E-m5-003`/`E-m5-004` partly mitigate it by hand-building the `dharma:v1` v3 payload via `page.evaluate` (a deterministic seed that does not depend on the add-block/add-brick UI flow). M5 introduces no general deterministic seeding helper (out of scope per ADR-022). The 14 unit + 20 component IDs (`U-m5-*`, `C-m5-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the three reducer arms, the v2→v3 migrator, `currentDayBlocks`, and every component behaviour; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M5 adds 41 new `m5` IDs (14 U + 20 C + 3 A + 4 E) and removes none.

**Amended — sanctioned, expected M5 collateral.** The M5 plan § Regression surface explicitly flags these and asks VERIFIER to ratify them. They are surfaced here, not silently resolved by the BUILDER. Each amendment is mechanical and assertion-preserving for everything not about the M5 change:

- **`components/TopBar.test.tsx`** — any existing assertion on the pencil button's `aria-label` (currently the literal `"Edit"`) is **made stale** by the new state-discernible `"Edit mode, on/off"` label (AC #1). The M5 dispatch **amends** that assertion to the worded label. All other `TopBar` assertions are preserved verbatim; the new toggle / haptic / visual-state cases (`C-m5-001`/`C-m5-002`) are **additive**, not amendments.
- **`lib/persist.test.ts`** — the existing `SCHEMA_VERSION` assertions (currently `=== 2`) are **made stale** by the `2 → 3` bump (AC #10) and **must be amended** to `=== 3`; any test asserting a v2 payload is the _terminal_ migration is amended for the new v3 terminus. This is the exact analogue of M9b amending the persist tests for the v1→v2 bump — sanctioned, expected collateral.
- **`lib/data.test.ts` / `lib/usePersistedState.test.tsx`** — adding `deletions` to `defaultState()` / `projectToAppState` / `toPersisted` is additive; any test that deep-equals the **whole** `defaultState()` / `PersistedState` object **must be amended** to include `deletions: {}` (and, for `PersistedState`, `schemaVersion: 3`). Sanctioned collateral; no behaviour assertion changes.
- **`components/TimelineBlock.test.tsx` / `components/BrickChip.test.tsx` / `components/TimedLooseBrickCard.test.tsx`** — the M4-era expand / log tests assert tap-to-expand and tap-to-log fire **unconditionally**. They run with `editMode === false` (the default `EditModeProvider` value), so they remain green **unchanged** — the M5 suppression triggers only under `editMode === true`. The new Edit-Mode cases (jiggle, `×`, suppressed log) are **M5 TESTS deliverables, not amendments**. VERIFIER confirms no M4 expand/log test is broken.
- **`app/(building)/BuildingClient.*.test.tsx`** — feeding `Timeline` from `currentDayBlocks(state)` is byte-identical when `state.deletions` is empty (the default) → existing `BuildingClient` tests pass **unchanged** (anchored by `C-m5-019`). New delete-flow cases live in the **new** `BuildingClient.delete.test.tsx` and are additive.

**VERIFIER: please ratify the `TopBar` `aria-label`, the `persist.test.ts` `SCHEMA_VERSION`/v2-terminus, and the `defaultState`/`PersistedState` deep-equal amendments** as expected, sanctioned M5 collateral — exactly as M9b's v1→v2 persist amendments and M9d's `C-m9c-012` amendment were ratified. They are surfaced here, not silent; each is assertion-preserving for every sub-assertion not about the M5 change. If VERIFIER prefers, the alternative ruling is to FAIL back to PLANNER to add an explicit "amended test IDs" note to `plan.md` § Regression surface (which already flags every one of these for VERIFIER).

### Spec gaps surfaced for VERIFIER

The plan resolves all six of its named spec gaps in-plan (SG-m5-01..06 — see plan.md § Open questions for VERIFIER; five RESOLVED verbatim per the spec recommendation, one resolved with a noted scope clarification) and the TESTS phase covers the plan faithfully. The following non-blocking items are surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **AC #11 — `currentDayBlocks` consults `deletions` ONLY, not `appliesOn`.** The plan (§ Day-render wiring resolution (a), § ADR needed) resolves the spec's AC #11 / Outputs-table wording "today-blocks resolution consults `deletions` **alongside `appliesOn`**" by having `currentDayBlocks` filter by **`deletions` only** — because the live Day view has **never** wired `appliesOn` into the render (M9a shipped the resolver, not the Day-view wiring). The M5 TESTS entry mirrors that scope decision: **`U-m5-013`/`U-m5-014` (and the day-render component IDs) assert only the `deletions` filter; no m5 test requires `appliesOn` to be newly filtered into the Day view.** Per the dispatch instruction, the TESTS phase does **not** invent an `appliesOn`-wiring test. **If VERIFIER reads AC #11 as _requiring_ M5 to also wire `appliesOn` into `currentDayBlocks`, that reverses the plan's resolution and must FAIL back to PLANNER** (the plan flagged this as a new-ADR candidate). Otherwise: AC #11 is fully covered by the `deletions`-only tests and the plan's scope boundary stands.
2. **SG-m5-01 — brick delete is structural (no per-day brick override).** `U-m5-006`/`U-m5-007`/`C-m5-016` test brick delete as a plain structural removal; for a brick inside a recurring block this edits the template (affects every future occurrence). There is no second `deletions` namespace for bricks. The plan confirms this per the spec recommendation; VERIFIER ratifies the M5/M6 boundary is intact.
3. **`schemaVersion` placement.** `U-m5-011` asserts `schemaVersion` lives on `defaultPersisted()` (`PersistedState`) only and **not** on `defaultState()` (`AppState`), while `deletions` is on both — the SG-m5-04 / SG-m8-04 persist-boundary separation. The plan (§ Data model) flags this as a faithful reading of the spec's intent (the spec's "Locked schema additions" sketch places a `schemaVersion` comment inside an `interface AppState` block, but the live post-M8 codebase keeps `schemaVersion` `PersistedState`-only). VERIFIER may confirm this is faithful, not a deviation — both readings agree that `deletions` is the schema addition and `schemaVersion: 3` the persisted-shape version.

No ADR is reversed: **ADR-008** (always-visible `×`, no swipe-only delete) governs every delete affordance (`C-m5-004`/`C-m5-006`/`A-m5-001`); **ADR-018** (`deletions` keyed `${date}:${blockId}`) governs the override map (`U-m5-001`/`U-m5-013`); **ADR-044/ADR-045** (`schemaVersion` + migrator discipline; `history` is read-only) govern the v2→v3 bump (`U-m5-009`/`U-m5-010`) and the "All recurrences" / `history` boundary (`U-m5-004`/`C-m5-016`); **ADR-020** (no clock constants — the reducer builds the `deletions` key from `state.currentDate`) is enforced by `U-m5-001`/`U-m5-014`; **ADR-043** (`assertNever` exhaustiveness) governs the three new reducer arms (`U-m5-008`); **ADR-031** (44px touch targets) is enforced by `A-m5-001`/`A-m5-002` and the pencil/`×`/modal-button sizing. M5 adds 41 `m5` test IDs (14 U + 20 C + 3 A + 4 E) and retires none; it amends the `TopBar` `aria-label`, the `persist.test.ts` `SCHEMA_VERSION`/v2-terminus, and the `defaultState`/`PersistedState` deep-equal assertions as sanctioned, expected M5 collateral (VERIFIER to ratify).

### AC → test-ID coverage map (all 14 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                              | Test ID(s)                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| #1  | A pencil control toggles Edit Mode Locked ↔ Unlocked; its state is visually + screen-reader discernible                         | `C-m5-001`, `A-m5-001`, `E-m5-001`                                                                         |
| #2  | In Locked mode (default) no edit affordance shows; every block/brick behaves exactly as pre-M5; no delete is reachable          | `C-m5-003`, `C-m5-017`                                                                                     |
| #3  | In Unlocked mode blocks jiggle (suppressed under reduced motion) and an always-visible `×` appears on every block + brick       | `C-m5-004`, `C-m5-005`, `C-m5-006`, `C-m5-007`, `C-m5-008`, `A-m5-001`, `E-m5-001`                         |
| #4  | Toggling the pencil back settles to Locked; Edit Mode always boots Locked on a fresh load (not persisted, SG-m5-04)             | `C-m5-001`, `C-m5-002`, `E-m5-001`                                                                         |
| #5  | Tapping a block's `×` opens a confirmation modal; no block is ever deleted on a single tap                                      | `C-m5-009`, `C-m5-014`, `E-m5-002`, `E-m5-003`                                                             |
| #6  | Recurring block — Just today writes `deletions[${currentDate}:${blockId}]=true`, leaves `blocks`; renders tomorrow              | `U-m5-001`, `U-m5-002`, `U-m5-003`, `U-m5-008`, `C-m5-010`, `C-m5-015`, `E-m5-002`                         |
| #7  | All recurrences removes the template from `state.blocks`; gone today + future; `history` not rewritten (ADR-045)                | `U-m5-004`, `U-m5-005`, `U-m5-008`, `C-m5-016`, `E-m5-003`                                                 |
| #8  | A non-recurring block — modal offers a single Delete; Cancel always aborts with no change                                       | `C-m5-011`, `C-m5-013`                                                                                     |
| #9  | Tapping a brick's `×` opens a confirm modal; confirming removes the brick from its block or `looseBricks`; Cancel aborts        | `U-m5-006`, `U-m5-007`, `U-m5-008`, `C-m5-006`, `C-m5-007`, `C-m5-012`, `C-m5-016`, `C-m5-017`, `E-m5-004` |
| #10 | Schema bumps to v3; `loadState` migrates a v2 payload adding empty `deletions`, no data loss; every delete survives reload      | `U-m5-009`, `U-m5-010`, `U-m5-011`, `U-m5-012`, `E-m5-002`, `E-m5-003`, `E-m5-004`                         |
| #11 | Today-blocks resolution consults `deletions` — a keyed block does not render that day; other days unaffected                    | `U-m5-013`, `U-m5-014`, `C-m5-015`                                                                         |
| #12 | The removal animates (shrink + fade, reflow; instant under reduced motion); `dayPct`/`blockPct`/BlueprintBar/HeroRing recompute | `C-m5-018`, `C-m5-019`, `C-m5-020`, `E-m5-003`, `E-m5-004`                                                 |
| #13 | 430px renders Edit Mode + the modal without overflow; axe clean; pencil + every `×` + modal buttons keyboard + SR-labeled       | `A-m5-001`, `A-m5-002`, `A-m5-003`                                                                         |
| #14 | No regression to M1–M9e; quality gates clean; E2E covers toggle / just-today / all-recurrences / brick delete                   | **gate (`npm run eval`)** + the § Retired / amended amendments + `C-m5-019` + `E-m5-001..004`              |

**Gate-verified portion:** AC #14's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M8/M9a/M9b/M9c/M9d/M9e precedent. AC #14's no-regression half is anchored by the sanctioned amendments in § Retired / amended test IDs (the only stale-test surface — the `TopBar` `aria-label` and `persist.test.ts` `SCHEMA_VERSION`/`defaultState` collateral) plus `C-m5-019` (the `BuildingClient` `currentDayBlocks` feed is byte-equivalent with empty `deletions`). All other 13 ACs map to at least one bespoke `m5` test ID; every `m5` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** Locked mode — no affordances → `C-m5-003`; reduced motion → `C-m5-005`/`C-m5-018`/`A-m5-003`; "Just today" on a non-recurring block → `C-m5-011`; "All recurrences" on a block in `history` → `U-m5-004`/`C-m5-016`; "Just today" then a day rollover → `C-m5-015` (re-projecting `currentDate` to tomorrow re-renders the block); deleting the block a brick lives in → `U-m5-006`/`C-m5-016` (the nested bricks go with the block — no orphan); deleting every block and brick → `C-m5-020`; toggling Edit Mode with the modal open → `C-m5-014`; delete during a log/score animation → `C-m5-020`; a "just today" key for a block id not applicable today → `U-m5-003`/`U-m5-013`; `custom-range` with a one-day range → `C-m5-012`. The reducer immutability + no-op edges → `U-m5-003`/`U-m5-005`/`U-m5-007`; the v3 round-trip / malformed-`deletions` coercion → `U-m5-010`; stale-key harmlessness (SG-m5-06) → `U-m5-004`/`U-m5-013`.

## Milestone 6 — Drag Reorder — Tests

This entry covers M6 — the third Edit-Mode verb: **reorder**. M5 made the day deletable; M6 makes it rearrangeable. A `grip-vertical` drag handle is revealed alongside the M5 `×` on every block card and every in-block brick row when `editMode === true`; the handle is the only drag origin (ADR-008 — no long-press, no swipe-to-reveal; AC #3). Block reorder = re-time (`REORDER_BLOCK` rewrites `block.start`/`block.end`; the M4e half-open overlap engine rejects collisions with a snap-back + medium haptic); brick reorder = in-block array shuffle (`REORDER_BRICK_IN_BLOCK` splices `block.bricks[]`). M6 introduces **no new persisted field** and **no `schemaVersion` bump** — block position is implicit in `start`, brick position is implicit in array index (AC #10). It is derived from the `plan.md` M6 entry (`## Milestone 6 — Drag Reorder — Plan`, commit `bcd9981`). Feature slug: `m6`. ID prefixes: `U-m6-`, `C-m6-`, `E-m6-`, `A-m6-`. M6 has a real pure-logic surface (the two reducer arms, the `lib/snapToSlot.ts` helper) and a real UI surface (the new `<DraggableTimelineBlock>` wrapper, the new `<BlockBrickReorderGroup>`, the handle additions to `<TimelineBlock>` + `<BrickChip>`), so it has the full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M6 has a **large genuine unit + component surface** — the two reducer arms (`REORDER_BLOCK` / `REORDER_BRICK_IN_BLOCK`), the new `lib/snapToSlot.ts` helper (`snapToSlot` + `shiftEnd`), the new `<DraggableTimelineBlock>` wrapper, the new `<BlockBrickReorderGroup>`, and the handle additions to `<TimelineBlock>` + `<BrickChip>`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. One AC is honestly part-gate-verified, consistent with the M5 (#14) / M8 (#14/#15) / M9a (#10/#11) / M9b (#14/#15) / M9c (#15) / M9d (#13) / M9e (#12) precedent:

- **AC #13 (no regression to M1–M9e; quality gates — `tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green; E2E deferred-to-preview covers a block re-time / an overlap-rejected drop / a brick array reorder / an Edit-Mode/Locked toggle around a drag)** → the _quality-gate_ half (lint / typecheck / full-suite-green / `test:tz`) is gate-verified by `npm run eval`; the _no-regression_ half is anchored by the sanctioned amendments listed in § Retired / amended test IDs (the M5 `TimelineBlock`/`BrickChip` Edit-Mode-affordance-set assertions become stale because the handle now also renders — additive amendment) plus `C-m6-002` (Locked mode is byte-identical to M5 — no handle, no drag, every M5 test still green) and `C-m6-013` (a single-brick block does not mount `<BlockBrickReorderGroup>`, preserving the M5 plain `<ul>` render); the four named E2E scenarios are authored as real `test()` blocks (`E-m6-001..004`).

All other 12 ACs map to at least one concrete bespoke `m6` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M5/M8/M9a–M9e discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m6-001` (`REORDER_BLOCK` valid drop) asserts the EXACT `start`/`end` strings** are written on the named block — for a block with `start: "08:00"`, `end: "09:00"` dispatched with `newStart: "10:00"`, `newEnd: "11:00"`, the test asserts the post-state's `blocks.find(b => b.id === blockId)` has `start === "10:00"` AND `end === "11:00"`, exactly. A mutant that writes only `start` (forgets `end`) or that shifts `end` by the wrong delta (e.g. uses the old delta instead of the new one) fails the exact-string assertion.
- **`U-m6-002` (`REORDER_BLOCK` overlap rejection — no-op `===` `state`) asserts the reducer returns the ORIGINAL `state` reference** (`expect(next).toBe(state)`) when the proposed `newStart`/`newEnd` overlaps any other block applicable on `currentDate`. The reducer is the single guard against an invalid write; a mutant that writes anyway and lets the UI sort it out fails the `===` assertion.
- **`U-m6-003` (`REORDER_BLOCK` does NOT rewrite `history`) asserts `next.history === state.history`** (same reference, structurally unchanged) — ADR-045's read-only `history` is enforced by reference identity, not a deep compare a mutant could satisfy by cloning. A fixture `ArchivedDay` containing the re-timed block is asserted to still hold the **old** times after the dispatch.
- **`U-m6-004` (`REORDER_BLOCK` preserves `end: undefined` when `newEnd: null`)** asserts the post-state block carries `end === undefined` (not `null`, not the old `end`) — open-ended blocks (`block.end === undefined`) stay open-ended under reorder (Edge cases — "Block with `end: null`"). A mutant that writes `end: null` (or `end: "24:00"`) fails the strict equality check.
- **`U-m6-005`/`U-m6-007` (immutability) freeze the input** — `Object.freeze` on `state`, `state.blocks`, each `Block`, each `Brick`, `state.looseBricks`, `state.deletions`, `state.history` — and assert the reducer arm `not.toThrow()` and returns a new top-level object (`next !== state`) without mutating any nested collection. A mutant doing an in-place `push`/`splice`/property-set fails under the freeze.
- **`U-m6-006` (`REORDER_BRICK_IN_BLOCK` splice) asserts the EXACT post-splice array order** — given `block.bricks = [brk-A, brk-B, brk-C]` and `{ fromIndex: 0, toIndex: 2 }`, the test asserts `next.blocks[0].bricks.map(b => b.id) === ["brk-B", "brk-C", "brk-A"]` (post-removal index semantics). Bricks' `id`, `kind`, `start`/`end`, `done`, `unitsDone` are asserted byte-identical pre/post — only the array order changes. A mutant using pre-removal-index semantics or swapping the wrong pair fails the exact-array assertion.
- **`U-m6-008` (`REORDER_BRICK_IN_BLOCK` identity short-circuit) asserts the reducer returns the ORIGINAL `state` reference** (`expect(next).toBe(state)`) when `fromIndex === toIndex` OR when either index is out of `[0, block.bricks.length)`. Mirrors the M4f `SET_UNITS_DONE` array-identity pattern; a mutant that always rebuilds `blocks` returns a fresh-but-equal object and fails the `===` assertion.
- **`U-m6-009` (`REORDER_BRICK_IN_BLOCK` does NOT invoke the overlap engine) asserts a brick with `hasDuration: true` keeps its EXACT `start`/`end`** after reorder — given `brk-timed` with `start: "08:00"`, `end: "08:30"` shuffled inside its block, the post-state brick has `start === "08:00"` AND `end === "08:30"`, byte-identical. A mutant that calls `findOverlaps` for the brick reorder or clears the brick's time window fails the strict-equality check.
- **`U-m6-010` (`snapToSlot` boundaries) asserts EXACT `"HH:MM"` outputs** for: `offsetPx = 0` → `"00:00"`; mid-slot `offsetPx` (e.g. 14 min equivalent) → snaps to the nearest 30-min boundary (round-half — 14 min → `"00:00"`, 15 min → `"00:30"`); `offsetPx` ≥ 24h → clamps to `"23:30"` (SG-m6-07/SG-m6-08); negative `offsetPx` clamps to `"00:00"`. A mutant using `Math.floor` instead of `Math.round`, or `SLOT_MIN = 15`/`SLOT_MIN = 60`, fails the exact-string assertion.
- **`U-m6-014` (scoring invariance under brick reorder) asserts `dayPct(stateBefore) === dayPct(stateAfter)`** and `blockPct(blk-recur, stateBefore) === blockPct(blk-recur, stateAfter)` for byte-identical scores across a `REORDER_BRICK_IN_BLOCK` dispatch — scoring is order-independent (the mean of brick `done` values does not depend on array order). A mutant that introduces a positional weighting fails the numeric-equality assertion.
- **`C-m6-001` (block handle in Edit Mode) asserts the handle is an `<button type="button">`** with `aria-label="Reorder block <name>"` and a hit area ≥44px (`getBoundingClientRect().height >= 44` AND `width >= 44`) — ADR-031 floor enforced by a real measurement, not by a class-name proxy.
- **`C-m6-005` (handle is only drag origin) asserts the chip body tap does NOT call `dragControls.start`** (`vi.fn()` spy with `toHaveBeenCalledTimes(0)`) while a handle tap calls it exactly once — SG-m6-01 / AC #3 enforced as a numeric call-count assertion, not an end-to-end drag simulation. A mutant that wires `onPointerDown` on the chip body fails.
- **`C-m6-008` (snap-back on overlap rejection — medium haptic) asserts `haptics.medium` is called EXACTLY ONCE** on a rejected drop and `haptics.light` is called zero times after rejection — distinguishes the rejected path from the successful-drop path (where `light` fires on commit). A mutant firing `light` on rejection fails.
- **`C-m6-009` (drop-on-same-slot no-op) asserts NO `REORDER_BLOCK` action is dispatched** and NO haptic fires when the post-snap `newStart === block.start` — Edge cases ("Block dropped onto its own current slot"). The dispatch and haptic spies both register zero calls; a mutant that always dispatches fails.
- **`C-m6-010` (modal-open suppresses drag) asserts the `motion.div`'s `drag` prop is `false` when `modalOpen === true`** even if `editMode === true` — Edge cases ("Delete modal open during a drag"). A mutant that omits the `modalOpen` gating fails the prop-value assertion.

### Test ID layout

| Layer                                 | IDs             | Count  |
| ------------------------------------- | --------------- | ------ |
| Unit (Vitest)                         | `U-m6-001..014` | 14     |
| Component (Vitest + Testing Library)  | `C-m6-001..014` | 14     |
| Accessibility (axe via Playwright)    | `A-m6-001..002` | 2      |
| E2E (Playwright, deferred-to-preview) | `E-m6-001..004` | 4      |
| **Total**                             |                 | **34** |

ID series start values were supplied by the orchestrator as the running totals for the four `m6` prefixes; m6 introduces four fresh prefixes (`U-m6-`, `C-m6-`, `E-m6-`, `A-m6-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m6 IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `deletions: {}`, `history: { "2026-05-10": <ArchivedDay snapshot> }`, `schemaVersion: 3`, plus the blocks/bricks below.
- **`blk-A`** — a closed block, `start: "08:00"`, `end: "09:00"`, `recurrence.kind: "every-day"`, name `"Morning"`, holding three bricks `brk-A1` (tick), `brk-A2` (units), `brk-A3` (tick).
- **`blk-B`** — a closed block, `start: "10:00"`, `end: "11:00"`, `recurrence.kind: "every-day"`, name `"Workout"`, holding one brick `brk-B1` (tick).
- **`blk-open`** — an open-ended block, `start: "14:00"`, `end: undefined`, `recurrence.kind: "every-day"`, name `"Open"`, holding one brick `brk-O1` (tick).
- **`blk-timed-brick`** — a closed block, `start: "16:00"`, `end: "17:00"`, holding one timed brick `brk-T1` (`hasDuration: true`, `start: "16:15"`, `end: "16:45"`).
- **`blk-single`** — a closed block holding exactly one brick `brk-S1` (the single-brick-block case for `C-m6-013`).
- **`brk-loose`** — a loose brick in `state.looseBricks` (tick kind, no `start`/`end`).
- The `ArchivedDay` at `"2026-05-10"` includes a snapshot whose blocks carry the **pre-M6** times — used to assert ADR-045's read-only `history` (`U-m6-003`).

### Unit (Vitest)

`U-m6-001..005` exercise the new `REORDER_BLOCK` reducer arm (pure `(state, action)` — no clock, no `localStorage`, driven directly). `U-m6-006..009` exercise the new `REORDER_BRICK_IN_BLOCK` reducer arm. `U-m6-010..012` exercise the pure `snapToSlot` / `shiftEnd` helpers in `lib/snapToSlot.ts`. `U-m6-013` exercises the Action-union exhaustiveness. `U-m6-014` exercises scoring invariance under brick reorder.

#### U-m6-001 — success (REORDER_BLOCK — writes the EXACT new `start` and shifted `end` on the closed block, mutation-resistant)

Target file: `lib/data.test.ts` (EXISTS — m6 reducer cases appended; no M1–M5 ID touched)
Layer: Unit
**GIVEN** the standing fixture `state` (`blk-A` closed `"08:00"`–`"09:00"`, `blk-B` closed `"10:00"`–`"11:00"`, `blk-open` open-ended `"14:00"`), and `reducer` from `lib/data.ts`
**WHEN** `reducer(state, { type: "REORDER_BLOCK", blockId: "blk-A", newStart: "13:00", newEnd: "14:00" })` is dispatched
**THEN** the returned state's `blocks.find(b => b.id === "blk-A")` has `start === "13:00"` AND `end === "14:00"` — **exactly** the strings passed in; `next.blocks` is a new array (not the same reference) but every OTHER block (`blk-B`, `blk-open`) is byte-identical (same `start`/`end`/`bricks[]` references); `next !== state`; the dispatch is immutable.
**AND** `next.deletions`, `next.categories`, `next.looseBricks`, `next.history` are all the **same references** as on the input `state` — `REORDER_BLOCK` touches `state.blocks` only (and only the named block within it).
Proves: plan.md § Reducer arms (`REORDER_BLOCK` valid drop — "map the named block to `{ ...b, start: action.newStart, end: action.newEnd ?? undefined }`; other blocks byte-identical") + § Data model (no new persisted field; block position is its `start`) — covers SPEC AC #5.
Tag: success.

#### U-m6-002 — edge (REORDER_BLOCK — overlap rejection returns the ORIGINAL `state` reference, mutation-resistant)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-A` (`"08:00"`–`"09:00"`) and `blk-B` (`"10:00"`–`"11:00"`)
**WHEN** `reducer(state, { type: "REORDER_BLOCK", blockId: "blk-A", newStart: "10:30", newEnd: "11:30" })` is dispatched (a proposed drop that overlaps `blk-B`'s `"10:00"`–`"11:00"`)
**THEN** the returned value is the **same reference** as the input `state` (`expect(next).toBe(state)`) — the reducer is the single guard against an invalid write; on collision it returns `state` unchanged, never writes `blk-A` to the new times, and the UI handles the snap-back / medium-haptic / a11y announce. The overlap probe uses `findOverlaps(candidate, selectAllTimedItems(state), action.blockId)` with `excludeId === blockId` so the block being dragged does not "overlap itself".
**AND** a touching-boundary drop (newStart === blk-B.end, i.e. `"11:00"`–`"12:00"`) is **valid** (ADR-006 half-open `[start, end)` intervals — touching boundaries do not overlap); the reducer writes the new times and `next !== state`. A mutant using a closed-interval overlap check fails the touching-boundary case.
Proves: plan.md § Reducer arms (`REORDER_BLOCK` — "If `hits.length > 0` → return `state` unchanged"; ADR-006 half-open) + § Edge cases ("Overlap rejected") — covers SPEC AC #6.
Tag: edge.

#### U-m6-003 — edge (REORDER_BLOCK — does NOT rewrite `state.history`; recurring template re-time is all-future)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` with `blk-A` (recurring, `"08:00"`–`"09:00"`) and `history = { "2026-05-10": <ArchivedDay whose snapshot includes blk-A logged at "08:00"–"09:00"> }`
**WHEN** `reducer(state, { type: "REORDER_BLOCK", blockId: "blk-A", newStart: "13:00", newEnd: "14:00" })` is dispatched
**THEN** `next.history` is the **same reference** as `state.history` (`expect(next.history).toBe(state.history)`) — ADR-045: the archived `ArchivedDay` for `"2026-05-10"` is byte-identical and **still** shows `blk-A` at `"08:00"`–`"09:00"` (the pre-M6 time); the re-time writes `state.blocks` only and never touches `history`.
**AND** the post-state `next.blocks.find(b => b.id === "blk-A")` carries the **new** `"13:00"`–`"14:00"` — the template is rewritten so today (`"2026-05-18"`) and every future day the recurrence covers will resolve to the new times (all-future semantics, SG-m6-02); the recurrence object itself is unchanged (`appliesOn` still resolves correctly).
Proves: plan.md § Reducer arms (`REORDER_BLOCK` — "`state.history` is **untouched** (ADR-045 — AC #7)"; "Recurring blocks: the template is rewritten, so all-future days resolve to the new time") + § Decisions (ADR-045, SG-m6-02 RESOLVED) — covers SPEC AC #7.
Tag: edge.

#### U-m6-004 — edge (REORDER_BLOCK — `newEnd: null` preserves `end: undefined` on an open-ended block)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-open` (`start: "14:00"`, `end: undefined`, open-ended)
**WHEN** `reducer(state, { type: "REORDER_BLOCK", blockId: "blk-open", newStart: "15:00", newEnd: null })` is dispatched
**THEN** the post-state block `next.blocks.find(b => b.id === "blk-open")` carries `start === "15:00"` AND `end === undefined` — **strictly** `undefined`, not `null`, not `"24:00"`, not the old `end` (Edge cases — "Block with `end: null` (open-ended)"). The open-ended invariant is preserved: a user who picked open-ended deliberately keeps it after a reorder.
**AND** for a closed block (`blk-A`, `end: "09:00"`) dispatched with `newStart: "10:00"`, `newEnd: "11:00"` the post-state block carries `end === "11:00"` (not `undefined`) — the `newEnd ?? undefined` collapse maps `null → undefined` and preserves a string `end` verbatim.
Proves: plan.md § Reducer arms (`REORDER_BLOCK` — "`newEnd: null` ⇒ the block keeps `end: undefined`") + § Data model (`newEnd ?? undefined`) + § Edge cases ("Block with `end: null`") — covers SPEC AC #5.
Tag: edge.

#### U-m6-005 — edge (REORDER_BLOCK — immutable; no-op on a missing block id)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state`, deeply **frozen** (`Object.freeze` on `state`, `state.blocks`, each `Block`, each `Brick`, `state.looseBricks`, `state.deletions`, `state.history`)
**WHEN** `reducer(frozenState, { type: "REORDER_BLOCK", blockId: "blk-A", newStart: "13:00", newEnd: "14:00" })` is dispatched, and separately `reducer(frozenState, { type: "REORDER_BLOCK", blockId: "ghost-id", newStart: "13:00", newEnd: "14:00" })`
**THEN** neither call throws (`not.toThrow()`); the `blk-A` call returns a new top-level object (`next !== state`) with `blk-A`'s new times — the input `state` and every nested collection are referentially unchanged after the call.
**AND** the `"ghost-id"` call (a block id not present in `state.blocks`) is a no-op — `findOverlaps` skips the missing id naturally; the `map` produces an equivalent array; per the plan's "No-op when `blockId` not found" the reducer may return `state` unchanged or a structurally-equal new object — either way no crash, no mutation, no overlap probe panic.
Proves: plan.md § Reducer arms (`REORDER_BLOCK` immutable; "No-op when `blockId` not found") — covers SPEC AC #5.
Tag: edge.

#### U-m6-006 — success (REORDER_BRICK_IN_BLOCK — splices `block.bricks[]` to the EXACT new order, post-removal index, mutation-resistant)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-A` with `bricks: [brk-A1, brk-A2, brk-A3]`
**WHEN** `reducer(state, { type: "REORDER_BRICK_IN_BLOCK", blockId: "blk-A", fromIndex: 0, toIndex: 2 })` is dispatched
**THEN** `next.blocks.find(b => b.id === "blk-A").bricks.map(b => b.id)` is **exactly** `["brk-A2", "brk-A3", "brk-A1"]` — post-removal index semantics (remove from index 0, then insert at index 2 of the post-removal length-2 array → tail position); each brick object's `id`, `kind`, `start`/`end`, `done`, `unitsDone` is byte-identical pre/post — only the array order changes.
**AND** every other block in `state.blocks` is the **same reference** post-dispatch (`next.blocks[i] === state.blocks[i]` for every `i` where `blocks[i].id !== "blk-A"`); `next.deletions`, `next.categories`, `next.looseBricks`, `next.history` are all the same references; `REORDER_BRICK_IN_BLOCK` touches one block's `bricks[]` only.
Proves: plan.md § Reducer arms (`REORDER_BRICK_IN_BLOCK` — "immutable splice: copy `block.bricks`, remove the entry at `fromIndex`, insert it at `toIndex` (post-removal index)") + § Data model — covers SPEC AC #8.
Tag: success.

#### U-m6-007 — edge (REORDER_BRICK_IN_BLOCK — immutable; bounds-checked no-op returns the ORIGINAL `state` reference)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-A` (3 bricks), deeply **frozen**
**WHEN** `reducer(frozenState, …)` is dispatched four times: (a) `fromIndex: -1, toIndex: 2`; (b) `fromIndex: 0, toIndex: 5`; (c) `fromIndex: 3, toIndex: 1`; (d) on a `blockId: "ghost-id"` not in `state.blocks`
**THEN** each call returns the **same reference** as the input `state` (`expect(next).toBe(state)`) — out-of-range indices (negative, ≥ `bricks.length`) and a missing block id are bounds-checked no-ops; no throw under the freeze; no mutation. The M4f `SET_UNITS_DONE` array-identity pattern is preserved so React skips a needless re-render.
**AND** a valid splice (e.g. `fromIndex: 1, toIndex: 0`) on the frozen fixture returns `next !== state` without throwing — the immutable copy + splice does not mutate `state.blocks` or any frozen `Brick`.
Proves: plan.md § Reducer arms (`REORDER_BRICK_IN_BLOCK` — "Bounds-check: `fromIndex` and `toIndex` must each be in `[0, block.bricks.length)`; if either is out of range, returns `state`"; immutable) — covers SPEC AC #8.
Tag: edge.

#### U-m6-008 — edge (REORDER_BRICK_IN_BLOCK — identity short-circuit on `fromIndex === toIndex`)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-A` (3 bricks)
**WHEN** `reducer(state, { type: "REORDER_BRICK_IN_BLOCK", blockId: "blk-A", fromIndex: 1, toIndex: 1 })` is dispatched
**THEN** the returned value is the **same reference** as the input `state` (`expect(next).toBe(state)`) — when nothing changed, the reducer returns the original `state` so React skips a needless re-render (matches the M4f `SET_UNITS_DONE` array-identity pattern). No fresh `state.blocks` array allocated; no fresh `bricks[]` array allocated.
**AND** dispatching with `fromIndex: 0, toIndex: 1` and then immediately re-dispatching with `fromIndex: 1, toIndex: 0` returns the original brick order — round-trip identity holds; the post-second-dispatch `bricks.map(b => b.id)` deep-equals the pre-first-dispatch order.
Proves: plan.md § Reducer arms (`REORDER_BRICK_IN_BLOCK` — "Identity short-circuit: when `fromIndex === toIndex`, return `state` unchanged") — covers SPEC AC #8.
Tag: edge.

#### U-m6-009 — edge (REORDER_BRICK_IN_BLOCK — brick with `hasDuration: true` keeps its EXACT `start`/`end`; overlap engine NOT invoked)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** the standing fixture `state` holding `blk-timed-brick` (`"16:00"`–`"17:00"`) with `bricks: [brk-T1 (hasDuration: true, start: "16:15", end: "16:45"), brk-T2 (tick)]`, and a spy on `lib/overlap.ts` `findOverlaps`
**WHEN** `reducer(state, { type: "REORDER_BRICK_IN_BLOCK", blockId: "blk-timed-brick", fromIndex: 0, toIndex: 1 })` is dispatched
**THEN** the post-state `brk-T1` carries `start === "16:15"` AND `end === "16:45"` — **byte-identical** to its pre-state time window; the array order is `[brk-T2, brk-T1]`; the time window is independent of the array index (AC #9). A mutant that re-times the brick or clears its `start`/`end` fails the strict-equality check.
**AND** `findOverlaps` is called **zero times** during the dispatch (`toHaveBeenCalledTimes(0)`) — a brick reorder cannot change any time window, so the overlap engine is NOT invoked (plan baseline). A mutant that gates the brick reorder on overlap detection fires the spy and fails.
Proves: plan.md § Reducer arms (`REORDER_BRICK_IN_BLOCK` — "**The overlap engine is NOT invoked** — a brick reorder cannot change any time window") + § Edge cases ("Brick with `hasDuration: true` inside a block — array reorder does **not** change the brick's `start`/`end`") — covers SPEC AC #9.
Tag: edge.

#### U-m6-010 — success / edge (snapToSlot — EXACT `"HH:MM"` outputs on the 30-min grid; clamps to `[00:00, 23:30]`)

Target file: `lib/snapToSlot.test.ts` (NEW)
Layer: Unit
**GIVEN** `snapToSlot` and `SLOT_MIN` from `lib/snapToSlot.ts`, and an `HOUR_HEIGHT_PX` fixture (e.g. 60 — every minute is 1px, the simplest test substrate)
**WHEN** `snapToSlot(offsetPx, 60)` is called for the boundary table — `0` → `"00:00"`; `14` (14 min in) → `"00:00"` (round-down); `15` (15 min, the half-slot boundary) → `"00:30"` (round-half-up to 30); `30` → `"00:30"`; `44` → `"00:30"`; `45` → `"01:00"`; `1440` (24h) → `"23:30"` (clamped to 23:30); `-1` (above midnight) → `"00:00"` (clamped)
**THEN** every output is **exactly** the expected `"HH:MM"` string — round-to-nearest with `SLOT_MIN === 30` (SG-m6-07 — 30-min grid; matches M1 slot grid); clamped to `[0, 24h - SLOT_MIN]` so `newStart` always lands in `[00:00, 23:30]` (SG-m6-08 — clamp, not reject). A mutant using `Math.floor` (15 → "00:00") or `SLOT_MIN = 15`/`60` fails the boundary table.
**AND** `SLOT_MIN === 30` is asserted strictly (`expect(SLOT_MIN).toBe(30)`); the function reads no clock, no DOM (`expect(() => snapToSlot(120, 60)).not.toThrow()` in a `JSDOM`-free environment).
Proves: plan.md § Snap helper (`snapToSlot` — "round-to-nearest"; `SLOT_MIN = 30`; clamps to `[0, 24h - SLOT_MIN]`) + § Resolutions (SG-m6-07 RESOLVED, SG-m6-08 RESOLVED) — covers SPEC AC #5.
Tag: edge.

#### U-m6-011 — success / edge (shiftEnd — preserves closed-block duration; clamps to `[00:00, 24:00]`; `null` round-trips to `null`)

Target file: `lib/snapToSlot.test.ts`
Layer: Unit
**GIVEN** `shiftEnd` from `lib/snapToSlot.ts`
**WHEN** `shiftEnd(oldStart, oldEnd, newStart)` is called for the table — `("08:00", "09:00", "10:00")` (60-min duration shifted by +2h); `("08:00", "10:00", "07:30")` (120-min duration shifted by -30 min); `("23:00", "24:00", "23:30")` (an exactly-`"24:00"` end shifted by +30 min, should clamp to `"24:00"`); `("08:00", null, "10:00")` (open-ended — `null` in, `null` out); `("00:00", "00:30", "00:00")` (no shift — should round-trip)
**THEN** the outputs are EXACTLY `"11:00"`, `"09:30"`, `"24:00"` (clamped at the upper bound — SG-m6-08), `null` (preserved verbatim), and `"00:30"` (no-shift round-trip). A mutant that drops the duration (just writes `newStart + (oldEnd duration as fixed string)`) or that ceils `end` at `"23:30"` (instead of `"24:00"`) fails the upper-clamp case.
**AND** `shiftEnd` is pure (`expect(() => shiftEnd("08:00", "09:00", "10:00")).not.toThrow()` in JSDOM-free env); reads no clock; the duration arithmetic is in minute integers (no `Date` round-trip → no TZ drift, ADR-046 discipline). For an `oldEnd: null` input the function returns `null` regardless of `newStart`.
Proves: plan.md § Snap helper (`shiftEnd` — "preserves duration"; "ceils at `[0, 24*60]`"; `null` preserved) + § Resolutions (SG-m6-08 — `end` clamps to `[00:00, 24:00]`) — covers SPEC AC #5.
Tag: edge.

#### U-m6-012 — edge (snapToSlot/shiftEnd — TZ-independence; minute-integer arithmetic; no `Date` reads)

Target file: `lib/snapToSlot.test.ts`
Layer: Unit
**GIVEN** the snap helpers from `lib/snapToSlot.ts`, plus a `process.env.TZ` test-shim that runs the same input table under `"UTC"`, `"America/New_York"`, and `"Asia/Tokyo"` (the M9a/M9b `test:tz` pattern; or the M9a `vi.useFakeTimers` clock-pinning pattern if `process.env.TZ` rebinding is unavailable in vitest)
**WHEN** the same `(offsetPx, hourHeightPx)` table from `U-m6-010` is run under each TZ
**THEN** every `snapToSlot` output is **byte-identical** across all three TZs — the helpers operate in minute integers and never call `new Date()`, `Date.now()`, or `getTimezoneOffset`; the outputs `"00:00"`, `"00:30"`, `"23:30"` are unchanged. A mutant that constructs a `Date` from minutes and reads `.getHours()` fails under the non-UTC TZs.
**AND** `shiftEnd` outputs are likewise TZ-independent — `("08:00", "09:00", "10:00")` returns `"11:00"` under all three TZs; a regression that introduces a `Date` round-trip would mis-shift across DST boundaries and fail under `"America/New_York"`.
Proves: plan.md § Snap helper ("Wholly TZ-independent (works in minute integers)") + § Decisions (ADR-046 — period-aggregate helpers are pure; no clock reads) — covers SPEC AC #13.
Tag: edge.

#### U-m6-013 — edge (the Action union + `assertNever` exhaustiveness — the two new members compile-force their arms)

Target file: `lib/data.test.ts`
Layer: Unit
**GIVEN** `reducer` from `lib/data.ts` and the `Action` union from `lib/types.ts` extended with `REORDER_BLOCK` and `REORDER_BRICK_IN_BLOCK`
**WHEN** each of the two new action types is dispatched, and an `Action`-typed value is exhaustively handled
**THEN** both new action types are handled by a real `case` arm — `reducer` returns a defined `AppState` for each (never falls through to the `default`/`assertNever` branch); dispatching any existing M1–M5 action (e.g. `ADD_BLOCK`, `LOG_TICK_BRICK`, `DELETE_BLOCK_TODAY`) still behaves byte-identically (the union widening is additive — no existing arm changed).
**AND** the `default` arm's `assertNever(action)` is still present and the file type-checks — adding the two union members **without** their `case` arms is a TypeScript compile error (the ADR-043 exhaustiveness guarantee); this AC is proven structurally (the suite type-checks under `tsc` only with both arms present).
Proves: plan.md § Reducer arms ("`assertNever` exhaustiveness preserved") + § Decisions (ADR-043) — covers SPEC AC #5, AC #8.
Tag: edge.

#### U-m6-014 — edge (scoring invariance under brick reorder — `dayPct`/`blockPct` are byte-identical; HeroRing does not flicker)

Target file: `lib/data.test.ts` (alongside the brick-reorder reducer cases) — exercises `lib/dharma.ts`'s `dayPct` / `blockPct` against the pre/post `state`
Layer: Unit
**GIVEN** the standing fixture `state` with `blk-A` holding mixed-done bricks (`brk-A1.done === true`, `brk-A2.unitsDone === 3` of `target: 5`, `brk-A3.done === false`)
**WHEN** the pre-state `dayPct(state)` and `blockPct("blk-A", state)` are captured, then `REORDER_BRICK_IN_BLOCK` shuffles the three bricks (e.g. `fromIndex: 0, toIndex: 2`), and the post-state scores are computed
**THEN** `dayPct(next) === dayPct(state)` (exact numeric equality — `expect(dayPct(next)).toBe(dayPct(state))`); `blockPct("blk-A", next) === blockPct("blk-A", state)`; the score is the mean of `brickPct` across the block's bricks, which is order-independent. A mutant that weights bricks by position (e.g. inverse-index weighting) fails the byte-identical assertion.
**AND** the `BlueprintBar`'s fill input (the per-block scaffold fill) is unchanged for `blk-A` — feeding `BlueprintBar` from the post-reorder `state` produces the same fraction; HeroRing does not flicker on re-render (the prop changed identity but not value).
Proves: plan.md § Components `<BuildingClient>` ("Scores recompute automatically … the mean of brick `done` values does not depend on order, so day/block `Pct` are unchanged — confirm with a property-style unit test") + § Edge cases ("Brick reorder inside a block — scoring is the average across bricks, which is order-independent") — covers SPEC AC #8.
Tag: edge.

### Component (Vitest + Testing Library)

`C-m6-001..002` cover the `<TimelineBlock>` block handle (presence in Edit Mode; absence in Locked); `C-m6-003..004` cover the `<BrickChip>` brick handle (in-block only; no handle in the tray, SG-m6-04); `C-m6-005` covers the "handle is the only drag origin" contract (AC #3); `C-m6-006..009` cover the `<DraggableTimelineBlock>` wrapper (lift / dispatch / reduced motion / snap-back / drop-on-same-slot); `C-m6-010..011` cover the modal-open suppression + Edit-Mode toggle mid-drag; `C-m6-012..013` cover the `<BlockBrickReorderGroup>` (`onReorder` → dispatch; single-brick block skipped); `C-m6-014` covers the aria-live announcement + score recompute. All render with React Testing Library; Edit Mode is supplied via `<EditModeProvider>` (or a test double exposing `{ editMode, toggle }`); `prefers-reduced-motion` is controlled via the M0 `matchMedia` mock / `useReducedMotion()` test helper; `localStorage` is mocked and the `dharma:v1` key cleared in `beforeEach` for any test mounting `<BuildingClient>`. Drag interactions are simulated via Framer Motion's `useDragControls` instance (`dragControls.start(mockPointerEvent)`) and `onDragEnd` is called with a synthesized `info.point.y` — no real pointer drag in JSDOM; the wrapper's commit logic is exercised by directly invoking the handlers (`fireEvent.pointerDown` on the handle + a programmatic `onDragEnd` call), the same pattern Framer's own tests use.

#### C-m6-001 — success (TimelineBlock — Edit Mode renders a `grip-vertical` handle alongside the M5 `×`; ≥44px; SR-labeled)

Target file: `components/TimelineBlock.test.tsx` (EXISTS — m6 cases appended; the M5 Edit-Mode-affordance-set assertions amended — see § Retired / amended test IDs)
Layer: Component
**GIVEN** `<TimelineBlock block={blk-A} onReorderRequest={vi.fn()} dragControls={mockDragControls} />` rendered inside `<EditModeProvider>` with `editMode === true`, `prefers-reduced-motion` not set
**WHEN** the block card is rendered
**THEN** an always-visible drag handle `<button type="button">` renders at the card's leading edge — a `lucide-react` `GripVertical` glyph (~14px) inside a hit area whose `getBoundingClientRect()` measures `height >= 44 && width >= 44` (ADR-031); the handle carries `aria-label="Reorder block Morning"` (the block name embedded); the M5 `×` is still present in the top-right and is still SR-labeled `"Delete block Morning"` — both affordances coexist without visual overlap.
**AND** the handle is visible without any swipe or long-press — it is rendered on mount when `editMode === true` (ADR-008 — always-visible affordance, no gesture-buried discovery; SG-m6-01 RESOLVED). A mutant that gates the handle on a long-press fails the on-mount visibility assertion.
Proves: plan.md § Components `<TimelineBlock>` ("a `lucide-react` `GripVertical` icon centered in a ≥44px square hit target … alongside the M5 `×`"; `aria-label`) + § Resolutions (SG-m6-01 RESOLVED — visible handle, no long-press) + § Decisions (ADR-008, ADR-031) — covers SPEC AC #1.
Tag: success.

#### C-m6-002 — edge (Locked mode — no block handle, no drag; byte-identical to M5)

Target file: `components/TimelineBlock.test.tsx` / `components/DraggableTimelineBlock.test.tsx` (NEW)
Layer: Component
**GIVEN** `<TimelineBlock>` and `<DraggableTimelineBlock>` rendered inside `<EditModeProvider>` with `editMode === false` (the cold-boot default)
**WHEN** each is rendered and inspected, and the block card is tapped
**THEN** **no** drag handle renders on the block (`queryByRole("button", { name: /reorder block/i })` → `null`); the `motion.div`'s `drag` prop evaluates to `false` (no drag is possible); behavior is byte-identical to M5 — the block card's tap-to-expand fires, the brick chip's log gesture fires, the M5 jiggle is suppressed (M5 jiggle is itself `editMode`-gated). AC #1: "in Locked mode no handle is shown and no drag is possible."
**AND** existing M5-era component tests that exercise `editMode === false` (block expand, brick log, Locked-mode behavior, the absence of the `×`) remain green unchanged — the M6 handle is additive and never renders in Locked mode (the AC #13 no-regression anchor for the block surface).
Proves: plan.md § Components `<TimelineBlock>` ("In Locked mode the handle is absent and behavior is byte-identical to M5") + § Edge cases ("Locked mode") + § Regression surface — covers SPEC AC #1, AC #13.
Tag: edge.

#### C-m6-003 — success (BrickChip — Edit Mode + `dragHandle` renders a handle; ≥44px; SR-labeled)

Target file: `components/BrickChip.test.tsx` (EXISTS — m6 cases appended)
Layer: Component
**GIVEN** `<BrickChip brick={brk-A1} dragHandle dragControls={mockDragControls} onTickToggle={vi.fn()} onRequestDeleteBrick={vi.fn()} />` rendered inside `<EditModeProvider>` with `editMode === true`
**WHEN** the chip is rendered and inspected
**THEN** a drag handle `<button type="button">` renders at the chip's leading edge — `GripVertical` glyph (~14px) inside a ≥44px hit target (ADR-031); `aria-label="Reorder brick <name>"` (the brick name embedded); the M5 `×` is still present at the trailing edge with `"Delete brick <name>"`; both ≥44px, no visual overlap at the 430px viewport (block-card-interior ~340px wide accommodates 44 + 44 plus flex-grow body).
**AND** the chip body remains M5-inert under `editMode === true` (SG-m5-05 preserved) — tapping the body does NOT call `onTickToggle` or `onUnitsOpenSheet` (`toHaveBeenCalledTimes(0)`); the handle is the only Edit-Mode-active control besides the `×`.
Proves: plan.md § Components `<BrickChip>` (when `dragHandle === true` AND `editMode === true`: render a `GripVertical` glyph inside a ≥44px hit target; `aria-label`) + § Edge cases ("44px clearance on the smallest brick row") — covers SPEC AC #2.
Tag: success.

#### C-m6-004 — edge (BrickChip — `dragHandle === false` (the tray default) renders NO handle; SG-m6-04 enforced)

Target file: `components/BrickChip.test.tsx` / `components/LooseBricksTray.test.tsx`
Layer: Component
**GIVEN** `<BrickChip brick={brk-loose} />` (default — no `dragHandle` prop, so `dragHandle === false`) inside `<EditModeProvider>` with `editMode === true`, mounted both standalone and inside `<LooseBricksTray>`
**WHEN** each rendering is inspected
**THEN** **no** drag handle renders (`queryByRole("button", { name: /reorder brick/i })` → `null`); the chip's M5 `×` is still present and operable; loose-tray chips show **no** handle — SG-m6-04 (no tray reorder) enforced as a structural absence.
**AND** the `<LooseBricksTray>` is NOT wrapped in any `Reorder.Group` (`container.querySelector('[data-framer-reorder-group]')` → `null`; or `queryByTestId('loose-bricks-reorder-group')` → `null` if the component had ever been wrapped — confirms it has not been). VERIFIER: this is the structural test that no `Reorder.Group` leaks into the tray.
Proves: plan.md § Components `<BrickChip>` ("Loose-tray bricks render **no** handle") + § Components `<LooseBricksTray>` ("UNCHANGED — no tray reorder per SG-m6-04") + § Resolutions (SG-m6-04 RESOLVED) — covers SPEC AC #2.
Tag: edge.

#### C-m6-005 — edge (Handle is the only drag origin — chip/card body taps do NOT start a drag; AC #3 mutation-resistant)

Target file: `components/TimelineBlock.test.tsx` / `components/BrickChip.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock block={blk-A} dragControls={mockBlockControls} />` and `<BrickChip brick={brk-A1} dragHandle dragControls={mockBrickControls} />` inside `<EditModeProvider>` with `editMode === true`, both `dragControls.start` methods spied
**WHEN** for each: (a) the card/chip **body** is tapped (`fireEvent.pointerDown` on the card surface, not the handle); (b) the **handle** is tapped (`fireEvent.pointerDown` on the handle element)
**THEN** the body tap calls `dragControls.start` **zero times** (`toHaveBeenCalledTimes(0)`) — the chip/card body does NOT initiate a drag; the handle tap calls `dragControls.start` **exactly once** with the event — AC #3 enforced as a numeric call-count assertion. A mutant that wires `onPointerDown` on the chip body (e.g. via the `Reorder.Item` default `dragListener={true}`) fires the spy and fails.
**AND** the body tap in Edit Mode also does NOT fire `onTickToggle`/`onUnitsOpenSheet`/`handleCardClick` (zero calls) — the M5 SG-m5-05 "Edit Mode tap is inert" contract is preserved; the handle gesture does not double-fire either (handle `e.stopPropagation()` prevents bubbling to the chip/card body).
Proves: plan.md § Components `<TimelineBlock>`/`<BrickChip>` ("The handle is the only drag origin"; `dragListener={false}`; `e.stopPropagation()`) + § Resolutions (SG-m6-01 RESOLVED — handle is the only drag origin) — covers SPEC AC #3.
Tag: edge.

#### C-m6-006 — success (DraggableTimelineBlock — lift on `onDragStart`; `light` haptic; dispatches `REORDER_BLOCK` on a valid drop)

Target file: `components/DraggableTimelineBlock.test.tsx` (NEW)
Layer: Component
**GIVEN** `<DraggableTimelineBlock block={blk-A} onReorderRequest={mockHandler} modalOpen={false} dragConstraintsRef={mockRef} />` inside `<EditModeProvider>` with `editMode === true`, `prefers-reduced-motion` not set; `haptics.light` and `haptics.medium` spied; the `motion.div`'s `whileDrag` prop inspected
**WHEN** the handle is tapped to start a drag (`dragControls.start(mockPointerEvent)` → triggers `onDragStart`), then `onDragEnd` is invoked programmatically with `info.point.y` corresponding to `newStart === "13:00"` (a valid, non-overlapping drop)
**THEN** at `onDragStart`: `haptics.light` is called exactly once (lift haptic — AC #4); the `whileDrag` props on the `motion.div` are `{ scale: 1.02, boxShadow: …, zIndex: 5 }` — the lift visual is wired (lift visual + shadow elevation from the M0 modal-shadow token).
**AND** at `onDragEnd` (valid drop): `haptics.light` is called a second time (successful-drop haptic); `mockHandler` (the `onReorderRequest` callback) is called exactly once with `(blockId: "blk-A", newStart: "13:00", newEnd: "14:00")` (`newEnd` is computed via `shiftEnd("08:00", "09:00", "13:00")` = `"14:00"`); `haptics.medium` is **not** called.
Proves: plan.md § Components `<DraggableTimelineBlock>` ("`whileDrag={ scale: 1.02, boxShadow, zIndex: 5 }`"; `onDragStart` fires `haptics.light()`; "On a valid drop: fires `haptics.light()`, calls `onReorderRequest(block.id, newStart, newEnd)`") + § Drag-in-flight motion (Lift) — covers SPEC AC #4, AC #5.
Tag: success.

#### C-m6-007 — edge (DraggableTimelineBlock — reduced motion suppresses the lift; haptics + dispatch still fire)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<DraggableTimelineBlock>` rendered with `editMode === true` and `prefers-reduced-motion: reduce` set (via the `matchMedia` mock so `useReducedMotion()` returns `true`)
**WHEN** the handle is tapped to start a drag, then `onDragEnd` is invoked with a valid-drop `info.point.y`
**THEN** the `motion.div`'s `whileDrag` props evaluate to no-scale, no-shadow (the lift visual is suppressed under PRM — either `whileDrag={}` or the props are gated on `!useReducedMotion()`); the in-flight `transition` is `{ duration: 0 }` (no spring interpolation on settle); siblings do not flow (no `layout` props on PRM).
**AND** `haptics.light` (lift, drop) and `onReorderRequest` **still fire** — under reduced motion the gesture commits identically; only the motion is suppressed (AC #11). A mutant that gates the haptic on motion fails the haptic-fires-under-PRM assertion. The polite a11y announcement still emits (verified in `C-m6-014`).
Proves: plan.md § Drag-in-flight motion (Reduced-motion column) + § Edge cases ("Reduced motion") — covers SPEC AC #11.
Tag: edge.

#### C-m6-008 — edge (DraggableTimelineBlock — overlap rejection → snap-back + `medium` haptic + a11y announce; NO `onReorderRequest` call)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<DraggableTimelineBlock block={blk-A} onReorderRequest={mockHandler} onAnnounce={mockAnnounce} />` with `editMode === true`; a parent state holding `blk-B` at `"10:00"`–`"11:00"` so the proposed drop overlaps; the wrapper's "post-dispatch readback" pattern (plan baseline) simulated by leaving `block.start === "08:00"` after dispatch (a real reducer would return `state` unchanged on overlap — see `U-m6-002`)
**WHEN** the handle is tapped to start a drag, `onDragEnd` is invoked with `info.point.y` corresponding to `newStart === "10:30"` (overlap with `blk-B`), and the parent's reducer returns `state` unchanged so `block.start` remains `"08:00"` after the dispatch
**THEN** `mockHandler` (`onReorderRequest`) is called exactly once (the wrapper dispatches and lets the reducer reject — plan baseline); but the wrapper **detects** the rejection (post-dispatch `block.start === "08:00"` still, not the proposed `"10:30"`) and fires `haptics.medium()` **exactly once** (`toHaveBeenCalledTimes(1)`); `haptics.light` is NOT called a second time (no successful-drop haptic).
**AND** `mockAnnounce` is called exactly once with a polite message of the form `"Cannot move Morning — overlaps Workout"` (the colliding block named); the dragged card animates back to `y: 0` via the M0 spring (`springConfigs.bloom`) — the snap-back is wired locally, not via `state`. A mutant firing `haptics.light` (instead of `medium`) on rejection fails.
Proves: plan.md § Components `<DraggableTimelineBlock>` ("On a rejected drop: fires `haptics.medium()`, animates the card back to `y: 0` via the M0 spring, and emits the polite `aria-live` rejection announcement") + § Drop-rejection feedback (a11y announce) + § Edge cases ("Overlap rejected") — covers SPEC AC #6.
Tag: edge.

#### C-m6-009 — edge (DraggableTimelineBlock — drop-on-same-slot is a no-op: no dispatch, no haptic, no announce)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<DraggableTimelineBlock block={blk-A (start: "08:00", end: "09:00")} onReorderRequest={mockHandler} onAnnounce={mockAnnounce} />` with `editMode === true`; `haptics.light` and `haptics.medium` spied
**WHEN** the handle is tapped to start a drag, then `onDragEnd` is invoked with `info.point.y` corresponding to a snapped `newStart === "08:00"` (drop on the block's CURRENT slot)
**THEN** the wrapper short-circuits — `mockHandler` is called **zero times** (no `REORDER_BLOCK` dispatch); `haptics.light` is called only once (the initial lift on `onDragStart`, not a second time on the no-op drop); `haptics.medium` is called **zero times**; `mockAnnounce` is called **zero times** (no announcement for a same-slot no-op — Edge cases).
**AND** the card's visual `y` returns to `0` via the M0 spring (under motion) or instantly (under PRM) — no other side effects.
Proves: plan.md § Components `<DraggableTimelineBlock>` ("Drop-on-same-slot guard: if the rounded `newStart === block.start`, treat as a no-op — no haptic, no dispatch, no announcement") + § Edge cases ("Block dropped onto its own current slot") — covers SPEC AC #5.
Tag: edge.

#### C-m6-010 — edge (DraggableTimelineBlock — `modalOpen === true` suppresses drag; an in-flight drag is impossible while the M5 modal is up)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<DraggableTimelineBlock block={blk-A} modalOpen={true} />` with `editMode === true` — the M5 delete confirmation modal is open
**WHEN** the `motion.div`'s `drag` prop is inspected, and a drag start is attempted via `dragControls.start`
**THEN** the `motion.div`'s `drag` prop evaluates to **`false`** even with `editMode === true` (the gating is `drag={editMode && !modalOpen ? "y" : false}`); a `dragControls.start(event)` call does **not** initiate a drag (Framer Motion's drag is gated on the `drag` prop). The handle button itself is still present (it is `editMode`-gated, not `modalOpen`-gated) but the drag cannot begin while the modal is up — Edge cases ("Delete modal open during a drag").
**AND** with `modalOpen={false}` (modal dismissed) the same `dragControls.start` call DOES initiate the drag (the `motion.div`'s `drag` prop flips back to `"y"`); the modal authority is mutually exclusive with the drag gesture but does not destroy the handle.
Proves: plan.md § Components `<DraggableTimelineBlock>` ("`drag={editMode && !modalOpen ? "y" : false}` (drag is suppressed when Edit Mode is off **or** when the M5 delete modal is open)") + § Edge cases ("Delete modal open during a drag") — covers SPEC AC #6.
Tag: edge.

#### C-m6-011 — edge (DraggableTimelineBlock — toggling Edit Mode mid-drag: in-flight drag completes; no orphan pointer state)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<DraggableTimelineBlock>` inside `<EditModeProvider>` with `editMode === true`; a drag is started (`onDragStart` fired, `wasEditMode` snapshot ref captured)
**WHEN** Edit Mode is toggled OFF mid-drag (the `<TopBar>` pencil flips `editMode` to `false` via the provider); then `onDragEnd` is invoked with a valid-drop `info.point.y`
**THEN** the in-flight drag completes — `onReorderRequest` is called once with the new `start`/`end` (the wrapper consults its `wasEditMode` snapshot ref so the gesture stays active for the duration even after the context flips); `haptics.light` fires on commit; no console error.
**AND** on the NEXT render (after commit) the `editMode === false` reading takes effect and the drag handle is **removed** from the DOM (`queryByRole("button", { name: /reorder block/i })` → `null`); no orphan pointer state remains (a subsequent `fireEvent.pointerDown` on the card body does NOT initiate a new drag).
Proves: plan.md § Components `<DraggableTimelineBlock>` ("Toggling Edit Mode mid-drag: … the drag completes (commits or rejects) **before** the mode flips … `wasEditMode` ref captured at `onDragStart` … After commit, the _next_ render reads the new `editMode` value and removes the handle") + § Edge cases ("Toggling Edit Mode mid-drag") — covers SPEC AC #1.
Tag: edge.

#### C-m6-012 — success (BlockBrickReorderGroup — `onReorder` dispatches `REORDER_BRICK_IN_BLOCK` with the EXACT `fromIndex`/`toIndex`; `dragListener={false}`)

Target file: `components/BlockBrickReorderGroup.test.tsx` (NEW)
Layer: Component
**GIVEN** `<BlockBrickReorderGroup block={blk-A (bricks: [brk-A1, brk-A2, brk-A3])} onReorderBrickInBlock={mockHandler} />` inside `<EditModeProvider>` with `editMode === true`; the wrapper internally creates a `<Reorder.Group axis="y" values={bricks} onReorder={…}>` with each `<Reorder.Item dragListener={false} dragControls={…}>` wrapping `<BrickChip dragHandle dragControls={…} />`
**WHEN** the Framer `Reorder.Group`'s `onReorder` callback is invoked with a new array order (e.g. `[brk-A2, brk-A3, brk-A1]` — `brk-A1` moved from index 0 to the end)
**THEN** `mockHandler` (`onReorderBrickInBlock`) is called **exactly once** with `(blockId: "blk-A", fromIndex: 0, toIndex: 2)` — the wrapper computes `from`/`to` by single-pass comparison of the old and new arrays (the first differing index is `from`; the new position of the moved brick is `to`); arguments are exact. A mutant computing the indices from the wrong endpoint fails.
**AND** every `<Reorder.Item>` carries `dragListener={false}` (`expect(reorderItem.props.dragListener).toBe(false)`) — the per-handle `dragControls.start(event)` is the only drag origin (AC #3); the chip body cannot initiate a drag.
Proves: plan.md § Components `<BlockBrickReorderGroup>` ("`<Reorder.Item key={brick.id} value={brick} dragListener={false} dragControls={controlsForBrick}>` … `onReorder(newBricks)`: compute `fromIndex` … dispatch `REORDER_BRICK_IN_BLOCK`") — covers SPEC AC #3, AC #8.
Tag: success.

#### C-m6-013 — edge (BlockBrickReorderGroup — single-brick block does NOT mount the Reorder.Group; plain `<ul>` renders)

Target file: `components/BlockBrickReorderGroup.test.tsx` / `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** `<TimelineBlock block={blk-single (bricks: [brk-S1])} />` (a single-brick block) inside `<EditModeProvider>` with `editMode === true`
**WHEN** the expanded brick list is rendered and inspected
**THEN** no `<Reorder.Group>` is mounted (`queryByTestId('block-brick-reorder-group')` → `null`); the plain `<ul>` of `<BrickChip>` renders (the `block.bricks.length > 1` guard skips the Reorder.Group); the chip's `dragHandle` prop is **true** — AC #2 ("every brick row inside a block shows a drag handle") applies even when a block has only one brick, so the handle still renders (amended per EVAL-G5 — SPEC wins over the original test claim).
**AND** the M5 jiggle, the M5 `×`, and the M5 brick log suppression are byte-identical to a multi-brick block — only the `Reorder.Group` wrapping is suppressed; the M5 surface is preserved (the AC #13 no-regression anchor for the brick surface).
Proves: plan.md § Components `<BlockBrickReorderGroup>` ("Renders only when `editMode === true` AND `block.bricks.length > 1` (a single-brick block has nothing to reorder)") + § Edge cases ("Single-brick block") + § Regression surface — covers SPEC AC #8, AC #13.
Tag: edge.

#### C-m6-014 — edge (a11y announce on commit + rejection; score recompute after brick reorder is byte-identical)

Target file: `app/(building)/BuildingClient.reorder.test.tsx` (NEW — m6 cases; sister to `BuildingClient.delete.test.tsx`)
Layer: Component
**GIVEN** `<BuildingClient>` with the standing fixture, Edit Mode unlocked; a single `aria-live="polite"` `aria-atomic="true"` visually-hidden region rendered at `<BuildingClient>`'s shell
**WHEN** (a) a valid block re-time commits (`REORDER_BLOCK` blk-A 08:00→13:00); (b) an overlap-rejected drop is attempted (blk-A 08:00 → 10:30, overlaps blk-B); (c) a brick reorder commits inside `blk-A` (`REORDER_BRICK_IN_BLOCK` `fromIndex: 0, toIndex: 2`)
**THEN** the aria-live region's `textContent` is updated **exactly once per event** to:

- (a) `"Block Morning moved to 13:00"` (the new HH:MM is in the announcement);
- (b) `"Cannot move Morning — overlaps Workout"` (the colliding block named);
- (c) `"Brick <name> moved"` (the brick name; no slot, because brick reorder has no HH:MM target).
  The region is screen-reader-discoverable (an aria-live region polled by SR is enough; no toast or popup is needed).
  **AND** after the brick reorder (c), the HeroRing's `dayPct` and the BlueprintBar's per-block fill render byte-identical values to pre-reorder (scoring is order-independent — anchored by `U-m6-014`); no visual flicker; `useCrossUpEffect` fires **no** celebration (the score did not change).
  Proves: plan.md § Drop-rejection feedback (a11y announce — "`Block <name> moved to <HH:MM>` on a successful block re-time, `Brick <name> moved` on a successful brick reorder, `Cannot move <name> — overlaps <other name>` on a rejected drop") + § Components `<BuildingClient>` ("scoring is array-index-independent … day/block `Pct` are unchanged — confirm with a property-style unit test") + § Edge cases ("Brick reorder inside a block — Confirm no UI flicker on the unchanged HeroRing") — covers SPEC AC #8, AC #12.
  Tag: edge.

### Accessibility (axe via Playwright)

`A-m6-*` IDs run axe-core against the deployed/preview app at the 430px mobile viewport. Per the established M3–M9e sandbox pattern, they are authored as real `test()` blocks but their Playwright run is **deferred to the Vercel preview** (the sandbox cannot launch chromium — see § Sandbox / preview note); they use the `count() > 0` guard pattern. No `.skip`.

#### A-m6-001 — a11y (Edit Mode + drag handles — axe clean; handles keyboard-focusable + SR-labeled; 430px no overflow)

Target file: `tests/e2e/m6.a11y.spec.ts` (NEW)
Layer: A11y
**GIVEN** the app at the Vercel preview, viewport 430px wide, `localStorage` seeded with a v3 payload holding at least one block (with multiple bricks) and one loose brick; Edit Mode toggled Unlocked so blocks jiggle and every block + every in-block brick shows BOTH its `×` AND its drag handle (under `count() > 0` guard)
**WHEN** axe-core runs against the Unlocked Day view
**THEN** axe returns **zero** violations across all rule categories; every block handle and every in-block brick handle is a focusable `<button>` reachable by Tab, with an `aria-label` naming its target (`"Reorder block <name>"` / `"Reorder brick <name>"`); each handle has a ≥44px hit area (`getBoundingClientRect().height >= 44 && width >= 44`, ADR-031); the `GripVertical` glyph at `var(--ink-dim)` meets WCAG AA contrast against the card surface.
**AND** Edit Mode adds only a leading-edge handle per card and per in-block brick — the loose-tray chips do NOT show a handle (SG-m6-04 enforced visually at 430px); the Unlocked Day view renders within the 430px column with **no horizontal overflow** (`scrollWidth <= clientWidth`); the brick row (handle + body + `×`) fits without overlap at the smallest viewport.
Proves: plan.md § Accessibility ("every handle is a real `<button type="button">` — focusable, ≥44px, with an `aria-label`"; "430px (AC #12) — the new handle adds one ≥44px touch target … no overflow at 430px"; contrast at the M0 set) + § Decisions (ADR-008, ADR-031) — covers SPEC AC #12.
Tag: a11y.

#### A-m6-002 — a11y (Reduced motion — axe clean; handles still labeled; aria-live announce still fires)

Target file: `tests/e2e/m6.a11y.spec.ts`
Layer: A11y
**GIVEN** the app at the preview, 430px viewport, the browser emulating `prefers-reduced-motion: reduce`, Edit Mode Unlocked (under `count() > 0` guard)
**WHEN** axe-core runs against the Unlocked Day view; the page is exercised by keyboard (Tab to a handle, query its accessible name)
**THEN** axe returns **zero** violations; with reduced motion the lift (`whileDrag` scale + shadow) is suppressed and any commit settle is instant — yet every handle, every `×`, and the pencil are still present, focusable, and labeled (the handle is a non-motion affordance — no a11y regression under reduced motion).
**AND** a programmatic commit (`page.evaluate` calls the dispatch through a test seam, or the keyboard alternative is exercised if/when implemented — currently deferred per SG-m6-06) writes the same polite `aria-live` announcement (`"Block <name> moved to <HH:MM>"` / `"Brick <name> moved"` / `"Cannot move <name> — overlaps <other name>"`); the announcement is observable in the DOM under `[aria-live="polite"]`. Reduced motion never silences the announce — only the visual motion is suppressed (AC #11/AC #12).
Proves: plan.md § Accessibility ("Reduced motion: all lift / flow / settle suppressed; haptics + announce still fire. The reorder is **never** a motion-only affordance.") + § Edge cases ("Reduced motion") — covers SPEC AC #11, AC #12.
Tag: a11y.

### E2E (Playwright) — deferred to preview

Per ADR-018, each E2E case **clears `localStorage` in a `test.beforeEach`** so cases are independent. Authored as real `test()` blocks with `count() > 0` sandbox guards — the sandbox cannot launch chromium (see § Sandbox / preview note), so these execute against the Vercel preview only. The four scenarios are exactly the ones the plan/spec name (AC #13): a block re-time, an overlap-rejected drop, a brick array reorder, and an Edit-Mode/Locked toggle around a drag. Drag is simulated via Playwright's `page.mouse.down/move/up` pinned to the handle's `boundingBox().center`, with `force: true` where necessary.

#### E-m6-001 — success (block re-time — drag → snap → persist; the new times survive a reload)

Target file: `tests/e2e/m6.spec.ts` (NEW)
Layer: E2E
**GIVEN** a browser with `localStorage` cleared (`beforeEach`), then — via `page.evaluate` — `dharma:v1` seeded with a v3 payload holding `blk-A` at `"08:00"`–`"09:00"` (recurring) and `blk-B` at `"14:00"`–`"15:00"` (recurring); the app loaded fresh at `/` in the Locked Day view; the top-bar pencil tapped to Unlock (under `count() > 0` guards)
**WHEN** `blk-A`'s drag handle is pressed (`page.mouse.down` on its bounding box center), dragged downward to a Y offset corresponding to `"11:00"` (a valid, non-overlapping slot), and released (`page.mouse.up`); the page is reloaded
**THEN** at drop: `blk-A` renders at the new `"11:00"`–`"12:00"` slot on the timeline; the BlueprintBar / HeroRing recompute; the snapped slot is on the 30-min grid (SG-m6-07 — the drop lands on an `HH:00` or `HH:30` boundary); no console error.
**AND** after the reload `blk-A` is **still** at `"11:00"`–`"12:00"` — the times survived the round-trip through `localStorage` (`dharma:v1` persists the new `start`/`end` on the template, no `schemaVersion` bump per AC #10); the recurring block resolves to the new times today and on a simulated `currentDate` advance to tomorrow (all-future semantics, SG-m6-02).
Proves: plan.md § Reducer arms (`REORDER_BLOCK` valid drop) + § Components `<DraggableTimelineBlock>` (commit logic) + § File structure (no `schemaVersion` bump; persistence via the existing pipeline) — covers SPEC AC #5, AC #7, AC #10, AC #13 (block-re-time E2E scenario).
Tag: success.

#### E-m6-002 — success (overlap-rejected drop — snap-back; no persistence; medium haptic + polite announce)

Target file: `tests/e2e/m6.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded via `page.evaluate` with a v3 payload holding `blk-A` at `"08:00"`–`"09:00"` and `blk-B` at `"10:00"`–`"11:00"`; the app at `/`, Edit Mode Unlocked
**WHEN** `blk-A`'s drag handle is pressed, dragged downward to a Y offset that snaps to `"10:30"` (an overlap with `blk-B`'s `"10:00"`–`"11:00"`), and released; the page is reloaded (under `count() > 0` guards)
**THEN** at drop: `blk-A` snaps back to its origin `"08:00"`–`"09:00"` (the card animates back to its starting `top`); the polite `aria-live` region emits `"Cannot move Morning — overlaps Workout"` (the colliding block named); no state is written (the reducer returned `state` unchanged — `U-m6-002`); medium haptic fires (`navigator.vibrate` shim assertion if available, otherwise this AC is anchored to `C-m6-008`'s unit-level haptic assertion).
**AND** after the reload `blk-A` is **still** at `"08:00"`–`"09:00"` and `blk-B` is still at `"10:00"`–`"11:00"` — the rejected drop did NOT persist; the existing `dharma:v1` payload is byte-identical pre/post (a `localStorage` read confirms no write occurred for the rejected drop).
Proves: plan.md § Reducer arms (`REORDER_BLOCK` — "If `hits.length > 0` → return `state` unchanged") + § Drop-rejection feedback (a11y announce) + § Drag-in-flight motion (snap-back) — covers SPEC AC #6, AC #13 (overlap-rejected-drop E2E scenario).
Tag: success.

#### E-m6-003 — success (brick array reorder — splice persists; scores unchanged across reload)

Target file: `tests/e2e/m6.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded via `page.evaluate` with a v3 payload holding `blk-A` with `bricks: [brk-A1 (tick, done: true), brk-A2 (tick, done: false), brk-A3 (tick, done: true)]`; the app at `/`, Edit Mode Unlocked, `blk-A` expanded
**WHEN** `brk-A1`'s drag handle is pressed (`page.mouse.down`), dragged to a Y position below `brk-A3` (so the new array order is `[brk-A2, brk-A3, brk-A1]`), and released; the page is reloaded (under `count() > 0` guards)
**THEN** the brick list inside `blk-A` re-renders in the new order `[brk-A2, brk-A3, brk-A1]`; each brick's `done` state is preserved byte-identical; the polite `aria-live` region emits `"Brick <brk-A1.name> moved"`.
**AND** after the reload the brick order is **still** `[brk-A2, brk-A3, brk-A1]` — the splice persisted; the `blockPct(blk-A)` and `dayPct(state)` values rendered in the BlueprintBar / HeroRing are **byte-identical** to the pre-reorder values (scoring is order-independent — anchored by `U-m6-014` / `C-m6-014`); no celebration fires.
Proves: plan.md § Reducer arms (`REORDER_BRICK_IN_BLOCK` splice) + § Components `<BlockBrickReorderGroup>` (onReorder → dispatch) + § Components `<BuildingClient>` (scores recompute order-independently) — covers SPEC AC #8, AC #9, AC #10, AC #13 (brick-reorder E2E scenario).
Tag: success.

#### E-m6-004 — edge (Edit-Mode/Locked toggle around a drag — Locked → no drag; Unlocked drag commits; back to Locked → no handle, behavior byte-identical to M5)

Target file: `tests/e2e/m6.spec.ts`
Layer: E2E
**GIVEN** `localStorage` cleared, then `dharma:v1` seeded with a v3 payload holding `blk-A` (`"08:00"`–`"09:00"`); the app at `/` (Locked, the cold-boot default — Edit Mode is never persisted per SG-m5-04)
**WHEN** (a) in Locked mode, the block card is inspected and tapped on its body; (b) the pencil is tapped Unlock, `blk-A`'s drag handle is dragged to `"13:00"` and released; (c) the pencil is tapped Lock again and the page is inspected
**THEN** in (a) **no** drag handle is visible on `blk-A` (`page.locator('[aria-label*="Reorder block"]').count()` → `0`); tapping the card body expands it as in M4/M5 (no drag, no log+drag double-fire). In (b) the handle appears, the drag commits, and `blk-A` renders at `"13:00"`–`"14:00"` (the M5 `×` is also visible — both Edit-Mode affordances coexist).
**AND** in (c) **no** drag handle is visible again (the handle render is strictly `editMode === true` gated); the new `"13:00"` time persists across the Locked-mode re-render (the commit happened in (b); locking the mode does not undo the commit); after a reload, `blk-A` is still at `"13:00"` and the page boots Locked (Edit Mode never persisted).
Proves: plan.md § Components `<TimelineBlock>` ("In Locked mode the handle is absent and behavior is byte-identical to M5") + § Edge cases ("Locked mode") + § Components `<DraggableTimelineBlock>` (commit) + § Regression surface (M5 byte-identical in Locked) — covers SPEC AC #1, AC #2, AC #13 (Edit-Mode/Locked-toggle E2E scenario).
Tag: edge.

### Sandbox / preview note

Per the established M3–M9e + M5 pattern: this sandbox cannot launch chromium (binary missing — confirmed by prior milestones' EVALUATOR reports and `status.md`). The 2 `A-m6-*` and 4 `E-m6-*` IDs above are authored as full GIVEN/WHEN/THEN specs in real `test()` blocks but execute against the Vercel preview only (CI / manual). Inside the sandbox they use the `if ((await x.count()) > 0)` guard pattern from `tests/e2e/m9e.spec.ts` / `tests/e2e/m9d.spec.ts` / `tests/e2e/m5.spec.ts`, which yields a vacuous PASS when the queried element is absent (known vacuous-pass debt — flagged in `status.md`). `E-m6-001`/`E-m6-002`/`E-m6-003` partly mitigate it by hand-building the `dharma:v1` v3 payload via `page.evaluate` (a deterministic seed that does not depend on the add-block/add-brick UI flow). M6 introduces no general deterministic seeding helper (out of scope per ADR-022). The 14 unit + 14 component IDs (`U-m6-*`, `C-m6-*`) run fully in the sandbox under Vitest and are the binding correctness proof for the two reducer arms, the `snapToSlot`/`shiftEnd` helpers, the `<DraggableTimelineBlock>` wrapper, the `<BlockBrickReorderGroup>`, and the handle additions; the `A-`/`E-` IDs are net-additive preview coverage.

### Retired / amended test IDs

**No `U-/C-/E-/A-` ID is retired.** M6 adds 34 new `m6` IDs (14 U + 14 C + 2 A + 4 E) and removes none.

**Amended — sanctioned, expected M6 collateral.** The M6 plan § Regression surface explicitly flags these and asks VERIFIER to ratify them. They are surfaced here, not silently resolved by the BUILDER. Each amendment is mechanical and assertion-preserving for everything not about the M6 change:

- **`components/TimelineBlock.test.tsx`** — any M5 test that asserts the **complete set of edit-mode children** on the block card (e.g. "only the `×` renders in Edit Mode" / "the card's Edit-Mode header is exactly the `×`") becomes stale because the handle now also renders alongside the `×`. The M6 dispatch **amends** that assertion to "the `×` _and_ the drag handle" or to query the `×` specifically with `getByRole("button", { name: /delete block/i })` (which is unique). All other `TimelineBlock` assertions — Locked-mode behavior, jiggle, the `×`, the SR labels — are preserved verbatim; the new handle / drag / lift / commit cases (`C-m6-001..002`, `C-m6-005`, `C-m6-006..011`) are **additive**, not amendments.
- **`components/BrickChip.test.tsx`** — symmetric: any M5 test asserting the "only `×`" set of edit-mode affordances inside a block must be amended to also expect a handle (when `dragHandle === true`). M5 tests that exercise the tray-chip case (`dragHandle === false`, the default) remain green **unchanged** (the tray render does not gain a handle — SG-m6-04). The new in-block handle / drag-origin / dispatch cases (`C-m6-003..005`, `C-m6-012`) are additive.
- **`lib/data.test.ts`** — additive new cases for the two reducer arms (`U-m6-001..009`, `U-m6-013..014`); existing arms unchanged. The `assertNever` exhaustiveness check now covers two more variants — any M1–M5 test that constructs a full `Action` union via narrowing (a TS-level exhaustive switch in a test helper, if any) must be updated to include the two new types. Otherwise the file is byte-additive.
- **`lib/persist.test.ts`** — **unchanged.** No schema bump (AC #10). The existing `SCHEMA_VERSION === 3` assertions still hold; the existing v3-payload round-trip cases still pass. VERIFIER ratifies that no persist test needs amendment.
- **`app/(building)/BuildingClient.delete.test.tsx`** — **unchanged.** The delete flow is unaffected by reorder; `pendingDelete` and the modal continue to work identically; M6's drag is suppressed while the modal is open (`C-m6-010`), but the modal itself does not change.
- **`app/(building)/BuildingClient.test.tsx`** — additive new reorder-dispatch wiring cases live in the **new** `BuildingClient.reorder.test.tsx` (`C-m6-014`); existing `BuildingClient` cases unchanged.
- **No other M1–M5 / M8–M9e test** asserts the absence of a drag handle, the `Action` union's size, or the contents of `block.bricks` in a way that breaks. Score-recompute cases for delete (`C-m5-019`) are unaffected — they exercise `DELETE_*` actions, not `REORDER_*`.

**VERIFIER: please ratify the `TimelineBlock` / `BrickChip` Edit-Mode-affordance-set amendments** as expected, sanctioned M6 collateral — exactly as M5's `TopBar` `aria-label` and `defaultState`/`PersistedState` amendments were ratified. They are surfaced here, not silent; each is assertion-preserving for every sub-assertion not about the M6 change.

### Spec gaps surfaced for VERIFIER

The plan resolves **all eight** of its named spec gaps in-plan (SG-m6-01..08 — see plan.md § Resolutions to the 8 Open Spec Gaps; six RESOLVED verbatim per the spec recommendation, one mechanism choice RESOLVED per the spec's invitation (SG-m6-05), one boundary RESOLVED per recommendation with a SLOT_MIN floor (SG-m6-07/SG-m6-08)) and the TESTS phase covers the plan faithfully. Each SG resolution is anchored to at least one test ID:

| SG       | Resolution (per plan.md § Resolutions)                                                     | Anchoring test ID(s)        |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| SG-m6-01 | Visible `GripVertical` handle; no long-press; handle is the only drag origin               | `C-m6-001`, `C-m6-005`      |
| SG-m6-02 | Re-time the template (all-future semantics); no per-day time override; no schema bump      | `U-m6-003`, `E-m6-001`      |
| SG-m6-03 | Cross-container brick moves deferred; `Reorder.Group` scoped to a single block             | `C-m6-012`, `E-m6-003`      |
| SG-m6-04 | No loose-tray reorder; no handle on tray chips; no `Reorder.Group` around tray             | `C-m6-004`, `A-m6-001`      |
| SG-m6-05 | `motion.div` `drag="y"` for blocks; `Reorder.Group` for bricks; shared M0 tokens           | `C-m6-006..008`, `C-m6-012` |
| SG-m6-06 | Keyboard alternative deferred; labeled focusable handle as the a11y floor                  | `A-m6-001`, `A-m6-002`      |
| SG-m6-07 | 30-min slot grid; every drop lands on `HH:00`/`HH:30`                                      | `U-m6-010`, `E-m6-001`      |
| SG-m6-08 | Clamp `[00:00, 23:30]` start, `[00:00, 24:00]` end; out-of-bounds is clamped, not rejected | `U-m6-010`, `U-m6-011`      |

No ADR is reversed: **ADR-006** (half-open `[start, end)` intervals) governs `U-m6-002`'s touching-boundary case; **ADR-008** (always-visible affordances, no swipe-to-discover) governs the handle's on-mount visibility (`C-m6-001`, `C-m6-003`, `A-m6-001`); **ADR-013** (one feature per dispatch) governs m6 as one feature group; **ADR-018** (overrides keyed map, not structural mutation) — M6 is structural and gated by Edit Mode; no override map is added; **ADR-020** (no clock constants) — the reducer/snap helpers read no clock (`U-m6-010`, `U-m6-012`); **ADR-031** (≥44px touch targets) — measured by `C-m6-001`, `C-m6-003`, `A-m6-001`; **ADR-043** (`assertNever` exhaustiveness) — covered by `U-m6-013`; **ADR-044/ADR-045** (`schemaVersion` discipline; `history` read-only) — M6 introduces **no schema bump** (covered by the unchanged `lib/persist.test.ts`) and never writes `history` (`U-m6-003`); **ADR-046** (period-aggregate helpers are pure) — `U-m6-012` runs the snap helpers under multiple TZs; **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only) — orthogonal to reorder; a block keyed in `deletions["today:blk-id"]` does not render today and is therefore not draggable today (no test required — the absence is structural).

The following non-blocking item is surfaced for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **Overlap probe location — UI-side vs reducer-only (plan § Open questions for VERIFIER).** The plan baseline has `<DraggableTimelineBlock>` dispatch and then read back the post-dispatch `block.start` from props — if `block.start === newStart` the write succeeded; if `block.start === oldStart` the reducer rejected (snap-back + medium haptic). `C-m6-008` is written against this baseline (simulating the unchanged `block.start` after dispatch). If VERIFIER prefers the UI-duplicates-the-probe alternative (so the snap-back can start before the dispatch round-trip), `C-m6-008` is amendable — but the reducer arm assertion (`U-m6-002`) is identical either way; both architectures are testable. **No ADR-binding decision; VERIFIER picks freely.**

### AC → test-ID coverage map (all 13 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                                                                                          | Test ID(s)                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | In Edit Mode every block card shows a drag handle (`grip-vertical`, ≥44px) alongside the M5 `×`; in Locked mode no handle is shown and no drag is possible                                  | `C-m6-001`, `C-m6-002`, `C-m6-011`, `A-m6-001`, `E-m6-004`                                                                                      |
| #2  | In Edit Mode every brick row inside a block shows a drag handle (≥44px) alongside the M5 `×`; loose-tray bricks show no handle (out of scope per SG-m6-04)                                  | `C-m6-003`, `C-m6-004`, `A-m6-001`, `E-m6-004`                                                                                                  |
| #3  | The handle is the only drag origin — tapping/pressing the card or chip body in Edit Mode is inert (no drag, no log — M5 SG-m5-05 preserved)                                                 | `C-m6-005`, `C-m6-012`                                                                                                                          |
| #4  | Grabbing a block's handle lifts the card (scale 1.02, shadow; suppressed under reduced motion), siblings smoothly flow as the pointer moves                                                 | `C-m6-006`, `C-m6-007`                                                                                                                          |
| #5  | Releasing on a valid slot writes new `start`/`end` via `REORDER_BLOCK`; the new times persist immediately; the card settles with a spring (instant under reduced motion)                    | `U-m6-001`, `U-m6-004`, `U-m6-005`, `U-m6-010`, `U-m6-011`, `U-m6-013`, `C-m6-006`, `C-m6-009`, `E-m6-001`                                      |
| #6  | Releasing on an overlapping slot is rejected: no state write, snap-back, medium haptic, polite a11y announcement                                                                            | `U-m6-002`, `C-m6-008`, `C-m6-010`, `C-m6-014`, `E-m6-002`                                                                                      |
| #7  | Re-timing a recurring block changes the template — today and every future day use the new times; past `history` is unchanged (ADR-045)                                                      | `U-m6-001`, `U-m6-003`, `E-m6-001`                                                                                                              |
| #8  | Grabbing a brick's handle and releasing inside the same block writes a `REORDER_BRICK_IN_BLOCK` action; new order persists; day/block scores unchanged                                      | `U-m6-006`, `U-m6-007`, `U-m6-008`, `U-m6-013`, `U-m6-014`, `C-m6-012`, `C-m6-013`, `C-m6-014`, `E-m6-003`                                      |
| #9  | A brick with `hasDuration` reordered inside its block keeps its own `start`/`end`; overlap engine is not invoked; time-window badge unchanged                                               | `U-m6-009`, `E-m6-003`                                                                                                                          |
| #10 | M6 introduces no new persisted fields and no `schemaVersion` bump; the existing `dharma:v3` payload is sufficient; every reorder survives a reload                                          | `U-m6-001`, `U-m6-006`, `E-m6-001`, `E-m6-002`, `E-m6-003` (+ unchanged `lib/persist.test.ts` — see § Retired / amended test IDs)               |
| #11 | The drag honors reduced motion (no lift / no in-flight flow / instant snap on commit); haptics fire on lift, successful drop, and rejected drop only                                        | `C-m6-007`, `C-m6-008`, `C-m6-009`, `A-m6-002`                                                                                                  |
| #12 | Mobile 430px renders both handles without overflow and without colliding with the M5 `×`; axe clean; handles are screen-reader-labeled; a successful reorder emits a polite announcement    | `C-m6-014`, `A-m6-001`, `A-m6-002`                                                                                                              |
| #13 | No regression to M1–M9e behavior; quality gates clean (`tsc`, ESLint 0, full Vitest green, `test:tz` green); E2E covers block re-time / overlap-rejected / brick reorder / Edit-Mode toggle | `U-m6-012`, `C-m6-002`, `C-m6-013`, `E-m6-001`, `E-m6-002`, `E-m6-003`, `E-m6-004` + **gate (`npm run eval`)** + § Retired / amended amendments |

**Gate-verified portion:** AC #13's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M5/M8/M9a/M9b/M9c/M9d/M9e precedent. AC #13's no-regression half is anchored by the sanctioned amendments in § Retired / amended test IDs (the only stale-test surface — the M5 `TimelineBlock`/`BrickChip` Edit-Mode-affordance-set assertions) plus `C-m6-002` and `C-m6-013` (Locked-mode and single-brick-block byte-identical to M5) plus `U-m6-012` (`snapToSlot`/`shiftEnd` TZ-independence under `test:tz`). All other 12 ACs map to at least one bespoke `m6` test ID; every `m6` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** Locked mode — no handles → `C-m6-002`, `E-m6-004`; reduced motion → `C-m6-007`, `A-m6-002`; overlap rejected → `U-m6-002`, `C-m6-008`, `E-m6-002`; drag across the now-line into a past slot → covered structurally by `U-m6-001`/`E-m6-001` (no special-case in the reducer; any valid non-overlapping `start` works, including past slots); block dropped onto its own current slot → `C-m6-009`; block with `end: undefined` (open-ended) → `U-m6-004`, `U-m6-011`; brick reorder inside a block (scoring unchanged) → `U-m6-014`, `C-m6-014`, `E-m6-003`; brick with `hasDuration` → `U-m6-009`, `E-m6-003`; drag cancel mid-flight → covered by `C-m6-009`'s drop-on-same-slot path (a cancel that lands inside the timeline column is a no-op; out-of-column drags are clamped by `snapToSlot` per `U-m6-010`); toggling Edit Mode mid-drag → `C-m6-011`; delete modal open during a drag → `C-m6-010`; dragging a recurring block → `U-m6-003`, `E-m6-001`; drag-handle 44px clearance → `C-m6-001`, `C-m6-003`, `A-m6-001`; `saveState` quota-exceeded during a drag commit → covered by the unchanged M8 quota-exceeded path (no new error path for M6, per plan § Edge cases); empty timeline drop above midnight / below 24:00 → `U-m6-010`, `U-m6-011`; single-brick block → `C-m6-013`.

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
