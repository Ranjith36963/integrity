# Changelog — M7d

## [unreleased]

### Added (M7d) — Block-100% Bloom + Day-100% Fireworks

- **M7d — Block-100% bloom + day-100% fireworks:** interactive celebration layer that fires
  when a block or the whole day hits 100% completion. Block bloom: `<TimelineBlock>` calls
  `useBlockCelebrationOnce` (Set<string> mount-scoped dedup) so each block ID blooms at most
  once per page load; the block's border pulses via `@keyframes blockBloom` CSS; under
  `prefers-reduced-motion` a `.bloom-overlay-reduced` sibling div fades in/out instead.
  Day fireworks: `<BuildingClient>` calls `useDayCelebrationOnce` (boolean ref) and renders
  `<Fireworks>` when `dayPct >= 100`; the PRM-conditional timer is extended 1700 → 2000 ms;
  the new `<DayCompleteCard>` (role="status" aria-live="polite", 2000 ms auto-dismiss) is
  the PRM-safe fallback. Audio deferred to M7f — `celebrate(kind, { withAudio: false })`
  shim in place. `<Fireworks>` UNCHANGED (C-m7d-015 verified). `useCrossUpEffect` retained
  for backwards compat. No schema bump; no new third-party deps; no new public assets.
  +44 tests (1435 → 1479) across 89 files; 19 lint warnings (at ≤ 20 ceiling; net-zero vs
  M7c); 0 TS errors. C-m4f-009 sanctioned amendment (BuildingClient.m4b.test.tsx: `playChime`
  zero-calls now expected, audio deferred). Closes C-m7d-001..015, U-m7d-001..007.
  E-m7d-001..006 + A-m7d-001..003 deferred-to-preview. Fourth of five M7 chunks.
- New hooks in `lib/celebrations.ts`: `useBlockCelebrationOnce(blockId, pct)` — fires the
  block bloom at most once per block ID per mount using a `Set<string>` ref;
  `useDayCelebrationOnce(dayPct)` — fires day fireworks at most once per mount using a
  `boolean` ref; `celebrate(kind, { withAudio })` — shim routing celebrations, defaults
  `withAudio: false` until M7f. `useCrossUpEffect` retained (no production consumers).
  Tests: U-m7d-001..007, C-m7d-001..005.
- New component `components/DayCompleteCard.tsx` — PRM fallback shown when day hits 100%
  and `prefers-reduced-motion: reduce` is active. `role="status"` `aria-live="polite"`;
  auto-dismisses after 2000 ms via `useEffect` + `setTimeout`. Tests: C-m7d-011..012.
- `<TimelineBlock>` gains block bloom: calls `useBlockCelebrationOnce`; `@keyframes blockBloom`
  border pulse on `.bloom-overlay` class; `.bloom-overlay-reduced` sibling div for PRM path.
  Tests: C-m7d-001..005.
- `<BuildingClient>` gains day fireworks: `useDayCelebrationOnce` + `celebrate` wired;
  `fireworksActive` boolean drives `<Fireworks>` and `<DayCompleteCard>`; PRM-conditional
  auto-dismiss extended from 1700 → 2000 ms. Tests: C-m7d-006..010.
- `tests/e2e/m7d.spec.ts` — 6 Playwright e2e specs (deferred to preview).
  IDs: E-m7d-001..006.
- `tests/e2e/m7d.a11y.spec.ts` — 3 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m7d-001..003.

### Notes (M7d)

- **Audio deferred to M7f.** All `celebrate()` call sites pass `{ withAudio: false }`.
  M7f follow-up: flip `playChime` invocations and pass `withAudio: true`.
- **C-m4f-009 sanctioned amendment.** `BuildingClient.m4b.test.tsx` expectation for
  `playChime` changed to zero-calls (audio deferred). EVALUATOR ruling: acceptable.
- **PRM mid-celebration deferral.** Toggling `prefers-reduced-motion` while a fireworks
  overlay is active leaves the already-running timer at its original delay. Documented
  limitation; non-blocking.
- **C-m7d-002 indirect coverage.** `useBlockCelebrationOnce` Set deduplication proven
  via sister test C-m7d-003 (haptics count). Behavior correct; non-blocking.
- **Deferred-to-preview:** E-m7d-001..006 (Playwright E2E) and A-m7d-001..003 (axe a11y)
  are real `test()` blocks — vacuous-pass in-sandbox (same pattern as M4–M7c).
  Lint ceiling ≤ 20 re-anchor is prose-only in status.md; ADR-049 candidate to formalize.
