## Milestone 10 — Voice Log

> **Pillars:** § 0.8 (voice mic placeholder already in dock); ADR-037 (voice ships at M10, not earlier); M2 Add Block flow; M3 Add Brick flow; M4d chooser sheet routing; the M0 design system.

### Intent

M10 activates the **mic button** that has been a visual placeholder in the dock since M2. Tapping it opens a voice-capture session: the browser's built-in **Web Speech API** listens, transcribes speech to text in real time, and when the user stops speaking the transcript is dropped into the **AddBrickSheet** as the pre-filled brick name. The user reviews, edits if needed, and taps Save — exactly the same confirmation step as typing.

**Why Web Speech API (not OpenAI Whisper or Claude Haiku):** zero cost, zero API keys, instant. The transcript goes straight into the brick-name field; there is no AI parsing layer. The user is the intelligence — they dictate the name, confirm it, done.

**What this is NOT:** AI intent-parsing (no Claude API call); automatic brick-kind detection; duration extraction from speech; offline transcription; Whisper; any backend round-trip; any change to the Add Block flow; any change to persistence or scoring.

**SG-bld-19 (failure-mode handling):** resolved here. Three failure paths — mic permission denied, no speech detected, browser does not support the API — must each surface a clear in-app message rather than a silent failure or crash.

### Inputs

- The existing dock `+` button area / mic placeholder (location TBD by PLANNER — could be a dedicated mic button in the dock or inside the chooser sheet).
- The browser Web Speech API (`window.SpeechRecognition` / `window.webkitSpeechRecognition`).
- The M4d `AddChooserSheet` routing and M3 `AddBrickSheet` — used as-is.
- The M0 design system tokens.

### Outputs

- A **mic trigger** — a tappable button in the dock (or chooser sheet) that starts a voice capture session.
- A **VoiceCapture UI state** — visual feedback while the API is listening (animated indicator, interim transcript display).
- On successful transcription: **AddBrickSheet opens pre-filled** with the transcript as the brick name.
- On failure (permission denied / no speech / unsupported): a **toast or inline error** with a clear human message; no crash.
- A `lib/speechRecognition.ts` wrapper — thin façade over `SpeechRecognition` that is mockable in tests.

### Edge cases

- **Browser does not support `SpeechRecognition`** (Firefox without flag, some non-Chromium browsers) → mic button is hidden or shows an "unsupported" tooltip; AddBrickSheet typed flow still works.
- **User denies mic permission** → toast: "Microphone access denied. Allow it in your browser settings."
- **User taps mic then says nothing** → after a timeout (e.g. no speech for 5 s), capture ends; toast: "No speech detected."
- **User taps mic in the middle of a speech → taps cancel** → capture aborts cleanly; no sheet opens; state resets to idle.
- **Interim transcript is noisy** → only the `result` event's `isFinal: true` segment is used as the final brick name; interim results displayed live but not committed.
- **AddBrickSheet pre-filled but user clears the field** → normal empty-name validation applies (Save disabled with empty name).
- **PRM (prefers-reduced-motion)** → listening animation collapses to a static indicator.
- **Already in a listening state and another tap** → second tap cancels the active session (toggle behavior).

### Acceptance criteria

**Mic trigger**

1. A mic button is visible and tappable from the Day view without navigating into any sheet.
2. The mic button has an accessible label (`aria-label="Start voice log"` or equivalent) and is keyboard-operable.
3. On browsers that do not support `SpeechRecognition`, the mic button is hidden (or shown with an "unavailable" aria-label) and no JS error is thrown.

**Voice capture session**

4. Tapping the mic button starts the Web Speech API recognition session and shows a visual listening indicator.
5. The listening indicator shows interim (partial) transcript text as the user speaks, updating in real time.
6. The listening indicator respects `prefers-reduced-motion` — no animation when PRM is on.
7. The listening session ends automatically when the API fires `onend` (either `onresult` with `isFinal` or a no-speech timeout).
8. A second tap on the mic button while listening cancels the session and returns to idle (no sheet opens).

**Happy path → AddBrickSheet**

9. When a `isFinal` result is received, the AddBrickSheet opens pre-filled with the transcript as the brick name (leading/trailing whitespace trimmed).
10. The pre-filled brick name is editable — the user can clear it, type over it, or accept it as-is.
11. Saving the pre-filled AddBrickSheet creates the brick exactly as if the name had been typed — same validation, same dispatch, same cascade.

**Failure modes (SG-bld-19)**

12. If the browser denies mic permission (`onError: "not-allowed"`), a toast appears: "Microphone access denied. Allow it in your browser settings." No sheet opens.
13. If no speech is detected within the timeout window, a toast appears: "No speech detected. Try again." No sheet opens.
14. If `SpeechRecognition` throws any other error, a toast appears with a generic fallback message. No crash.

**Quality & regression**

15. Mobile viewport (430px) renders the mic button and listening indicator without layout overflow.
16. axe a11y clean on the listening-state UI.
17. No regression to M1–M9e or the typed Add Brick flow.
18. Quality gates clean: `tsc` clean, ESLint 0 new errors, full Vitest green, `test:tz` green.
19. E2E (deferred-to-preview — Web Speech API is not available in headless Playwright): tests are authored as real Playwright blocks with the `if ((await x.count()) > 0) return` sandbox guard pattern (ADR-022).

### Open spec gaps (resolve at VERIFY)

- **SG-m10-01 — Mic button placement.** Two candidates: (a) a dedicated mic FAB in the dock alongside the `+` button; (b) a "Voice" option inside the existing `AddChooserSheet`. Option (a) is always one tap away; option (b) keeps the dock uncluttered. PLANNER decides; VERIFIER checks a11y reach and that the chooser flow is not broken.
- **SG-m10-02 — Listening UI surface.** Could be a bottom sheet, a modal overlay, or an inline card above the dock. Must show interim transcript and a cancel affordance. PLANNER decides against the 430px constraint and M0 tokens.
- **SG-m10-03 — No-speech timeout duration.** 5 s after last interim result or after mic opens with no speech. PLANNER picks; VERIFIER checks it feels right and is not shorter than a natural pause.
- **SG-m10-04 — `lib/speechRecognition.ts` mockability.** The wrapper must be injectable/mockable for unit tests (the real browser API is not available in JSDOM). PLANNER specifies the interface; BUILDER implements a fake for tests.
