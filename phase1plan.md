# Dharma — Phase 1 Build Spec

## Intent

This is a SaaS toolkit. Not a routine.
Users add their own blocks and bricks via UI.
Future: agent-as-a-service on top.

The toolkit must feel like the most addictive routine UI ever built.
Better than Apple Calendar, Google Calendar, Notion, Things 3, Sunsama, Streaks.

## What Dharma Beats

| App | Why Dharma wins |
|---|---|
| Apple/Google Calendar | They show plans. Dharma shows proof. |
| Notion / Things 3 | They list tasks. Dharma scores identity. |
| Streaks / Habitica | Habits in isolation. Dharma weaves into a day. |
| Sunsama | $20/mo, no scoring, no Empire view. |
| Motion | AI moves things. Users hate that. Dharma shows, doesn't move. |
| Finch | Childish. Dharma is grown-up gamification. |
| Strava | Sports only. Dharma = entire life. |

## Core Hierarchy

Brick → Block → Building (day) → Castle (week) → Kingdom (month) → Empire (year)

## Carried-Forward Decisions (locked)

The 24 ADRs in `docs/decisions.md` are load-bearing. The ones below shape every milestone — PLANNER must respect them, BUILDER may not silently override them, EVALUATOR fails any diff that contradicts them.

- **ADR-005** — `dayPct` is equal-weighted across blocks (not duration-weighted). Hero math is fixed.
- **ADR-006** — Time intervals are half-open `[start, end)`. Block boundary alignment uses this.
- **ADR-008** — `×` (delete affordance) always visible in edit mode. No swipe-only deletes.
- **ADR-009** — Hero % is integer-only (`Math.round`). No decimals shown anywhere.
- **ADR-011** — `--ink-dim` is `rgba(245,241,232,.5)` (renamed from `--ink-faint` for WCAG AA on the new `#07090f` bg). M0 must re-verify contrast.
- **ADR-013** — One feature per BUILDER dispatch. Auto-chain BUILDER → EVALUATOR → SHIPPER. No bundling.
- **ADR-015** — `NowCard` does not subscribe to edit mode (read-only widget).
- **ADR-016** — Tick brick `aria-label` includes the brick name.
- **ADR-017** — Time bricks use a real timer (`BrickTimer`), not synthetic minute increments.
- **ADR-018** — localStorage shape is the AppState below: separate `logs` / `deletions` / `timers` keyed maps. **Not** nested `bricks[].logs[]`.
- **ADR-019** — `Recurrence` is a discriminated union (4 variants). Weekday convention is `0=Sun..6=Sat`.
- **ADR-020** — `now` / `today` / `dayNumber` are derived live, never constants.
- **ADR-022** — One feature per PLANNER dispatch. Per-milestone re-plans, not whole-phase.
- **ADR-023** — `useNow` paints the server's clock on first render to avoid CLS flash; client reconciles within 60s.
- **ADR-024** — Auto-FAIL → BUILDER loop, capped at 3 retries before user escalation.

## Shared Data Model (locked from M2 onwards)

This is the in-memory shape every component reads from. localStorage wiring lands in M8, but the types crystallise the moment Add Block / Add Brick exist (M2/M3) so later milestones don't need a refactor pass.

```ts
type Category = "health" | "mind" | "career" | "passive";

type Recurrence =
  | { kind: "just-today"; date: string }                                  // YYYY-MM-DD
  | { kind: "every-weekday" }                                             // Mon..Fri
  | { kind: "every-day" }
  | { kind: "custom-range"; from: string; to: string; weekdays?: number[] }; // 0=Sun..6=Sat

type BrickTemplate =
  | { kind: "tick"; id: string; name: string }
  | { kind: "goal"; id: string; name: string; target: number; unit?: string }
  | { kind: "time"; id: string; name: string; targetSec: number };

interface Block {
  id: string;
  name: string;
  start: string;        // "HH:MM"
  end: string;          // "HH:MM" — half-open per ADR-006
  category: Category;
  bricks: BrickTemplate[];
  recurrence: Recurrence;
}

type BrickLog =
  | { kind: "tick"; done: boolean }
  | { kind: "goal"; current: number }
  | { kind: "time"; accumulatedSec: number };

type TimerState = { runningSince: number | null; accumulatedSec: number };

type AppState = {
  schemaVersion: 1;
  programStart: string;                       // YYYY-MM-DD — Day 1
  blocks: Block[];                            // template definitions, not per-day clones
  logs: Record<string, BrickLog>;             // key: `${date}:${blockId}:${brickId}`
  timers: Record<string, TimerState>;         // key: `${blockId}:${brickId}` — survives day boundaries
  deletions: Record<string, true>;            // key: `${date}:${blockId}` — per-day "just today" overrides
};
```

**Why this shape (vs. nesting logs inside bricks):**
- Empire view (M9) renders 364 squares. With separate `logs`, lookup is O(1) per day. With nested logs, each square scans every brick of every block.
- Multi-tab safety: a write to `logs["2026-05-01:b1:r1"]` doesn't collide with a write to `logs["2026-05-01:b1:r2"]`.
- "Just today" delete (ADR-008) is a single key set in `deletions`, not a structural mutation of `blocks`.
- `timers` is keyed by `blockId:brickId` (no date) so a long run that crosses midnight keeps accumulating.

## Test Migration Discipline

`docs/tests.md` already holds 94 IDs from the previous pivot plan. Before M0's BUILDER dispatch, PLANNER must include a **migration table** at the top of the new tests.md that tags every existing ID with one of:

- `[survives]` — covers the same behavior; keep as-is.
- `[re-author: <reason>]` — same intent, but selectors / assertions changed (new tokens, new components).
- `[obsolete: delete]` — describes a behavior the new plan no longer ships.

EVALUATOR fails any milestone whose diff drops a `[survives]` test without explanation.

## Phase 1 Build Order (Locked)

Each milestone = one full SDD + TDD harness cycle.
Each ships to Vercel preview.
User taps, feels, judges, feeds back.
Then next.

0. Design System
1. Empty Building Shell
2. Add Block Flow
3. Add Brick Flow (3 types) + live scoring + visual fill
4. Block Expand + Brick Logging
5. Edit Mode + Delete
6. Drag Reorder
7. Polish Layer (cinematic)
8. Persistence (localStorage)
9. Calendar Nav (Castle / Kingdom / Empire)
10. Voice Log

---

## Milestone 0 — Design System

This is the foundation. Build once. Reuse forever.
No feature ships before this is locked.

### Color Tokens
- `--bg` deep navy `#07090f`
- `--bg-elev` `#0c1018`
- `--ink` warm white `#f5f1e8`
- `--ink-dim` `rgba(245,241,232,.5)`
- `--accent` fired amber `#fbbf24`
- `--accent-deep` `#d97706`
- Categories: Health `#34d399` · Mind `#c4b5fd` · Career `#fbbf24` · Passive `#64748b`
- Rule: 1 dominant (navy) + 1 accent (amber). Category dots only when needed. Don't paint everything.

### Typography
- Display numbers: Instrument Serif Italic
- Block names + UI labels: JetBrains Mono
- Body: Geist Sans (or Inter as fallback)
- Type scale: 10 / 12 / 14 / 16 / 22 / 32 / 64

### Spacing Scale
4 / 8 / 12 / 16 / 24 / 32 / 48

### Motion Tokens
- Tap: scale 0.96, 100ms ease-out
- Brick fill: width 600ms cubic-bezier(.4,0,.2,1)
- Block bloom (100%): subtle glow + chime
- Modal open: slide from bottom, spring physics
- Modal close: fade + slide
- Page transition: FLIP shared element
- Long press: scale 1.02 + shadow lift + haptic
- Stagger: 30ms between siblings on entry

Library: Framer Motion (layout animations enabled)

### Haptics
- Brick tap: light
- Block complete: success
- Day 100%: notification
- Drag start: medium

Method: `navigator.vibrate()` with iOS PWA fallback

### Components (build these first)
1. `<Button>` — primary (amber), secondary (outline), ghost
2. `<Modal>` — bottom sheet, spring open
3. `<Sheet>` — full-screen for forms
4. `<Chip>` — for categories, recurrence options
5. `<Input>` — text, time, number
6. `<Stepper>` — +/- with momentum on long-press
7. `<Toggle>` — for edit mode
8. `<EmptyState>` — pulsing card, single message
9. `<BlockCard>` — block container variant
10. `<BrickChip>` — brick visual unit (3 sub-variants: tick / goal / time)

### Mobile Constraints
- Max width 430px (iPhone Pro Max)
- Touch targets ≥ 44px
- One-handed reach for primary actions
- Bottom-anchored floating buttons
- Dark mode only for now

### Acceptance
- All 10 primitives render in a Storybook-equivalent harness page (or smoke-test route) with axe-clean output.
- **WCAG AA verified on every token combo against the new `#07090f` bg** — `--ink` (4.5:1+), `--ink-dim` (3:1+ for non-text large), `--accent` (3:1+ for UI), and category dots. Re-test after any token change.
- `prefers-reduced-motion` collapses every motion token in the table to a no-op or instant transition.
- Type scale renders correctly with Instrument Serif Italic + JetBrains Mono loaded via `next/font`.

---

## Milestone 1 — Empty Building Shell

### What Renders (no data state)
- Top bar: DHARMA logo + Edit toggle + Settings
- Hero: today's date, "Building 1 of 365", `0%` (italic serif)
- Day Blueprint bar: empty outline, faint grid
- NOW card: hidden (no current block)
- Schedule label
- **Empty state card**: "No blocks yet. Tap + to add your first block." Subtle pulse.
- Floating bottom: Voice Log (amber primary, disabled until M10) + `+` (secondary)

### Acceptance
- Page renders on mobile (430px) and desktop
- Hero shows 0% with no animation glitches
- Empty state card visible and pulses gently
- + button tappable (no-op for now)
- No hardcoded blocks anywhere in code

---

## Milestone 2 — Add Block Flow

### Three ways to add (pick all)
1. Tap floating `+` button → modal
2. Tap empty time slot in timeline → modal pre-filled with that time
3. (Voice — deferred to M10)

### Modal Content
- Name input (autofocus)
- Start time picker (defaults to tapped slot or next round hour)
- End time picker
- Category chips: Health / Mind / Career / Passive (single-select, large tap targets)
- Recurrence chips: Just today / Every weekday / Every day / Custom range
- Save button (amber, sticky bottom)
- Cancel (top left X)

### Behavior
- Save → modal slides down → block enters timeline with stagger fade-in
- Recurrence stored on block per the locked `Recurrence` discriminated union (ADR-019). Weekday convention is `0=Sun..6=Sat` everywhere.
- Times overlap → soft warning, allow anyway (user's choice). Boundaries are half-open `[start, end)` per ADR-006.
- "Just today" recurrence creates a one-shot block; `every-weekday` / `every-day` / `custom-range` create templates that `appliesOn(rec, date)` resolves at render time (helper lands in M9, but the union shape is locked here).

### Acceptance
- Block appears immediately after save
- Timeline reflows with new block in correct time position
- Day Blueprint bar adds a colored segment for new block
- Empty state disappears once first block exists
- Saved block matches the locked `Block` shape (validated by a Vitest schema test)

---

## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill

### Block Detail
- Tap block → FLIP expand to show bricks inside
- "+ Add brick" button inside expanded block

### Add Brick Modal
- Name input (autofocus)
- Type selector: 3 large cards
  - **Tick** — done / not done
  - **Goal** — countable (e.g. 100 pushups)
  - **Time** — minutes (e.g. 30 min run)
- If Goal: target number + unit input
- If Time: target minutes input
- Save

### Live Scoring (built into bricks from day one)
- Tick brick: 0 or 100
- Goal brick: (done ÷ target) × 100
- Time brick: (done ÷ target) × 100
- Block % = avg of brick %
- Day % = avg of block %

### Visual Fill (the dopamine)
- Brick chip fills with category-color gradient as it scores
- Block scaffold (left vertical bar) fills bottom-up as block %
- Hero % updates live with smooth count transition
- Day Blueprint segment opacity matches block %
- Block reaches 100% → bloom glow + soft chime
- Day reaches 100% → fireworks (subtle) + Empire square lights up

### Acceptance
- Adding a brick instantly updates block % and day %
- Visual fill animates smoothly
- Three brick types render distinctly
- 100% state visibly different from 99%

---

## Milestone 4 — Block Expand + Brick Logging

### View Mode Interactions
- Tap collapsed block → expand (FLIP)
- Tap expanded block area outside bricks → collapse
- Tap **Tick brick** → toggle 0/100, haptic, fill animation
- Tap **Goal brick** → inline +/- stepper (long-press accelerates)
- Tap **Time brick** → start/stop timer ring; manual input fallback

### Acceptance
- Brick state changes persist across collapse/expand
- Timer continues running when block collapses
- Stepper momentum on long-press feels right
- Haptic fires on every tap

---

## Milestone 5 — Edit Mode + Delete

### Edit Mode
- Top right pencil icon → toggles edit mode
- Locked = view + log only
- Unlocked = blocks gently shake (iOS jiggle), × icons appear, drag handles appear
- Tap pencil again → settles, saves

### Delete
- Edit mode → tap × on block or brick (× always visible per ADR-008; swipe-left is an additional affordance, never the only one)
- Confirmation modal: "Delete this block?"
  - **Just today** → writes `deletions[${date}:${blockId}] = true`. Template untouched. Other days unaffected.
  - **All recurrences** → removes the block template from `state.blocks`. Past `logs` entries stay (history is not retroactively rewritten).
- Animation: block shrinks + fades, others reflow

### Acceptance
- Edit mode visually clear (jiggle + ×)
- View mode = no editing possible (no accidental deletes)
- Delete confirmation prevents mistakes
- Recurrence-aware delete works correctly: "just today" leaves the template visible on tomorrow's Building; "all recurrences" removes it everywhere going forward.

---

## Milestone 6 — Drag Reorder

- Edit mode → long-press block → lift (shadow + scale 1.02)
- Drag → others smooth-flow around (Framer Motion layout)
- Drop → settles into new time slot, times auto-adjust
- Same for bricks within a block

### Acceptance
- Drag feels weightless, not janky
- Times update after drop
- No overlap glitches

---

## Milestone 7 — Polish Layer

The cinematic layer. Every detail. Once.

- Stagger fade-in on page load (30ms between cards)
- Hero % counts up over 1.6s on first load
- Live "now" line — amber, glowing, sweeps timeline all day
- Current block: pulsing glow, NOW tag
- Block 100% → bloom + chime
- Day 100% → fireworks + Empire square lights up (deferred render until M9)
- First-ever brick added → text card slides in: "Your Empire begins."
- Brand mark long-press → reveals hidden year heatmap preview (Easter egg)
- Loading states: skeleton blocks with shimmer
- Toasts for confirmations (subtle, bottom)

### Acceptance
- 60fps scroll on iPhone 12+
- Lighthouse perf > 90
- No layout shift
- Reduced motion respected (prefers-reduced-motion)

---

## Milestone 8 — Persistence

This milestone wires the in-memory `AppState` (locked above) to `localStorage` under key `dharma:v1` per ADR-018. The shape does **not** change here — it crystallised at M2/M3. M8 is the read/write/migrate layer.

### Module: `lib/persist.ts`

- `loadState(): AppState` — reads `localStorage["dharma:v1"]`, validates `schemaVersion`, returns the empty default on miss/corruption.
- `saveState(s: AppState): void` — JSON-stringify and write. Throws on quota exceeded; caller surfaces a toast.
- `usePersistedState()` — React hook returning `[state, setState]` with two-pass hydration to avoid SSR/CSR mismatch (per ADR-023's pattern).
- Migration registry: `migrations: Record<number, (any) => AppState>` — empty for v1, scaffolded for future `v2`.

### Behavior
- All CRUD (add/edit/delete block, add/edit/delete brick, log brick, timer tick) writes immediately on commit — no debouncing in Phase 1.
- Multi-tab races: last-writer-wins on the `dharma:v1` key. Documented as a known limitation; resolved in Phase 2. **(See Open Spec Gaps.)**

### localStorage shape (mirrors the locked AppState)

```ts
// localStorage["dharma:v1"] = JSON.stringify(state) where:
{
  schemaVersion: 1,
  programStart: "2026-05-01",
  blocks: [/* Block[] — templates, not per-day clones */],
  logs: {
    "2026-05-01:b-uuid:r-uuid": { kind: "tick", done: true },
    "2026-05-01:b-uuid:r-uuid2": { kind: "goal", current: 80 },
    "2026-05-01:b-uuid:r-uuid3": { kind: "time", accumulatedSec: 1834 },
  },
  timers: {
    "b-uuid:r-uuid3": { runningSince: 1714560000000, accumulatedSec: 1834 },
  },
  deletions: {
    "2026-05-02:b-uuid": true,    // user deleted this block "just today"
  },
}
```

### Acceptance
- Refresh keeps all data
- Schema versioned via `schemaVersion: 1`; an unknown version triggers the migration registry (no silent data loss).
- No data loss on edit/delete
- **DST fixtures**: `dayNumber()` tests cover spring-forward and fall-back transitions in at least two timezones (America/New_York + Europe/London). Off-by-one regressions fail the suite.
- A corrupted JSON blob in `dharma:v1` resets to empty default with a console warning (no crash, no white screen).
- Quota exceeded surfaces a user-visible toast and the failed mutation is rolled back in memory.

---

## Milestone 9 — Calendar Navigation

### New helpers (`lib/recurrence.ts`)

- `appliesOn(rec: Recurrence, date: string): boolean` — single source of truth for "does this block exist on this day?". Handles all four `Recurrence` variants. Used by every calendar view.
- `currentDayBlocks(today: string, state: AppState): Block[]` — returns the blocks visible today, accounting for `appliesOn` AND `state.deletions[${today}:${blockId}]`. Replaces today's ad-hoc filtering.
- Both helpers are pure functions and unit-tested with DST + leap-day fixtures.

### Top Strip (every screen)
- 7 day-circles showing current week with scores
- Today highlighted
- Tap day → jumps to that Building
- Swipe horizontal → forward/back days

### Castle (Week)
- 7 vertical bars, height = day %
- Today highlighted, past dim, future outlined
- Week % at top (italic serif)
- Streak indicator (flame, days > 50%)
- "+12% vs last week" delta

### Kingdom (Month)
- 30 squares, color saturation by score
- Tap square → drill into Building
- Long-press → tooltip "Apr 14 · 78% · 9 blocks"
- Swipe horizontal between months
- Top stats: avg, best, streak

### Empire (Year)
- 52 weeks × 7 days = 364 squares
- Color by score
- Identity stats: "Days you ran: 142. Days you meditated: 287."
- Animated build-up on load (left → right, week by week)
- Tap square → drill into Building
- Shareable image export ("Year as Empire" card)

### Pinch Zoom (Apple Photos style)
- Pinch out: Building → Castle → Kingdom → Empire
- Pinch in: reverse

### Acceptance
- Smooth navigation across all 4 levels
- Empire renders in < 1s for full year
- Swipe physics feel natural
- Identity stats accurate

---

## Milestone 10 — Voice Log

### Flow
- Tap mic (amber, primary, bottom)
- Big amber pulse + live waveform
- User speaks: "Did 80 pushups, ran 30 mins, meditated, ate breakfast"
- Send to Claude API
- Parses → fills bricks across blocks
- Visual cascade: each brick lights up in sequence
- 10 sec total

### Fallback
- Edit parsed result before commit
- "Apply" / "Cancel"

### Acceptance
- Voice → text → bricks works end-to-end
- Animations cascade smoothly
- Errors handled gracefully (no parse → show transcript)

---

## Surprise & Delight (across milestones)

- First-ever brick added → "Your Empire begins." card
- First 100% day → unlock animation, Empire square glows 24h
- Streak milestones (7 / 30 / 100 days) → quiet celebration screen + shareable card
- Logo long-press → hidden year heatmap preview

---

## Open Spec Gaps (resolve before the milestone they block)

Tracked here so they don't go silent. Each gap has an ID; PLANNER references them in the milestone's tests.md when the resolution lands.

- **SG-bld-13** — *BrickTimer manual override semantics.* If a user has a Time brick running and types "30 min" into the manual input, do we **stop** the running timer and overwrite, or **commit** the override and keep accumulating? Affects M4 + M8. Decision needed before M4 ships.
- **SG-bld-14** — *`programStart` editability.* Once Day 1 is set, can the user change it later (e.g. "I started a week ago")? If yes: does it backfill empty Buildings or shift the Empire grid? Affects M9 + onboarding. Decision needed before M9 Empire view.
- **SG-bld-16** — *Empty state when blocks exist but none apply today.* User has 5 blocks, all `every-weekday`, today is Saturday. Today's Building is empty. Do we show the M1 empty state, or a different "rest day" affordance? Affects M1 + M9. Decision needed before M9 calendar nav surfaces this regularly.
- **SG-bld-17** — *Multi-tab write conflict resolution.* Phase 1 is last-writer-wins on `dharma:v1`. This silently drops mutations from a backgrounded tab. Acceptable for solo use; needs a `storage` event listener + merge strategy before public launch. Affects M8 onwards.
- **SG-bld-18** — *Castle / Kingdom / Empire % when no-block days exist.* If today is Saturday and no block applies, is the day's contribution `0%`, `null` (excluded from the average), or `100%` (vacuously satisfied)? Affects M9 scoring math.
- **SG-bld-19** — *Voice Log API failure mode.* M10 round-trips speech to Claude API. If the API is down or rate-limited, do we degrade to a transcript-only paste, queue offline, or surface an error? Affects M10.

---

## Quality Gates (EVALUATOR enforces every milestone)

- All Vitest tests pass
- All Playwright tests pass
- Zero TypeScript errors
- Zero ESLint warnings
- Lighthouse: Perf > 90, A11y 100, Best Practices > 95
- Mobile viewport (430px) renders correctly
- No console errors
- Reduced motion respected
- 60fps scroll on iPhone 12+

---

## Definition of Done (every milestone)

1. Spec acceptance criteria covered
2. Tests written first, all green
3. Playwright confirms behavior in real browser
4. EVALUATOR returns PASS
5. Deployed to Vercel production
6. README + CHANGELOG updated
7. User has tapped the preview and approved
