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
