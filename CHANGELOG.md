# Changelog

All notable changes to Dharma are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

The **SHIPPER** agent updates this file on every ship. The user does not edit it directly.

---

## [unreleased]

### Added

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

### Changed

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

---
