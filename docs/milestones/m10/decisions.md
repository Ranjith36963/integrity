## ADR-037 — Voice mic ships in M10 (late, not early)

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q4

**Context.** Voice was considered for an early slot (M5/M6, right after Add Block + Add Brick + Live Scoring) on the argument that "the killer feature should ship as soon as there's something to log into." Counter-argument: every other foundation (calendar nav, persistence, polish) is fragile until shipped, and AI cost + latency in beta is a real risk if voice lands before the rest is solid.

**Decision.** Voice mic stays at **M10**, the final phase-1 milestone. M2–M9 ship without voice. The mic is a placeholder visual through that period.

**Consequences.**

- Phase-1 milestone order in `phase1plan.md` is unchanged.
- Demos through M9 use the typed Add Block flow only — accepted compromise.
- M10 builds on a fully polished foundation, so its API integration risk is isolated.
- SG-bld-19 (voice failure-mode handling) is still required at M10; defer its resolution to M10 SPEC.

---
