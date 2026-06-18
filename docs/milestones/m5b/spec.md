## Milestone 5b — Day-view `appliesOn` wiring (closes ADR-047)

> **Pillars:** § 0.9 (data model — every `Block` carries a `Recurrence`); ADR-018 (`deletions` is a per-day override map, not a structural mutation); ADR-019 (`Recurrence` union locked by M4e); ADR-045 (`history` is read-only — past days are never re-filtered, only newly rendered today is); **ADR-047** (M5 explicitly deferred `appliesOn` Day-view wiring to "a dedicated spec entry" — this is that entry); M9a's `appliesOn(recurrence, date)` resolver (consumed unchanged); M5's `currentDayBlocks(state)` helper (extended, not replaced).

### Intent

Every `Block` has carried a `recurrence: Recurrence` field since M2, but the live Day view has **never** consulted it. M9a shipped the pure `appliesOn(recurrence, date)` resolver and its TZ-safe tests; M5 introduced `currentDayBlocks(state)` as the sole join site for Day-render block filtering but resolved `deletions` only — explicitly leaving the `appliesOn` integration to a follow-up (ADR-047). The bug today: a block whose `recurrence` is `{ kind: "every-weekday" }` renders on Saturday; a `{ kind: "just-today", date: "2026-05-18" }` block renders forever. The Day view is silently wrong about what the user actually scheduled.

M5b closes that gap. `currentDayBlocks(state)` is extended to filter `state.blocks` by **both** (a) `appliesOn(block.recurrence, state.currentDate) === true` **and** (b) the absence of a `deletions` key for `${state.currentDate}:${block.id}`. The two filters compose: `appliesOn` decides "does this block belong on this day per its recurrence?"; `deletions` is the per-day "just today" override on top. Both must be satisfied for a block to render.

M5b is a **render-only correctness fix.** No new storage. No new UI. No schema change. No new ADR (ADR-047 already records the deferral).

**What this is NOT:** wiring `appliesOn` for nested bricks inside a block (a nested brick's recurrence is M9b's seeding concern, not M5b's render concern); wiring `appliesOn` for timed loose bricks on the timeline (a separate spec entry if it turns out to be needed; M5b's scope is the block layer only, matching ADR-047's exact wording); adding a new `Recurrence` kind or modifying the union; changing what `deletions` keys mean; touching past-day rendering (M9a/c/d/e already consult `appliesOn` correctly inside their period scoring — those paths are unchanged); changing the rollover/archive behavior (M9b); changing the score math (`dayScore` continues to read the same `currentDayBlocks` output, so the day's denominator now correctly excludes off-day blocks — see AC #7).

### Inputs

- `AppState` as it stands post-M9e (no schema change): `blocks: Block[]`, `currentDate: string`, `deletions: Record<string, true>`.
- M9a's `appliesOn(recurrence: Recurrence, date: string): boolean` from `lib/appliesOn.ts` — imported and called, never modified.

### Outputs

- `lib/currentDayBlocks.ts` updated so `currentDayBlocks(state)` composes the two filters: `appliesOn(b.recurrence, state.currentDate) && !state.deletions[\`${state.currentDate}:${b.id}\`]`.
- Every Day-view consumer that currently reads `state.blocks` directly is migrated to read the filtered `visibleBlocks = currentDayBlocks(state)`. As of today that is `BuildingClient.tsx`'s `<BlueprintBar blocks={state.blocks} … />` (two call sites at the body-level Timeline pass-through). The body-level `<Timeline>` already reads `visibleBlocks`; M5b makes the BlueprintBar match.
- No new files. No new components. No new actions. `dayScore` reads the same `currentDayBlocks` it always did — so the denominator now correctly excludes off-day blocks.

### Edge cases

- **`just-today` block on its own date** → renders. **On any other date** → does not render. This is the same behavior M9a tests guarantee at the resolver level; M5b is just wiring.
- **`every-day` block** → renders on every `currentDate`, identical to today's behavior (regression-free).
- **`every-weekday` block on Sat/Sun** → does not render. On Mon–Fri → renders.
- **`custom-range` block, `currentDate` inside the range with a matching weekday** → renders. Outside the range, or in-range but weekday not in `weekdays` → does not render.
- **`custom-range` block with empty `weekdays`** → renders on no date (M9a AC #7). The Day view shows no such block.
- **Block in `deletions` for `currentDate` but `appliesOn` returns `true`** → does not render (deletions wins on top — same as today).
- **Block NOT in `deletions` but `appliesOn` returns `false`** → does not render (the new case M5b adds — the M5 behavior would have rendered it).
- **Block in `deletions` AND `appliesOn` returns `false`** → does not render (either filter alone is sufficient to suppress; the order they're applied is irrelevant).
- **TZ safety** → inherited from M9a unchanged: the same ISO `currentDate` yields the same verdict regardless of the runtime timezone (`appliesOn` parses local, not UTC).
- **`dayScore` denominator** → automatically corrects: `dayScore` reads `currentDayBlocks`, so an off-day block no longer counts toward today's total. A day on which every recurring block is off-recurrence renders empty and scores 0/0 = 0 (existing M3 zero-denominator rule).
- **BlueprintBar** → the segment count now matches the rendered block count. Previously the bar could show segments for off-day blocks the timeline didn't render.
- **History reads (Castle / Kingdom / Empire)** → unchanged. M9c/d/e read from `state.history[date].blocks` and apply their own `appliesOn` checks; M5b touches only the in-progress day's Day view.
- **Empty `blocks` array** → returns `[]` (regression-free).

### Acceptance criteria

**Resolver wiring**

1. `lib/currentDayBlocks.ts` exports `currentDayBlocks(state: AppState): Block[]` returning the subset of `state.blocks` for which **both** `appliesOn(b.recurrence, state.currentDate) === true` **and** `state.deletions[\`${state.currentDate}:${b.id}\`]` is falsy.
2. The function imports `appliesOn` from `lib/appliesOn.ts`; the resolver is consumed, not re-implemented.
3. `currentDayBlocks` remains pure: no clock reads, no `localStorage`, no React, no mutation of `state` or any block.
4. Block ordering is preserved — surviving blocks appear in `state.blocks` order (same as the M5 contract).

**Day-view consumer migration**

5. Every Day-view consumer in `app/(building)/BuildingClient.tsx` that previously read `state.blocks` for **render** is migrated to read `visibleBlocks = currentDayBlocks(state)`. Specifically: the `<BlueprintBar blocks={…} />` prop is fed from `visibleBlocks` (the two body-level pass-throughs at the timeline render). State-management callsites that look up a block by id from `state.blocks` (the delete/reorder/add handlers) are NOT migrated — they intentionally need the full block list because a user can act on a block that exists in state even if it doesn't apply today.
6. No other component touches `state.blocks` directly for render. (Add-flow code paths, edit-mode actions, and reorder still read `state.blocks` — those are state-management, not rendering.)

**Score correctness**

7. `dayScore` (per `lib/dharma.ts`) computes over the same `currentDayBlocks(state)` output the Day view renders, so the visible day's score equals the rendered blocks' aggregate; an off-day block never inflates or deflates today's number.

**Persistence & rollover (regression-free)**

8. M8 persistence is unchanged — `state.blocks` continues to round-trip in full; recurrence stays on the persisted shape; no `schemaVersion` bump.
9. M9b rollover is unchanged — archived past days in `state.history` are not re-filtered by M5b's wiring.
10. M9c/d/e history views are unchanged — they continue to consult `appliesOn` inside their own period-scoring paths.

**Quality**

11. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: (a) `currentDayBlocks` includes a block where `appliesOn` is true and `deletions` is absent; (b) excludes a block where `appliesOn` is false; (c) excludes a block where `deletions` is set; (d) excludes a block where both conditions suppress; (e) the existing M5 `deletions`-only test continues to pass; (f) a TZ-fixture test confirms M9a's TZ safety is preserved end-to-end.
12. E2E (Playwright, deferred-to-preview): a block created with `{ kind: "every-weekday" }` renders on a fixture Mon–Fri date and not on a fixture Sat/Sun date; the BlueprintBar segment count matches the rendered block count; `dayScore` on an "all off-recurrence" day reads 0.

**Spec coverage**

13. No regression to M1–M9e behavior; ADR-047 is closed by status.md (M5b ships; status.md entry retires the "deferred gap" line).

### Open spec gaps (resolve at VERIFY)

- **SG-m5b-01 — Should the loose-bricks tray also consult `appliesOn`?** Loose bricks with `hasDuration: true` carry a `recurrence`. Today the tray shows every non-timed loose brick regardless of recurrence (non-timed bricks have no `recurrence` field). M5b's scope per ADR-047 is the block layer only. Recommendation: keep tray behavior unchanged — non-timed bricks have no recurrence so the question doesn't arise; timed loose bricks don't appear in the tray anyway (M4e filters them onto the timeline). VERIFIER confirms the tray reads `trayBricks` from a selector that excludes timed bricks (it does — `selectTrayBricks` in M4e).
- **SG-m5b-02 — Should timed loose bricks on the timeline consult `appliesOn`?** Timed loose bricks render on the timeline (M4e). They have a `recurrence`. Today they render every day regardless. Recommendation: out of scope for M5b — ADR-047 names the **block** layer; timed-loose-brick recurrence is a parallel concern. If we want to close it, that's a separate spec entry (slug `m5c`?). PLANNER confirms M5b does not touch `selectTimelineItems` or the timed-loose-brick path; VERIFIER checks the diff scope.
- **SG-m5b-03 — Helper function naming and signature.** The existing helper is `currentDayBlocks(state: AppState): Block[]`. M5b extends it in-place without renaming. Alternative: introduce a second helper (e.g., `applicableBlocks`) and compose. Recommendation: extend in place — same name, same signature, same call sites; the function's docstring updates to reflect the two-filter composition and ADR-047 closure. PLANNER confirms in-place extension; VERIFIER checks no orphan helpers are introduced.
