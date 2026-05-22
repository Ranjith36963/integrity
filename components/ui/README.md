# UI Primitives — M0 Design System

All 10 primitives are dark-mode-only. Phase 1 ships dark-mode-only because
the routine-tracker context (early morning, late night, focus modes) is
dark-dominant; light mode adds testing and design surface area without proven
user demand. Reconsider at Phase 2.

## Legacy token note

Old Page-1 vars (`--card`, `--card-edge`, `--ink-faint`, `--amber`, etc.) are
kept in `globals.css` for backward-compat. M1 will alias them to the M0 vars.
M5 will remove the duplicates. Do **not** use the legacy vars in new M0+
components — use `--bg-elev`, `--ink-dim`, `--accent`, `--cat-*` instead.

## Primitives

### Button

- `variant`: `"primary" | "secondary" | "ghost"`
- `size`: `"sm" | "md" | "lg"`
- `loading`: shows spinner, sets `aria-busy="true"`
- `disabled`: prevents interaction, applies opacity
- All sizes enforce `min-w-[44px]`; sm=h-9, md=h-11, lg=h-12

### Modal

- `open`: controls visibility (portal renders when open)
- `onClose`: called on backdrop click or ESC
- Bottom-sheet variant; `padding-bottom: var(--safe-bottom)` for iOS home indicator

### Sheet

- Same close affordances as Modal
- Full-screen takeover ≤430px via `data-variant="full"`
- `padding-bottom: var(--safe-bottom)`

### Chip

- `tone`: `"neutral" | "category-health" | "category-mind" | "category-career" | "category-passive"`
- `selected`: filled bg vs outlined
- `size="sm"`: wrapped in `min-h/w-[44px]` span for hit area

### Input

- Controlled: `value` + `onChange(value: string)`
- `error`: shows error text, sets `aria-invalid="true"` and `aria-describedby`
- `type="number"`: sets `inputMode="numeric"`
- Height: `h-11` (≥44px)

### Stepper

- `value`, `onChange(next: number)`, `min`, `max`, `step`
- Long-press accelerates from 1× to 10× over 1.5s
- `haptics.light()` on each commit

### Toggle

- iOS-style switch
- `aria-pressed`, `role="switch"`, `aria-label` from `label` prop
- 44×44 hit area via `h-11 w-11`

### EmptyState

- `pulse`: pulsing animation; disabled when `usePrefersReducedMotion() === true`
- Optional CTA via `actionLabel` + `onAction`

### BlockCard

- `status`: `"past" | "current" | "future"` — drives `now-glow` / `opacity-55`
- `editMode`: shows `×` delete affordance (ADR-008)
- `pct`: drives scaffold-bar fill height

### BrickChip

- Discriminated by `kind`: `"tick" | "goal" | "time"`
- `tick`: checkbox visual, toggles on click
- `goal`: fill bar + inline stepper popover
- `time`: SVG ring fill + `aria-valuenow`
- All meet 44px via `min-h-[44px]`
- `editMode` + `onDelete`: × button appears, chip body becomes non-interactive
