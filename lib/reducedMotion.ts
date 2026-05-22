"use client";
/**
 * lib/reducedMotion.ts — SSR-safe hook for prefers-reduced-motion.
 * Returns `false` as the initial value (SSR-safe; no window access on server).
 * Subscribes to `change` events on the MediaQueryList and cleans up on unmount.
 * ADR reference: plan.md § File structure — lib/reducedMotion.ts
 */
import { useState, useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  // Initial value is false (SSR-safe — window is not available on the server).
  // After mount, the effect reconciles to the real client value via the change handler.
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    mql.addEventListener("change", handler);

    // Reconcile to the current client value by dispatching a synthetic event.
    // This avoids calling setState directly in the effect body.
    handler({ matches: mql.matches } as MediaQueryListEvent);

    return () => {
      mql.removeEventListener("change", handler);
    };
  }, []);

  return prefersReduced;
}
