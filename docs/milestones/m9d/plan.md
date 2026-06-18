## Milestone 9d — Week view (Castle) + period scoring — Plan

### Context

M9c made days visible in a month grid (the Kingdom). M9d adds the **Castle view** — the week — and with it the first **period aggregate score**: a `weekScore` that rolls per-day scores _up_ into one number, so the user can compare "how did last week go versus the week before." Per the M9 storage strategy and ADR-045, the week aggregate is **computed on read** (averaged from `dayScore`), never stored. The honest-scoreboard rule (SG-m9d-01): a day the user was in-range for but never opened counts as **0** in the average; future days and pre-`programStart` days are excluded entirely. M9d fills the inert **Week** segment of the M9c `ViewSwitcher`, reuses `PastDayDetail` verbatim, adds no persistence, and touches no scoring engine.

### Feature grouping

This plan is **one feature group: `m9d`** (one BUILDER dispatch). All test IDs in `tests.md` group under the `m9d` slug. The sub-sections below (week-date math / `weekScore` helper / `WeekView` / `WeekDayCell` / aggregate display / `ViewSwitcher` enable / `AppShell` wiring) are organizational, not separate features — they ship together in one dispatch.

### File structure

**New files**

| Path                                                              | Change                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/WeekView.tsx`                                         | NEW. `"use client"`. The Castle week screen: week date-range label, prev/next-week nav, the prominent **week aggregate** display, and a seven-day Sun→Sat layout of `WeekDayCell`s. Owns the displayed-week state (an anchor ISO date) and the opened-past-day state. Resolves SG-m9d-02. |
| `components/WeekDayCell.tsx`                                      | NEW. `"use client"`. One day in the week layout — date + per-day score indicator, reusing the M9c `DayCell` `kind` vocabulary at a week-scaled size. See Components for the reuse-vs-fork decision.                                                                                       |
| `lib/weekGrid.ts`                                                 | NEW. Pure week-date-math module: `weekDates(anchorISO)` → the seven Sun→Sat ISO dates; `addWeek`/`subWeek`; `weekRangeLabel`. UTC-drift-free — sibling to `lib/monthGrid.ts` (see Week-date math for why a sibling, not an extension). Co-located test `lib/weekGrid.test.ts`.            |
| `lib/weekGrid.test.ts`                                            | NEW. Co-located Vitest unit suite (TESTS/BUILDER deliverable; listed for completeness).                                                                                                                                                                                                   |
| `components/WeekView.test.tsx`, `components/WeekDayCell.test.tsx` | NEW test files (Vitest + Testing Library). Contents are the TESTS/BUILDER deliverable.                                                                                                                                                                                                    |

**Modified files**

| Path                               | Change                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/history.ts`                   | **Additive only.** Add the exported `weekScore(state, anchorISO)` helper (see Data model + the `weekScore` helper section). `dayScore`, `NO_DATA`, `rollover`, `seedFreshDay`, `seedBrick` are **byte-identical** — no edit to existing exports. `weekScore` is built ON `dayScore` (it calls it once per in-range non-future day). |
| `lib/history.test.ts`              | EXISTS — extended with `weekScore` cases (TESTS/BUILDER deliverable; not authored here).                                                                                                                                                                                                                                            |
| `components/ViewSwitcher.tsx`      | **Surgical change:** the Week segment's `live` flag flips `false → true`. See ViewSwitcher change for the exact edit. The `ViewSwitcher` props type widens from `"day" \| "month"` to `"day" \| "month" \| "week"`. Year stays `live: false`.                                                                                       |
| `components/ViewSwitcher.test.tsx` | EXISTS — the M9c sub-test asserting Week is `aria-disabled` is now stale and **must be amended** (see Regression surface). Amendment is the TESTS/BUILDER deliverable; flagged here for VERIFIER.                                                                                                                                   |
| `app/(building)/AppShell.tsx`      | Wire the Week view into the `view` state: widen `view` to `"day" \| "month" \| "week"`, widen `handleSelectView`'s param, and render `<WeekView state={state} onOpenDay={handleOpenDay} />` for the `"week"` branch. `usePersistedState()` still runs exactly once. See AppShell wiring.                                            |
| `app/(building)/AppShell.test.tsx` | EXISTS — may gain `week`-branch cases (TESTS/BUILDER deliverable). The existing M9c AppShell cases are unaffected — they only exercise Day/Month and never asserted Week was unreachable (see Regression surface).                                                                                                                  |

**Not modified — confirmed:** `lib/dharma.ts` (`dayPct`, `today`, `dateLabel` consumed unchanged — no scoring-engine edit), `lib/monthGrid.ts` (M9c month math byte-identical — the week helper is a **sibling** module, see Week-date math), `lib/history.ts`'s existing `dayScore`/`rollover`/`seedFreshDay`/`seedBrick` (byte-identical), `lib/persist.ts` / `lib/usePersistedState.ts` (no schema change — schema stays `v2`; no rollover change), `lib/types.ts` (`AppState`/`ArchivedDay`/`Recurrence`/`Block`/`Brick` consumed unmodified), `components/PastDayDetail.tsx` (**reused verbatim** — zero edit), `components/MonthView.tsx` / `components/DayCell.tsx` (M9c month view unchanged — `DayCell` is read but not edited; see Components for whether `WeekDayCell` forks or imports it), `app/page.tsx` (still renders `<AppShell />`), `app/globals.css` / `app/layout.tsx` (M9d uses existing M0 tokens — no new token).

### Components

All new components are `"use client"`. They reuse M0 tokens and existing M9c primitives; no new `app/globals.css` token.

**`<WeekView>` (NEW) — the Castle screen — resolves SG-m9d-02**

- Props: `{ state: AppState; onOpenDay: (isoDate: string) => void }` — **identical shape to `MonthView`**, so `AppShell` wires it the same way. (`dispatch` not needed — `WeekView` is read-only over `state`, exactly like `MonthView`.)
- Owned state:
  - `const [anchor, setAnchor] = useState<string>(today())` — an ISO `YYYY-MM-DD` string identifying _some_ day in the displayed week (initialized to today, so the app opens on the current week). Session-only, not persisted (consistent with M9c's displayed-month state — refresh returns to the current week). The clock is read **once**, here, for the initial anchor and for cell classification.
  - `const [openDate, setOpenDate] = useState<string | null>(null)` — the opened past-day detail, exactly as `MonthView`.
- **SG-m9d-02 — RESOLVED → a vertical seven-row list of `WeekDayCell`s, with the week aggregate as a prominent ring above the list.** Layout rationale for the 430px column: a horizontal 7-column strip at week scale would give each day only ~58px (same density as the month grid — wasteful, since a week has only 7 cells and the screen has vertical room); a **vertical 7-row list** lets each day be a full-width row (~406px wide) that can carry the weekday name, the date, a wider heat bar, and the numeric score legibly. This is the Castle's distinct identity vs the Kingdom's dense grid. The aggregate sits **above** the seven rows as the screen's focal point.
- Renders, top to bottom:
  - **Week date-range label** — e.g. "May 17–23, 2026" — via `weekRangeLabel(anchor)` from `lib/weekGrid.ts`, in `var(--font-display)` (Instrument Serif), `var(--fs-22)` (AC #2). Crosses month/year boundaries correctly (the helper formats both endpoints — see Week-date math).
  - **Prev / next-week controls** — two `<button>`s flanking the label (lucide-react `ChevronLeft` / `ChevronRight`), ≥ 44px hit area, `aria-label="Previous week"` / `"Next week"`. Tapping calls `setAnchor(subWeek(anchor))` / `setAnchor(addWeek(anchor))` (AC #9). Same visual pattern as `MonthView`'s prev/next.
  - **Week aggregate display** — see `<WeekAggregate>` below.
  - **Seven `<WeekDayCell>` rows** — one per ISO date from `weekDates(anchor)` (Sun→Sat). For each date, `WeekView` computes the cell's `kind` + `score` (same classification logic as `MonthView` — see WeekDayCell) and passes them down.
  - **`PastDayDetail` overlay** — when `openDate !== null && openDate in state.history`, render `<PastDayDetail archivedDay={state.history[openDate]!} isoDate={openDate} onClose={() => setOpenDate(null)} />` — **byte-identical** to `MonthView`'s usage (AC #10).
- Cell-tap routing (AC #10, #11), identical to `MonthView.handleCellOpen`: tapping today's day → `onOpenDay(todayIso)` (→ `AppShell` `setView("day")`); tapping a past in-range day with a `history` entry → `setOpenDate(iso)`; tapping a `future`/`pre-start`/`missed` day → nothing (structural — non-`scored` cells are not buttons; `missed` is read-only with no detail, see WeekDayCell).
- A11y: the seven rows live in a `role="list"` container with `aria-label="Week days"`; each `WeekDayCell` is a `role="listitem"`. (A `role="grid"` is the wrong semantics for a one-column vertical list; the month view's `grid` role stays month-only.) Prev/next buttons carry `aria-label`s. 430px: single-column, full-width rows — no horizontal overflow (AC #12).
- Reduced-motion: week prev/next transitions are instant (no slide animation in M9d — consistent with M9c's instant month nav).

**`<WeekAggregate>` (the week-score display — part of `WeekView`, may be an inline sub-component or a small separate component — BUILDER's call) — resolves SG-m9d-02 (aggregate presentation)**

- Input: the `weekScore(state, anchor)` result — a `number` in `[0,100]` or `NO_DATA` (`null`).
- **Presentation: a prominent ring + centered numeral**, echoing the M3 `<HeroRing>` identity (the single-% ring is Dharma's established score signature per ADR-033). Chosen over a bare numeral (the week aggregate is the headline of the Castle view and deserves the ring treatment) and over a labeled stat row (too understated for the period's focal score).
  - **Reuse decision:** the BUILDER **MAY reuse `components/HeroRing.tsx`** if its props admit a plain `0–100` number and it does not hard-depend on Building-view context — VERIFIER checks this. **However**, `HeroRing` references `var(--surface-2)`, which is **NOT defined** in `app/globals.css` (see Design tokens). If `HeroRing` is reused as-is, the undefined token is a pre-existing M3 issue, not one M9d introduces — but M9d must not _propagate_ it. **Plan baseline: a small purpose-built ring inside `WeekView`** drawn with an SVG `<circle>` `stroke-dasharray` arc (the same technique `HeroRing` uses), using only **defined** M0 tokens — `var(--accent)` for the progress arc, `var(--card-edge)` for the track, `var(--ink)` for the centered numeral. This sidesteps the `--surface-2` hazard entirely and keeps M9d self-contained. The BUILDER may instead reuse `HeroRing` only if doing so introduces no new `--surface-2` reference and no Building-view coupling.
  - The centered numeral is `${Math.round(weekScore)}` with a `%` glyph, `var(--font-display)`, `var(--fs-32)`, `var(--ink)`. A short label "Week" / "Castle score" in `var(--font-ui)`, `var(--fs-10)`, `var(--ink-dim)` sits below or above the ring.
- **No-data state (AC #6, SG-m9d-01):** when `weekScore` returns `NO_DATA` (`null`) — an entirely-future week, or a week entirely before `programStart` — the aggregate renders a **distinct no-data treatment**: the ring track only (no progress arc), and a `—` (em dash) glyph in `var(--ink-dim)` in place of the numeral, with the label still shown. It is **never** rendered as `0%` (a real `0` means "the week happened and scored zero" — a different, truthful statement) and **never** crashes. `WeekView` branches on `weekScore(...) === null` for this.
- A11y: the ring has `role="img"` with `aria-label="Week score N percent"` for a number, or `"Week score: no data"` for `NO_DATA`. The numeral is also rendered as visible text (not color-only).

**`<WeekDayCell>` (NEW) — one day row — reuses the M9c `DayCell` kind vocabulary**

- Props: mirror `DayCell` but row-shaped: `{ kind: "future" | "pre-start" | "missed" | "scored"; date: string; dayOfMonth: number; weekdayLabel: string; score?: number; isToday?: boolean; onOpen?: () => void }`. There is **no `"blank"` kind** — a week is always exactly seven real dates (unlike the month grid, which needs leading/trailing blanks for alignment). `weekdayLabel` ("Sun"…"Sat") is supplied by `WeekView` from the day's position in the Sun→Sat array.
- **Reuse-vs-fork decision: `WeekDayCell` is a NEW component that reuses the M9c `kind` _vocabulary_ (the five-state classification: `scored` / `missed` / `future` / `pre-start`, minus `blank`) but is a row-shaped layout, not the square `DayCell`.** `DayCell` is a fixed `aspect-ratio: 1` square tuned for month-grid density; a week row is full-width and horizontal. Threading a `layout: "square" | "row"` prop through `DayCell` would fork its JSX internally and entangle two views' layouts in one file. A purpose-built `WeekDayCell` that **imports nothing from `DayCell`** but **deliberately matches its visual language** (same heat-fill formula, same per-`kind` treatments, same token set) is cleaner and keeps the M9c month view byte-identical. The shared _contract_ — not shared _code_ — is the `kind` enum and the heat-fill formula; both are restated below so the BUILDER has them without cross-reading M9c.
- **Per-`kind` rendering — the four visual states (AC #3), matching the M9c `DayCell` vocabulary:**

  | `kind`                                                                | Visual (row-shaped)                                                                                                                                                                                                          | Tappable         |
  | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
  | `scored` (archived OR today, score ≥ 0)                               | full-width row: weekday label + date number (left), a heat fill (`var(--accent)` at `alpha = 0.12 + (score/100) * 0.78`) as the row background or a horizontal heat bar, numeric `${Math.round(score)}` (right). `<button>`. | yes → `onOpen()` |
  | `missed` (past, in-range `[programStart, today)`, no `history` entry) | row: weekday + date in `var(--ink-dim)`; flat `var(--card)` background, 1px `var(--card-edge)` border; **no heat fill, no numeral** — the "tried nothing / not opened" gray (ADR-038). plain `<div>`.                        | no               |
  | `future` (date > today)                                               | row: weekday + date in `var(--ink-dim)` at low opacity; transparent background, no border. plain `<div>`.                                                                                                                    | no               |
  | `pre-start` (date < `programStart`)                                   | identical inert treatment to `future`. plain `<div>`.                                                                                                                                                                        | no               |

  Distinctness (AC #3, spec edge case "missed vs 0-archived"): a `scored` cell with score `0` shows the **minimum-alpha accent fill (`0.12`) + the numeral "0"**; a `missed` cell has **no fill and no numeral** — visually distinct, exactly as M9c. `today` (`isToday`): the `scored` row additionally gets a 2px `var(--accent)` ring/outline so today is unmistakable.

- Tappable cells are `<button>`; non-tappable cells are plain `<div>` (no button role, not focusable) — "tapping a future / pre-start / missed day does nothing" (AC #11) is structural, not a guarded handler.
- A11y: tappable `scored` row is `<button>` with `aria-label` = `"<weekday>, <Month> <day>, <year>, score <N> percent"` (`", today"` inserted when `isToday`) — same label grammar as `DayCell`. `missed`/`future`/`pre-start` rows carry a plain text label (weekday + date) with no interactive role. Row height ≥ 44px (ADR-031). Heat-fill alpha floor `0.12` keeps the `var(--ink)` numeral/date AA-legible (text contrast is against the dark page chrome, as in M9c).

**`<ViewSwitcher>` change — enabling Week (AC #8)**

- The M9c `ViewSwitcher` already renders four segments; Week is `{ label: "Week", value: "week", live: false }`. **The only structural edit: flip Week's `live` flag `false → true`** in the `SEGMENTS` array and in the `Segment` union type. Year stays `live: false`.
- The props type widens: `view: "day" | "month"` → `view: "day" | "month" | "week"`, and `onSelect: (view: "day" | "month") => void` → `onSelect: (view: "day" | "month" | "week") => void`. With Week now `live`, the existing live-segment branch handles it with **zero new branching** — it already maps `seg.value` through `onSelect` and computes `isActive = view === seg.value`. The disabled-segment branch now applies only to Year.
- Result: Week renders as a live, selectable, `aria-selected`-aware tab; the active-view indicator (filled `var(--accent)` background) works for it identically to Day/Month. Year remains the single greyed `aria-disabled` segment. **This edit deletes the `aria-disabled` attribute from the Week tab** — see Regression surface for the stale M9c test.
- A11y unchanged in shape: arrow-key navigation now moves across **three** enabled tabs (Day/Week/Month), skipping the one disabled tab (Year); `aria-label="Calendar view"` and the `role="tablist"`/`role="tab"` structure are untouched.

**`PastDayDetail` — reused verbatim.** `WeekView` mounts `<PastDayDetail>` with the exact same props `MonthView` passes (`archivedDay`, `isoDate`, `onClose`). Zero edit to `PastDayDetail.tsx`. The read-only guarantee (no `dispatch`, no mutation affordance) carries through unchanged — M9d adds no edit path.

### `weekScore` helper

**New additive export in `lib/history.ts` (AC #4, #6, #7):**

```ts
// lib/history.ts — NEW additive export. dayScore / NO_DATA / rollover unchanged.
export function weekScore(state: AppState, anchorISO: string): number | null;
```

- **Signature:** `weekScore(state: AppState, anchorISO: string): number | null`. `state` is the live `AppState`; `anchorISO` is an ISO `YYYY-MM-DD` string identifying any day in the target week (assumed well-formed — internal callers, M8 boundary stance). The return type **reuses the `dayScore` sentinel**: a `number` in `[0,100]`, or `NO_DATA` (`null`).
- **Contract — the honest-week average (resolves SG-m9d-01):**
  1. Compute the week's seven ISO dates: `weekDates(anchorISO)` from `lib/weekGrid.ts` (Sun→Sat).
  2. `weekScore` itself **does not read the clock** — it must be pure (AC implied by the M9 purity pattern; `dayScore` is pure, `weekScore` built on it must be too). Today's ISO is therefore derived from **`state.currentDate`** (the in-progress day's date — ADR-045 places it on `AppState`), NOT from `new Date()`. This is correct: `currentDate` _is_ "today" for the live state, and using it keeps `weekScore` a pure function of `(state, anchorISO)`. **The clock is never read inside `weekScore`.**
  3. For each of the seven dates `d`, classify against `state.currentDate` and `state.programStart`:
     - **`d > currentDate`** (future) → **excluded** from both numerator and denominator.
     - **`d < programStart`** (pre-start) → **excluded** from both.
     - **`d` is in-range and non-future** (`programStart <= d <= currentDate`) → **included**. Its contribution:
       - `dayScore(state, d)` returns a `number` → contribute that number.
       - `dayScore(state, d)` returns `NO_DATA` (`null`) — a past in-range day the user never opened (a **missed** day) → contribute **`0`** (SG-m9d-01 — the honest-scoreboard rule).
  4. **Numerator** = sum of contributions over the included days (missed-in-range = `0`). **Denominator** = count of included days. **Result** = `numerator / denominator`.
  5. **No-data case (AC #6):** if the denominator is `0` — i.e. **no** day in the week is in-range and non-future (the whole week is future, or entirely before `programStart`) → return `NO_DATA` (`null`). Never return `0` for this case; `0` is reserved for "the week happened and every included day scored 0."
- **Worked edge mapping:**
  - A week containing today → days `<= currentDate` and `>= programStart` are included (today contributes its live `dayPct` via `dayScore`'s `currentDate` branch — AC #7); days `> currentDate` are excluded.
  - A fully past week → all seven days are `<= currentDate`; each is included (archived `dayPct`, or `0` for a missed in-range day); average over seven (or fewer if some predate `programStart`).
  - A fully future week → every day `> currentDate` → denominator `0` → `NO_DATA`.
  - A week straddling `programStart` → days `< programStart` excluded; days from `programStart` on included.
  - Empty `history`, first run → today is in `state.currentDate`, so `dayScore` returns the live `dayPct` for it; other in-range past days (between `programStart` and `currentDate`) return `NO_DATA` → contribute `0`; future days excluded. The average reflects only in-range non-future days.
- **`dayScore` is the per-day source — `weekScore` calls it, never re-implements per-day scoring.** `weekScore` is purely an aggregator: classify, sum, count, divide. `dayPct`/`dayScore` are consumed unchanged (additive-only — ADR-045 honored).
- **Purity:** `weekScore` reads no clock and no `localStorage`; it is a pure function of `(state, anchorISO)`. Identical inputs → identical output. Co-located unit tests drive it directly (`lib/history.test.ts`).
- **SG-m9d-01 — RESOLVED in-plan → missed in-range past day counts as `0`.** AC #4 already fixes this; the implementation above reflects it (a `NO_DATA` from `dayScore` on an included day contributes `0`, and is also counted in the denominator). The alternative (excluding missed days) would inflate the average by only counting opened days — the spec rejects it. **VERIFIER ratifies this as the intended period-scoring semantics** before BUILDER implements; the same rule will govern M9e's month/year aggregates.

### Week-date math

`lib/weekGrid.ts` — a **new sibling module** to `lib/monthGrid.ts`, not an extension of it. Rationale: `monthGrid.ts` is tightly scoped to month-grid concerns (`GridCell`, leading/trailing blanks, `monthGridCells`); week math (`weekDates`, `addWeek`, `subWeek`, `weekRangeLabel`) is a distinct concern with a distinct cell model (no blanks — see WeekDayCell). A sibling keeps each module single-purpose and leaves `monthGrid.ts` byte-identical (no M9c regression risk). Both modules share the same UTC-drift-free discipline.

Per M9a's `parseLocalDate` lesson and the spec's explicit instruction, **no `new Date(isoString)`** — that parses as UTC midnight and drifts a day in negative-offset zones. `lib/weekGrid.ts` uses only the **multi-arg local-time `Date` constructor** (`new Date(y, m, d)`) — the exact pattern `lib/monthGrid.ts`, `lib/dayOfYear.ts`, and `lib/appliesOn.ts`'s `parseLocalDate` already use.

- **`parseISO(iso)` (private helper)** — `iso` is `YYYY-MM-DD`; split on `-`, `new Date(+y, +m - 1, +d)` → a local-midnight `Date`. No UTC drift. (This is the same private helper shape M9a uses; `weekGrid.ts` carries its own copy rather than importing — it is two lines and avoids a cross-module dependency. VERIFIER may instead sanction importing a shared `parseLocalDate` if one is exported; the plan baseline is a local private copy, matching M9c's `monthGrid.ts` self-containment.)
- **`weekDates(anchorISO): string[]`** — given any day in the week, return the seven ISO dates Sun→Sat:
  1. `parseISO(anchorISO)` → local-midnight `Date`.
  2. `getDay()` → `0=Sun…6=Sat` (the anchor's weekday index).
  3. The week's Sunday = anchor date minus `getDay()` days. Compute via `new Date(y, m, d - getDay())` — the multi-arg constructor's day-arithmetic rolls month/year boundaries correctly (e.g. `d - getDay()` going negative correctly retreats into the prior month).
  4. The seven dates = Sunday + `0..6` days, each built with `new Date(y, m, sundayD + i)` then re-serialized to `YYYY-MM-DD` via zero-padded string assembly (no `Date` → string round-trip through UTC).
  - Result: a 7-element ISO string array, Sun→Sat, crossing month/year boundaries correctly (AC #1, #2 — spec edge case "week straddling a month or year boundary").
- **`addWeek(anchorISO)` / `subWeek(anchorISO)`** — `parseISO`, then `new Date(y, m, d ± 7)`, re-serialized. The `±7` day-arithmetic rolls boundaries correctly; pure, no UTC drift (AC #9). (The returned value is itself a valid anchor for the new week — any day in the week works as the anchor, since `weekDates` re-normalizes to Sunday.)
- **`weekRangeLabel(anchorISO): string`** — derive `weekDates`, take `[0]` (Sunday) and `[6]` (Saturday), format as a human range. The label collapses a shared month/year: same month → "May 17–23, 2026"; spanning months → "May 31 – Jun 6, 2026"; spanning a year → "Dec 29, 2025 – Jan 4, 2026" (AC #2). Month names from a local `MONTH_NAMES`/`MONTH_ABBR` array (same approach as `MonthView`'s `MONTH_NAMES`); year/day from string slicing. No locale dependency, no `Intl` round-trip required (though `Intl.DateTimeFormat` over a `parseISO`'d local `Date` is acceptable if the BUILDER prefers — VERIFIER checks no UTC drift).
- **SG-m9d-03 — RESOLVED in-plan → Sunday-start, confirmed consistent with M9c.** Verified against the real M9c code: `components/MonthView.tsx` line 36 declares `WEEKDAY_HEADERS = ["Sun", "Mon", …, "Sat"]` and `lib/monthGrid.ts` line 29 computes leading blanks from `new Date(year, month, 1).getDay()` where `getDay()` is `0=Sun`. The M9c month grid **is** Sunday-start. `weekDates` above derives the week's Sunday via `anchor − getDay()` with the same `0=Sun` convention — so the two views can **never disagree** on which seven dates form a week (a given date's row in the month grid and its week in the week view contain the identical Sun→Sat span). VERIFIER confirms the two helpers agree.

### Data model

**No new persisted type. No schema change. Schema stays `v2` (ADR-045).** M9d reads `AppState` — `history`, `currentDate`, `programStart`, `blocks`/`categories`/`looseBricks` — all present post-M9b. `ArchivedDay`, `Recurrence`, `Block`, `Brick`, `Category`, `AppState` consumed **unmodified**.

- **`weekScore` return type** — `number | null`, **reusing the existing `NO_DATA` sentinel** exported from `lib/history.ts`. No new sentinel, no new type alias. A `number` is the week average in `[0,100]`; `null` (`NO_DATA`) is the no-in-range-non-future-days case (AC #6). This matches `dayScore`'s `number | null` shape exactly, so callers (`WeekView`) branch on `=== null` uniformly.
- **`lib/weekGrid.ts` types** — `weekDates` returns `string[]` (length 7); `addWeek`/`subWeek` return `string`; `weekRangeLabel` returns `string`. No new persisted or shared type — purely local function signatures.
- **`WeekDayCell` props** — a local component prop type (a discriminated union on `kind`, like `DayCellProps`), not a persisted type.

### Dependencies

**None.** No new `package.json` entry. `lucide-react` (installed) supplies `ChevronLeft`/`ChevronRight`/`X`. `motion/react` (installed) is used only if a reduced-motion check is wanted on the switcher (already present from M9c). Vitest + Testing Library + Playwright + `@axe-core/playwright` (all installed) cover the tests. No `date-fns`/`dayjs` — `lib/weekGrid.ts` is small and pure.

### Design tokens

All from the existing M0 surface in `app/globals.css` — **no new token, `globals.css` untouched.**

| Use                                                                                                   | Token                                                                                       | Value             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| Week date-range label, aggregate numeral                                                              | `--font-display` (Instrument Serif), `--fs-22` (label) / `--fs-32` (aggregate numeral)      | serif             |
| Weekday labels, date numbers, score numerals, "Castle score" label                                    | `--font-ui` (JetBrains Mono), `--fs-10` / `--fs-12`                                         | mono              |
| Per-day score heat fill                                                                               | `--accent` `#fbbf24` at scaled alpha `0.12 + (score/100)*0.78`                              | accent amber      |
| Week-aggregate ring — progress arc                                                                    | `--accent` `#fbbf24`                                                                        | amber arc         |
| Week-aggregate ring — track                                                                           | `--card-edge` `#1e2d47`                                                                     | dim track         |
| Active switcher segment (Week now eligible)                                                           | bg `--accent`, text `--bg` `#07090f`                                                        | filled amber chip |
| Inactive switcher segment, future/pre-start/missed date text, no-data `—` glyph, "Castle score" label | `--ink-dim` `rgba(245,241,232,0.5)`                                                         | dimmed ink        |
| `missed` row background + border                                                                      | `--card` `#0f1d33` fill, `--card-edge` `#1e2d47` 1px border                                 | flat card         |
| `scored`/`today` row ring                                                                             | `--accent` 2px outline                                                                      | amber ring        |
| Row / panel corner radius, gaps, padding                                                              | `--sp-4` / `--sp-8` / `--sp-12`; `border-radius: 6px` (matches `DayCell` / `TimelineBlock`) | M0 spacing scale  |

**Heat-fill formula — identical to M9c's `DayCell`:** `alpha = 0.12 + (score/100) * 0.78` (range `0.12`→`0.90`). Restated here so the BUILDER has it without cross-reading the M9c plan. A `score 0` day → alpha `0.12` (faint but present) + numeral "0"; a `missed` day → no fill, no numeral. The per-day numeric score backs up the heat for precise reading and AA.

**Important — do NOT use `var(--surface-2)`:** `HeroRing` and `TimelineBlock` reference `var(--surface-2)`, but that token is **NOT defined** in `app/globals.css` (which defines `--card`, `--card-edge`, `--ink-dim`, `--bg-elev`, `--bg-2` — no `--surface-2`). M9d's week-aggregate ring and `WeekDayCell` must use the **defined** tokens above (`--card-edge` for the ring track, `--card`/`--card-edge` for row backgrounds/borders). If the BUILDER reuses `HeroRing`, it must not _add_ a new `--surface-2` reference; the plan baseline (a purpose-built ring) avoids the token entirely.

### Edge cases

Each spec Edge case mapped to its planned code path:

| Spec edge case                                  | Planned code path                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A week containing today                         | `weekScore`: days `<= currentDate` & `>= programStart` included (today via `dayScore`'s `currentDate` branch → live `dayPct`, AC #7); days `> currentDate` excluded. `WeekView` classifies today's cell `isToday: true`, `kind: "scored"` + accent ring.                                                           |
| A fully past week                               | `weekScore`: all seven `<= currentDate`; each included (archived `dayPct` or `0` for missed-in-range); average over the in-range count. `WeekDayCell`s all `scored` or `missed`.                                                                                                                                   |
| A fully future week                             | `weekScore`: every day `> currentDate` → denominator `0` → `NO_DATA`. `WeekAggregate` renders the no-data `—` treatment (AC #6). All seven cells `future`, inert.                                                                                                                                                  |
| A week straddling `programStart`                | `weekScore`: days `< programStart` excluded from numerator + denominator; days `>= programStart` included. `WeekView` classifies pre-`programStart` days `kind: "pre-start"`, inert.                                                                                                                               |
| A week straddling a month or year boundary      | `weekDates` builds the seven dates via multi-arg `Date` day-arithmetic — boundary-correct; `weekRangeLabel` formats both endpoints, collapsing or expanding month/year (AC #2).                                                                                                                                    |
| Empty `history`, first run                      | `history` is `{}`; `dayScore` returns the live `dayPct` for `currentDate` and `NO_DATA` for every other date. In-range past days contribute `0`; future days excluded; today contributes live. Aggregate reflects only in-range non-future days. No crash on empty `history` (`dayScore` does a plain `in` check). |
| A missed day vs a 0-score archived day          | Both contribute `0` to `weekScore` (missed via the `NO_DATA → 0` rule; 0-archived via `dayScore` returning the number `0`). They render with **distinct** `WeekDayCell` treatments: `missed` = flat `--card` row, no fill/numeral; `scored` score-0 = `0.12`-alpha fill + numeral "0".                             |
| Tapping a `future` / `pre-start` / `missed` day | Non-`scored` `WeekDayCell`s render as plain `<div>` with no `onClick`/button role — tapping is structurally a no-op (AC #11).                                                                                                                                                                                      |
| Tapping today's day                             | `WeekView` → `onOpenDay(todayIso)` → `AppShell` `setView("day")` → Building view (AC #10).                                                                                                                                                                                                                         |
| Tapping a past `scored` (archived) day          | `WeekView` `setOpenDate(iso)` → renders `<PastDayDetail>` read-only (AC #10).                                                                                                                                                                                                                                      |
| Selecting the Year segment                      | Year stays `live: false` — disabled `<button>`, no `onSelect`, no view change, no crash (AC #8).                                                                                                                                                                                                                   |
| Prev/next week across month/year boundary       | `addWeek`/`subWeek` use `±7` multi-arg `Date` arithmetic — boundary-correct; the label, layout, and aggregate all recompute from the new anchor (AC #9).                                                                                                                                                           |
| 430px viewport                                  | Vertical seven-row list, full-width rows, ring centered — single column, no horizontal overflow (AC #12).                                                                                                                                                                                                          |
| Reduced motion                                  | No week-slide animation in M9d; the switcher's active-segment transition collapses to instant via the M0 motion rule (inherited unchanged from M9c).                                                                                                                                                               |

### Accessibility

- **`ViewSwitcher`:** unchanged structure — `role="tablist"` `aria-label="Calendar view"`; Day/Week/Month are live `role="tab"` + `aria-selected`; Year is the lone `aria-disabled` segment, out of the tab order. Arrow keys move across the three enabled tabs, skipping Year. The active segment is indicated by both color and `aria-selected` (not color alone).
- **`WeekView`:** the seven day rows live in a `role="list"` `aria-label="Week days"` container; each `WeekDayCell` is `role="listitem"`. Tappable `scored` rows are `<button>` with a descriptive `aria-label` (weekday, full date, score, `", today"` when applicable). Inert rows (`missed`/`future`/`pre-start`) are non-interactive `div`s — not focusable. Prev/next-week buttons carry `aria-label`s. The week aggregate ring is `role="img"` with `aria-label="Week score N percent"` or `"Week score: no data"`; its numeral is rendered as visible text, not color-only.
- **`PastDayDetail`:** unchanged — `role="region" aria-label="Day detail"`, `Close` focusable, `Esc` closes. Reused verbatim.
- **Contrast (AC #12, axe-clean):** date/score text is `var(--ink)` over near-`--bg` heat fills (AA-safe); the no-data `—` glyph and labels are `--ink-dim` on `--bg` (AA at the M0 set); the ring's `--accent` arc on the `--card-edge` track is non-text decoration. VERIFIER checks the heat-fill alpha floor `0.12` keeps the row text AA-legible (the text contrast is against the dark page chrome, as in M9c).
- **430px (AC #12):** the whole view lives in the existing `max-w-[430px]` column; the vertical seven-row list and the centered ring fit without overflow; each row ≥ 44px (ADR-031).

### Decisions to honor

- **ADR-045 — `history` / `currentDate` consumed READ-ONLY.** M9d never writes `history`, never mutates `AppState`, never bumps the schema. `dayScore` and `weekScore` are pure reads. Schema stays `v2`.
- **`dayScore` / `dayPct` consumed unchanged — `weekScore` is built ON `dayScore`, additively.** M9d adds only the `weekScore` export to `lib/history.ts`; `dayScore`, `NO_DATA`, `rollover`, `seedFreshDay`, `seedBrick` are byte-identical. No scoring-engine edit.
- **M9c components reused, not forked.** `PastDayDetail` reused verbatim (zero edit); `ViewSwitcher` gets the minimum one-flag edit (`Week.live: false → true`); `MonthView`/`DayCell` are byte-identical. `WeekDayCell` deliberately matches `DayCell`'s visual language (shared _contract_: the `kind` vocabulary + heat formula) without importing its square-tuned JSX — the cleanest reuse for a row-shaped layout.
- **The read-only guarantee (AC #10).** Carried via the reused `PastDayDetail` — no `dispatch`, no mutation affordance anywhere in the week view's tree. M9d adds no edit path to any past day.
- **M0 design system.** All tokens, fonts (`Instrument Serif` / `JetBrains Mono`), Tailwind, the 430px column honored. No new `globals.css` token. The `--surface-2` hazard is explicitly avoided.
- **ADR-033 — single-% ring is the score signature.** The week aggregate is a ring + centered numeral, echoing the M3 `<HeroRing>` identity, applied here to the first _period_ score.
- **ADR-031 — 44px touch targets.** Switcher segments, prev/next-week buttons, tappable day rows all clear 44px.
- **ADR-038 — forgiveness model.** A `missed` day row is gray (`--card` chip), no red, no shame.
- **ADR-019 / M9a `0=Sun…6=Sat`.** `weekDates` derives the week's Sunday with the `0=Sun` `getDay()` convention, matching the M9c month grid (SG-m9d-03).
- **ADR-022 / ADR-025.** One feature (`m9d`), one mode (PLAN) this dispatch.

### Commit strategy

m9d is **one feature group, one BUILDER dispatch.** The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned:** the BUILDER may group red + green commits per logical area — one pair for `lib/weekGrid.ts` date math, one for the `weekScore` helper, one for the `ViewSwitcher` Week-enable (including the stale-test amendment), one for `<WeekView>` + `<WeekDayCell>` + the aggregate, one for the `AppShell` wiring — rather than one commit pair per individual test ID. The orchestrator and EVALUATOR hold the BUILDER to per-group granularity, not strict per-ID. Red commits: `test(m9d): …`; green/refactor commits: `feat(m9d): …` or `fix(m9d): …`. No phase exit until every `m9d` test ID in `tests.md` is green **and** the M9c regression test amendment (below) is green.

### Out of scope

- **The Year (Empire, M9e) view** — its switcher segment stays `disabled`; no year layout, no twelve-month overview, no `monthScore`/`yearScore` helper.
- **Storing week/month/year totals** — all period scores are derived on read; `weekScore` computes on demand, stores nothing. No new persisted field, no schema bump.
- **Editing or deleting archived days** — `PastDayDetail` reused verbatim, strictly read-only; no add/complete/edit/delete affordance.
- **Changing the day-score engine** — `dayPct`/`dayScore` consumed unchanged; `lib/history.ts` gets only the additive `weekScore`.
- **Changing the M9c month view or the rollover** — `MonthView`/`DayCell`/`monthGrid.ts` and `rollover`/`persist` are byte-identical.
- **Persisting the selected `view` or the displayed week** — session-only React state; refresh returns to Day / the current week.
- **Week-transition slide animations / calendar polish** — prev/next week is instant, consistent with M9c.
- **A monthScore/yearScore aggregate** — M9d delivers `weekScore` only; the same honest-average rule (SG-m9d-01) will govern M9e's helpers, but those are M9e's deliverable.

### Regression surface

Enabling the Week segment **does create a test-regression surface — flagged here for VERIFIER as sanctioned-for-amendment** (handled the way M9c amended the BuildingClient tests):

- **`components/ViewSwitcher.test.tsx` — test ID `C-m9c-012`, the sub-test "Week segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect" (file line ~65).** This M9c assertion (`expect(weekTab).toHaveAttribute("aria-disabled", "true")` and "clicking does NOT call onSelect") is **made stale by AC #8** — M9d enables the Week segment, so the Week tab no longer carries `aria-disabled` and now _does_ call `onSelect`. The TESTS/BUILDER dispatch must **amend this sub-test**: either retarget it to assert Week is now a _live_ tab (selectable, fires `onSelect`, `aria-selected` toggles) — which is itself an M9d AC #8 test — or replace the "disabled" assertion with the Year tab (Year remains the disabled segment). The sibling sub-test "Year segment is disabled" (line ~75) stays valid unchanged. The "Week and Year tabs are rendered as disabled buttons" sub-test (line ~85) must also be amended to assert only Year is disabled. **This is a sanctioned, expected amendment — not a regression to fix in code.** VERIFIER should expect and approve it.
- **`app/(building)/AppShell.test.tsx` — no stale assertion.** The M9c AppShell tests (`C-m9c-001/002/013`) exercise only Day↔Month switching and the prop-refactor; none asserts the Week segment is unreachable or that `view` cannot be `"week"`. Widening `view` to include `"week"` and adding a `"week"` render branch is **purely additive** to `AppShell` — the existing AppShell tests pass unchanged. (New `"week"`-branch cases are an M9d TESTS deliverable, not an amendment.)
- **No other M9c/M1–M9b test** asserts Week is disabled or that `weekScore` does not exist — `grep` over the test suite confirms the `aria-disabled`/Week coupling is localized to `ViewSwitcher.test.tsx`'s `C-m9c-012`. The `ViewSwitcher` props-type widening (`"day" | "month"` → `"day" | "month" | "week"`) is source-only and breaks no test that does not also assert the old disabled state.

VERIFIER: please ratify the `C-m9c-012` amendment as expected M9d collateral (the only stale test), exactly as M9c's BuildingClient prop-lift amendments were ratified.

### Open questions for VERIFIER

**None outstanding.** All three spec gaps are resolved in-plan:

- **SG-m9d-01 — RESOLVED → a missed in-range past day counts as `0` in the week average** (the honest-scoreboard rule, as AC #4 fixes). `weekScore` contributes `0` for an included day whose `dayScore` is `NO_DATA`, and counts it in the denominator. VERIFIER ratifies this as the intended period-scoring semantics (the same rule will govern M9e).
- **SG-m9d-02 — RESOLVED → a vertical seven-row list of `WeekDayCell`s (reusing the M9c `DayCell` `kind` vocabulary at row scale), with the week aggregate as a prominent `--accent` ring + centered numeral above the list.** Chosen for the 430px column: rows give each day legible width; the ring echoes the M3 `<HeroRing>` / ADR-033 score-signature identity. The no-data state is a distinct `—` treatment, never `0%`.
- **SG-m9d-03 — RESOLVED → Sunday-start, confirmed consistent with M9c.** Verified against the real code: `MonthView.tsx` line 36 (`["Sun"…"Sat"]`) and `monthGrid.ts` line 29 (`getDay()`, `0=Sun`). `weekDates` derives the week's Sunday via `anchor − getDay()` with the identical `0=Sun` convention — the two views can never disagree on a week's seven dates.

VERIFIER may also wish to confirm: (a) `weekScore`'s purity — it derives "today" from `state.currentDate`, never `new Date()`, so it stays a pure function of `(state, anchorISO)`; (b) `lib/weekGrid.ts` introduces no `new Date(isoString)` (UTC-drift-free, multi-arg constructor only); (c) the week-aggregate ring uses only **defined** M0 tokens — no `var(--surface-2)`; (d) the `C-m9c-012` test amendment is the only stale-test collateral.

### ADR needed

None. ADR-045 (Accepted) locks the v2 schema M9d reads; ADR-019 locks the `0=Sun…6=Sat` weekday convention; ADR-033 governs the single-% ring identity reused for the aggregate; ADR-038 (forgiveness — missed = gray) governs the `missed` row; ADR-031 (44px) governs touch targets; the M0 design ADRs lock tokens/fonts/layout. M9d introduces no genuinely non-obvious decision: `weekScore` is the spec's own AC-#4 honest-average; the vertical-list + ring layout (SG-m9d-02) is a design choice within the M0 system, not a contract change; `lib/weekGrid.ts` as a sibling module mirrors M9c's `monthGrid.ts` pattern. The honest-period-average rule (missed = 0) is worth a future ADR **only if M9e wants to lock it across all period aggregates** — but for M9d it is simply AC #4 as written, ratified by VERIFIER per SG-m9d-01; no new ADR is required for this milestone.
