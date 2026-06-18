## ADR-006 — Half-open `[start, end)` block intervals

**Status:** Accepted · 2026-04-29 · resolves SG-bld-03

**Context.** What block does `currentBlockIndex` return when NOW exactly equals a block boundary?

**Decision.** Half-open `[start, end)`. The start time belongs to the new block; the end time belongs to the next block. Matches the existing implementation.

**Consequences.** At 04:00 (the day anchor), we are in _Wake ritual_, not still in _Sleep_.

---

## ADR-032 — Categories: user-defined, unlimited count

**Status:** Accepted · 2026-05-05 · supersedes `spec.md` "UX Spec — Phase 1 Toolkit § Categories"

**Context.** The original Phase 1 toolkit spec fixed four categories (Health / Mind / Career / Passive) with hardcoded colors. The 2026-05-05 design-pillar synthesis (`spec.md § 0`) changes this: users define their own categories at any count. No closed enum, no master list shipped with the app.

**Decision.** Block schema and standalone-brick schema both carry `category: string` (free text, user-managed). Categories are stored in user state, not enumerated in code. User adds / edits / deletes categories from settings; each category has a user-picked color. Pre-pivot blocks (none currently in the live data model) would default to a "general" category at migration time.

**Consequences.**

- The closed-set color list in the older spec section is **OBSOLETE**.
- This forces ADR-033 (single-% ring instead of Apple Fitness three-ring) — N rings cannot be drawn for arbitrary N.
- Per-category visualization is a horizontal bar chart below the hero ring, one segment per category (segment width ∝ brick count, fill ∝ category completion %). Layout uses CSS grid auto-flow; wraps gracefully for N > ~7.
- M2's Add Block sheet has a category picker that doubles as "create new category" affordance.
- M5's Settings sheet must include category management (rename, recolor, delete with reassignment prompt).

---

## ADR-034 — Blocks always timed; bricks never timed (SOFTENED by ADR-042)

**Status:** Partially superseded by ADR-042 (2026-05-14) · still authoritative for blocks · bricks-clause softened to "optionally timed via duration toggle"

**Context.** Earlier discussion explored "anytime blocks" (a block that has no scheduled time and lives in a separate tray). The 2026-05-05 design-pillar synthesis collapses this: every block has a time. Bricks never have a time of their own — a "Time"-type brick has a target _duration_, not a _schedule_.

**Decision (original 2026-05-05).** Block schema requires `start: string` ("HH:MM"), `end: string | null` ("HH:MM" or null). Brick schema has no time fields at all. The "Time"-type brick's `durationMin: number` is a target, not a clock-position; the brick's parent block (or the Loose Bricks tray) determines when.

**Decision (revised 2026-05-14, per ADR-042 + M4e).** Block clause unchanged. Brick clause softened: bricks gain an OPTIONAL `start`/`end`/`recurrence` triple gated by a user-controlled `hasDuration: boolean` toggle (default `false`). When OFF, bricks retain their original time-agnostic semantics. When ON, bricks carry the same time-window contract as blocks. The "Time"-type brick's `durationMin` retains its original meaning (performance target, not schedule) — orthogonal to the new `start`/`end` (allocated window).

**Consequences.**

- The Add Block sheet always asks for a start time. Default = current time slot, rounded.
- The daily page renders as a vertical spatial timeline (time labels left, blocks at their `start` position, height ∝ duration). **Per ADR-042: timed loose bricks also occupy timeline rows alongside blocks.**
- The "Anytime tray" concept (for blocks) is killed — that earlier suggestion is now obsolete.
- Bricks living outside a block live in a separate "Loose Bricks" tray — see ADR-035 + § 0.11 for tray-location TBD. **Per ADR-042: only loose bricks with `hasDuration === false` render in the tray; loose bricks with `hasDuration === true` render on the timeline.**

---

## ADR-036 — Add Block sheet uses plain forms in M2; inline parsing arrives in M7

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q3

**Context.** Three input methods for adding a block: tap timeline slot, floating `+`, voice (M10). The Fantastical-style inline natural-language parsing ("Run 6-7am daily" → form auto-fills as you type) is desirable but adds substantial scope to M2 (regex grammar over time tokens, real-time parsing UX). M2's existing scope (sheet UI + recurrence picker + brick adder + category picker + 3 brick types) is already large.

**Decision.** M2 ships explicit form fields only — Title, Start, End (optional), Recurrence picker, Brick adder, Category. Inline natural-language parsing is layered on in **M7 Polish** (regex grammar over time/recurrence tokens; no LLM). LLM-based parsing remains exclusive to M10 voice; not used for typed input ever.

**Consequences.**

- M2 stays focused instead of swelling.
- M7 polish gains a meaningful UX upgrade (the magic-typing experience).
- Voice (M10) keeps the LLM round-trip; typed input never depends on a network call.
- If users in the M2-M6 window beg for the magic-typing flow, it stays a feature ship in M7, not a re-prioritization.

---
