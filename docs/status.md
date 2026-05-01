# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship; Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB` at `a33b80b` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `a33b80b` — `docs(harness): add adr-023 — useNow paints server clock on first render`
- **Last preview URL:** `https://integrity-git-claude-buil-f6ede9-rahulranjith369-5644s-projects.vercel.app/` (user tap-test required — sandbox cannot curl Vercel hosts)

## Pages

| Page                                    | State                                                                                      | Notes                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Building view** (today's routine) | **Pivot in flight — features 1–2 of 8 (wipe-demo + live-clock) shipped to feature branch** | Remaining: persist, add-block, add-brick, edit-delete, brick-timer, recurrence-eval (features 3–8). One feature per dispatch per ADR-022. |
| 2 — Castle (week view)                  | Not started                                                                                | No spec section yet. Awaiting user input after Page 1 pivot ships.                                                                        |
| 3 — Kingdom (month view)                | Not started                                                                                | No spec section yet.                                                                                                                      |
| 4 — Empire (year view)                  | Not started                                                                                | No spec section yet.                                                                                                                      |

## Open loops

- **Vercel project connected; main push pending user authorization.** Branch `claude/build-dharma-pwa-8WVNB` is at `a33b80b`; has not been merged to `main`. Preview URL auto-updates with each branch push.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Lighthouse scores not yet measured.** No prod URL available to run against. Measure after `main` merge.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses a brittle class-name container query (`section .mt-1.text-\[12px\]`) to locate the day-counter line. Add `data-testid="building-counter"` to Hero in a future polish chunk.
- **DST off-by-one in `dayNumber()` (N4).** `Math.floor((endLocalMidnight - startLocalMidnight) / 86_400_000)` returns `N-1` when a Spring-forward shift sits inside the window. Out of scope until `persist` ships real `programStart` math; PLANNER should add DST fixtures when planning the persist feature.

## Spec gaps resolved

`SG-bld-01..11` — all closed against Page 1; resolutions live in `docs/tests.md` under "Spec gaps — resolved".

## Quality gates (Evaluator PASS on `a33b80b`)

| Gate                       | Result                                 |
| -------------------------- | -------------------------------------- |
| ESLint                     | clean                                  |
| `tsc --noEmit`             | clean                                  |
| Vitest                     | 68/68 passed                           |
| Playwright (mobile-chrome) | 9/9 passed                             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010) |
| axe-core                   | 5/5 passed, 0 violations               |
| Lighthouse                 | not measured — no prod URL             |

## Next intended action

Dispatch PLANNER for **persist** (feature 3 of 8 of the Page 1 empty-toolkit pivot). Persist ships real `programStart` math, wires `defaultState()` + `AppState` from `lib/data.ts`, and resolves the DST off-by-one open loop (N4) by introducing proper DST fixtures.
