# Dharma

A mobile-first PWA for building your day — brick by brick.

## Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 15 (App Router)                    |
| Styling    | Tailwind CSS v4                            |
| Language   | TypeScript (strict)                        |
| Animation  | Framer Motion (motion)                     |
| Icons      | lucide-react                               |
| Unit tests | Vitest + @testing-library/react            |
| E2E / a11y | Playwright + @axe-core/playwright          |
| PWA        | Serwist (workbox-based service worker)     |
| Deploy     | Vercel (main branch → production)          |
| Future     | Capacitor (iOS + Android app store builds) |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

### All commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run start        # serve production build locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest in watch mode
npm run test:tz      # Vitest TZ-pinned timezone suite (TZ=America/Los_Angeles)
npm run test:e2e     # Playwright e2e suite (mobile-chrome)
npm run test:a11y    # Playwright axe-core accessibility suite
npm run verify       # lint + typecheck + unit tests (pre-ship check)
npm run eval         # full gate: lint + typecheck + vitest + e2e + a11y
```

Playwright requires browsers to be installed once:

```bash
npm run test:e2e:install
```

## Status

| Milestone                                          | State                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| M0 — Design System                                 | Shipped + tap-tested                                                     |
| M1 — Empty Building Shell                          | Shipped + tap-tested                                                     |
| M2 — Add Block Flow                                | Shipped + tap-tested                                                     |
| M3 — Add Brick + Live Scoring                      | Shipped + tap-tested                                                     |
| M4a — Tick Brick Logging                           | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4b — Goal Brick Stepper                           | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4d — Add Chooser Sheet                            | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4c — Time Brick Timer                             | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4e — Brick Duration + Overlap                     | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4f — Two Brick Kinds; Rip Timer                   | Shipped to preview — awaiting Gate #2 tap-test                           |
| M4g — Timer-era Dead-code Sweep                    | Shipped to preview — awaiting Gate #2 tap-test                           |
| M8 — Persistence                                   | Shipped to preview — awaiting Gate #2 tap-test                           |
| M9a — appliesOn recurrence resolver                | Shipped to preview — awaiting Gate #2 tap-test                           |
| M9b — Day rollover + history store                 | Shipped to preview — awaiting Gate #2 tap-test                           |
| M9c — Month view (Kingdom) + view switcher         | Shipped to preview — awaiting Gate #2 tap-test                           |
| M9d — Week view (Castle) + period scoring          | Shipped to preview — awaiting Gate #2 tap-test                           |
| M9e — Year view (Empire) + complete calendar       | Shipped to preview — awaiting Gate #2 tap-test                           |
| **M9 — Calendar Nav**                              | **COMPLETE** — all four switcher segments (Day/Week/Month/Year) now live |
| M5 — Edit Mode + Delete                            | Shipped to preview — awaiting Gate #2 tap-test                           |
| M6 — Drag Reorder                                  | Shipped to preview — awaiting Gate #2 tap-test                           |
| M7a — Stagger Fade-in + Skeleton Shimmer           | Shipped to preview — M7 chunk 1 of 5 (one Gate #2 tap at end of M7e)     |
| M7b — Now-line Glow + Active-block Pulse + NOW Tag | Shipped to preview — M7 chunk 2 of 5                                     |
| M7c — Hero % Count-up on First Load                | Shipped to preview — M7 chunk 3 of 5                                     |
| M7d — Block-100% Bloom + Day-100% Fireworks        | Shipped to preview — M7 chunk 4 of 5                                     |

Latest preview: `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (branch alias; auto-tracks `claude/verify-m0-deployment-s4XRy`). Vercel Deployment Protection active — open in browser while signed in to Vercel.

## Project layout

```
app/                 Next.js App Router — pages, layouts, manifest
  (building)/        Page 1: Building view (today's routine)
                       AppShell.tsx — owns in-app view state (Day/Month); calls usePersistedState once (M9c)
                       BuildingClient.tsx — composes the seven M1 regions; receives state/dispatch as props (M9c)
  design/            M0 design-system harness page (all primitives in every state)
components/          Shared UI components + unit tests
  NowLine.tsx        Amber now-line, consumes useNow() (ADR-023)
  Timeline.tsx       24-hour vertical grid with NowLine, TimelineBlock cards, SlotTapTargets
  TimelineBlock.tsx  Block card rendering (height proportional to duration; no-end = 5px marker)
  BlueprintBar.tsx   Day Blueprint bar — segments aggregated by categoryId (M2+)
  BottomBar.tsx      Floating dock — + button opens AddBlockSheet (M2+)
  AddBlockSheet.tsx  Full add-block flow: title, time, recurrence, category, validation
  AddBrickSheet.tsx  Add Brick flow: kind picker (tick/units), per-type fields, hasDuration toggle (M4e), overlap warning chip, validation
  AddChooserSheet.tsx Chooser sheet shown when dock + or empty slot is tapped; routes to AddBlockSheet or AddBrickSheet; real focus trap; reduced-motion respected (M4d)
  BrickChip.tsx      Brick chip with type-specific render + foreground fill = brickPct%; tick chips are tappable; units chips open UnitsEntrySheet on tap; time-window badge for timed bricks (M4e)
  TimedLooseBrickCard.tsx Timed loose-brick chip with dashed outline; renders on the Timeline at its start row (M4e)
  UnitsEntrySheet.tsx Sheet for manual number entry on a units brick; single number input + Save/Cancel; opens on tap of a units brick chip (M4f)
  Fireworks.tsx      Day-100% celebration overlay; ≤ 16 particles; ~1.6 s; suppressed under prefers-reduced-motion (UNCHANGED M7d)
  DayCompleteCard.tsx PRM fallback card shown when day hits 100% and prefers-reduced-motion is active; role="status" aria-live="polite"; auto-dismisses after 2000 ms (M7d)
  CategoryPicker.tsx Category selector chip row with inline NewCategoryForm sub-view
  HeroRing.tsx       SVG arc around the Hero numeral; stroke tracks dayPct%; firstPaintCountUp prop triggers 0→pct% tween on first load; children-as-function render-prop exposes live displayPct to callers (M7c)
  LooseBricksTray    Pinned tray above dock; lists loose bricks + "+ Brick" pill
  MonthView.tsx      Calendar-month grid of per-day score cells (heat-fill + numeral); prev/next navigation (M9c)
  DayCell.tsx        Single day cell inside MonthView — heat-fill intensity by score, tappable (M9c)
  ViewSwitcher.tsx   Day / Week / Month / Year segmented control; all four segments live as of M9e
  PastDayDetail.tsx  Read-only detail sheet for a tapped past day with archived history (M9c)
  WeekView.tsx       Castle view — seven-day (Sun→Sat) layout with per-day scores and week aggregate (M9d)
  WeekDayCell.tsx    Single day cell inside WeekView — score bar + numeral + tap-to-detail (M9d)
  YearView.tsx       Empire view — 3×4 twelve-month grid with per-month scores + YearAggregate ring; tapping a month opens MonthView at that month (M9e)
  MonthCell.tsx      Single month cell inside YearView — heat-fill intensity by score, tappable (M9e)
  DeleteConfirmModal.tsx Recurrence-aware delete confirmation (recurring: Just today / All recurrences; non-recurring/brick: single Delete) (M5)
  DraggableTimelineBlock.tsx Block card wrapper with visible drag handle; drag-to-retime with 30-min snap, overlap rejection, medium-haptic snap-back, aria-live announce; brick reorder via Framer Reorder.Group (M6)
  Skeleton.tsx        Shimmer placeholder cards rendered during two-pass hydration window; 4 variants: block/brick/bar/ring (M7a)
  NowTag.tsx          Amber "NOW" accent badge rendered top-right on the active block card; role="status"; pointer-events: none (M7b)
lib/                 Domain logic: types, data, scoring, utilities
  celebrations.ts    useBlockCelebrationOnce (Set<string> mount-scoped dedup) + useDayCelebrationOnce (boolean ref) + celebrate(kind, opts) shim; useCrossUpEffect retained for compat (M7d)
  audio.ts           playChime() — lazy HTMLAudioElement for /sounds/chime.mp3; SSR + iOS guard
  longPress.ts       useLongPressRepeat hook — 500ms hold → 50ms ticks; used by GoalStepperChip (M4b). Also exports useLongPress single-fire sibling
  overlap.ts         Pure half-open overlap engine: intervalsOverlap + findOverlaps (M4e)
  dayOfYear.ts       Pure day-of-year helper (leap-year aware)
  timeOffset.ts      Exports HOUR_HEIGHT_PX — single source of truth for timeline geometry
  blockValidation.ts Pure validators (title, end time, overflow, recurrence, overlap, brick fields)
  uuid.ts            crypto.randomUUID() mockable seam
  appliesOn.ts       Pure recurrence resolver: appliesOn(recurrence, date) → boolean (M9a)
  history.ts         Pure rollover engine: rollover(state, todayISO) → archives finished day + seeds fresh day; dayScore() + NO_DATA + weekScore() + monthScore() + yearScore() helpers (M9b/M9c/M9d/M9e)
  monthGrid.ts       UTC-drift-free month date math: monthGridCells(), addMonth(), subMonth() (M9c)
  weekGrid.ts        UTC-drift-free week date math: weekGridDays(), addWeek(), subWeek(); anchor-to-Sunday logic (M9d)
  yearGrid.ts        UTC-drift-free year/month date math: yearGridMonths(), addYear(), subYear() (M9e)
  currentDayBlocks.ts Pure helper: filters today's blocks by the deletions map (M5; appliesOn wiring deferred per ADR-047)
  snapToSlot.ts       Pure helper: snapToSlot(minutesSinceMidnight) → nearest 30-min boundary; used by drag-reorder (M6)
  motion.ts           motionTokens (8 tokens) + staggerForCount(n) helper — per-surface stagger cascade and count-up animation constants (M7a/M7c)
  firstPaint.ts       Reserved placeholder for first-paint timing utilities (M7a)
  activeBlock.ts      Pure activeBlockId(items, nowMinutes) helper — identifies the block whose half-open window straddles the current minute (M7b)
tests/
  e2e/               Playwright specs (e2e + a11y)
docs/
  spec.md            Source-of-truth product spec (SDD anchor)
  plan.md            Planner's file structure + data model decisions
  tests.md           Acceptance criteria as GIVEN/WHEN/THEN
  decisions.md       Architecture Decision Records (ADRs)
  status.md          Current ship state — read this first in a new session
public/              Static assets, service-worker manifest
```

## Methodology

Dharma is built with a Spec-Driven Development (SDD) outer loop wrapping a Test-Driven Development (TDD) inner loop, run by four isolated Claude agents (Planner, Builder, Evaluator, Shipper).

See `CLAUDE.md` for the SDD/TDD harness (The Loop) — roles, hand-off rules, quality gates, and definition of done.
