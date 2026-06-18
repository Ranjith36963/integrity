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
