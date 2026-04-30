# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship; Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB` at `8d3b9cb` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `8d3b9cb` — `chore(building): retire demo-fixture tests obsoleted by wipe-demo`
- **Production deploy:** no Vercel project linked → no public URL yet.
- **Last preview URL:** none — Vercel GitHub integration not yet connected to `Ranjith36963/integrity`

## Pages

| Page                                    | State                                                    | Notes                                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Building view** (today's routine) | **Pivot in flight — feature 1 of 8 (wipe-demo) shipped** | `wipe-demo` on feature branch `8d3b9cb`. Remaining: live-clock, persist, add-block, add-brick, edit-delete, brick-timer, recurrence-eval (features 2–8). One feature per dispatch per ADR-022. |
| 2 — Castle (week view)                  | Not started                                              | No spec section yet. Awaiting user input after Page 1 pivot ships.                                                                                                                             |
| 3 — Kingdom (month view)                | Not started                                              | No spec section yet.                                                                                                                                                                           |
| 4 — Empire (year view)                  | Not started                                              | No spec section yet.                                                                                                                                                                           |

## Open loops

- **Vercel project not connected.** Wire `Ranjith36963/integrity` to a Vercel project and enable the GitHub integration. Once connected, any branch push generates a preview URL automatically.
- **wipe-demo shipped to feature branch — main push pending user authorization.** Branch `claude/build-dharma-pwa-8WVNB` is at `8d3b9cb`; has not been merged to `main`.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Lighthouse scores not yet measured.** No deploy URL available to run against. Measure after Vercel is wired.

## Spec gaps resolved

`SG-bld-01..10` — all closed against Page 1; resolutions live in `docs/tests.md` under "Spec gaps — resolved".

## Quality gates (Evaluator PASS on `8d3b9cb`)

| Gate                       | Result                                 |
| -------------------------- | -------------------------------------- |
| ESLint                     | clean                                  |
| `tsc --noEmit`             | clean                                  |
| Vitest                     | 62/62 passed                           |
| Playwright (mobile-chrome) | 9/9 passed                             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010) |
| axe-core                   | 5/5 passed, 0 violations               |
| Lighthouse                 | not measured — no deploy URL           |

## Next intended action

Dispatch PLANNER for **live-clock** (feature 2 of 8 of the Page 1 empty-toolkit pivot). PLANNER reads `docs/spec.md` and the pivot plan; writes updated `docs/plan.md` and `docs/tests.md` for the live-clock feature only.

Parallel item: **Wire Vercel** to `Ranjith36963/integrity` so previews auto-deploy. Not blocking.
