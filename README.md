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

## Project layout

```
app/                 Next.js App Router — pages, layouts, manifest
  (building)/        Page 1: Building view (today's routine)
  design/            M0 design-system harness page (all primitives in every state)
components/          Shared UI components + unit tests
lib/                 Domain logic: types, data, scoring, utilities
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
