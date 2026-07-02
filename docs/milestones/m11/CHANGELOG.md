# Changelog — M11 (Durable History)

## [unreleased]

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
