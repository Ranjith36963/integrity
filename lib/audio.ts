/**
 * lib/audio.ts — M4a audio helper.
 *
 * Lazily constructs a single HTMLAudioElement for /sounds/chime.mp3 on first
 * call, caches it at module scope, and calls .play() wrapped in try/catch so
 * that iOS pre-gesture rejections or offline failures are swallowed silently.
 *
 * SSR guard: returns a no-op when typeof Audio === 'undefined' (server render).
 * No new npm dependencies — Audio is a Web API.
 */

let chimeElement: HTMLAudioElement | null = null;

/**
 * Plays the chime sound once.
 * - Lazy: constructs the Audio element on first call and caches it.
 * - Safe: wraps .play() in try/catch; silent failure on iOS pre-unlock or offline.
 * - SSR-safe: no-op when Audio is not available (server-side rendering).
 */
export function playChime(): void {
  if (typeof Audio === "undefined") {
    // SSR guard — no-op on the server
    return;
  }

  if (chimeElement === null) {
    chimeElement = new Audio("/sounds/chime.mp3");
  }

  try {
    // .play() returns a Promise that can reject on iOS pre-gesture or when blocked.
    // We intentionally discard the return value; silent failure is correct here.
    void chimeElement.play();
  } catch {
    // Synchronous errors (rare) are also swallowed silently per SG-m4a-04.
  }
}
