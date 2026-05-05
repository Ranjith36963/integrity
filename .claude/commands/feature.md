---
description: Run The Loop (PLAN → TESTS → IMPL → EVAL → SHIP) with two human gates for one named feature.
---

Run **The Loop** for: **$ARGUMENTS**

You are Main Claude, the orchestrator. Honor `CLAUDE.md` § Methodology (The Loop), ADR-013 (one feature per BUILDER dispatch), ADR-022 (one feature per PLANNER dispatch), ADR-024 (auto-FAIL loop), ADR-025 (PLAN and TESTS are two separate PLANNER dispatches), and **ADR-026 (two human gates: one after the planner phase finishes, one after the preview is live)**. Honor ADR-027 commit-prefix conventions on every commit you create.

## Pre-flight (before dispatching anything)

1. Read `/docs/spec.md`, `/docs/decisions.md`, `/docs/status.md`, `/phase1plan.md`. Confirm what `$ARGUMENTS` maps to. If the name doesn't match a planned feature group, **stop and ask the user** — don't guess.
2. **Validate the SPEC entry for `$ARGUMENTS` in `/docs/spec.md`.** It must contain all five required sections under the feature's heading: **Intent**, **Inputs**, **Outputs**, **Edge cases**, **Acceptance criteria**. Use grep to confirm each subheading is present and non-empty (more than the heading itself). If any section is missing or empty, **stop** and surface a concrete request to the user: "spec entry for `$ARGUMENTS` is missing the following sections: …. Please complete `/docs/spec.md` before The Loop runs." Do not invent the missing content.
3. Verify working tree clean (`git status -sb`). If dirty, surface and stop.
4. Verify branch is the active feature branch named in `status.md`. If not, stop.

## Pipeline — The Loop

### Step 1 — PLAN (PLANNER, `mode: PLAN`)

- Dispatch the `planner` subagent for **$ARGUMENTS only** (per ADR-022). Scope: **`plan.md` only — DO NOT touch `tests.md` in this dispatch** (per ADR-025). Pass `mode: PLAN` at the top of the dispatch prompt.
- Pass: feature name, spec section to read, expected `plan.md` shape (file structure, data models, components, design tokens, decisions to honor), the migration table for any obsolete IDs.
- When PLANNER returns: commit + push the `plan.md` diff using prefix `docs(plan-<feature>): …` (per ADR-027). Do NOT pause for user review.
- **Auto-chain to Step 2** (per ADR-026). The planning gate fires after Step 2, not here.

### Step 2 — TESTS (PLANNER, `mode: TESTS`) → Gate #1 (planning gate)

- Dispatch the `planner` subagent **a second time** for **$ARGUMENTS only**. Scope: **`tests.md` only — derived from the just-written `plan.md`** (per ADR-025). Pass `mode: TESTS` at the top of the dispatch prompt.
- Pass: feature name, the just-written `plan.md` entry, IDs to start from, expected ID prefixes (continuing from current series), expected GIVEN/WHEN/THEN coverage (success cases, failure cases, edge cases).
- When PLANNER returns: commit + push the `tests.md` diff using prefix `docs(tests-<feature>): …` (per ADR-027).
- Surface a tight summary to the user covering BOTH commits: paths edited, components/files added in plan, test ID counts by U/C/E/A, coverage map (which plan.md section each ID proves), any spec gaps flagged.
- **STOP. Wait for the user's "approve"** (Gate #1 per ADR-026). The user reviews `plan.md` and `tests.md` together as one design artifact. Do not proceed without approval.
- If the user pushes back: amend `plan.md` and/or `tests.md` (or re-dispatch the appropriate PLANNER mode), commit with the relevant phase prefix, then re-request approval.

### Step 3 — IMPL (BUILDER, auto on Gate #1 approve)

- Dispatch the `builder` subagent for **$ARGUMENTS only** (per ADR-013). Pass: tests.md feature group, decisions.md to read, the migration table for any obsolete IDs, commitlint constraints (lowercase subject, allowed types), the ADR-027 prefix convention (`test(<feature>):` for red, `feat(<feature>):` / `fix(<feature>):` for green).
- BUILDER runs the TDD inner loop: Red → Green → Refactor → Commit, one conventional commit per test ID.
- Push BUILDER's commits when it returns green.
- Auto-chain to Step 4. **Do not pause for confirmation** — that violates ADR-013.

### Step 4 — EVAL (EVALUATOR, auto on BUILDER green)

- Dispatch the `evaluator` subagent. Pass: feature name, base commit (last commit before BUILDER started), HEAD, the four BUILDER-flagged items, the spec section to map test IDs against.
- Run gates: `npm run eval` (lint + typecheck + vitest + e2e + a11y). Lighthouse only if a Vercel prod URL exists and is reachable.
- If you commit any eval-driven follow-ups (e.g., new ADRs, comment fixes), use prefix `docs(eval-<feature>): …` or `chore(eval-<feature>): …` per ADR-027.
- On **PASS** → auto-chain to Step 6.
- On **FAIL** → auto-chain to Step 5.

### Step 5 — Auto-FAIL loop (per ADR-024)

- Read EVALUATOR's gap list (G1..Gn).
- Re-dispatch BUILDER with: feature name unchanged, "FAIL retry" mode, the gap list as the only IDs to address.
- BUILDER returns → back to Step 4.
- After **3 consecutive FAILs on the same feature**, stop the loop and escalate to the user with the EVALUATOR's last gap list verbatim. ADR-024 caps the loop to prevent infinite retries.

### Step 6 — SHIP (SHIPPER, auto on PASS)

- Dispatch the `shipper` subagent. Pass: feature name, EVALUATOR PASS report, latest gate counts, branch state, Vercel state (URL if known, "not connected" otherwise), the ADR-027 prefix convention (`chore(ship-<feature>):` / `docs(ship-<feature>):`).
- SHIPPER updates `README.md`, `CHANGELOG.md` (`[unreleased]` block), and **`docs/status.md` (mandatory — every ship commit includes a status.md update)**, then pushes the branch.
- A SHIP commit that does not modify `docs/status.md` is a contract violation. If SHIPPER returns commits without the status.md update, reject and re-dispatch with that explicit instruction.

### Step 7 — Surface preview URL → Gate #2 (preview gate)

- Surface the branch alias preview URL from the latest SHIPPER report.
- Try `curl -I` if a Vercel MCP tool is available; otherwise note "user verification required".
- **STOP. Wait for the user's tap-test reaction** (Gate #2 per ADR-026). Their reaction becomes the input for the next `/feature <name>` invocation.

## Output to user, end of pipeline

Single tight report:

- 5 stage outcomes (PLAN ✅ files, TESTS ✅ ID-count, IMPL ✅ commit-shas, EVAL ✅ PASS|FAIL+gaps, SHIP ✅ URL)
- 2 gates honored (Gate #1 ✅ planning approved, Gate #2 ⏸ awaiting user tap)
- Quality gates last run (lint, typecheck, vitest X/X, playwright Y/Y, axe Z/Z)
- Preview URL (or "Vercel not yet wired")
- Status.md updated? ✅ / ❌ (must be ✅ per ADR-026 + SHIPPER contract)
- Any post-ship action items in `status.md` open loops
- Single line for next move: "Tap the preview, then run `/feature <next>`"

## Constraints

- **Never push to `main`** unless the user explicitly authorized it for this feature in their `/feature` invocation.
- **Never run `--no-verify`** on any commit.
- **Never skip a gate** — Gates #1 and #2 are non-negotiable per ADR-026. If `npm run eval` fails, that's an automatic EVALUATOR FAIL, not a "minor issue."
- **Never bundle phases.** PLAN and TESTS are two separate PLANNER dispatches per ADR-025. Never let one PLANNER dispatch touch both `plan.md` and `tests.md`.
- **Never bundle features.** ADR-022 + ADR-013 are non-negotiable. If `$ARGUMENTS` looks like multiple features, stop and ask.
- **Never ship without status.md.** Every SHIP commit MUST update `docs/status.md`. Reject SHIPPER output that violates this and re-dispatch.
- **Always honor ADR-027 commit prefixes.** Mis-prefixed commits make `git log --grep` useless for phase auditing.

## When NOT to use this command

- Spec edits — those are user-direct edits to `/docs/spec.md` and `/phase1plan.md`, not pipeline runs (Phase 1 is user-owned per ADR-025).
- ADR additions that aren't tied to a feature ship (e.g. harness changes) — those are direct `docs(harness): …` commits by Main Claude.
- Production deploys (`main` push) — explicit user authorization, not a `/feature` flow.
