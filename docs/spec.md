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
