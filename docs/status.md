# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship; Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB`
- **Last commit:** `a60244b` — `docs(claude): codify permanent orchestration flow`
- **Production deploy:** none (Vercel not yet wired; Shipper has not run)
- **Last preview URL:** none

## Pages

| Page                                    | State             | Notes                                                                                                     |
| --------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| **1 — Building view** (today's routine) | **In evaluation** | Builder closed all 61 Page 1 test IDs (one dropped per SG-bld-04). Awaiting Evaluator pass + Shipper run. |
| 2 — Castle (week view)                  | Not started       | No spec section yet.                                                                                      |
| 3 — Kingdom (month view)                | Not started       | No spec section yet.                                                                                      |
| 4 — Empire (year view)                  | Not started       | No spec section yet.                                                                                      |

## Open loops

- **Page 1 evaluation pending.** All gates already green per builder report (lint, typecheck, vitest 65/65, playwright 26/26 mobile-chrome). Evaluator must independently confirm; on PASS, Shipper runs.
- **Vercel project not connected.** Shipper will need a Vercel link or fallback. Decide before first ship (see ADR-014 if added).
- **Mobile-Safari (WebKit) Playwright project disabled** in this sandbox; re-enable when running in an environment with WebKit binaries.

## Spec gaps resolved

`SG-bld-01..10` — all closed against Page 1; resolutions live in `docs/tests.md` under "Spec gaps — resolved".

## Quality gates (last full run on `0924032`)

| Gate                       | Result                                   |
| -------------------------- | ---------------------------------------- |
| ESLint                     | clean                                    |
| `tsc --noEmit`             | clean                                    |
| Vitest                     | 65/65 passed (13 files)                  |
| Playwright (mobile-chrome) | 26/26 passed                             |
| Playwright (mobile-safari) | not run — WebKit unavailable             |
| axe-core                   | 0 violations (covered by A-bld-001..005) |
| Lighthouse                 | not yet measured                         |

## Next intended action

Dispatch the EVALUATOR on Page 1 against `a60244b`. On PASS, dispatch the SHIPPER. On FAIL, loop back to BUILDER per `CLAUDE.md` § Orchestration Flow.
