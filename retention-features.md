# Retention Features — discussion menu

> 14 candidates ranked by impact-per-dev-hour. Pick from this list when
> you're ready to start the next retention pass; nothing here is built yet.
> Companion to `paid-todo.md` (which lists what needs your wallet).

---

## How to read this list

Each item is rated on:

- **Effort** — my honest estimate in dev-hours assuming I'm building solo
- **Infra** — whether it needs external accounts/keys (see `paid-todo.md`)
- **Why it works** — the psychological / product mechanism

The retention thesis for Dharma is: **streak protection drives behavior
more than streak achievement**. Loss aversion is stronger than gain. So
the biggest unlocks are the features that surface RISK and rescue.

---

## Tier 1 — Quick wins (ship within a day each)

### R1. Streak surface in Hero

- **Effort:** ~2h
- **Infra:** none — uses existing `longestStreak` from `lib/insights.ts`
- **Surface:** below the "0% / 50%" hero numeral, render a small line: `5-day streak · 2 more for a week`
- **Why it works:** makes a streak feel real and reachable. Loss
  aversion = strongest retention driver. Users open the app to verify
  the number is still growing.
- **Acceptance:** the line appears under the hero ring whenever the
  current streak is ≥ 1; tomorrow's milestone (next multiple of 7) is
  always implied.

### R2. Risk surface — at-risk banner

- **Effort:** ~2h
- **Infra:** none — uses shipped Streak Freeze
- **Surface:** when today's score is 0 AND local clock is past 6pm,
  show a subtle banner above the timeline: `Don't break your N-day
streak.` Includes a one-tap `Use freeze` button if quota remains.
- **Why it works:** catches users at their highest-risk evening hour.
  Builds a habit of checking the app at 7-9pm (their "decision window").

### R3. Missed-day toast on app open

- **Effort:** ~2h
- **Infra:** none
- **Surface:** on app mount, if there's a gap between `state.currentDate`
  and the most recent history entry with score > 0, show a toast: `You
missed Tue. Use a freeze?` with one-tap accept.
- **Why it works:** re-engages returning users at exactly the moment
  they're thinking "did I break my streak?" Single-tap rescue keeps
  them in-app instead of bouncing.

### R4. Variable celebration + milestone moments

- **Effort:** ~2h
- **Infra:** none
- **Surface:** randomly pick from 4-6 different Fireworks variants on
  every day-complete. Special celebration animations + copy for streak
  milestones: 7 day ("First castle stands."), 30 day ("Kingdom rises."),
  100 day ("Empire takes shape."), 365 day ("A year of bricks.").
- **Why it works:** dopamine via unpredictability. Most habit apps fail
  here — the same animation every time gets tuned out within a week.

---

## Tier 2 — Structural retention (2–4 hours each)

### R5. Habit-stack templates on Welcome

- **Effort:** ~3h
- **Infra:** none
- **Surface:** after the brick-fall animation but before the CTA, ask
  "Pick a starting routine: Athlete · Founder · Student · Writer · Skip"
  Each template pre-populates 3 starter bricks for the user's first day.
- **Why it works:** activation lift. New users with 3 starter bricks
  log day-1 + day-2 at significantly higher rates than empty-state users.
- **Risk:** adds friction to the Welcome path. Mitigate with a clear
  Skip option.

### R6. Weekly recap card (Sunday auto-trigger)

- **Effort:** ~3h
- **Infra:** none — extends existing `lib/shareCard.ts`
- **Surface:** when user opens app on a Sunday for the first time of
  the day, show a card: `Last week: 5/7 buildings complete. Best brick:
Drink water. Worst: Read 10 pages.` With a Share button that
  generates a 1080×1920 PNG.
- **Why it works:** identity reinforcement + shareability → viral
  growth. Same playbook as Spotify Wrapped at week-scale.

### R7. Last-minute reminder (in-app, no push needed)

- **Effort:** ~2h
- **Infra:** none — runs in-app via `useNow()`
- **Surface:** at 11pm local, if today's score < 50%, render a sticky
  toast: `30 minutes left in today's building.` Subtle; auto-dismisses
  on first interaction.
- **Why it works:** catches procrastinators. The "deadline effect" is
  real: users who see a closing window log far more than those who
  don't.

### R8. Profile / stats page

- **Effort:** ~3h
- **Infra:** none for the page itself; shareable public profile (R14)
  requires auth.
- **Surface:** new route at `/profile` or accessed from Settings:
  - `Dharma since [programStart]`
  - `N buildings`
  - `Longest streak: X days`
  - `Top category: Y (Z% of all bricks)`
  - Copy-link button to share the snapshot
- **Why it works:** vanity surface. Users SCREENSHOT these and post
  them. Real organic-growth driver.

---

## Tier 3 — Bigger bets (~1 day each)

### R9. Block-template library

- **Effort:** ~4h
- **Infra:** none
- **Surface:** in `Add Block` sheet, before the form fields, show 6-8
  preset routine cards: Morning routine · Workout · Pomodoro ·
  Meditation · Reading · Coding session · Sleep prep · Custom. Tapping
  one pre-fills name + start + end + recurrence.
- **Why it works:** depth feature. Solves "what do I put in a block?"
  for users who don't know where to start.

### R10. Yesterday-only journal field

- **Effort:** ~4h
- **Infra:** none — additive schema field on ArchivedDay
- **Surface:** when the day rolls over at midnight (existing rollover
  flow), the prior day's archive gets a single optional `note: string`
  freeform field. PastDayDetail overlay surfaces it as a small textarea.
- **Why it works:** adds qualitative layer to quantitative streak. The
  strongest "open the app" hook in productivity research is journaling
  intent + reflection.

### R11. Goal-of-the-month commitment device

- **Effort:** ~3h
- **Infra:** none — additive schema field on AppState
- **Surface:** new setting "Build N habits this month" (user chooses
  N: 5/10/20). Month view shows progress: `7/10 habits built this month`
  with a visual bar.
- **Why it works:** forward-looking commitment device. Public
  commitment is a top behavioral lever.

---

## Tier 4 — Defer until paid infra ships

### R12. Push notifications

- **Effort:** ~1 day server + 1 day client
- **Infra:** REQUIRES — Apple Developer ($99/yr), APNs cert, Vercel
  Cron / Supabase Edge Function, Capacitor Push plugin
- **Surface:** opt-in toggle in Settings. User picks daily check-in
  time. Server-side cron sends "Time to lay today's bricks" + smart
  follow-ups based on miss patterns.
- **Why it works:** highest-impact retention tool in the entire
  category. Without it, web users churn ~70% week-one.
- **Blocked by:** `paid-todo.md` section 1 (Apple Developer Program).

### R13. Buddy / accountability mode

- **Effort:** ~3 days
- **Infra:** REQUIRES — Supabase (auth + realtime), email
- **Surface:** "Invite a friend" generates a short link. Both users
  see each other's streak counts (not block details — privacy default).
  Optional weekly digest email: "Your buddy completed 6/7 days last
  week. You: 4/7."
- **Why it works:** social proof + soft accountability. The most
  retentive Duolingo feature after streak is "friends competing."
- **Blocked by:** `paid-todo.md` section 4 (Supabase) + email infra.

### R14. Public shareable profile

- **Effort:** ~2 days
- **Infra:** REQUIRES — auth, domain, public route
- **Surface:** opt-in `dharma.app/u/yourname` read-only stats page.
  Same shape as R8 (profile) but publicly viewable + shareable.
- **Why it works:** identity-driven viral loop. Users who treat
  themselves as "a builder" post their profile to Twitter / LinkedIn.
- **Blocked by:** `paid-todo.md` section 3 (domain) + section 4 (auth).

---

## My honest recommended bundle

**Streak Health release** = R1 + R2 + R3 + R4 (~8 hours total).

Reasoning: all four reinforce each other.

- R1 surfaces the streak so it feels real
- R2 warns when it's at risk (using R1's data)
- R3 rescues missed days (using the shipped Streak Freeze)
- R4 celebrates milestones (which R1 now makes visible)

Together they make the Streak Freeze feature I just shipped actually
matter to users. Without them, freezes sit hidden in Settings and almost
nobody touches them.

**Next layer after Streak Health:**

- Pick **R5** (templates) if your focus is new-user activation —
  "more sign-ups stick"
- Pick **R6** (weekly recap) if your focus is week-over-week pull —
  "existing users open the app more often"
- Pick **R10** (journal) if your focus is qualitative depth — "the app
  becomes the place people reflect"

---

## What I'd NOT build first (and why)

- **R8 profile / R14 public profile** — vanity surface, low daily-use
  driver. Wait until you have 100+ active users so the screenshots
  feel real.
- **R9 block library** — solves a real problem (empty-canvas paralysis)
  but R5 (templates on Welcome) covers the same ground at a higher
  point in the funnel.
- **R11 goal-of-the-month** — adds a layer of commitment without a
  layer of execution support. Easy to set, easy to ignore.

---

_Last updated: 2026-06-23 by Claude. Update when items ship or get
rescoped. Each ID (R1, R2, …) is stable; reference them in commit
messages._
