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
 ├─ spawns Planner ──→ writes plan.md + tests.md
 │                      ↓
 ├─ spawns Builder ──→ TDD loop, commits to branch
 │                      ↓
 ├─ spawns Evaluator ─→ runs Playwright, returns PASS/FAIL
 │                      ↓ (FAIL → loop back to Builder)
 │                      ↓ (PASS)
 ├─ spawns Shipper ──→ deploy, update README/CHANGELOG
 │
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

`/feature <name>` runs the whole pipeline.

```
# .claude/commands/feature.md

Run the full Dharma feature pipeline for: $ARGUMENTS

1. Spawn planner subagent. Read /docs/spec.md.
   Output: /docs/plan.md and /docs/tests.md.
   STOP. Show plan to user. Wait for approval.

2. On approval, spawn builder subagent.
   TDD loop. Commit each green test.
   Output: feature branch with passing tests.

3. Spawn evaluator subagent.
   Run Playwright + quality gates.
   Return PASS or FAIL report.

4. If FAIL: re-spawn builder with FAIL report. Loop.

5. If PASS: spawn shipper subagent.
   Deploy. Update docs.

6. Report done.
```

You type: `/feature brick-tracker`
Chain runs. You only step in at plan approval and final review.

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
| `/docs/decisions.md` | ADRs | yes; 23 ADRs | ✅ DONE (beyond doc) |
| `/docs/status.md` | live-snapshot | yes; SHIPPER updates | ✅ DONE (beyond doc) |
| `/CHANGELOG.md` | per-ship release log | yes; SHIPPER updates | ✅ DONE (beyond doc) |
| `.claude/agents/planner.md` | role definition | yes, ADR-022 enforces one-feature-per-dispatch | ✅ DONE |
| `.claude/agents/builder.md` | role definition | yes | ✅ DONE |
| `.claude/agents/evaluator.md` | role definition | yes | ✅ DONE |
| `.claude/agents/shipper.md` | role definition | yes | ✅ DONE |
| `.claude/commands/feature.md` | `/feature <name>` slash command | **does not exist** | ❌ MISSING |
| `.claude/hooks/post-tool-use.sh` | auto-run lint+typecheck after Builder commits | **does not exist** | ❌ MISSING |
| `.claude/hooks/pre-commit.sh` | block non-conventional commits | partial: `.husky/commit-msg` runs commitlint, `.husky/pre-commit` runs lint-staged | 🟡 PARTIAL (Husky-managed, not under `.claude/hooks/`) |
| `.claude/hooks/stop.sh` | auto-pipe Evaluator FAIL → Builder | partial: `~/.claude/stop-hook-git-check.sh` only checks for uncommitted git changes (user-global, not project) | 🟡 PARTIAL |
| Playwright MCP | Evaluator runs real browser via MCP | **not wired**; Evaluator runs `npx playwright test` directly via Bash | 🟡 PARTIAL |
| GitHub MCP | Shipper opens PRs, manages CI | **wired** — `mcp__github__*` tools available, scoped to `ranjith36963/integrity` | ✅ DONE |
| Vercel MCP | Shipper deploys + verifies prod URL | **not wired**; sandbox returns 403 on Vercel hosts; user does verification | ❌ MISSING |
| Context7 MCP | Builder pulls Next.js/Tailwind docs | **not wired**; Builder reads `node_modules/next/dist/docs/` | ❌ MISSING |
| Supabase MCP | future auth/data | **not wired**; not yet needed (M8 persist is localStorage-only) | ⏸️ DEFERRED |
| `npm run eval` | one-shot all-gates script | partial: `npm run verify` runs lint+typecheck+vitest only; no playwright/lighthouse/axe-bundled | 🟡 PARTIAL |
| Conventional commits | enforced at commit-msg | yes, via commitlint | ✅ DONE |
| Lighthouse gate | EVALUATOR runs `npx lighthouse` | **never runs in this sandbox** (no Vercel host reachable; deferred until prod URL) | 🟡 BLOCKED |
| Checkpoint commits | per-step durable progress | yes; PLANNER/BUILDER/EVALUATOR/SHIPPER each commit independently per ADR-013/022 | ✅ DONE (beyond doc) |
| Per-feature dispatch | one feature per agent run | yes; ADR-013 (BUILDER) + ADR-022 (PLANNER) | ✅ DONE (beyond doc) |
| Auto-FAIL → BUILDER loop | hands-off retry on EVALUATOR FAIL | **not wired**; Main Claude manually re-dispatches | ❌ MISSING |

## Score: 13 ✅ done · 5 🟡 partial · 5 ❌ missing · 1 ⏸️ deferred · 1 🟡 blocked

## What's actually happening (honest)

**The user prompts ~5–7 times per feature, not 3.** Today's loop:

1. Paste/edit spec
2. Approve plan (Gate #1)
3. Resolve any spec gap (e.g. SG-bld-11)
4. Acknowledge BUILDER green
5. Acknowledge EVALUATOR PASS (often combined with the next step)
6. Tap preview URL (Gate #2)
7. Greenlight next feature

The architecture above proposes 3. Closing the gap requires:

1. **Slash command** so the user types `/feature <name>` once instead of "plan X" → "approve" → BUILDER dispatch → "evaluate" → SHIPPER dispatch.
2. **Auto-FAIL → BUILDER hook** (currently Main Claude does this manually; mostly works but loses time on context-switching).
3. **Vercel MCP** so SHIPPER auto-verifies the URL instead of asking the user to tap.
4. **Combined `npm run eval` script** so EVALUATOR runs one command instead of 4–5 separate ones.

## Recommendation: closeable in one ~30-min "harness upgrade" feature

Do this as a single non-feature "harness ship" before Milestone 0. Adds the missing pieces above. Won't change any user-visible behavior; only reduces my prompts and the per-feature wall-clock by ~3–5 min.

Specifically:

- `.claude/commands/feature.md` — full chain trigger (writes the orchestrator prompt template)
- `.claude/hooks/post-tool-use.sh` — `npm run lint && npm run typecheck` after every BUILDER edit, exits non-zero on failure
- `.claude/hooks/stop.sh` — when an agent task finishes with EVALUATOR FAIL output, parse the gap list and auto-spawn BUILDER with it
- `package.json` add: `"eval": "npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run test:a11y"`
- Vercel MCP setup steps documented in `/CLAUDE.md` § Required Plugins
- README pointer at this `harness.md`

Roughly 200 lines of code + 1 ADR (ADR-024 — auto-FAIL loop policy). Then we're ~3 prompts per feature for real.
