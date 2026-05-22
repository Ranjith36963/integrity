# Changelog — M9a

## [unreleased]

### Added (M9a)

- **M9a — appliesOn recurrence resolver:** pure function `appliesOn(recurrence: Recurrence, date: string): boolean`
  in `lib/appliesOn.ts`. Answers "does a brick's recurrence apply on a given calendar date?" Branches on all
  four `Recurrence` kinds: `just-today` (matches its own stored date only), `every-day` (always true),
  `every-weekday` (Mon–Fri), `custom-range` (start/end window + optional weekday mask). Timezone-safe: a
  private `parseLocalDate` helper uses the multi-arg local-time `Date` constructor, never
  `new Date("YYYY-MM-DD")` (which UTC-drifts). Exhaustiveness guard inlined as
  `const _exhaustive: never = recurrence` (import-surface stays type-only). First of five M9 chunks
  (m9a–m9e: resolver → rollover+history → month/Kingdom → week/Castle → year/Empire views).
  M4e stored recurrence on bricks but never resolved it — M9a closes that gap. No storage or UI changes.
  Default Vitest suite: 760/760 passing across 59 files (+38 tests / +1 file vs M8).
  TZ-pinned suite: 11/11 passing (`npm run test:tz`). 0 lint errors; `tsc --noEmit` clean.
  Closes U-m9a-001..016. (spec §M9a — appliesOn resolver)
- `lib/appliesOn.ts` — new. Pure `appliesOn(recurrence, date)` recurrence resolver.
  `parseLocalDate(iso)` private helper (multi-arg constructor; DST-safe). Tests: U-m9a-001..016.
- `lib/appliesOn.tz.test.ts` — new. TZ-pinned timezone test suite (11 tests) exercising
  `parseLocalDate` and `appliesOn` under `TZ=America/Los_Angeles`. Excluded from the default
  Vitest config; run via `npm run test:tz`.
- `vitest.tz.config.ts` — new. Dedicated Vitest config for the TZ-pinned suite. Includes only
  `lib/appliesOn.tz.test.ts`; runs under `TZ=America/Los_Angeles` (set by the `test:tz` npm script).
- `test:tz` npm script — `TZ=America/Los_Angeles vitest run --config vitest.tz.config.ts`.
  Wired into the `eval` gate chain. Pattern to follow for all future timezone-sensitive tests.
