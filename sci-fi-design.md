# Sci-fi 2036 redesign — design plan

> Brief: "Imagine it's 2036. Hollywood sci-fi level. Keep the brick→
> block→building→castle→kingdom→empire metaphor. Don't make it generic
> cyberpunk." — User, 2026-06-23.
>
> This file is the design source-of-truth. Tier-1 ships in commit
> `sci-fi-phase-1`. Tiers escalate from there.

---

## Subject (pinned)

**Dharma is the command surface for a person constructing their life.** Each day is a building. Each brick is a habit logged. The user is not a customer — they're the **architect of an empire** they're building one day at a time.

The page's single job: show the user their day-in-progress and let them lay/log a brick in under 2 seconds.

The right sci-fi reference isn't cyberpunk (hostile, neon, chaotic). It's the calm command surfaces of **Foundation, Severance, Dune (Villeneuve), Interstellar's cockpit, and Apple Vision** — restrained, technical, optimistic. The signal is "you are running mission control on a beautiful machine."

---

## AI-default sci-fi clusters I'm REJECTING

1. **Cyberpunk neon** — cyan + magenta grids on black, Tron-style. Every AI sci-fi mock looks like this. Hostile, busy, dated.
2. **Matrix terminal** — green-on-black falling code. Lazy.
3. **Mass Effect HUD chrome** — corner brackets + targeting reticles + frame everything. Reads as a video game.
4. **Translucent glass everywhere** — every panel blurred and frosted. Apple Vision but cheap.

**Why I'm rejecting them**: they don't serve the subject (calm intentional habit-building). They're recognizable as "AI-generated sci-fi" within 0.5s.

---

## The signature (where I spend all boldness)

> The **Construction Reactor**: the hero ring becomes a live ambient signature.
> Three layers compose into one motif that lives on every screen.

**Layer 1 — the ring**: orbital data stream. The amber-filled arc is no longer static; subtle particle dashes flow along the stroke (think: stars orbiting at the Lagrange point of the % numeral). 1.5s rotation period. Slows when at-risk, accelerates briefly on each new brick logged.

**Layer 2 — the numeral**: the italic-serif `0%` / `50%` stays as-is in face + scale (this is sacred Dharma DNA), but gains a 1px tabular-numeric width-lock and a faint subpixel scan-shimmer when the value transitions.

**Layer 3 — ambient orbit particles**: 3-5 tiny amber motes circle the ring at varying radii, fading in/out. They're the user's "active bricks" — the bricks they've logged today are literally orbiting their own day.

**One sentence**: the hero becomes the small machine that is building the user's life, calmly, in front of them.

---

## Color — restrained palette (already 80% there, just escalating)

Current → Sci-fi 2036:

| Token             | Now       | Sci-fi 2036                           | Why                                                                                              |
| ----------------- | --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `--bg`            | `#07090f` | unchanged                             | Already correct — deep void                                                                      |
| `--bg-elev`       | `#0c1018` | unchanged                             | Already correct — raised panel                                                                   |
| `--ink`           | `#f5f1e8` | unchanged                             | Off-white = "exposed bulb" not "office paper"                                                    |
| `--accent`        | `#fbbf24` | `#fbbf24` + **glow**                  | Amber stays. ADD `--accent-glow` and `--accent-bloom` for layered drop-shadows.                  |
| NEW `--ember`     | —         | `#f59e0b` → `#7c2d12` radial gradient | The "reactor core" radial behind hero                                                            |
| NEW `--scan`      | —         | `rgba(245, 241, 232, 0.014)`          | Body-overlay 2px horizontal scanlines, almost-invisible                                          |
| NEW `--data-cyan` | —         | `#67e8f9`                             | ONLY used on data-stream particles when a brick is mid-saving. NEVER large surfaces — restraint. |

**Total color count stays at ~7.** The sci-fi feel comes from the GLOW LAYERS on the same colors, not from adding new ones.

---

## Typography — surgically tighten

- **Display (Instrument Serif italic)**: kept — but with `font-feature-settings: "tnum"` so digits are tabular. No more digit width-jump when 0% → 10%.
- **UI (JetBrains Mono)**: kept — but bump `font-variation-settings` to slightly heavier tracking on tab labels for HUD feel.
- **NEW small numeric — `font-variant-numeric: tabular-nums slashed-zero`**: applied to every numeric chip (insight cards, day counter, streak count, time labels). The slashed-zero is the small detail that screams "this is a terminal not a Word doc."
- **NEW callsign formatting**: instead of "Building 1 of 365," surface a system chip: `DAY ⌬ 001 / 365`. The `⌬` (Unicode U+232C "benzene ring") is the brick-stack glyph — recognizable, distinctive, monospace-aligned.

Microcopy reframe risk: changing the text "Building 1 of 365" breaks `BuildingClient.test.tsx` tests. Defer until tests are updated.

---

## Motion — disciplined, with one set piece

**Ambient (always-on, idle)**:

- Hero ring orbital dashes — 1.5s period, pure CSS `@keyframes` on `stroke-dashoffset`
- Scan-line overlay — 8s vertical drift, 1.4% opacity, near-imperceptible
- Body grid — slight `background-position` drift over 60s

**Trigger moments (rare, intentional)**:

- Brick log: amber particle scatter → coalesce into the new chip (450ms, framer)
- Day complete: timeline transforms into "skyline glow" sweep
- Sheet open: **iris transition** — `clip-path: circle()` morph from tap point to full screen (320ms)
- Sheet close: reverse iris back to tap origin
- Tab switch: ripple pulse from selected tab outward (200ms)

**One set piece (the bold moment)**:

- 100-day streak unlocks the "Empire Glimpse" — a 4-second cinematic where the timeline transforms into a glowing city skyline silhouette built from the user's actual blocks. Then collapses back. Once.

**Reduced-motion respected**: every ambient + trigger gets a `@media (prefers-reduced-motion: reduce)` no-op fallback. Already wired in globals.css.

---

## Layout — minimal changes (existing wireframe is right)

What I'm KEEPING:

- 430px mobile-first
- Top tab strip (Day/Week/Month/Year)
- Hero ring centered
- Timeline below, dock above bottom safe-area
- Settings + Welcome as sheets

What I'm ADDING:

- **System chip top-left**: `ARCHITECT ⌬ MON JUN 22` — replaces the plain `DHARMA` wordmark area with a tiny HUD status line. Optional. Phase 3.
- **Reactor core** behind hero ring — radial-gradient layer that glows brighter as % grows
- **Data-stream NowLine** — the amber horizontal line gets 3 amber motes traveling left-to-right, restarting every 8s. The "now" moves.

---

## ASCII wireframe — what changes vs. now

```
NOW                                    SCI-FI 2036
─────────────────────────              ─────────────────────────
 Day | Week | Month | Year              [DAY · WEEK · MONTH · YEAR]
                                          (ripple on select)
 ┌─────────────┐
 │ DHARMA  ▏ ⚙  ▏ ✎ │                   ◳ ARCHITECT · MON JUN 22  ⚙
                                          (sys chip top-left)
 MON, JUN 22
 Building 1 of 365                       DAY ⌬ 001 / 365
                                          (callsign, slashed-zero)
        50%                            ╭────╮
       ╱    ╲                          │ 50%│  ← orbital particles
                                       ╰────╯     ring + data-stream
  Day complete                          BLDG STATUS · LIVE
                                          (chip)
  ━━━━━━━━━━━━━━━━━                    ━━━●━━━━━━━━━━━━━━━━━━━
  (blueprint segment bar)               (motes flowing L→R)

  09:00 ──────────                      09:00 ─────────●─────
  ▏ Morning Pages                       ▎ Morning Pages
                                          (1px luminescent left rule)
```

---

## Phased build plan

### Phase 1 — Atmosphere (~2h, ships now)

Foundation layer. Adds the ambient sci-fi feel without touching any feature logic.

1. New design tokens in `globals.css`:
   - `--accent-glow`, `--accent-bloom`, `--ember-core`, `--scan-tint`
2. Body scan-line overlay (fixed, near-invisible, animated drift)
3. Body grid + radial ember at hero region
4. `font-variant-numeric: tabular-nums slashed-zero` on every numeric label
5. Reactor core radial behind hero ring
6. Ambient orbital particles around hero ring (CSS-only, 3 motes)

### Phase 2 — Hero signature (~3h)

7. Hero ring stroke-dasharray dashes that orbit
8. Data-stream particles on NowLine (3 amber motes flowing L→R, 8s loop)
9. Iris transition for Sheet open/close (replaces slide)
10. Tab switch ripple

### Phase 3 — Power-user surface (~3h, SHIPPED in commit `feat(scifi-phase-3-cmdk)`)

User dropped research (2026-06-23) synthesizing Apple Liquid Glass +
Material 3 Expressive + expert UX + sci-fi/FUI patterns. The biggest
gap identified: no command palette. Productivity power-users live on
⌘K (Superhuman, Linear, Notion, VS Code, Raycast). Pivoted Phase 3.

11. **⌘K command palette** — global ⌘K / Ctrl+K opens; fuzzy filter +
    arrow-key navigation + recent commands surface first; liquid-glass
    overlay (backdrop-blur with contrast fallback via prefers-reduced-
    transparency); shortcuts shown inline. Sci-fi framing: the
    "ship command line" — architect speaks intent to the construction
    machine.
12. Numeric shortcuts 1/2/3/4 → Day/Week/Month/Year (input-aware guard).
13. Freeze-today as a palette command (uses shipped freeze infra).

### Phase 4 — Set pieces (~3h, NEXT)

14. Brick log particle scatter → coalesce
15. Day-complete skyline sweep
16. 100-day streak "Empire Glimpse" cinematic
17. System chip + callsign formatting (with test updates)

---

## Research integration (2026-06-23 — Apple / Material / Sci-fi / UX)

The user delivered a cross-domain synthesis. Patterns I'm BORROWING
from each, with my rationale:

**From Apple Liquid Glass (iOS 26)** — translucent layered surfaces
ONLY on overlays (command palette + future sheets where it fits). The
research flagged the readability trap: translucency makes text blend
into busy backgrounds. Mitigation: contrast fallback via
`@media (prefers-reduced-transparency: reduce)`, plus we already keep
the panel `--bg-elev` opaque underneath the blur layer.

**From Material 3 Expressive** — spring motion is on my radar for
Phase 4 (Framer Motion spring presets replacing the cubic-beziers on
the brick-log moment). Shape morphing (square → pill on state) is a
candidate for the tab strip — already 50% there with the active-pill.

**From Expert UX** — ⌘K command palette (Phase 3 ships this), inline
shortcut hints (Phase 3 ships this on every palette row), confirm
every command (toast already does this), recent-first ranking (Phase
3 ships this with localStorage dharma:command-palette-recent). Not
yet: command palette also covers Add Block / Brick / settings — easy
follow-up.

**From Sci-fi / FUI** — restrained palette (already 80% there),
monospace accent (already JetBrains Mono on UI), tactile haptics
(already wired). The pattern I AM NOT borrowing: cut-corner labels

- targeting brackets — they read as "video game HUD," not "calm
  command surface." The user's research itself flagged spectacle ≠
  usability.

**The synthesis my build now hits**: dark functional-futuristic base +
spring-able motion + ⌘K command palette + Liquid Glass on overlays
only.

---

## Quality floor (non-negotiable)

- Every animation has a `prefers-reduced-motion: reduce` no-op
- Every new color passes WCAG AA contrast on `--bg`
- Tap targets stay ≥44×44
- No layout shift on first paint (skeleton handles it)
- Lifecycle audit (`npm run test:lifecycle`) stays at 0 anomalies
- Feature audit (`npm run test:audit`) stays at 42/42

---

_Phase 1 ships first. Each subsequent phase is its own commit with the
phase number in the message: `feat(scifi-phase-N): ...`_
