## Milestone 9e — Year view (Empire) + the complete calendar — Plan

### Context

M9d delivered the Castle (week) view and the first period aggregate (`weekScore`). M9e is the **final** chunk of Milestone 9 — it completes the calendar with the **Empire view**: a twelve-month overview of one year, each month cell showing that month's score, with the year's aggregate displayed prominently. It adds the last two period-aggregate helpers — `monthScore` and `yearScore` — built exactly on the ADR-046 pattern M9d established for `weekScore` (pure; "today" = `state.currentDate`, never the clock; honest-scoreboard missed = 0; `NO_DATA` sentinel). It fills the last inert switcher segment — after M9e all four of Day · Week · Month · Year are live. Tapping a month opens the M9c Month (Kingdom) view at that month. No new persistence, no schema change, no scoring-engine change.

### Feature grouping

m9e is **one feature group** (slug `m9e`), one BUILDER dispatch. `tests.md` IDs use the `m9e` slug (`U-m9e-*`, `C-m9e-*`, `E-m9e-*`, `A-m9e-*`).

### File structure

| File                               | Change                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/history.ts`                   | MODIFY — **additive only.** Add two exports: `monthScore(state, year, monthIndex)` and `yearScore(state, year)`. `dayScore`, `NO_DATA`, `weekScore`, `rollover`, `seedFreshDay`, `seedBrick` stay **byte-identical**. The new helpers are built ON `dayScore` (and may share a private `monthDates` iterator — see Year/month date math). No `dayScore`/`dayPct` edit. |
| `lib/yearGrid.ts`                  | NEW — pure date-math sibling to `lib/monthGrid.ts` / `lib/weekGrid.ts`. Exports `monthDates(year, monthIndex)` (the in-month ISO date list), `yearMonths(year)` (the twelve `{ year, monthIndex, name }` descriptors for the grid), and `addYear`/`subYear` (integer arithmetic). UTC-drift-free; multi-arg `Date` constructor only — never `new Date(isoString)`.     |
| `components/YearView.tsx`          | NEW — `"use client"`. The Empire view: year label + prev/next year nav, the year-aggregate ring, and a 3×4 grid of twelve `MonthCell`s. Mirrors `WeekView`'s structure (label row + aggregate ring + cell collection + nav). Hosts an inline `YearAggregate` ring component (purpose-built, see Components — sidesteps the `--surface-2` hazard).                      |
| `components/MonthCell.tsx`         | NEW — `"use client"`. One month tile in the Year grid: month name + a score indicator (heat-fill vocabulary at month scale) or a no-data treatment. Mirrors `WeekDayCell`'s reuse-not-fork relationship to `DayCell`.                                                                                                                                                  |
| `components/ViewSwitcher.tsx`      | MODIFY — flip the **Year** segment `live: false → true` (in the `SEGMENTS` array and the `Segment` union); widen the `view` / `onSelect` prop types to add `"year"`. After this edit no segment is `disabled` — the disabled-segment branch becomes dead code (BUILDER may keep it harmlessly or remove it; see Components).                                           |
| `components/MonthView.tsx`         | MODIFY — **one additive prop.** Add an optional `initialMonth?: { year: number; month: number }` prop; when supplied, `displayed` initializes from it instead of from `today()`. When absent, M9c behavior is byte-identical. No other change. (See The year→month tap-through.)                                                                                       |
| `app/(building)/AppShell.tsx`      | MODIFY — widen `view` state to `"day" \| "month" \| "week" \| "year"`; add a `"year"` render branch mounting `<YearView>`; add a `monthTarget` state (`{ year, month } \| null`) so a month tapped in the Year view is handed to `MonthView` via `initialMonth`. Wire `<YearView>`'s `onOpenMonth` callback.                                                           |
| `lib/history.test.ts`              | (test file — TESTS/BUILDER deliverable) `monthScore` / `yearScore` unit tests.                                                                                                                                                                                                                                                                                         |
| `lib/yearGrid.test.ts`             | (test file — TESTS/BUILDER deliverable) `monthDates` / `yearMonths` / `addYear` / `subYear` unit tests.                                                                                                                                                                                                                                                                |
| `components/YearView.test.tsx`     | (test file) component tests for the Empire view.                                                                                                                                                                                                                                                                                                                       |
| `components/MonthCell.test.tsx`    | (test file) component tests for the month tile.                                                                                                                                                                                                                                                                                                                        |
| `components/ViewSwitcher.test.tsx` | (test file — EXISTS) the M9c/M9d sub-tests asserting **Year is disabled** are now stale and **must be amended** — see Regression surface.                                                                                                                                                                                                                              |
| `app/(building)/AppShell.test.tsx` | (test file — EXISTS) gains `"year"`-branch + tap-through cases (additive — see Regression surface).                                                                                                                                                                                                                                                                    |
| `e2e/` (Playwright spec)           | (test file) deferred-to-preview E2E — switch to Year, month/year scores render, tap a month opens Month view.                                                                                                                                                                                                                                                          |

**Not modified — confirmed:** `lib/dharma.ts` (`dayPct`, `today`, `dateLabel` consumed unchanged — no scoring-engine edit); `lib/monthGrid.ts` and `lib/weekGrid.ts` (M9c/M9d date math byte-identical — `yearGrid.ts` is a **sibling**, not an extension); `lib/persist.ts` / `lib/usePersistedState.ts` (no schema change — schema stays `v2`; no rollover change; the single clock read stays in `usePersistedState`); `lib/types.ts` (`AppState`/`ArchivedDay`/`Recurrence`/`Block`/`Brick`/`Category` consumed **unmodified** — no new persisted type); `components/WeekView.tsx` / `components/WeekDayCell.tsx` / `components/DayCell.tsx` / `components/PastDayDetail.tsx` / `components/BuildingClient.tsx` (M9c/M9d views untouched); `app/page.tsx` (still renders `<AppShell />`); `app/globals.css` / `app/layout.tsx` (M9e uses existing M0 tokens — no new token).

### Data model

**No new persisted type. No schema change. Schema stays `v2` (ADR-045).** M9e reads `AppState` — `history`, `currentDate`, `programStart`, the in-progress `blocks`/`categories`/`looseBricks` — all present post-M9b. `ArchivedDay`, `Recurrence`, `Block`, `Brick`, `Category`, `AppState` consumed **unmodified**.

The two new helpers return `number | null`, reusing the existing `NO_DATA` (`null`) sentinel exported from `lib/history.ts` — no new type:

```ts
export function monthScore(
  state: AppState,
  year: number,
  monthIndex: number,
): number | null;
export function yearScore(state: AppState, year: number): number | null;
```

`monthIndex` is 0-indexed (`0` = January … `11` = December), matching the `Date` / `monthGrid.ts` convention. `yearGrid.ts` introduces one descriptor type for the grid:

```ts
type MonthDescriptor = { year: number; monthIndex: number; name: string };
```

(session-only, not persisted; used only to drive the twelve `MonthCell`s.)

### `monthScore` & `yearScore` helpers

Both live in `lib/history.ts`, both **pure**, both built ON `dayScore` — **they never reimplement day scoring** and never call `dayPct` directly. They honor **ADR-046 verbatim**: "today" is `state.currentDate` (never `new Date()` / `Date.now()` / any clock); honest-scoreboard rule (in-range non-future missed day = `0` in both numerator and denominator); future + pre-`programStart` days excluded from both; `NO_DATA` (`null`) when no day qualifies. Date math uses the multi-arg `Date` constructor only (via `lib/yearGrid.ts`) — never `new Date(isoString)`.

**`monthScore(state, year, monthIndex)` — contract (AC #4):**

- Iterate every calendar date of `(year, monthIndex)` via `monthDates(year, monthIndex)` (a `YYYY-MM-DD` list).
- For each date `d`: if `d > state.currentDate` → **future** → excluded (skip, no denominator). If `d < state.programStart` → **pre-start** → excluded (skip, no denominator). Otherwise (in-range, non-future) → `denominator += 1`; `const s = dayScore(state, d)`; if `s !== null` → `numerator += s`; if `s === null` (missed in-range past day) → contributes `0` (the default).
- `denominator === 0` (month entirely future, or entirely before `programStart`) → return `NO_DATA`.
- Else return `numerator / denominator`.
- This is **structurally identical to `weekScore`** — it differs only in the date set (a month's days, not a week's seven). The BUILDER may extract the shared per-date averaging into a private `averageDays(state, dates)` helper that `weekScore`, `monthScore`, and `yearScore` all call — a refactor sanctioned for the Refactor step, **but it must keep `weekScore`'s observable behavior byte-identical** (VERIFIER checks no M9d `weekScore` test regresses). If extraction risks any M9d regression, the BUILDER may instead duplicate the small loop — both are acceptable.

**`yearScore(state, year)` — contract (AC #5, resolves SG-m9e-01):**

- `yearScore` **averages `dayScore` over the year's days directly** — exactly the day-averaging `weekScore` uses — NOT the mean of the twelve `monthScore` values.
- Build the year's full date list: concatenate `monthDates(year, 0)` … `monthDates(year, 11)` (365 or 366 dates), then apply the **same** per-date averaging as `monthScore` (exclude future, exclude pre-start, missed-in-range = 0, `NO_DATA` when `denominator === 0`).
- **SG-m9e-01 — RESOLVED in-plan → average days directly, per AC #5.** Averaging the twelve `monthScore`s would over-weight short or sparsely-filled months (a 1-scored-day February would weigh as much as a 31-scored-day January). Day-averaging is the truthful "how did the year go." **Consequence the BUILDER and VERIFIER must accept as correct:** `yearScore(state, year)` may **differ** from the arithmetic mean of the twelve `monthScore(state, year, m)` values — they are two different (both valid) aggregations, and the Year view shows `monthScore` per cell + `yearScore` as the aggregate without any requirement that they reconcile. VERIFIER ratifies (the same reasoning ADR-046 applied to `weekScore`).

Both helpers are deterministic and unit-testable with frozen fixtures (no `vi.setSystemTime` needed to pin a result; a test _can_ advance the fake clock to prove the result does not move — ADR-046 consequence).

### The year→month tap-through (AC #10, resolves SG-m9e-03)

**The real-code constraint:** `components/MonthView.tsx` (lines 60–66) owns its own `displayed` month state, initialized from `today()` — it currently takes **no month prop**. For the Year view to open `MonthView` _at a specific month_, `MonthView` must accept the target month.

**Mechanism (minimal, additive):**

1. `MonthView` gains one **optional** prop: `initialMonth?: { year: number; month: number }`. The `useState` initializer for `displayed` becomes `initialMonth ?? { year: todayYear, month: todayMonth }`. When `initialMonth` is omitted (M9c/M9d call sites — `AppShell`'s plain Month branch), behavior is **byte-identical** to today. Prev/next still mutate `displayed` freely afterward (the prop only seeds the initial value).
2. `AppShell` gains a `monthTarget` state: `const [monthTarget, setMonthTarget] = useState<{ year: number; month: number } | null>(null)`.
3. `YearView` receives an `onOpenMonth(year, monthIndex)` callback. Tapping any `MonthCell` calls it.
4. `AppShell`'s handler: `function handleOpenMonth(year, month) { setMonthTarget({ year, month }); setView("month"); }`.
5. The `"month"` branch passes `initialMonth={monthTarget ?? undefined}` to `<MonthView>`. So a month tapped in the Year view opens the Month view _at that month_; a Month view reached directly via the switcher gets `monthTarget === null` → `MonthView` falls back to today's month (M9c behavior).
6. **`monthTarget` keying:** so that tapping a _different_ month re-seeds `MonthView` even though `displayed` is internal state, the `"month"` branch gives `<MonthView>` a `key` derived from `monthTarget` (e.g. `key={monthTarget ? \`${monthTarget.year}-${monthTarget.month}\` : "today"}`). This remounts `MonthView`on a new target so its`useState`initializer re-runs. (Switching to Month *not* via a month tap keys to`"today"` and shows today's month.)
7. **`monthTarget` reset:** selecting Month, Week, Day, or Year _via the `ViewSwitcher`_ clears `monthTarget` to `null` (in `handleSelectView`) so a subsequent direct Month-view visit is not stuck on a stale tapped month. Only `handleOpenMonth` sets it.

**SG-m9e-03 — RESOLVED in-plan → tapping ANY month opens the Month view, no inert months.** Every `MonthCell` — including a fully-future month and a month entirely before `programStart` — is tappable and routes through `onOpenMonth`. The M9c `MonthView` already renders empty/future/pre-start months correctly (its `DayCell` classification handles `future` / `pre-start` / `blank`), and month prev/next already lets the user roam to any month — so a no-op on out-of-range months would be inconsistent. There are no inert month cells. VERIFIER checks `MonthView` handles a handed-off out-of-range month without crashing (it does — the classification branches in `MonthView.tsx` lines 213–272 cover all cases).

### Year/month date math — `lib/yearGrid.ts`

A **new sibling module** to `lib/monthGrid.ts` and `lib/weekGrid.ts` — not an extension of either. Rationale matches M9d's: each grid module stays single-purpose, and `monthGrid.ts` / `weekGrid.ts` stay byte-identical (no M9c/M9d regression risk). All functions are pure and UTC-drift-free — multi-arg `Date` constructor only, **never `new Date(isoString)`** (the M9a/M9c/M9d discipline).

- **`monthDates(year, monthIndex): string[]`** — the in-month ISO `YYYY-MM-DD` dates, day 1 → last day. Days-in-month via `new Date(year, monthIndex + 1, 0).getDate()` (day 0 of next month = last day of this month — the exact technique `monthGrid.ts` line 32 already uses). ISO assembled by string padding (no `Date`→string round-trip). This is the per-month iterator both `monthScore` and `yearScore` consume.
- **`yearMonths(year): MonthDescriptor[]`** — the twelve `{ year, monthIndex, name }` descriptors (`name` from a `MONTH_NAMES` array) driving the 3×4 grid.
- **`addYear(year): number`** = `year + 1`; **`subYear(year): number`** = `year - 1` — integer arithmetic, no `Date` object.
- A leap year is handled automatically: `monthDates(2028, 1)` (February 2028) yields 29 dates because `new Date(2028, 2, 0).getDate() === 29`. No special-casing.

The Year view's "current year" detection: `YearView` reads `today()` **once** (from `lib/dharma.ts`, the same call `MonthView`/`WeekView` make) only to seed the initially-displayed year and to mark the current-year/current-month UI affordance — it does **not** pass the clock into the helpers. The helpers' "today" is `state.currentDate` (ADR-046). (Note: `state.currentDate` and `today()` agree after M9b rollover runs on mount — the one accepted exception is the app-left-open-across-midnight case, SG-m9b-03, where both views are consistently stale.)

### Components

All new components are `"use client"`. They reuse M0 tokens and the established M9c/M9d primitives' _visual language_; no new `app/globals.css` token; **no `var(--surface-2)`** (undefined — see Design tokens).

**`<YearView>` (NEW) — the Empire view — mirrors `<WeekView>`'s structure**

- **Props:** `{ state: AppState; onOpenMonth: (year: number, monthIndex: number) => void }`. (Note: unlike `MonthView`/`WeekView`, `YearView` takes `onOpenMonth`, not `onOpenDay` — the Year view's tap target is a month, not a day.)
- **Owned state:** `const [displayedYear, setDisplayedYear] = useState<number>(() => Number(today().slice(0, 4)))` — session-only, not persisted (consistent with `MonthView`'s `displayed` and `WeekView`'s `anchor` — refresh returns to the current year). The clock is read **once**, here, for the initial year.
- **Renders (top → bottom), mirroring `WeekView`'s layout (label row → aggregate ring → cell collection):**
  1. A header row: `ChevronLeft` "Previous year" button (44px hit area) · the year label (`<h2>`, `var(--font-display)`, `var(--fs-22)`, `var(--ink)`) · `ChevronRight` "Next year" button — byte-for-byte the same header pattern as `MonthView`/`WeekView`.
  2. A prominent **`YearAggregate`** ring (the Empire score) — inline component, see below.
  3. A **3×4 grid** of twelve `<MonthCell>`s — `display: grid; gridTemplateColumns: repeat(3, 1fr); gap: var(--sp-8, 8px)` (resolves SG-m9e-02). Wrapper carries `role="list"` `aria-label="Months of <year>"`.
- For each of `yearMonths(displayedYear)`, `YearView` computes that month's `score = monthScore(state, descriptor.year, descriptor.monthIndex)` and passes it to `<MonthCell>`. It also passes `isCurrentMonth` (true when `descriptor.year`/`monthIndex` equal today's year/month) so the current month gets the today-style accent ring.
- Prev/next: `setDisplayedYear((y) => subYear(y))` / `addYear(y)`.
- `displayedYear` changing re-derives all twelve `monthScore`s and the `yearScore` on the next render — no extra state.
- Reduced-motion / animation: year prev/next is **instant** — no slide animation (consistent with M9c/M9d instant nav).

**`YearAggregate` (inline component inside `YearView.tsx`) — the Empire score ring**

- **This deliberately mirrors M9d's `WeekAggregate`** (the inline ring inside `WeekView.tsx`, lines 46–150) — same SVG `<circle>` `stroke-dasharray` arc technique, same token set, same no-data `—` treatment. The BUILDER **may copy `WeekAggregate`'s shape** and change only the label text (`"Week"` → `"Year"`) and the `aria-label` prefix (`"Week score …"` → `"Year score …"`). A shared extracted `<ScoreRing>` is **optional** (a sanctioned Refactor-step move) but not required — copying the small, proven `WeekAggregate` is acceptable and keeps M9d's `WeekView` byte-identical.
- Props: `{ score: number | null }`. `score !== null` → `--accent` progress arc on a `--card-edge` track + centered `Math.round(score)%` numeral in `--font-display` `--fs-32` `--ink`. `score === null` → no arc, centered `—` glyph in `--ink-dim`. Label `"Year"` below in `--font-ui` `--fs-10` `--ink-dim`.
- `role="img"` on the `<svg>` with `aria-label` = `` `Year score ${Math.round(score)} percent` `` or `"Year score: no data"` — same grammar as `WeekAggregate`.
- **Tokens:** `--accent` (arc), `--card-edge` (track), `--ink` (numeral), `--ink-dim` (no-data glyph + label) — all **defined**. No `--surface-2`.

**`<MonthCell>` (NEW) — one month tile — reuses the `DayCell`/`WeekDayCell` kind vocabulary at month scale (resolves SG-m9e-02)**

- **Reuse-vs-fork decision — identical reasoning to M9d's `WeekDayCell`:** `MonthCell` is a NEW component that **imports nothing from `DayCell`/`WeekDayCell`** but **deliberately matches their visual language** (the same heat-fill formula, the same per-state treatments, the same token set). `DayCell` is a square tuned for month-grid density; `WeekDayCell` is a full-width row; a month tile is a third shape (a tile in a 3×4 grid). Threading a layout prop through `DayCell` would entangle three views' layouts in one file. The shared _contract_ — not shared _code_ — is the state vocabulary and the heat formula; both are restated here so the BUILDER needs no cross-read.
- **Props:** `{ year: number; monthIndex: number; name: string; score: number | null; isCurrentMonth?: boolean; onOpen: () => void }`. Note `score` is `number | null` — unlike `DayCell`/`WeekDayCell` which split `scored` vs no-data into separate `kind` props, `MonthCell` takes a nullable `score` because **every month cell is tappable** (SG-m9e-03 — no inert months); the `null` vs number split is a _visual_ distinction only, not an interactivity one.
- **Renders:** a `<button>` (every month is tappable — AC #10 / SG-m9e-03), `role="listitem"` wrapper or the button itself carrying `role="listitem"`-equivalent, min height 44px (ADR-031), `borderRadius: 6px`. Contents: the month name (`var(--font-ui)`, `var(--fs-12)`, `var(--ink)`) and the score indicator.
  - **`score !== null`** → heat fill `rgba(251,191,36, alpha)` where **`alpha = 0.12 + (score/100) * 0.78`** (the M9c/M9d formula, restated) + the numeral `Math.round(score)` (`var(--fs-12)`, `var(--ink)`). A `score === 0` month → alpha `0.12` (faint but present) + numeral `"0"`.
  - **`score === null`** (no-data — a month with no in-range non-future days: fully future, or fully before `programStart`) → **no heat fill**, a distinct no-data treatment: `var(--card)` background + `var(--card-edge)` border + a `—` glyph in `--ink-dim` (the same no-data vocabulary `WeekAggregate` uses for `—`, and the same gray treatment `DayCell`'s `missed`/`future` use). This makes "no-data month" visually distinct from a "scored 0" month (AC #3, spec edge case "month with bricks but 0 score vs month never opened" — note: a fully-_unopened in-range past_ month is **not** `null`, it scores a low/0 number because its missed days average to 0; only a fully-future or fully-pre-start month is `null`).
  - `isCurrentMonth` → adds a `2px solid var(--accent)` outline (`outlineOffset: 1px`) — the same today-marker treatment `DayCell`/`WeekDayCell` use for `isToday`.
- **A11y:** the `<button>` carries an `aria-label`: `` `<MonthName> <year>, score <N> percent` `` for a scored month, `` `<MonthName> <year>, no data` `` for a `null` month, with `", current month"` inserted when `isCurrentMonth`. Heat-fill alpha floor `0.12` keeps the `var(--ink)` text AA-legible against the dark page chrome (as in M9c/M9d).

**`<ViewSwitcher>` (MODIFY — one-flag edit + type widening, mirrors M9d's Week-enable)**

- The M9c/M9d `ViewSwitcher` already renders four segments; Year is `{ label: "Year", value: "year", live: false }`. **The structural edit: flip Year's `live` flag `false → true`** in the `SEGMENTS` array and in the `Segment` union type. After this edit **all four segments are `live`** — Day, Week, Month, Year.
- The props type widens: `view: "day" | "month" | "week"` → `"day" | "month" | "week" | "year"`, and the `onSelect` parameter likewise. With Year now `live`, the existing live-segment branch handles it with **zero new branching** (it already maps `seg.value` through `onSelect` and computes `isActive = view === seg.value`).
- **The disabled-segment branch (`if (!seg.live)`) becomes dead code** — no segment is `live: false` anymore. The BUILDER MAY delete the dead branch (cleaner) or leave it (harmless, no segment reaches it). Plan baseline: **delete it**, since leaving an unreachable branch invites a lint `no-unused`/dead-code complaint and there is no future fifth segment specced. VERIFIER confirms whichever the BUILDER chooses leaves the four live tabs correct.
- Result: Year renders as a live, selectable, `aria-selected`-aware tab; the active-view indicator (filled `var(--accent)` background) works for it identically to Day/Week/Month. **No segment carries `aria-disabled` anymore** — see Regression surface for the stale tests this makes.
- A11y: `role="tablist"` `aria-label="Calendar view"`, four `role="tab"` segments, all in the tab order; arrow-key navigation now moves across **four** enabled tabs with no skip. The active segment is indicated by color **and** `aria-selected` (not color alone).

**`<MonthView>` (MODIFY — one optional prop, see The year→month tap-through)** — gains `initialMonth?: { year: number; month: number }`; the `displayed` `useState` initializer becomes `initialMonth ?? { year: todayYear, month: todayMonth }`. No other change. M9c/M9d call sites that omit the prop are byte-identical.

**`<AppShell>` (MODIFY)** — widens `view` to `"day" | "month" | "week" | "year"`; adds `monthTarget` state; adds the `"year"` render branch (`<YearView state={state} onOpenMonth={handleOpenMonth} />`); passes `initialMonth` + a `monthTarget`-derived `key` to `<MonthView>`; `handleSelectView` clears `monthTarget`. See The year→month tap-through for the exact wiring.

### Dependencies

**None.** No new `package.json` entry. `lucide-react` (installed) supplies `ChevronLeft`/`ChevronRight`. Vitest + Testing Library + Playwright + `@axe-core/playwright` (all installed) cover the tests. No `date-fns`/`dayjs` — `lib/yearGrid.ts` is small and pure, matching `monthGrid.ts`/`weekGrid.ts`.

### Design tokens

All M0 tokens, all **defined** in `app/globals.css` (verified lines 11–79). M9e introduces **no new token**.

| Element                        | Tokens                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Year label (`<h2>`)            | `var(--font-display)` (Instrument Serif), `var(--fs-22)`, `color: var(--ink)`                                                                                                    |
| Prev/next year chevrons        | `color: var(--ink)`, 44px hit area (ADR-031); `ChevronLeft`/`ChevronRight` from `lucide-react`                                                                                   |
| `YearAggregate` ring           | arc `var(--accent)` (#fbbf24), track `var(--card-edge)`, numeral `var(--font-display)` `var(--fs-32)` `var(--ink)`, no-data `—` + `"Year"` label `var(--ink-dim)` `var(--fs-10)` |
| `MonthCell` — scored           | heat fill `rgba(251,191,36, alpha)`, `alpha = 0.12 + (score/100) * 0.78`; month name + numeral `var(--ink)` `var(--fs-12)`; `var(--font-ui)`                                     |
| `MonthCell` — no-data (`null`) | `background: var(--card)`, `border: 1px solid var(--card-edge)`, `—` glyph + name `var(--ink-dim)`                                                                               |
| `MonthCell` — current month    | `outline: 2px solid var(--accent)`, `outlineOffset: 1px`                                                                                                                         |
| 3×4 grid                       | `display: grid; gridTemplateColumns: repeat(3, 1fr); gap: var(--sp-8, 8px)`; container padding `var(--sp-12, 12px)`                                                              |
| Switcher active tab            | `background: var(--accent)`, text `var(--bg)`; inactive text `var(--ink-dim)` (unchanged from M9c/M9d)                                                                           |

**Heat-fill formula — identical to M9c `DayCell` / M9d `WeekDayCell`:** `alpha = 0.12 + (score/100) * 0.78` (range `0.12`→`0.90`). Restated so the BUILDER needs no cross-read. `score 0` → alpha `0.12` + numeral "0"; `score === null` → no fill, `—` glyph.

**Important — do NOT use `var(--surface-2)`:** `HeroRing` and `TimelineBlock` reference `var(--surface-2)`, but that token is **NOT defined** in `app/globals.css` (which defines `--bg`, `--bg-elev`, `--bg-2`, `--card`, `--card-edge`, `--ink`, `--ink-dim`, `--ink-faint`, `--accent`, `--accent-deep` — no `--surface-2`). `YearAggregate` and `MonthCell` must use only the **defined** tokens above — the same self-contained-ring discipline M9d's `WeekAggregate` followed. The BUILDER must not introduce or propagate a `--surface-2` reference. VERIFIER checks.

### Edge cases

| Spec edge case                                                                        | Planned code path                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Current year — partial current month**                                              | `monthScore` for the current month iterates its days; days `> state.currentDate` are excluded — so the current month averages only its in-range non-future days, including today's live `dayScore` (AC #7). Months after the current month → every day is future → `denominator === 0` → `NO_DATA`.                |
| **Fully past year**                                                                   | Every day of every month is in-range past; all twelve `monthScore`s and `yearScore` average all qualifying days (archived `dayPct`, or `0` for a missed in-range day).                                                                                                                                             |
| **Fully future year** (`displayedYear` > current year)                                | Every day of every month is `> state.currentDate` → every `monthScore` `denominator === 0` → all twelve cells `NO_DATA` (the `—` no-data tile); `yearScore` `denominator === 0` → `NO_DATA` → `YearAggregate` shows `—`, never `0%`, no crash.                                                                     |
| **Year containing `programStart`**                                                    | Months entirely before `programStart` → every day `< state.programStart` → excluded → `denominator === 0` → `NO_DATA` cell. The month containing `programStart` → counts only days `>= programStart`. Months after → score normally.                                                                               |
| **First run** (history empty, today is `programStart`, displayed year = current year) | Only the current month has a number (driven solely by today's live `dayScore`); all earlier months are pre-start `NO_DATA`; all later months are future `NO_DATA`; `yearScore` reflects only the single in-range day. No crash on empty `history`.                                                                 |
| **Month with bricks but 0 score** vs **month never opened**                           | A month never opened but **in-range past** is NOT `null` — its missed days each contribute `0`, so `monthScore` returns a low/`0` _number_ (heat-fill alpha `0.12` + numeral "0"). Only a fully-future or fully-pre-start month is `null` (the `—` tile). The two are visually distinct: "0" numeral vs "—" glyph. |
| **Prev/next far past `programStart` or far into the future**                          | `addYear`/`subYear` are unbounded integer arithmetic; an all-no-data year renders twelve `—` tiles + a `—` aggregate without crashing. No date overflow — `monthDates` uses the multi-arg `Date` constructor which handles any year.                                                                               |
| **Leap year** (e.g. 2028)                                                             | `monthDates(2028, 1)` yields 29 dates (`new Date(2028, 2, 0).getDate() === 29`); `yearScore` for 2028 iterates 366 days. No special-casing — automatic.                                                                                                                                                            |
| **Tapping a future / pre-start month**                                                | Opens the M9c Month view at that month regardless (SG-m9e-03) — `MonthView` renders the empty/future/pre-start month correctly via its existing `DayCell` classification. No inert month.                                                                                                                          |

### Accessibility

- **`ViewSwitcher`:** `role="tablist"` `aria-label="Calendar view"`; **all four** segments are `role="tab"` + `aria-selected`, all in the tab order — arrow keys move across four tabs with no skip. Active segment indicated by color **and** `aria-selected`.
- **`YearView`:** the twelve-cell grid wrapper is `role="list"` `aria-label="Months of <year>"`; each `MonthCell` is keyboard-operable (it is a `<button>` — focusable, Enter/Space activate). Prev/next year buttons carry `aria-label="Previous year"` / `"Next year"` and 44px hit areas (ADR-031). The `YearAggregate` `<svg>` is `role="img"` with a descriptive `aria-label`.
- **`MonthCell` labels:** scored → `"<Month> <year>, score <N> percent"`; no-data → `"<Month> <year>, no data"`; `", current month"` inserted when `isCurrentMonth`.
- **430px (AC #11):** the 3×4 grid is `repeat(3, 1fr)` — three columns inside the `max-w-[430px]` shell with `var(--sp-8)` gaps; each tile is comfortably ≥ 44px. No horizontal overflow. The `YearAggregate` ring (≈100px, matching `WeekAggregate`) fits the column.
- **Contrast (AC #11, axe-clean):** month-name/numeral text is `var(--ink)` over near-`--bg` heat fills (AA-safe); the `—` glyph and labels are `--ink-dim` on `--bg`/`--card` (AA at the M0 set); the ring's `--accent` arc on `--card-edge` track is non-text decoration. Heat-fill alpha floor `0.12` keeps tile text AA-legible. VERIFIER checks.

### Commit strategy

m9e is **one feature group, one BUILDER dispatch.** The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned:** the BUILDER may group red + green commits per logical area — one pair for `lib/yearGrid.ts` date math, one for the `monthScore` + `yearScore` helpers (incl. any sanctioned `averageDays` extraction), one for the `ViewSwitcher` Year-enable (including the stale-test amendments), one for `<YearView>` + `<MonthCell>` + the `YearAggregate` ring, one for the `MonthView` `initialMonth` prop + `AppShell` wiring — rather than one commit pair per individual test ID. Red commits: `test(m9e): …`; green/refactor commits: `feat(m9e): …` or `fix(m9e): …`.

**Commit-label accuracy — explicit instruction to the BUILDER:** M9d shipped a mislabeled batch commit (a commit whose message named one area but whose diff touched another). **Do not repeat that.** Each batch commit message must name _exactly_ the area(s) its diff touches — if a commit touches both `lib/yearGrid.ts` and `lib/history.ts`, the message must say so, not name only one. The EVALUATOR and orchestrator hold the BUILDER to per-group granularity **and** to accurate labels. No phase exit until every `m9e` test ID in `tests.md` is green **and** the stale-test amendments below are green.

### Out of scope

- **A sixth zoom level beyond the year** — the Empire (year) is the top of the ladder for Phase 1. No multi-year scrolling history beyond simple prev/next year nav.
- **Storing period totals** — `monthScore`/`yearScore` are computed on read every render; nothing is persisted. No schema change.
- **A new score engine** — `monthScore`/`yearScore` are averages of `dayScore`; `dayScore`/`dayPct` are consumed byte-identical. M9e edits no scoring logic.
- **Editing or deleting archived days** — the Year view is strictly read-only (ADR-045); tapping a month opens the _read-only-respecting_ M9c Month view, which itself only opens past days via the read-only `PastDayDetail`.
- **Changing the M9c/M9d views, rollover, or persistence** — `WeekView`/`WeekDayCell`/`DayCell`/`PastDayDetail`/`monthGrid.ts`/`weekGrid.ts`/`rollover`/`persist`/`usePersistedState` are byte-identical except for `MonthView`'s single additive `initialMonth` prop (which leaves prop-omitting call sites unchanged).
- **Year-transition slide animations / calendar polish** — prev/next year is instant, consistent with M9c/M9d.

### Regression surface

Enabling the Year segment **creates a test-regression surface — flagged here for VERIFIER as sanctioned-for-amendment**, exactly as M9c amended the BuildingClient tests and M9d amended `C-m9c-012`:

- **`components/ViewSwitcher.test.tsx` — the Year-disabled assertions are now stale and MUST be amended.** M9d's plan and tests left Year as the lone disabled segment; any M9c/M9d sub-test asserting Year carries `aria-disabled="true"`, is `disabled`, is out of the tab order, or does NOT fire `onSelect` when clicked is **made stale by AC #8** — M9e enables Year. The TESTS/BUILDER dispatch must **amend these**: retarget them to assert Year is now a _live_ tab (selectable, fires `onSelect`, `aria-selected` toggles) — which is itself an M9e AC #8 test. Specifically expect to amend:
  - The M9d-era sub-test asserting **"Year segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect"** (the M9d analogue of the `C-m9c-012` Week sub-test). After M9e this assertion is false — Year is live.
  - Any sub-test asserting **"only Year is rendered as a disabled button"** / **"the disabled segment is Year"** — after M9e **no** segment is disabled; this sub-test must be amended to assert all four segments are live, or removed.
  - VERIFIER: the TESTS author must locate the live test IDs (the `C-m9c-*`/`C-m9d-*` IDs covering `ViewSwitcher`'s disabled-Year sub-tests) and amend them; **this is sanctioned, expected M9e collateral — not a regression to fix in code.**
- **A11y test surface:** any M9c/M9d axe or keyboard-nav test for `ViewSwitcher` that asserts arrow-key navigation **skips a disabled tab** (Year) or that a disabled tab is **out of the tab order** is stale — after M9e all four tabs are in the tab order and arrow-nav crosses all four with no skip. The TESTS/BUILDER dispatch must amend any such assertion. VERIFIER: flag and ratify.
- **`app/(building)/AppShell.test.tsx` — no stale assertion.** The M9c/M9d AppShell tests exercise Day/Month/Week switching; none asserts the Year segment is unreachable or that `view` cannot be `"year"`. Widening `view` to include `"year"`, adding the `"year"` branch, and adding `monthTarget` are **purely additive** — existing AppShell tests pass unchanged. (New `"year"`-branch + tap-through cases are an M9e TESTS deliverable, not an amendment.)
- **`components/MonthView.test.tsx` — no stale assertion.** The new `initialMonth` prop is **optional**; every M9c/M9d test that omits it gets byte-identical behavior. Additive only.
- **No other M1–M9d test** asserts Year is disabled or that `monthScore`/`yearScore` do not exist. The `ViewSwitcher` props-type widening (`… | "year"`) is source-only and breaks no test that does not also assert the old disabled state.

VERIFIER: please ratify the `ViewSwitcher` Year-disabled amendments (and any stale a11y skip-assertion) as expected M9e collateral — the last switcher-enable in M9, exactly as M9d's `C-m9c-012` Week-enable was ratified.

### Open questions for VERIFIER

All three SG items are **resolved in-plan** — none carried forward open:

- **SG-m9e-01 — RESOLVED → `yearScore` averages DAYS directly** (per AC #5), not the twelve `monthScore`s. `yearScore` may differ from the mean of the twelve `monthScore`s — that divergence is correct and expected (averaging months over-weights short/sparse months). VERIFIER ratifies, consistent with ADR-046's reasoning for `weekScore`.
- **SG-m9e-02 — RESOLVED → a 3×4 month-cell grid + a prominent `YearAggregate` ring above it.** Twelve `MonthCell`s in `repeat(3, 1fr)` reusing the M9c/M9d heat-fill vocabulary at month scale; the year aggregate is an `--accent` ring + centered numeral mirroring M9d's `WeekAggregate`. The no-data state is a distinct `—` tile, never `0%`. Chosen against the 430px column and the M0 tokens.
- **SG-m9e-03 — RESOLVED → tapping ANY month opens the M9c Month view at that month** — including fully-future and pre-`programStart` months. No inert month cells; `MonthView` already renders empty/future/pre-start months correctly. VERIFIER checks `MonthView` handles a handed-off out-of-range month without crashing (it does — its `DayCell` classification covers all cases).

VERIFIER may also wish to confirm: (a) `monthScore`/`yearScore` purity — "today" is `state.currentDate`, never `new Date()`/`Date.now()` (ADR-046); (b) `lib/yearGrid.ts` introduces no `new Date(isoString)` (UTC-drift-free, multi-arg constructor only); (c) `YearAggregate`/`MonthCell` use only **defined** M0 tokens — no `var(--surface-2)`; (d) the `ViewSwitcher` Year-disabled test amendments are the only stale-test collateral; (e) if the BUILDER extracts a shared `averageDays` helper, M9d's `weekScore` behavior stays byte-identical (no M9d test regresses).

### ADR needed

None. ADR-046 (Accepted) is the **heart of m9e** — `monthScore`/`yearScore` inherit its pure-aggregate contract verbatim ("today" = `state.currentDate`, missed = 0, `NO_DATA` sentinel, UTC-drift-free date math); ADR-046's "Consequences" block explicitly names M9e's month/year aggregates as inheriting the contract, so m9e adds no new decision. ADR-045 (Accepted) locks the v2 schema M9e reads read-only; ADR-019 locks the `0=Sun…6=Sat` weekday convention (inherited via `monthGrid.ts`); ADR-033 governs the single-% ring identity reused for the `YearAggregate`; ADR-038 (forgiveness — missed = gray) governs the no-data tile; ADR-031 (44px) governs touch targets; the M0 design ADRs lock tokens/fonts/layout. M9e introduces no genuinely non-obvious decision: `monthScore`/`yearScore` are the spec's own AC-#4/#5 honest-averages under the already-Accepted ADR-046; the 3×4 grid + ring layout (SG-m9e-02) is a design choice within the M0 system, not a contract change; `lib/yearGrid.ts` as a sibling module mirrors the `monthGrid.ts`/`weekGrid.ts` pattern; the `initialMonth` prop + `monthTarget` tap-through is a conventional additive React wiring. No new ADR is required for this milestone — and with m9e, Milestone 9 (the calendar) is complete: all four switcher views are live.

---
