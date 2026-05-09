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

| Milestone                     | State                                          |
| ----------------------------- | ---------------------------------------------- |
| M0 — Design System            | Shipped + tap-tested                           |
| M1 — Empty Building Shell     | Shipped + tap-tested                           |
| M2 — Add Block Flow           | Shipped + tap-tested                           |
| M3 — Add Brick + Live Scoring | Shipped + tap-tested                           |
| M4a — Tick Brick Logging      | Shipped to preview — awaiting Gate #2 tap-test |
| M4b — Goal Stepper            | Shipped to preview — awaiting Gate #2 tap-test |
| M4c — Time Timer              | Not started — next up                          |

Latest preview: `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (branch alias; auto-tracks `claude/verify-m0-deployment-s4XRy`). Vercel Deployment Protection active — open in browser while signed in to Vercel.

## Project layout

```
app/                 Next.js App Router — pages, layouts, manifest
  (building)/        Page 1: Building view (today's routine)
                       BuildingClient.tsx — composes the seven M1 regions
  design/            M0 design-system harness page (all primitives in every state)
components/          Shared UI components + unit tests
  NowLine.tsx        Amber now-line, consumes useNow() (ADR-023)
  Timeline.tsx       24-hour vertical grid with NowLine, TimelineBlock cards, SlotTapTargets
  TimelineBlock.tsx  Block card rendering (height proportional to duration; no-end = 5px marker)
  BlueprintBar.tsx   Day Blueprint bar — segments aggregated by categoryId (M2+)
  BottomBar.tsx      Floating dock — + button opens AddBlockSheet (M2+)
  AddBlockSheet.tsx  Full add-block flow: title, time, recurrence, category, validation
  AddBrickSheet.tsx  Add Brick flow: kind picker (tick/goal/time), per-type fields, validation
  BrickChip.tsx      Brick chip with type-specific render + foreground fill = brickPct%; tick chips are tappable; goal chips host GoalStepperChip (M4b)
  Fireworks.tsx      Day-100% celebration overlay; ≤ 16 particles; ~1.6 s; suppressed under prefers-reduced-motion
  CategoryPicker.tsx Category selector chip row with inline NewCategoryForm sub-view
  HeroRing.tsx       SVG arc around the Hero numeral; stroke tracks dayPct%
  LooseBricksTray    Pinned tray above dock; lists loose bricks + "+ Brick" pill
lib/                 Domain logic: types, data, scoring, utilities
  celebrations.ts    useCrossUpEffect hook — one-shot cross-up detection for bloom/fireworks
  audio.ts           playChime() — lazy HTMLAudioElement for /sounds/chime.mp3; SSR + iOS guard
  longPress.ts       useLongPressRepeat hook — 500ms hold → 50ms ticks; used by GoalStepperChip
  dayOfYear.ts       Pure day-of-year helper (leap-year aware)
  timeOffset.ts      Exports HOUR_HEIGHT_PX — single source of truth for timeline geometry
  blockValidation.ts Pure validators (title, end time, overflow, recurrence, overlap, brick fields)
  uuid.ts            crypto.randomUUID() mockable seam
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
