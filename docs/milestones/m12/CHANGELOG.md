# Changelog — M12 (Sci-fi chrome: the HUD layer)

## [unreleased]

### Fixed — Add Brick matches Add Block's glass-primary weight (`f1f1392`)

- In the add chooser, "Add Brick" rendered as a dim outline next to the glowing "Add Block" —
  but both are first-class creation paths, not a primary/secondary pair (per user). Both now use
  the `primary` (hud-glass) Button variant. Chooser tests green; zoom-verified in the browser.

### Changed — glass buttons everywhere: no more opaque amber slabs (`bf8d91e`)

- Per user feedback (screenshots of the solid "Day" tab pill + the solid "LOG" capsule): opaque
  amber slabs read as legacy against the instrument-panel chrome. One shared recipe —
  `.hud-glass-primary` / `.hud-glass-ghost` in `globals.css`: translucent amber tint, hairline
  amber border, amber ink, soft halo, backdrop blur — applied to every tappable primary/selected
  state: view-switcher selected tab, dock LOG pill + mic + add, Welcome primary CTA, block/brick
  sheet Save, `Button.tsx` primary variant, recurrence chips, Settings past-edit segments,
  cloud-backup banner, install prompt, new-category Save, running-timer chip.
- **Indicators stay solid** — the now-line, now-tag, category swatches, and score heat fills are
  data, not controls; solid amber there is signal.
- `Button.test.tsx` + `BottomBar.test.tsx` updated to the glass contract. 1868 vitest green;
  m5 + m7c a11y e2e green (amber-on-glass contrast holds); tab bar + dock zoom-verified.

### Changed — ONE instrument: the real HeroRing replaces the drawn centre copy (`5db0160`)

- User feedback on the live app: the day view showed **two** % readouts (standalone hero on top +
  the SVG-drawn copy inside the clock) and the in-clock copy was too small. Now the actual
  `<HeroRing>` — 72px italic numeral, M7c count-up tween, polite live region, progress arc,
  orbital motes — mounts as an overlay in the day clock's centre hole (`pointer-events: none`, so
  the block arcs stay tappable), and the standalone top ring is gone (`Hero` gains
  `ring={false}`; the date/day-number metadata stays). Tapping an arc hides the hero and shows
  the block's name + time in the hole. `firstPaintCountUp` threads to `DayRing`.
- Because the embedded ring IS the original component, its whole tested contract survives:
  m7c count-up + CLS + a11y specs and m3 hero specs pass unmodified — except `E-m3-013`, whose
  page-wide `circle[stroke-dasharray] .first()` selector now landed on the clock's orbit circles;
  retargeted to the `hero-ring-circle` testid (behavior unchanged). The 6 remaining m3 tray
  failures **pre-exist on main** (proven by stash-rerun) and are unrelated. 1868 vitest green.

### Added — the hero ring lives inside the day clock (`4eff716`)

- Per the user's mock (hero-% image composited into the clock image): the Hero instrument —
  italic display-serif numeral, slow amber dashed orbit, two glowing data motes on the orbit —
  now renders inside the day clock's centre hole (orbit r=48 inside the R_INNER=74 hole), so the
  day score and the 24h clock read as **one** HUD instrument. A faint band sits behind the orbit;
  the orbit + motes ride the existing `dayring-spin-cw` rotation (PRM-safe). The old centre pivot
  dot, which collided with the numeral's descender, is removed. 1868 vitest green; zoom-verified
  in the browser.

### Added — data-glow on all four views + the magic link returns as secondary (`ef655fc`)

- **The glow is the data.** Scored cells across Week (day rows), Month (day cells), and Year
  (month cells) now emit an amber glow whose radius and strength scale with the score — a strong
  day literally radiates in the grid. Insight-strip numerals (Avg score / Complete / Streak) glow
  when non-zero and stay dark at zero, same honesty rule. Day view's "day complete" and "day
  blueprint" labels get the HUD annotation tick (new reusable `.hud-tick`).
- **Both sign-in paths offered** (per user request). Password stays primary — it works in every
  browser. "Prefer no password? Email me a sign-in link" returns as a secondary under both forms
  (Welcome + Settings cloud), via `signInWithMagicLink` (OTP + `emailRedirectTo`, implicit flow so
  the link signs in whichever browser opens it — the sent-state copy says exactly that, since the
  mobile in-app-browser trap is why password is primary). Tests: `Welcome.test.tsx` (+1: secondary
  link present, enabled by email alone). 1868 vitest green; screenshot walk re-verified.

### Added — HUD layer: the chrome joins the sci-fi language (`9fdc706`)

- The calendar rings already spoke sci-fi (orbital dashes, amber glow, motes); the CHROME —
  sheets, forms, settings — was default HTML. This pass extends the language app-wide, tied to
  the drafting-table metaphor rather than generic sci-fi:
  - **`.hud-panel`** — amber _blueprint registration marks_ (corner brackets) on every sheet
    (added once to the shared `components/ui/Sheet.tsx`, so Settings/AddBlock/AddBrick/Chooser/
    UnitsEntry all inherit) and on the Welcome sign-in card (now a framed instrument panel on
    `--surface-1`).
  - **Powered focus** — one global rule (`input/select/textarea:focus-visible`) gives every text
    field an amber focus ring + soft outer halo, replacing the browser default.
  - **`.hud-scanlines`** — 3%-ink 3px-pitch glass texture on sheet surfaces.
  - **Annotation ticks** — every Settings section label gets a leading 10px amber dash
    (`.settings-sections section > h3::before`), like blueprint annotations.
  - **`.hud-power-in`** — a one-shot glow pulse on the ✓ when the signed-in state mounts.
    PRM-safe (inside `prefers-reduced-motion: no-preference`).
- All in `app/globals.css` + class hooks; no component logic changed. Verified by re-running the
  screenshot walk (`tests/e2e/_design-audit.spec.ts`): corner marks, ticks, focus glow, and
  scanlines all visible at 430px; calendar views untouched.

### Fixed — day ring was invisible to screen readers' interaction model

- Surfaced while verifying this pass: the day-clock svg was `role="img"` while containing
  tappable `role="button"` arc paths — axe `nested-interactive` (serious), an image may not have
  focusable descendants, and screen readers may never announce the arcs. Now `role="group"`
  (same `aria-label`). `tests/e2e/m5.a11y.spec.ts` 3/3 green (was 3/3 red on main — pre-existing,
  proven by a stash-and-rerun). 1867 vitest green.
