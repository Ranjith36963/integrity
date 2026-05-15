"use client";
/**
 * lib/longPress.ts — M4b Goal Brick Stepper long-press auto-repeat hook.
 *
 * Exposes useLongPressRepeat and the timing constants HOLD_MS / INTERVAL_MS.
 * Uses raw setTimeout/setInterval (NOT requestAnimationFrame) so vi.useFakeTimers()
 * works correctly in unit tests (per plan.md § Long-press testing).
 *
 * Mechanics:
 *  - pointerdown: fires onTick() immediately (initial tap = first tick)
 *  - after HOLD_MS: starts setInterval(INTERVAL_MS) that fires onTick() per tick
 *  - pointerup / pointercancel / pointerleave: clears all timers
 *  - enabled: false flip during a held press: clears timers proactively
 */

import { useCallback, useRef, useEffect } from "react";

/** Hold threshold before auto-repeat starts (ms). Named constant for M7 tuning. */
export const HOLD_MS = 500;

/** Auto-repeat interval (ms). Named constant for M7 tuning. */
export const INTERVAL_MS = 50;

interface UseLongPressRepeatOptions {
  /** Called on initial press and each auto-repeat tick. */
  onTick: () => void;
  /** Called when auto-repeat stops because clamp was hit (optional). */
  onClampStop?: () => void;
  /** ms to hold before auto-repeat starts. Default: HOLD_MS (500). */
  holdMs?: number;
  /** ms between auto-repeat ticks. Default: INTERVAL_MS (50). */
  intervalMs?: number;
  /** When false, clears any in-flight timers proactively. */
  enabled: boolean;
}

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

/**
 * useLongPressRepeat — pointer-driven long-press auto-repeat hook.
 * Returns stable handler refs (useCallback) to avoid spurious re-renders.
 */
export function useLongPressRepeat({
  onTick,
  onClampStop,
  holdMs = HOLD_MS,
  intervalMs = INTERVAL_MS,
  enabled,
}: UseLongPressRepeatOptions): LongPressHandlers {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (repeatTimerRef.current !== null) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  // Clear timers proactively when enabled flips to false mid-press.
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      onClampStop?.();
    }
  }, [enabled, clearTimers, onClampStop]);

  // Clear timers on unmount.
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Prevent the synthetic click that follows pointer events from double-dispatching.
      // Guard: e.preventDefault may be absent in test harness stubs.
      if (typeof e.preventDefault === "function") e.preventDefault();
      // Initial tick fires immediately on pointerdown — even when !enabled, so the
      // clamp-haptic-before-dispatch path runs (onTick decides dispatch vs clamp).
      onTick();
      // Schedule hold → auto-repeat only when enabled (no auto-repeat at boundary).
      if (!enabled) return;
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        onTick(); // first auto-repeat tick fires at holdMs
        repeatTimerRef.current = setInterval(() => {
          onTick();
        }, intervalMs);
      }, holdMs);
    },
    [enabled, onTick, holdMs, intervalMs],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      clearTimers();
    },
    [clearTimers],
  );

  const onPointerCancel = useCallback(
    (_e: React.PointerEvent) => {
      clearTimers();
    },
    [clearTimers],
  );

  const onPointerLeave = useCallback(
    (_e: React.PointerEvent) => {
      clearTimers();
    },
    [clearTimers],
  );

  return { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave };
}

// ─── useLongPress — single-fire tap/long-press hook (M4c) ───────────────────
//
// Resolves SG-m4c-07: 500 ms threshold; pointerdown starts a timer;
// pointerup before holdMs → onTap; holdMs elapses → onLongPress + consumed flag
// (suppresses eventual onTap). Coexists with useLongPressRepeat; M4b hook unchanged.

interface UseLongPressOptions {
  /** Called when pointerup fires before holdMs elapses (tap). */
  onTap: () => void;
  /** Called when holdMs elapses without pointerup (long-press). */
  onLongPress: () => void;
  /** Hold threshold in ms before long-press fires. Default: HOLD_MS (500). */
  holdMs?: number;
}

/**
 * useLongPress — pointer-driven single-fire tap/long-press hook.
 * Returns stable handler refs. Exported alongside useLongPressRepeat.
 */
export function useLongPress({
  onTap,
  onLongPress,
  holdMs = HOLD_MS,
}: UseLongPressOptions): LongPressHandlers {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Clear timer on unmount.
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Suppress synthetic click so pointer-driven and keyboard paths don't double-fire.
      if (typeof e.preventDefault === "function") e.preventDefault();
      consumedRef.current = false;
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        consumedRef.current = true; // mark gesture as long-press — suppress onTap on pointerup
        onLongPress();
      }, holdMs);
    },
    [onLongPress, holdMs],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      clearTimer();
      if (!consumedRef.current) {
        onTap();
      }
      consumedRef.current = false;
    },
    [clearTimer, onTap],
  );

  const onPointerCancel = useCallback(
    (_e: React.PointerEvent) => {
      clearTimer();
      consumedRef.current = false;
    },
    [clearTimer],
  );

  const onPointerLeave = useCallback(
    (_e: React.PointerEvent) => {
      clearTimer();
      consumedRef.current = false;
    },
    [clearTimer],
  );

  return { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave };
}
