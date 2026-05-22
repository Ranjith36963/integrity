# Dharma Harness Architecture

> User-supplied target architecture for the build pipeline + a current-state audit.
> See `Current State (audit)` at the bottom for what's actually in place.

---

## Core principle

Main Claude = bus. Subagents = workers. Files = memory.
You prompt once. Chain runs. You review at gates.

## The architecture

```
You
 ↓
Main Claude (orchestrator)
 ├─ reads CLAUDE.md (rules)
 ├─ reads /docs/spec.md (truth)
 │
 ├─ spawns Planner ──→ writes plan.md (mode: PLAN)
 │     ↓ auto-chain (no user gate, ADR-026)
 ├─ spawns Planner ──→ writes tests.md (mode: TESTS)
 │     ↓ Gate #1: user reviews plan.md AND tests.md together
 ├─ spawns Builder ──→ TDD loop, commits to branch
 │                      ↓
 ├─ spawns Evaluator ─→ runs Playwright, returns PASS/FAIL
 │                      ↓ (FAIL → loop back to Builder)
 │                      ↓ (PASS)
 ├─ spawns Shipper ──→ deploy + update README/CHANGELOG/status.md (mandatory, ADR-026)
 │     ↓ Gate #2: user taps preview URL, reacts
 └─ reports done to you
```

## Files that make it work

- `/CLAUDE.md` — project rules
- `/docs/spec.md` — source of truth. WHAT to build
- `/docs/plan.md` — Planner writes. HOW to build
- `/docs/tests.md` — Planner writes. PROOF format
- `.claude/agents/planner.md` — role + tools + forbidden
- `.claude/agents/builder.md` — role + tools + forbidden
- `.claude/agents/evaluator.md` — role + tools + forbidden
- `.claude/agents/shipper.md` — role + tools + forbidden
- `.claude/commands/feature.md` — slash command. One prompt = whole chain.

## The slash command (key automation)

`/feature <name>` runs the whole pipeline. The actual contract lives in `.claude/commands/feature.md`; this is a high-level summary.

```
/feature <name>  →  pre-flight (validates spec.md has Intent/Inputs/Outputs/Edge cases/Acceptance criteria)
                 ↓
   1. PLANNER mode: PLAN     →  writes /docs/plan.md       (commits as docs(plan-<feat>):)
                 ↓ auto-chain (ADR-026)
   2. PLANNER mode: TESTS    →  writes /docs/tests.md      (commits as docs(tests-<feat>):)
                 ↓
              ⏸ Gate #1: user reviews plan.md + tests.md together. Approve to continue.
                 ↓
   3. BUILDER  →  TDD red→green→refactor per test ID       (test/feat/fix(<feat>):)
                 ↓
   4. EVALUATOR  →  npm run eval. PASS or FAIL.
                 ↓ FAIL → retry BUILDER, up to 3x (ADR-024) then escalate
                 ↓ PASS
   5. (Auto-FAIL retry loop, capped per ADR-024)
                 ↓
   6. SHIPPER  →  push branch + update README + CHANGELOG + status.md (mandatory, ADR-026)
                                                            (commits as chore/docs(ship-<feat>):)
                 ↓
   7. ⏸ Gate #2: user taps preview URL, reacts → input for next /feature.
```

You type: `/feature brick-tracker`. Chain runs. You only step in at Gate #1 (planning) and Gate #2 (preview tap).

## Hooks (more automation)

- `.claude/hooks/post-tool-use.sh` — after Builder commits, auto-run lint + typecheck. Block if broken.
- `.claude/hooks/pre-commit.sh` — block commits without conventional commit message.
- `.claude/hooks/stop.sh` — when Evaluator returns FAIL, auto-pipe report into next Builder spawn.

This is where the real loop closes itself.

## Quality gates as code

Make Evaluator's checks machine-verifiable wherever possible.

```
# evaluator runs these. Pass = pass.
npm run test           # Vitest
npx playwright test    # E2E
npx tsc --noEmit       # TypeScript
npx eslint .           # Lint
npx lighthouse --output=json --quiet
npx playwright test --grep accessibility  # axe-core
```

Subjective stuff (code quality, edge cases) → Evaluator reasons.
Objective stuff → scripts return exit code.
Faster loop. Less reasoning cost.

## MCP servers to wire in

- **Playwright MCP** — Evaluator runs real browser checks
- **GitHub MCP** — Shipper opens PRs, manages CI
- **Context7** — Builder pulls latest Next.js / Tailwind docs
- **Vercel MCP** — Shipper deploys + verifies prod URL
- **Supabase MCP** — if/when Dharma needs auth/data

## The user-facing flow

Day 1 — you:
> "Add brick-tracker feature spec to /docs/spec.md"

Then:
> `/feature brick-tracker`

You answer:
- "Plan looks good, proceed" (1 prompt)
- "Reviewed final, ship" (1 prompt)

**Total prompts from you: 3.**
Chain handles the rest. Hooks auto-fix lint. Evaluator loops Builder until PASS. Shipper deploys.

## What makes this "best practice"

- ✅ One source of truth — `spec.md`
- ✅ File-based hand-offs — auditable, no chat pollution
- ✅ Each agent isolated — clean context per role
- ✅ Tool restrictions — Planner can't deploy, Shipper can't write features
- ✅ Loop closes itself — FAIL feeds back to Builder
- ✅ Slash command = one entrypoint — your DX
- ✅ Hooks = forced quality — can't skip gates
- ✅ Machine-checkable gates — fast eval
- ✅ Git is the audit log — every commit = one passing test
- ✅ You only review at decisions — plan approval, ship approval

## What to add beyond CLAUDE.md

1. `.claude/commands/feature.md` — the chain trigger
2. Hooks folder — auto-enforce gates
3. Subagent files — turn roles into actual `.claude/agents/*.md`
4. MCP config — Playwright, GitHub, Vercel, Context7
5. Pre-defined eval scripts — `npm run eval` that runs all gates

## What to avoid

- ❌ Agent teams — sequential pipeline, no parallel payoff
- ❌ Nested subagents — not allowed anyway
- ❌ Chat-based hand-offs — `CLAUDE.md` already forbids this. Keep it
- ❌ Auto-deploy without approval — keep ship gate manual at first
- ❌ Letting Builder review own work — already forbidden. Hold the line

## Advanced — checkpoint commits

- After Planner writes plan.md → commit
- After each green test → commit
- After Evaluator PASS → commit
- After Shipper deploys → tag

If anything goes sideways: `git reset --hard <checkpoint>` + retry.
Cheap recovery. No lost work.

## Bottom line

CLAUDE.md is already 80% there.
What's missing:

- `.claude/agents/*.md` files (turn roles into real subagents)
- `.claude/commands/feature.md` (one-shot chain trigger)
- `.claude/hooks/*.sh` (auto-enforce gates)
- MCP wiring (Playwright, GitHub, Vercel, Context7)
- Eval scripts (`npm run eval`)

Add these. You go from "good doc" to automated harness.
You prompt 3 times per feature. Chain ships it.

---

# Current State (audit) — 2026-05-01

| Component | Target | Actual | Status |
|---|---|---|---|
| `CLAUDE.md` | project rules | yes, in `.prettierignore` (ADR-012) | ✅ DONE |
| `/docs/spec.md` | source of truth | yes; UX Phase 1 Toolkit + new `/phase1plan.md` exists at root | ✅ DONE |
| `/docs/plan.md` | per-feature plan | yes; pivot section + legacy section | ✅ DONE |
| `/docs/tests.md` | per-feature tests w/ G/W/T IDs | yes; 94 IDs total | ✅ DONE |
| `/docs/decisions.md` | ADRs | yes; 27 ADRs (ADR-025 names "The Loop", ADR-026 sets 2 gates, ADR-027 sets per-phase commit prefixes) | ✅ DONE (beyond doc) |
| `/docs/status.md` | live-snapshot | yes; SHIPPER updates | ✅ DONE (beyond doc) |
| `/CHANGELOG.md` | per-ship release log | yes; SHIPPER updates | ✅ DONE (beyond doc) |
| `.claude/agents/planner.md` | role definition | yes; ADR-022 (one feature per dispatch) + ADR-025 (mode: PLAN / mode: TESTS, two dispatches per feature) + ADR-026 (auto-chain, single planning gate) + ADR-027 (commit prefixes) | ✅ DONE |
| `.claude/agents/builder.md` | role definition | yes | ✅ DONE |
| `.claude/agents/evaluator.md` | role definition | yes | ✅ DONE |
| `.claude/agents/shipper.md` | role definition | yes; ADR-026 makes status.md update mandatory (Task 1, non-negotiable); ADR-027 sets ship commit prefixes | ✅ DONE |
| `.claude/commands/feature.md` | `/feature <name>` slash command | **wired** — full pipeline orchestrator with 7 steps + auto-FAIL loop per ADR-024 + The Loop contract per ADR-025/026/027 (PLAN auto-chains to TESTS, single planning gate, mandatory status.md update, per-phase commit prefixes, tightened pre-flight SPEC validation) | ✅ DONE (V2) |
| `.claude/hooks/post-tool-use.sh` | auto-run lint+typecheck after Builder commits | **does not exist** | ❌ MISSING |
| `.claude/hooks/pre-commit.sh` | block non-conventional commits | partial: `.husky/commit-msg` runs commitlint, `.husky/pre-commit` runs lint-staged | 🟡 PARTIAL (Husky-managed, not under `.claude/hooks/`) |
| `.claude/hooks/stop.sh` | auto-pipe Evaluator FAIL → Builder | partial: `~/.claude/stop-hook-git-check.sh` only checks for uncommitted git changes (user-global, not project) | 🟡 PARTIAL |
| Playwright MCP | Evaluator runs real browser via MCP | **not wired**; Evaluator runs `npx playwright test` directly via Bash | 🟡 PARTIAL |
| GitHub MCP | Shipper opens PRs, manages CI | **wired** — `mcp__github__*` tools available, scoped to `ranjith36963/integrity` | ✅ DONE |
| Vercel MCP | Shipper deploys + verifies prod URL | **not wired**; sandbox returns 403 on Vercel hosts; user does verification | ❌ MISSING |
| Context7 MCP | Builder pulls Next.js/Tailwind docs | **not wired**; Builder reads `node_modules/next/dist/docs/` | ❌ MISSING |
| Supabase MCP | future auth/data | **not wired**; not yet needed (M8 persist is localStorage-only) | ⏸️ DEFERRED |
| `npm run eval` | one-shot all-gates script | **wired** — `lint + typecheck + vitest + e2e + a11y`. Lighthouse still deferred until prod URL reachable | ✅ DONE (V1) |
| Conventional commits | enforced at commit-msg | yes, via commitlint | ✅ DONE |
| Lighthouse gate | EVALUATOR runs `npx lighthouse` | **never runs in this sandbox** (no Vercel host reachable; deferred until prod URL) | 🟡 BLOCKED |
| Checkpoint commits | per-step durable progress | yes; PLANNER/BUILDER/EVALUATOR/SHIPPER each commit independently per ADR-013/022 | ✅ DONE (beyond doc) |
| Per-feature dispatch | one feature per agent run | yes; ADR-013 (BUILDER) + ADR-022 (PLANNER) | ✅ DONE (beyond doc) |
| Auto-FAIL → BUILDER loop | hands-off retry on EVALUATOR FAIL | **wired** — ADR-024 policy + `.claude/commands/feature.md` step 4. 3-retry cap, then escalate. | ✅ DONE (V1) |

## Score: 16 ✅ done · 4 🟡 partial · 3 ❌ missing · 1 ⏸️ deferred · 1 🟡 blocked

## V1 harness upgrade landed 2026-05-01: slash command + `npm run eval` + ADR-024 (auto-FAIL loop)

## V2 harness upgrade landed 2026-05-01: The Loop named + 2-gate model + commit-prefix discipline

## What's actually happening (honest, post-V2)

**The user prompts 2–3 times per feature**, down from 5–7. The post-V2 loop:

1. (Optional) edit `/docs/spec.md` if the feature isn't already specced.
2. Type `/feature <name>` — kicks off the full Loop. PLAN auto-chains to TESTS without pausing.
3. **Gate #1 — approve `plan.md` + `tests.md` together** (single planning gate per ADR-026). Amend if drift, otherwise approve once.
4. Chain runs unattended: BUILDER (TDD) → EVALUATOR (`npm run eval`) → (auto-FAIL retries up to 3) → SHIPPER (deploys + status.md update is mandatory).
5. **Gate #2 — tap preview URL**, react. Reaction feeds the next `/feature <name>`.

That's **two user check-ins per feature** matching the architectural target. Down from the V1 reality (≈5–7 because EVAL was manually re-dispatched and gates were split into Gate #1 plan + Gate #2 tests).

Remaining drivers of extra prompts:

1. **Vercel MCP not loaded in this session** — SHIPPER currently surfaces "user verification required" instead of `curl -I`-confirming the preview. One extra round-trip per ship until the next chat picks up the MCP.
2. **Lighthouse gate** — still skipped because the sandbox can't reach Vercel hosts. Reactivates when Vercel MCP lands.

## V1 harness upgrade — what landed (2026-05-01)

- ✅ `.claude/commands/feature.md` — full pipeline orchestrator (PLANNER → BUILDER → EVALUATOR → SHIPPER), auto-FAIL loop per step 4
- ✅ `npm run eval` — bundled all-gates script (lint + typecheck + vitest + e2e + a11y)
- ✅ ADR-024 — Auto-FAIL → BUILDER loop policy (3-retry cap then escalate)
- ✅ This file's audit table updated

## V2 harness upgrade — what landed (2026-05-01)

- ✅ **ADR-025** — names the methodology **The Loop** (SDD outside / TDD inside, six phases). Splits PLANNER into two dispatches per feature (`mode: PLAN`, then `mode: TESTS`) for timeout resilience.
- ✅ **ADR-026** — collapses the gate count from three to **two**: Gate #1 fires once after both PLANNER dispatches return (user reviews `plan.md` + `tests.md` together); Gate #2 fires after SHIPPER deploys. PLAN auto-chains to TESTS without pausing.
- ✅ **ADR-027** — commit-prefix convention per Loop phase: `docs(plan-<feat>):` / `docs(tests-<feat>):` / `test(<feat>):` / `feat(<feat>):` / `docs(eval-<feat>):` / `chore(ship-<feat>):` + `docs(ship-<feat>):`. `git log --grep` now reconstructs phase history.
- ✅ `CLAUDE.md` § Methodology rewritten as the named "The Loop" contract.
- ✅ `.claude/commands/feature.md` rewritten: 7 steps, auto-chain PLAN→TESTS, single planning gate, tightened pre-flight SPEC validation (requires Intent / Inputs / Outputs / Edge cases / Acceptance criteria sections), mandatory status.md on every ship.
- ✅ `.claude/agents/planner.md` mode-scoped (PLAN mode vs TESTS mode); writing both files in one dispatch is now a contract violation.
- ✅ `.claude/agents/shipper.md` — `docs/status.md` update promoted to **Task 1 (MANDATORY, NON-NEGOTIABLE)**.

## V1 deferred

- 🟡 `.claude/hooks/post-tool-use.sh` — auto lint+typecheck after every Edit/Write tool call. **Deferred** — would slow BUILDER's red→green cycles by 5–10 s per edit, and Husky pre-commit already gates broken code at commit time. Reconsider if BUILDER's "I claimed X exists when it didn't" pattern recurs.
- 🟡 `.claude/hooks/stop.sh` (project-local) — auto-FAIL handling now lives in the slash command (step 4) instead of a hook. The user-global `~/.claude/stop-hook-git-check.sh` still nags about uncommitted changes; that's enough for V1.
- ❌ Vercel MCP setup steps in `CLAUDE.md` — `CLAUDE.md` is in `.prettierignore` (ADR-012, user-verbatim text). Vercel MCP setup lives here in `harness.md` and in the setup walkthrough I'd give in chat.

## Outstanding (still ❌ MISSING or 🟡 PARTIAL)

- Vercel MCP, Context7 MCP, Playwright MCP — wired in your Claude account but not loaded into this session; pick up on next chat
- Lighthouse — runs after Vercel MCP confirms a prod URL is reachable
- README pointer at this `harness.md` — todo (small)
