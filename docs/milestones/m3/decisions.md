## ADR-005 — `dayPct` is equal-weighted

**Status:** Accepted · 2026-04-29 · resolves SG-bld-08

**Context.** Spec § Scoring: _"All equal weight."_ Initial implementation was duration-weighted (Hero showed ~26%); equal-weighted gives ~57%.

**Decision.** `dayPct = mean(blockPct(b) for b in blocks)`. No duration weighting at any aggregation level (Block, Building, Castle, Kingdom, Empire).

**Consequences.** Hero number changes when this ships — not a regression. Any future "weighted" view must be a separate function, not a replacement.

---

## ADR-007 — Time-brick logging is a stepper, not a timer

**Status:** Superseded by ADR-017 · 2026-04-29 · resolves SG-bld-02

**Context.** Spec says "start/stop timer OR manual input" for time bricks.

**Decision (original).** Phase 1 uses a `+/-` stepper. No real timer. Same component handles Goal and Time bricks.

**Consequences.** A real start/stop timer is a future feature, separate ADR when introduced.

**Why superseded.** The empty-toolkit pivot (2026-04-29) elevates time-brick logging UX. Users want a real start/stop timer for sessions of meditation, focus work, etc. ADR-017 captures the new decision.

---

## ADR-009 — Hero `%` is integer-only

**Status:** Accepted · 2026-04-29 · resolves SG-bld-07

**Context.** Spec doesn't specify decimals.

**Decision.** `Math.round` to integer everywhere we display a percentage. No decimal display.

**Consequences.** Tests assert exact integers, not approximate floats.

---

## ADR-016 — Tick brick `aria-label` includes the brick name

**Status:** Accepted · 2026-04-29 · proposed by EVALUATOR on Page 1 PASS

**Context.** A naive implementation would set `aria-label` to the raw status string (`"done"` or `"—"`). Goal/time bricks already include the brick name in their visible label.

**Decision.** Tick bricks construct `aria-label` as `"<name> done"` or `"<name> —"` (`components/Brick.tsx:41-42`). The visible text remains just the name — only the accessible name is enriched.

**Consequences.** Screen-reader users hear _which_ brick they're toggling. `U-bld-019` still tests the canonical `brickLabel()` strings (`"done"` / `"—"`); the aria-label augmentation lives in the component layer, not the utility.

---

## ADR-033 — Hero is single-% ring + per-category bar chart (not three rings)

**Status:** Accepted · 2026-05-05 · paired with ADR-032

**Context.** Apple Fitness's three-ring identity is iconic but requires a closed-set enum (Move / Exercise / Stand). ADR-032 chose user-defined N categories instead. With N rings impossible to draw for arbitrary N, the hero shape changes.

**Decision.** Hero = a single % ring on top showing overall day completion. Below the ring: a horizontal bar chart with one segment per user-defined category (width ∝ category brick count, fill ∝ category completion %). Per-category insight survives without the closed-set Apple Fitness aesthetic.

**Consequences.**

- M3 ("Add Brick + Live Scoring") plans a single-% count-up animation, not three concentric arcs.
- The bar chart is a separate component from the ring and ships in M3.
- Empty-day hero shows the ring at `0%` with no bar chart (zero categories engaged).
- The "three rings" aesthetic is sacrificed; Dharma's visual identity will lean harder on the spatial timeline + Empire view as iconic signatures.

---

## ADR-035 — Bricks can be inside a block OR standalone

**Status:** Accepted · 2026-05-05

**Context.** The 2026-05-05 design-pillar synthesis distinguishes two flavors of brick: bricks inside a block (sub-units of a ritual: "30 push-ups" inside Morning Workout) and standalone bricks (minor tasks with no parent: "Drink 2L water", "Take vitamin", "Stretch once"). Both are bricks; the only difference is whether they have a parent block.

**Decision.** Brick schema has `parentBlockId: string | null`. When `null`, the brick is standalone and renders in the **"Loose Bricks" tray** (location TBD; see `spec.md § 0.11`). When set, brick renders inside its parent block on the timeline. Same schema either way — no separate `BlockBrick` / `TaskBrick` types.

**Consequences.**

- Day score is the average across all top-level units (blocks + standalone bricks). Standalone bricks count equally with blocks for scoring purposes.
- M1 must allocate a render zone for the tray. Three options shortlisted (pinned above dock / bottom of timeline / top of timeline). PLANNER must lock before authoring M2 plan.
- M5 Edit Mode supports moving a brick between block-parent and standalone (drag from tray into block, or out of block into tray).
- An empty block (zero bricks) is still a valid scoring unit — see § 0.9 ("empty block → 0 or 1 boolean tick").

---
