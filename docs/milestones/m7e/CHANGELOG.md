# Changelog — M7e

## [unreleased]

### Added (M7e) — Polish Layer: FirstBrickCard, BrandMarkLongPress, Toaster — **M7 EPIC COMPLETE**

- **M7e — Polish layer (final M7 chunk):** narrative payoff, a secret easter egg, and an
  in-app notification rail — all render-layer only; no schema bump (SCHEMA_VERSION stays at 3);
  no new third-party dep; no new public asset.

  **FirstBrickCard** — a warm celebration card that surfaces once on the user's first brick log
  (any source: block or loose). Auto-dismisses after 3 s or on tap. Persists
  `firstBrickShown?: boolean` in `PersistedState` (additive field per ADR-044 — existing users
  never see it retroactively, back-filled via `hasAnyBrick(blocks, looseBricks)`). Exported
  `hasAnyBrick` from `lib/persist.ts` with `/** @internal */` JSDoc (SG-m7e-06).

  **BrandMarkLongPress + YearHeatmapPreview** — easter egg: a 600 ms long-press on the
  "DHARMA" brand mark in the top bar opens a year-heatmap overlay preview that composes M9e's
  `<MonthCell>` directly. The PRM branch drops the inner `scale(0.85)` and opacity-fades only.
  The sheet is z-40 (above dock z-20, under sheets z-50 so a sheet open suppresses the long-
  press visually via z-stack). Long-press during a sheet open is an observable accepted
  limitation (z-stack suppressed).

  **Toaster** — module-level emitter, in-tree (~80 LOC), kind-discriminated ARIA:
  `success` / `info` → `role="status" aria-live="polite"`; `error` → `role="alert"
aria-live="assertive"`. Last-write-wins; auto-dismiss 2 s; z-30 (under cards z-40, sheets
  z-50, above dock z-20). Singleton mounted in AppShell outside the view branch so toasts
  persist across Day/Month/Week/Year view switches.

  **Toast wiring** — four happy-path emits in `BuildingClient`: block-add, block-delete,
  brick-add, brick-delete. REORDER_BLOCK overlap-rejection snap-back does NOT fire a toast
  (SG-m7e-05 — M6's haptic + aria-live already covers it).

  +73 net tests (1479 → 1552) across 95 files; 19 lint warnings (at ceiling of ≤ 20; net-zero
  vs M7d); 0 TS errors. Closes U-m7e-001..016, C-m7e-001..035 (+ C-m7e-023b regression guard),
  SG-m7e-01..06. E-m7e-001..007 + A-m7e-001..005 deferred-to-preview. **MILESTONE 7 COMPLETE.**

- `lib/persist.ts` — `firstBrickShown?: boolean` additive field on `PersistedState`; back-fill
  migration in `loadState` via `hasAnyBrick(blocks, looseBricks)`. New export:
  `hasAnyBrick(blocks, looseBricks): boolean` (`/** @internal */`). Tests: U-m7e-001..002,
  U-m7e-015..016.
- `lib/persist.ts` — `usePersistedState` now threads `firstBrickShown` through to `AppShell`
  via the `state` object so `BuildingClient` can gate `<FirstBrickCard>` display.
  Tests: U-m7e-015..016.
- `components/FirstBrickCard.tsx` — new. Narrative payoff card; role="status"
  aria-live="polite"; auto-dismiss via `setTimeout(3000)`; tappable for immediate dismiss;
  persists `firstBrickShown: true` on dismiss via `SET_FIRST_BRICK_SHOWN` action.
  Tests: C-m7e-001..005.
- `components/BrandMarkLongPress.tsx` — new. Wraps the brand-mark `<span>` with a 600 ms
  `useLongPress` handler; on fire, sets `heatmapOpen: true` local state and renders
  `<YearHeatmapPreview>`. Tests: C-m7e-006..013.
- `components/YearHeatmapPreview.tsx` — new. Year-heatmap overlay; composes M9e's
  `<MonthCell>` in a 3×4 grid at `scale(0.85)`; PRM branch drops the scale and opacity-fades
  only; z-40 overlay with translucent scrim; tapping scrim or the `×` closes. Tests:
  C-m7e-009..014.
- `components/Toaster.tsx` — new. Module-level `toast(msg, kind)` emitter + React subscriber.
  Kind-discriminated ARIA: `success`/`info` → `role="status" aria-live="polite"`;
  `error` → `role="alert" aria-live="assertive"`. Last-write-wins (rapid emits replace the
  visible toast). Auto-dismiss 2 s; z-30. Tests: C-m7e-015..022.
- `components/TopBar.tsx` — gains optional `state?: AppState` prop; when provided, wraps the
  brand-mark `<span>` with `<BrandMarkLongPress>` and passes `state` down for the heatmap
  overlay. Tests: C-m7e-023, C-m7e-023b (regression guard).
- `app/(building)/AppShell.tsx` — mounts `<Toaster />` as a persistent singleton outside the
  view-branch `switch`, so toasts persist across all four view-switcher segments.
  Tests: C-m7e-035.
- `app/(building)/BuildingClient.tsx` — wires `<FirstBrickCard>` (gated by
  `!state.firstBrickShown && hasAnyBrick()`); emits `toast()` on block-add, block-delete,
  brick-add, brick-delete. Tests: C-m7e-025..034.
- `tests/e2e/m7e.spec.ts` — 7 Playwright e2e specs (deferred to preview).
  IDs: E-m7e-001..007.
- `tests/e2e/m7e.a11y.spec.ts` — 5 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m7e-001..005.

### Notes (M7e)

- **SCHEMA_VERSION stays at 3.** `firstBrickShown?: boolean` is additive per ADR-044 (optional
  field with back-fill). No migration version bump required.
- **Ratified non-events (deliberately NOT wired):**
  - REORDER_BLOCK overlap-rejection snap-back does NOT fire a toast (SG-m7e-05 — M6's haptic
    - aria-live announcement already covers it).
  - Long-press during a sheet open is z-stack-suppressed (sheet z-50 > overlay z-40);
    accepted as observable behavior.
  - AC #11 "rolled-back action → error toast" is structurally anchored but not actively wired
    — no M7e-scoped event currently triggers a rollback in production. If `saveState`
    quota-error path is ever activated, the toast wiring needs to be added then.
- **Deferred-to-preview:** E-m7e-001..007 (Playwright E2E) and A-m7e-001..005 (axe a11y)
  are real `test()` blocks — vacuous-pass in-sandbox (same pattern as M4–M7d). Verify at
  Gate #2.
- **Lint ceiling: 19 warnings (net-zero vs M7d).** At the ≤ 20 ceiling; all 19 are pre-M7e
  carryover. Recommend ADR-049 to formally codify the ceiling.
- **Audio still deferred (M7f follow-up).** `celebrate(kind, { withAudio: false })` shim in
  place. M7f: flip `playChime` + `withAudio: true` at all celebrate call sites.
- **Gate #2 deferred IDs:** E-m7e-001..007 + A-m7e-001..005 (12 tests total).
