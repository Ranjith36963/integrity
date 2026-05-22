# Changelog — M4g

## [unreleased]

### Removed (M4g)

- **M4g — Timer-era Dead-code Sweep:** pure-subtraction pre-M5 cleanup. Removed 10 inert
  `@deprecated` props that M4f had parked on five components as backwards-compat prop-shape
  placeholders: `onUnitsLog` and `onGoalLog` (on `Timeline`, `TimelineBlock`,
  `LooseBricksTray`); `onTimerToggle` and `onTimerOpenSheet` (on `Timeline`, `TimelineBlock`,
  `LooseBricksTray`); `running?` on `BrickChip`; `runningTimerBrickId?` on `TimelineBlock`.
  Affected files: `BrickChip.tsx`, `TimelineBlock.tsx`, `Timeline.tsx`, `LooseBricksTray.tsx`,
  `TimedLooseBrickCard.tsx`. Net diff: +3 / −35 LOC. Zero behavior change.
  682 Vitest tests pass across 56 files (unchanged). 0 lint errors, 13 warnings. `tsc` clean.

### Fixed (M4g)

- Mislabelled test `U-m4f-016` in `lib/blockValidation.test.ts` relabelled to `U-m3-013`
  (its true M3 ancestral ID — tests `isValidBrickUnitsTarget`, not the M4f classic-overlap
  case that `U-m4f-016` describes in `tests.md`).
- Stale `lib/timer.ts` / `findTimeBrickById` reference removed from a `lib/data.ts` doc
  comment (line 45). The file has not existed since M4f; the comment was harmless but
  misleading.
