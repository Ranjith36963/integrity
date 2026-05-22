## ADR-011 — `--ink-faint` text shifted to `--ink-dim` for WCAG AA

**Status:** Accepted · 2026-04-29 · resolves A-bld-003

**Context.** `--ink-faint` (#64748b) on the card background fails WCAG 2.1 AA (4.5:1) for small text.

**Decision.** Small text that previously used `--ink-faint` now uses `--ink-dim` (#94a3b8). The `--ink-faint` token still exists for non-text uses (dashed borders, etc.).

**Consequences.** The `plan.md` token-assignment table is slightly out of sync; future plans should cite this ADR. Any new small text must use `--ink-dim` or brighter, never `--ink-faint`.

---

## ADR-028 — `<Toggle>` uses `role="switch"` + `aria-checked` (not `aria-pressed`)

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `docs/tests.md` C-m0-014 was loose ("`role="switch"` (or `<button aria-pressed>`)"). The two patterns are not equivalent: ARIA APG specifies `aria-checked` as the state attribute for `role="switch"`, while `aria-pressed` is for `role="button"` toggle pattern. Mixing them is invalid.

**Decision.** `<Toggle>` uses `role="switch"` + `aria-checked={boolean}`. `aria-pressed` is reserved for future toggle-buttons that are NOT switches (none in M0). C-m0-014 was updated during the M0 build to assert `aria-checked`.

**Consequences.**

- Future PLANNER must specify `aria-checked` for switch components and `aria-pressed` for button-style toggles. Never both, never the wrong one.
- The "or" branch in C-m0-014's spec text is retired; future test IDs must commit to one ARIA pattern.
- No code change going forward — the pattern is set.

---

## ADR-029 — `next.config.ts` sets `devIndicators: false` to keep dev toolbar out of touch-target tests

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** Next.js 16 dev mode injects a small floating "dev toolbar" UI into the rendered DOM. Several elements in that toolbar fall below the 44 px touch-target threshold mandated by spec.md M0 § Edge cases. The Playwright test E-m0-003 (touch-target sizing) measured every visible interactive element on `/design` and would fail in dev because of the framework's injected UI, even though no Dharma component was at fault.

**Decision.** `next.config.ts` sets `devIndicators: false`. This is a **dev-only** setting — production builds are unaffected (the toolbar never ships).

**Consequences.**

- E-m0-003 only sees Dharma's primitives, not framework UI.
- Future test authors don't need to filter dev-toolbar selectors out of touch-target queries.
- If a future Next.js version moves the toolbar into a different mechanism, this ADR may need a follow-up.

---

## ADR-030 — Design-system harness lives at `/design` (no underscore)

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `phase1plan.md` and `docs/plan.md` § M0 specified the harness route as `/app/_design/page.tsx`, on the assumption that an underscore-prefixed directory is private/non-routable in Next.js. That convention is for the **Pages Router**. The **App Router** (which this project uses per ADR-001) treats `_`-prefixed directories as private folders that produce **no route at all** — so `/_design` would 404.

**Decision.** The harness route is `/app/design/page.tsx`, exposed at `/design`. Privacy from production nav is enforced by **absence of any link to it** (the route exists but no UI references it), not by directory name.

**Consequences.**

- Future PLANNER dispatches must NOT prefix harness/private-route directories with `_` in App Router projects.
- If a future need arises to truly hide the route from build output, use a `route.ts` with conditional 404 in production, OR a separate `dev`-only entrypoint, OR move it under `(dev)/` route group with a guard. Don't rely on directory naming.
- Dev-only fences should be enforced at the route handler level, not via folder naming.

---

## ADR-031 — Button `size="sm"` keeps `min-h-[44px]` for touch-target compliance

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `docs/plan.md:311` cva snapshot specified `sm: "h-9 px-3 ..."` (36 px high), but `docs/spec.md` M0 § Edge cases mandates touch targets ≥ 44 px on mobile. BUILDER honored the spec by setting `min-h-[44px]` on `sm` (and tightened C-m0-002's size→height table accordingly).

**Decision.** `<Button size="sm">` uses smaller padding/font (per cva visual spec) but enforces `min-h-[44px]` so the rendered control still meets the touch-target floor. The visual `sm` is "compact" in horizontal density only.

**Consequences.**

- Plan vs. spec drift was resolved spec-wins. Future plan.md cva snapshots that contradict spec acceptance criteria default to spec.
- `components/ui/Button.tsx` and the C-m0-002 test reflect the floor; the `components/ui/README.md` size table (currently shows `h-9` etc.) must be updated by SHIPPER or in an early M1 follow-up.
- If a future spec relaxes the 44 px floor (e.g., for a dense desktop view), it must be a deliberate spec amendment, not a silent plan change.

---
