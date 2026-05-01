---
description: Run the full Dharma per-feature pipeline (PLANNER → BUILDER → EVALUATOR → SHIPPER) for one named feature.
---

Run the full Dharma per-feature pipeline for: **$ARGUMENTS**

You are Main Claude, the orchestrator. Honor `CLAUDE.md` § Orchestration Flow (permanent), ADR-013 (one feature per BUILDER dispatch), ADR-022 (one feature per PLANNER dispatch), and ADR-024 (auto-FAIL loop).

## Pre-flight (before dispatching anything)

1. Read `/docs/spec.md`, `/docs/decisions.md`, `/docs/status.md`, `/phase1plan.md`. Confirm what `$ARGUMENTS` maps to. If the name doesn't match a planned feature group, **stop and ask the user** — don't guess.
2. Verify working tree clean (`git status -sb`). If dirty, surface and stop.
3. Verify branch is the active feature branch named in `status.md`. If not, stop.

## Pipeline

### Step 1 — PLANNER

- Dispatch the `planner` subagent for **$ARGUMENTS only** (per ADR-022). Pass: feature name, IDs to start from, expected file edits in `plan.md` and `tests.md`, expected test ID prefixes (continuing from current series).
- When PLANNER returns: commit + push the plan/tests diff. Surface a tight summary to the user — paths edited, new ID counts by U/C/E/A, any spec gaps it flagged.
- **STOP. Wait for the user's "approve"** (Gate #1 per ADR-013). Do not proceed without it.
- If the user pushes back on a gap: amend `tests.md` with the resolution, commit, then continue.

### Step 2 — BUILDER (auto on user approve)

- Dispatch the `builder` subagent for **$ARGUMENTS only** (per ADR-013). Pass: tests.md feature group, decisions.md to read, the migration table for any obsolete IDs, commitlint constraints (lowercase subject, allowed types).
- Push BUILDER's commits when it returns green.
- Auto-chain to Step 3. **Do not pause for confirmation** — that violates ADR-013.

### Step 3 — EVALUATOR (auto on BUILDER green)

- Dispatch the `evaluator` subagent. Pass: feature name, base commit (last commit before BUILDER started), HEAD, the four BUILDER-flagged items, the spec section to map test IDs against.
- Run gates: `npm run eval` (lint + typecheck + vitest + e2e + a11y). Lighthouse only if a Vercel prod URL exists and is reachable.
- On **PASS** → auto-chain to Step 5.
- On **FAIL** → auto-chain to Step 4.

### Step 4 — Auto-FAIL loop (per ADR-024)

- Read EVALUATOR's gap list (G1..Gn).
- Re-dispatch BUILDER with: feature name unchanged, "FAIL retry" mode, the gap list as the only IDs to address.
- BUILDER returns → back to Step 3.
- After **3 consecutive FAILs on the same feature**, stop the loop and escalate to the user with the EVALUATOR's last gap list verbatim. ADR-024 caps the loop to prevent infinite retries.

### Step 5 — SHIPPER (auto on PASS)

- If EVALUATOR proposed any new ADRs or required code-comment fixes (e.g. ADR-023's `useNow` SSR note), record them BEFORE dispatching SHIPPER. Commit those small fixes as your own `docs(harness): ...` commit.
- Dispatch the `shipper` subagent. Pass: feature name, EVALUATOR PASS report, latest gate counts, branch state, Vercel state (URL if known, "not connected" otherwise).
- SHIPPER updates `README.md`, `CHANGELOG.md` (`[unreleased]` block), `docs/status.md` (snapshot, pages table, open loops, next intended action), and pushes the branch.

### Step 6 — Surface preview URL + Gate #2

- Surface the branch alias preview URL from the latest SHIPPER report.
- Try `curl -I` if a Vercel MCP tool is available; otherwise note "user verification required".
- **STOP. Wait for the user's tap-test reaction** (Gate #2 per ADR-013). Their reaction becomes the input for the next `/feature <name>` invocation.

## Output to user, end of pipeline

Single tight report:

- 4 stage outcomes (PLANNER ✅ ID-count, BUILDER ✅ commit-shas, EVALUATOR ✅ PASS|FAIL+gaps, SHIPPER ✅ URL)
- Quality gates last run (lint, typecheck, vitest X/X, playwright Y/Y, axe Z/Z)
- Preview URL (or "Vercel not yet wired")
- Any post-ship action items in `status.md` open loops
- Single line for next move: "Tap the preview, then run `/feature <next>`"

## Constraints

- **Never push to `main`** unless the user explicitly authorized it for this feature in their `/feature` invocation.
- **Never run `--no-verify`** on any commit.
- **Never skip a gate** — if `npm run eval` fails, that's an automatic EVALUATOR FAIL, not a "minor issue."
- **Never bundle features.** ADR-022 + ADR-013 are non-negotiable. If `$ARGUMENTS` looks like multiple features, stop and ask.

## When NOT to use this command

- Spec edits — those are user-direct edits to `/docs/spec.md` and `/phase1plan.md`, not pipeline runs.
- ADR additions that aren't tied to a feature ship (e.g. harness changes) — those are direct `docs(harness): …` commits by Main Claude.
- Production deploys (`main` push) — explicit user authorization, not a `/feature` flow.
