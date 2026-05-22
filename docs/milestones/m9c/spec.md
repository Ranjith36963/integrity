## Milestone 9c — Month view (Kingdom) + view switcher

> **Pillars:** § 0.9 (data model); the vocabulary ladder (Building = day, Castle = week, Kingdom = month, Empire = year); ADR-045 (v2 schema — `history` map + `currentDate` are the data source); M9b rollover (produces the `history` this view renders); the M0 design system (tokens, `Instrument Serif` / `JetBrains Mono`, Tailwind).

### Intent

M9a and M9b are pure back-end: a resolver and a storage layer. M9c is the first **visible** chunk of Milestone 9 — the calendar arrives. It introduces the **Kingdom view**: an Apple/Google-Calendar-style month grid where every day cell shows that day's score, so the user can see a whole month of effort at a glance. It also introduces the **view switcher** — a Day · Week · Month · Year segmented control — the navigation spine the rest of M9 hangs off. In M9c, **Day** and **Month** are live (Day = the existing Building view; Month = the new Kingdom grid); **Week** and **Year** are present but inert until M9d and M9e fill them in.

A day's score is **computed, never stored** (per the M9 storage strategy): the score for an archived day is `dayPct` over its `ArchivedDay` snapshot; today's score is `dayPct` over the live in-progress day. Tapping a day cell opens that day — today opens the editable Building view; a past day opens a read-only day detail.

**What this is NOT:** the Week (Castle, M9d) or Year (Empire, M9e) views — those segments exist in the switcher but are inert in M9c; editing or deleting an archived day (the past-day detail is strictly read-only); week/month/year _aggregate_ scores (a month total is M9d/M9e territory — M9c shows per-day scores in a month layout, not a single month score); changing the rollover, persistence, or scoring engines (all consumed unchanged); a server, routing-library, or multi-page rework beyond what the switcher needs.

### Inputs

- The live `AppState` — `history` (ISO-date → `ArchivedDay`), `currentDate`, `programStart`, and the in-progress day's `blocks`/`categories`/`looseBricks`.
- `dayPct` (and related scoring helpers) from `lib/dharma.ts`.
- The system clock — today's ISO date, to mark "today" and bound past vs future cells.
- The M0 design tokens, fonts, and existing components reusable for the read-only day detail.

### Outputs

- A **month-grid view** ("Kingdom"): a 7-column calendar (weekday columns, one row per week), day cells for every date of the displayed month with leading/trailing blanks for alignment, labeled with the month and year.
- Each in-range day cell renders its **date number** and a **score indicator** for that day's score.
- A **view switcher** — a Day · Week · Month · Year segmented control — that selects which view renders. Day → Building view; Month → Kingdom grid; Week / Year → inert (per SG-m9c-02).
- A score-aggregation helper in `lib/history.ts` — e.g. `dayScore(state, isoDate)` — returning a day's score (or a no-data sentinel) for any date, sourcing from `history`, the live day, or none.
- **Prev / next month** navigation on the Kingdom grid.
- A **read-only day-detail** surface: tapping a past day with history shows that day's blocks/bricks and score, non-editable.

### Edge cases

- **A day with an archived `history` entry** → cell shows `dayPct` of that `ArchivedDay`.
- **Today's cell** → shows `dayPct` of the live in-progress day; visually marked as "today".
- **A past, in-range date** (≥ `programStart`, < today) **with no `history` entry** (the app was not opened that day) → a distinct "missed / zero" indicator, visually different from a future blank.
- **A future date** (> today) → an inert, empty cell — no score, not tappable.
- **A date before `programStart`** → inert/empty — the program had not started.
- **First-ever run** (history empty, today is `programStart`) → the month grid renders with only today's cell scored; all other cells blank/inert; no crash on an empty `history`.
- **A month with no history at all** (navigated to a future or pre-start month) → grid renders, all cells blank/inert.
- **Month navigation across a year boundary** (Dec → Jan) → the grid and its label advance the year correctly.
- **An `ArchivedDay` whose score is 0** (a day with bricks, none done) vs **a missed day** (no entry) → both may read as zero but are sourced differently; the cell must not crash on either and should let the user distinguish "tried, scored 0" from "not opened" where the design allows.

### Acceptance criteria

**Month grid (Kingdom)**

1. The Month view renders a calendar grid for a given month: seven weekday columns, one row per week, a day cell for every date of that month, with leading/trailing blank cells aligning the 1st and last to their weekdays.
2. The grid is labeled with the displayed month name and year; weekday column headers are shown.
3. Each in-range day cell shows its date-of-month number and a score indicator reflecting that day's score.

**Day scores (computed, not stored)**

4. A `dayScore`-style helper in `lib/history.ts` returns a day's score for any ISO date: from `dayPct` of the `history` entry if archived; from `dayPct` of the live in-progress day if the date is `currentDate`; and a no-data sentinel for a date with neither.
5. A day cell with an archived `history` entry displays that archived day's `dayPct` score.
6. Today's cell displays the live in-progress day's `dayPct` score and is visually marked as today.
7. A past in-range date with no `history` entry renders a distinct missed/zero indicator, visually different from a future or pre-`programStart` blank cell.
8. A future date and a pre-`programStart` date render as inert empty cells with no score.

**View switcher**

9. A Day · Week · Month · Year segmented switcher is present; the active view is visually indicated.
10. Selecting **Day** renders the existing Building view; selecting **Month** renders the Kingdom grid. **Week** and **Year** segments are present but inert in M9c (per SG-m9c-02) — selecting them must not crash and must not be mistaken for a finished view.

**Navigation & interaction**

11. Prev / next controls move the Kingdom grid to the previous / next month, updating the grid and its month-year label; navigating across a December→January boundary advances the year.
12. Tapping today's cell opens the editable Building (Day) view; tapping a past in-range day that has a `history` entry opens a **read-only** day detail showing that day's blocks/bricks and score.
13. The past-day detail is strictly non-editable — it exposes no add/complete/edit affordance; tapping a future date or a pre-`programStart` date does nothing.

**Quality & regression**

14. Mobile viewport (430px) renders the month grid without overflow; axe a11y clean; the switcher and day cells are keyboard-operable and screen-reader-labeled.
15. No regression to M1–M9b behavior; quality gates clean (`tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green); E2E (deferred-to-preview) covers switching to Month, day-cell scores rendering, and opening a past day read-only.

### Open spec gaps (resolve at VERIFY)

- **SG-m9c-01 — View hosting: in-app view state vs Next routes.** The app today is effectively single-page (`app/page.tsx` → `BuildingClient`, which owns all state). The switcher could swap views via in-app state held above `BuildingClient`, or via Next.js routes (`/`, `/month`). Recommendation: in-app view state — a `view` field in a shell above `BuildingClient` — so the persisted `AppState` and the `usePersistedState` hook are not duplicated per route. Trade-off: routes give URL-addressable views and back-button support. Lean: in-app view state for M9c; revisit if deep-linking is specced. PLANNER decides, VERIFIER checks.
- **SG-m9c-02 — Inert Week/Year segments: disabled vs placeholder.** The switcher shows four segments but only Day/Month work in M9c. Recommendation: render Week and Year as visibly **disabled** segments (greyed, non-selectable) so the user is never shown a broken view — they light up when M9d/M9e land. Trade-off: a "coming soon" placeholder panel is friendlier but is throwaway UI. Lean: disabled segments. PLANNER finalizes.
- **SG-m9c-03 — Day-cell score visualization.** Each cell must show a day's score (0–100). Options: a numeric percent, a fill/heat intensity, a small ring (echoing M3's `<HeroRing>`), or a combination. Recommendation: a compact fill/heat treatment plus the date number — legible at month density on a 430px viewport — with the missed-day and empty states visually distinct. PLANNER chooses against the M0 tokens; VERIFIER checks contrast/a11y.
- **SG-m9c-04 — Read-only day-detail depth.** Tapping a past day opens a read-only detail. Options: full reuse of the `Timeline`/block components in a non-interactive mode, or a simpler read-only list of blocks/bricks with the day's score. Recommendation: the simpler read-only list for M9c (a faithful but lightweight summary) — full timeline reuse can come later if the user wants it. PLANNER decides, VERIFIER checks the no-edit guarantee (AC #13) holds whichever is chosen.
- **SG-m9c-05 — Reaching the calendar / switcher placement.** Where the switcher mounts (a persistent bar, a control in the `TopBar`/`BottomBar`, etc.) and how the user first moves from the Building view into the calendar. Recommendation: a persistent switcher in the app shell visible in both Day and Month views. PLANNER places it against the M0 layout; VERIFIER checks it does not regress the Building view's existing chrome.
