## Milestone 0 — Design System

### Intent

Build the foundation. Tokens + 10 primitives + motion vocab.

This ships before any feature. Every later milestone composes from these primitives. No reinvention. No drift.

This is what stops Dharma looking like AI slop. Locked aesthetic. Sharp. Distinctive.

### Inputs

**Tokens**

- Colors: `--bg`, `--bg-elev`, `--ink`, `--ink-dim`, `--accent`, `--accent-deep`, 4 category colors
- Typography: Instrument Serif Italic (display) + JetBrains Mono (UI) + Geist Sans (body)
- Type scale: 10 / 12 / 14 / 16 / 22 / 32 / 64
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48
- Motion: tap, brick fill, block bloom, modal open/close, FLIP, long-press, stagger
- Haptics: light / medium / success / notification

**Primitives (10)**

1. `<Button>` — primary (amber), secondary (outline), ghost
2. `<Modal>` — bottom sheet, spring open
3. `<Sheet>` — full-screen for forms
4. `<Chip>` — categories, recurrence
5. `<Input>` — text, time, number
6. `<Stepper>` — +/- with momentum on long-press
7. `<Toggle>` — edit mode lock/unlock
8. `<EmptyState>` — pulsing card
9. `<BlockCard>` — block container variant
10. `<BrickChip>` — 3 sub-variants: tick / goal / time

**Constraints**

- WCAG AA contrast on dark bg
- Mobile-first, max-width 430px
- Touch targets ≥ 44px
- Dark mode only
- Framer Motion (layout enabled) for all motion
- Reduced motion respected globally

### Outputs

- `/app/_design/page.tsx` — primitives harness page rendering all 10 primitives in every state
- `/app/globals.css` — CSS variables for every token
- `/app/layout.tsx` — `next/font` wiring for Instrument Serif Italic + JetBrains Mono + Geist Sans
- `/lib/motion.ts` — motion tokens (durations, easings, spring configs)
- `/lib/haptics.ts` — haptic helper with iOS/Android fallback
- `/components/ui/*` — 10 primitive components, exported
- `/components/ui/index.ts` — barrel export
- Storybook-style states: default, hover, active, disabled, loading, empty, error (where applicable)
- axe-clean output across the harness page (zero violations)
- Lighthouse a11y score 100 on harness page

### Edge cases

- **prefers-reduced-motion** → all motion tokens collapse to instant transitions; FLIP becomes hard-cut; bloom becomes static glow
- **430px viewport** → every touch target ≥ 44px; primary actions reachable one-handed (bottom-anchored)
- **Token contrast** → `--ink-dim` (`rgba(245,241,232,.5)`) on `#07090f` bg passes WCAG AA for body text; verified with axe
- **Empty / loading / error states** → every primitive that holds data has all 3
- **Long-press accelerator on Stepper** → caps at 10x speed to prevent runaway
- **Modal/Sheet on iOS Safari** → respects safe-area insets (bottom notch)
- **Font loading** → swap fallback (Geist → system UI) prevents FOIT
- **Haptics on iOS PWA** → graceful fallback (silent no-op on unsupported)
- **Dark mode only** → light-mode tokens not defined; document why in design system README

### Acceptance criteria

- All 10 primitives render on `/app/_design/page.tsx` with every documented state
- CSS variables defined for every token in spec
- Fonts load without FOIT/FOUT
- axe-clean (zero violations) on harness page
- Lighthouse a11y = 100 on harness page
- 60fps scroll on iPhone 12+ (verified via Playwright trace)
- prefers-reduced-motion honored across all primitives
- Touch targets ≥ 44px verified by Playwright pixel-measurement test
- TypeScript strict, zero errors
- ESLint zero warnings
- All Vitest unit tests for primitives pass
- All Playwright e2e tests for harness page pass
- README in `/components/ui/README.md` documents each primitive: props, variants, when to use, when not to use

---
