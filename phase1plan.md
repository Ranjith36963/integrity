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
- Recurrence stored on block; rendered correctly across days when calendar nav lands (M9)
- Times overlap → soft warning, allow anyway (user's choice)

### Acceptance
- Block appears immediately after save
- Timeline reflows with new block in correct time position
- Day Blueprint bar adds a colored segment for new block
- Empty state disappears once first block exists

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
- Edit mode → tap × on block or brick OR swipe left
- Confirmation modal: "Delete this block?"
  - Just today
  - All recurrences
- Animation: block shrinks + fades, others reflow

### Acceptance
- Edit mode visually clear (jiggle + ×)
- View mode = no editing possible (no accidental deletes)
- Delete confirmation prevents mistakes
- Recurrence-aware delete works correctly

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

- localStorage schema:

  ```json
  {
    "version": 1,
    "blocks": [
      {
        "id": "uuid",
        "name": "string",
        "start": "HH:MM",
        "end": "HH:MM",
        "cat": "health|mind|career|passive",
        "recurrence": { "type": "weekday|daily|custom", "days": [1,2,3,4,5] },
        "bricks": [
          {
            "id": "uuid",
            "name": "string",
            "type": "tick|goal|time",
            "target": 100,
            "unit": "reps",
            "logs": [{ "date": "YYYY-MM-DD", "value": 80 }]
          }
        ]
      }
    ]
  }
  ```

- Migrations field for future schema changes
- All CRUD operations persist immediately
- Reload preserves state

### Acceptance
- Refresh keeps all data
- Schema versioned
- No data loss on edit/delete

---

## Milestone 9 — Calendar Navigation

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
