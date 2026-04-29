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

## Orchestration Flow (permanent)

This is how every feature is shipped. Steps 1–2 are the user's. Steps 3–7 are Main Claude's, run end-to-end without asking.

**The user's role: plan and approve, then react to a live preview.**
**Main Claude's role: drive 3 → 7 automatically, one feature at a time.**

  1. **PLANNER** — Main Claude dispatches. Reads `/docs/spec.md`. Writes `/docs/plan.md` and `/docs/tests.md`. Tests are grouped by **feature** with explicit feature names. Spec gaps surface as questions for the user.
  2. **User approves** the plan and resolves spec gaps. This is the only approval gate per page.
  3. **BUILDER** — Main Claude dispatches. Picks **one feature**. Goes test by test: red → green → refactor → commit. Commits one logical change at a time; the user can watch files appear.
  4. **BUILDER → EVALUATOR (automatic).** When that one feature is green, BUILDER stops and hands off. Main Claude does not pause for confirmation.
  5. **EVALUATOR** — runs Playwright, axe, lint, typecheck, full test suite, optional Lighthouse. Returns PASS or FAIL.
     - **FAIL → back to BUILDER, automatic.** Loop until PASS. No user check-in between iterations unless the loop hits the same gap twice.
     - **PASS → SHIPPER, automatic.**
  6. **SHIPPER** — pushes to the deploy branch (Vercel auto-deploys preview). Updates README + CHANGELOG. Returns the live preview URL.
  7. **Main Claude reports back to the user** with the preview URL and a one-line summary of what landed.
  8. **User opens the preview, taps, feels, reacts.** Tells Main Claude what's off. Main Claude feeds that back to the harness — usually as a new spec entry (loop returns to step 1) or a follow-up test ID against the existing plan (loop returns to step 3).
  9. **Next feature → repeat from step 3** until every feature in the plan has shipped a preview.

**Boundary rules**
- The user only talks to Main Claude. Never to sub-agents.
- Each sub-agent has isolated context. They exchange files (plan.md, tests.md, commits, the PASS/FAIL report), never reasoning.
- BUILDER stops after **one feature**, never bundles multiple features into one run.
- Main Claude does not ask "should I run the evaluator?" — that's automatic. The only times Main Claude pauses for user input are: after PLANNER (approval), after SHIPPER (preview review), or when an agent reports a real ambiguity it can't resolve from its inputs.

User only talks to Main Claude. Never to sub-agents directly.

## Hand-off Rules

- Hand-offs are file-based, not chat-based
- BUILDER reads PLANNER's files, not PLANNER's chat
- EVALUATOR reads BUILDER's commits, not BUILDER's reasoning
- This keeps each agent's context clean

## Repository knowledge files

Six files carry the project's durable context. Every fresh session, Main Claude reads these first.

| File | Owner (writes) | Read by | Updated when |
|---|---|---|---|
| `docs/spec.md` | user | PLANNER | scope changes |
| `docs/plan.md` | PLANNER | BUILDER, EVALUATOR | each new feature |
| `docs/tests.md` | PLANNER | BUILDER, EVALUATOR | each new feature |
| `docs/decisions.md` | Main Claude + EVALUATOR | PLANNER, BUILDER, EVALUATOR | every non-obvious choice |
| `docs/status.md` | SHIPPER + Main Claude | everyone (esp. on session restart) | every ship + every handoff |
| `CHANGELOG.md` | SHIPPER | humans + future-me | every ship |

`CLAUDE.md` (this file) and `AGENTS.md` are operating-manual files, not project state.
`README.md` is for humans visiting GitHub.
`feedback.md` and `glossary.md` may be added if the workflow demands them; not required today.

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
