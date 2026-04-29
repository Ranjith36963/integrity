@AGENTS.md

# Project: Dharma

Mobile-first PWA. Daily routine tracker. Gamified day-construction site.

**Stack:** Next.js 15+, Tailwind, TypeScript, lucide-react, Framer Motion, Vitest, Playwright.
**Deploy:** Vercel.
**Future:** Capacitor wrap for iOS + Android app stores.

## Methodology

- **Spec-Driven Development.** `/docs/spec.md` is the source of truth.
- **Test-Driven Development.** Red → green → refactor inside SDD.
- Every feature: spec → plan → tests → code → eval → ship.

## Orchestration Flow

```
User → Main Claude → PLANNER → BUILDER ↔ EVALUATOR (loop until PASS) → SHIPPER → done
```

- The user only talks to **Main Claude**.
- Agents work in **isolated** contexts — each receives only the deliverables of the previous agent, never another agent's reasoning or transcript.
- Main Claude is the only orchestrator.

## Agent Boundaries

| Agent         | Reads                                           | Writes                                          | Forbidden                                                                          |
| ------------- | ----------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| **planner**   | `/docs/spec.md`, repo (read-only)               | `/docs/plan.md`, `/docs/tests.md`               | Source code, running tests                                                         |
| **builder**   | `/docs/plan.md`, `/docs/tests.md`, repo         | source code + tests, commits                    | Reading `/docs/spec.md`, deploys, reviewing self                                   |
| **evaluator** | `/docs/spec.md`, `/docs/tests.md`, builder diff | a PASS or FAIL report (returned, not committed) | Writing code, deploying                                                            |
| **shipper**   | evaluator PASS report, repo                     | `README.md`, `CHANGELOG.md`, deploy commands    | Writing features, reviewing code, pushing to `main` without explicit authorization |

Agents stop at their boundary and return their deliverable to Main Claude.

## Required Plugins / Skills

> Install whatever isn't already in `package.json`. Do not duplicate.

### Design

- **shadcn/ui** — component library
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations
- **lucide-react** — icons
- **next/font** — Google Fonts (Instrument Serif + JetBrains Mono)

### Testing

- **Vitest** — unit tests (fast, Vite-native)
- **@testing-library/react** + **@testing-library/jest-dom** + **@testing-library/user-event** — component tests
- **Playwright** — end-to-end tests
- **@axe-core/playwright** — accessibility tests
- **MSW** — API mocking

### Dev tooling

- **ESLint** + **Prettier** — lint + format
- **TypeScript** strict mode
- **Husky** + **lint-staged** — pre-commit hooks
- **commitlint** + **@commitlint/config-conventional** — commit message format

### Deploy

- **Vercel CLI**
- **GitHub Actions** for CI

### PWA

- **next-pwa** — service worker + manifest
- **workbox** — offline caching

### Future (mobile apps)

- **Capacitor** — wrap Next.js as iOS + Android app
- **EAS Build** — cloud iOS build (no Mac needed)

## Quality Gates (Evaluator enforces)

- All Vitest tests pass
- All Playwright e2e tests pass
- No accessibility violations (axe)
- Lighthouse: Performance > 90, Accessibility = 100, Best Practices > 95
- TypeScript: zero errors
- ESLint: zero warnings

## Definition of Done

A feature is shipped when:

1. Spec acceptance criteria covered
2. Tests written first, all pass
3. Evaluator returns PASS
4. Deployed to Vercel (preview by default; production only on explicit user instruction)
5. README + CHANGELOG updated

## Repo conventions

- Active development branch: see the orchestrator's session brief (currently `claude/build-dharma-pwa-8WVNB`).
- Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`).
- Never `--no-verify`, never force-push shared branches.
- All paths in plans/tests are repo-relative.
