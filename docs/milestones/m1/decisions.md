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

## ADR-049 — M1 ACs #5 + #7 superseded by post-ship milestones (no code change)

**Status:** Accepted · 2026-05-23 · proposed by R1 hardening review

**Context.** The M1 post-ship code-review loop surfaced two findings against M1 spec ACs that turned out to be **intentional supersession by later milestones**, not regressions:

1. **AC #5** ("Building N of 365 where N = today's calendar day-of-year") — current code calls `dayNumber(state.programStart, todayIso)` (program-relative day), not `dayOfYear(new Date())` (calendar day-of-year). The change came from M8 (persistence), per AC #13 of M8's spec.

2. **AC #7** ("0% does not animate on mount — count-up arrives in M3") — M7c re-introduced count-up animation on first hydrated paint via the `firstPaintCountUp` prop on `<HeroRing>`. For pct=0 the count-up is a no-op (0→0 = no animation), so M1's empty state is observationally identical to the original AC #7 contract. Non-empty states (pct > 0) DO animate, which M1's AC #7 originally forbade.

**Decision.** Both ACs are formally superseded:

- AC #5 is rewritten to read: "Hero shows `Building N of 365|366`, where N = `dayNumber(programStart, today)` and the denominator = `daysInYear(today)`. M8's persisted `programStart` is the source of truth; the original day-of-year reading is retired."

- AC #7 is rewritten to read: "Hero numeral does not animate on mount FOR THE EMPTY STATE (pct=0). Non-empty states animate via M7c's `firstPaintCountUp` path (1.6s ease-out from 0 to current pct on first hydration)."

No code change. This ADR records the spec drift so future readers do not flag the same supersession as a bug.

**Consequences.**

- `lib/dayOfYear.ts:dayOfYear()` is now dead code (only `daysInYear` is imported by BuildingClient post-M8). Keep it for completeness — it is exported, has tests (U-m1-001..003), and removing it would churn the test suite without benefit.
- C-m1-005 and C-m1-007 (the original AC #5 / AC #7 unit tests) remain green because they test the day-1 / pct=0 cases that BOTH the original and superseded contracts agree on. They are NOT testing the superseded behavior — they test the still-valid boundary.

---

## ADR-050 — TopBar consumes `--safe-top` via inline calc()

**Status:** Accepted · 2026-05-23 · proposed by R1 hardening review (P1-2)

**Context.** `globals.css` declared `--safe-top: env(safe-area-inset-top, 0px)` but no element in the M1 render tree referenced it. The TopBar header used Tailwind '`pt-5`' (20px fixed), so on iPhones with a notch the header content overlapped the safe-area inset. The original E-m1-016 test was tautological (`box.y >= 0`) and did not catch it.

**Decision.** TopBar applies `paddingTop: calc(20px + var(--safe-top, 0px))` via inline style (Tailwind has no arbitrary-syntax escape for `calc()` with a CSS var in a way that compiles cleanly across our setup). The Tailwind `pb-3` for bottom padding is kept (no notch-equivalent at the bottom of the top bar).

**Consequences.**

- A future Tailwind upgrade with first-class `var()` support inside arbitrary classes can move this back into the className. The shape is documented in this ADR.
- E-m1-016 strengthened to assert: (a) computed paddingTop >= simulated notch height, (b) brand-mark element y >= simulated notch height. Mutation-resistant.

---

## ADR-051 — NOW pin in BlueprintBar is decorative (aria-hidden), NowLine is the canonical SR landmark

**Status:** Accepted · 2026-05-23 · proposed by R1 hardening review (P1-1)

**Context.** Both BlueprintBar's NOW pin and Timeline's NowLine exposed `role="img"` + `aria-label="Now ${now}"`. Screen-reader users heard the same time announced twice when traversing landmarks. A-m1-006 did not catch this — it asserted NowLine's attributes in isolation without checking uniqueness on the page.

**Decision.** NowLine is the sole canonical accessible landmark for the current time. BlueprintBar's NOW pin is `aria-hidden="true"` — purely decorative. The visible "11:04"-style text in BlueprintBar gives sighted users the cue; SR users navigate to the NowLine in the Timeline.

**Consequences.**

- A-m1-006 strengthened to assert exactly one element on the page carries an aria-label matching `/^Now \d{2}:\d{2}$/`.
- Future designs that want SR exposure for the BlueprintBar context should pick a DIFFERENT label (e.g. "Now 12:34 on day blueprint") to avoid landmark duplication.
