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
