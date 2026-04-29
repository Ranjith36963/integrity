# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship; Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB` at `c3ef9f1` · `main` at `c3ef9f1` (fast-forwarded)
- **Last commit:** `c3ef9f1` — `chore(gitignore): untrack playwright test-results and report dirs`
- **Production deploy:** **`main` pushed** to origin, but no Vercel project linked → no public URL yet.
- **Last preview URL:** none — Vercel GitHub integration not yet connected to `Ranjith36963/integrity`

## Pages

| Page                                    | State                                  | Notes                                                                                                                         |
| --------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **1 — Building view** (today's routine) | **Shipped to `main` — pending Vercel** | Evaluator PASS on `0924032`. 65/65 Vitest, 26/26 Playwright (mobile-chrome), 0 axe violations. Merged to `main` at `c3ef9f1`. |
| 2 — Castle (week view)                  | Not started                            | No spec section yet. Awaiting user input before Planner dispatch.                                                             |
| 3 — Kingdom (month view)                | Not started                            | No spec section yet.                                                                                                          |
| 4 — Empire (year view)                  | Not started                            | No spec section yet.                                                                                                          |

## Open loops

- **Vercel project not connected.** Wire `Ranjith36963/integrity` to a Vercel project and enable the GitHub integration. Once connected, the `main` push will trigger a production deploy automatically; any branch push will generate a preview URL.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Lighthouse scores not yet measured.** No deploy URL available to run against. Measure after Vercel is wired.

## Spec gaps resolved

`SG-bld-01..10` — all closed against Page 1; resolutions live in `docs/tests.md` under "Spec gaps — resolved".

## Quality gates (Evaluator PASS on `0924032`)

| Gate                       | Result                                   |
| -------------------------- | ---------------------------------------- |
| ESLint                     | clean                                    |
| `tsc --noEmit`             | clean                                    |
| Vitest                     | 65/65 passed (13 files)                  |
| Playwright (mobile-chrome) | 26/26 passed                             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)   |
| axe-core                   | 0 violations (covered by A-bld-001..005) |
| Lighthouse                 | not measured — no deploy URL             |

## Next intended action

Two tracks, in parallel:

1. **Wire Vercel** to `Ranjith36963/integrity` so `main` auto-deploys to production. Once live, run Lighthouse against the URL.
2. **Page 2 — Castle (week view).** Dispatch the Planner once the user provides or approves the spec section for that page. On Planner output, the harness runs Builder → Evaluator → Shipper automatically per `CLAUDE.md` § Orchestration Flow.
