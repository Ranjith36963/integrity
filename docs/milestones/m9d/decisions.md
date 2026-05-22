## ADR-046 — Period-aggregate helpers are pure; "today" is `state.currentDate`, never the clock

**Status:** Accepted · 2026-05-18

**Context.** M9d introduced `weekScore(state, anchorISO)` — the first score that rolls a _period_ up from its days. M9e will add the month and year aggregates the same way. Each of these must decide which days count: a day after "today" is in the future and is excluded (the period is not over); a day before `programStart` is excluded; an in-range past day with no `history` entry counts as a 0 (the honest-scoreboard rule, SG-m9d-01). That logic depends on "what is today" — and the obvious-but-wrong implementation is to read the system clock (`new Date()` / `Date.now()`) inside the helper.

Reading the clock inside an aggregate makes the helper impure: its output changes with wall-time, it cannot be unit-tested deterministically, and it drifts under timezone (the M9a `parseLocalDate` lesson). M9d's `weekScore` instead derives "today" from `state.currentDate` — the in-progress day's date, which M9b's rollover already keeps current on every load. The EVALUATOR's M9d mutation-probe confirmed this keeps `weekScore` a pure, frozen-input-safe, clock-independent function.

**Decision.** Every period-aggregate helper in `lib/history.ts` — `weekScore`, and M9e's month/year aggregates — is a **pure function**. It takes the `AppState` and a reference/anchor date string; it derives "today" from `state.currentDate`; it never calls `new Date()` with no arguments, `Date.now()`, or any clock. The single clock read in the whole app stays where M9b put it: `usePersistedState` reads `today()` once on mount and feeds rollover. Date _math_ inside these helpers uses the multi-arg `Date` constructor only (UTC-drift-free, per the M9a precedent) — never `new Date(isoString)`.

The honest-scoreboard rule is part of this contract: an in-range, non-future day with no score counts as `0` in both numerator and denominator; future and pre-`programStart` days are excluded from both; a period with no qualifying day returns the `NO_DATA` (`null`) sentinel, never `0`.

**Consequences.**

- Period aggregates are deterministic and unit-testable with frozen fixtures — no `vi.setSystemTime` needed to pin a result, and a test _can_ advance the fake clock to prove the result does not move.
- `state.currentDate` is the single source of "today" for all read-time aggregation; if it is stale (the app left open across midnight — SG-m9b-03), aggregates reflect the stale day until the next load, consistently with every other view.
- M9e's `monthScore` / `yearScore` inherit this contract verbatim — same purity, same missed=0, same `NO_DATA` sentinel, same UTC-drift-free date math.
- Reversible: if a future feature genuinely needs wall-clock-relative aggregation, that is a new decision, not a quiet exception to this one.
