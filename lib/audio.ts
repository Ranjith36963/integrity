/**
 * lib/audio.ts — M7f: Web Audio API chimes for block/day celebrations.
 *
 * playChime(kind) synthesises a brief tone sequence using the Web Audio API.
 * No external files, no dependencies — pure synthesis via OscillatorNode + GainNode.
 *
 * - 'block': single 880 Hz sine tone (short success chime)
 * - 'day': ascending 4-note arpeggio [523, 659, 784, 1047] Hz (celebration fanfare)
 *
 * Guards:
 * - SSR: `typeof window === 'undefined'` → no-op (server render, no AudioContext)
 * - No AudioContext available → no-op (very old browsers)
 * - AudioContext constructor blocked (no user gesture, iOS pre-unlock) → silent catch
 *
 * Supersedes the M4a HTMLAudioElement approach (public/sounds/chime.mp3) for
 * the block/day celebration paths. No external asset dependency.
 */

/**
 * playChime(kind) — synthesise and play a short chime.
 *
 * @param kind 'block' = 1-note; 'day' = 4-note ascending arpeggio
 */
export function playChime(kind: "block" | "day"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ??
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = kind === "day" ? [523, 659, 784, 1047] : [880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    // AudioContext blocked (e.g. no user gesture) — fail silently
  }
}
