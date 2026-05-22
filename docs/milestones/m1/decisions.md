## ADR-015 — `NowCard` does not subscribe to edit mode

**Status:** Accepted · 2026-04-29 · proposed by EVALUATOR on Page 1 PASS

**Context.** Plan.md scoped delete affordances to `TimelineBlock` only. The builder hardcoded `editMode={false}` for bricks rendered inside `NowCard` (`components/NowCard.tsx:96`). Without an ADR, this looks like a coverage gap.

**Decision.** Bricks rendered inside `NowCard` are always view-mode, even when global edit mode is on. The current block can still be edited from the Timeline below.

**Consequences.** Surfacing delete on the active block in NowCard would be a confusing UX — the user is looking at the _now_ surface, not a structural surface. If a future feature wants in-context deletion, it gets a separate spec entry and ADR.

---

## ADR-020 — `now`, `today`, and `dayNumber` are derived live, not constants

**Status:** Accepted · 2026-04-29

**Context.** The hardcoded demo used `NOW = "11:47"`, `DAY_NUMBER = 119`, `TOTAL_DAYS = 365`, `TODAY_LABEL = "Wed, Apr 29"`. None of those should be constants in a real product.

**Decision.**

- `useNow()` (new in `lib/useNow.ts`) returns an `HH:MM` string from `new Date()`, ticking every 60s. Client-only.
- `today()` returns the local-date ISO string (`YYYY-MM-DD`). Used as a key into `logs` and `deletions` and as an input to `appliesOn`.
- `programStart` is persisted in `AppState` and seeded on first run (the day the user installs).
- `dayNumber = floor((today - programStart) / 1d) + 1` (1-based). Hero shows `Building N of 365` once `programStart` exists; otherwise the Hero hides the day-counter line.
- `dateLabel = formatLocale(today, "Wed, Apr 29")` style, derived live.

**Consequences.**

- `lib/data.ts` is reduced to a `defaultState()` factory; no hardcoded constants remain.
- Tests must inject a controlled clock (a `now` parameter on the relevant helpers, or `vi.setSystemTime`). The `useNow` hook should be mockable in component tests.
- E2E tests can override `Date.now` via Playwright's `page.addInitScript` or rely on the `useNow` injection seam.

---

## ADR-023 — `useNow()` paints the server clock on first render

**Status:** Accepted · 2026-05-01 · proposed by EVALUATOR on live-clock PASS

**Context.** The `useNow()` hook (`lib/useNow.ts`) initializes via `useState(() => formatHHMM(new Date()))`. On SSR, `new Date()` is the server's clock; on client first paint, it may differ slightly from the user's clock (network-roundtrip-bounded skew, typically < 2 s). Two options were available: (a) return `""` on SSR and update post-mount, eliminating the skew at the cost of a one-frame layout flash; (b) format the server-side clock and accept the small skew, avoiding the flash.

**Decision.** Use option (b). Server-side `Date()` formats to a placeholder `HH:MM`; the next `setInterval` tick (within 60 s) reconciles to the client clock. Acceptable for a single-user PWA where skew is bounded by network latency and the value is informational only (it doesn't drive math).

**Consequences.**

- No CLS flash on first paint.
- For up to one minute after first paint, the displayed time can be off by a few seconds vs. the user's wall clock. Imperceptible in practice.
- If the BlueprintBar's NOW pin ever drives time-critical UX (e.g. snapping animations to the minute boundary), revisit this — the wired component already accepts `now` as a string, so the seam is clean.
- Future ADR could move to option (a) under a strict-CLS design system; this ADR is the active default.

`lib/useNow.ts` carries a one-line comment referencing this ADR so future readers find the decision quickly.

---
