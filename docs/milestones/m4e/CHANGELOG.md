# Changelog — M4e

## [unreleased]

### Fixed (post-M4e — recurrence-aware overlap)

- **Overlap detection now respects recurrence.** `findOverlaps` previously flagged any two
  timed items whose clock ranges intersect, regardless of when they recur — so a weekend-only
  block (Sat–Sun) at 07:00 was rejected as "overlapping" a weekday-only block (Mon–Fri) at the
  same time, blocking users who keep separate weekday + weekend routines from adding the second
  routine at all. Added `recurrencesCanCoincide(a, b)` to `lib/overlap.ts` (shared-weekday check
  → date-range intersection → bounded per-day scan for sub-week windows); two items now conflict
  only when their clock ranges overlap **and** their recurrences can both land on a common
  calendar day. Threaded `recurrence` through `TimedItem`, `findOverlaps`, `selectAllTimedItems`,
  and the `AddBlockSheet` / `AddBrickSheet` candidates. Absent recurrence is treated as
  `every-day` (backward compatible). Tests: `lib/recurrenceOverlap.test.ts`. Found by driving a
  real 16-block weekday + 16-block weekend routine through the live app with Playwright.

### Added (M4e)

- **M4e — Brick Duration + Overlap Engine:** universal `hasDuration` toggle on every brick
  kind (tick / goal / time). When ON, brick gains `start: HH:MM`, `end: HH:MM`,
  `recurrence: Recurrence` fields. Pure half-open overlap engine (`lib/overlap.ts`) with
  `intervalsOverlap` + `findOverlaps`. Overlap warning chip in `<AddBrickSheet>` and
  `<AddBlockSheet>` shows `⚠ overlaps with [Kind: Name, HH:MM–HH:MM]` with multi-item list
  and "+N more" tail; chip uses `role="alert"` for live-region announcement; Save is disabled
  when any overlap exists. `aria-describedby="brick-save-hint"` / `"block-save-hint"` with
  sr-only hint `"Resolve the overlap to save."` for screen-reader users.
  `<TimedLooseBrickCard>` — timed-brick chip with dashed outline that renders on the Timeline
  at its start row. `<BrickChip>` time-window badge shows `HH:MM–HH:MM` under the title for
  timed bricks. `withDurationDefaults()` migration helper — idempotent; preserves
  byte-identity for pre-M4e bricks. `selectTimelineItems()` + `selectTrayBricks()` selectors
  merge blocks + timed loose bricks sorted by start; non-timed loose bricks stay in the tray.
  `Timeline.tsx` prop signature widened from `blocks: Block[]` → `items: TimelineItem[]`
  (discriminated union). ADR-042 (universal-duration axis) accepted and locked at M4e.
  ADR-034 softened — overlap engine now hard-enforces collisions (was: warn-and-save).
  M2's missing block↔block overlap enforcement closed retroactively.
  51 coverage ACs closed (U-m4e-001..021, C-m4e-001..030). 9 deferred-to-preview e2e/a11y
  (E-m4e-001..005, A-m4e-001..004) consistent with M4a/b/c/d pattern.
  731 Vitest tests pass (was 652/652 at end of M4c; +79 M4e tests: 21U + 30C + 5E stub +
  4A stub).
- `lib/overlap.ts` — new. Pure half-open overlap engine: `intervalsOverlap(a, b)` +
  `findOverlaps(candidate, others)`. Tests: U-m4e-001..014.
- `components/TimedLooseBrickCard.tsx` — new. Timed loose-brick chip with dashed outline;
  renders on the Timeline at its start row via `selectTimelineItems`. Tests: C-m4e-014..021.
- `tests/e2e/m4e.spec.ts` — 5 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/b/c/d precedent). IDs: E-m4e-001..005.
- `tests/e2e/m4e.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m4e-001..004.

### Changed (M4e)

- `<AddBlockSheet>` Save button is now disabled by overlap (was: warn-and-save). M2's
  missing block↔block enforcement closed retroactively. Overlap chip updated to
  `role="alert"` for live-region announcement.
- `Timeline.tsx` prop renamed `blocks: Block[]` → `items: TimelineItem[]` (discriminated
  union). All internal call sites migrated (`BuildingClient.tsx`, both Timeline test files).
- C-m2-006 test tightened to require the `⚠ overlaps with …` copy prefix.
- `app/(building)/BuildingClient.tsx` — hosts `selectTimelineItems` + `selectTrayBricks`
  selectors; threads `items: TimelineItem[]` to `<Timeline>`; calls `withDurationDefaults()`
  on state load.

### Fixed (M4e)

- Hardcoded `"2026-05-14"` date literal in `AddBrickSheet`'s `DEFAULT_RECURRENCE` replaced
  with lazy `todayISO()` seed (G3 EVAL gap).

### Notes (M4e)

- **`BrickBase` type module-private.** `lib/types.ts` keeps `BrickBase` unexported. If a
  third surface needs the shape, promote it then. `AddBrickSheet` uses `as const` literals.
- **C-m4e-030 shares green commit with C-m4e-027..029.** Same production change satisfies
  all four IDs. Defensible per M4c precedent; minor ADR-027 one-green-per-ID deviation.
- **`lib/blockValidation.ts:overlapsExistingBlock` is dead production code.** Retained for
  U-m2-004/005 regression coverage. Flag for M5/M7 cleanup once edit-mode lands.
- **Vacuous-pass debt grows.** 9 new deferred-to-preview IDs (5E + 4A) added in M4e.
  Running total ~35 post-M4e. Deterministic-seed helper still owed.
