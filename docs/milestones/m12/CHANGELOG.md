# Changelog — M12 (Sci-fi chrome: the HUD layer)

## [unreleased]

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
