## Milestone 1 — Empty Building Shell

> **Pillars:** § 0.1 (spatial timeline as the wedge), § 0.3 (visual identity — single-% ring + per-category bar), § 0.5 (three-ways-to-add chrome), § 0.6 (calendar hierarchy — Building = 1 day), § 0.9 (data model — blocks always timed, app starts with `blocks: []`), ADR-023 (`useNow()` server-paint), ADR-039 (ships empty).

### Intent

Render the main day screen — the "Building" — in its empty state. The full chrome of the daily surface is visible: top bar (DHARMA logo, Edit toggle, Settings), hero (date · "Building N of 365" · 0%), Day Blueprint bar (empty outline), 24-hour vertical timeline with faded hour labels and an amber now-line that tracks real time, and the floating bottom dock (Voice Log + `+`) with both buttons rendered but inert. Inside the timeline: zero blocks, zero bricks, and a single pulsing empty-state card.

This milestone proves the spatial metaphor and chrome layout work on a real iPhone viewport before any interaction is wired. M2 wires the `+`. M3 fills the hero with real %. M9 wires Castle/Kingdom/Empire navigation. M10 wires Voice. M1 is the skeleton every later milestone hangs muscle on.

**What this is NOT:** a skeleton screen, a loading state, or a demo with seeded blocks. Per ADR-039 the app ships completely empty. The only narrative copy on screen (beyond the time/date/percent labels) is: _"Tap any slot to lay your first block."_

### Inputs

- **Current time** — drives the now-line vertical position; reuses the existing `useNow()` hook (`lib/useNow.ts`, returns `"HH:MM"` string, ticks every 60 s, server-paints first frame per ADR-023). This milestone does NOT introduce a new clock hook.
- **Calendar date** — drives the hero's date label and the day-of-year computation for "Building N of 365" (see § "dayNumber semantics" below).
- **Empty blocks array** — `blocks: []` from `AppState`. No factory blocks, no seed data, no demo fixtures (ADR-039).
- **Design system from M0** — tokens (`app/globals.css`), motion config (`lib/motion.ts`), reduced-motion helper (`lib/reducedMotion.ts`), primitives (`components/ui/*` — `<EmptyState>` and `<Toggle>` are the relevant ones for M1), fonts (Instrument Serif Italic + JetBrains Mono + Geist Sans via `next/font`).
- **Viewport** — mobile-first, max-width 430px, dark bg `--bg` (`#07090f`).

### Outputs

The Building day view exposes seven user-visible regions. PLANNER decides exact file paths and whether to refactor existing prior-pivot components (`components/TopBar.tsx`, `components/Hero.tsx`, `components/BlueprintBar.tsx`, `components/Timeline.tsx`, `components/EmptyBlocks.tsx`, `components/BottomBar.tsx`, `components/NowCard.tsx`) under the milestone-tagged migration policy from `phase1plan.md`. SPEC fixes WHAT renders, not file layout.

| Region                | Role in M1                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Top bar**           | DHARMA wordmark + amber logo tile · `<Toggle>` Edit-mode pencil (renders, no-op until M5) · Settings gear icon (renders, no-op until later milestone)                                                                                         |
| **Hero**              | Today's date label · "Building N of 365" line (N = day-of-year, see below) · giant Instrument Serif Italic `0%` · "day complete" caption                                                                                                      |
| **Day Blueprint bar** | Empty outlined container with faint grid; zero category segments (no categories exist yet)                                                                                                                                                    |
| **Schedule timeline** | Scrollable 24-hour vertical column; faded JetBrains Mono hour labels `00:00`–`23:00` down the left margin; amber now-line at current `useNow()` position; zero block cards; the NowCard (active-block card) is hidden because no blocks exist |
| **Empty-state card**  | Pulsing card inside the timeline area with copy: _"Tap any slot to lay your first block."_ Built atop M0's `<EmptyState>` primitive.                                                                                                          |
| **Floating dock**     | Voice Log button (amber primary, visibly disabled, no-op until M10) · `+` button (secondary, visible, no-op until M2). Bottom-anchored, respects `env(safe-area-inset-bottom)`.                                                               |
| **Page composition**  | The Building day view at the app root (`app/page.tsx`) composes the above into a single mobile-viewport surface.                                                                                                                              |

**dayNumber semantics in M1.** Persistence + `programStart` arrive in M8. Until then, M1 computes `dayNumber` as the **calendar day-of-year from `new Date()`** (today = 2026-05-06 → 126 of 365; leap years → 366). This is honest data — no false "1 of 365" hardcode, no missing element. M8 will replace the day-of-year computation with the user's `programStart`-relative day number.

### Edge cases

- **Now-line at the very top (00:00) or bottom (23:59) of the timeline** — position clamps to timeline boundaries; never overflows the scroll container.
- **Midnight crossing during a session** — when `useNow()` ticks from 23:59 to 00:00, the now-line snaps to the top of the timeline. Cross-day "what is today" recomputation is M9's job; M1 just clamps cleanly.
- **Scroll position on mount** — the timeline mounts already scrolled so the now-line is in the visible viewport (Apple-Calendar behavior). Exact scroll math belongs in PLAN.
- **`prefers-reduced-motion: reduce`** — empty-state card pulse collapses to static; the now-line renders as a plain static rule with no animation class; hero numerals do not animate on mount. Reduced-motion is honored everywhere or it is broken.
- **Safe-area insets (iOS notch + home indicator)** — top bar respects `env(safe-area-inset-top)`; floating dock respects `env(safe-area-inset-bottom)`; nothing clips behind the iOS chrome.
- **Viewport height < 600px** — timeline remains scrollable; nothing collapses or overflows horizontally.
- **No blocks** — the empty-state card is the only content inside the timeline column. Block-card components are not imported, not rendered, not in the DOM. The NowCard (active-block card) is also not in the DOM. The Day Blueprint bar renders its empty outline with no segments.
- **Leap year for `dayNumber`** — Feb-29 yields N=60 within a 366-day year; "Building 60 of 366". Not "60 of 365".
- **SG-bld-16 (rest-day vs first-run empty)** — N/A in M1 (no recurrence yet, no persistence yet, blocks list is always empty in M1). Resurfaces in M9; tracked there.

### Acceptance criteria

**Top bar**

1. A header renders at the top of the page containing: DHARMA wordmark + amber logo tile, an Edit-mode toggle button, and a Settings button.
2. The Edit-mode toggle is rendered with `aria-pressed="false"` initially; tapping it does not throw, and may toggle internal state (edit-mode behavior itself ships in M5).
3. The Settings button is rendered with `aria-label="Settings"` and is keyboard-focusable; tapping it is a no-op in M1.

**Hero** 4. The hero region displays today's date in human-readable form (e.g., "Wed · May 6"). 5. The hero displays a "Building N of 365" line where N = today's calendar day-of-year (366 in leap years). 6. The hero displays `0%` rendered in Instrument Serif Italic at the spec'd display type scale. 7. The "0%" numeral does not animate on mount (no count-up — count-up arrives in M3 with real scoring).

**Day Blueprint bar** 8. The Day Blueprint bar renders as an outlined container with a faint grid background and zero category segments inside it.

**Schedule timeline** 9. A vertical 24-hour column renders with hour labels `00:00` through `23:00` in JetBrains Mono, color `--ink-dim`. 10. An amber (`--accent`) horizontal rule (the "now-line") spans the timeline at the vertical position corresponding to the current time as returned by `useNow()`. 11. The now-line's vertical position updates within ~60 s of the real clock advancing (driven by `useNow()`'s existing tick). 12. The timeline is mounted such that the now-line is within the visible viewport on first paint (no manual scroll required). 13. The NowCard component (active-block card) is NOT rendered (no blocks exist). 14. No block cards, no brick chips are rendered.

**Empty-state card** 15. A single pulsing card is visible inside the timeline area with the exact copy: _"Tap any slot to lay your first block."_ 16. Under `prefers-reduced-motion: reduce`, the card renders without pulse animation.

**Floating dock** 17. A floating dock is bottom-anchored containing a Voice Log button (amber primary, visibly disabled, `aria-disabled="true"`, tooltip or label indicating it arrives later) and a `+` button (secondary, enabled, no-op). 18. The dock respects `env(safe-area-inset-bottom)` on iOS PWA. 19. Tapping the `+` button does not throw and does not open any sheet (Add Block sheet ships in M2).

**Quality** 20. At a 430px viewport, all chrome is within the safe-area and there is no horizontal overflow. 21. `axe-core`: zero violations on the day view page. 22. `tsc --noEmit`: zero errors. 23. ESLint: zero warnings. 24. `prefers-reduced-motion` honored across every animated element on the page (Playwright snapshot test). 25. Playwright: top bar visible, hero with date + dayNumber + 0% visible, Day Blueprint bar visible (empty outline), 24-hour timeline visible, now-line visible at the correct vertical position, empty-state card with the locked copy visible, dock with disabled Voice + enabled-but-inert `+` visible — all on first paint, no interaction required.

### Out of scope

- Interactive `+` button behavior (Add Block sheet) — M2
- Tap-empty-slot to open Add Block — M2
- Voice Log behavior — M10
- Edit-mode behavior (block jiggle, drag handles, delete affordances) — M5
- Settings page contents — later milestone
- Any block or brick rendering — M2+
- Hero ring/ring-graphic visualization with real completion % — M3 (M1's hero is text-only `0%`, not a ring)
- Per-category Day Blueprint segments — M3 (M1 shows the empty container only)
- Loose Bricks tray — M2+, tray location still TBD per § 0.11
- Castle / Kingdom / Empire navigation dock — M9
- Top-of-screen tiny week strip (Cron-style) — M9
- Persistence (`programStart`, localStorage) — M8
- SG-bld-16 (rest-day affordance when recurrence yields zero blocks today) — M9
- Real-blocks-driven NowCard — M2+ (component exists but is not rendered in M1)

---
