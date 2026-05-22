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

## Methodology: The Loop (SDD outside, TDD inside)

Every feature follows this exact sequence. We name it **The Loop** so any prompt, ADR, or commit can reference it without re-stating the contract. Codified by ADR-025; gating refined by ADR-026, then collapsed to a single human gate by **ADR-041 (VERIFIER replaces Gate #1)**; commit prefixes by ADR-027.

SPEC defines WHAT.
PLAN defines HOW.
TESTS prove HOW will satisfy WHAT.
VERIFY confirms PLAN + TESTS actually cover SPEC, before any code.
CODE makes tests green.
EVAL proves the green is real.
SHIP puts it in front of the user.

### Phase 1 — SPEC (user owns)
- User authors the feature entry in `/docs/spec.md`.
- Required sections: Intent · Inputs · Outputs · Edge cases · Acceptance criteria.
- This is the only phase where new requirements enter the system.
- (Precondition to The Loop, not a Loop step. No agent gate.)

### Phase 2 — PLAN (PLANNER `mode: PLAN`)
- PLANNER reads `/docs/spec.md` and emits the feature's `/docs/plan.md` entry: file structure, data models, components, design tokens, decisions to honor.
- Commits as `docs(plan-<feature>): …`.
- Auto-chains to Phase 3. No user gate.

### Phase 3 — TESTS (PLANNER `mode: TESTS`)
- Separate PLANNER dispatch. Derives GIVEN/WHEN/THEN tests from the just-written `plan.md`.
- Covers success, failure, and edge cases.
- Output: `/docs/tests.md` entry for the feature.
- Commits as `docs(tests-<feature>): …`.
- Auto-chains to Phase 4. No user gate (per ADR-041).

### Phase 4 — VERIFY (VERIFIER owns)
- Independent agent reads `/docs/spec.md` (named feature only), the just-written `plan.md` entry, and the just-written `tests.md` entry.
- Five checks: spec-coverage, test grounding, plan↔spec consistency, test ID hygiene, schema lock + ADR honor.
- Output: PASS (with AC → test-ID mapping) or FAIL (with gap list).
- PASS → auto-chain to Phase 5.
- FAIL → re-dispatch PLANNER with gap list. **Cap: 2 retries** before escalating to user.
- Verifier-driven follow-ups commit as `docs(verify-<feature>): …` (rare).

### Phase 5 — IMPL (BUILDER owns, TDD inner loop)
- For each test in `tests.md`: Red → Green → Refactor → Commit.
- Red commit: `test(<feature>): …`. Green/refactor commit: `feat(<feature>): …` or `fix(<feature>): …`.
- No phase exit until every `tests.md` ID for this feature is green.
- Auto-chains to Phase 6. No user gate.

### Phase 6 — EVAL (EVALUATOR owns)
- Runs `npm run eval` (lint + typecheck + vitest + e2e + a11y) plus spec-coverage and test-integrity review.
- Eval-driven follow-up commits: `docs(eval-<feature>): …` or `chore(eval-<feature>): …`.
- PASS → auto-chain to Phase 7.
- FAIL → auto-chain back to BUILDER with gap list (capped at 3 retries per ADR-024). No user gate inside the FAIL loop.

### Phase 7 — SHIP (SHIPPER owns) → Gate #2
- Updates README + CHANGELOG + `docs/status.md` (status update is **mandatory** — every ship commit includes it). Pushes to the deploy branch (Vercel auto-deploys preview).
- Commits as `chore(ship-<feature>): …` and/or `docs(ship-<feature>): …`.
- **STOP. User taps the preview, reacts.** Reaction feeds the next `/feature` invocation. **This is the only human gate** (per ADR-041).

### Why one gate, not two
- ADR-026 originally specified two gates: Gate #1 (after PLAN+TESTS) and Gate #2 (after SHIP).
- ADR-041 collapsed Gate #1 into the VERIFIER agent. The audit job is identical — confirm plan + tests cover spec — but runs without the user reading anything.
- Gate #2 (preview tap-test) remains. It is the only gate that judges live behavior, and only a human can do it.
- Phases 4–6 run unattended because VERIFIER's PASS certifies that "green tests = correct feature." If that contract breaks, the fix is to harden VERIFIER, not insert more human gates.

### Commit-prefix convention (ADR-027 + ADR-041)

Layered on Conventional Commits. `<feature>` is the slug used in `plan.md` / `tests.md` (e.g., `m0`, `m3`, `add-block`):

| Phase                | Prefix                                            |
| -------------------- | ------------------------------------------------- |
| 2. PLAN              | `docs(plan-<feature>): …`                         |
| 3. TESTS             | `docs(tests-<feature>): …`                        |
| 4. VERIFY follow-up  | `docs(verify-<feature>): …` (rare)                |
| 5. IMPL — red        | `test(<feature>): …`                              |
| 5. IMPL — green      | `feat(<feature>): …` or `fix(<feature>): …`       |
| 6. EVAL follow-up    | `docs(eval-<feature>): …` / `chore(eval-…): …`    |
| 7. SHIP              | `chore(ship-<feature>): …` / `docs(ship-…): …`    |

Out-of-Loop harness commits (ADRs, slash commands, agent definitions) continue as `docs(harness): …`.

## The 5 Agents

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
Hands off to: VERIFIER

### 2. VERIFIER
Role: Independent design auditor (replaces Gate #1 per ADR-041)
Reads: /docs/spec.md (named feature) + just-written plan.md + just-written tests.md + /docs/decisions.md
Checks (all five):
  - Spec coverage: every AC has a test ID
  - Test grounding: every test ID maps to an AC
  - Plan ↔ spec consistency: no contradictions, no scope creep
  - Test ID hygiene: stable prefixes, GIVEN/WHEN/THEN, no duplicates
  - Schema lock + ADR honor
Output:
  - PASS report (with AC → test-ID mapping) → hands to BUILDER
  - FAIL report (with gap list) → hands back to PLANNER (capped at 2 retries)
Forbidden: writing code, plans, or tests; deploying; running `npm run eval`
Hands off to: BUILDER (on PASS) or PLANNER (on FAIL)

### 3. BUILDER
Role: Senior full-stack engineer running strict TDD
Reads: /docs/plan.md + /docs/tests.md + VERIFIER's PASS report (so it knows the design surface was audited)
Process per feature:
  1. Pick one test from tests.md
  2. Write the failing test (Vitest or Playwright)
  3. Write the minimum code to pass
  4. Refactor
  5. Commit with conventional commit message
  6. Move to next test
Forbidden: reviewing own work, deploying, changing the plan
Hands off to: EVALUATOR

### 4. EVALUATOR
Role: Staff engineer running evals (like AI lab evals teams)
Reads: BUILDER's diff + /docs/spec.md + /docs/tests.md + VERIFIER's PASS report
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

### 5. SHIPPER
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

This is how every feature is shipped, post ADR-025/027/041. Step 10 is the user's only gate. Everything else runs unattended.

**The user's role: tap the live preview and react. One check-in per feature (per ADR-041).**
**Main Claude's role: drive 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 automatically, one feature at a time.**

  1. **PLANNER (`mode: PLAN`)** — Main Claude dispatches. Reads `/docs/spec.md`. Writes `/docs/plan.md` entry for the named feature only. Commits as `docs(plan-<feature>):`. Auto-chains to step 2.
  2. **PLANNER (`mode: TESTS`)** — Main Claude dispatches a second time. Reads the just-written `plan.md`. Writes `/docs/tests.md` entry for the named feature only (G/W/T IDs). Commits as `docs(tests-<feature>):`. Auto-chains to step 3.
  3. **VERIFIER** — Main Claude dispatches. Reads spec.md (named feature only) + just-written plan.md + just-written tests.md + decisions.md. Returns PASS (with AC → test-ID mapping) or FAIL (with gap list).
     - **FAIL → back to PLANNER, automatic.** Up to 2 retries (per ADR-041); then escalate to user with the standing gap list.
     - **PASS → BUILDER, automatic.** No user gate (per ADR-041).
  4. **BUILDER** — Main Claude dispatches. Picks **one feature**. Goes test by test: red → green → refactor → commit. Red commits as `test(<feature>):`; green/refactor as `feat(<feature>):` or `fix(<feature>):` (per ADR-027).
  5. **BUILDER → EVALUATOR (automatic).** When the feature is green, BUILDER stops. Main Claude does not pause.
  6. **EVALUATOR** — runs `npm run eval` (lint + typecheck + vitest + e2e + a11y) plus spec-coverage and test-integrity review. Returns PASS or FAIL.
     - **FAIL → back to BUILDER, automatic.** Up to 3 retries (per ADR-024); then escalate.
     - **PASS → SHIPPER, automatic.**
  7. **SHIPPER** — pushes to the deploy branch (Vercel auto-deploys preview). Updates README + CHANGELOG + **`docs/status.md` (mandatory, every ship, per ADR-041)**. Commits as `chore(ship-<feature>):` and/or `docs(ship-<feature>):`.
  8. **Main Claude reports back** with the preview URL and a one-line summary.
  9. (Awaiting Gate #2 — see step 10.)
 10. **User opens the preview, taps, reacts.** This is **Gate #2, the preview gate — the only human gate** (per ADR-041). Reaction feeds the next `/feature` invocation — usually a new spec entry (loop returns to step 1) or a follow-up test ID against the existing plan (loop returns to step 4).
 11. **Next feature → repeat from step 1.**

**Boundary rules**
- The user only talks to Main Claude. Never to sub-agents.
- Each sub-agent has isolated context. They exchange files (plan.md, tests.md, commits, the PASS/FAIL report), never reasoning.
- PLANNER runs **twice per feature** (mode: PLAN, mode: TESTS) — never both files in one dispatch.
- VERIFIER runs **once per PLANNER cycle** before BUILDER. Its PASS is binding; its FAIL bounces back to PLANNER (capped at 2 retries per ADR-041).
- BUILDER stops after **one feature**, never bundles multiple features into one run.
- Main Claude does not ask "should I run the verifier/evaluator?" — that's automatic. The only times Main Claude pauses for user input are: after SHIPPER deploys (Gate #2), or when an agent reports a real ambiguity it can't resolve from its inputs.

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
