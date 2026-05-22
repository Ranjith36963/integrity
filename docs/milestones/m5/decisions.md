## ADR-008 — Edit-mode `×` is always visible

**Status:** Accepted · 2026-04-29 · resolves SG-bld-01

**Context.** Spec mentions both "swipe left" and "× icon" for delete affordance.

**Decision.** `×` is always visible while in edit mode. No swipe gesture in Page 1 scope.

**Consequences.** Swipe-to-delete is deferred to a future feature if ever implemented. Touch surface for `×` must hit ≥44px.

---

## ADR-047 — M5 `currentDayBlocks` resolves `deletions` only; Day-view `appliesOn` wiring deferred

**Status:** Accepted · 2026-05-19

**Context.** M5's spec AC #11 reads: "Today-blocks resolution consults `deletions` — a block keyed in `deletions` for `currentDate` does not render that day, while `appliesOn` and all other days are unaffected." The M5 PLANNER discovered that the live Day view has **never** wired `appliesOn`: M9a (ADR — `appliesOn` recurrence resolver) shipped the pure resolver and its TZ-safe tests, but no milestone ever integrated it into the Day-view render — the Day view shows every block in `state.blocks` regardless of `recurrence`. The VERIFIER ruled on the AC #11 wording: the operative verb is "consults `deletions`"; `appliesOn` appears only in the "unaffected" clause, i.e. AC #11 requires `appliesOn` to be _not broken_, not _newly wired_.

**Decision.** M5 introduces a pure `currentDayBlocks(state)` helper that filters `state.blocks` by the `deletions` map **only** (a block keyed `` `${currentDate}:${blockId}` `` does not render on the current day). M5 does **not** wire `appliesOn` into the Day-view render. Integrating `appliesOn` so that the Day view honors per-block recurrence is a genuine, separate feature — it gets its own `/docs/spec.md` entry, not a silent rider on "Edit Mode + Delete."

**Consequences.**

- M5 scope stays "Edit Mode + Delete." `currentDayBlocks` is forward-compatible: a later milestone adds the `appliesOn` filter to the same helper without reshaping it.
- The pre-existing gap — the Day view ignores recurrence — is now explicitly recorded as open, not lost. Until that spec entry ships, a recurring block renders every day exactly as it does today.
- Reversible: if a future reading insists AC #11 mandated the `appliesOn` wiring, that is a new spec entry plus a superseding decision, not a quiet M5 expansion.
