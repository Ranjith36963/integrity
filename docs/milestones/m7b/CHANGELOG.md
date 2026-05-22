# Changelog — M7b

## [unreleased]

### Added (M7b) — Live Now-line Glow + Active-block Pulsing Glow + NOW Tag

- **M7b — Active-block visual layer:** render-layer polish that makes the currently-active
  block legible at a glance. A pure `activeBlockId(items, nowMinutes)` helper in
  `lib/activeBlock.ts` identifies the single block whose half-open window straddles the
  current minute. `<Timeline>` computes `activeId` internally (no new props on callers) and
  applies the `is-active` CSS class to the matching block card. `@keyframes nowPulse` (1.8 s
  ease-in-out) animates a `box-shadow` amber halo on `.is-active` — never dims card opacity.
  `<NowLine>` drop-shadow halo expanded to a larger amber glow token.
  `<NowTag>` — new amber accent badge ("NOW") rendered top-right inside the active block
  card; `aria-label="Now"` + `role="status"` for AAA contrast + screen-reader announce;
  `pointer-events: none` so it never intercepts taps. PRM `@media` collapses pulse to a
  static outline (no animation). Render-layer only — no schema bump (still v3); no new
  reducer actions; no `localStorage` changes. Resolves spec gaps SG-m7b-01 (1.8 s pulse
  cadence), SG-m7b-02 (NowTag AAA contrast), SG-m7b-03 (visual weight hierarchy —
  NowLine halo expanded). 1397/1397 Vitest across 85 files (+95 tests / +2 files vs
  M7a's 1302/83); `test:tz` 11/11. 0 lint errors; `tsc --noEmit` clean; 19 warnings
  (net-zero vs M7a after unused-import cleanup). Closes U-m7b-001..005, C-m7b-001..014,
  A-m7b-001..003, E-m7b-001..005 (a11y + E2E deferred-to-preview). Second of five M7 chunks.
- `lib/activeBlock.ts` — new. Pure `activeBlockId(items, nowMinutes): string | null`
  helper. Iterates timeline items; returns the `blockId` of the first block whose
  `[startMinutes, endMinutes)` half-open interval contains `nowMinutes`; returns `null`
  when no block is current. Tests: U-m7b-001..005.
- `components/NowTag.tsx` — new. Amber accent "NOW" badge. Absolute top-right positioning
  inside the active block card; `role="status"`, `aria-label="Now"`, `pointer-events: none`.
  Amber fill meets AAA contrast on the block card surface. Tests: C-m7b-001..003.
- `is-active` CSS class on Timeline block cards — applies `@keyframes nowPulse` (1.8 s
  ease-in-out, `box-shadow` amber halo); `@media (prefers-reduced-motion: reduce)` collapses
  to static `outline`. Never dims card opacity. Tests: C-m7b-004..011, C-m7b-013.
- `activeId` computation inside `<Timeline>` — calls `activeBlockId(items, nowMinutes)`;
  threads `isActive` bool to all four block render paths (standard, no-end, timed-loose,
  draggable). Tests: C-m7b-004..011, C-m7b-013.
- Expanded `<NowLine>` drop-shadow halo — larger `box-shadow` amber glow token (SG-m7b-03
  visual weight hierarchy). Tests: C-m7b-014.
- `tests/e2e/m7b.spec.ts` — 5 Playwright e2e specs (deferred to preview).
  IDs: E-m7b-001..005.
- `tests/e2e/m7b.a11y.spec.ts` — 3 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m7b-001..003.

### Notes (M7b)

- **Lint warnings: 19 (down from 25 at M7a baseline + M7b net +1).** M7b's single new
  warning (unused test imports in `NowTag.test.tsx`, `NowLine.test.tsx`,
  `Timeline.test.tsx:910`) was cleaned up in the same `chore(ship-m7b):` commit.
  Net change for M7b: zero. All 19 remaining warnings are pre-M7b carryover.
- **Deferred-to-preview:** E-m7b-001..005 (Playwright E2E) and A-m7b-001..003 (axe a11y)
  are real `test()` blocks but execute against the Vercel preview only — vacuous-pass
  in-sandbox (same pattern as M4–M7a). One Gate #2 tap at end of M7e (per user
  authorization 2026-05-20).
