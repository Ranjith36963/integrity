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
