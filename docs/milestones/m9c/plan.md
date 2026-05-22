## Milestone 9c — Month view (Kingdom) + view switcher — Plan

### Context

M9a and M9b shipped the calendar's back-end: a recurrence resolver and a `history` store that archives every finished day. M9c makes that record **visible** — the first M9 screen. It adds the **Kingdom view** (an Apple/Google-Calendar-style month grid, each day cell showing that day's score) and the **view switcher** (a Day · Week · Month · Year segmented control — Day and Month live, Week and Year inert until M9d/M9e). Day scores are computed on read via `dayPct`, never stored (M9 storage strategy / ADR-045). Tapping today opens the editable Building view; tapping a past archived day opens a strictly read-only detail. M9c changes no persistence, no rollover, no scoring engine — it only reads `history`/`currentDate` off `AppState` and adds one additive helper to `lib/history.ts`.

### Feature grouping

This plan is **one feature group: `m9c`** (one BUILDER dispatch). Test IDs in `tests.md` group under the same `m9c` slug. The sub-sections below (shell / month grid / day cell / switcher / day detail / `dayScore` helper / month date math) are organizational, not separate features — they ship together in one dispatch.

### File structure

**New files**

| Path                                                                                                                                                                        | Change                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(building)/AppShell.tsx`                                                                                                                                               | NEW. `"use client"`. Resolves SG-m9c-01. Owns the in-app `view` state (`"day" \| "month"`), calls `usePersistedState()` **once**, and renders the `ViewSwitcher` plus either `BuildingClient` (Day) or `MonthView` (Month). Receives `[state, dispatch]` from the single `usePersistedState()` call and passes them down — see View hosting. |
| `components/ViewSwitcher.tsx`                                                                                                                                               | NEW. The Day · Week · Month · Year segmented control. Props per Components. Week/Year segments rendered `disabled` (SG-m9c-02).                                                                                                                                                                                                              |
| `components/MonthView.tsx`                                                                                                                                                  | NEW. The Kingdom month-grid screen: month-year label, weekday header row, 7-column grid of `DayCell`s, prev/next month nav. Owns the displayed-month state.                                                                                                                                                                                  |
| `components/DayCell.tsx`                                                                                                                                                    | NEW. One calendar day cell — date number + score indicator, or a blank/inert cell. Resolves SG-m9c-03.                                                                                                                                                                                                                                       |
| `components/PastDayDetail.tsx`                                                                                                                                              | NEW. Read-only day-detail surface for an archived day (SG-m9c-04).                                                                                                                                                                                                                                                                           |
| `lib/monthGrid.ts`                                                                                                                                                          | NEW. Pure date-math module for the month grid: `monthGridCells(year, month)`, `addMonth`/`subMonth`, `parseISO`, weekday/days-in-month helpers. UTC-drift-free (see Date math). Co-located test `lib/monthGrid.test.ts`.                                                                                                                     |
| `lib/monthGrid.test.ts`                                                                                                                                                     | NEW. Co-located Vitest unit suite. Contents are the TESTS/BUILDER deliverable; listed only for completeness.                                                                                                                                                                                                                                 |
| `lib/history.test.ts`                                                                                                                                                       | EXISTS — extended with `dayScore` cases (TESTS/BUILDER deliverable; not authored here).                                                                                                                                                                                                                                                      |
| `app/(building)/AppShell.test.tsx`, `components/ViewSwitcher.test.tsx`, `components/MonthView.test.tsx`, `components/DayCell.test.tsx`, `components/PastDayDetail.test.tsx` | NEW test files (Vitest + Testing Library). Contents are the TESTS/BUILDER deliverable.                                                                                                                                                                                                                                                       |

**Modified files**

| Path                                | Change                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                      | One-line change: render `<AppShell />` instead of `<BuildingClient />`. `page.tsx` stays a thin server shell.                                                                                                                                                                                                                       |
| `lib/history.ts`                    | **Additive only.** Add the exported `dayScore(state, isoDate)` helper (see Data model). `rollover`/`seedFreshDay`/`seedBrick` are **byte-identical** — no edit to existing exports.                                                                                                                                                 |
| `app/(building)/BuildingClient.tsx` | **Surgical change:** stop calling `usePersistedState()` internally; instead accept `state` + `dispatch` as props from `AppShell` (so the hook runs exactly once — see View hosting). All other logic, JSX, and the `EditModeProvider` wrapper are unchanged. This is the minimum edit that lets Day and Month share one `AppState`. |

**Not modified — confirmed:** `lib/dharma.ts` (`dayPct`, `today`, `dateLabel` consumed unchanged — no scoring-engine edit), `lib/persist.ts` (no schema change — schema stays `v2`), `lib/usePersistedState.ts` (no rollover change; it still runs once, now lifted into `AppShell`), `lib/types.ts` (`AppState`/`ArchivedDay`/`Recurrence`/`Block`/`Brick` consumed unmodified — M9b already placed `currentDate`/`history` on `AppState`, see M9b plan SG-m9b decision), `lib/appliesOn.ts` (not needed — month-cell scores come from `history`, not recurrence resolution). `app/layout.tsx`, `app/globals.css` untouched (M9c uses existing M0 tokens — see Design tokens).

### View hosting (resolves SG-m9c-01)

**SG-m9c-01 — RESOLVED → in-app `view` state in a new shell above `BuildingClient`. No Next routes.**

Grounded in the real `app/` structure: today `app/page.tsx` renders `<BuildingClient />`, and `BuildingClient` calls `usePersistedState()` internally (line 75) — it owns all state, the two-pass hydration, the rollover, and the save effect. If the switcher used Next routes (`/`, `/month`), each route's page would mount its own `BuildingClient`/`MonthView`, and `usePersistedState` would run **twice** — two independent hydration passes, two save effects racing on `dharma:v1`, and the rollover firing on every cross-route navigation. That is a correctness hazard, not just duplication.

**Decision:** introduce `app/(building)/AppShell.tsx` — a single `"use client"` shell that:

1. Calls `usePersistedState()` **exactly once**, owning the `[state, dispatch]` pair.
2. Owns `const [view, setView] = useState<"day" | "month">("day")` — session-only React state, not persisted (M9c persists nothing new; refresh returns to Day, the app's home).
3. Renders the `ViewSwitcher` (persistent, see SG-m9c-05) and, below it, either `<BuildingClient state={state} dispatch={dispatch} />` (Day) or `<MonthView state={state} dispatch={dispatch} onOpenDay={…} />` (Month).

`usePersistedState` therefore lives **once, in `AppShell`** — never duplicated. `BuildingClient` is refactored from "calls the hook" to "receives `state`/`dispatch` as props"; every other line of `BuildingClient` (sheets, handlers, `EditModeProvider`, JSX) is unchanged. `MonthView` reads the same `state` object — Day and Month are two renders of one `AppState`, guaranteeing the month grid sees the live in-progress day and the same `history`.

Trade-off acknowledged: routes would give URL-addressable views and browser-back support. Per the spec SG-m9c-01 recommendation, that is **deferred** — revisit if deep-linking is specced (it is not in M9). No new ADR: this is the spec's recommended option, and `AppShell` is a conventional client-shell composition, not a decision that exceeds an Accepted ADR.

### Components

All four new components are `"use client"`. They reuse M0 tokens and existing primitives; no new `app/globals.css` token.

**`<ViewSwitcher>` (NEW) — resolves SG-m9c-02, SG-m9c-05**

- Props: `{ view: "day" | "month"; onSelect: (view: "day" | "month") => void }`.
- Renders a segmented control of four segments — **Day**, **Week**, **Month**, **Year** — as a single horizontal row of `<button>`s inside a `role="tablist"` container; each live segment is `role="tab"` with `aria-selected`.
- **SG-m9c-02 — RESOLVED → Week and Year are visibly disabled segments.** Week and Year render as `<button disabled aria-disabled="true">` segments, greyed (`color: var(--ink-dim)`, reduced opacity), non-focusable-as-tab, never call `onSelect`. They are present so the user sees the full navigation spine, but cannot select a broken view. No "coming soon" placeholder panel (throwaway UI). They light up in M9d/M9e by removing the `disabled` flag — no structural change. Tapping a disabled segment is a no-op (no crash, no view change — AC #10).
- Day and Month are live segments: tapping calls `onSelect("day" | "month")`. The active segment is visually indicated — filled background `var(--accent)` with `var(--bg)` text (matching `Button` `primary`), inactive segments transparent with `var(--ink-dim)` text.
- **SG-m9c-05 — RESOLVED → persistent switcher in the app shell, rendered by `AppShell` directly below `TopBar`-level chrome, visible in BOTH Day and Month views.** It mounts inside `AppShell` above the active view. In Day view it sits between the existing `TopBar` (which `BuildingClient` still renders) and the `Hero` — i.e. `AppShell` renders the switcher as a thin bar at the top of the `max-w-[430px]` column, and `BuildingClient`/`MonthView` render below it. It does not replace or restyle `TopBar`, the dock, or any existing Building chrome (VERIFIER checks no Building-view regression). The switcher is how the user first reaches the calendar — there is no other entry point in M9c.
- Each segment ≥ 44px tall (ADR-031). Sizing: four equal-width segments across the 430px column.
- A11y: container `role="tablist" aria-label="Calendar view"`; live segments `role="tab"`, `aria-selected={view === segment}`, keyboard-operable (Enter/Space activate; left/right arrow moves between the two enabled tabs, skipping disabled ones); disabled segments `aria-disabled="true"` and removed from the tab sequence. Reduced-motion: the active-segment background transition collapses to instant.

**`<MonthView>` (NEW) — the Kingdom grid**

- Props: `{ state: AppState; onOpenDay: (isoDate: string) => void }`. (`dispatch` is not needed by `MonthView` itself — it is read-only over `state`; `AppShell` may still pass it for the day-detail mount, see below. Plan baseline: `MonthView` takes `state` + `onOpenDay`.)
- Owned state: `const [displayed, setDisplayed] = useState<{ year: number; month: number }>(…)` initialized to today's year/month (month `0–11`). Session-only; not persisted.
- Renders:
  - **Month-year label** — e.g. "May 2026" — in `var(--font-display)` (Instrument Serif), `var(--fs-22)` (AC #2).
  - **Prev / next controls** — two `<button>`s flanking the label (lucide-react `ChevronLeft` / `ChevronRight`), ≥ 44px hit area, `aria-label="Previous month"` / `"Next month"`. Tapping calls `setDisplayed(subMonth(...))` / `addMonth(...)` from `lib/monthGrid.ts` (AC #11).
  - **Weekday header row** — seven `<th>`-style cells "Sun"…"Sat" (matches the `0=Sun…6=Sat` convention locked by M9a — see `RecurrenceChips` `WEEKDAYS`), `var(--font-ui)`, `var(--fs-10)`, `var(--ink-dim)` (AC #2).
  - **Day grid** — a CSS `grid` of `grid-template-columns: repeat(7, 1fr)`; cells produced by `monthGridCells(displayed.year, displayed.month)` (see Date math). One `<DayCell>` per cell — blank cells for leading/trailing alignment, in-range cells for each date of the month (AC #1).
- For each in-range date, `MonthView` computes the cell's classification + score and passes them to `<DayCell>` (see DayCell props). Classification uses `today()` from `lib/dharma` (the single clock read in `MonthView`) and `state.programStart`.
- A11y: the grid is `role="grid"` with `role="row"`/`role="gridcell"`; weekday headers `role="columnheader"`. 430px: `repeat(7,1fr)` with `aspect-ratio: 1` cells fits without horizontal overflow (AC #14).
- Reduced-motion: month transitions on prev/next are instant (no slide animation in M9c — keep it simple; polish is later).

**`<DayCell>` (NEW) — resolves SG-m9c-03**

- Props: `{ kind: "blank" | "future" | "pre-start" | "missed" | "scored"; date?: string; dayOfMonth?: number; score?: number; isToday?: boolean; onOpen?: () => void }`. `MonthView` is the sole producer of `kind` — see the kind table below.
- **SG-m9c-03 — RESOLVED → a compact heat-fill cell: the date number always shown, plus a background fill whose intensity encodes the 0–100 score.** Chosen over a per-cell ring (too small/illegible at month density on 430px) and over a bare numeric percent (noisy in a 7-wide grid). The cell is a square (`aspect-ratio: 1`), `border-radius: 6px`, with:
  - **Date number** — top-left, `var(--font-ui)`, `var(--fs-12)`, `var(--ink)`.
  - **Score heat fill** — the cell background is `var(--accent)` (#fbbf24) at an alpha that scales with score: `alpha = 0.12 + (score/100) * 0.78` (range `0.12`→`0.90`), echoing the M3 `BrickChip` 12%-base / `BlueprintBar` `0.3 + pct*0.7` heat pattern. A small numeric `${Math.round(score)}` is also rendered bottom-right at `var(--fs-10)` so the exact score is legible for screen-zoom users and to disambiguate low scores (the heat scale below).
- **Per-`kind` rendering (the five visual states — AC #3, #5, #6, #7, #8):**

  | `kind`                                                                | Visual                                                                                                                                                                                                               | Tappable                          |
  | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
  | `scored` (archived OR today, score ≥ 0)                               | date number + accent heat fill at `score`-scaled alpha + numeric score                                                                                                                                               | yes → `onOpen()`                  |
  | `missed` (past, in-range `[programStart, today)`, no `history` entry) | date number in `var(--ink-dim)`; flat `var(--card)` background with a 1px `var(--card-edge)` border; **no heat fill, no numeric score** — a "tried nothing / not opened" gray (ADR-038 forgiveness — gray, no shame) | no (read-only, no detail to show) |
  | `future` (date > today)                                               | date number in `var(--ink-dim)` at low opacity; transparent background; no border                                                                                                                                    | no                                |
  | `pre-start` (date < `programStart`)                                   | identical to `future` — date number faint, transparent, no fill                                                                                                                                                      | no                                |
  | `blank` (leading/trailing alignment cell)                             | empty `<div>`, no date number, no background, `aria-hidden`                                                                                                                                                          | no                                |

  Distinctness required by AC #7: `missed` has a **visible card-colored bordered chip** (the day existed in-program but scored nothing), whereas `future`/`pre-start` are **borderless transparent** (the day is not actionable). A `scored` cell with score `0` (a day with bricks, none done) shows the **minimum-alpha accent fill (`0.12`) + the numeral "0"** — visually distinct from a `missed` cell which has no fill and no numeral (resolves the spec's "0-score vs missed" edge case).

- **Today** (`isToday`): the `scored` cell additionally gets a 2px `var(--accent)` ring (`outline` or `box-shadow`) so today is unmistakable regardless of its score (AC #6).
- Tappable cells are `<button>`; non-tappable cells are plain `<div>` (no button role, not focusable) — AC #13's "tapping a future / pre-start date does nothing" is structural, not a guarded handler.
- Heat-fill transition: none needed (cells render at a fixed score per month render); no motion token. Reduced-motion irrelevant here.
- A11y: tappable cell `<button>` with `aria-label` = `"<weekday>, <Month> <day>, <year>, score <N> percent"` for `scored`, `"<Month> <day>, missed"` for `missed`. `future`/`pre-start`/`blank` cells are `aria-hidden="true"` or carry a plain date label with no interactive role. Contrast: accent-on-dark and `--ink` text meet AA at the M0 token set (VERIFIER checks the heat-fill alpha floor `0.12` still yields a legible date numeral — the numeral is `var(--ink)` `#f5f1e8`, which is text-over-near-`--bg`, AA-safe).

**`<PastDayDetail>` (NEW) — resolves SG-m9c-04**

- Props: `{ archivedDay: ArchivedDay; isoDate: string; onClose: () => void }`.
- **SG-m9c-04 — RESOLVED → a simple, lightweight read-only list — NOT a reuse of the interactive `Timeline`/`TimelineBlock` chain.** `Timeline`/`TimelineBlock`/`BrickChip` are built around tap-to-expand, `onTickToggle`, `onUnitsOpenSheet`, `onAddBrick` — interactive affordances. Reusing them in a "non-interactive mode" means threading "disable everything" flags through four components and hoping no path leaks an edit. The no-edit guarantee (AC #13) is far cleaner to prove with a purpose-built read-only component that **has no mutation props at all**.
- Renders, all non-interactive:
  - A header — the archived date formatted via `dateLabel(isoDate)` from `lib/dharma` ("Wed, Apr 29"), plus that day's score via `dayScore(state, isoDate)` (equivalently `dayPct` over the `ArchivedDay`), shown as a read-only `${Math.round(score)}%`.
  - A flat list of the day's blocks: each block's name, time range (`fmtRange`), and its bricks listed below as static rows (brick name + `brickLabel(brick)` from `lib/dharma` for the "done / units" text). Loose bricks listed in a trailing "Loose bricks" group.
  - A **Close** affordance (`<button aria-label="Close">`, lucide-react `X`, or a "Back to month" `Button` `variant="secondary"`) → calls `onClose()`, returning to the month grid.
- **Strictly read-only (AC #12, #13):** `PastDayDetail` imports no reducer action, takes no `dispatch`, renders **no** `BrickChip`/`TimelineBlock`/`AddBrickSheet`/stepper/toggle — there is no add, complete, edit, or delete affordance anywhere in its tree. It is pure presentation over a frozen `ArchivedDay` snapshot. The only interactive element is `Close`.
- Mounting: `MonthView` owns `const [openDate, setOpenDate] = useState<string | null>(null)`. Tapping a `scored` past-day cell sets `openDate`; `MonthView` then renders `<PastDayDetail>` (as an overlay panel over the grid, or replacing the grid — overlay panel chosen, dismiss via `onClose`). Tapping **today's** cell does NOT open `PastDayDetail` — instead `MonthView` calls `onOpenDay(today)` which `AppShell` handles by `setView("day")` (AC #12: "tapping today's cell opens the editable Building (Day) view").
- A11y: the detail panel is `role="region" aria-label="Day detail"` (a non-modal read-only panel — not a `dialog`, since it has no form). Keyboard: `Close` is focusable; `Esc` closes (optional, recommended). 430px: single-column list, no overflow.
- Reuse note: `PastDayDetail` MAY reuse the M0 `ui/Button` for its Close control and the `lib/dharma` formatters (`dateLabel`, `fmtRange`, `brickLabel`, `dayPct`). It must NOT reuse `BrickChip`/`TimelineBlock`.

### Data model

**No new persisted type. No schema change. Schema stays `v2` (ADR-045).** M9c reads `AppState` — `history`, `currentDate`, `programStart`, `blocks`/`categories`/`looseBricks` — all already present post-M9b. `ArchivedDay`, `Recurrence`, `Block`, `Brick`, `Category`, `AppState` unions are consumed **unmodified**.

**The `dayScore` helper — additive export in `lib/history.ts` (AC #4):**

```ts
// lib/history.ts — NEW additive export (rollover/seedFreshDay/seedBrick unchanged)
export const NO_DATA = null; // explicit no-data sentinel

export function dayScore(state: AppState, isoDate: string): number | null;
```

- **Signature:** `dayScore(state: AppState, isoDate: string): number | null`. `state` is the live `AppState`; `isoDate` is an ISO `YYYY-MM-DD` string (assumed well-formed — internal callers, M8 boundary stance).
- **Return contract — three sources, one sentinel:**
  - **Archived day** — `isoDate in state.history` → `dayPct(...)` over that `ArchivedDay`. `dayPct` expects an `AppState`-shaped value; an `ArchivedDay` is `{ blocks, categories, looseBricks }` and `dayPct` (lib/dharma.ts:49) reads **only** `state.blocks` and `state.looseBricks` (`categories` is not read by `dayPct`). So `dayScore` calls `dayPct` by passing an object satisfying the fields `dayPct` reads — the cleanest call is `dayPct({ ...archivedDay, programStart: state.programStart, currentDate: isoDate, history: {} })` (a structurally-complete `AppState`), or, since `dayPct` reads only two fields, the BUILDER may pass `archivedDay` cast to the `dayPct` parameter type. **Plan baseline: build a complete `AppState`-shaped object from the `ArchivedDay` so the call is type-safe with zero cast** — `dayPct` ignores the extra fields. Returns a `number` in `[0,100]`.
  - **Today (the live in-progress day)** — `isoDate === state.currentDate` → `dayPct(state)` directly (the live `AppState` already is the in-progress day). Returns a `number` in `[0,100]`.
  - **Neither** — `isoDate` is not a `history` key and not `currentDate` → return `NO_DATA` (`null`). The caller distinguishes this from a real `0`.
- **Precedence:** `history` is checked first, then `currentDate`. In normal operation a date is in exactly one of the two (rollover archives the old `currentDate` and advances `currentDate` to today before anything renders) — but if both ever matched, `history` wins (the archived snapshot is the finished record). VERIFIER: this ordering is deterministic and documented.
- **What each cell-state maps to:** a **future date**, a **pre-`programStart` date**, and a **past in-range date the user never opened** all return `NO_DATA` from `dayScore` — `dayScore` itself does not know "future" vs "missed" vs "pre-start" (it is a pure history lookup). The **classification** (which of `future`/`pre-start`/`missed`/`scored` a cell is) is `MonthView`'s job, computed from `isoDate` vs `today()` vs `state.programStart` — see DayCell `kind` table. A `0`-score day returns the **number `0`**, never the sentinel — that is how a "tried, scored 0" day is distinguished from a "missed" day.
- **Purity:** `dayScore` reads no clock and no `localStorage`; it is a pure function of `(state, isoDate)`. Co-located unit tests drive it directly (`lib/history.test.ts`).

**Grid cell → date mapping (`lib/monthGrid.ts`):**

```ts
export type GridCell =
  | { kind: "blank" }
  | { kind: "date"; iso: string; dayOfMonth: number };

export function monthGridCells(year: number, month: number): GridCell[];
```

- `monthGridCells(year, month)` (`month` 0–11) returns the full grid as a flat array: **leading blanks** = the weekday index (`0=Sun…6=Sat`) of the 1st of the month; then one `date` cell per day `1..daysInMonth`; then **trailing blanks** to pad the final week to a multiple of 7. The array length is always a multiple of 7 (5 or 6 rows). `MonthView` chunks it into rows of 7 for `role="row"` grouping.
- Each `date` cell carries its ISO `YYYY-MM-DD` string (zero-padded) and `dayOfMonth`. `MonthView` then classifies each `date` cell and computes its score via `dayScore`.

### Date math

The month grid needs: the weekday of the 1st of a month, days-in-month, and prev/next-month navigation including the year boundary. Per M9a's `parseLocalDate` lesson (SG-m9a-02) and the spec's explicit instruction, **no `new Date(isoString)`** anywhere — that parses as UTC midnight and drifts a day in negative-offset zones.

`lib/monthGrid.ts` uses the **multi-arg local-time `Date` constructor** — the exact pattern `lib/dayOfYear.ts` (`new Date(y, m, d)`) and `lib/appliesOn.ts`'s `parseLocalDate` already use, and which `lib/dharma.ts`'s `today()` relies on:

- **Weekday of the 1st:** `new Date(year, month, 1).getDay()` → `0–6` (`0=Sun`). The multi-arg constructor builds local-midnight — no UTC drift, leap-safe, DST-safe.
- **Days in month:** `new Date(year, month + 1, 0).getDate()` — day `0` of the next month is the last day of `month` (the standard JS idiom; `month+1` rolls the year correctly for December).
- **Prev / next month:** `addMonth({year, month})` → `month === 11 ? {year: year+1, month: 0} : {year, month: month+1}`; `subMonth` is the mirror (`month === 0 ? {year-1, 11} : {year, month-1}`). Pure integer arithmetic — no `Date` object, no drift, correct across the Dec→Jan boundary (AC #11, spec "Month navigation across a year boundary").
- **ISO string build:** `iso(year, month, day)` → `` `${y}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` `` — string assembly, no `Date`. This produces the same `YYYY-MM-DD` form `today()` and `history` keys use, so equality comparisons against `state.currentDate` and `history` keys are exact.
- `today()` from `lib/dharma` supplies today's ISO for the "is today / future / past" classification — it is already local-date-safe.

No new date dependency; no `date-fns`/`dayjs`. `lib/monthGrid.ts` is small and pure.

### Dependencies

**None.** No new `package.json` entry. `lucide-react` (already installed) supplies `ChevronLeft`/`ChevronRight`/`X`. `motion/react` (already installed) is used only for the optional reduced-motion check on the switcher's active-segment transition. Vitest + Testing Library + Playwright + `@axe-core/playwright` (all installed) cover the tests.

### Design tokens

All from the existing M0 surface in `app/globals.css` — **no new token, `globals.css` untouched.**

| Use                                                                                     | Token                                                                                | Value                 |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| Month-year label, day-detail header                                                     | `--font-display` (Instrument Serif), `--fs-22`                                       | serif, 1.375rem       |
| Weekday headers, date numbers, switcher labels, score numerals                          | `--font-ui` (JetBrains Mono), `--fs-10` / `--fs-12`                                  | mono, 0.625 / 0.75rem |
| Day-detail block/brick body text                                                        | `--font-ui`, `--fs-12` / `--fs-14`                                                   | mono                  |
| Score heat fill                                                                         | `--accent` `#fbbf24` at scaled alpha `0.12 + (score/100)*0.78`                       | accent amber          |
| Active switcher segment                                                                 | bg `--accent`, text `--bg` `#07090f`                                                 | filled amber chip     |
| Inactive / disabled switcher segment, future/pre-start date numbers, missed date number | `--ink-dim` `rgba(245,241,232,0.5)`                                                  | dimmed ink            |
| `missed` cell background + border                                                       | `--card` `#0f1d33` fill, `--card-edge` `#1e2d47` 1px border                          | flat card             |
| `scored`/`today` cell ring                                                              | `--accent` 2px outline                                                               | amber ring            |
| Cell / panel corner radius, gaps                                                        | `--sp-4` / `--sp-8` / `--sp-12`; `border-radius: 6px` (matches `TimelineBlock`)      | M0 spacing scale      |
| Switcher active-segment transition                                                      | `--motion-tap` `100ms ease-out`; collapses to instant under `prefers-reduced-motion` | M0 motion             |

**Score-heat scale:** linear, `alpha = 0.12 + (score/100) * 0.78`, so `score 0` → alpha `0.12` (faint but present), `score 100` → alpha `0.90` (near-solid amber). This mirrors the established M3 `BrickChip` (12% base) and `BlueprintBar` (`0.3 + pct*0.7`) heat conventions. The numeric score in the cell corner backs up the heat for precise reading and AA. **Missed vs empty vs today:** `missed` = flat `--card` + `--card-edge` border, no fill, no numeral; `future`/`pre-start` = transparent, no border, faint numeral; `today` = whatever its `scored` heat is **plus** a 2px `--accent` ring.

**Important — do NOT use `var(--surface-2)`:** the existing `HeroRing` and `TimelineBlock` reference `var(--surface-2)`, but that token is **not defined** in `app/globals.css` (the file defines `--card`, `--card-edge`, `--ink-dim`, `--bg-elev` — no `--surface-2`). M9c components must use the **defined** tokens above (`--card` / `--card-edge` for cell backgrounds/borders). The BUILDER must not copy `--surface-2` from `HeroRing`.

### Edge cases

Each spec Edge case mapped to its planned code path:

| Spec edge case                                                      | Planned code path                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Day with an archived `history` entry                                | `dayScore` → `history` branch → `dayPct(ArchivedDay-as-AppState)`; `DayCell` `kind: "scored"`, heat fill.                                                                                                                                                |
| Today's cell                                                        | `MonthView` classifies `isoDate === today()` → `isToday: true`; `dayScore` → `currentDate` branch → `dayPct(state)`; `DayCell` `kind: "scored"` + 2px accent ring.                                                                                       |
| Past, in-range date (≥ `programStart`, < today), no `history` entry | `MonthView` classifies: `isoDate < today() && isoDate >= programStart && dayScore === NO_DATA` → `kind: "missed"`; flat `--card` chip, no fill, no numeral, not tappable (AC #7).                                                                        |
| Future date (> today)                                               | `MonthView`: `isoDate > today()` → `kind: "future"`; transparent, faint numeral, not tappable, no `onOpen` (AC #8).                                                                                                                                      |
| Date before `programStart`                                          | `MonthView`: `isoDate < programStart` → `kind: "pre-start"`; identical inert treatment to `future` (AC #8).                                                                                                                                              |
| First-ever run (history empty, today === `programStart`)            | `history` is `{}`; only today's cell classifies `scored` (via `currentDate` branch); all other in-month cells are `pre-start` (before today) or `future` (after). No crash on empty `history` — `dayScore` does a plain `in` check (AC + spec).          |
| A month with no history at all (future/pre-start month)             | `monthGridCells` still produces the grid; every `date` cell classifies `future` or `pre-start`; grid renders, all inert (spec edge case).                                                                                                                |
| Month navigation across year boundary (Dec → Jan)                   | `addMonth({2026,11})` → `{2027,0}`; `subMonth({2027,0})` → `{2026,11}`; label + grid advance the year (AC #11).                                                                                                                                          |
| `ArchivedDay` score 0 vs missed day                                 | `scored` with `score === 0` → minimum-alpha (`0.12`) accent fill + numeral "0"; `missed` → no fill, no numeral, card chip. Visually distinct (spec edge case; AC #7). `dayScore` returns `0` (number) for the former, `NO_DATA` (`null`) for the latter. |
| Tapping a `missed` / `future` / `pre-start` / `blank` cell          | Non-`scored` cells render as plain `<div>` with no `onClick`/`button` role — tapping is structurally a no-op (AC #13).                                                                                                                                   |
| Tapping today's cell                                                | `MonthView` → `onOpenDay(today)` → `AppShell` `setView("day")` → Building view (AC #12).                                                                                                                                                                 |
| Tapping a past `scored` (archived) cell                             | `MonthView` `setOpenDate(iso)` → renders `<PastDayDetail>` read-only (AC #12).                                                                                                                                                                           |
| Selecting Week or Year segment                                      | Disabled `<button>`, no `onSelect` fired, no view change, no crash (AC #10).                                                                                                                                                                             |
| Very long block/brick names in `PastDayDetail`                      | Single-line ellipsis (`overflow:hidden; white-space:nowrap; text-overflow:ellipsis`) — same pattern as `TimelineBlock` title.                                                                                                                            |
| 430px viewport                                                      | `repeat(7,1fr)` square cells, switcher four equal segments, day-detail single column — no horizontal overflow (AC #14).                                                                                                                                  |
| Reduced motion                                                      | No month-slide animation in M9c; switcher active-segment transition collapses to instant via the M0 `[data-motion]` rule / `useReducedMotion`.                                                                                                           |

### Accessibility

- **Switcher:** `role="tablist"` container with `aria-label="Calendar view"`; live segments `role="tab"` + `aria-selected`; disabled segments `aria-disabled="true"`, out of the tab order. Keyboard: Enter/Space activate a focused tab; Left/Right arrows move between the two enabled tabs (skipping Week/Year). Active segment indicated by both color and `aria-selected` (not color alone).
- **Month grid:** `role="grid"`, rows `role="row"`, cells `role="gridcell"`, weekday headers `role="columnheader"`. Tappable `scored` cells are `<button>` with a descriptive `aria-label` (weekday, full date, score). Inert cells (`future`/`pre-start`/`blank`) are `aria-hidden` or non-interactive `div`s — not focusable. Prev/next buttons carry `aria-label`.
- **`PastDayDetail`:** `role="region" aria-label="Day detail"`; `Close` focusable with an `aria-label`; `Esc` closes. Static, read-only — no form controls.
- **Contrast (AC #14, axe-clean):** date numerals are `--ink` over near-`--bg` heat fills (AA-safe); switcher active text `--bg` on `--accent` and inactive `--ink-dim` on `--bg` both meet AA at the M0 token set. VERIFIER checks the heat-fill alpha floor (`0.12`) does not break numeral contrast (it does not — the numeral is `--ink`, contrast is against the dark page, not the fill).
- **430px (AC #14):** the whole view lives in the existing `max-w-[430px]` column; the 7-column grid and four-segment switcher fit without overflow.

### Decisions to honor

- **ADR-045 — `history` / `currentDate` are the data source, consumed READ-ONLY.** M9c never writes `history`, never mutates `AppState.history`/`currentDate`, never bumps the schema. `dayScore` is a pure read. The schema stays `v2`.
- **Scoring engine consumed unchanged.** `dayPct` (and `dayPct`'s field-read contract — it reads only `blocks`/`looseBricks`) is used as-is from `lib/dharma.ts`. M9c adds no scoring function and edits none. No week/month aggregate score is computed (that is M9d/M9e).
- **`lib/persist.ts` / `lib/history.ts` rollover untouched.** Only an **additive** `dayScore` export is added to `lib/history.ts`; `rollover`/`seedFreshDay`/`seedBrick` are byte-identical. `lib/persist.ts` and `lib/usePersistedState.ts` rollover logic are unchanged.
- **M0 design system.** All tokens, fonts (`Instrument Serif` / `JetBrains Mono`), Tailwind, the M0 `ui/Button`, and the 430px mobile column are honored. No new `globals.css` token.
- **The read-only guarantee (AC #13).** `PastDayDetail` is a purpose-built component with **no** `dispatch`, no reducer action, no `BrickChip`/`TimelineBlock`/sheet — there is no mutation path. This is the cleanest way to make the no-edit guarantee structurally true and VERIFIER-checkable.
- **ADR-031 — 44px touch targets.** Switcher segments, prev/next buttons, and tappable day cells all clear 44px (day cells are `aspect-ratio:1` squares in a ~58px-wide column → ≥ 44px).
- **ADR-038 — forgiveness model.** A `missed` day is gray (`--card` chip), no red, no shame — consistent with "missed days = gray."
- **ADR-019 / M9a `0=Sun…6=Sat`.** The weekday header row and the grid's leading-blank count use the `0=Sun…6=Sat` convention, matching `RecurrenceChips` `WEEKDAYS` and `Date.prototype.getDay()`.
- **ADR-022 / ADR-025.** One feature (`m9c`), one mode (PLAN) this dispatch.

### Commit strategy

m9c is **one feature group, one BUILDER dispatch.** The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned:** the BUILDER may group red + green commits per logical area — one pair for `lib/monthGrid.ts` date math, one for the `dayScore` helper, one for `<ViewSwitcher>`, one for `<MonthView>` + `<DayCell>`, one for `<PastDayDetail>`, one for the `AppShell` + `BuildingClient` prop-lift wiring — rather than one commit pair per individual test ID. The orchestrator and EVALUATOR hold the BUILDER to per-group granularity, not strict per-ID. Red commits: `test(m9c): …`; green/refactor commits: `feat(m9c): …` or `fix(m9c): …`. No phase exit until every `m9c` test ID in `tests.md` is green.

### Out of scope

- **The Week (Castle, M9d) and Year (Empire, M9e) views** — their switcher segments exist but are disabled; no week/year layout, no panel, no behavior.
- **Aggregate week / month / year scores** — M9c shows per-day scores in a month layout; a single month total is M9d/M9e territory. `dayScore` returns per-DAY scores only.
- **Editing or deleting an archived day** — `PastDayDetail` is strictly read-only; no add/complete/edit/delete affordance.
- **Changing rollover, persistence, or the scoring engine** — all consumed unchanged; `lib/history.ts` gets only the additive `dayScore`.
- **Next.js routes / deep-linking / URL-addressable views / browser-back** — SG-m9c-01 resolved to in-app `view` state; routes deferred until deep-linking is specced.
- **Persisting the selected `view` or the displayed month** — session-only React state; refresh returns to Day / current month.
- **Month-transition slide animations, FLIP, calendar polish** — M9c keeps prev/next instant; polish is a later milestone.
- **`appliesOn`-based per-cell recurrence rendering** — month-cell scores come from `history`, not recurrence resolution.
- **A new ADR** — see below.

### Open questions for VERIFIER

**None outstanding.** All five spec gaps are resolved in-plan:

- **SG-m9c-01 — RESOLVED → in-app `view` state in a new `app/(building)/AppShell.tsx` shell above `BuildingClient`.** `usePersistedState()` runs exactly once (in `AppShell`); `BuildingClient` is refactored to receive `state`/`dispatch` as props; `MonthView` reads the same `state`. No Next routes. Grounded in the real single-`usePersistedState` structure of `BuildingClient` (line 75).
- **SG-m9c-02 — RESOLVED → Week and Year are visibly disabled segments** (`<button disabled>`, greyed, out of tab order, no `onSelect`). No throwaway placeholder panel. They light up in M9d/M9e by dropping the `disabled` flag.
- **SG-m9c-03 — RESOLVED → compact heat-fill day cell:** date number + `--accent` background at `0.12 + (score/100)*0.78` alpha + a corner numeric score. Missed = flat `--card` chip with no fill/numeral; future/pre-start = transparent faint; today = heat + 2px `--accent` ring. Chosen over a per-cell ring (illegible at month density) and a bare percent.
- **SG-m9c-04 — RESOLVED → a purpose-built lightweight read-only `PastDayDetail`** (header date + score, static block/brick list, Close) — NOT a reuse of the interactive `Timeline`/`TimelineBlock`/`BrickChip` chain. It carries no `dispatch` and no mutation affordance, so AC #13's no-edit guarantee is structurally true.
- **SG-m9c-05 — RESOLVED → a persistent `<ViewSwitcher>` rendered by `AppShell`** as a thin bar at the top of the `max-w-[430px]` column, visible in both Day and Month views; it does not replace or restyle the Building view's `TopBar` / dock chrome. It is the sole entry point into the calendar.

VERIFIER may wish to confirm: (a) the `dayScore` precedence (`history` before `currentDate`) and the `NO_DATA = null` sentinel vs a numeric `0`; (b) that `dayPct` is called over an `ArchivedDay` correctly given `dayPct` reads only `blocks`/`looseBricks` (plan baseline builds a complete `AppState`-shaped object — zero cast); (c) that `BuildingClient`'s refactor from "calls `usePersistedState`" to "receives `state`/`dispatch` props" introduces no Building-view regression; (d) the heat-fill alpha floor `0.12` keeps the date numeral AA-legible (it is `--ink` over the dark page).

### ADR needed

None. ADR-045 (Accepted) locks the v2 schema M9c reads; ADR-019 locks the `Recurrence`/weekday convention; ADR-038 (forgiveness — missed = gray) governs the `missed` cell treatment; ADR-031 (44px) governs the touch targets; the M0 design ADRs lock the tokens/fonts/layout. The one structural choice — in-app `view` state via an `AppShell` (SG-m9c-01) — is the **spec's own recommended option**; `AppShell` is a conventional client-shell composition that duplicates no state and exceeds no Accepted ADR, so it needs no new ADR. If a future milestone specs deep-linking and the team adopts Next routes for the views, **that** would warrant an ADR (route-based view hosting + `usePersistedState` placement) — but it is out of scope for M9c.
