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

| App                    | What they nailed                          |
| ---------------------- | ----------------------------------------- |
| Apple Calendar         | Spatial day view; time-blocks feel real   |
| Google Calendar        | Color-coding; month overview              |
| Notion Calendar (Cron) | Smooth motion; keyboard-fast              |
| Things 3               | Typography; calmness; joy of checking off |
| Fantastical            | Natural-language input                    |
| Sunsama                | Daily ritual; plan-the-day flow           |
| Apple Fitness rings    | Visual identity; one glance = mood        |
| Duolingo               | Streaks; dopamine; tree progress          |
| Strava                 | Year heatmap; public proof                |
| GitHub                 | Contribution graph; 365 squares           |
| Headspace              | Animated calmness; breath-paced motion    |
| Arc Browser            | Motion as identity                        |
| Linear                 | Speed; keyboard; sharp                    |
| Raycast                | Command palette; power-user feel          |
| Cal.com                | Booking-flow polish                       |
| BeReal                 | Daily prompt urgency                      |
| Robinhood              | Visceral chart animation                  |
| Apple Health           | Year-over-year compare                    |
| Whoop                  | Recovery score = identity                 |
| Finch                  | Cute friend that grows                    |
| Streaks                | Pure habit dopamine                       |

### § 0.3 — Visual identity

> **Operating principle (per ADR-039): the tool ships empty.** Dharma is a setup-it-yourself SaaS — like Notion or Linear, not Headspace or Apple Health. **No factory habits, no pre-baked routines, no default categories, no seed data.** The user opens Dharma on day 1 and builds their day brick by brick. Every example in this spec ("Morning workout", "Drink water", etc.) describes what a user _might_ create — never what we ship in code.

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

| Action             | Motion                                      |
| ------------------ | ------------------------------------------- |
| Tap                | Scale 0.96, 100ms ease-out                  |
| Brick fill         | Width transition 600ms cubic-bezier         |
| Block complete     | Subtle bloom + chime                        |
| Modal open         | Slide from bottom, spring physics           |
| Modal close        | Soft fade + slide                           |
| Page transition    | FLIP shared element (block → expanded view) |
| Long press         | Haptic + scale-up 1.02 + shadow lift        |
| Empire square land | Stagger 30ms each, scale-in from 0.7        |

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
- **Streaks are visible to those who want them** (flame icon, days-in-a-row over 50%) but they're a _feature_, not the _spine_ of the UI.
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
- **User-saved templates** — Settings → Templates → "Save current day as template" → re-apply to Today / This week / Range. **No factory templates ship with the app** (per ADR-039 — no "Monk Mode" / "Builder Mode" / "Athlete Mode" pre-bakes; templates are user-content-only). Probable milestone: M5 or later — TBD.

### § 0.9 — Data model rules (locked)

These three rules govern every milestone's schema. Per ADR-034 + ADR-035.

1. **Block = always timed.** `start: HH:MM` required. `end: HH:MM` optional. Lives at a fixed slot on the daily timeline. Can be empty (zero bricks); empty blocks score as a tick (did I do this ritual? yes/no).
2. **Brick = never timed.** No scheduled time of its own. A "Time"-type brick has a _target duration_ (`durationMin: number`) — that is a goal, not a schedule. The block determines _when_.
3. **Bricks can be inside a block OR standalone.** Same schema either way; difference is `parentBlockId: string | null`. Standalone bricks live in the "Loose Bricks" tray.

**Brick types (locked since pre-pivot):**

```ts
type Brick =
  | {
      id: string;
      type: "tick";
      name: string;
      category: string;
      parentBlockId: string | null;
    }
  | {
      id: string;
      type: "goal";
      name: string;
      category: string;
      parentBlockId: string | null;
      target: number;
      unit: string;
    }
  | {
      id: string;
      type: "time";
      name: string;
      category: string;
      parentBlockId: string | null;
      durationMin: number;
    };
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

| Question                                                                     | Blocks milestone | Status / decision                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Loose Bricks tray location: pinned above dock / bottom of timeline / top~~ | ~~M3~~           | **LOCKED Gate #2 (M2 ship-react)** — Option A: **pinned above dock**, always visible once `blocks.length > 0 \|\| looseBricks.length > 0`, collapsed chip-row default, expand on tap. Reasoning: timeline auto-scrolls to current hour, so neither top nor bottom-of-timeline is reliably visible; sticky-bottom sits in the thumb zone. (See M3 SG-m3-02.) |
| Pinch-to-zoom across views: primary or fallback?                             | M9               | Dock primary; pinch as bonus on Android/desktop                                                                                                                                                                                                                                                                                                             |
| User-saved templates — ship in M5 or defer to M11+                           | M5               | Defer; v1 ships with no templates at all (ADR-039)                                                                                                                                                                                                                                                                                                          |
| Streak milestone numbers (7 / 30 / 100 / 365 vs others)                      | M7               | The four listed; bespoke per-screen                                                                                                                                                                                                                                                                                                                         |
| Empire view export — auto-yearly only, or anytime                            | M9               | Anytime; auto-prompt at year-end                                                                                                                                                                                                                                                                                                                            |

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
- **ADR-039** — Dharma ships empty: no factory habits, templates, or category defaults

### § 0.14 — Explicit antipatterns (what we reject)

These are design moves that exist in **prior Dharma builds** (production surface at `integrity-pink.vercel.app`, captured 2026-04-29) that the new model deliberately rejects. Reproduced here as a _learning aid only_ — **do NOT use the prior build's visual or structural treatment as implementation guidance**. PLANNER must avoid recreating these patterns.

#### Antipattern 1 — "Everything is a block"

The prior build forced every routine, including single-action ones, into a timed block. Examples observed in the captured surface:

| Block (prior build) | Scheduled window | Bricks inside         |
| ------------------- | ---------------- | --------------------- |
| "Walk to bus"       | 07:50–08:00      | `walk`                |
| "Commute home"      | 17:15–18:30      | `decompress`          |
| "Face wash"         | 21:30–21:40      | `face wash` · `brush` |
| "Journal"           | 21:40–21:50      | `write`               |
| "Meditation"        | 21:50–22:00      | `meditate 0/10m`      |

This makes the day model feel rigid and verbose. A ten-minute "block" containing one atomic action is just a brick wearing a costume — it asks the user to defend a calendar slot for something that doesn't need one.

**The new rule (per § 0.9 + ADR-035):** blocks are for _bigger rituals worth defending on the calendar_ — multi-brick groupings, or genuinely time-bound stretches. Single atomic actions go in the Loose Bricks tray. A healthy day mixes both. **Illustrative only — not what ships (ADR-039 forbids factory routines):**

- 3–5 timed blocks — e.g., a morning ritual, a focused work block, an evening wind-down (each containing 2+ bricks)
- 5–15 standalone bricks — e.g., drink water, stretch, write, take vitamin, face wash, brush teeth, journal

If a routine has only one brick in it, it should probably _be_ a brick.

#### Antipattern 2 — Hardcoded four-category palette

The prior build shipped four fixed categories — Health / Mind / Career / Passive — with hardcoded colors. ADR-032 supersedes this: categories are user-defined, unlimited, user-picked colors. The earlier "UX Spec — Phase 1 Toolkit" section in this file is also superseded for the same reason (see § 0 banner).

#### Antipattern 3 — Implicit "Passive" catch-all category

The prior build leaned heavily on a generic "Passive" category for things like commuting, sleep, walking — moves that don't fit Health/Mind/Career. Under user-defined categories (ADR-032), users can be specific ("Transit", "Sleep", "Movement") or just leave a routine uncategorized. We do NOT ship a default "Passive" bucket; the absence of a category is itself meaningful and should be allowed.

#### Antipattern 4 — Factory-shipped habits, templates, or seed data

Per ADR-039, **Dharma is a setup-it-yourself SaaS tool, not a curated content app.** Earlier drafts mentioned pre-baked templates ("Monk Mode" / "Builder Mode" / "Athlete Mode") as a delight feature; those are obsolete. No factory habits, no factory routines, no factory category palette, no seed data ship in production. The user opens the app on day 1 and builds from zero.

Every example in this spec — "morning workout", "drink water", "face wash", "Building AI", "Wake ritual", any block name, any brick name, any category name — is **illustrative only**. Examples must NOT be transcribed into code as defaults, demo content, or onboarding fixtures. M1's empty state is _literally empty_: a blank timeline + the prompt "Tap any slot to lay your first block."

User-saved templates ("save current day, re-apply later") remain a possible feature in M5+, but only as user-content. They never ship pre-populated.

#### Note on the prior build's hero treatment

The prior build's hero showed a "DAY BLUEPRINT" horizontal stacked bar with category-colored segments and a "NOW" highlighted block. While this is _adjacent_ to the new model (§ 0.3 specifies a single-% ring above a per-category bar chart), the prior treatment is **not** a reference for the new implementation. M3 will design the ring + bar chart from § 0.3 directly; PLANNER must not pull pixel-level cues from the prior build's hero.

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

---

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

## Milestone 2 — Add Block Flow

> **Pillars:** § 0.1 (the wedge — calendars show plans, Dharma needs blocks before it can show proof), § 0.3 (visual identity — categories light the BlueprintBar; Block cards land at their `start` row), § 0.5 (interaction primitives — three ways to add; plain forms in M2 per ADR-036), § 0.9 (data model — blocks always timed; `parentBlockId` reserved for M3 bricks), § 0.14 (no factory categories, no factory blocks), ADR-006 (half-open `[start, end)` intervals), ADR-019 (`Recurrence` discriminated union), ADR-032 (user-defined categories, unlimited count), ADR-036 (plain forms in M2, voice in M10), ADR-039 (ships empty).

### Intent

Wire the first interactive verb. From the empty Building Shell that M1 ships, a user creates their first block: tap the floating `+` button (sheet at default time) **or** tap an empty timeline hour-row (sheet pre-filled with that hour). The Add Block sheet uses plain forms — Title, Start, End (optional), Recurrence, Category — saves to in-memory state, slides down, and the new block enters the timeline at its `start` row with stagger fade-in. The empty-state card disappears. The hero stays at `0%` because scoring is M3.

This milestone **locks the `Block` and `Category` schemas** for the rest of Phase 1. M3 fills blocks with bricks. M5 wires edit + delete. M8 wires persistence. M9 wires recurrence resolution (`appliesOn(rec, date)`); M2 only renders today, so all blocks created today appear today regardless of their recurrence kind.

**What this is NOT:** a brick adder (M3), a scoring engine (M3), an editor (M5), a deleter (M5), a persistence layer (M8), a recurrence resolver (M9), a voice mic (M10), an inline natural-language parser (M7). Per ADR-039, no factory categories ship — the user creates their first category inline when they categorize their first block, or skips the field entirely.

### Inputs

- The empty Building Shell from M1 — top bar, hero (`0%`), BlueprintBar, 24-hour timeline with now-line, dock with `+` (M1 left no-op; M2 wires it).
- M0 primitives — `<Sheet>` (full-screen form), `<Input>` (text + time), `<Chip>` (categories + recurrence options), `<Button>` (primary amber for Save, ghost for Cancel), `<EmptyState>` (M1 reuses).
- M0 motion tokens — `modalIn` / `modalOut` for the sheet, stagger for the new block's entrance.
- M0 haptics — `light` on chip-select; `success` on Save; `medium` on validation error.
- M1 helpers — `useNow()` (drives `+` button's default Start), `dayOfYear()` (unchanged), `timeToOffsetPx()` + `HOUR_HEIGHT_PX` (unchanged; new block cards consume these to position themselves on the grid).
- The locked `Recurrence` discriminated union per ADR-019.
- In-memory `AppState.blocks: Block[]` (M1 ships `[]`; M2 mutates) and **new** `AppState.categories: Category[]` (initial `[]` per ADR-039).

### Outputs (regions and behaviors)

| Region                     | Role in M2                                                                                                                                                                                                                                                                                       | Sync with M0 / M1                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating `+` button        | Tappable. Opens the Add Block sheet with `start` defaulted to the current hour (rounded down) and `recurrence` defaulted to `just-today`.                                                                                                                                                        | M1 left it no-op; M2 wires the `onClick`. M0 `<Button>` primary amber unchanged.                                                                        |
| Empty-slot tap target      | Tapping any empty timeline hour-row opens the Add Block sheet with `start` pre-filled to that row's hour.                                                                                                                                                                                        | New behavior. M1's Timeline grid stays the same; M2 attaches `onClick` to each empty row.                                                               |
| Add Block sheet            | Bottom-sheet built on M0 `<Sheet>`. Form: Title (required, autofocus), Start (required, time picker), End (optional, time picker), Recurrence (4 single-select `<Chip>`s), Category (`<Chip>` group of existing categories + "+ New" + "Skip"), Save (sticky bottom amber), Cancel (X top-left). | First real consumer of `<Sheet>`, `<Input>`, `<Chip>`.                                                                                                  |
| New-category inline form   | When "+ New" is tapped, the sheet expands to: Name `<Input>` + 12-color palette picker (`<Chip>` grid). "Done" returns to the block sheet with the new category selected and persisted to `AppState.categories`.                                                                                 | New surface. Category creation is a side-effect of needing one — there is no separate "Manage Categories" screen in M2.                                 |
| Block card on the timeline | After Save: card enters at the `start` row (height ∝ duration; or fixed marker if no End). Displays title, time range, and a category color dot (if categorized). Tapping is a **no-op** in M2 (M4 wires FLIP expand).                                                                           | Re-introduces the existing `components/TimelineBlock.tsx` (M1 tagged it `[obsolete: not-imported-in-M1]`). Migration tag flips to `[re-author]` for M2. |
| Day Blueprint bar          | Once a categorized block exists, the bar gains a colored segment with width ∝ block duration / day duration and color = category color. Uncategorized blocks are excluded from the bar (per SG-m2-02).                                                                                           | M1's empty-outline path stays as the zero-blocks fallback. Non-empty path is new in M2.                                                                 |
| Empty-state card           | Disappears as soon as `blocks.length > 0`. Reappears if the last block is removed (M5+ surface).                                                                                                                                                                                                 | M1's locked copy `"Tap any slot to lay your first block."` unchanged.                                                                                   |

### Locked schemas (this milestone fixes them)

```ts
// lib/types.ts — replaces M1's tagged-soft-deprecated `Category` enum

type Recurrence = // ADR-019
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | {
      kind: "custom-range";
      start: string;
      end: string; // ISO YYYY-MM-DD
      weekdays: number[];
    }; // 0=Sun..6=Sat

type Block = {
  id: string; // uuid (crypto.randomUUID)
  name: string;
  start: string; // "HH:MM"
  end?: string; // "HH:MM" — half-open [start, end) per ADR-006
  recurrence: Recurrence;
  categoryId: string | null; // FK into AppState.categories; null = uncategorized
  bricks: Brick[]; // always [] in M2; M3 lands brick adding
};

type Category = {
  id: string; // uuid
  name: string; // user-typed; not unique
  color: string; // hex from the curated 12-color palette (SG-m2-01)
};
```

The four legacy CSS vars (`--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive`) are removed; a 12-color palette `--cat-1` through `--cat-12` is introduced (locked at Gate #1 — see SG-m2-01). Per § 0.14 antipattern 2, no category names ship in code.

### Edge cases

- **Empty Title** → Save disabled.
- **Start with no End** → block renders as a thin 1-minute marker on the timeline (per SG-m2-05).
- **End ≤ Start** (when End is set) → inline error, Save disabled.
- **End on the next day** (e.g., `23:30` → `00:30`) → not supported in M2; clamp End to ≤ `23:59` with inline error.
- **Times overlap an existing block** → soft inline warning ("Overlaps with [block name]"); Save still allowed.
- **Half-open boundary** `[start, end)` per ADR-006 — back-to-back blocks (`10:00`–`11:00`, `11:00`–`12:00`) do not "overlap".
- **Custom-range recurrence with zero weekdays** → inline error, Save disabled.
- **Add the first block before any category exists** → category list is empty; only "+ New" and "Skip" are visible. Saving with category=null is allowed.
- **Skip category on Save** → block stored with `categoryId: null`; BlueprintBar excludes it (SG-m2-02).
- **New category created but block then Cancelled** → category persists in `AppState.categories` (per AC #24); user can pick it next time.
- **Sheet dismissed via swipe-down (iOS Safari)** → equivalent to Cancel; silent discard (per SG-m2-06).
- **`prefers-reduced-motion: reduce`** → sheet open is instant; new-block stagger fade-in collapses to instant render.
- **Page refresh** → all state lost (no persistence until M8). Documented in the dock or status — TBD; for M2, refresh = empty Building (M1's state).
- **Very long Title** → truncated with ellipsis on the block card; full title visible only via M4's expanded view.
- **Two categories with identical Name** → allowed (case-sensitive, no de-dup).

### Acceptance criteria

**Add paths**

1. Tapping the floating `+` button opens the Add Block sheet with `start` = current hour rounded down, `recurrence` = `just-today`, `categoryId` = `null`.
2. Tapping any empty timeline hour-row opens the Add Block sheet with `start` pre-filled to that row's hour.
3. The `+` button uses the M0 `<Button>` primary amber variant; the sheet uses the M0 `<Sheet>` primitive.

**Sheet form** 4. Title is a required `<Input>` with autofocus on open. 5. Start is a required time picker, pre-filled per the trigger. 6. End is an optional time picker; clearing it returns the block to "no End" state. 7. Recurrence renders four `<Chip>`s (single-select): _Just today_ / _Every weekday_ / _Every day_ / _Custom range_. Default = _Just today_. 8. The Custom-range chip, when selected, reveals start-date / end-date inputs and a 7-day weekday picker. 9. Category renders existing `AppState.categories` as `<Chip>`s plus a "+ New" chip and a "Skip" affordance. With zero categories, only "+ New" and "Skip" are visible. 10. New-category inline form has a Name `<Input>` and a 12-color palette picker (`<Chip>` 4×3 grid). 11. Save button is `<Button>` primary amber, sticky bottom; disabled until Title is non-blank, Start is valid, and any sub-form errors are clear. 12. Cancel is an `<X>` icon top-left; tapping discards sheet state and closes. 13. Sheet dismiss via swipe-down on iOS Safari is equivalent to Cancel.

**Block creation behavior** 14. On Save: a new `Block` is appended to `AppState.blocks` with a `crypto.randomUUID()` id. 15. The sheet slides down (M0 `modalOut` motion); reduced-motion collapses to instant. 16. The new block enters the timeline at its `start` row with a stagger fade-in (M0 stagger 30 ms). 17. The block card displays title, time range (e.g., `09:00–10:00`), and a category color dot when `categoryId !== null`. 18. The Day Blueprint bar updates to include the new block's segment (categorized blocks only — SG-m2-02). 19. The empty-state card unmounts as soon as `blocks.length > 0`. 20. The hero's `0%` does not change in M2 (scoring is M3). 21. The saved block matches the locked `Block` schema (Vitest schema test).

**Validation** 22. Empty Title → Save disabled with inline message. 23. End ≤ Start (when End is set) → inline error; Save disabled. 24. End past `23:59` → inline error; Save disabled. 25. Custom-range with zero weekdays selected → inline error; Save disabled. 26. Times overlap an existing block → soft inline warning naming the block; Save still allowed.

**Categories** 27. With zero categories, Save with `categoryId: null` is allowed; block renders without a color dot. 28. New-category form persists the new `Category` to `AppState.categories` immediately on "Done", even if the block is then Cancelled. 29. Newly created categories appear as `<Chip>`s in any subsequent Add Block sheet within the session. 30. Two categories with identical Name are allowed (no de-dup).

**A11y / quality** 31. All interactive elements ≥ 44px (ADR-031). Tab order matches visual order. Sheet has `role="dialog"` with a focus trap. 32. axe-core: zero violations on the day view AND on the open sheet. 33. `tsc --noEmit`: zero new errors. 34. ESLint: zero new warnings. 35. `prefers-reduced-motion`: sheet open and new-block stagger collapse to instant. 36. Playwright: add via `+` → block appears at default Start; add via slot-tap → block appears at slot's hour; Cancel → no block added; mobile viewport 430px; no horizontal overflow when sheet is open.

### Out of scope

- Brick creation inside or outside a block — M3
- 3 brick types (tick / goal / time) — M3
- Live scoring / hero `%` updates — M3
- Block expand / FLIP animation on tap — M4
- Edit block, "Just today" / "All future" / "All events" delete prompts — M5
- Drag reorder — M6
- Cinematic polish layer — M7
- Inline natural-language Title parsing — M7 (per ADR-036)
- Persistence to localStorage — M8
- Recurrence resolution `appliesOn(rec, date)` — M9 (M2 renders only today's `blocks`)
- Castle / Kingdom / Empire navigation — M9
- Voice mic — M10
- Multi-day blocks crossing midnight — never (or much later)
- Category management (rename / delete / merge / reorder) — later milestone
- Loose Bricks tray (standalone bricks with `parentBlockId: null`) — M3 (the tray location lock per § 0.11 blocks M3 PLAN, not M2)
- NowCard surfacing the active block — M3 or M4 (component exists; M2 keeps it un-rendered)
- `programStart`-relative `dayNumber` — M8 (M1's `dayOfYear()` stays in M2)
- Lighthouse measurement from the sandbox — still pending Vercel access

### Open spec gaps (lock at Gate #1)

- **SG-m2-01 — Category color palette.** Curated set of 12 hex colors as CSS vars `--cat-1`..`--cat-12`. Recommendation: keep M0's 4 colors (emerald `#34d399`, lavender `#c4b5fd`, amber `#fbbf24`, slate `#64748b`) and add 8 more covering: rose, orange, yellow-green, teal, sky, indigo, fuchsia, neutral-warm. PLANNER picks specific hexes at PLAN dispatch unless user pre-specifies.
- **SG-m2-02 — Uncategorized block in BlueprintBar.** Recommendation: **excluded** — § 0.14 antipattern 3 ("the absence of a category is itself meaningful"). Alternative: render as a neutral gray segment.
- **SG-m2-03 — Loose Bricks tray location.** Carried from § 0.11. **Does NOT block M2** (M2 ships only blocks; standalone bricks with `parentBlockId: null` are M3). Lock before M3 PLAN.
- **SG-m2-04 — `+` button default Start.** Round current time DOWN to the nearest hour (recommended — matches Apple Calendar tap-a-slot "right now") or UP (next round hour).
- **SG-m2-05 — End = blank rendering.** Recommendation: thin 1-minute marker (height ≈ 5px) on the timeline. Alternatives: 1-hour default, or require End.
- **SG-m2-06 — Sheet swipe-down with dirty form.** Recommendation: silent discard (matches Apple Reminders); add an undo toast in M7. Alternative: confirm "Discard?".
- **SG-m2-07 — `categoryId` FK vs inline `category: { name, color }`.** Recommendation: **FK** (cleaner for renaming categories in a later milestone). Schema above reflects this; flag here for ratification.
- **SG-m2-08 — Empty timeline row tap target.** M1's Timeline renders an hour grid via CSS gradient. Each row is currently not individually tappable. M2 needs to attach a click handler per hour. Approach: 24 absolutely-positioned transparent buttons over the grid, each spanning one `HOUR_HEIGHT_PX` row. PLANNER decides exact technique; flag here so the choice is conscious.

---

## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill

> **Pillars:** § 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (visual identity — hero ring is the dopamine surface), § 0.5 (interaction primitives — three brick types: tick / goal / time), § 0.9 (data model — bricks never timed; bricks live inside a block OR standalone in the Loose Bricks tray; brick category is independent of parent block), § 0.11 (Loose Bricks tray now LOCKED — Option A pinned above dock), § 0.14 (no factory bricks, no factory categories, no seed data), ADR-019 (recurrence stays untouched in M3), ADR-032 (categories user-defined), ADR-034 (blocks always timed), ADR-035 (bricks can be standalone), ADR-039 (ships empty).

### Intent

Wire the second and third interactive verbs and the dopamine layer all in one milestone:

1. **Add Brick (inside a block)** — tap a block → it expands → "+ Add brick" → AddBrickSheet.
2. **Add Brick (standalone)** — Loose Bricks tray (pinned above dock, always visible once at least one block or one loose brick exists) has a "+ Brick" pill → AddBrickSheet with `parentBlockId: null`.
3. **Live scoring engine** — extends the existing `lib/dharma.ts` math layer (M0 already ships `brickPct` / `blockPct` / `dayPct`, all returning 0..100). M3 updates the field reads to match the rewritten `Brick` schema, replaces `dayPct(blocks: Block[])` with `dayPct(state: AppState)` so loose bricks are counted, and adds `categoryDayPct(state, categoryId)`. The math runs every render; a brick added at 0% leaves the day at 0%, but the pipe is now wired and observable in the DOM (data attributes + computed styles).
4. **Visual fill primitives** — brick chips fill with category-color gradient (left→right by progress) using M0's `brickFill` motion token (600 ms easeInOut), block scaffold left-bar fills bottom-up (height = block %), hero ring stroke-dashoffset animates with the day %, BlueprintBar segment opacity = `0.3 + ((block% / 100) × 0.7)`, block 100% triggers bloom (M0's `bloom` spring config already exists — `{ stiffness: 220, damping: 22 }`) + chime, day 100% triggers fireworks (NEW motion; Empire square deferred to M9).

This milestone **rewrites M2's stub `Brick`** (adds `id` / `categoryId` / `parentBlockId`, renames goal/time progress fields per § 0.9 — see Migration note below) and **extends `AppState`** to add `looseBricks: Brick[]`. Each Block's existing `bricks: Brick[]` field (M2 placeholder; always `[]`) now gets populated.

**What this is NOT:** logging bricks (tick toggle / goal stepper / timer ticks) — M4. Block edit / delete — M5. Drag reorder — M6. Polish layer (the cinematic stagger / count-up / hidden Easter eggs) — M7. Persistence — M8. Calendar navigation — M9. Voice mic — M10. Per ADR-039, no factory bricks ship — the user creates each brick.

### Inputs

- The day-with-blocks surface from M2 — top bar, hero (`0%`, but now backed by a real `<HeroRing>` component instead of a static numeral), BlueprintBar (renders categorized segments at full opacity in M2; M3 modulates segment opacity by block %), 24-hour timeline with block cards, dock with `+`, AddBlockSheet, `<EditModeProvider>`, `<SlotTapTargets>`.
- M0 primitives — `<Sheet>`, `<Input>`, `<Chip>`, `<Button>`, `<EmptyState>`. M2's `<CategoryPicker>` and `<NewCategoryForm>` are reused as-is inside AddBrickSheet.
- M0 motion tokens — `modalIn` / `modalOut` for AddBrickSheet, `stagger` for new-brick fade-in inside an expanded block, `brickFill` (already shipped, 600 ms easeInOut) for chip fill animation, `bloom` (already shipped as a `springConfigs` entry) for block 100% celebration, **`fireworks` (NEW Duration token)** for day 100%.
- M0 haptics — `light` on chip-select; `success` on Save and on block 100%; `medium` on validation error; `notification` on day 100% (per § 0.10).
- M2 helpers — `lib/uuid.ts` (M2 mockable seam), `lib/data.ts` reducer (extend with `ADD_BRICK`), `lib/blockValidation.ts` (M2 ships `isValidStart`, `isValidEnd`, `endAfterStart`, `overlapsExistingBlock`, `isValidCustomRange`; M3 may add `isValidBrickGoal`, `isValidBrickTime` to the same module), `lib/dharma.ts` (extended — see "Locked schemas" below).
- The locked `Block` and `Category` schemas from M2.
- In-memory `AppState`: `blocks` (M2), `categories` (M2), **new** `looseBricks: Brick[]` (initial `[]`).

### Outputs (regions and behaviors)

| Region                       | Role in M3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Sync with M0 / M1 / M2                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero ring                    | Wraps M0/M1's static `pct` numeral inside a `<HeroRing>`: SVG circle, stroke-dashoffset = `(1 − dayPct(state)/100) × circumference`, animated via M0's `brickFill` token (600 ms easeInOut) on change. Numeral inside the ring stays the existing `Math.round(dayPct(state))%`. M2's `0%` literal stays correct because zero bricks → `dayPct = 0`.                                                                                                                                                | New surface. The existing M1 `Hero` component is extended (not replaced); the ring is added around the numeral.                                                                        |
| BlueprintBar segment opacity | Each categorized segment's opacity = `0.3 + (block% × 0.7)`. Uncategorized blocks remain excluded (SG-m2-02).                                                                                                                                                                                                                                                                                                                                                                                      | M2 path is preserved; M3 adds the per-segment opacity modulation.                                                                                                                      |
| Block card (collapsed)       | Adds left vertical scaffold bar 4px wide, full card height. Filled bottom-up by block %; color = category color (or `--text-dim` when `categoryId === null`). Tap behavior changes from no-op (M2) to "expand".                                                                                                                                                                                                                                                                                    | Re-author of `<TimelineBlock>` from M2; M2 had a static color dot — M3 keeps the dot AND adds the scaffold.                                                                            |
| Block card (expanded)        | After tap-to-expand: card grows in height (max-height transition, 200 ms eased; reduced-motion → instant). Reveals: vertical list of `<BrickChip>`s, then a "+ Add brick" `<Button>` ghost variant at the bottom. Re-tap collapses.                                                                                                                                                                                                                                                                | New surface. Layout is plain (FLIP magic is M7). Edit-mode interactions are M5 — M3's expanded view is view-mode only.                                                                 |
| AddBrickSheet                | Bottom-sheet built on M0 `<Sheet>`. Form: Title (required, autofocus), Type selector (3 large `<Chip>` cards: Tick / Goal / Time, default = Tick), per-type fields (Goal: target + unit; Time: target minutes), Category (`<CategoryPicker>` reused; default pre-fills to parent block's category for inside-block bricks, blank for standalone), Save (sticky bottom amber), Cancel (X top-left).                                                                                                 | First reuse of M2's `<CategoryPicker>` + `<NewCategoryForm>` outside `<AddBlockSheet>`. The single-`<Sheet>`-instance pattern from M2 carries over (view: `'brick' \| 'newCategory'`). |
| `<BrickChip>`                | Rounded-rect chip ~44px tall (touch target, ADR-031). Background = category color at 12% alpha (or `--surface-2` when uncategorized). Foreground gradient overlay = category color at 60% alpha, width = `(brickPct / 100) × 100%`, animated via M0's `brickFill` token (600 ms easeInOut) on change. Title left-aligned. Type-specific badge right-aligned: Tick → `☐` / `✓`; Goal → `count / target unit`; Time → `minutesDone / durationMin m ▶`. Tap surface in M3 = no-op (M4 wires logging). | New component. Lives inside expanded blocks AND inside the Loose Bricks tray.                                                                                                          |
| `<LooseBricksTray>`          | Pinned above `<BottomBar>`. Renders iff `state.blocks.length > 0 \|\| state.looseBricks.length > 0`. Two states: **Collapsed** (default, max-height 56 px) — single horizontal scroll row of small `<BrickChip>`s, with a trailing "+ Brick" pill; tap chevron-up to expand. **Expanded** (max-height ≈ 40 vh) — vertical list of full-size `<BrickChip>`s + "+ Brick" ghost button at top; tap chevron-down to collapse. When zero loose bricks, collapsed state shows only the "+ Brick" pill.   | New component. Renders ABOVE M1's `<BottomBar>`. The `+` button in BottomBar still adds a Block (M2 verb preserved); standalone-brick creation lives only inside the tray.             |
| Empty-state card             | Now appears iff `state.blocks.length === 0 && state.looseBricks.length === 0`. Copy unchanged from M1: `"Tap any slot to lay your first block."` (Loose Bricks tray is hidden in this exact state, matching M1's "literal empty" promise.)                                                                                                                                                                                                                                                         | M2 disappeared the card on first block; M3 widens the visibility predicate to also account for loose bricks.                                                                           |
| 100% block celebration       | When `blockPct` crosses from `<100` to `100`, the block card fires a one-shot bloom (Framer-Motion spring, M0 `springConfigs.bloom`) + a soft chime (`Audio` API, single-shot, mute-respecting) + `success` haptic. Reduced-motion → bloom-suppressed; chime still fires (audio is not motion).                                                                                                                                                                                                    | Wires the trigger in M3; the only path that fires it in M3 is test-injected state (M4 wires user-driven logging).                                                                      |
| 100% day celebration         | When `dayPct` crosses from `<100` to `100`, fireworks particle burst plays for 1.6 s + `notification` haptic. Empire square light-up is M9. Reduced-motion → fireworks-suppressed.                                                                                                                                                                                                                                                                                                                 | Same wiring story as block 100%.                                                                                                                                                       |

### Locked schemas (this milestone fixes them)

> **Migration note.** M2 stubbed `Brick` in `lib/types.ts:6–15` as `{ kind, name, done | current/target/unit }` with no `id`, `categoryId`, or `parentBlockId`. M0 also shipped scoring helpers in `lib/dharma.ts` — `brickPct` / `blockPct` / `dayPct` returning **0–100 percentages** — that already read M2's stub fields. M3 **rewrites the stub** (adds the three FK/identity fields, renames the goal/time progress fields to match § 0.9), **extends** `lib/dharma.ts` (it already houses the math; no new file), and migrates every existing call site that constructs a `Brick` literal. The `kind` discriminator is **kept** (already shipped; matches the `Recurrence` convention).

```ts
// lib/types.ts — REPLACES M2's stub Brick. Adds id/categoryId/parentBlockId; renames goal/time fields per § 0.9.

type BrickBase = {
  id: string;                  // crypto.randomUUID via lib/uuid.ts
  name: string;
  categoryId: string | null;   // FK to AppState.categories; null = uncategorized
  parentBlockId: string | null;// FK to AppState.blocks; null = standalone (loose)
};

type Brick =
  | (BrickBase & { kind: 'tick'; done: boolean })
  | (BrickBase & { kind: 'goal'; target: number; unit: string; count: number })
  | (BrickBase & { kind: 'time'; durationMin: number; minutesDone: number });

type AppState = {
  blocks: Block[];           // M2; each Block.bricks now gets populated in M3
  categories: Category[];    // M2
  looseBricks: Brick[];      // M3 — bricks with parentBlockId === null
};

// Reducer additions (extend M2's discriminated Action union; assertNever exhaustiveness preserved)
type Action =
  | /* M2 actions: ADD_BLOCK, ADD_CATEGORY */
  | { type: 'ADD_BRICK'; brick: Brick };  // routed by brick.parentBlockId
```

```ts
// lib/dharma.ts — EXTENDS the existing M0 scoring helpers (does NOT introduce lib/scoring.ts).
// Existing (M0): brickPct(b) | blockPct(block) | dayPct(blocks)  — all return 0..100
// Updated in M3:
//   • brickPct still dispatches by `kind`, now reads renamed fields:
//       tick: b.done → 0 | 100
//       goal: min(b.count / b.target, 1) × 100        // was b.current/b.target
//       time: min(b.minutesDone / b.durationMin, 1) × 100   // was b.current/b.target
//   • blockPct unchanged in shape; still 0 when bricks: [].
//   • dayPct(blocks) DEPRECATED in favor of:
//       dayPct(state: AppState): number
//         — averages over (state.blocks + state.looseBricks), each as one unit per § 0.9.
//         — empty state (zero blocks AND zero loose bricks) → 0 (no divide-by-zero).
// New in M3:
//   • categoryDayPct(state: AppState, categoryId: string): number
//       — averages bricks AND blocks attributed to that categoryId.
//       — bricks inside a block contribute to THEIR own category, not the block's.
//       — standalone bricks with categoryId: null are excluded from category-filtered queries
//         but still count in dayPct.
```

**Schema rules (locked):**

- A new `tick` brick saves with `done: false` → 0%.
- A new `goal` brick saves with `count: 0` → 0%.
- A new `time` brick saves with `minutesDone: 0` → 0%.
- `target` (goal) and `durationMin` (time) are integers `> 0` (validation enforced).
- `unit` (goal) is a free-text string, may be blank (e.g., "100" with no unit).
- `categoryId` for inside-block bricks **defaults to** the parent block's `categoryId`, but the user can override (including to `null`).
- A block with `bricks: []` has `blockPct = 0` in M3 (the "empty block tickable as 0/1" rule from § 0.9 is M4 behavior — wired only when M4 ships the tap-to-tick UX).
- `dayPct(state)` averages over the union of `state.blocks` (each contributing one entry — its own `blockPct`) and `state.looseBricks` (each contributing one entry — its own `brickPct`). Empty state (zero blocks, zero loose bricks) → `dayPct = 0` (no division by zero).
- All scoring functions return values in **`[0, 100]`** (not 0–1) — matches the existing dharma.ts contract that M0/M1/M2 already consume. Internal math uses 0–1 fractions where convenient (`min(count/target, 1)`); the boundary multiplies by 100.

### Edge cases

- **Block with zero bricks** → `blockPct = 0` (until M4 wires empty-block tick).
- **Adding the first brick to an empty block** → block keeps showing 0% (new brick defaults to 0%). The scaffold bar stays empty; this is correct — the dopamine arrives in M4 when logging fires.
- **`goal` brick with `target = 0`** → save disabled (validation).
- **`time` brick with `durationMin = 0`** → save disabled (validation).
- **`goal` `count > target`** → progress capped at 100 (`min(count/target, 1) × 100`). M3 has no UX path to `count > target` (count starts at 0; M4 wires the stepper); this is a math invariant for M4 and persistence migrations.
- **`time` `minutesDone > durationMin`** → progress capped at 100 (same math). M3 has no UX path to push `minutesDone` above zero; this guards M4 + persistence.
- **Brick inside a block, brick category ≠ block category** → allowed. Per-category day score correctly attributes the brick to ITS category, not the block's.
- **Standalone brick with `categoryId: null`** → counted in `dayPct` (it's a unit), excluded from `categoryDayPct(_, any)` (no category to attribute to).
- **Hero ring at 0%** → stroke-dashoffset = circumference (empty arc). Numeral reads `0%`.
- **Hero ring on first state change** → animates from previous % to new % via M0's `brickFill` token (600 ms easeInOut). Reduced-motion → instant.
- **BlueprintBar segment opacity at 0%** → 0.3 (the floor). At 100% → 1.0.
- **Block crosses 100% but immediately drops below** (M4 stepper down) → the bloom is a one-shot; it does not retrigger until the block has been below 100% AND crossed up again. Detection lives in `useEffect` watching `blockPct`.
- **Day crosses 100% then drops** → same one-shot rule for fireworks.
- **`prefers-reduced-motion: reduce`** → ring stroke animation collapses to instant; brick-chip fill collapses to instant; bloom and fireworks suppressed (CSS-driven, not haptic-driven). Haptics + chime audio still fire (motion ≠ haptics ≠ audio per M0 conventions).
- **AddBrickSheet swipe-down with dirty form** → silent discard (matches M2 SG-m2-06).
- **Sheet nesting** — single `<Sheet>` instance with `view: 'brick' \| 'newCategory'` (matches M2's `<AddBlockSheet>` pattern).
- **Block-tap to expand: tap target** — entire block card is the tap surface. Tapping the category dot or scaffold bar inside the card also expands (no nested click-eaters). The category-color dot's `data-testid="category-dot"` (M2 SG-m2-13) stays.
- **Block expanded, user taps "+ Add brick"** → AddBrickSheet opens with `parentBlockId` pre-set to this block AND `categoryId` pre-set to this block's `categoryId` (overrideable in the sheet).
- **Tray "+ Brick" tapped** → AddBrickSheet opens with `parentBlockId: null`, `categoryId: null` (no parent block to inherit from).
- **Tray expand/collapse during AddBrickSheet open** → sheet is full-screen and traps focus; tray interactions are blocked behind it.
- **Page refresh** → all state lost (no persistence until M8). Same as M2.
- **Brick name length** — long names truncate with ellipsis on the chip; full name visible only after M4's edit surface (M5 actually — M3 has no brick edit). Acceptable for M3.
- **Two bricks with identical Name inside the same block** → allowed (no de-dup; matches M2's category rule).
- **`<HeroRing>` SSR/CSR mismatch** — the ring is SVG with computed stroke-dashoffset. Server renders 0%; client hydrates to actual day % using the same two-pass pattern from M1's auto-scroll (the `mounted` flag).

### Acceptance criteria

**Add paths (inside a block)**

1. Tapping a block card in view mode toggles its expanded state (collapsed ↔ expanded).
2. Expanded block reveals: vertical list of `<BrickChip>`s (one per `block.bricks[]`) + "+ Add brick" ghost button.
3. Tapping "+ Add brick" opens AddBrickSheet with `parentBlockId` = this block's id and `categoryId` pre-filled to the block's `categoryId`.
4. On Save: a new `Brick` is appended to that block's `bricks[]` with `crypto.randomUUID()` id and `parentBlockId` set; the brick chip enters the expanded view with stagger fade-in.

**Add paths (standalone via tray)** 5. The Loose Bricks tray renders iff `state.blocks.length > 0 || state.looseBricks.length > 0`. In the literal-empty state (both zero), the tray is hidden and M1's empty-state card is visible. 6. The tray renders pinned above the BottomBar dock. Default state when at least one criterion in #5 holds = collapsed (max-height 56 px). 7. The tray's "+ Brick" pill (always visible while the tray is rendered) opens AddBrickSheet with `parentBlockId: null` and `categoryId: null`. 8. On Save with `parentBlockId: null`: a new `Brick` is appended to `state.looseBricks[]` with `crypto.randomUUID()` id; the brick chip enters the tray with stagger fade-in. 9. Tap the tray's chevron toggle to expand → tray grows to max-height ≈ 40 vh, vertical list of full-size chips. Tap chevron again → collapses. State persists for the session (resets on refresh — no M8 yet).

**AddBrickSheet form** 10. Title is a required `<Input>` with autofocus on open. 11. Type selector renders 3 large `<Chip>` cards (Tick / Goal / Time) as a single-select group; default = Tick. 12. Selecting Goal reveals: target (number `<Input>`, integer `≥ 1`) + unit (text `<Input>`, optional). Both fields disappear when type ≠ Goal. 13. Selecting Time reveals: target minutes (number `<Input>`, integer `≥ 1`). Field disappears when type ≠ Time. 14. Category renders M2's `<CategoryPicker>` (existing categories + "+ New" + "Skip"). Inside-block: pre-filled to parent block's `categoryId` (or "Skip" when block is uncategorized). Standalone: no pre-fill. 15. Save button is `<Button>` primary amber, sticky bottom; disabled until validation clears (Title non-blank AND per-type fields valid). 16. Cancel is an `<X>` icon top-left; tapping discards sheet state and closes. 17. New-category creation works identically to M2 (single `<Sheet>` instance, `view: 'newCategory'`, the new category persists immediately on Done). 18. Sheet swipe-down on iOS Safari = silent discard (matches M2).

**Brick creation behavior** 19. On Save: a new `Brick` matching the locked schema is appended to the appropriate slot (`block.bricks[]` for inside-block, `state.looseBricks[]` for standalone). 20. The sheet slides down (M0 `modalOut`); reduced-motion → instant. 21. The new chip renders with progress = 0 (empty fill). Stagger fade-in = M0 `30 ms` between siblings; reduced-motion → instant. 22. The chip displays title, type-badge, and category color (background tint + foreground gradient placeholder). Uncategorized chips use `--surface-2` background. 23. The saved brick matches the locked `Brick` discriminated union (Vitest schema test per type).

**Visual fill (math + render)** 24. `<HeroRing>` renders as SVG with stroke-dashoffset reflecting `(1 − dayPct(state)/100) × circumference`. At `dayPct = 0` the arc is empty; at `100` the arc is full. Stroke = `--accent` (amber). 25. Hero numeral text node = `${Math.round(dayPct(state))}%`. Updates synchronously with the ring. 26. Block scaffold left-bar height = `(blockPct(block) / 100) × cardHeight`. Color = category color or `--text-dim`. 27. BrickChip foreground gradient width = `(brickPct(brick) / 100) × 100%`. Animated via M0's `brickFill` token (600 ms easeInOut) on change; reduced-motion → instant. 28. BlueprintBar categorized segment opacity = `0.3 + ((blockPct / 100) × 0.7)` (clamp `[0.3, 1]`). Uncategorized blocks remain excluded. 29. State changes (adding a brick) re-render every dependent view in the same React tick; no flash of stale 0%.

**Scoring (math)** 30. `brickPct({ kind: 'tick', done: false }) === 0` and `brickPct({ kind: 'tick', done: true }) === 100`. 31. `brickPct({ kind: 'goal', target: 100, count: 50 }) === 50`; `count: 100` → `100`; `count: 200` → capped at `100`; `count: 0` → `0`. 32. `brickPct({ kind: 'time', durationMin: 30, minutesDone: 15 }) === 50`; `minutesDone: 60` → capped at `100`; `0` → `0`. 33. `blockPct({ bricks: [] })` → `0`. With bricks → `avg(brickPct(b) for b in bricks)`. 34. `dayPct({ blocks: [], categories: [], looseBricks: [] })` → `0`. With one block at `100` and zero loose bricks → `100`. With one block at `100` and one loose brick at `0` → `50`. 35. `categoryDayPct(state, "cat-x")` averages only the bricks AND blocks attributed to `cat-x`. Bricks inside a block contribute to THEIR own category, not the block's. Standalone bricks with `categoryId: null` are excluded from any category-filtered query but still count in `dayPct(state)`.

**100% celebrations (wired but injection-tested in M3)** 36. When `blockPct(block)` crosses from `<100` to `100`, a `bloom` Framer-Motion spring plays once on that block card (M0 `springConfigs.bloom = { stiffness: 220, damping: 22 }`; class added on the cross transition, removed after the spring settles). A `success` haptic fires. 37. When `dayPct(state)` crosses from `<100` to `100`, a `fireworks` overlay plays for ~1.6 s (Framer Motion or canvas; bounded particle count so the work doesn't leak into the next render). A `notification` haptic fires. 38. Both celebrations are one-shot per crossing: dropping back below 100 and re-crossing fires again. Test via state injection (M3 has no user path to logging). 39. Reduced-motion → bloom and fireworks visuals suppressed (no animation classes added). Haptics still fire. Audio (chime) still fires unless OS-muted.

**Edit mode (no-op in M3)** 40. With Edit Mode toggled ON (M5 mechanism is already wired in M2's `<EditModeProvider>`), block tap-to-expand and the Loose Bricks tray "+ Brick" pill remain functional. Edit-mode-specific affordances (jiggle, ×, drag handles) are M5; M3 ships nothing edit-specific. **`<SlotTapTargets>` continues to pass through edit mode (returns null when `editMode === true`, per M2 C-m2-013).**

**A11y / quality** 41. All interactive elements ≥ 44 px (ADR-031). Tab order matches visual order. AddBrickSheet has `role="dialog"` with focus trap. 42. `<HeroRing>` has `role="img"` and `aria-label="Day score: ${pct}%"`. Updates live with `aria-live="polite"`. 43. `<BrickChip>` has accessible name `"${name}, ${kind}, ${brickPct}% complete"`. Type-specific suffix: Goal → `, ${count} of ${target} ${unit}`; Time → `, ${minutesDone} of ${durationMin} minutes`. 44. `<LooseBricksTray>` has `role="region"`, `aria-label="Loose bricks"`, `aria-expanded={open}`. Chevron toggle has `aria-controls` pointing at the list region. 45. Expanded block card sets `aria-expanded="true"` on the block-card button; collapsed = `false`. The list of bricks inside has `role="list"`. 46. axe-core: zero violations on day view, on open AddBrickSheet, on expanded block, AND on expanded Loose Bricks tray. 47. `tsc --noEmit`: zero new errors. 48. ESLint: zero new warnings. 49. `prefers-reduced-motion`: ring animation, chip fill animation, bloom, and fireworks all collapse to instant / suppressed. 50. Playwright: add brick inside block via expand → "+ Add brick" → Save → chip appears at 0%; add standalone brick via tray "+ Brick" → Save → chip appears in tray at 0%; mobile viewport 430 px; no horizontal overflow when sheet is open; tray chevron toggle expands and collapses; HeroRing renders (visible) and is `0%` at session start.

### Out of scope

- Logging bricks: tick toggle, goal +/- stepper, time start/stop timer, manual time entry — **M4**
- Block edit (rename, retime), brick edit (rename, retype, retarget) — **M5**
- Block delete and brick delete with "Just today / All recurrences" prompts — **M5**
- Drag-reorder for blocks AND for bricks within a block — **M6**
- The full polish layer: stagger on first paint, count-up animation on hero, "now" line glow, NOW tag, "Your Empire begins." card, brand-mark Easter egg, skeleton loaders, toasts — **M7**
- Persistence (`dharma:v1` localStorage, schema migrations, multi-tab last-writer-wins) — **M8**
- Calendar navigation (week strip, Castle / Kingdom / Empire), `appliesOn(rec, date)` resolver — **M9** (M3 still renders only today; recurrence kinds stored on Block from M2 are inert until M9)
- Voice mic — **M10**
- Multi-day blocks crossing midnight — **never (or much later)**
- "Empty block tickable as 0/1" UX — **M4** (the math is wired with a `0` floor in M3; M4 adds the tap-to-tick gesture that flips it to 1)
- Empire square light-up on day 100% — **M9** (M3 fires only the fireworks overlay locally on the Building view)
- "+ Block" via long-press menu / brick-and-block chooser — **never** (M3 keeps M2's `+` = New Block; standalone-brick creation lives only inside the tray)
- Block-detail surface as a separate route or sheet — **never** (block expand stays inline per § 0.5)
- Lighthouse measurement from sandbox — pending Vercel access (carries over from M2)

### Open spec gaps (lock at Gate #1)

- **SG-m3-01 — Brick category FK vs inline.** Recommendation: `categoryId: string | null` (FK), matching M2's SG-m2-07 ratification. Schema above reflects this.
- **SG-m3-02 — Loose Bricks tray location.** **LOCKED Gate #2 (M2 ship-react)** — Option A: pinned above the dock, always visible once `blocks.length > 0 \|\| looseBricks.length > 0`, collapsed chip-row default with chevron-up to expand. Hidden in the literal-empty state to preserve M1's empty-state contract. Recorded in § 0.11.
- **SG-m3-03 — Bricks: embedded under blocks vs flat array.** Recommendation: **embedded** for inside-block bricks (`block.bricks[]` — M2's locked field, populated in M3) AND flat for standalone (`state.looseBricks[]` — new in M3). This matches M8's persistence shape (block templates carry their bricks; standalone bricks are a peer collection).
- **SG-m3-04 — Inside-block brick category default.** Recommendation: pre-fill brick `categoryId` to the parent block's `categoryId` (overrideable). Alternative: always blank.
- **SG-m3-05 — 100% bloom / chime / fireworks: ship in M3 or defer.** Recommendation: **ship the wiring in M3** (component + cross-detection effect + tests via state injection). M3 has no user path to logging — but M4 needs the celebrations primed when its first stepper tick lands. Deferring to M4 means M4 ships TWO surfaces (logging + celebrations) which dilutes the M3 / M4 boundary.
- **SG-m3-06 — Block expand mechanism.** Recommendation: tap-to-expand in view mode; max-height transition 200 ms; re-tap collapses. No FLIP magic in M3 (that's M7). Carry the simplest implementation that lets brick-adding flow through.
- **SG-m3-07 — Hero ring component.** Recommendation: introduce `<HeroRing>` now as SVG with `stroke-dasharray` / `stroke-dashoffset`. Replaces the static numeral M0/M1 shipped. Numeral text node lives inside the ring.
- **SG-m3-08 — Where the "+ Brick" verb lives.** Recommendation: ONLY inside the Loose Bricks tray (when tray is rendered). The BottomBar `+` keeps M2's verb (New Block). No long-press menu, no chooser modal. Trade-off: in the literal-empty state (no blocks, no loose bricks), there is no path to add a standalone brick first. Resolution: the user must create their first block before the tray appears; if a user wants a single atomic action, they tap a slot, name it, and skip End — that's a no-end block, which is closer to a brick semantically. (Acceptable per § 0.14 antipattern 1: a single atomic action probably IS a brick, but in the literal-empty state Dharma still asks the user to "lay your first block" — the brick path opens up immediately after.)
- **SG-m3-09 — Empty-block scoring in M3.** Recommendation: `blockPct({ bricks: [] }) → 0` in M3. § 0.9's "empty block → 0 or 1 (boolean tick)" is a M4 feature; the math floor in M3 is `0` until M4 adds the per-block tick state. Document this so M4 doesn't have to renegotiate.
- **SG-m3-10 — Day score with zero bricks.** Recommendation: `dayPct({ blocks: [...], looseBricks: [] }) = avg(blockPct)` when at least one block exists; `dayPct({ blocks: [], looseBricks: [] }) = 0` for the literal-empty case (no division by zero). Average is taken over the union of (blocks + looseBricks) treating each as one unit per § 0.9's "Day score = average across all top-level units". **Migration:** the existing `dayPct(blocks: Block[])` signature in `lib/dharma.ts` is replaced by `dayPct(state: AppState)`; every call site (M0/M1/M2 — currently `Hero pct={...}` is the only consumer) must update to pass `state` instead of `state.blocks`.
- **SG-m3-11 — Bloom + chime + fireworks reduced-motion behavior.** Recommendation: bloom and fireworks are visuals → suppressed under `prefers-reduced-motion`. Chime is audio → still plays unless OS-muted (audio is not motion). Haptics still fire (haptics are not motion either; they're tactile).
- **SG-m3-12 — Audio asset for the chime.** Recommendation: ship a single small (< 30 KB) chime as a static asset under `public/sounds/chime.mp3`. Loaded on app boot via `new Audio()`. No external dependency. Mute respect: check `navigator.mediaSession` or fall back to a UA-mute check; M3 ships the simplest path (let the OS handle mute) and revisits in M7.
- **SG-m3-13 — Brick chip touch target during expanded block.** Recommendation: 44 px minimum height per ADR-031. Chips do not double-purpose as logging surfaces in M3 (tap = no-op until M4). M3 still keeps the tap target compliant so M4 doesn't have to resize.
- **SG-m3-14 — `<LooseBricksTray>` z-index relative to AddBrickSheet.** Recommendation: tray z-index < AddBrickSheet z-index. The sheet's full-screen overlay covers the tray. M2's `<AddBlockSheet>` already has the right z-index — reuse it.
- **SG-m3-15 — Brick add via tray when tray is collapsed.** Recommendation: the "+ Brick" pill is always present in the collapsed row (rightmost position, after any chips). User does NOT need to expand the tray to add a brick. Expand is only for browsing existing bricks.
- **SG-m3-16 — `Block.bricks` ordering in expanded view.** Recommendation: render in insertion order (the order they appear in `block.bricks[]`). M6 wires drag-reorder. Tests assert order matches array order.
- **SG-m3-17 — `<HeroRing>` SSR.** Recommendation: server renders the ring at `0%` (full empty arc). Client hydrates to actual day score with a 600 ms ease-in. This avoids hydration mismatch warnings even when the user has session state by the time of hydration. (Once M8 ships, persistence rehydrates state on mount — M3 has no persistence, so this is a forward-compatible default.)
- **SG-m3-18 — Stagger fade-in on new chip insert.** Recommendation: 30 ms between chips on first render of an expanded block; `0 ms` (no stagger) when adding ONE chip after the fact (single-element insert doesn't need a stagger sequence). Reduced-motion → instant in either case.

---

## Milestone 4a — Tick Brick Logging

> **Pillars:** § 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (visual identity — every tap is a brick laid), § 0.5 (interaction primitives — the simplest verb: a tick), § 0.9 (data model — `tick` brick is `done: boolean`), § 0.10 (haptics: every tap fires light), ADR-031 (44 px touch targets), ADR-039 (ships empty).

### Intent

Wire the simplest user-driven verb in the entire app: **tap a tick brick to mark it done.** This is the moment Dharma stops being a setup screen and starts being a tracker.

When the user taps a tick brick, four things happen on the same React tick:

1. The brick's `done` flag flips (`false ↔ true`).
2. The chip's foreground gradient animates from 0% → 100% (or back) via M0's `brickFill` token.
3. Every dependent score recomputes: that brick's `brickPct`, its containing block's `blockPct` (or the loose-brick aggregate), the day's `dayPct(state)`, and any `categoryDayPct` reads.
4. Every dependent visual updates: BrickChip fill, block scaffold left-bar height, HeroRing arc length, BlueprintBar segment opacity.

If the flip causes a block to cross to 100%, M3's wired `useCrossUpEffect` fires the bloom + chime for the first time from a real user gesture (M3 only fired it via state injection). If the flip causes the day to cross to 100%, the fireworks overlay plays.

**Goal and time bricks remain inert in M4a** (tap = no-op; chip displays as in M3). They get their verbs in M4b and M4c.

**What this is NOT:** goal stepper (M4b). Time timer (M4c). Block edit / delete (M5). Drag reorder (M6). Polish layer (M7). Persistence (M8). Calendar nav (M9). Voice (M10).

### Inputs

- The full M3 surface — top bar, hero with `<HeroRing>`, BlueprintBar with opacity modulation, 24-hour timeline with `<TimelineBlock>` cards (tap-to-expand wired, scaffold left-bar wired), `<LooseBricksTray>`, dock with `+`, `<AddBrickSheet>`, `<AddBlockSheet>`, `<EditModeProvider>`, `<SlotTapTargets>`, `<BrickChip>` (renders three kinds; tap = no-op in M3).
- M0 motion tokens — `brickFill` (600 ms easeInOut, M3 already wires it on `<BrickChip>` for chip foreground gradient).
- M0 haptics — `light` on each tick toggle, `success` on block 100% (already fires inside `useCrossUpEffect`), `notification` on day 100% (same).
- M0 audio — chime for block 100% and a longer chime for day 100% (M3 deferred the assets; M4a lands `public/sounds/chime.mp3`; see SG-m4a-04).
- The locked Brick / AppState / Action schemas from M3.
- `lib/celebrations.ts:useCrossUpEffect` — M3 ships this hook unchanged. M4a wires it to fire on real user gestures, not state injection.
- `lib/dharma.ts` — `brickPct` already returns 0 / 100 for tick bricks; no math change.

### Outputs (regions and behaviors)

| Region                       | Role in M4a                                                                                                                                                                                                                         | Sync with M3                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `<BrickChip>` (tick)         | Wraps the chip in a tap-surface (`<button>` or click-handler on the existing chip element). Tap fires `LOG_TICK_BRICK` action. Chip foreground gradient animates 0 ↔ 100 via M0 `brickFill`. ✓ / ☐ glyph swaps via the same render. | M3 chip element is preserved; only the tap target is added.    |
| `<BrickChip>` (goal, time)   | Tap = no-op (unchanged from M3). Cursor stays default.                                                                                                                                                                              | Untouched.                                                     |
| Block scaffold left-bar      | Height re-computes from `blockPct(block)` after every tick toggle. Animates via existing M3 transition (600 ms `height` tween).                                                                                                     | M3 path preserved; only the trigger (a real user tick) is new. |
| `<HeroRing>`                 | Stroke-dashoffset re-computes from `dayPct(state)` after every tick toggle. Animates via M3's existing 600 ms easeInOut.                                                                                                            | Same.                                                          |
| BlueprintBar segment opacity | Re-computes from `blockPct` on tick.                                                                                                                                                                                                | Same.                                                          |
| `bloom` celebration          | Fires when a block crosses to 100% from a real tick. Cross-down + cross-up retriggers per M3's one-shot rule.                                                                                                                       | M3 wired; M4a is the first real fire.                          |
| `fireworks` celebration      | Fires when the day crosses to 100% from a real tick.                                                                                                                                                                                | M3 wired; M4a is the first real fire.                          |
| Chime audio                  | M4a lands `public/sounds/chime.mp3` (≤ 30 KB). Loaded on app boot via `new Audio()`. Plays on block 100% (and day 100%, same asset). Mute-respecting per OS.                                                                        | M3 deferred this asset to M4 per SG-m3-12. M4a delivers it.    |

### Locked schema additions

```ts
// lib/data.ts — extend M3's Action union
type Action =
  | /* M2 + M3 actions */
  | { type: 'LOG_TICK_BRICK'; brickId: string };  // routes by id; flips `done` in place
```

The reducer locates the brick by `id` (search `state.blocks[*].bricks[]` then `state.looseBricks[]`), flips `done`, returns a new `AppState` (immutable update; no in-place mutation; existing M3 reducer pattern). `assertNever` exhaustiveness preserved.

### Edge cases

- **Reduced motion** — chip fill animation collapses to instant; block scaffold + HeroRing animations same; bloom + fireworks visual suppressed; chime + haptics still fire.
- **Tap during animation** — second tap registers immediately; reducer flips `done` again; the in-flight animation cancels and reverses (Framer Motion handles this natively).
- **Tap a tick brick with `categoryId: null`** — works the same; uncategorized fill uses category-of-parent or `--surface-2` fallback (matches M3's chip rendering).
- **Tap a tick brick inside a collapsed block** — block must be expanded for the chip to be visible (M3 collapses by default). Tap on a non-visible chip is impossible by definition.
- **Tap a tick brick inside the Loose Bricks tray when tray is collapsed** — chips are visible in the collapsed scroll row (per M3 SG-m3-15); tap works directly without expanding the tray.
- **Block at 99% pre-tick, single tick brick at 0%, user toggles to done** → block hits 100%, bloom fires once, day percentage updates.
- **Day at 99% pre-tick, single brick brings it to 100%** → fireworks fires once.
- **Untoggle from 100% back to 99%** → bloom does NOT replay until the block re-crosses up (one-shot per crossing per M3 SG-m3-05).
- **Audio fails to load** (offline, blocked) — celebration visuals still fire; chime silently skipped (try/catch around `audio.play()`).
- **Audio blocked by browser** (no user gesture yet) — first chime may be silent on iOS; subsequent chimes work (browser unlocks audio after first user gesture; M4a's first tick IS a user gesture so this is self-resolving by the second tick).
- **Page refresh after a tick** — state is lost (no persistence until M8). Same as M3.

### Acceptance criteria

**Tap-to-tick (the verb)**

1. The `<BrickChip>` for a `tick` brick is a tappable surface ≥ 44 px (ADR-031). Tap target spans the full chip, not just the glyph.
2. Tapping a `tick` brick with `done: false` dispatches `LOG_TICK_BRICK` with that brick's id; reducer flips `done` to `true`.
3. Tapping a `tick` brick with `done: true` flips it back to `false`. (Toggle, not one-way.)
4. The chip foreground gradient animates from 0% → 100% (on toggle to `done: true`) or 100% → 0% (on toggle to `false`) via M0 `brickFill` (600 ms easeInOut). Reduced-motion → instant.
5. The check glyph swaps from `☐` to `✓` (or back) on the same render tick as the toggle.
6. Haptic `light` fires on every tap.

**Goal and time bricks unchanged** 7. Tapping a `goal` brick chip → no-op. No reducer dispatch. No haptic. Chip rendering identical to M3. 8. Tapping a `time` brick chip → no-op. No reducer dispatch. No haptic. Chip rendering identical to M3.

**Cascading visuals** 9. After a tick toggle, the containing block's scaffold left-bar height updates to the new `blockPct`. Animates via M3's existing transition (600 ms). Reduced-motion → instant. 10. After a tick toggle, the BlueprintBar segment for the containing block updates opacity to `0.3 + ((newBlockPct / 100) × 0.7)`. Reduced-motion → instant. 11. After a tick toggle, the `<HeroRing>` stroke-dashoffset updates to reflect the new `dayPct(state)`. Animates over 600 ms. Reduced-motion → instant. 12. After a tick toggle, the hero numeral text node updates to `${Math.round(dayPct(state))}%` synchronously with the ring. 13. All four visual updates (chip / scaffold / BlueprintBar / HeroRing) reflect the same reducer state — no flash of stale percentages.

**Block 100% celebration (first real fire)** 14. When a tick toggle causes `blockPct(block)` to cross from `< 100` to `100`, M3's `useCrossUpEffect` fires the `bloom` spring on that block card (M0 `springConfigs.bloom = { stiffness: 220, damping: 22 }`). 15. On the same crossing, the chime audio plays (`new Audio('/sounds/chime.mp3').play()`; ≤ 30 KB asset). 16. On the same crossing, `success` haptic fires. 17. Crossing back below 100 (untoggle a tick) and re-crossing up fires the celebration again. One-shot per crossing.

**Day 100% celebration (first real fire)** 18. When a tick toggle causes `dayPct(state)` to cross from `< 100` to `100`, the fireworks overlay plays (~1.6 s; bounded particle count). 19. On the same crossing, `notification` haptic fires. 20. On the same crossing, the chime audio plays (same asset as block 100%). 21. Crossing back below 100 and re-crossing up fires fireworks again.

**Audio asset** 22. `public/sounds/chime.mp3` exists, ≤ 30 KB, single short tone. 23. Audio is loaded once on app boot via `new Audio()`. No re-fetch per play. 24. Audio failures (network, codec) are caught silently; visuals still fire.

**Reduced motion + a11y** 25. `prefers-reduced-motion: reduce` → chip fill, block scaffold, HeroRing animations all collapse to instant. Bloom and fireworks suppressed. 26. Reduced-motion does NOT suppress haptics or audio. 27. `<BrickChip>` for `tick` exposes its tap target via accessible name `"${name}, ${done ? 'done' : 'not done'}, tap to toggle"`. 28. `aria-pressed={done}` on the tick chip's tap surface (button semantics). 29. axe-core: zero violations on day view with all three brick kinds rendered. 30. Tab order: tick brick chips are reachable and tappable via keyboard (Enter or Space toggles).

**Quality** 31. `tsc --noEmit`: zero new errors. 32. ESLint: zero new errors. 33. Vitest: all existing tests still pass; new `LOG_TICK_BRICK` reducer tests + chip tap tests added. 34. Playwright: tap a tick brick → chip fills, scaffold grows, HeroRing arc grows, BlueprintBar opacity increases. Mobile viewport 430 px; no horizontal overflow.

### Out of scope (M4a)

- Goal +/- stepper — **M4b**
- Time timer (start / stop / pause / manual entry) — **M4c**
- Block edit / brick edit (rename, retype, retarget) — **M5**
- Block delete / brick delete with "Just today / All recurrences" — **M5**
- Drag reorder — **M6**
- FLIP block-expand magic — **M7**
- Persistence — **M8**
- Calendar nav — **M9**

### Open spec gaps (resolve at VERIFY)

- **SG-m4a-01 — Tap target shape.** Recommendation: wrap the existing `<BrickChip>` element in a `<button type="button">` for tick bricks ONLY; goal and time bricks keep the M3 non-interactive `<div>` element. Alternative: always render `<button>` and dispatch by `kind` inside the click handler (simpler but means goal/time chips have a dangling tap target that does nothing). Lean toward per-kind branching for cleaner semantics.
- **SG-m4a-02 — Chip element role.** Recommendation: `role="button"` + `aria-pressed={done}` on the tap surface for tick bricks. Screen readers announce "${name}, pressed/not pressed, button". Goal/time bricks keep their M3 `<div>` (no role).
- **SG-m4a-03 — Reducer placement.** Recommendation: extend `lib/data.ts` reducer with `LOG_TICK_BRICK` action; route by `brick.parentBlockId` is NOT needed (we already have the brick id; search both arrays). Pattern matches M3's `ADD_BRICK` routing.
- **SG-m4a-04 — Audio asset format + size.** Recommendation: MP3 (broad codec support), ≤ 30 KB, single short tone (~250 ms). Source from a royalty-free pack or generate via a tone generator. Final asset committed under `public/sounds/chime.mp3`.
- **SG-m4a-05 — Mute respect.** Recommendation: M4a does NOT implement explicit mute respect (no UI mute toggle). Browser/OS-level mute is honored automatically by `<audio>`. M7 polish layer can add a per-app mute toggle if needed.
- **SG-m4a-06 — First-tap audio unlock on iOS.** Recommendation: accept that the first chime may be silent on iOS Safari (browser audio unlock requirement); the M4a first tick IS a user gesture, which unlocks audio for the rest of the session. Document in CHANGELOG.
- **SG-m4a-07 — Test for cross-up firing.** Recommendation: Vitest tests use `useCrossUpEffect`'s state-injection seam (already shipped in M3); Playwright tests assert the celebration class lands on the DOM after a tick that brings block to 100%.
- **SG-m4a-08 — Chip animation direction on untoggle.** Recommendation: the `brickFill` token animates symmetrically — toggle to `true` plays 0 → 100; toggle to `false` plays 100 → 0. No special-case for "undo" gesture.

---

## Milestone 4b — Goal Brick Stepper

> **Pillars:** § 0.1, § 0.3, § 0.5 (the second verb: a quantitative count), § 0.9 (data model — `goal` brick is `count + target + unit`), § 0.10 (haptic on every increment / decrement), ADR-031 (44 px), ADR-039 (ships empty). Builds on M4a.

### Intent

Wire the **second** user-driven verb: **tap +/- on a goal brick to increment or decrement its count.** Long-press accelerates (~50 ms intervals after the first tick).

When the user taps + or - on a goal brick:

1. The brick's `count` changes (clamped to `[0, target]` — count cannot exceed target; can drop to zero).
2. The chip's foreground gradient width = `(count / target) × 100%` animates via `brickFill` (600 ms easeInOut).
3. The numeric badge `count / target unit` updates synchronously.
4. All M4a cascade visuals (block scaffold, HeroRing, BlueprintBar) update on the same tick.
5. Block / day 100% celebrations fire on cross-up via the same M3 `useCrossUpEffect` hook M4a uses.

Tick bricks (M4a) and time bricks (M4c) remain unchanged.

**What this is NOT:** time timer (M4c). Editing the brick's `target` or `unit` (M5). Brick delete (M5).

### Inputs

- The full M4a surface — tick bricks tappable, chime asset shipped, all cascade visuals proven.
- M0 haptics — `light` on each tick / detent.
- M0 motion — `brickFill` (existing).
- The locked Brick / AppState / Action schemas from M3 + M4a.
- `lib/celebrations.ts:useCrossUpEffect` (M3, used in M4a).
- `lib/dharma.ts:brickPct` for goal — already returns `min(count / target, 1) × 100`; no math change.

### Outputs (regions and behaviors)

| Region                     | Role in M4b                                                                                                                                                                                                                                                                                                                                  | Sync with M4a                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `<BrickChip>` (goal)       | Renders inline `−` and `+` `<button>` controls flanking the badge. Each ≥ 44 px tap target (may stack vertically on narrow screens). Tap dispatches `LOG_GOAL_BRICK` with `delta: -1 \| +1`. Long-press (≥ 500 ms hold) starts auto-repeat at ~50 ms intervals; release stops. Chip foreground gradient width animates per `count / target`. | M4a chip element is preserved; controls are added. Tick chips unchanged. |
| `<BrickChip>` (tick, time) | Unchanged from M4a.                                                                                                                                                                                                                                                                                                                          | Same.                                                                    |
| Cascade visuals            | All update per `blockPct` recompute, same as M4a.                                                                                                                                                                                                                                                                                            | Same.                                                                    |
| Celebrations               | Block/day 100% bloom + chime + fireworks fire when a goal stepper push crosses the relevant percentage.                                                                                                                                                                                                                                      | Same hook, additional trigger source.                                    |

### Locked schema additions

```ts
// lib/data.ts — extend the Action union
type Action =
  | /* M2 + M3 + M4a actions */
  | { type: 'LOG_GOAL_BRICK'; brickId: string; delta: 1 | -1 };
```

Reducer applies `delta` to `count`, clamps to `[0, target]`, returns a new `AppState`. `assertNever` preserved.

### Edge cases

- **Tap + at `count === target`** → no-op (clamp). Haptic fires `medium` (a "you've hit the cap" cue, distinct from `light`). Chip stays at 100% gradient.
- **Tap - at `count === 0`** → no-op. Haptic fires `medium` (same cap cue).
- **Long-press at `count === target - 1`** → first auto-repeat tick brings count to `target`; subsequent ticks no-op (clamped). Auto-repeat stops naturally on cap (no infinite tick stream).
- **Long-press release** → auto-repeat stops within one frame.
- **Reduced motion** — chip fill animation collapses to instant; long-press visual feedback (cursor pulse, etc.) suppressed; haptics + audio unaffected.
- **`unit` is empty string** — badge renders just `count / target` with no unit suffix. (M3 SG already covered this; spec just notes the M4b behavior is identical.)
- **Cross to 100% on a single tap** (count was target - 1, tap +) → bloom + chime fire.
- **Cross down from 100% via tap -** → no replay-suppression issue; cross-up rule is one-shot per crossing.

### Acceptance criteria

**Stepper UI**

1. Goal `<BrickChip>` renders `−` and `+` `<button>` controls. Each ≥ 44 px tap target.
2. Controls are positioned so they don't overlap the chip badge or fill gradient at 430 px viewport.
3. `−` is disabled (visually + `disabled` attribute) when `count === 0`. `+` is disabled when `count === target`.

**Increment / decrement** 4. Tap `+` dispatches `LOG_GOAL_BRICK` with `delta: 1`; reducer increments `count` by 1, clamped to `target`. 5. Tap `−` dispatches `LOG_GOAL_BRICK` with `delta: -1`; reducer decrements `count` by 1, clamped to 0. 6. Chip foreground gradient width animates to `(count / target) × 100%` via `brickFill` (600 ms easeInOut). Reduced-motion → instant. 7. Badge text updates to `${count} / ${target}${unit ? ' ' + unit : ''}` synchronously. 8. Haptic `light` fires on every successful (non-clamped) tick. 9. Haptic `medium` fires when a tap is rejected by the clamp (already at cap).

**Long-press auto-repeat** 10. Press-and-hold `+` for ≥ 500 ms triggers auto-repeat at ~50 ms intervals. 11. Auto-repeat stops on release OR on hitting `count === target`. 12. Same applies to `−` (auto-repeats down to `count === 0`). 13. Each auto-repeat tick fires `light` haptic; clamp tick fires `medium`.

**Cascading visuals + celebrations** 14. Same as M4a's tick cascade — chip / scaffold / BlueprintBar / HeroRing all update on the same render tick. 15. Block 100% celebration fires when a stepper push (single tap or auto-repeat tick) brings `blockPct` to 100 from `< 100`. Bloom + chime + `success` haptic. 16. Day 100% celebration fires when a stepper push brings `dayPct` to 100. Fireworks + chime + `notification` haptic. 17. Cross-down + re-cross-up replays the celebration.

**Tick + time bricks unchanged** 18. Tick bricks render and behave identically to M4a. 19. Time bricks render identically to M3 (still inert; their verb arrives in M4c).

**Reduced motion + a11y** 20. Reduced-motion → fill animation instant; long-press visual feedback suppressed. 21. `−` and `+` buttons have accessible names `"Decrease ${name}"` and `"Increase ${name}"`. 22. Each button is keyboard-focusable; Enter/Space triggers the same dispatch as a tap. 23. axe-core: zero violations.

**Quality** 24. `tsc --noEmit`: zero new errors. 25. ESLint: zero new errors. 26. Vitest: reducer tests for `LOG_GOAL_BRICK` (increment, decrement, clamp top, clamp bottom). Chip tests (controls render, disabled state, dispatch on tap, long-press auto-repeat). 27. Playwright: tap + on a goal brick → chip fills, badge updates; long-press → auto-repeat ticks ~50 ms apart; cross to target fires bloom; mobile viewport 430 px; no overflow.

### Out of scope (M4b)

- Time timer (start / stop / manual entry) — **M4c**
- Manual `count` entry (e.g. type "50 reps" directly) — **M5 polish or M7**
- Brick edit (rename, retype, retarget) — **M5**
- Brick delete — **M5**

### Open spec gaps (resolve at VERIFY)

- **SG-m4b-01 — Stepper position.** Recommendation: `−` on the left edge of the chip (after the title), `+` on the right edge (before the badge), badge centered. Alternative: both on the right side stacked. Lean toward flanking layout for clearer "decrement / increment" mental model.
- **SG-m4b-02 — Long-press threshold.** Recommendation: 500 ms hold to trigger auto-repeat; auto-repeat interval 50 ms. Both round numbers; can tune in M7 polish.
- **SG-m4b-03 — Long-press visual feedback.** Recommendation: subtle button-press scale (0.95 → 1.0) on each auto-repeat tick. Reduced-motion → none. Skippable feature; if it adds complexity, drop and add in M7.
- **SG-m4b-04 — Reducer delta granularity.** Recommendation: `delta: 1 | -1` only. No "set count directly" action in M4b. (M5 may add `SET_BRICK_COUNT` for edit-mode manual entry.)
- **SG-m4b-05 — Clamp haptic.** Recommendation: `medium` (heavier than `light` so the user feels "blocked"). Distinct from `light` (normal tick) and from `success` (block-100% celebration).

---

## Milestone 4c — Time Brick Timer

> **Pillars:** § 0.1, § 0.3, § 0.5 (the third verb: time elapsed against a target), § 0.9 (data model — `time` brick is `minutesDone + durationMin`), § 0.10 (haptics: light on start/stop, success on complete), ADR-031 (44 px), ADR-039 (ships empty). Completes the M4 brick-logging trilogy.

### Intent

Wire the **third and final** user-driven verb: **tap a time brick to start its timer; tap again to stop.** A long-press opens a manual entry sheet for direct minute input.

When the timer is running:

1. `minutesDone` increments at a rate of 1 per real-world minute (computed from `Date.now()` deltas in a `useEffect` interval).
2. The chip's foreground gradient width = `(minutesDone / durationMin) × 100%`, animated continuously (re-render every 1 s minimum, 5 s for battery efficiency, see SG-m4c-04).
3. The chip's ▶/⏸ glyph reflects timer state.
4. Block scaffold, HeroRing, BlueprintBar all update on the second tick (debounced; see SG-m4c-04).
5. Block / day 100% celebrations fire on cross-up via M3's `useCrossUpEffect`.

The timer **continues running when the parent block collapses** (per phase1plan.md M4 — "Timer continues running when block collapses"). Only one timer can be running at a time across the entire app. Starting a new timer auto-stops any other running timer.

Tick bricks (M4a) and goal bricks (M4b) remain unchanged.

**What this is NOT:** background-tab timer accuracy (timers pause when the tab is backgrounded — M7 polish may revisit). Multiple concurrent timers (intentionally one-at-a-time per § 0.5). Manual minute editing inside an already-running timer (M5).

### Inputs

- The full M4a + M4b surface — tick logging, goal stepper, chime asset, all cascade visuals, all celebration triggers.
- M0 haptics — `light` on start/stop, `success` on block 100%, `notification` on day 100%.
- M0 motion — `brickFill` (existing).
- The locked Brick / AppState / Action schemas from M3 + M4a + M4b.
- `lib/celebrations.ts:useCrossUpEffect`.
- `lib/dharma.ts:brickPct` for time — already `min(minutesDone / durationMin, 1) × 100`.
- A new `lib/timer.ts` module — owns the `setInterval` lifecycle and `Date.now()` accumulation. One module-level interval; one running brick id at a time.

### Outputs (regions and behaviors)

| Region                       | Role in M4c                                                                                                                                                                                                                                                           | Sync with M4b                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `<BrickChip>` (time)         | Tappable surface (whole chip). Tap dispatches `START_TIMER` (or `STOP_TIMER` if this brick is the running one). ▶ when stopped, ⏸ + subtle pulse when running. Badge: `${minutesDone} / ${durationMin} m`. Long-press (≥ 500 ms hold) opens a manual-entry `<Sheet>`. | M4a/M4b chips unchanged. Time chip gets a tap target. |
| `<TimerSheet>` (new, simple) | Bottom-sheet with a single number input (minutes), Save, Cancel. Pre-filled with current `minutesDone`. Save dispatches `SET_TIMER_MINUTES` with the new value (clamped to `[0, durationMin]`).                                                                       | M0 `<Sheet>` reused.                                  |
| Cascade visuals              | Update on each tick of the running timer (1 s effective; 5 s in batched mode per SG-m4c-04). Animates as M4a/M4b.                                                                                                                                                     | Same.                                                 |
| Celebrations                 | Same as M4a/M4b.                                                                                                                                                                                                                                                      | Same.                                                 |
| `lib/timer.ts`               | Owns the single `setInterval` (1 s ticks). Tracks `runningBrickId`, `startedAt`, accumulated `minutesDone`. On every tick, dispatches `TICK_TIMER` action. On Stop, captures final `minutesDone`.                                                                     | New file.                                             |

### Locked schema additions

```ts
// lib/data.ts — extend the Action union
type Action =
  | /* M2 + M3 + M4a + M4b actions */
  | { type: 'START_TIMER'; brickId: string }       // also stops any other running timer
  | { type: 'STOP_TIMER'; brickId: string }
  | { type: 'TICK_TIMER'; brickId: string; minutesDone: number }  // dispatched by lib/timer.ts on each setInterval tick
  | { type: 'SET_TIMER_MINUTES'; brickId: string; minutes: number };  // long-press manual entry

// AppState extension — track which brick is running (single timer invariant)
type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  runningTimerBrickId: string | null;  // null = no timer running
};
```

### Edge cases

- **Tap a time brick that's currently running** → `STOP_TIMER`. Final `minutesDone` is captured (rounded to nearest minute or floored — see SG-m4c-03). `runningTimerBrickId` set to `null`.
- **Tap a time brick when another timer is running** → `START_TIMER` for the new brick. Reducer auto-stops the old one (captures its final `minutesDone`) and sets the new id as running.
- **Timer reaches `durationMin`** → continues counting (`minutesDone` exceeds `durationMin` is allowed in state but `brickPct` clamps to 100). Block 100% celebration fires once on cross-up. User can stop to "lock in" or keep running for over-target tracking.
- **Tab backgrounded** — `setInterval` is throttled by the browser to ~1 s minimum (Chrome) or pauses entirely (Safari). On tab-foreground, recompute elapsed via `Date.now() - startedAt` to recover accurate elapsed time. Document: "Timers stay accurate across tab-background within a session, but page refresh loses everything (M8 fixes that)."
- **Reduced motion** — chip pulse animation suppressed; gradient animation collapses to per-tick (no smooth interpolation between ticks).
- **Long-press on running timer** — opens TimerSheet. User can manually set minutes (clamped). Save updates `minutesDone` and resumes the timer from the new value (timer keeps running). Cancel discards.
- **Manual entry exceeds `durationMin`** → clamp to `durationMin`. Haptic `medium` (cap cue, matching M4b).
- **Page refresh while timer running** — state lost (no persistence until M8). Documented limitation; M8 will persist `runningTimerBrickId` + a `startedAt` timestamp.

### Acceptance criteria

**Tap-to-start / tap-to-stop**

1. Tapping a time brick chip (whole surface, ≥ 44 px) dispatches `START_TIMER` with that brick's id when the brick is not running.
2. Tapping a running time brick chip dispatches `STOP_TIMER` with that brick's id.
3. `START_TIMER` reducer sets `state.runningTimerBrickId = brickId`. If another brick was running, reducer also implicitly stops it (sets `state.runningTimerBrickId = brickId`; no separate STOP for the old brick is needed because the invariant is single-running).
4. `STOP_TIMER` reducer sets `state.runningTimerBrickId = null`.

**Timer lifecycle** 5. `lib/timer.ts` runs a single `setInterval` (1 s tick) when `state.runningTimerBrickId !== null`. Stops the interval when `runningTimerBrickId === null`. 6. Each tick dispatches `TICK_TIMER` with the brick id and the new `minutesDone` (computed as `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`). 7. `TICK_TIMER` reducer updates the brick's `minutesDone` to the new value. 8. The chip foreground gradient width updates to `(minutesDone / durationMin) × 100%` on each render. Reduced-motion → fill jumps per tick rather than animating; default → smooth via `brickFill`. 9. The badge text updates to `${minutesDone} / ${durationMin} m`. Glyph: ▶ when stopped; ⏸ + subtle scale-pulse when running (suppressed under reduced-motion). 10. Haptic `light` fires on Start; `light` fires on Stop.

**Single-timer invariant** 11. Starting timer B while timer A is running auto-stops A (A's final `minutesDone` is preserved at the value captured by the last `TICK_TIMER`). 12. After the auto-stop, A's chip glyph reverts to ▶; B's becomes ⏸.

**Manual-entry sheet (long-press)** 13. Long-press (≥ 500 ms) on a time brick chip opens `<TimerSheet>`. 14. Sheet has a number input pre-filled with the current `minutesDone` and Save / Cancel buttons. 15. Save dispatches `SET_TIMER_MINUTES` with the new value, clamped to `[0, durationMin]`. 16. If the brick was running, it stays running after Save (the new `minutesDone` becomes the new floor; timer continues accumulating from there). 17. Cancel closes the sheet without dispatching. 18. Manual entry > `durationMin` → clamps + `medium` haptic.

**Cascading visuals + celebrations** 19. Block scaffold, BlueprintBar, HeroRing, hero numeral all update on each `TICK_TIMER` (1 s cadence). 20. When a tick crosses `blockPct` to 100, bloom + chime + `success` haptic fire (one-shot per crossing). 21. When a tick crosses `dayPct` to 100, fireworks + chime + `notification` haptic fire.

**Block-collapse independence** 22. Starting a timer, then collapsing the parent block, does NOT stop the timer. `lib/timer.ts` is unaware of expand/collapse state. 23. Re-expanding the block shows the chip with the latest accumulated `minutesDone`.

**Tab-background recovery** 24. After the tab is backgrounded for ≥ 60 s (browser throttles `setInterval`), foregrounding the tab recomputes `minutesDone` from `Date.now() - startedAt + initialMinutesDone` so the displayed value is accurate. (Implemented as a `visibilitychange` listener that dispatches a one-off `TICK_TIMER` with the corrected value.)

**Tick + goal bricks unchanged** 25. Tick bricks behave identically to M4a. 26. Goal bricks behave identically to M4b.

**Reduced motion + a11y** 27. Chip pulse-while-running animation suppressed under `prefers-reduced-motion`. 28. Time brick chip exposes accessible name `"${name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`. 29. `aria-pressed={running}` on the tap surface. 30. axe-core: zero violations.

**Quality** 31. `tsc --noEmit`: zero new errors. 32. ESLint: zero new errors. 33. Vitest: reducer tests for `START_TIMER` (incl. auto-stop of prior running), `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`. `lib/timer.ts` lifecycle tests via fake timers. 34. Playwright: tap a time brick → glyph becomes ⏸, chip pulses, badge updates over time; collapse the block → timer keeps running (verify via 5 s wait + re-expand); start a second timer → first auto-stops; manual entry via long-press → minutes update.

### Out of scope (M4c)

- Page-refresh timer recovery — **M8** (needs persistence)
- Multiple concurrent timers — **never** (intentional, single-timer invariant)
- Pomodoro / interval pattern — **never (or M10+)**
- Timer-driven notifications outside the app — **never (or M10+)**
- Manual minute editing while NOT running (i.e. inline +/- like the goal stepper) — **M5** (edit mode)

### Open spec gaps (resolve at VERIFY)

- **SG-m4c-01 — `lib/timer.ts` shape.** Recommendation: a single module-level `useTimer()` React hook + an interval driven by a `useEffect` watching `state.runningTimerBrickId`. The hook lives in the root layout (or BuildingClient) so it doesn't unmount when blocks collapse. Alternative: a Zustand-style external store. Lean toward the simpler hook-in-root approach.
- **SG-m4c-02 — Tick cadence vs render cost.** Recommendation: 1 s tick interval. If render profiling shows jank, batch to dispatching `TICK_TIMER` every 5 s while still tracking accurate elapsed via `Date.now()` (display can update via local component state for the visual at 1 s; reducer state at 5 s). M4c ships 1 s by default; revisit in M7 if needed.
- **SG-m4c-03 — Rounding when stopping.** Recommendation: capture `minutesDone` as `floor((Date.now() - startedAt) / 60000) + initialMinutesDone`. Don't round up — only "completed" minutes count. Alternative: round to nearest. Lean toward `floor` for accuracy and to avoid premature 100% celebrations.
- **SG-m4c-04 — Battery / power efficiency.** Recommendation: 1 s tick is acceptable for foreground; browser throttles when backgrounded. M4c does NOT implement explicit battery-aware logic. M7 polish can add `requestAnimationFrame`-based smoother visuals or longer ticks.
- **SG-m4c-05 — Single-timer invariant enforcement.** Recommendation: enforce in the reducer (`START_TIMER` always sets `runningTimerBrickId`, never appends to a list). UI never tries to display two ⏸ glyphs at once because `running` is derived from `state.runningTimerBrickId === brick.id`.
- **SG-m4c-06 — Manual-entry sheet location.** Recommendation: bottom sheet via M0 `<Sheet>`, single number input, Save/Cancel. Mirrors AddBrickSheet's view-toggle pattern but simpler (one view, one field).
- **SG-m4c-07 — Long-press conflict with tap-to-start.** Recommendation: `pointerdown` starts a 500 ms timer; if `pointerup` fires before 500 ms, treat as tap (start/stop); if 500 ms elapses without `pointerup`, treat as long-press (open sheet, cancel the tap). Standard long-press pattern.
- **SG-m4c-08 — Tab-background recovery.** Recommendation: `visibilitychange` listener in `lib/timer.ts` dispatches a corrective `TICK_TIMER` on `visibilitychange === 'visible'` events when a timer is running.

## Milestone 4d — Add chooser (Block or Brick)

> **Pillars:** § 0.1, § 0.5 (atomic add), § 0.14 antipattern 1 (a single atomic action probably IS a brick — open the path), ADR-031 (44 px), ADR-039 (ships empty). **Resolves SG-m3-08 in favor of a chooser.** First chance to add a Brick from the literal-empty state.

### Intent

Today, the only path to add a Brick is the "+ Brick" pill inside `<LooseBricksTray>`. The tray only renders when at least one Block or one Brick already exists (per M3 AC #5). In the literal-empty state the user cannot reach a Brick at all — their only option is to lay a Block first.

Gate #2 on M4b surfaced this: the user tapped the dock `+` and tapped time slots and got AddBlockSheet every time. They could not find a Brick path.

M4d inserts a small chooser bottom-sheet between the entry point and the existing Add\* sheets:

- Tap the dock `+` → chooser opens → **Block** routes to `<AddBlockSheet>` · **Brick** routes to `<AddBrickSheet>` with `parentBlockId: null`.
- Tap any empty time slot → chooser opens with the slot's hour pre-captured → **Block** routes to `<AddBlockSheet>` with `defaultStart` set to the tapped hour · **Brick** routes to `<AddBrickSheet>` with `parentBlockId: null` (the slot's hour is discarded for the Brick path — bricks are time-agnostic).
- The "+ Add brick" button **inside** an expanded block is unchanged (already routes straight to AddBrickSheet with a real `parentBlockId`).
- The "+ Brick" pill **inside** `<LooseBricksTray>` is unchanged (already routes straight to AddBrickSheet with `parentBlockId: null`).

The chooser is a thin routing surface, not a new form. It owns no fields, no validation, no category — it just picks which downstream sheet to open and forwards the entry-point context (hour, parent) appropriately.

**What this is NOT:** changing AddBlockSheet or AddBrickSheet themselves; adding a third option (e.g. "Add Category"); a long-press-only menu; an inline popover. The pencil and gear icons in the top bar remain stubs (separate concern, M5/M6).

### Inputs

- The full M4c surface (or M4b if M4d ships first) — `<BuildingClient>`, `<BottomBar>`, `<Timeline>` with `<SlotTapTargets>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<LooseBricksTray>`.
- M0 primitives — `<Sheet>` (reused), `<Button>` (two large primary buttons inside the chooser).
- M0 motion — `modalIn` / `modalOut` (chooser uses the same Sheet shell, same animation).
- M0 haptics — `light` on each chooser button tap (matches every other primary tap in the app).

### Outputs (regions and behaviors)

| Region                              | Role in M4d                                                                                                                                                                                                                                                                             | Sync with prior milestones                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `<AddChooserSheet>` (NEW)           | Bottom-sheet on M0 `<Sheet>`. Body: two large stacked `<Button>`s — "Add Block" (primary amber) and "Add Brick" (secondary). Cancel = `<X>` top-left. No form fields. Tapping a button closes the chooser and opens the corresponding downstream sheet, forwarding entry-point context. | New component. Reuses `<Sheet>` shell + animation tokens.                                                               |
| `<BuildingClient>` (CHANGED)        | New chooser state (`open: boolean`, `defaultStart: string \| null`). `<BottomBar onAddPress>` and `<Timeline onSlotTap>` now open the chooser instead of opening AddBlockSheet directly.                                                                                                | M2/M3 routing replaced for the dock + slot paths only. The other two add paths (inside-block, tray) bypass the chooser. |
| `<AddBlockSheet>`                   | Unchanged.                                                                                                                                                                                                                                                                              | —                                                                                                                       |
| `<AddBrickSheet>`                   | Unchanged. Receives `parentBlockId: null` and no category pre-fill when invoked via the chooser (matches the tray path).                                                                                                                                                                | —                                                                                                                       |
| `<LooseBricksTray>` "+ Brick" pill  | Unchanged — still bypasses the chooser and goes straight to AddBrickSheet.                                                                                                                                                                                                              | M3 path preserved.                                                                                                      |
| Expanded block "+ Add brick" button | Unchanged — still bypasses the chooser and goes straight to AddBrickSheet with the real `parentBlockId`.                                                                                                                                                                                | M3 path preserved.                                                                                                      |

### Edge cases

- **Chooser open + user taps backdrop or swipes down** → silent dismiss (no downstream sheet opens). Matches M2/M3 sheet UX.
- **Chooser open + user taps "Add Block" then immediately backgrounds the tab** → no bug; AddBlockSheet opens on resume; chooser is already closed.
- **Slot tap captures hour `H`; user picks "Add Brick"** → AddBrickSheet opens with `parentBlockId: null` and no time/hour context (bricks have no `start`). The captured `H` is discarded.
- **Dock + tap (no hour context)** → chooser opens; if user picks "Add Block", AddBlockSheet uses its current default-start logic (rounded current hour, M2 behavior).
- **Reduced motion** → chooser sheet animation collapses to instant (M0 `modalIn` already respects `prefers-reduced-motion`; reuse).
- **Chooser fired from a slot tap inside an existing block's vertical extent** → does NOT happen in M4d; SlotTapTargets only fire on empty slots (M2 behavior preserved).
- **Two rapid taps on dock +** → second tap is swallowed by the open chooser's backdrop or no-ops while sheet is mounting (debounce via the `open` state guard, M2 pattern).
- **Keyboard:** chooser opens with focus trapped inside it; Tab cycles `Add Block` → `Add Brick` → `Cancel`; Enter/Space activates.

### Acceptance criteria

**Routing — dock +**

1. Tapping the dock `+` (`<BottomBar onAddPress>`) opens `<AddChooserSheet>` (NOT `<AddBlockSheet>` directly).
2. Inside the chooser, tapping "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` set to the rounded current hour (M2's existing logic). Haptic `light` fires on tap.
3. Inside the chooser, tapping "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null` and no category pre-fill (matches the tray path). Haptic `light` fires on tap.
4. Tapping the chooser's `<X>` Cancel closes the chooser. No downstream sheet opens.

**Routing — slot tap** 5. Tapping any empty hour slot in `<Timeline>` opens `<AddChooserSheet>` (NOT `<AddBlockSheet>` directly), and the chooser captures the tapped hour. 6. Inside the chooser, tapping "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` set to the captured hour. 7. Inside the chooser, tapping "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null` (the captured hour is discarded — bricks are time-agnostic).

**Other add paths preserved** 8. The "+ Add brick" button inside an expanded block opens `<AddBrickSheet>` directly (no chooser). `parentBlockId` is the block's id; `categoryId` pre-fills to the block's category. 9. The "+ Brick" pill inside `<LooseBricksTray>` opens `<AddBrickSheet>` directly (no chooser). `parentBlockId: null`; no category pre-fill.

**Empty state — first brick** 10. From the literal-empty state (no blocks, no loose bricks, tray hidden), tapping the dock `+` → chooser → "Add Brick" → AddBrickSheet → Save → the new brick appears in `<LooseBricksTray>` (the tray now renders because `state.looseBricks.length > 0`). The empty-state card unmounts. 11. From the literal-empty state, tapping a slot → chooser → "Add Brick" → Save → same outcome as #10 (the chooser correctly discards the hour for the Brick path).

**Sheet UX** 12. Chooser uses M0 `<Sheet>` with `modalIn` / `modalOut` animations. 13. Backdrop tap dismisses the chooser silently. 14. Swipe-down on iOS Safari dismisses silently (M2 SG-m2-06 pattern). 15. Two large `<Button>`s stacked vertically: "Add Block" (primary amber, top), "Add Brick" (secondary, below). Each ≥ 44 px tall. Spacing per M0 tokens.

**Schema** 16. No reducer, action, or AppState changes. M4d is purely UI routing. No new persistence.

**Reduced motion + a11y** 17. Reduced motion: chooser slide-in collapses to instant (inherited from `<Sheet>`). 18. Chooser has `role="dialog"`, `aria-label="Add"`, focus trap. 19. Each button has `aria-label="Add Block"` / `aria-label="Add Brick"` (label = visible text). 20. Tab order: Add Block → Add Brick → Cancel. Enter/Space activates. 21. axe-core: zero violations on the open chooser.

**Quality** 22. `tsc --noEmit`: zero new errors. 23. ESLint: zero new errors. 24. Vitest: component test for `<AddChooserSheet>` (renders two buttons, dispatches the right callback, Cancel closes); integration test in `<BuildingClient>` (dock + → chooser opens; choosing Block opens AddBlockSheet; choosing Brick opens AddBrickSheet with `parentBlockId: null`); regression tests for M3 add paths (inside-block + tray pill still bypass the chooser). 25. Playwright (deferred-to-preview, M4a/M4b pattern): full empty-state path → chooser → Add Brick → save → tray renders the new chip; slot-tap → chooser → Add Block path verifies `defaultStart` matches the tapped hour.

### Out of scope (M4d)

- Pencil / gear icons in TopBar — **M5 (edit mode) / M6 (settings)** respectively.
- A third chooser option (e.g. "Add Category" outside an Add\* form) — **never (categories are created inline inside the existing forms)**.
- Long-press behavior on the dock `+` or slots — **never**.
- Inline popover / contextual menu instead of a sheet — **never (sheet is the M0 primitive for choices)**.
- Changing AddBlockSheet's or AddBrickSheet's internal layout — **never (this is a routing-only change)**.
- Pre-filling the Brick form's start time from a slot tap — **never (bricks are time-agnostic per § 0.5; if the user wants a timed thing they pick Block)**.

### Open spec gaps (resolve at VERIFY)

- **SG-m4d-01 — Chooser visual hierarchy.** Recommendation: "Add Block" is primary amber (matches the dock `+` legacy verb); "Add Brick" is secondary outline (visually distinct so the user understands the difference). Trade-off: making them visually equal could be more honest about the equal weight of the two paths. Lean toward primary/secondary because Block is still the more frequent action in current usage data (no actual data; assumption — revisit M7).
- **SG-m4d-02 — Chooser title / copy.** Recommendation: title `"Add"`. Body: just the two buttons, no help text. Trade-off: a one-line subtitle ("Pick what you want to add") could be friendlier. Lean toward no subtitle to keep the surface minimal and one-tap-deep.
- **SG-m4d-03 — `<SlotTapTargets>` hour capture into the chooser.** Recommendation: store the captured hour in `<BuildingClient>`'s chooser state (`chooserState: { open, defaultStart: string | null }`). When "Add Block" is chosen, pass `defaultStart` to AddBlockSheet; when "Add Brick" is chosen, ignore. Alternative: pass the hour as a prop directly to the chooser. Lean toward state-in-BuildingClient because the chooser is already a single-instance Sheet and state-per-feature is the M2/M3 pattern.
- **SG-m4d-04 — Backwards-compat with M2/M3 tests.** Recommendation: M2's "tap dock + → AddBlockSheet opens" test must be updated to "tap dock + → chooser opens → tap Add Block → AddBlockSheet opens". Same for M2 slot-tap tests. This is a test-refactor cost paid in M4d's TESTS phase.
- **SG-m4d-05 — Order of M4d vs M4c.** Recommendation: ship M4d FIRST (it unblocks Gate #2 from preview), then M4c (time timer). M4c assumes a brick exists; M4d makes the brick reachable from empty state. Without M4d, the user has to lay a Block they don't want before they can lay a Brick.

## Milestone 4e — Brick duration + overlap engine

> **Pillars:** § 0.5 (interaction primitives — three score types stay; **duration becomes a universal orthogonal axis**), § 0.6 (spatial timeline — bricks with duration now land on hour rows like blocks), § 0.9 (data model — `Brick` extended with optional time fields; `Block` shape unchanged), § 0.14 (no factory anything — toggle default OFF preserves current behavior), ADR-006 (half-open `[start, end)` intervals — overlap math uses this), ADR-019 (`Recurrence` discriminated union — now applies to bricks too), **ADR-042 (NEW, softens ADR-034: bricks optionally timed via toggle)**.

### Intent

Today every block has a start/end window on the timeline; every brick is time-agnostic and lives inside its parent block's window OR in the Loose Bricks tray with no time at all (per ADR-034). The user's mental model has shifted: **duration is a universal time-window axis that applies to any task** (block or brick), and **score type (tick / goal / time) is an orthogonal performance axis** measuring how the user performs inside that window. The two dimensions are independent and both true of every brick.

M4e adds an opt-in **duration toggle** to every brick. When OFF (default), the brick behaves exactly as it does today — nested bricks share their parent block's window visually, loose bricks stay timeless in the tray. When ON, the brick reveals the same time-window contract that blocks have: required Start, required End, and a Recurrence picker (the existing 4-variant union — Just today / Every weekday / Every day / Custom range). The toggle works identically for tick, goal, and time bricks. For time bricks specifically, the new `start`/`end` is the **allocated window**; the existing `durationMin` remains the **timer target inside that window** (untouched from M4c).

M4e also lands an **overlap engine** that detects time-window collisions across three pairs simultaneously — block↔block, brick↔block (when brick has duration ON), and brick↔brick (when both have duration ON). The engine surfaces collisions live in `<AddBlockSheet>` and `<AddBrickSheet>` as a warning chip (`"⚠ overlaps with [Block: Morning Run, 6:00–6:40]"`) and **disables Save until the user resolves the conflict**. Block↔block detection is retroactively added to AddBlockSheet (M2 ships today with no overlap check at all).

Loose bricks with duration ON land on the timeline at their `start` row, rendered identically to blocks (same scale, same drag affordance, same hour anchoring) — making the "duration is universal" mental model literal: anything with a duration occupies a timeline slot.

**What this is NOT:** changing the M4a/M4b/M4c score-type logic (tick / goal / time reducer arms untouched); changing `durationMin` semantics (M4c timer math preserved); adding edit/delete on existing bricks (M5); persisting state (M8); resolving recurrence against arbitrary dates (M9 — `appliesOn` resolver; M4e only stores recurrence and only renders today); a new add chooser (M4d already handles routing); a drag-to-reschedule affordance on the timeline (M5/M7); moving nested bricks onto timeline rows (they stay inside their parent block card regardless of duration toggle — only loose bricks promote).

### Inputs

- The full M4d surface — `<BuildingClient>`, `<BottomBar>`, `<Timeline>` with `<SlotTapTargets>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<AddChooserSheet>`, `<LooseBricksTray>`, `<BrickChip>` (tick + goal + time variants).
- M0 primitives — `<Sheet>`, `<Input>` (text + time), `<Chip>` (recurrence picker, weekday picker), `<Button>` (Save / Cancel), and a new `<Toggle>` (or `<Switch>`) primitive **introduced in M4e** for the duration on/off control. If `<Toggle>` doesn't exist as an M0 primitive, M4e adds it.
- M0 motion — `modalIn` / `modalOut`, the existing sheet animation tokens.
- M0 haptics — `light` on toggle flip, `light` on Save, `medium` on overlap-warning-triggered Save attempt (rejected).
- The locked `Recurrence` discriminated union (`lib/types.ts:20–24`, ADR-019).
- The existing half-open interval contract (ADR-006).

### Outputs (regions and behaviors)

| Region                                       | Role in M4e                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Sync with prior milestones                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `<AddBrickSheet>` (CHANGED)                  | New "Duration" `<Toggle>` row inserted between the score-type chips and the Save button. Default OFF. When ON, reveals Start time picker (required, defaults to current hour rounded down OR parent block's start if nested), End time picker (required, defaults to Start + 30 min OR parent block's end if nested), and Recurrence chip group (4 single-select chips, default "Just today"; Custom range expands to date range + weekday picker — identical to AddBlockSheet's). Overlap warning chip appears above Save when current Start/End collides with any other timed task on the same day. | First time AddBrickSheet has time fields. Score-type chip selection is unchanged.                                                              |
| `<AddBlockSheet>` (CHANGED)                  | Same overlap warning chip added above Save. M2's "no overlap check" is retroactively closed. Overlap engine considers other blocks AND timed bricks (loose-with-duration-ON + any nested brick whose `start/end` is set).                                                                                                                                                                                                                                                                                                                                                                             | M2 fields, layout, and validation otherwise unchanged.                                                                                         |
| `<BrickChip>` (all three variants — CHANGED) | When the brick has duration ON, a small `HH:MM–HH:MM` badge renders in the chip's secondary line (below the name, above the progress badge). Time-brick chip continues to show the existing `minutesDone / durationMin` performance badge — both badges coexist. When duration is OFF, chip is byte-identical to M4a/M4b/M4c output (no regression).                                                                                                                                                                                                                                                  | Tick / goal / time score-type rendering is untouched. New secondary line is purely additive.                                                   |
| `<LooseBricksTray>` (CHANGED)                | Loose bricks with duration OFF stay in the tray (current behavior). Loose bricks with duration ON are **filtered OUT of the tray** and instead render on `<Timeline>` at their `start` hour row, with the same vertical placement contract as a block.                                                                                                                                                                                                                                                                                                                                                | M3 tray contract: only "tray-eligible" bricks (loose + duration-OFF) appear. Selector renamed `selectTrayBricks(state)`.                       |
| `<Timeline>` (CHANGED)                       | Renders the union of (a) all blocks (current), and (b) all loose-with-duration-ON bricks. Both share the same hour-row placement, vertical-extent math (`(endMin - startMin) / 60 * rowHeight`), and category-color outline. A timed-loose-brick card has a visual distinction (e.g., dashed outline OR subtle scale-90% inset) to communicate "this is a brick, not a block" but is otherwise visually congruent.                                                                                                                                                                                    | M2 timeline placement contract reused. New union selector `selectTimelineItems(state)` returns `(Block \| TimedLooseBrick)[]` sorted by start. |
| `lib/overlap.ts` (NEW)                       | Pure-function module. Exports `intervalsOverlap(a, b)` (half-open math, returns boolean), `findOverlaps(candidate, items, excludeId?)` (returns the colliding item with name + kind for the warning chip's copy). No reducer involvement; called from AddBlockSheet + AddBrickSheet on every field change.                                                                                                                                                                                                                                                                                            | New file. Reused by both Add sheets.                                                                                                           |
| `lib/types.ts` (EXTENDED)                    | `BrickBase` adds `hasDuration: boolean` (default `false`), `start?: string` ("HH:MM"), `end?: string` ("HH:MM"), `recurrence?: Recurrence`. Schema invariant: when `hasDuration === true`, all three of `start`, `end`, `recurrence` MUST be present; when `false`, all three MUST be `undefined`. Reducer enforces this in `ADD_BRICK`.                                                                                                                                                                                                                                                              | M3's `Brick` shape extended additively. No existing field removed or renamed.                                                                  |
| `lib/data.ts` (EXTENDED)                     | `ADD_BRICK` action handler accepts the new optional fields and stores them. No new action types. Validation (presence invariant) happens inside the reducer.                                                                                                                                                                                                                                                                                                                                                                                                                                          | M3 reducer arm extended; M4a/M4b/M4c arms unchanged.                                                                                           |
| `<Toggle>` (NEW M0 primitive)                | Standard iOS-style switch. Two states: off (gray track, knob left), on (amber track, knob right — uses `--brand-amber`). 44 px tap target per ADR-031. Reduced-motion: instant snap, no track-color transition. Reusable for future milestones (e.g., M5 edit mode flag, M6 settings).                                                                                                                                                                                                                                                                                                                | New M0 primitive. First consumer is M4e's AddBrickSheet; later consumers TBD.                                                                  |

### Locked schema additions

**Brick (extends M3 + M4c):**

```ts
type BrickBase = {
  id: string;
  parentBlockId: string | null;
  name: string;
  categoryId: string | null;
  // NEW in M4e — duration axis (orthogonal to score type):
  hasDuration: boolean; // toggle state; default false
  start?: string; // "HH:MM"; present iff hasDuration
  end?: string; // "HH:MM"; present iff hasDuration; half-open [start, end)
  recurrence?: Recurrence; // present iff hasDuration; default { kind: "just-today", date: <today ISO> }
};
```

The three score-type discriminants (`tick`, `goal`, `time`) and their performance fields (`done` / `count, target, unit` / `durationMin, minutesDone`) are **unchanged** from M3 + M4a/b/c.

**Block:** unchanged. (Blocks have always had `start`, `end`, `recurrence` since M2.)

**AppState + Action:** unchanged. No new action types. `ADD_BRICK` already exists; M4e widens its payload via the `Brick` shape extension. The M4c-locked `runningTimerBrickId` field is untouched.

### Out of scope (M4e)

- Editing an existing brick to flip duration ON or OFF — **M5 Edit Mode**.
- Editing an existing brick's start/end/recurrence — **M5 Edit Mode**.
- Deleting a brick — **M5 Edit Mode**.
- Promoting a nested brick to the timeline — **never** (nested bricks always render inside the parent block card, regardless of duration toggle state; only loose bricks promote).
- Drag-to-reschedule on the timeline — **M5/M7 polish**.
- Recurrence resolution against past or future dates — **M9** (M4e renders today only; recurrence is stored but `appliesOn` is M9).
- Cross-day overlap (e.g., a brick recurring on Tuesdays overlapping a one-off block this Tuesday) — **M9** (depends on `appliesOn`).
- Conflict-resolution UI beyond Save-disable (e.g., auto-shift, merge prompt, suggested alternative times) — **never; the user is the resolver**.
- Persisting the toggle state across page reloads — **M8**.
- A "Time" score-type re-design where `durationMin` is derived from `end - start` — **never per user direction 2026-05-14: the two concepts are intentionally separate; durationMin = performance target, start/end = allocated window**.

### Edge cases

- **Toggle OFF on Save with start/end half-filled** → fields are discarded silently; the brick saves with `hasDuration: false` and no time fields. No "are you sure?" prompt — the toggle is the source of truth.
- **Toggle ON, Start === End** → invalid (zero-duration window). Inline error on the End picker: "End must be after Start." Save disabled.
- **Toggle ON, Start > End** → same invalid path (the half-open interval `[start, end)` is empty). Same inline error. Save disabled.
- **Toggle ON, Start/End straddle midnight** (e.g., Start `23:00`, End `01:00`) → reject. M4e operates on a single-day model (matches M2's block contract). Inline error: "End must be on the same day as Start." Save disabled. (Multi-day windows are out of scope; same constraint as blocks.)
- **Back-to-back tasks share a boundary** (e.g., Block A 9:00–10:00, Brick B 10:00–11:00) → NOT an overlap (half-open `[start, end)` — `10:00` is `end` of A and `start` of B, no collision). No warning. Save enabled.
- **Two tasks share both Start and End** → IS an overlap (intervals are identical and both non-empty). Warning + Save disabled.
- **One task fully contains another** (e.g., Block 9:00–11:00, Brick 9:30–10:30) → IS an overlap. Warning lists the containing item by name. Save disabled.
- **Multiple simultaneous overlaps** (e.g., new brick collides with 2 existing items) → warning chip lists all colliders, comma-separated, up to 3; if more than 3, "+N more". Save disabled.
- **Loose brick with duration ON whose Start hour has no other items** → renders on Timeline at that hour row. Tray-renderable count decreases by one.
- **Loose brick with duration ON whose Start === existing Block's Start** → overlap detected at save time (chip warns); user adjusts before Save.
- **Last loose brick with duration ON promotes to Timeline** → tray's empty state re-applies if no other tray-eligible bricks remain (matches M3 AC #5 tray-visibility contract).
- **Existing brick (pre-M4e, `hasDuration` absent)** → migration default: `hasDuration: false`, no time fields. Reducer migration runs once at startup against any state shape missing the field (defense-in-depth; no real legacy persistence yet — M8).
- **Recurrence custom-range with zero weekdays selected** → inline error: "Pick at least one weekday." Save disabled. (Matches M2 AC for blocks.)
- **Two tick/goal/time bricks with same `parentBlockId` and overlapping windows** → IS an overlap (brick↔brick within a block). Both bricks live inside the same parent visually but their time windows collide on the timeline math. Warning + Save disabled.
- **Nested brick's window spills outside parent block's window** (e.g., Block 9:00–10:00, nested Brick 9:30–10:30) → **NOT a hard error in M4e** (per user direction: "it depends on the user"). The brick can save. Overlap engine still surfaces any _other_ collision the spill creates (e.g., the brick now overlaps the 10:00-block-after-this-one). No "fit inside parent" check.

### Acceptance criteria

**Duration toggle (AddBrickSheet)**

1. AddBrickSheet renders a "Duration" toggle row below the score-type chips, default OFF.
2. Toggling ON instantly reveals (no animation gate) three fields: Start (time picker, required), End (time picker, required), Recurrence (4-chip group, single-select, default "Just today").
3. Default values when toggle flips ON: Start = parent block's `start` if `parentBlockId !== null`, else current hour rounded down to nearest hour. End = parent block's `end` if `parentBlockId !== null` and block has end, else Start + 30 min.
4. Toggling OFF immediately hides the three fields; the user's in-progress entries are discarded.
5. Save with toggle OFF → brick saves with `hasDuration: false`, no `start`/`end`/`recurrence` fields. Existing M3/M4a/M4b/M4c behavior preserved byte-for-byte.
6. Save with toggle ON → brick saves with `hasDuration: true` and all three fields populated.

**Recurrence picker on AddBrickSheet** 7. Recurrence chip group renders 4 chips: "Just today" / "Every weekday" / "Every day" / "Custom range". Single-select. Default "Just today". 8. "Custom range" selection expands to inline start-date / end-date inputs + a 7-day weekday picker — visually identical to M2's AddBlockSheet custom-range form. 9. "Custom range" with zero weekdays selected → inline error, Save disabled. 10. Recurrence value is stored as the `Recurrence` discriminated union per ADR-019, identical to blocks.

**Overlap engine (lib/overlap.ts)** 11. `intervalsOverlap(a, b)` returns `true` iff `a.start < b.end && b.start < a.end` (half-open per ADR-006). 12. `findOverlaps(candidate, items, excludeId?)` returns a list of items that overlap the candidate, excluding any item whose `id === excludeId` (used for the "editing this brick" case in M5; in M4e `excludeId` is always undefined since editing is M5). 13. Block↔block collisions are detected (M2 retroactively gains overlap detection). 14. Brick↔block collisions are detected (timed brick vs. any block). 15. Brick↔brick collisions are detected (two timed bricks). 16. Bricks with `hasDuration === false` are EXCLUDED from the overlap engine's input set. 17. The candidate-being-added is NOT in the input set (no self-overlap). 18. Sort order of the returned overlap list is by `start` ascending; ties broken by item kind ("block" before "brick"); ties broken by name alphabetic.

**Overlap warning UX (AddBrickSheet + AddBlockSheet)** 19. While Start/End/Recurrence are being edited, the engine runs on every field-change tick (no debounce required — the data set is small). 20. When overlaps exist, a warning chip renders above the Save button with copy `"⚠ overlaps with [Kind: Name, HH:MM–HH:MM]"`. Multiple overlaps: comma-separated, max 3 listed, then "+N more". 21. Save button is disabled when the overlap list is non-empty. Save button enabled when the overlap list is empty AND all other validation passes (title non-blank, end > start, etc.). 22. Tapping the disabled Save button fires a `medium` haptic and surfaces a tooltip-style hint: "Resolve the overlap to save." The sheet does not close. 23. Overlap chip is dismissible only by changing Start/End (NOT by an X button) — the user must resolve, not silence.

**`<BrickChip>` time badge** 24. When `brick.hasDuration === true`, every brick chip (tick, goal, time) renders a `HH:MM–HH:MM` badge on a secondary text line below the name, using `font-mono text-xs text-muted-foreground`. 25. When `brick.hasDuration === false`, no secondary line renders — chip output is byte-identical to M4a/M4b/M4c. 26. Time-brick chip's existing `minutesDone / durationMin` performance badge is unchanged (it sits to the right of the chip's main row). The new time-window badge sits below the name; both coexist.

**Loose bricks promotion** 27. Selector `selectTrayBricks(state)` returns `state.looseBricks.filter(b => !b.hasDuration)`. 28. Selector `selectTimelineItems(state)` returns `[...state.blocks, ...state.looseBricks.filter(b => b.hasDuration)]` sorted by `start` ascending. 29. `<LooseBricksTray>` renders only `selectTrayBricks(state)`. When the filtered list is empty AND no blocks exist, M3's tray-visibility contract triggers (tray hidden entirely). 30. `<Timeline>` renders `selectTimelineItems(state)`. A loose-with-duration brick uses the same hour-row math as a block (vertical position `(brick.startMin) / 60 * rowHeight`, vertical extent `(brick.endMin - brick.startMin) / 60 * rowHeight`). 31. A loose-with-duration brick card has a dashed 1.5px outline (`border-dashed`) to distinguish it from a block (solid outline). Internal layout reuses the block card body (name top, category color stripe left, no time label inside — the timeline gutter provides that).

**Schema invariant** 32. `lib/data.ts` reducer rejects an `ADD_BRICK` action where `brick.hasDuration === true` and any of `start`/`end`/`recurrence` is undefined. Returns state unchanged (defensive; UI should never construct such an action). Same for `hasDuration === false` with any of the three fields defined.

**Quality** 33. `tsc --noEmit`: zero new errors. 34. ESLint: zero new errors. 35. Vitest: - `lib/overlap.test.ts` — `intervalsOverlap` truth table (overlap, touching, separated, identical, contained); `findOverlaps` exclusion + sort + multiple-collision cases. - `lib/data.test.ts` — `ADD_BRICK` with `hasDuration: true` happy path; reducer rejection of invariant violations. - `components/AddBrickSheet.test.tsx` — toggle OFF (current behavior preserved); toggle ON (reveals fields, saves with all three); overlap chip renders on collision; Save disabled on collision; Save re-enabled when fields adjusted; medium haptic on disabled-Save tap. - `components/AddBlockSheet.test.tsx` — overlap chip renders against existing blocks (regression-free) and against timed loose bricks (new); Save disabled. - `components/BrickChip.test.tsx` — time-window badge renders iff `hasDuration === true`; chip byte-identical when OFF. - `components/LooseBricksTray.test.tsx` — `selectTrayBricks` filters out duration-ON bricks; tray hides when filtered-empty + no blocks. - `components/Timeline.test.tsx` — `selectTimelineItems` union sort; timed-loose-brick renders with dashed outline at the right hour row. 36. Playwright (deferred-to-preview, M4a/b/c/d pattern): - E-m4e-01 — Add loose brick with toggle ON, pick 9:00–9:30, save → renders on timeline at 9:00 row with dashed outline, not in tray. - E-m4e-02 — Add brick with toggle ON, pick a window that collides with an existing block → warning chip visible, Save button disabled. - E-m4e-03 — Add brick with toggle ON, fix the overlap → warning clears, Save enabled, brick saves. - E-m4e-04 — Add block whose window collides with an existing loose-timed-brick → warning chip on AddBlockSheet, Save disabled. - E-m4e-05 — Add brick with toggle OFF → byte-identical to M3 path (regression). 37. A11y: - A-m4e-01 — `<Toggle>` has `role="switch"` and `aria-checked` reflects state. - A-m4e-02 — Warning chip uses `role="alert"` and is announced to screen readers on first appearance. - A-m4e-03 — Disabled Save button has `aria-disabled="true"` and the hint is exposed via `aria-describedby`. - A-m4e-04 — axe-core zero violations on AddBrickSheet with toggle ON + overlap warning visible.

### Open spec gaps (resolve at VERIFY)

- **SG-m4e-01 — Toggle default per brick kind.** Recommendation: OFF for all three kinds. Trade-off: time bricks could default ON since a "time-of-day to do this timed thing" is more natural for that score type. Lean OFF universally to preserve backwards-compat and let M7 polish toggle the default if usage data argues for it.
- **SG-m4e-02 — Brick chip secondary-line vertical order.** Recommendation: name (top) → time-window badge (below name) → score-type progress badge (right side of name row). Trade-off: putting the time window at the top of the chip (above the name) would emphasize it more. Lean to below-name because the name remains the primary identity.
- **SG-m4e-03 — Timed-loose-brick visual distinction on Timeline.** Recommendation: dashed 1.5 px outline + same category-color stripe as blocks. Trade-off: a different background tint could be louder. Lean dashed outline because it's the established "brick-ness" cue in M3.
- **SG-m4e-04 — `<Toggle>` location: M0 primitive vs M4e-local.** Recommendation: introduce as an M0 primitive (matches `<Sheet>`, `<Chip>`, `<Button>`, etc.) since it'll be reused in M5 (edit mode flag) and M6 (settings). Trade-off: M4e-local file ships faster but creates duplication. Lean M0 primitive.
- **SG-m4e-05 — Overlap detection: live (every keystroke) vs on-blur vs on-Save.** Recommendation: live on every field-change tick. Trade-off: live is more interruptive but reflects the "duration is universal" mental model better — the user sees the collision the moment they pick the time. Lean live.
- **SG-m4e-06 — Migration of pre-M4e in-memory Brick literals.** Recommendation: PLAN includes a one-time selector `withDurationDefaults(brick)` that fills `hasDuration: false` for any brick literal missing it. All M3/M4a/b/c test fixtures auto-migrate via this helper at construction. Trade-off: forcing every fixture to be explicit is more honest. Lean helper because it preserves all existing test surface area.
- **SG-m4e-07 — Reduced-motion behavior for the toggle's reveal/hide.** Recommendation: instant (no animation) under `prefers-reduced-motion: reduce`. Default motion: 150 ms ease-out collapse/expand. Trade-off: matches M0 motion tokens for sheets.
- **SG-m4e-08 — Recurrence "Custom range" UI on AddBrickSheet.** Recommendation: render the same component used in AddBlockSheet (extract to `<RecurrencePicker>` if not already extracted). Trade-off: a smaller mobile-friendly variant could ship for the AddBrickSheet specifically. Lean to extract-and-reuse for consistency.

## Milestone 4f — Collapse to two brick kinds; rip the timer

> **Pillars:** § 0.5 (interaction primitives — score types collapse from three to two: tick + units), § 0.9 (data model — `Brick` union shrinks; `AppState` loses `runningTimerBrickId`; Action union loses four timer variants and `LOG_GOAL_BRICK`), § 0.14 (no factory anything — manual entry replaces auto-counting), **ADR-043 (NEW, supersedes the score-type cardinality in ADR-035; supersedes the timer infrastructure in M4c)**, ADR-042 (universal-duration axis — unchanged in spirit; references to "tick/goal/time" updated to "tick/units"), ADR-034 (already softened).

### Intent

After M4e shipped, the user clarified the brick model: **there are only two brick kinds, not three.** A brick is either a **tick** (boolean — "did you do it, yes / no") or a **units** brick (target + unit + done — "you set a target of N <unit>, you type how much you did today"). The "time" kind shipped in M4c — with its live timer, START/STOP actions, single-running invariant, and visibilitychange recovery — is **wrong**. (The block/day completion chimes from M4a are a separate, retained feature — see Inputs/Outputs below.) The user does not want the app counting minutes for them. They want to type "20" into a brick that has a target of "30 minutes running." A time-of-day window (when in the day this runs) is already covered by M4e's `hasDuration` axis. A performance target in minutes is just a units brick where the user's unit happens to be the word `"minutes"`. Rep-based goals, page counts, glasses of water, deep breaths — all the same shape, distinguished only by the unit string the user types.

M4f collapses the schema to match this mental model:

- `Brick` discriminated union shrinks from three variants to two: `kind: "tick"` and `kind: "units"`. The `kind: "time"` variant is **removed**.
- `kind: "goal"` (M4b's name) is **renamed** to `kind: "units"` (user's vocabulary, locked 2026-05-14). The data shape stays the same modulo one rename: `count` → `done` (consistency with tick).
- `AppState.runningTimerBrickId` is **removed**.
- Action union loses four timer variants (`START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`) and `LOG_GOAL_BRICK` (delta-stepper, M4b). One new action takes their place: `SET_UNITS_DONE { brickId, done }` — absolute-value entry, clamped `done >= 0`.
- `lib/timer.ts`, `<TimerSheet>`, and the `useTimer` hook are **deleted**. `lib/audio.ts` and `public/sounds/chime.mp3` are **retained** — the block-complete and day-complete chimes (M4a) stay; only the M4c timer's own chime invocation is removed (it dies with the timer). **User decision 2026-05-14: keep the block/day completion chimes.**
- `<AddBrickSheet>` kind selector shrinks from three chips (Tick / Goal / Time) to two (Tick / Units). The Units chip reveals the same Target + Unit inputs M4b already shipped for goals — just with the chip label and the discriminator value updated.
- `<BrickChip>` loses the time variant. The units variant now handles what was previously "goal" (target/unit/done) AND what was previously "time" (a minutes target). Tap on a units brick chip opens a new `<UnitsEntrySheet>` — a manual-number-entry sheet — pre-filled with the brick's current `done` value. The user types or edits the number, taps Save, and the reducer commits `SET_UNITS_DONE`.

M4e's universal-duration axis is preserved. A units brick with `unit: "minutes"`, `target: 30`, and `hasDuration: true` with `start: "06:00"` / `end: "06:40"` is the new way to express what M4c's time brick tried to express. The duration axis (M4e) says _when_ in the day. The units axis (M4f) says _how much_ of _what_ (free-text unit).

**What this is NOT:** changing the M4e duration toggle, overlap engine, or timeline-promotion contract (M4e ACs all still hold for the two remaining kinds); adding edit-mode for an existing brick (M5); persisting state (M8); resolving recurrence against arbitrary dates (M9); reintroducing a stepper ±1 UX (manual-number entry replaces it entirely — typing a number is the only path); adding decimal numbers to target or done (integers only in M4f; decimals can be M7 polish); changing the cascade / scoring math beyond renaming the fields it reads (`count` → `done`, `minutesDone` migrates to `done` on the unit-side once-only).

### Inputs

- The full M4e surface — `<BuildingClient>`, `<BottomBar>`, `<Timeline>` with `<SlotTapTargets>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<AddChooserSheet>`, `<LooseBricksTray>`, `<TimelineBlock>`, `<TimedLooseBrickCard>`, `<BrickChip>` (currently three variants — about to become two).
- M0 primitives unchanged — `<Sheet>`, `<Input>` (text + number), `<Chip>`, `<Button>`, `<Toggle>`.
- M0 motion + haptics unchanged.
- The locked `Recurrence` union (ADR-019), half-open intervals (ADR-006), and M4e's `hasDuration` axis (ADR-042).
- The M4c timer surface — `lib/timer.ts`, `<TimerSheet>`, `useTimer`, 4 timer actions, `runningTimerBrickId` — all **inputs to be deleted** by this milestone. `lib/audio.ts` + `public/sounds/chime.mp3` are NOT in the deletion set — they are retained for the M4a block/day completion chimes.

### Outputs (regions and behaviors)

| Region                                                                   | Role in M4f                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sync with prior milestones                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `lib/types.ts` (CHANGED — collapse)                                      | `Brick` union shrinks to two variants. `kind: "time"` removed. `kind: "goal"` renamed to `kind: "units"`. Field `count` renamed to `done`. `AppState.runningTimerBrickId` removed. Action union loses `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, `LOG_GOAL_BRICK`. Adds `SET_UNITS_DONE { brickId: string; done: number }`. M4e fields (`hasDuration`, `start?`, `end?`, `recurrence?`) on `BrickBase` are **unchanged**.   | M4e schema otherwise preserved.                                                                                               |
| `lib/data.ts` (CHANGED)                                                  | Reducer loses 5 action arms (4 timer + LOG_GOAL_BRICK). Gains 1 arm: `SET_UNITS_DONE` clamps `done >= 0` and writes to the targeted brick (loose or nested). `ADD_BRICK` invariant updated — accepts only the two new variants; rejects any input with `kind: "time"` or `kind: "goal"` (defensive; typecheck should already prevent construction).                                                                                              | M4e's `ADD_BRICK` duration invariant preserved.                                                                               |
| `lib/timer.ts` + `lib/timer.test.ts` (DELETED)                           | M4c's timer module removed entirely. No replacement.                                                                                                                                                                                                                                                                                                                                                                                             | All `useTimer` call sites become dead — removed in BuildingClient and BrickChip migrations.                                   |
| `components/TimerSheet.tsx` + `TimerSheet.test.tsx` (DELETED)            | M4c's long-press manual-entry sheet removed. Replaced functionally by `<UnitsEntrySheet>` on tap (not long-press).                                                                                                                                                                                                                                                                                                                               | No callers remain after migration.                                                                                            |
| `lib/audio.ts` + `public/sounds/chime.mp3` (RETAINED)                    | NOT deleted. The block-complete and day-complete chimes (M4a) keep playing. Only the M4c timer's own chime invocation is removed — it dies with the timer. The `chime.mp3` placeholder-needs-a-real-asset open loop in `docs/status.md` stays open (an M7 concern).                                                                                                                                                                              | M4a celebration audio unchanged.                                                                                              |
| `components/UnitsEntrySheet.tsx` (NEW)                                   | Sheet primitive composition: heading shows brick name; subhead shows `"Today's <unit>"` (e.g., "Today's minutes" or "Today's reps"); single `<Input type="number" inputMode="numeric">` pre-filled with current `brick.done`; Save and Cancel buttons. Save dispatches `SET_UNITS_DONE { brickId, done }`. Cancel discards. Sheet opens on tap of any `<BrickChip>` rendering a `kind: "units"` brick.                                           | Replaces M4c's `<TimerSheet>` and M4b's stepper-on-chip UX. Reuses M0 `<Sheet>` + `<Input>`.                                  |
| `components/AddBrickSheet.tsx` (CHANGED)                                 | Kind selector renders 2 chips: "Tick" and "Units". The "Time" chip is gone. Selecting "Units" reveals the same Target (`<Input type="number">`, integer ≥ 1, required) + Unit (`<Input type="text">`, free-text, required, placeholder `"minutes / reps / pages"`) inputs that M4b already shipped. Save constructs `{ kind: "units", target, unit, done: 0, ...durationFields }`. M4e duration toggle row sits below kind selection, untouched. | M4e overlap engine and duration toggle preserved.                                                                             |
| `components/BrickChip.tsx` (CHANGED)                                     | Two variants only: tick + units. Time variant deleted. Units variant renders `"<done> / <target> <unit>"` (e.g., "20 / 30 minutes"). Tap target: full chip → opens `<UnitsEntrySheet>`. No ±1 stepper buttons remain.                                                                                                                                                                                                                            | M4e time-window badge (when `hasDuration === true`) renders identically for both variants.                                    |
| `components/BrickStepper.tsx` (DELETED OR INERT)                         | M4b's ±1 stepper component is no longer reachable from the chip. Planner decides: delete the file outright, or keep it inert for a future "quick increment" reintroduction. Recommendation: delete; manual entry is the locked UX (user direction 2026-05-14).                                                                                                                                                                                   | Open loop. Trade-off documented in PLAN.                                                                                      |
| `app/(building)/BuildingClient.tsx` (CHANGED)                            | Drop the `useTimer` wiring and all `runningTimerBrickId`-derived UI. Wire the new `<UnitsEntrySheet>` open/close state. Pass the active-units-brick id to the sheet on chip-tap.                                                                                                                                                                                                                                                                 | M4e selectors (`selectTrayBricks`, `selectTimelineItems`) untouched — they read `looseBricks` only and don't care about kind. |
| `lib/dharma.ts` + `lib/scoring.ts` (CHANGED)                             | Scoring functions that previously read `brick.count` (goal) OR `brick.minutesDone / brick.durationMin` (time) now read `brick.done / brick.target` on the unified units variant. The completion ratio math is the same; only the field names differ. Tick scoring is unchanged.                                                                                                                                                                  | Cascade behavior is identical post-rename.                                                                                    |
| `components/Brick.tsx` (CHANGED)                                         | Removes the `time` rendering branch. The function now switches on `tick                                                                                                                                                                                                                                                                                                                                                                          | units` only.                                                                                                                  | M3 brick-in-block rendering preserved for the two kinds. |
| All `*.test.{ts,tsx}` files referencing `kind: "time"` or `kind: "goal"` | Bulk migration. `kind: "goal"` literals → `kind: "units"`; `count: N` → `done: N`. `kind: "time"` literals → `kind: "units"` with `unit: "minutes"`, `target: <durationMin>`, `done: <minutesDone>`. M4c timer test files (`lib/timer.test.ts`, `TimerSheet.test.tsx`) deleted outright. M4e tests that exercised the duration toggle against the time-kind variant are re-pointed to the units-kind with `unit: "minutes"`.                     | Migration is mechanical; helper rename keeps the assertions intact where possible.                                            |
| `lib/migrations.ts` or equivalent (CONSIDER — planner choice)            | A one-time `withUnitsCollapse(brick)` migration could simplify the test sweep — accepts a pre-M4f literal (`kind: "goal"` or `kind: "time"`) and returns the post-M4f shape. Lean toward writing the helper for test fixtures and skipping it for production code (production data has zero existing bricks; persistence is M8).                                                                                                                 | Optional. PLAN decides.                                                                                                       |

### Locked schema (post-M4f)

```ts
type BrickBase = {
  id: string;
  parentBlockId: string | null;
  name: string;
  categoryId: string | null;
  hasDuration: boolean; // M4e
  start?: string; // M4e
  end?: string; // M4e
  recurrence?: Recurrence; // M4e
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "units"; target: number; unit: string; done: number });

export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  // runningTimerBrickId: REMOVED
};

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "SET_UNITS_DONE"; brickId: string; done: number };
// START_TIMER, STOP_TIMER, TICK_TIMER, SET_TIMER_MINUTES, LOG_GOAL_BRICK: REMOVED
```

`Recurrence`, `Category`, `Block` are unchanged.

### Out of scope (M4f)

- Decimals in `target` or `done` — M7 polish (integers only in M4f).
- Editing a units brick's `target` or `unit` after creation — M5 Edit Mode.
- Re-introducing a ±1 stepper UX on the brick chip — locked out per user direction; manual-number entry is the only path.
- A "quick log" gesture on the chip (e.g., long-press to increment, swipe) — M7 if signal warrants.
- Persisting `done` across page reloads — M8.
- Auto-suggesting common units (a dropdown of "minutes / reps / pages / km / glasses") — M7 polish.
- A history view of past `done` values for the same brick — M9 (depends on persisted day-stamps).
- Resurrecting any timer behavior — **never** per user direction 2026-05-14.

### Edge cases

- **Units brick chip tap while UnitsEntrySheet for a different brick is open** → close the previous sheet, open the new one (single-sheet contract, matches M4d's AddChooserSheet pattern).
- **User clears the number input, taps Save** → invalid; inline error "Enter a number" + Save disabled. Sheet stays open.
- **User types a negative number (e.g., "-5")** → reject at input parse (numeric input + `min="0"` HTML attribute). Sheet's Save remains disabled until a non-negative integer is present.
- **User types a value greater than `target`** → valid (overachievement is fine). Reducer accepts. Chip renders `"120 / 100 reps"` with no special overflow styling in M4f.
- **User types a decimal (e.g., "20.5")** → input is `step="1"` and rejects decimals at the browser layer; if a decimal somehow survives (e.g., paste), reducer floors to `Math.floor(done)` defensively.
- **User taps a units chip while reading-only flow** (M5+) → out of scope; M4f assumes editable.
- **Existing M4c fixture data with `kind: "time"`** → typecheck-time error. Bulk migration handled in the same PR.
- **Existing M4b fixture data with `kind: "goal"` and `count: N`** → typecheck-time error. Bulk migration handled in the same PR.
- **M4e duration toggle ON for a units brick** → unchanged from M4e; duration axis remains orthogonal to kind. Overlap engine reads the same fields.
- **A units brick saved with `unit: ""`** → invalid construction; AddBrickSheet's Unit input is required. Reducer rejects defensively if it ever sees an empty unit string.
- **A units brick saved with `target: 0`** → invalid construction; AddBrickSheet's Target input is `min="1"`. Reducer rejects defensively if it ever sees `target <= 0`.
- **`lib/timer` import remains in any source file** → typecheck/lint error; the deleted file produces a build failure that surfaces the stale import.

### Acceptance criteria

**Schema collapse**

1. `lib/types.ts` `Brick` union has exactly two variants: `kind: "tick"` and `kind: "units"`. No `kind: "goal"` or `kind: "time"` remains.
2. The units variant shape is `{ kind: "units"; target: number; unit: string; done: number }`. Field `count` (M4b) is renamed to `done` everywhere.
3. `AppState.runningTimerBrickId` is removed from the type.
4. `Action` union no longer contains `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, or `LOG_GOAL_BRICK`.
5. `Action` union contains `{ type: "SET_UNITS_DONE"; brickId: string; done: number }`.
6. M4e's `BrickBase` fields (`hasDuration`, `start?`, `end?`, `recurrence?`) and presence invariant are unchanged.

**Reducer**

7. `SET_UNITS_DONE` finds the brick by `brickId` (searches `looseBricks` first, then every `block.bricks`) and sets `brick.done = Math.max(0, Math.floor(action.done))`.
8. `SET_UNITS_DONE` against a non-existent `brickId` returns state unchanged (defensive; no throw).
9. `SET_UNITS_DONE` against a `kind: "tick"` brick is rejected (returns state unchanged); the action is meant for units bricks only.
10. `ADD_BRICK` rejects any payload whose `kind` is not `"tick"` or `"units"` (returns state unchanged). Same M4e duration-invariant rules apply.
11. `LOG_TICK_BRICK` is unchanged from M4a.

**File deletions**

12. `lib/timer.ts` and `lib/timer.test.ts` are deleted.
13. `components/TimerSheet.tsx` and `components/TimerSheet.test.tsx` are deleted.
14. `lib/audio.ts`, `public/sounds/chime.mp3`, and the block-complete + day-complete chime calls (M4a, in `<TimelineBlock>` and `<BuildingClient>`) are **retained** — they are NOT part of the deletion set. Only the M4c timer's own chime invocation is removed, and it is removed by virtue of the timer code being deleted. (Spec correction 2026-05-14: an earlier draft of this AC said `public/chime.mp3` is deleted; the user decided to keep the block/day completion chimes. The file path `public/chime.mp3` never existed — the real asset is `public/sounds/chime.mp3`.)
15. Any `useTimer` hook file (`hooks/useTimer.ts` or equivalent) is deleted.
16. No source file in `lib/`, `components/`, or `app/` imports from any deleted timer path. `grep -rn "lib/timer\|TimerSheet\|useTimer" lib components app` returns zero hits post-migration. (`lib/audio` and `chime.mp3` references are expected to survive — they belong to the retained M4a celebration audio.)
17. `lib/blockValidation.ts:overlapsExistingBlock` (dead-code from M4e) — planner choice: delete in M4f or carry to M5. Recommendation: delete here while we're already pruning.

**AddBrickSheet**

18. Kind selector renders exactly two chips with labels "Tick" and "Units". The "Time" chip is gone.
19. Selecting "Units" reveals: Target input (`<Input type="number" min="1" step="1">`, required), Unit input (`<Input type="text">`, required, placeholder `"minutes / reps / pages"`).
20. Save with "Units" selected constructs a brick with `{ kind: "units", target, unit, done: 0 }` plus M4e duration fields if the duration toggle is ON.
21. Save is disabled when Target is empty / non-integer / < 1, OR Unit is empty, OR overlap exists (M4e contract preserved).
22. AddBrickSheet's overlap chip, `aria-describedby`, sr-only hint, and Save-disable behavior from M4e are all unchanged.

**BrickChip**

23. `<BrickChip>` renders only two variants. The time-variant rendering branch is deleted.
24. Units chip primary line: `"<done> / <target> <unit>"` (e.g., `"20 / 30 minutes"`). M4e's time-window badge (`HH:MM–HH:MM`) renders identically when `brick.hasDuration === true`.
25. Tapping a units chip opens `<UnitsEntrySheet>` for that brick. Tapping a tick chip continues to flip `done` per M4a (no sheet open).
26. No ±1 stepper buttons appear anywhere on the chip surface.

**UnitsEntrySheet (NEW)**

27. Sheet heading shows the brick's `name`. Sub-heading reads `"Today's <unit>"` (e.g., `"Today's minutes"`, `"Today's reps"`).
28. A single `<Input type="number" inputMode="numeric" min="0" step="1">` is pre-filled with the brick's current `done` value.
29. Tapping Save with a valid non-negative integer dispatches `SET_UNITS_DONE { brickId, done }` and closes the sheet.
30. Tapping Save with an empty value disables Save (greyed out); tapping the disabled button fires `medium` haptic and surfaces a hint `"Enter a number to save."` (mirroring M4e's `aria-describedby` + sr-only hint pattern).
31. Tapping Cancel closes the sheet without dispatching.
32. The sheet uses M0's `<Sheet>` primitive for layout and animation.
33. On mobile, the number input opens the numeric keypad (`inputMode="numeric"`).

**Migration**

34. All test fixtures and helpers that constructed `kind: "goal"` bricks are migrated to `kind: "units"` with `count` → `done`. No test asserts goal-kind behavior post-migration.
35. All test fixtures that constructed `kind: "time"` bricks are migrated to `kind: "units"` with `unit: "minutes"`, `target: <previous durationMin>`, `done: <previous minutesDone>`. No test asserts time-kind behavior post-migration.
36. `lib/timer.test.ts` and `TimerSheet.test.tsx` are deleted. Any vitest IDs they owned (M4c U-/C-/A-/E- IDs) are explicitly retired in tests.md with a one-line note pointing at M4f.
37. M4e tests that asserted the duration toggle against the time-kind variant are re-pointed to the units-kind. M4e IDs remain green post-migration.
38. `lib/dharma.ts` / `lib/scoring.ts` scoring math uses `brick.done / brick.target` for units bricks. Existing M4b scoring assertions hold post-rename. Existing M4c scoring assertions for time bricks are migrated to assert the same ratio against the new field names.

**Quality**

39. `tsc --noEmit`: zero errors. Any stale references to `kind: "time"`, `kind: "goal"`, `runningTimerBrickId`, or the 5 deleted actions are caught at compile time.
40. ESLint: zero errors. Stale imports surface as `no-unused-imports` errors; resolve by removing the import.
41. Vitest: full suite passes. Headcount drops by ~10–25 (M4c timer + stepper tests retired) and grows back via UnitsEntrySheet + reducer tests for `SET_UNITS_DONE`. Net change documented in tests.md.
42. Playwright (deferred-to-preview, M4a/b/c/d/e pattern):
    - E-m4f-01 — Add a units brick with `unit: "minutes"`, `target: 30`. Tap the chip → UnitsEntrySheet opens. Type "20", Save → chip renders "20 / 30 minutes".
    - E-m4f-02 — Tap a tick chip → no sheet opens; `done` flips (M4a regression).
    - E-m4f-03 — AddBrickSheet shows exactly two kind chips (Tick / Units). No "Time" chip visible.
    - E-m4f-04 — A units brick with `unit: "reps"`, `target: 100` accepts a typed value of 50 the same way `unit: "minutes"` does (free-text unit parity).
    - E-m4f-05 — No live timer is observable anywhere in the app — no auto-incrementing minutesDone, no `<TimerSheet>` long-press behavior. (The block-complete and day-complete chimes are unaffected and still play — they are not timer behavior.)
43. A11y:
    - A-m4f-01 — `<UnitsEntrySheet>` has `role="dialog"` with `aria-labelledby` pointing at the heading.
    - A-m4f-02 — Number input has an accessible name (label or `aria-label`) of the form `"Enter <unit> done today"`.
    - A-m4f-03 — Save button has `aria-describedby` + sr-only hint when disabled (matches M4e pattern).
    - A-m4f-04 — axe-core zero violations on UnitsEntrySheet open with a valid value, an empty value, and a value greater than target.

### Open spec gaps (resolve at VERIFY)

- **SG-m4f-01 — Field rename `count` → `done` for units variant.** Recommendation: rename in the same PR. Trade-off: keeping `count` saves a mechanical sweep but leaves the tick (`done: boolean`) and units (`count: number`) field names inconsistent for the same concept. Lean rename.
- **SG-m4f-02 — Delete `<BrickStepper>` or leave it dormant?** Recommendation: delete. Trade-off: keeping it costs ~30 LOC and could speed M7 polish if a quick-increment gesture lands. Lean delete because the user explicitly rejected the stepper UX; reintroducing later is cheap.
- **SG-m4f-03 — Delete `lib/blockValidation.ts:overlapsExistingBlock` (M4e dead code) in M4f or M5?** Recommendation: delete in M4f while we're already pruning. Trade-off: U-m2-004/005 lose their regression coverage; their assertions could be re-pointed at `lib/overlap.ts:intervalsOverlap` (same behavior, half-open math). Lean delete + re-point tests.
- **SG-m4f-04 — UnitsEntrySheet trigger: tap vs long-press?** Recommendation: tap. Trade-off: tap conflicts with no other gesture (the M4b stepper is gone, the M4c long-press is gone), so the chip becomes a single-tap surface. Long-press would create a hidden affordance. Lean tap.
- **SG-m4f-05 — Replace M4c's `chime.mp3` (sound on timer complete) with anything for units bricks?** Recommendation: no. Trade-off: a celebratory sound when `done >= target` could land in M7. Lean no in M4f; M7 polish.
- **SG-m4f-06 — Decimal numbers in `target` or `done`?** Recommendation: integer only. Trade-off: "1.5 km" or "2.5 cups" is a real use case but adds parse/clamp complexity. Lean integer; revisit in M7 with usage signal.
- **SG-m4f-07 — How to migrate M4c's auto-running-timer state if it somehow survives session refresh?** Recommendation: nothing — there's no persistence yet (M8 owns that), so no in-flight timer state exists at session boundary. The grep confirms zero call sites; the rip is clean. Lean: no migration code required.
- **SG-m4f-08 — Keep ADR-042's "tick / goal / time" phrasing or rewrite to "tick / units"?** Recommendation: rewrite the references inline (small in-place edit, no superseding ADR needed; ADR-042's decision is unchanged — only the score-type cardinality referenced in its prose changes). Trade-off: superseding is "more correct" historically. Lean inline rewrite + note in ADR-043 that ADR-042's wording was harmonized.

## Milestone 4g — Timer-era dead-code sweep

> **Pillars:** § 0.9 (data model — no schema change; only removal of inert prop surface), ADR-043 (the M4f collapse — this milestone finishes the cleanup ADR-043 began). No new ADR required.

### Intent

M4f collapsed bricks to two kinds and ripped the timer, but it parked a layer of inert `@deprecated` props on five components rather than deleting them — kept as "backwards-compat prop shape" placeholders. No caller passes them; no component reads them; they are dead weight. The M4f EVALUATOR explicitly deferred their removal to "an M5 decision." M4g is that decision, taken before M5 begins, because M5 (block/brick edit + delete) rewires these exact components and the dead props would only entangle that work.

M4g is **pure subtraction with zero behavior change.** It removes the dead props and clears two cosmetic nits the M4f EVALUATOR logged. It adds nothing, changes no rendering, no scoring, no user-visible behavior.

**What this is NOT:** any schema change (the `Brick` / `AppState` / `Action` unions are untouched — M4f locked them); any new component or prop; any edit-mode or delete behavior (M5); a refactor of component internals beyond deleting unused prop declarations and their now-dead references.

### Inputs

- Five components carrying `@deprecated` props in their `Props` interface:
  - `components/BrickChip.tsx` — `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`
  - `components/TimelineBlock.tsx` — `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`
  - `components/Timeline.tsx` — `onUnitsLog`, `onGoalLog`
  - `components/LooseBricksTray.tsx` — `onUnitsLog`, `onGoalLog`
  - `components/TimedLooseBrickCard.tsx` — `onUnitsLog`, `onGoalLog`
- `lib/blockValidation.test.ts` — a `describe` block mislabelled `U-m4f-016` that actually exercises `isValidBrickUnitsTarget`.
- `lib/data.ts` — the `findUnitsBrickById` doc comment that references the deleted `lib/timer.ts` / `findTimeBrickById`.

### Outputs

- The five `Props` interfaces have zero `@deprecated` props.
- No caller, test fixture, or `app/design/HarnessClient.tsx` usage references a removed prop.
- The mislabelled test carries an accurate, non-colliding test ID; its assertion is unchanged.
- `lib/data.ts`'s comment no longer references `lib/timer.ts` / `findTimeBrickById`.
- App behavior, rendering, and scoring are byte-for-byte identical to the M4f ship.

### Edge cases

- A removed prop is still passed at a call site or in a test render → that argument is removed in the same change; `tsc --noEmit` must stay clean.
- The `U-m4f-016` label collision: tests.md's real `U-m4f-016` G/W/T (classic `intervalsOverlap` overlap) is already covered by `U-m2-004`. The mislabelled `describe` is a genuine `isValidBrickUnitsTarget` test — it is **renamed** to an accurate, non-colliding ID, never deleted; the assertion body is preserved verbatim.
- No `@deprecated` prop is currently exercised by a test (they were always inert) → no test should fail from removal; any test that does fail reveals a prop that was secretly live and must be investigated, not silently deleted.

### Acceptance criteria

1. `components/BrickChip.tsx` `Props` declares none of: `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`.
2. `components/TimelineBlock.tsx` `Props` declares none of: `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`.
3. `components/Timeline.tsx`, `components/LooseBricksTray.tsx`, and `components/TimedLooseBrickCard.tsx` `Props` declare neither `onUnitsLog` nor `onGoalLog`.
4. `grep` for each removed prop name (`onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`) across `app/`, `components/`, `lib/` returns zero hits — excepting documentation strings in `CHANGELOG.md`, `docs/`, and migration comments that intentionally narrate the removal.
5. The `describe` block currently labelled `U-m4f-016` in `lib/blockValidation.test.ts` is renamed to an accurate, non-colliding test ID; its assertion is unchanged and green.
6. The `findUnitsBrickById` comment in `lib/data.ts` no longer mentions `lib/timer.ts` or `findTimeBrickById`.
7. `npx tsc --noEmit`: zero errors. `npm run lint`: zero errors, no more than 13 warnings. Full Vitest suite green with no net test-count regression (no test is removed — at most a dead prop is dropped from a render call inside a still-passing test).
8. No behavior change: every existing component test passes, modulo the mechanical removal of a dead prop from a render call where one was passed. No snapshot, no rendered DOM, no scoring output differs from the M4f ship.

### Open spec gaps (resolve at VERIFY)

- **SG-m4g-01 — New ID for the renamed `U-m4f-016` test.** Recommendation: relabel it `U-m4f-016b` or fold it under the existing `isValidBrickUnitsTarget` describe with that suite's ID; PLANNER picks the scheme in tests.md and VERIFIER confirms no collision. Trade-off: a brand-new `U-m4g-` ID is cleaner but detaches the assertion from its M4f origin. Lean: keep it in the M4f ID space with a non-colliding suffix.
- **SG-m4g-02 — Migration comments that name the removed props.** Recommendation: the narrative comments at the top of `Timeline.tsx` / `TimedLooseBrickCard.tsx` / `BrickChip.tsx` ("M4f: onGoalLog → onUnitsLog; timer props removed") may stay — they document history and are not `@deprecated` tags. Trade-off: deleting them is tidier; keeping them aids archaeology. Lean: keep the one-line history comments, delete only the `@deprecated` JSDoc tags and their props.
