# Dharma — Project Operating Manual

## What we're building

Mobile-first PWA. Daily routine tracker. Gamified day-construction site.
Users build their day brick by brick. Bricks → Blocks → Buildings (days) → Castles (weeks) → Kingdoms (months) → Empire (year).

## Stack

- Next.js 15
- Tailwind CSS
- TypeScript (strict)
- lucide-react (icons)
- Framer Motion (animation)
- Vitest (unit tests)
- Playwright (e2e + visual checks)
- Vercel (deploy)
- Future: Capacitor for iOS + Android app stores

## Methodology

### Outer loop: Spec-Driven Development (SDD)

- /docs/spec.md is the source of truth
- Every feature traces back to a spec line
- No code without a spec
- Spec changes = explicit decision, never silent

### Inner loop: Test-Driven Development (TDD)

- Inside SDD, every feature is built test-first
- Red → Green → Refactor
- Write failing test → minimum code to pass → clean up
- Tests are the proof the spec is met

### How they nest

SPEC defines WHAT.
TESTS prove the WHAT is met.
CODE makes tests green.
TDD lives inside SDD.

## The 4 Agents

All agents have isolated context.
Agents never read each other's reasoning.
Only deliverables (files, reports) get handed off.
Main Claude is the only orchestrator.

### 1. PLANNER

Role: Senior staff engineer + product designer
Reads: /docs/spec.md
Writes:

- /docs/plan.md → file structure, data models, components, design tokens
- /docs/tests.md → every acceptance criterion as GIVEN/WHEN/THEN
  Forbidden: writing code, running tests, deploying
  Hands off to: BUILDER

### 2. BUILDER

Role: Senior full-stack engineer running strict TDD
Reads: /docs/plan.md + /docs/tests.md
Process per feature:

1. Pick one test from tests.md
2. Write the failing test (Vitest or Playwright)
3. Write the minimum code to pass
4. Refactor
5. Commit with conventional commit message
6. Move to next test
   Forbidden: reviewing own work, deploying, changing the plan
   Hands off to: EVALUATOR

### 3. EVALUATOR

Role: Staff engineer running evals (like AI lab evals teams)
Reads: BUILDER's diff + /docs/spec.md + /docs/tests.md
Tools: Playwright (runs the actual app, checks behavior)
Checks:

- Spec coverage: every acceptance criterion met?
- Test integrity: do tests actually prove the spec?
- Playwright run: does the deployed/local app behave correctly?
- Code quality: clean, accessible, performant?
- Edge cases: what's missing?
  Output:
- PASS report → hands to SHIPPER
- FAIL report with specific gaps → hands back to BUILDER
  Forbidden: writing features, deploying
  Hands off to: BUILDER (on fail) or SHIPPER (on pass)

### 4. SHIPPER

Role: Platform engineer + tech writer
Reads: EVALUATOR's PASS report
Tasks:

- Push to main → Vercel auto-deploys
- Update README.md
- Update CHANGELOG.md
- Verify production URL is live
  Forbidden: writing features, reviewing code
  Hands off to: Main Claude

## Orchestration Flow

User gives a task to Main Claude.

Main Claude routes:

1. PLANNER → outputs plan.md + tests.md
2. User approves plan
3. BUILDER → writes test + code (TDD loop)
4. EVALUATOR → runs Playwright + reviews
5. If FAIL → back to BUILDER (loop until PASS)
6. If PASS → SHIPPER → deploys
7. Main Claude reports done to user

User only talks to Main Claude. Never to sub-agents directly.

## Hand-off Rules

- Hand-offs are file-based, not chat-based
- BUILDER reads PLANNER's files, not PLANNER's chat
- EVALUATOR reads BUILDER's commits, not BUILDER's reasoning
- This keeps each agent's context clean

## Quality Gates (EVALUATOR enforces)

- All Vitest tests pass
- All Playwright e2e tests pass
- Zero TypeScript errors
- Zero ESLint warnings
- Lighthouse: Performance >90, Accessibility 100
- No console errors in browser
- Mobile viewport (430px) renders correctly

## Definition of Done

A feature ships only when:

1. Spec acceptance criteria covered
2. Tests written first, all green
3. Playwright confirms behavior in real browser
4. EVALUATOR returns PASS
5. Deployed to Vercel production
6. README + CHANGELOG updated

## Required Plugins / Tools

### Design

- shadcn/ui
- Tailwind CSS
- Framer Motion
- lucide-react
- next/font (Instrument Serif + JetBrains Mono)

### Testing

- Vitest
- @testing-library/react
- Playwright
- @axe-core/playwright (accessibility)
- MSW (API mocking)

### Dev tooling

- ESLint + Prettier
- TypeScript strict mode
- Husky + lint-staged
- Conventional Commits

### Deploy

- Vercel CLI
- GitHub Actions

### PWA

- next-pwa
- workbox

### Future

- Capacitor
- EAS Build

## Golden Rules

1. No code without a test
2. No test without a spec line
3. No merge without EVALUATOR PASS
4. No silent spec changes
5. Agents stay in their lane
