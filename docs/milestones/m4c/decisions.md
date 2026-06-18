## ADR-017 — Time bricks use a real timer (BrickTimer)

**Status:** Accepted · 2026-04-29 · supersedes ADR-007

**Context.** The empty-toolkit pivot puts user-created routines at the center. Time bricks (e.g. "meditate 10 min", "deep work 90 min") need a real start/stop experience, not a `+/-` stepper. The spec § Logging Bricks (View Mode) explicitly says "Time → start/stop timer OR manual input".

**Decision.** Phase 1 implements a real timer:

- New component `components/BrickTimer.tsx`, sibling to `BrickStepper`. Goal bricks continue to use `BrickStepper`; tick bricks continue to toggle.
- Timer state is **timestamp-based** (`{ runningSince: epochMs | null, accumulatedSec: number }`), persisted to localStorage so a refresh or sleep doesn't lose the session.
- Display: `mm:ss` live counter. Controls: play / pause / reset, plus a manual override input that commits a value directly without running the timer (covers the spec's "OR manual input" branch).
- Only one timer can be running at a time across the app; starting a new timer pauses any other.

**Consequences.**

- Test IDs related to time-brick logging change shape: instead of asserting stepper increments, tests assert the timer commits accumulated seconds when paused. PLANNER will rewrite the relevant IDs.
- localStorage schema must include a `timers` map keyed by `${blockId}:${brickId}`.
- ADR-007's `+/-` stepper is retained for goal bricks only.

---
