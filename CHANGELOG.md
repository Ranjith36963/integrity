# Changelog

All notable changes to Dharma are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

The **SHIPPER** agent updates this file on every ship. The user does not edit it directly.

---

## [unreleased]

### Added

- **live-clock (Page 1 pivot, feature 2 of 8):** Real-time clock + date wired into the
  Building view. Hero now shows today's date in `Wed, Apr 29` style (en-US per ADR-023 /
  SG-bld-11), and the day-counter line reads `Building 1 of 365` against a placeholder
  `programStart === today` (the `persist` feature next shipped will replace the placeholder
  with a real first-install date). New `lib/useNow.ts` hook ticks every 60 s. New helpers in
  `lib/dharma.ts`: `today()`, `dayNumber()`, `dateLabel()`. Closes `U-bld-022..025`,
  `C-bld-039..040`.
- **Page 1 — Building view (today's routine):** full implementation of the daily routine
  tracker. Covers all 60 accepted Page 1 test IDs: `U-bld-001..021`, `C-bld-001..033`,
  `E-bld-001..020` (E-bld-021 intentionally dropped per SG-bld-04), and `A-bld-001..005`.
  Verified by 65/65 Vitest unit tests across 13 files, 26/26 Playwright e2e tests on
  mobile-chrome (ADR-010), and 0 axe-core violations.
- **SDD/TDD harness:** `CLAUDE.md` agent operating manual, `docs/spec.md`, `docs/plan.md`,
  `docs/tests.md`, `docs/decisions.md` (ADR-001..016), `docs/status.md`, Husky + commitlint,
  lint-staged, Vitest config, Playwright config, Serwist PWA config.
- **`test:a11y` script:** `npm run test:a11y` runs the dedicated axe-core Playwright suite
  (`building.a11y.spec.ts`) independently from the full e2e run (added in `c246686` per
  evaluator QoL suggestion).
- **wipe-demo (Page 1 pivot, feature 1 of 8):** Building view now boots into an empty state
  on first run. Copy "No blocks yet. Tap + to add your first block." renders by default.
  BlueprintBar and NowCard are hidden until the user creates blocks. Hero shows 0 % with the
  "Building N of 365" day-counter line hidden until `programStart` exists (ADR-020).
  Closes `C-bld-034..038`, `E-bld-022..024`.

### Changed

- **`lib/data.ts` placeholders gone:** `now="00:00"` and `dateLabel=""` are removed from
  `BuildingClient`; live values flow through from `useNow`.
- **`dayPct` scoring — equal-weighted (ADR-005 / SG-bld-08):** completion percentage is now
  computed as the unweighted mean of all brick completion ratios (each brick counts once,
  regardless of duration). Hero number now reads ~57 % for the canonical fixture vs. ~26 %
  under the prior duration-weighted calculation. This is a user-visible behavior change.
- **`--ink-faint` → `--ink-dim` migration (ADR-011):** all low-emphasis text that previously
  used the `--ink-faint` design token now uses `--ink-dim` to meet WCAG AA contrast ratios
  (4.5 : 1). No visual change intended beyond the contrast fix.
- **WebKit Playwright project disabled (ADR-010):** mobile-safari project removed from
  `playwright.config.ts` for this sandbox; WebKit binaries are unavailable in the build
  environment. Re-enable by restoring the `mobile-safari` project entry once binaries are
  present.
- **Demo fixtures retired:** removed `BLOCKS`, `NOW`, `DAY_NUMBER`, `TOTAL_DAYS`,
  `TODAY_LABEL` from `lib/data.ts`. The hardcoded weekday routine is gone; users will create
  their own. ~17 demo-fixture tests deleted (`U-bld-016..018`, `C-bld-008..015`,
  `E-bld-002..007/014/019`); replacement coverage tracked in `tests.md` migration table.
- **Groundwork for persistence:** `lib/data.ts` introduces an unused `defaultState()` factory
  and `AppState` interface per ADR-018; the `persist` feature (feature 3 of 8) will wire them.
- **Hero `dayNumber` is now optional** (`dayNumber?: number`); when undefined, the
  "Building N of 365" line is omitted from the DOM.

### Notes

- **ADR-023** documents the `useNow` SSR-paint policy: server clock used on first render to
  avoid CLS flash, reconciled within 60 s on the client.
- **Coverage caveat (live-clock):** the BlueprintBar now-pin `aria-label` has only
  regression-level coverage (negative assertion via C-bld-039); a positive component test
  will return when a future feature touches BlueprintBar with explicit blocks.

---
