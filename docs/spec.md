# Dharma — Product Spec

> **Status:** placeholder. The user will paste the full Dharma spec. Until then, agents must STOP and report a spec gap rather than proceed.

## How to use this document

This file is the **source of truth** for what Dharma does. The PLANNER reads this; no other agent does.

Each feature/page in this document should follow this skeleton:

```
## <Feature or page name>

### Purpose
One sentence on why this exists.

### Users / context
Who uses it, when, on what device.

### Acceptance criteria
Numbered, observable, testable. Each criterion becomes one or more G/W/T assertions in /docs/tests.md.

1. <criterion>
2. <criterion>
...

### Visual design
Layout, tokens, motion, sizing. Reference globals.css tokens where possible.

### Data
What data is read/written. Persistence model.

### Out of scope
What this feature does NOT do.
```

---

## § 0 — Design Pillars

> Authored 2026-05-05 from a multi-screen synthesis between user and Main Claude. **Read this section first.** Every milestone SPEC entry below cites the pillars it implements. Where this section conflicts with older free-form notes (e.g., the original "UX Spec — Phase 1 Toolkit" below), **§ 0 wins**, and the older note will be marked _superseded_.

### § 0.1 — The wedge: what no competitor does

Dharma's right to exist sits at the intersection of six gaps in the routine-tracking market.

1. **No competitor shows a full year as buildings rising.** GitHub does it for code, Strava for runs — nobody does it for life.
2. **No competitor scores the day automatically.** Calendars show plans; Dharma shows proof.
3. **No competitor does voice end-of-day.** A 10-second voice log replaces 5 minutes of tapping.
4. **No competitor has brick-by-brick visual fill.** Habit trackers tick boxes; Dharma stacks bricks that visibly become a building.
5. **No competitor has an Empire view.** Year on one screen, every day a Building, identity earned in pixels.
6. **Most competitors punish missed days. None forgive intelligently.** Dharma does (see § 0.7).

### § 0.2 — Inspiration matrix

We don't invent everything. Each move below is borrowed from a specific app's strongest pattern.

| App                    | What they nailed                            |
| ---------------------- | ------------------------------------------- |
| Apple Calendar         | Spatial day view; time-blocks feel real     |
| Google Calendar        | Color-coding; month overview                |
| Notion Calendar (Cron) | Smooth motion; keyboard-fast                |
| Things 3               | Typography; calmness; joy of checking off   |
| Fantastical            | Natural-language input                      |
| Sunsama                | Daily ritual; plan-the-day flow             |
| Apple Fitness rings    | Visual identity; one glance = mood          |
| Duolingo               | Streaks; dopamine; tree progress            |
| Strava                 | Year heatmap; public proof                  |
| GitHub                 | Contribution graph; 365 squares             |
| Headspace              | Animated calmness; breath-paced motion      |
| Arc Browser            | Motion as identity                          |
| Linear                 | Speed; keyboard; sharp                      |
| Raycast                | Command palette; power-user feel            |
| Cal.com                | Booking-flow polish                         |
| BeReal                 | Daily prompt urgency                        |
| Robinhood              | Visceral chart animation                    |
| Apple Health           | Year-over-year compare                      |
| Whoop                  | Recovery score = identity                   |
| Finch                  | Cute friend that grows                      |
| Streaks                | Pure habit dopamine                         |

### § 0.3 — Visual identity

The Building (today) page is the canonical surface. Every other screen extends it.

- **Hero** = single % ring at top. Below the ring, a horizontal bar chart with one segment per user-defined category (segment width ∝ category's brick count, fill ∝ category's completion %). Per ADR-032 + ADR-033.
- **Page = vertical spatial timeline.** Time labels run down the left margin. Blocks render at their scheduled `start` position with height proportional to duration. The amber **now-line** sweeps down all day (re-uses `useNow()` per ADR-023).
- **Two zones on the daily page:**
  - Top: timeline of timed blocks
  - Bottom: **"Loose Bricks" tray** — standalone bricks (no parent block). Tray location is **TBD** (pinned-above-dock vs bottom-of-timeline vs top-of-timeline) — see § 0.11.
- **Color rule:** one dominant (warm-dark `#07090f` per ADR-011), one accent (amber). Category dot prefixes used sparingly. Don't paint everything.
- **Typography:**
  - Display numbers (hero %, scores) — **Instrument Serif Italic**, big, confident
  - Block names, time labels — **JetBrains Mono**, architectural
  - Body, copy — **Geist Sans**, readable
- **Empty-state philosophy:** never a blank page. Empty Building shows the timeline (with faded time labels) and a single floating card: "Tap any slot to lay your first block."

### § 0.4 — Motion vocabulary

One consistent motion language across the app. Framer Motion's `layout` does most of the work for free.

| Action                | Motion                                          |
| --------------------- | ----------------------------------------------- |
| Tap                   | Scale 0.96, 100ms ease-out                      |
| Brick fill            | Width transition 600ms cubic-bezier             |
| Block complete        | Subtle bloom + chime                            |
| Modal open            | Slide from bottom, spring physics               |
| Modal close           | Soft fade + slide                               |
| Page transition       | FLIP shared element (block → expanded view)     |
| Long press            | Haptic + scale-up 1.02 + shadow lift            |
| Empire square land    | Stagger 30ms each, scale-in from 0.7            |

`prefers-reduced-motion: reduce` collapses every entry above to instant transitions. Reduced-motion is not optional; it's the floor.

### § 0.5 — Interaction primitives

**Three ways to add a block:**

1. Tap an empty timeline slot → Add Block sheet pre-fills with the tapped time
2. Floating `+` button → sheet at default time (current hour, rounded)
3. Voice mic (M10) → speak a description, Claude API parses, block appears

**Add Block sheet (M2)**: plain forms only — Title, Start, End (optional), Recurrence picker, Brick adder, Category. Inline natural-language parsing arrives in M7 polish per ADR-036.

**Brick logging gestures:**

- **Tick** brick → tap = haptic + scale + fill gradient. One satisfying click.
- **Goal** brick → +/- stepper with momentum (long-press accelerates, capped at 10× per existing ADR).
- **Time** brick → tap "Start" → countdown ring fills; tap to pause/stop. BrickTimer per ADR-017.

**Block expand**: tap a block card → FLIP animation expands it to fullscreen. All bricks visible; large numeric pad for goal types; large timer for time types. Tap "Done" to collapse.

**Edit Mode (pencil icon)**: enters a deliberate state (not always-on). Blocks gently jiggle (iOS-style). Each block shows: drag handle (M6), pencil (re-open Add Block sheet), × delete. Tap pencil again or "Done" to exit and save.

**Delete prompts** (Apple-Calendar language verbatim):
- "This event only" → adds entry to `deletions[date:blockId]` per ADR-018
- "All future events" → sets recurrence end-date to yesterday
- "All events" → removes block entirely (destructive, red)

### § 0.6 — Calendar hierarchy: Building → Castle → Kingdom → Empire

Each view has its own visualization vocabulary.

- **Building (today)** — the spatial timeline described in § 0.3
- **Castle (week)** — 7 buildings as vertical bars, height ∝ daily %. Today highlighted; past dim; future outlined only. Tap a day → smooth zoom into that Building. Top stat: italic-serif week %. Streak indicator (flame icon, days-in-a-row over 50%). Compare-to-last-week delta (Robinhood-style: "+12% vs last week").
- **Kingdom (month)** — ~30 squares colored by score; saturated green = great day, gray = missed day (per ADR-038), outline = future. Tap any square → drill into that Building. Long-press → tooltip ("Apr 14 · 78% · 9 blocks completed"). Horizontal swipe between months. Top stats: average / best / streak.
- **Empire (year) — the killer screen** — 52 weeks × 7 days = 364 squares, whole year on one screen. Each square is a Building, color by score. Identity stats overlay: "Days you ran: 142. Days you meditated: 287." **Shareable image export** (Spotify-Wrapped-style "Year as Empire" card). Animated build-up on load: squares fill in left-to-right week by week.

**View navigation**: dock-based (bottom segmented control: Building / Castle / Kingdom / Empire) is primary. Pinch-to-zoom is a delight bonus on platforms that support it (Android/desktop). iOS PWA falls back to dock — see § 0.11.

**Top-of-every-screen tiny week strip**: 7 day-circles with scores. Tap → jump to that day. (Cron-inspired, lands in M9.)

### § 0.7 — Forgiveness model

Per ADR-038. The rest of Dharma is calm-confident; punishment-via-red breaks that tone.

- **Missed days render gray, never red.** No shame, no auto-broken streaks, no compounding penalties.
- **Streaks are visible to those who want them** (flame icon, days-in-a-row over 50%) but they're a *feature*, not the *spine* of the UI.
- **Identity stats** highlight presence ("Days you ran: 142"), never absence.
- **Headspace tone**: missed days observed, not punished.

### § 0.8 — Delight & surprise

Sparing, intentional, never gratuitous.

- **First-launch onboarding** — 3-screen carousel ("Bricks → Blocks → Buildings"), skippable
- **First brick laid** — small text card slides in: "Your Empire begins."
- **First 100% day** — Empire square glows for 24 h (subtle pulse)
- **Streak milestones** — 7 / 30 / 100 / 365 days → bespoke shareable card screens
- **Empty schedule but past noon** — empty state evolves: "It's 3 PM and your day is still empty. Want to add something?"
- **Easter egg** — long-press the Dharma logo → reveals year heatmap miniature
- **Templates** ("Monk Mode", "Builder Mode", "Athlete Mode") — Settings → Templates → preview → "Apply to: Today / This week / Range". Custom: save current day as template. Probable milestone: M5 or later — TBD.

### § 0.9 — Data model rules (locked)

These three rules govern every milestone's schema. Per ADR-034 + ADR-035.

1. **Block = always timed.** `start: HH:MM` required. `end: HH:MM` optional. Lives at a fixed slot on the daily timeline. Can be empty (zero bricks); empty blocks score as a tick (did I do this ritual? yes/no).
2. **Brick = never timed.** No scheduled time of its own. A "Time"-type brick has a *target duration* (`durationMin: number`) — that is a goal, not a schedule. The block determines *when*.
3. **Bricks can be inside a block OR standalone.** Same schema either way; difference is `parentBlockId: string | null`. Standalone bricks live in the "Loose Bricks" tray.

**Brick types (locked since pre-pivot):**

```ts
type Brick =
  | { id: string; type: 'tick';  name: string; category: string; parentBlockId: string | null }
  | { id: string; type: 'goal';  name: string; category: string; parentBlockId: string | null; target: number; unit: string }
  | { id: string; type: 'time';  name: string; category: string; parentBlockId: string | null; durationMin: number };
```

**Categories**: user-defined, unlimited count (per ADR-032). Stored in user state (not enumerated in code). Each block AND each standalone brick has a `category: string` field. Categories are color-picked at creation time.

**Scoring (replaces older spec § "Scoring (math)"):**

- Tick brick → `0` or `1`
- Goal brick → `min(count / target, 1)`
- Time brick → `min(minutesDone / durationMin, 1)`
- Empty block → `0` or `1` (boolean tick)
- Block (with bricks) → average of bricks' progress
- **Day score = average across all top-level units** (blocks + standalone bricks)
- Per-category day score = same average, filtered to that category

### § 0.10 — Haptics

Per existing `lib/haptics.ts`. iOS PWA limited to 17.4+; Android uses `navigator.vibrate`. Graceful no-op for unsupported.

| Trigger          | Haptic        |
| ---------------- | ------------- |
| Brick tap        | light tap     |
| Block complete   | success       |
| Day reaches 100% | notification  |
| Drag start       | medium impact |
| Voice mic press  | strong impact |

### § 0.11 — Open design questions (lock before the milestone they block)

| Question                                                                    | Blocks milestone | My recommendation                                  |
| --------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| Loose Bricks tray location: pinned above dock / bottom of timeline / top    | M2               | Pinned above dock (always reachable)               |
| Pinch-to-zoom across views: primary or fallback?                            | M9               | Dock primary; pinch as bonus on Android/desktop    |
| Templates ("Monk Mode" etc.) — ship in M5 or defer to M11+                  | M5               | Defer; ship custom-template-from-current-day first |
| Streak milestone numbers (7 / 30 / 100 / 365 vs others)                     | M7               | The four listed; bespoke per-screen                |
| Empire view export — auto-yearly only, or anytime                           | M9               | Anytime; auto-prompt at year-end                   |

### § 0.12 — What this stack beats

| Competitor              | Dharma wins because                                            |
| ----------------------- | -------------------------------------------------------------- |
| Apple / Google Calendar | They show plans. Dharma shows proof.                           |
| Notion / Things 3       | They list tasks. Dharma scores identity.                       |
| Streaks / Habitica      | They track habits in isolation. Dharma weaves them into a day. |
| Sunsama                 | $20/mo, no scoring, no Empire view.                            |
| Motion                  | AI moves things. Users hate that. Dharma shows; doesn't move.  |
| Finch                   | Childish. Dharma is grown-up gamification.                     |
| Strava                  | Sports only. Dharma = entire life.                             |

### § 0.13 — Locked decisions index

For ADR navigation:

- **ADR-032** — Categories: user-defined, unlimited count
- **ADR-033** — Hero is single-% ring + per-category bar chart (not 3 rings)
- **ADR-034** — Blocks always timed; bricks never timed
- **ADR-035** — Bricks can be inside a block OR standalone (Loose Bricks tray)
- **ADR-036** — Add Block sheet uses plain forms in M2; inline parsing arrives in M7
- **ADR-037** — Voice mic ships in M10 (late, not early)
- **ADR-038** — Forgiveness model: missed days = gray, never red

### § 0.14 — Explicit antipatterns (what we reject)

These are design moves that exist in **prior Dharma builds** (production surface at `integrity-pink.vercel.app`, captured 2026-04-29) that the new model deliberately rejects. Reproduced here as a *learning aid only* — **do NOT use the prior build's visual or structural treatment as implementation guidance**. PLANNER must avoid recreating these patterns.

#### Antipattern 1 — "Everything is a block"

The prior build forced every routine, including single-action ones, into a timed block. Examples observed in the captured surface:

| Block (prior build)         | Scheduled window | Bricks inside           |
| --------------------------- | ---------------- | ----------------------- |
| "Walk to bus"               | 07:50–08:00      | `walk`                  |
| "Commute home"              | 17:15–18:30      | `decompress`            |
| "Face wash"                 | 21:30–21:40      | `face wash` · `brush`   |
| "Journal"                   | 21:40–21:50      | `write`                 |
| "Meditation"                | 21:50–22:00      | `meditate 0/10m`        |

This makes the day model feel rigid and verbose. A ten-minute "block" containing one atomic action is just a brick wearing a costume — it asks the user to defend a calendar slot for something that doesn't need one.

**The new rule (per § 0.9 + ADR-035):** blocks are for *bigger rituals worth defending on the calendar* — multi-brick groupings, or genuinely time-bound stretches. Single atomic actions go in the Loose Bricks tray. A healthy day mixes both:

- **3–5 timed blocks** — e.g., morning ritual, work block, evening wind-down (each contains 2+ bricks)
- **5–15 standalone bricks** — e.g., drink water, stretch, write, take vitamin, face wash, brush teeth, journal

If a routine has only one brick in it, it should probably *be* a brick.

#### Antipattern 2 — Hardcoded four-category palette

The prior build shipped four fixed categories — Health / Mind / Career / Passive — with hardcoded colors. ADR-032 supersedes this: categories are user-defined, unlimited, user-picked colors. The earlier "UX Spec — Phase 1 Toolkit" section in this file is also superseded for the same reason (see § 0 banner).

#### Antipattern 3 — Implicit "Passive" catch-all category

The prior build leaned heavily on a generic "Passive" category for things like commuting, sleep, walking — moves that don't fit Health/Mind/Career. Under user-defined categories (ADR-032), users can be specific ("Transit", "Sleep", "Movement") or just leave a routine uncategorized. We do NOT ship a default "Passive" bucket; the absence of a category is itself meaningful and should be allowed.

#### Note on the prior build's hero treatment

The prior build's hero showed a "DAY BLUEPRINT" horizontal stacked bar with category-colored segments and a "NOW" highlighted block. While this is *adjacent* to the new model (§ 0.3 specifies a single-% ring above a per-category bar chart), the prior treatment is **not** a reference for the new implementation. M3 will design the ring + bar chart from § 0.3 directly; PLANNER must not pull pixel-level cues from the prior build's hero.

---

<!-- Paste full Dharma spec here. -->

## UX Spec — Phase 1 Toolkit

> ⚠️ **Partially superseded by § 0 — Design Pillars (above).** Where the two conflict, § 0 wins. Specifically: § Categories (closed-set) is replaced by ADR-032 (user-defined). § Scoring (math) is replaced by § 0.9 (handles standalone bricks + empty blocks). § Voice Log "Phase 1.5" timing is replaced by ADR-037 (M10). All other sections below remain valid as historical drafting notes for milestones M2–M10.

### Mental Model

Routines = recurring calendar events.
Same feel as Google Calendar.

### Terms

- Brick = smallest action item
- Block = time slot containing bricks
- Building = day
- Castle = week
- Kingdom = month
- Empire = year

### Edit Mode Toggle

Top right. Pencil icon.

- Locked (default) = view only. Tap blocks to log bricks.
- Unlocked = edit. Drag, delete, add.
  Stops accidental edits during the day.

### Add a Block

Two ways:

1. Tap empty time slot in timeline
2. Tap floating + button (bottom right)

Modal opens:

- Name (text)
- Start time (defaults to tapped slot)
- End time
- Category (Health / Mind / Career / Passive)
- Save button

After save, recurrence prompt:

- Just today
- Every Monday (or whichever weekday it is)
- Every weekday (Mon–Fri)
- Every day
- Custom range...

### Add a Brick

Tap a block → block detail opens.
"+ Add brick" button inside.

Modal:

- Name (text)
- Type (Tick / Goal / Time)
- If Goal → target number + unit (e.g. 100 reps)
- If Time → target minutes (e.g. 30 min)
- Save

Brick appears in block.

### Edit a Block

Edit mode on → tap block → modal opens with current values → change → save.

### Delete a Block

Edit mode on → swipe left on block OR tap × icon.
Confirmation prompt: "Delete this block? Just today / All recurrences"

### Delete a Brick

Edit mode on → swipe left on brick OR tap × icon.
Same confirmation prompt.

### Reorder Blocks

Edit mode on → long-press → drag.
Times auto-adjust OR snap to grid (TBD).

### Reorder Bricks

Edit mode on → drag handle on brick → drag.

### Copy a Building (day)

Long-press day header → menu:

- Copy Building
- Paste Building to date(s)
- Apply Building to range

"Apply Building to range":

- Mon–Fri
- Whole week
- This month
- Custom range (e.g. April 29 → December 31, 2026)

All blocks + bricks copy to all selected days.

### Copy a Castle (week)

Week view → long-press week header → "Apply Castle to range"
Same flow as Building.

### Recurrence Editing (Google Calendar style)

When user edits a recurring block, prompt:

- This event only
- This and following events
- All events in series

### Voice Log (Phase 1.5)

Floating mic button (bottom, primary).
Tap → speak → Claude API parses → fills bricks → auto-scores.

### Empty States

- Empty day → "No blocks yet. Tap + to add your first block."
- Empty block → "No bricks yet. Tap + to add a brick."
- Empty week → "Copy a Building to fill the week."

### Logging Bricks (View Mode)

Block expanded → tap brick:

- Tick → toggles 0/100
- Goal → number input or +/- stepper
- Time → start/stop timer OR manual input
  Block % updates live as bricks log.

### Save Modes (recurring edits)

Like Google Calendar:

- Apply to template = permanent (every Monday gets it)
- Apply to today only = one-time

### Categories

- Health (#34d399)
- Mind (#c4b5fd)
- Career (#fbbf24)
- Passive (#64748b)

### Scoring (math)

Tick brick: 0 or 100
Goal brick: (done ÷ target) × 100, capped at 100
Time brick: (mins done ÷ mins target) × 100, capped at 100

Block % = average of all brick %
Building % = average of all block %
Castle % = average of 7 Buildings
Kingdom % = average of 4 Castles
Empire % = average of 12 Kingdoms

All equal weight.

### Animations

- Brick fills with smooth gradient as it scores
- Scaffold rises bottom-up as block completes
- Building grows live as day progresses
- Pulsing glow on current block
- Stagger fade-in on page load
- Hero % counts up over 1.6s on load

### Mobile Constraints

- Max width 430px (iPhone Pro Max)
- Touch targets ≥ 44px
- One-handed reach for primary actions
- Bottom-anchored floating buttons.

---

## Milestone 0 — Design System

### Intent

Build the foundation. Tokens + 10 primitives + motion vocab.

This ships before any feature. Every later milestone composes from these primitives. No reinvention. No drift.

This is what stops Dharma looking like AI slop. Locked aesthetic. Sharp. Distinctive.

### Inputs

**Tokens**

- Colors: `--bg`, `--bg-elev`, `--ink`, `--ink-dim`, `--accent`, `--accent-deep`, 4 category colors
- Typography: Instrument Serif Italic (display) + JetBrains Mono (UI) + Geist Sans (body)
- Type scale: 10 / 12 / 14 / 16 / 22 / 32 / 64
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48
- Motion: tap, brick fill, block bloom, modal open/close, FLIP, long-press, stagger
- Haptics: light / medium / success / notification

**Primitives (10)**

1. `<Button>` — primary (amber), secondary (outline), ghost
2. `<Modal>` — bottom sheet, spring open
3. `<Sheet>` — full-screen for forms
4. `<Chip>` — categories, recurrence
5. `<Input>` — text, time, number
6. `<Stepper>` — +/- with momentum on long-press
7. `<Toggle>` — edit mode lock/unlock
8. `<EmptyState>` — pulsing card
9. `<BlockCard>` — block container variant
10. `<BrickChip>` — 3 sub-variants: tick / goal / time

**Constraints**

- WCAG AA contrast on dark bg
- Mobile-first, max-width 430px
- Touch targets ≥ 44px
- Dark mode only
- Framer Motion (layout enabled) for all motion
- Reduced motion respected globally

### Outputs

- `/app/_design/page.tsx` — primitives harness page rendering all 10 primitives in every state
- `/app/globals.css` — CSS variables for every token
- `/app/layout.tsx` — `next/font` wiring for Instrument Serif Italic + JetBrains Mono + Geist Sans
- `/lib/motion.ts` — motion tokens (durations, easings, spring configs)
- `/lib/haptics.ts` — haptic helper with iOS/Android fallback
- `/components/ui/*` — 10 primitive components, exported
- `/components/ui/index.ts` — barrel export
- Storybook-style states: default, hover, active, disabled, loading, empty, error (where applicable)
- axe-clean output across the harness page (zero violations)
- Lighthouse a11y score 100 on harness page

### Edge cases

- **prefers-reduced-motion** → all motion tokens collapse to instant transitions; FLIP becomes hard-cut; bloom becomes static glow
- **430px viewport** → every touch target ≥ 44px; primary actions reachable one-handed (bottom-anchored)
- **Token contrast** → `--ink-dim` (`rgba(245,241,232,.5)`) on `#07090f` bg passes WCAG AA for body text; verified with axe
- **Empty / loading / error states** → every primitive that holds data has all 3
- **Long-press accelerator on Stepper** → caps at 10x speed to prevent runaway
- **Modal/Sheet on iOS Safari** → respects safe-area insets (bottom notch)
- **Font loading** → swap fallback (Geist → system UI) prevents FOIT
- **Haptics on iOS PWA** → graceful fallback (silent no-op on unsupported)
- **Dark mode only** → light-mode tokens not defined; document why in design system README

### Acceptance criteria

- All 10 primitives render on `/app/_design/page.tsx` with every documented state
- CSS variables defined for every token in spec
- Fonts load without FOIT/FOUT
- axe-clean (zero violations) on harness page
- Lighthouse a11y = 100 on harness page
- 60fps scroll on iPhone 12+ (verified via Playwright trace)
- prefers-reduced-motion honored across all primitives
- Touch targets ≥ 44px verified by Playwright pixel-measurement test
- TypeScript strict, zero errors
- ESLint zero warnings
- All Vitest unit tests for primitives pass
- All Playwright e2e tests for harness page pass
- README in `/components/ui/README.md` documents each primitive: props, variants, when to use, when not to use
