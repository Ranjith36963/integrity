## Milestone 9e — Year view (Empire) + the complete calendar

> **Pillars:** § 0.9 (data model); the vocabulary ladder (Building = day, Castle = week, Kingdom = month, Empire = year); ADR-045 (v2 schema — `history` is the read-only source); ADR-046 (period-aggregate helpers are pure); M9c (`MonthView`, `ViewSwitcher`, `dayScore`); M9d (`weekScore`, the period-scoring pattern); the M0 design system.

### Intent

M9e is the **final** chunk of Milestone 9 — the calendar completes. It introduces the **Empire view**: a twelve-month overview of a year, each month cell showing that month's score, with the year's aggregate score displayed prominently. It fills the last inert segment of the view switcher: after M9e, all four of Day · Week · Month · Year are live, and the user can traverse their record at every zoom level — day, week, month, year.

M9e adds the last two period-aggregate helpers — `monthScore` and `yearScore` — built exactly on the ADR-046 pattern M9d established for `weekScore`: pure functions, "today" derived from `state.currentDate` (never the clock), the honest-scoreboard rule (an in-range day the user never opened counts as 0; future and pre-`programStart` days excluded), and the `NO_DATA` sentinel for a period with no qualifying day. Tapping a month opens the M9c Month (Kingdom) view for that month.

**What this is NOT:** any new score _engine_ — `monthScore`/`yearScore` are averages of `dayScore`, consumed unchanged; storing period totals (all aggregates are computed on read); editing archived days; a sixth zoom level beyond the year (the "year" is the Empire — the top of the ladder for Phase 1); changing rollover, persistence, or the M9c/M9d views; multi-year scrolling history beyond simple prev/next year navigation.

### Inputs

- The live `AppState` — `history`, `currentDate`, `programStart`, the in-progress day.
- `dayScore(state, isoDate)` and `NO_DATA` from `lib/history.ts` (M9c); the `weekScore`/period-scoring pattern from M9d.
- Date helpers from `lib/monthGrid.ts` / `lib/weekGrid.ts` — UTC-drift-free; M9e adds year/month iteration as needed.
- The system clock — read once, as `state.currentDate` already encodes "today" (ADR-046).
- M9c's `ViewSwitcher` and `MonthView`, the M0 design tokens.

### Outputs

- A **Year view** ("Empire"): a twelve-month overview for a given year — twelve month cells, each labeled with its month name and showing a score indicator for that month's score.
- A **year aggregate score** displayed prominently — the Empire score.
- Two pure aggregation helpers in `lib/history.ts` — `monthScore(state, year, monthIndex)` and `yearScore(state, year)` — each returning a score or the `NO_DATA` sentinel, following ADR-046.
- **Prev / next year** navigation.
- The **Year** segment of the `ViewSwitcher` becomes enabled — all four segments now live.
- Tapping a month cell opens the M9c Month (Kingdom) view for that month.

### Edge cases

- **The current year** → months up to and including the current month score normally (the current month is partial — its `monthScore` averages only its in-range non-future days, including today's live day); months after the current month are future and contribute nothing.
- **A fully past year** → all twelve months score; the year aggregate averages every in-range day.
- **A fully future year** → every month cell is a no-data state; the year aggregate is the `NO_DATA` sentinel, not `0`.
- **The year containing `programStart`** → months entirely before `programStart` are no-data; the month containing `programStart` counts only days from `programStart` on.
- **First run** (history empty, today is `programStart`) → only the current month has a score (driven by today's live day); all other months no-data; the year aggregate reflects only the in-range days.
- **A month with bricks but a 0 score** vs **a month never opened** → both may compute toward the aggregate as low/zero, but a fully-unopened in-range past month averages its missed days as 0, while a future month is excluded entirely.
- **Prev/next navigation far past `programStart` or far into the future** → renders an all-no-data year without crashing.

### Acceptance criteria

**Year grid (Empire)**

1. The Year view renders a twelve-month overview for a given year: twelve month cells, each labeled with its month name.
2. The view is labeled with the displayed year.
3. Each month cell shows a score indicator reflecting that month's score, with a distinct no-data treatment for months that have no in-range non-future days.

**Period scoring — `monthScore` & `yearScore` (computed, not stored; ADR-046)**

4. A `monthScore(state, year, monthIndex)` helper in `lib/history.ts` returns a month's aggregate: the average of `dayScore` over that month's in-range, non-future days, where a missed in-range past day counts as **0**, and future + pre-`programStart` days are excluded from both numerator and denominator; `NO_DATA` when no day qualifies. It is pure — "today" is `state.currentDate`, never the clock.
5. A `yearScore(state, year)` helper returns the year's aggregate: the average of `dayScore` over the year's in-range, non-future days, by the same honest-scoreboard rule; `NO_DATA` when no day qualifies. (It averages days directly — consistent with `weekScore` — so it need not equal the mean of the twelve `monthScore`s.)
6. The Year view displays the year aggregate prominently as the Empire score; a year with no qualifying day shows a no-data state, never `0` and never a crash.
7. The current month's cell and the year aggregate both include today's live `dayPct`.

**View switcher — complete**

8. The **Year** segment of the `ViewSwitcher` is now enabled; selecting it renders the Empire view, and the active-view indicator updates. All four segments — Day, Week, Month, Year — are now live; no segment remains disabled.

**Navigation & interaction**

9. Prev / next controls move the Year view to the previous / next year, updating the twelve month cells, the year label, and the year aggregate.
10. Tapping a month cell opens the M9c Month (Kingdom) view for that month — the Month view renders that month per its own M9c behavior (including empty/future months).

**Quality & regression**

11. Mobile viewport (430px) renders the twelve-month grid without overflow; axe a11y clean; month cells and nav controls are keyboard-operable and screen-reader-labeled.
12. No regression to M1–M9d behavior; quality gates clean (`tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green); E2E (deferred-to-preview) covers switching to Year, month scores + the year aggregate rendering, and tapping a month to open the Month view.
13. The view switcher round-trips at every zoom level — Day ↔ Week ↔ Month ↔ Year all reachable, all rendering off the one shared `AppState`, with no view leaking into another.

### Open spec gaps (resolve at VERIFY)

- **SG-m9e-01 — `yearScore`: average-of-days vs average-of-months.** AC #5 fixes `yearScore` as the average of `dayScore` over the year's in-range non-future days — the same day-averaging `weekScore` uses. The alternative — averaging the twelve `monthScore` values — over-weights short or sparsely-filled months. Recommendation: average days directly, per AC #5; the year aggregate and the mean of the month cells may differ slightly, which is correct and expected. VERIFIER ratifies; the same reasoning applied to `weekScore` (ADR-046).
- **SG-m9e-02 — Year-grid layout + aggregate presentation.** Twelve months could be a 3×4 or 4×3 grid of cells, or a list; the month cell shows a score (reuse the M9c heat vocabulary at month scale, or a compact variant); the year aggregate echoes M9d's week-aggregate ring/numeral. Recommendation: a 3×4 month-cell grid reusing the established score-heat vocabulary, with the year aggregate as a prominent ring above it — consistent with M9d. PLANNER decides against the M0 tokens and the 430px constraint; VERIFIER checks a11y/contrast.
- **SG-m9e-03 — Tapping an out-of-range month.** A tapped month may be entirely future or entirely before `programStart`. Recommendation: tapping any month cell opens the M9c Month view for it regardless — the Month view already renders empty/future months correctly (M9c), and month prev/next already lets the user roam freely, so a no-op would be inconsistent. PLANNER confirms; VERIFIER checks the Month view handles the handed-off month without crashing.
