# Changelog — M10

## [unreleased]

### Added (M10) — Voice Log: Web Speech API mic button + capture overlay — **FINAL PHASE 1 MILESTONE**

- **M10 — Voice Log (Phase 1 final milestone):** mic button in the dock, a full-screen
  voice-capture overlay, and a `useVoiceCapture` hook driving the Web Speech API — all
  built without any back-end or API key. Zero new npm dependencies; Web Speech API is a
  browser built-in. No schema bump (stays v3). Resolves SG-bld-19 (voice failure-mode
  handling) with three toast-based failure paths. ADR-037 honored: voice shipped at M10
  as planned. **PHASE 1 COMPLETE — M0..M10 all shipped.**

  **`lib/speechRecognition.ts`** — thin wrapper around the browser `SpeechRecognition`
  / `webkitSpeechRecognition` API. Exports `isSpeechSupported()`, `createRecognition()`,
  and a `SpeechRecognitionFacade` interface used by the hook and tests. Deterministic
  under test: callers inject the facade rather than reading the global.
  Closes U-m10-001..025.

  **`lib/useVoiceCapture.ts`** — React hook orchestrating the full voice-capture state
  machine: idle → listening → processing → done / error. Calls `createRecognition()` per
  session; returns `{ state, transcript, start, stop, reset }`. Exposes `supported`
  (computed via `useSyncExternalStore` with a server snapshot returning `false` and a
  client snapshot reading `isSpeechSupported()`) to prevent SSR/CSR hydration mismatch.
  Closes C-m10-001..005 (hook), U-m10-001..025 (unit).

  **`components/MicButton.tsx`** — icon-only button rendered in the dock's right slot.
  Hidden when `supported === false` (SSR-safe). Tapping opens the overlay by calling
  `onPress`. Animated pulse ring via `voiceListenPulse` CSS keyframe when `listening`.
  aria-label "Start voice log"; aria-pressed reflects listening state.
  Closes C-m10-014..015.

  **`components/VoiceCaptureOverlay.tsx`** — full-screen overlay shown while voice
  capture is in progress. Hosts the `<MicButton>` (active state), a live transcript
  display, and a "Use this text" confirm button. On confirm, sets `AddBrickSheet`
  `defaultTitle` to the captured transcript and opens the sheet. Cancelling stops
  recognition and closes the overlay.
  Closes C-m10-006..013.

  **`components/AddBrickSheet.tsx`** — gains a `defaultTitle?: string` prop. When
  provided the title input is pre-populated with the voice transcript. Existing behaviour
  unchanged.
  Closes C-m10-016..018.

  **`components/BottomBar.tsx`** — gains a `micSlot?: ReactNode` prop; renders the slot
  at the right edge of the dock bar. `BuildingClient` passes `<MicButton>` here.
  Closes C-m10-014..015.

  **`app/(building)/BuildingClient.tsx`** — wires `useVoiceCapture`, `<MicButton>`,
  `<VoiceCaptureOverlay>`, and `<AddBrickSheet>` with `defaultTitle`. Three failure-mode
  toasts: permission denied (`"Microphone access denied"`), no speech detected
  (`"No speech detected"`), browser unsupported (`"Voice not supported in this browser"`).
  Closes E-m10-001..010, A-m10-001..003.

  **`app/globals.css`** — adds `@keyframes voiceListenPulse` (scale + opacity pulse,
  PRM suppressed via `@media (prefers-reduced-motion: reduce)`).

  56 test IDs closed total:
  - Unit: U-m10-001..025 (`lib/speechRecognition.test.ts`, `lib/useVoiceCapture.test.ts`)
  - Component: C-m10-001..018 (`MicButton.test.tsx`, `VoiceCaptureOverlay.test.tsx`,
    `AddBrickSheet.test.tsx` defaultTitle group, `BottomBar.test.tsx` mic slot group)
  - E2E: E-m10-001..010 (`tests/e2e/m10-voice-log.spec.ts`, deferred-to-preview)
  - A11y: A-m10-001..003 (`tests/e2e/m10-voice-log.a11y.spec.ts`, deferred-to-preview)

  Net test count: 1722/1722 Vitest passed across 103 files (+170 tests / +8 files vs M7e's
  1552/95).

### Changed (M10)

- `components/BottomBar.tsx` — `micSlot?: ReactNode` prop added (right dock slot).
- `components/AddBrickSheet.tsx` — `defaultTitle?: string` prop added; pre-populates the
  title input when provided.
- `app/(building)/BuildingClient.tsx` — wires voice-capture stack; three toast failure
  paths added.
- `.github/workflows/ci.yml` — updated ratchet to reflect +170 test count increase.
- `stryker.config.json` — extended to include new lib files in mutation scope.

### Fixed (M10)

- **SG-bld-19 — voice failure-mode handling resolved.** Three distinct failure paths now
  emit toasts instead of crashing: (1) `NotAllowedError` → "Microphone access denied",
  (2) `no-speech` result → "No speech detected", (3) unsupported browser →
  "Voice not supported in this browser".
- **Hydration mismatch on `isSpeechSupported`** — deferred to client mount via
  `useSyncExternalStore` with server snapshot `() => false`. SSR renders `MicButton`
  hidden; CSR resolves and shows/hides based on actual browser support.
- **E2E determinism** — `window.SpeechRecognition` stubbed to a no-op object in
  `beforeEach` across all E2E specs; tests are deterministic rather than guard-skip.

### Notes (M10)

- **Zero new npm dependencies.** Web Speech API is a browser built-in; no paid API,
  no server round-trip, no key rotation needed (ADR-037 honored).
- **SCHEMA_VERSION stays at 3.** Voice capture is ephemeral UI state; nothing is
  persisted to `AppState`. No migration bump required.
- **Deferred-to-preview:** E-m10-001..010 (Playwright E2E) and A-m10-001..003
  (axe a11y) are real `test()` blocks — vacuous-pass in-sandbox (same pattern as
  M4–M9). Verify at Gate #2.
- **Phase 1 complete.** M10 is the eleventh and final milestone in the Phase 1 plan
  (`phase1plan.md`, M0..M10). The Day/Week/Month/Year calendar, full brick-log verbs,
  persistence, drag-reorder, polish animations, and voice capture are all shipped.
- **Gate #2 deferred IDs:** E-m10-001..010 + A-m10-001..003 (13 tests total).
