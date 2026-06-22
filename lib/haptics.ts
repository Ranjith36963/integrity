/**
 * lib/haptics.ts — haptic feedback layer.
 *
 * Two paths:
 *   - Native (Capacitor): when running inside a Capacitor app shell
 *     (iOS / Android), use @capacitor/haptics for real Taptic Engine /
 *     Vibrator API access. iOS Safari has no navigator.vibrate at all,
 *     so this is the only way every haptic call doesn't silently no-op
 *     on iPhones.
 *   - Web fallback: navigator.vibrate() — works on Android Chrome and
 *     Firefox. Silently no-ops on iOS Safari, desktop browsers, etc.
 *
 * Detection: Capacitor exposes window.Capacitor with isNativePlatform().
 * Importing @capacitor/haptics in a pure web context is safe — it just
 * doesn't activate without the native bridge.
 */

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export type HapticEvent = "light" | "medium" | "success" | "notification";

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects window.Capacitor with isNativePlatform()
  const cap = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

function webVibrate(pattern: number | number[]): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(pattern);
  }
  // Silent no-op when navigator.vibrate is undefined (iOS Safari, desktop)
}

export const haptics = {
  /** Brick tap — light single pulse */
  light(): void {
    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      return;
    }
    webVibrate([10]);
  },

  /** Drag start, long-press lift — medium pulse */
  medium(): void {
    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
      return;
    }
    webVibrate([20]);
  },

  /** Block 100% — success pattern */
  success(): void {
    if (isNative()) {
      Haptics.notification({ type: NotificationType.Success }).catch(
        () => undefined,
      );
      return;
    }
    webVibrate([15, 30, 15]);
  },

  /** Day 100% — celebratory pattern */
  notification(): void {
    if (isNative()) {
      Haptics.notification({ type: NotificationType.Success }).catch(
        () => undefined,
      );
      return;
    }
    webVibrate([20, 40, 20, 40, 20]);
  },
} as const;
