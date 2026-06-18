## Milestone 7e — First-brick text card + brand-mark long-press easter egg + toasts

> **Pillars:** § 0.5 (interaction primitives — narrative beats are rare, surprising, and earned; the brand-mark is the secret door); § 0.7 (motion tokens — sheet-slide for the first-brick card, M0's `longPress` haptic + scale for the brand-mark); ADR-031 (≥44 px touch targets — the brand-mark long-press tappable area meets this); ADR-039 (Dharma ships empty — the first brick is genuinely the user's first); phase1plan § Polish Layer (M7 items: "First-ever brick added → text card slides in: 'Your Empire begins.'" + "Brand mark long-press → reveals hidden year heatmap preview" + "Toasts for confirmations").

### Intent

Three small narrative surfaces — each independent, each tiny, each ships together because none earns its own milestone:

1. **First-brick card** — the very first time the user dispatches `ADD_BRICK` (across all program history), a text card slides up from the bottom reading "**Your Empire begins.**" The card auto-dismisses after 3 s or on tap. It is a one-time event, persisted via a single boolean `firstBrickShown: true` so future bricks (or a reload) don't re-fire it.
2. **Brand-mark long-press easter egg** — long-pressing the top-bar brand mark (the "Dharma" wordmark) for 600 ms (M0's existing `longPress` threshold) reveals a year-heatmap preview overlay — same visual vocabulary as M9e's year view, scaled down, no interactivity. Releasing closes it.
3. **Toasts** — a global `<Toaster>` mounts at the body's bottom, subtle, auto-dismissing in 2 s. Toasts fire on: block created, block deleted, brick added, brick deleted. Each event already exists; M7e wires the toast emit at the action-dispatch boundary.

M7e is **render-layer + a single persisted boolean.** The `firstBrickShown` flag adds one field to the persisted state, requiring an additive migrator (no schema bump if it's added as optional with a default; PLANNER picks).

**What this is NOT:** a notification center, a toast queue with overlap rules (single-toast-at-a-time is fine — last-write-wins), a different visual treatment per toast type beyond color (success = accent, info = ink-dim, error = red — already in M0); revealing the heatmap on tap (long-press is the only entry); a "tutorial" or onboarding flow; a celebration on the first block (the first **brick** is the loud moment, not the first block).

### Inputs

- M0's `longPress` hook (`lib/longPress.ts`, 600 ms threshold) and its haptic.
- The existing `ADD_BRICK` action and the reducer hook.
- M9e's year-heatmap rendering (re-used in scaled-down preview).
- Existing `state` shape; M7e proposes adding an optional `firstBrickShown?: boolean` (default `undefined` ≡ false on read).

### Outputs

- `components/FirstBrickCard.tsx` — bottom-sheet-style card; visible iff `state.firstBrickShown !== true` AND the user has at least one brick. Slides in on first paint after the user adds their first brick; auto-dismisses after 3 s; tap-to-dismiss.
- The reducer (`lib/data.ts`) gains a side effect on `ADD_BRICK` that flips `firstBrickShown: true` the first time it dispatches (idempotent on subsequent calls).
- A persistence migrator (additive) so existing saved states default `firstBrickShown` to the value of "does this state already have any bricks?" — true if yes (don't surprise existing users), false if no.
- `components/BrandMarkLongPress.tsx` — wraps the existing top-bar brand mark; long-press (600 ms) shows a year-heatmap preview overlay; release closes it.
- `components/Toaster.tsx` — singleton mount; `toast(message: string, kind: 'success' | 'info' | 'error')` API; auto-dismiss 2 s; one toast at a time, last-write-wins.
- The four action dispatches that should emit a toast (block-add, block-delete, brick-add, brick-delete) call `toast(...)` at the dispatch site.

### Edge cases

- **User adds their first brick, reloads, adds another** → card already shown (persisted); does not re-fire.
- **User has existing saved state with bricks (migrator path)** → `firstBrickShown` migrates to `true` so they never see the card retroactively.
- **User has saved state with no bricks** → `firstBrickShown` migrates to `false` (or stays undefined); the next `ADD_BRICK` fires the card.
- **Long-press starts on brand mark but drifts off before 600 ms** → no overlay (M0 `longPress` already handles drag-cancel).
- **Long-press during sheet open** → the sheet's modal-open state blocks the long-press start (consistent with M5/M6 modal-blocks-interaction rule).
- **Toast on an action that was rolled back** (e.g., quota-exceeded ADR-018 path) → the toast emits the error variant; the rollback already runs in the reducer.
- **Multiple rapid actions** → only the latest toast is visible; the prior fades immediately. Acceptable per "subtle, single-toast".
- **`prefers-reduced-motion`** → first-brick card slides in with no spring (linear 200 ms); heatmap overlay opacity-fades only (no scale); toast slides collapse to instant appear/disappear.

### Acceptance criteria

**First-brick card**

1. The card mounts and slides in on the next paint after `ADD_BRICK` dispatches AND `state.firstBrickShown !== true`.
2. The card displays "Your Empire begins." in the spec'd display type scale.
3. The card auto-dismisses after 3 s, or on tap.
4. After dismissal, `state.firstBrickShown === true` is persisted; a reload does not re-show the card.
5. An existing saved state with at least one brick is migrated to `firstBrickShown: true` so the card never appears retroactively.

**Brand-mark long-press**

6. A 600 ms long-press on the brand mark opens a year-heatmap preview overlay; release closes it.
7. Drift cancels the long-press (no overlay).
8. The overlay re-uses M9e's year-heatmap rendering at reduced scale; no new third-party dependency.

**Toasts**

9. `toast(message, kind)` mounts a single bottom-anchored toast for 2 s; the next call replaces the current one immediately (no queue).
10. Block-add, block-delete, brick-add, brick-delete actions each emit a toast on successful dispatch with the appropriate message and kind.
11. A rolled-back action emits an error-kind toast.

**Reduced motion**

12. With `prefers-reduced-motion: reduce`, the card slide collapses to a linear 200 ms; the overlay opacity-fades; the toast renders instantly.

**Quality**

13. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: first-brick card fires once and never again; migrator covers all three "existing saved state" cases; long-press drift-cancel; toast last-write-wins; reduced-motion collapses.
14. E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; brand-mark long-press opens overlay on a real touch event; toast renders and dismisses on a real brick-add.
15. No regression to M1–M9e / M5b / M7a / M7b / M7c / M7d behavior.

### Open spec gaps (resolve at VERIFY)

- **SG-m7e-01 — `firstBrickShown` placement.** Add to top-level `AppState` (persisted) or to a separate "preferences" slice. Recommendation: top-level `AppState.firstBrickShown?: boolean`, additive migrator, no schema bump (optional fields with defaults are an additive change per ADR-044). PLANNER confirms; VERIFIER checks the migrator is lossless.
- **SG-m7e-02 — Heatmap overlay rendering.** Re-use M9e's year-view JSX directly vs. a scaled-down preview component. Recommendation: extract M9e's grid into a `<YearHeatmap size="full" | "preview">` prop, with M7e passing `"preview"`. PLANNER picks; VERIFIER checks no duplication.
- **SG-m7e-03 — Toast accessibility.** Toasts must be screen-reader-announced. Recommendation: `role="status"` for success/info, `role="alert"` for error; `aria-live="polite"` for success/info, `aria-live="assertive"` for error. PLANNER confirms; VERIFIER runs axe.
- **SG-m7e-04 — Toast position vs. dock + sheet.** The bottom dock and any open sheet must not occlude the toast. Recommendation: toast renders above the dock, below any open sheet; CSS z-index uses M0's modal/toast variables. PLANNER picks; VERIFIER checks visual stacking on iPhone 12 viewport.
