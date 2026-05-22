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
