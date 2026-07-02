# Changelog — M11 (Durable History)

## [unreleased]

### Added — Step 2: backfill missed days + honest archived scores (defect D3, DEC-1)

- **No more holes in history.** Rollover previously archived only the single last-open day and
  jumped to today, so days the user never opened the app simply vanished. Now `rollover` backfills
  every skipped day between (exclusive) the last-open date and today as a **missed day** — an
  immutable snapshot of the routine that applied that date, all completion reset → **0%** — with a
  new optional `missed: true` flag on `ArchivedDay` so the UI can label it **"No entry"** (DEC-1).
- **Past scores are no longer diluted.** Because M11 Step 1 keeps the whole routine in
  `state.blocks`, archiving the raw set would let a past weekday's score be dragged down by
  weekend-only blocks. The archive step now stores the recurrence-**filtered** day the user
  actually saw (deletions + `appliesOn(currentDate)`), so a stored day scores exactly what the live
  hero showed.
- `lib/history.ts` — new `nextISO`, `resetCompletion`, `missedDaySnapshot` helpers; backfill loop
  in `rollover`. `lib/types.ts` + `lib/persistSchemas.ts` — additive optional `missed` on
  `ArchivedDay` (old archived days still validate).
- The existing week/month/year aggregates already counted an in-range missing day as 0%; backfilled
  missed days now score a real 0% for the same result, and each day is individually inspectable.
- Tests: rewrote U-m9b-013 (multi-day skip now backfills); new `lib/backfillMissed.test.ts` proves
  AC-6 (every skipped day backfilled, none beyond today), AC-8 (honest averages over a gap), and the
  archive-not-diluted fix. Verified in a production build: a 5-day gap fills 06-27..07-01 with the
  right missed flags and keeps the routine.

### Fixed — Step 1: rollover preserves the whole routine (defects D1 + D2)

- The nightly rollover dropped every non-timed brick (`seedBrick` returned `null` for
  `hasDuration === false`) and every empty block, silently erasing a routine built from empty
  recurring time-blocks. Empirically: a 32-block routine dated yesterday returned 0 blocks after one
  rollover.
- `lib/history.ts` — `seedFreshDay`/`seedBrick` now treat blocks and bricks as persistent recurring
  templates: each carries forward by its OWN recurrence (a brick inherits its parent block's when it
  has none), independent of `hasDuration`, with completion reset (tick→false, units→0, timer→0).
  Empty recurring blocks carry. New `recurrenceExpired()` drops only a past `just-today` or an ended
  `custom-range`; every-day/weekday/weekend never expire (the Day view filters per date). The
  archive step is unchanged (immutable snapshot of the ending day).
- Tests: the 6 M9b rollover tests that encoded the old drop-behavior were rewritten to the M11
  contract; new `lib/rolloverDurable.test.ts` proves AC-1..AC-4 and that a routine survives **30
  consecutive nightly rollovers** with definitions intact and completion reset. 1817 vitest green.
- Verified in a production build: a routine created, backdated, and reopened days later now
  persists on the timeline and archives the old day (was: every block lost).
