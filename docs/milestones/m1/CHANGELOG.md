# Changelog — M1

## [unreleased]

### Changed (M1) — Post-ship Hardening Pass

A targeted code-review loop (Rounds 1–6) on the already-shipped M1 Empty
Building Shell surfaced and fixed 33 issues across the shell components and
time-math libs. Render-layer + lib-layer only; no schema bump (still v3);
no public-API breaking changes; no new dependency.

**Why this exists (not in original M1):** M1 originally shipped + tap-tested.
A subsequent re-verification dispatched the same multi-round code-review
loop that hardened M0. The loop terminated on Round 6 with zero findings.

**Convergence trend:**

- Round 1: 13 findings (original bugs in shipped M1)
- Round 2: 8 findings — 6 meta-bugs from R1 fixes (incl. a P0: my own NYE
  fix had a Jan-1 negative-UTC-TZ bug)
- Round 3: 8 findings — same headline count, but 2 were STRUCTURAL
  (mutation-resistance gaps: R2 tests duplicated production logic, so a
  revert of the production code would have left tests green)
- Round 4: 3 findings — sharp drop after R3's structural fix
  (shared `isoToLocalDate` helper)
- Round 5: 1 finding (doc-only JSDoc overstatement)
- Round 6: 0 findings → loop terminated

**Real bug classes caught (not in M0's catalog):**

- **DST + negative-UTC-TZ Jan 1 bug** — `new Date("YYYY-MM-DD")` parses as
  UTC midnight, so in PT on Jan 1 2025 `.getFullYear()` returned 2024 →
  Hero showed "Building 1 of 366" instead of 365. R1 introduced the bug
  via an attempted hydration-mismatch fix; R2 caught it via TZ-pinned
  tests; R3 fixed structurally via a shared `isoToLocalDate(iso)` helper.
- **Mutation-resistance gap** — R2's "regression guard" duplicated
  production logic inline, so reverting the production fix left the test
  green. R3 made the test IMPORT the production helper, ensuring any
  mutation breaks both.
- **Tautological spec test** — pre-R1, E-m1-016 asserted `box.y >= 0`
  (true of any rendered element); never verified TopBar actually consumed
  `--safe-top`. R1 fix added the consumption + strengthened the test to
  assert computed paddingTop >= 47.
- **Schedule-region misalignment** — Tailwind `absolute` was silently
  overridden by inline `position: "relative"` on the same element,
  shifting the entire schedule 56px right. Invisible in jsdom; hidden in
  Playwright by `overflow-x-hidden`.
- **Empty-state card buried by auto-scroll-to-now** — hardcoded `top:20px`
  was hundreds of px above the viewport at any non-pre-dawn time.

**Components touched:**

- **Timeline.tsx** — schedule-region absolute positioning restored;
  empty-state card now anchored near the now-line; auto-scroll INVARIANT
  documented with cross-ref to C-m7a-009 (which already locks the
  pre-hydration contract).
- **BlueprintBar.tsx** — NOW pin aria-hidden (was duplicating NowLine's
  "Now HH:MM" announcement); visible time-text div ALSO aria-hidden so
  SR users don't hear the time three times.
- **TopBar.tsx** — `paddingTop: calc(20px + var(--safe-top, 0px))` for
  iPhone-notch clearance; `type="button"` on Edit + Settings.
- **BottomBar.tsx** — dropped dead `preventDefault` on the disabled
  voice button (it suppressed nothing); explicit `type="button"`;
  `var(--safe-bottom, 0px)` fallback.
- **NowLine.tsx** — comment cleanup; canonical SR landmark per ADR-051.
- **Hero.tsx / BuildingClient.tsx** — totalDays now flows through the
  shared `isoToLocalDate` helper; deterministic across SSR/CSR.
- **DayCell.tsx** — refactored to use the shared helper (last inline
  ISO-as-local-midnight call site eliminated).
- **lib/dharma.ts** — new `isoToLocalDate(iso): Date` exported helper;
  `dayNumber` + `dateLabel` refactored to use it.
- **lib/timeOffset.ts** — `timeToOffsetPx` rejects out-of-range minutes
  (`m > 59`, `m < 0`); hour clamping stays lenient per the U-m1-008 contract.
- **Modal.tsx / Sheet.tsx** — `var(--safe-bottom, 0px)` fallback added for
  defensive parity with TopBar.

**Test surface:**

- 1589 Vitest tests across 97 files (+7 since pre-hardening: C-m1-023
  for time-validation + strengthened C-m1-014 dual + C-m1-023 fixed via
  helper share, etc.).
- 20 TZ-pinned tests (was 11; +9 for dayOfYear coverage exercising the
  EXACT production call shape `daysInYear(isoToLocalDate(iso))`).
- 0 TS errors. 19 lint warnings (under the ≤ 20 ceiling).
- Mutation-resistance: every R3+ test imports the production helper so a
  revert breaks both production and the regression guard simultaneously.

**Closed test IDs / strengthenings (added or modified by the hardening pass):**

- `C-m1-023` — timeToOffsetPx rejects out-of-range minutes (new)
- `U-m1-010` — widened to grep all 6 HOUR_HEIGHT_PX consumers, rejects
  any hardcoded `64` in height/top styles
- `U-m1-007` — comment + spec drift aligned to `(1534, 1536)` open range
- `E-m1-007` — strengthened to assert computed paddingBottom >= 54
- `E-m1-016` — strengthened to assert computed paddingTop >= 47 + brand y >= 47
- `A-m1-006` — strengthened to assert exactly ONE `Now HH:MM` aria-label
  - NowPin aria-hidden + BlueprintBar visible-time div aria-hidden
- `C-m1-014` — added two sub-cases for empty-state position tracking
  the now-line, with pre-dawn fallback to top:20px
- `lib/dayOfYear.tz.test.ts` — new file, DST + leap + NYE + production-
  call-shape regression coverage

**Ship commits (chronological):**

- `ed356b3` — R1 batch 1: P0/P1/P2 fixes (Timeline, BlueprintBar, TopBar, BottomBar, timeToOffsetPx)
- `bae0225` — R1 batch 2: NYE-mismatch guard, TZ-pinned dayOfYear, 3 ADRs
- `95fec10` — R1 batch 3: SG-3..SG-7 test strengthening + NITs
- `feb89c8` — R2: Jan-1 negative-UTC P0 fix + 7 meta-bug closes
- `3082451` — R3: shared `isoToLocalDate` helper + mutation-resistance closes
- `98ce112` — R4: DayCell residual inline duplicate refactored
- `66a3b64` — R5: JSDoc accuracy fix (no code change)

**ADR notes:** Added ADR-049 (M1 ACs #5 + #7 superseded by M8 + M7c —
no code change, just spec drift recorded), ADR-050 (TopBar uses inline
`calc()` because Tailwind has no clean arbitrary-syntax escape for
`calc()` with a CSS var), ADR-051 (NowLine is the canonical
screen-reader landmark for current time; BlueprintBar is decorative).

**Retro:** the dayOfYear bug (R2-P0-1) is the single most important
learning. R1 introduced a fix WITHOUT a TZ-pinned regression test
exercising the production call shape. The R1 tests existed
(`dayOfYear.tz.test.ts`) but used a different code path — local-component
constructor vs. UTC-parse string. Lesson: when adding a regression test
for an existing bug, the test MUST exercise the EXACT production call,
not a parallel reconstruction of the math. R3 fixed this structurally
by having the test import the same helper production uses.

---

### Added (M1)

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

### Changed (M1)

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

### Notes (M1)

- **ADR-023** documents the `useNow` SSR-paint policy: server clock used on first render to
  avoid CLS flash, reconciled within 60 s on the client.
- **Coverage caveat (live-clock):** the BlueprintBar now-pin `aria-label` has only
  regression-level coverage (negative assertion via C-bld-039); a positive component test
  will return when a future feature touches BlueprintBar with explicit blocks.
