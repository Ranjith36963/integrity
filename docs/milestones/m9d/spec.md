## Milestone 9d — Week view (Castle) + period scoring

> **Pillars:** § 0.9 (data model); the vocabulary ladder (Building = day, Castle = week, Kingdom = month, Empire = year); ADR-045 (v2 schema — `history` is the read-only source); M9b rollover; M9c (`MonthView`, `ViewSwitcher`, `PastDayDetail`, `lib/monthGrid.ts`, `dayScore`/`NO_DATA` — all consumed/extended); the M0 design system.

### Intent

M9c made days visible in a month grid. M9d adds the **Castle view** — the week — and with it the first **period aggregate score**. A week is seven days; the Castle view lays them out and, crucially, shows the **week's aggregate score** so the user can answer "how did last week go, versus the week before." It fills the inert **Week** segment of the M9c view switcher.

This is the first time scores roll _up_. Per the M9 storage strategy, the week aggregate is **computed on read** — the average of the week's per-day scores — never stored. The honest-scoreboard rule: a day the user was in-range for but never opened (a missed day) counts as **0** in the week average; future days and days before `programStart` are simply excluded (the week isn't over / the program hadn't started). An inflated average that silently skips missed days would lie about the week.

**What this is NOT:** the Year (Empire, M9e) view — that segment stays disabled; storing week/month totals (all period scores are derived on read); changing the day-score engine (`dayPct`/`dayScore` consumed unchanged); editing archived days; a new day-detail surface (the M9c `PastDayDetail` is reused verbatim); changing rollover, persistence, or the M9c month view.

### Inputs

- The live `AppState` — `history`, `currentDate`, `programStart`, the in-progress day.
- `dayScore(state, isoDate)` and `NO_DATA` from `lib/history.ts` (M9c) — the per-day score source.
- `lib/monthGrid.ts` date helpers (M9c) and/or a small week-date helper — UTC-drift-free.
- The system clock — today's ISO date.
- M9c's `ViewSwitcher`, `PastDayDetail`, the M0 design tokens.

### Outputs

- A **Week view** ("Castle"): a seven-day layout for the week containing a reference date — the dates Sunday→Saturday (matching the M9c month grid's Sunday-start convention), each showing its date and a per-day score indicator.
- A **week aggregate score** displayed prominently — the Castle score.
- A `weekScore`-style aggregation helper in `lib/history.ts` — given the state and a reference date, returns the week's aggregate (or a no-data sentinel).
- **Prev / next week** navigation.
- The **Week** segment of the `ViewSwitcher` becomes enabled (its `disabled` flag dropped); selecting it renders the Castle view.
- Tapping a day routes exactly as M9c: today → editable Building view; a past day with history → the read-only `PastDayDetail`.

### Edge cases

- **A week containing today** → days up to and including today score normally (today = live `dayPct`); days after today within the week are future and are excluded from the aggregate.
- **A fully past week** → all seven days score (archived `dayPct`, or 0 for a missed in-range day); the aggregate averages all seven.
- **A fully future week** → every cell inert; the aggregate is the no-data sentinel, not `0`.
- **A week straddling `programStart`** → days before `programStart` are inert and excluded from the average; days from `programStart` on are included.
- **A week straddling a month or year boundary** → the seven dates and the range label cross the boundary correctly.
- **Empty `history`, first run** → the week shows today scored, other in-range past days as 0, future days inert; the aggregate reflects only the in-range non-future days.
- **A missed day (no `history` entry, in range, past)** vs **a 0-score archived day** → both contribute 0 to the average but render with their distinct M9c cell treatments.

### Acceptance criteria

**Week layout (Castle)**

1. The Week view renders a seven-day layout for the week containing a given reference date: the seven dates Sunday→Saturday, consistent with the M9c month grid's Sunday-start convention.
2. The view is labeled with the week's date range (e.g. "May 17–23, 2026"), crossing month/year boundaries correctly.
3. Each day shows its date and a per-day score indicator, reusing the M9c score-visualization vocabulary (archived / today / missed / future / pre-`programStart` states).

**Week aggregate — period scoring (computed, not stored)**

4. A `weekScore`-style helper in `lib/history.ts` returns the week's aggregate for a reference date: the average of `dayScore` over the week's in-range, non-future days, where a missed in-range past day counts as **0**, and future + pre-`programStart` days are excluded from both numerator and denominator.
5. The Week view displays the week aggregate score prominently as the Castle score.
6. A week with no in-range, non-future days (entirely future, or entirely before `programStart`) yields a no-data aggregate — rendered as a no-data state, never `0` and never a crash.
7. Today's day contributes its live `dayPct` to the week aggregate.

**View switcher**

8. The **Week** segment of the `ViewSwitcher` is now enabled; selecting it renders the Castle view, and the active-view indicator updates. The **Year** segment remains disabled (M9e).

**Navigation & interaction**

9. Prev / next controls move the Week view to the previous / next week, updating the seven-day layout, the date-range label, and the aggregate; navigation across month and year boundaries works.
10. Tapping today's day opens the editable Building (Day) view; tapping a past in-range day with a `history` entry opens the read-only `PastDayDetail` (reused from M9c).
11. Tapping a future day or a pre-`programStart` day does nothing.

**Quality & regression**

12. Mobile viewport (430px) renders the week layout without overflow; axe a11y clean; the week's days and nav controls are keyboard-operable and screen-reader-labeled.
13. No regression to M1–M9c behavior; quality gates clean (`tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green); E2E (deferred-to-preview) covers switching to Week, per-day scores + the aggregate rendering, and opening a past day read-only.

### Open spec gaps (resolve at VERIFY)

- **SG-m9d-01 — Period-average semantics: missed day = 0.** AC #4 specifies a missed in-range past day counts as 0 in the week average (the honest-scoreboard rule). The alternative — excluding missed days from the average — inflates the score by only counting days the user opened. Recommendation: count missed as 0, as AC #4 states; it is the truthful reading of "how did the week go." VERIFIER ratifies this is the intended scoring semantics before BUILDER implements; the same rule will govern M9e's month/year aggregates.
- **SG-m9d-02 — Week layout + aggregate presentation.** The seven days could be a horizontal 7-column strip, a vertical 7-row list, or reuse the M9c `DayCell` vocabulary at week scale; the aggregate could be a ring (echoing M3's `<HeroRing>`), a large numeral, or a labeled stat. Recommendation: reuse the M9c day-cell score vocabulary for consistency, with the week aggregate as a prominent ring/numeral above the seven days. PLANNER decides against the M0 tokens and the 430px constraint; VERIFIER checks a11y/contrast.
- **SG-m9d-03 — Week-start day.** AC #1 fixes Sunday-start to match M9c. PLANNER must confirm the M9c month grid is in fact Sunday-start (it renders `Sun…Sat` headers) and that the week helper's first-day math agrees; VERIFIER checks the two views never disagree on which dates form a week.
