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
