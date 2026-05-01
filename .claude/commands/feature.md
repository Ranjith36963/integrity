---
description: Run The Loop (PLAN → TESTS → IMPL → EVAL → SHIP) with three human gates for one named feature.
---

Run **The Loop** for: **$ARGUMENTS**

You are Main Claude, the orchestrator. Honor `CLAUDE.md` § Methodology (The Loop), ADR-013 (one feature per BUILDER dispatch), ADR-022 (one feature per PLANNER dispatch), ADR-024 (auto-FAIL loop), and **ADR-025 (The Loop: PLAN and TESTS are two separate PLANNER dispatches; three human gates — after PLAN, after TESTS, after SHIP)**.

## Pre-flight (before dispatching anything)

1. Read `/docs/spec.md`, `/docs/decisions.md`, `/docs/status.md`, `/phase1plan.md`. Confirm what `$ARGUMENTS` maps to. If the name doesn't match a planned feature group, **stop and ask the user** — don't guess.
2. Verify there is a SPEC entry in `/docs/spec.md` covering `$ARGUMENTS`. If not, **stop** — Phase 1 (SPEC, user-owned) is a precondition to The Loop.
3. Verify working tree clean (`git status -sb`). If dirty, surface and stop.
4. Verify branch is the active feature branch named in `status.md`. If not, stop.

## Pipeline — The Loop

### Step 1 — PLAN (PLANNER, plan.md only) → Gate #1

- Dispatch the `planner` subagent for **$ARGUMENTS only** (per ADR-022). Scope: **`plan.md` only — DO NOT touch `tests.md` in this dispatch** (per ADR-025).
- Pass: feature name, spec section to read, expected `plan.md` shape (file structure, data models, components, design tokens, decisions to honor), the migration table for any obsolete IDs.
- When PLANNER returns: commit + push the `plan.md` diff. Surface a tight summary to the user — paths edited, components/files added, decisions honored, any spec gaps it flagged.
- **STOP. Wait for the user's "approve plan"** (Gate #1 per ADR-025). Do not proceed without it.
- If the user pushes back on the design: amend `plan.md` with the resolution (or re-dispatch PLANNER with the correction), commit, then re-request approval.

### Step 2 — TESTS (PLANNER, tests.md only) → Gate #2

- Dispatch the `planner` subagent **a second time** for **$ARGUMENTS only**. Scope: **`tests.md` only — derived from the approved `plan.md`** (per ADR-025).
- Pass: feature name, the approved `plan.md` entry, IDs to start from, expected ID prefixes (continuing from current series), expected GIVEN/WHEN/THEN coverage (success cases, failure cases, edge cases).
- When PLANNER returns: commit + push the `tests.md` diff. Surface a tight summary to the user — new ID counts by U/C/E/A, coverage map (which `plan.md` section each ID proves), any spec gaps it flagged.
- **STOP. Wait for the user's "approve tests"** (Gate #2 per ADR-025). Do not proceed without it.
- If the user pushes back on coverage: amend `tests.md` with the resolution, commit, then re-request approval.

### Step 3 — IMPL (BUILDER, auto on Gate #2 approve)

- Dispatch the `builder` subagent for **$ARGUMENTS only** (per ADR-013). Pass: tests.md feature group, decisions.md to read, the migration table for any obsolete IDs, commitlint constraints (lowercase subject, allowed types).
- BUILDER runs the TDD inner loop: Red → Green → Refactor → Commit, one conventional commit per test ID.
- Push BUILDER's commits when it returns green.
- Auto-chain to Step 4. **Do not pause for confirmation** — that violates ADR-013.

### Step 4 — EVAL (EVALUATOR, auto on BUILDER green)

- Dispatch the `evaluator` subagent. Pass: feature name, base commit (last commit before BUILDER started), HEAD, the four BUILDER-flagged items, the spec section to map test IDs against.
- Run gates: `npm run eval` (lint + typecheck + vitest + e2e + a11y). Lighthouse only if a Vercel prod URL exists and is reachable.
- On **PASS** → auto-chain to Step 6.
- On **FAIL** → auto-chain to Step 5.

### Step 5 — Auto-FAIL loop (per ADR-024)

- Read EVALUATOR's gap list (G1..Gn).
- Re-dispatch BUILDER with: feature name unchanged, "FAIL retry" mode, the gap list as the only IDs to address.
- BUILDER returns → back to Step 4.
- After **3 consecutive FAILs on the same feature**, stop the loop and escalate to the user with the EVALUATOR's last gap list verbatim. ADR-024 caps the loop to prevent infinite retries.

### Step 6 — SHIP (SHIPPER, auto on PASS)

- If EVALUATOR proposed any new ADRs or required code-comment fixes (e.g. ADR-023's `useNow` SSR note), record them BEFORE dispatching SHIPPER. Commit those small fixes as your own `docs(harness): ...` commit.
- Dispatch the `shipper` subagent. Pass: feature name, EVALUATOR PASS report, latest gate counts, branch state, Vercel state (URL if known, "not connected" otherwise).
- SHIPPER updates `README.md`, `CHANGELOG.md` (`[unreleased]` block), `docs/status.md` (snapshot, pages table, open loops, next intended action), and pushes the branch.

### Step 7 — Surface preview URL → Gate #3

- Surface the branch alias preview URL from the latest SHIPPER report.
- Try `curl -I` if a Vercel MCP tool is available; otherwise note "user verification required".
- **STOP. Wait for the user's tap-test reaction** (Gate #3 per ADR-025). Their reaction becomes the input for the next `/feature <name>` invocation.

## Output to user, end of pipeline

Single tight report:

- 5 stage outcomes (PLAN ✅ files, TESTS ✅ ID-count, IMPL ✅ commit-shas, EVAL ✅ PASS|FAIL+gaps, SHIP ✅ URL)
- 3 gates honored (Gate #1 ✅ plan approved, Gate #2 ✅ tests approved, Gate #3 ⏸ awaiting user tap)
- Quality gates last run (lint, typecheck, vitest X/X, playwright Y/Y, axe Z/Z)
- Preview URL (or "Vercel not yet wired")
- Any post-ship action items in `status.md` open loops
- Single line for next move: "Tap the preview, then run `/feature <next>`"

## Constraints

- **Never push to `main`** unless the user explicitly authorized it for this feature in their `/feature` invocation.
- **Never run `--no-verify`** on any commit.
- **Never skip a gate** — Gates #1, #2, #3 are non-negotiable per ADR-025. If `npm run eval` fails, that's an automatic EVALUATOR FAIL, not a "minor issue."
- **Never bundle phases.** PLAN and TESTS are two separate PLANNER dispatches per ADR-025. Never let one PLANNER dispatch touch both `plan.md` and `tests.md`.
- **Never bundle features.** ADR-022 + ADR-013 are non-negotiable. If `$ARGUMENTS` looks like multiple features, stop and ask.

## When NOT to use this command

- Spec edits — those are user-direct edits to `/docs/spec.md` and `/phase1plan.md`, not pipeline runs (Phase 1 is user-owned per ADR-025).
- ADR additions that aren't tied to a feature ship (e.g. harness changes) — those are direct `docs(harness): …` commits by Main Claude.
- Production deploys (`main` push) — explicit user authorization, not a `/feature` flow.
