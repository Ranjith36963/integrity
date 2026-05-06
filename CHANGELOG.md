# Changelog

All notable changes to Dharma are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

The **SHIPPER** agent updates this file on every ship. The user does not edit it directly.

---

## [unreleased]

### Added

- **M2 — Add Block Flow:** first interactive verb. Add via floating `+` button (defaults Start to current hour rounded down) or via empty-slot tap (24 absolutely-positioned transparent buttons behind block cards). Single `<Sheet>` instance with `view: 'block' | 'newCategory'` local state; M0 `<Sheet>` primitive untouched. Inline category creation — first category created as side-effect of categorizing first block; new category auto-selected; persists on "Done" even if block is then Cancelled. Validation: empty Title disables Save; End ≤ Start inline error; End past 23:59 inline error; Custom-range zero-weekdays inline error; overlap soft-warning (Save still allowed). Day Blueprint Bar non-empty path: aggregates by `categoryId`, segment width proportional to sum-of-durations / day-total; uncategorized blocks excluded. No-end blocks render as ~5px markers (`HOUR_HEIGHT_PX / 12`). Closes 50 test IDs (`U-m2-001..011`, `C-m2-001..020`, `E-m2-001..013`, `A-m2-001..006`); 33 testable SPEC ACs (3 deferred-by-design). Playwright + axe deferred to Vercel preview (sandbox `next dev` socket bind failure — M1 pattern).
- `components/AddBlockSheet.tsx`, `RecurrenceChips.tsx`, `CategoryPicker.tsx`, `NewCategoryForm.tsx`, `SlotTapTargets.tsx` — new.
- `lib/blockValidation.ts` — pure validators (5 helpers): `validateTitle`, `validateEndTime`, `validateEndOverflow`, `validateRecurrenceWeekdays`, `validateOverlap`.
- `lib/uuid.ts` — `crypto.randomUUID()` mockable seam.
- 12-color palette `--cat-1`..`--cat-12` in `app/globals.css` (replaces legacy `--cat-health/mind/career/passive` per ADR-032). `--cat-4` lightened from `#64748b` → `#94a3b8` for WCAG AA contrast on `#07090f`.
- Locked Phase-1 schemas in `lib/types.ts`: `Block` (`id`, `name`, `start`, `end?`, `recurrence`, `categoryId | null`, `bricks: []`), `Category` (`id`, `name`, `color`), `AppState` (`blocks`, `categories`), `Recurrence` union per ADR-019 (stored, not yet resolved — `appliesOn` lands in M9), `Action` discriminated union with `assertNever` exhaustiveness guard.

### Changed (M2)

- `app/(building)/BuildingClient.tsx` — owns `useReducer` over `(blocks, categories)`; wires sheet open/close + `ADD_BLOCK` / `ADD_CATEGORY` callbacks.
- `components/Timeline.tsx` — renders `<TimelineBlock>` cards over the M1 24-hour grid; layers `<SlotTapTargets>` underneath; preserves now-line + auto-scroll.
- `components/TimelineBlock.tsx` — re-authored (was obsolete in M1); height = `timeToOffsetPx(end) - timeToOffsetPx(start)` when `end` set, else `HOUR_HEIGHT_PX / 12` (~5px no-end marker); category dot via `data-testid="category-dot"`.
- `components/BlueprintBar.tsx` — non-empty path aggregates by `categoryId`; uncategorized blocks excluded.
- `components/BottomBar.tsx` — `+` button now wires `onClick` to open AddBlockSheet (M1 left it no-op).
- `lib/data.ts` — `defaultState()` adds `categories: []`; reducer with `ADD_BLOCK` + `ADD_CATEGORY` and `assertNever` exhaustiveness.
- `lib/dharma.ts:duration()` — widened to handle `end?: string` (returns 0 for no-end blocks; pre-M2 `U-bld-014` tests still pass).

### Added

- **M1 — Empty Building Shell:** spatial 24-hour timeline with amber now-line, hero (date +
  Building N of N + 0%), top bar (DHARMA / Edit toggle / Settings), Day Blueprint bar
  empty-outline placeholder, locked empty-state copy "Tap any slot to lay your first block.",
  floating dock (Voice disabled until M10; `+` no-op until M2). Closes 56 test IDs
  (`U-m1-001..011`, `C-m1-001..022`, `E-m1-001..016`, `A-m1-001..007`). 25 SPEC ACs #1..#25.
- `lib/dayOfYear.ts` — pure day-of-year helper (handles leap year).
- `lib/timeOffset.ts` — exports `HOUR_HEIGHT_PX` as the single source of truth shared by
  Timeline + NowLine.
- `components/NowLine.tsx` — new presentational component consuming `useNow()` (ADR-023).

- **M0 — Design System:** 10 primitive components (`<Button>`, `<Modal>`, `<Sheet>`, `<Chip>`,
  `<Input>`, `<Stepper>`, `<Toggle>`, `<EmptyState>`, `<BlockCard>`, `<BrickChip>`) with cva
  variants; design tokens migrated to `#07090f` warm-dark palette per ADR-011; new `/design`
  harness page renders all primitives in every documented state; motion / haptics /
  reduced-motion lib modules. Closes 48 M0 test IDs (`U-m0-001..012`, `C-m0-001..023`,
  `E-m0-001..008`, `A-m0-001..005`). New ADRs: 028 (`aria-checked` on `role="switch"`),
  029 (`devIndicators: false` for touch-target tests), 030 (`/design` route, no underscore),
  031 (`Button sm` keeps `min-h-[44px]`).
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
- **SDD/TDD harness V1 upgrade (2026-05-01):** `npm run eval` bundles all gates
  (lint + typecheck + vitest + e2e + a11y); `/feature <name>` slash command becomes the
  one-prompt pipeline trigger; ADR-024 caps the auto-FAIL → BUILDER loop at 3 retries; ADRs
  017–024 capture the per-feature dispatch policy (ADR-022), localStorage schema (ADR-018),
  recurrence union (ADR-019), live-derived `now`/`today`/`dayNumber` (ADR-020), `BrickTimer`
  decision (ADR-017), and `useNow` SSR-paint rationale (ADR-023).
- **SDD/TDD harness V2 upgrade (2026-05-01):** the methodology is named **The Loop**
  (ADR-025) and runs as PLAN → TESTS → IMPL → EVAL → SHIP with two human gates (ADR-026 —
  Gate #1 after both PLANNER dispatches return, Gate #2 after SHIPPER deploys). PLANNER
  splits into `mode: PLAN` and `mode: TESTS` dispatches per feature for timeout resilience.
  Per-phase commit-prefix convention adopted (ADR-027): `docs(plan-<feat>):` /
  `docs(tests-<feat>):` / `test(<feat>):` / `feat(<feat>):` / `docs(eval-<feat>):` /
  `chore(ship-<feat>):` / `docs(ship-<feat>):`. SHIPPER's `docs/status.md` update is now
  strictly mandatory on every ship. Slash-command pre-flight tightened to validate the
  feature's SPEC entry has all five required sections (Intent / Inputs / Outputs /
  Edge cases / Acceptance criteria) before The Loop runs.
- **`phase1plan.md`** added at the repo root: 11-milestone build order M0..M10 covering
  Design System through Voice Log, with carried-forward decisions, locked AppState schema,
  test migration discipline, and tracked spec gaps (SG-bld-13..19). Supersedes the previous
  8-feature empty-toolkit pivot for forward planning.
- **`test:a11y` script:** `npm run test:a11y` runs the dedicated axe-core Playwright suite
  (`building.a11y.spec.ts`) independently from the full e2e run (added in `c246686` per
  evaluator QoL suggestion).
- **wipe-demo (Page 1 pivot, feature 1 of 8):** Building view now boots into an empty state
  on first run. Copy "No blocks yet. Tap + to add your first block." renders by default.
  BlueprintBar and NowCard are hidden until the user creates blocks. Hero shows 0 % with the
  "Building N of 365" day-counter line hidden until `programStart` exists (ADR-020).
  Closes `C-bld-034..038`, `E-bld-022..024`.

### Changed

- `components/Hero.tsx` — drops `<AnimatedPercent>` for M1 (no count-up; M3 re-adds).
- `components/BlueprintBar.tsx` — adds empty-outline path with CSS-gradient grid; renders
  unconditionally even when `blocks.length === 0`.
- `components/Timeline.tsx` — adds 24-hour vertical grid, NowLine integration, auto-scroll-to-now
  on mount. One justified `eslint-disable-next-line react-hooks/exhaustive-deps` at line 39
  (auto-scroll-on-mount runs once).
- `components/EmptyBlocks.tsx` — adopts M0 `<EmptyState>` primitive with locked SPEC copy.
- `components/BottomBar.tsx` — Voice button visibly disabled (`aria-disabled`); `+` button
  no-op; `safe-area-inset-bottom` honored.
- `app/(building)/BuildingClient.tsx` — composes the seven M1 regions; drops obsolete-component
  imports (NowCard, TimelineBlock, Brick, BrickStepper, Scaffold, EmptyBricks).
- **M0 test migration complete:** the 94 pre-pivot test IDs from `docs/tests.md` have been
  tagged `[survives]`, `[re-author]`, or `[obsolete]` by the M0 PLANNER dispatch, fulfilling
  the `phase1plan.md` § Test Migration Discipline requirement. No IDs were silently dropped.
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
