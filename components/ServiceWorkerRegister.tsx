"use client";
/*
 * components/ServiceWorkerRegister.tsx — registers /sw.js on mount.
 *
 * Renders nothing. Registration is gated to production builds so the service
 * worker never fights Next's dev HMR (a cached dev chunk would wedge reloads).
 * workbox-window is dynamically imported so it stays out of the initial bundle
 * and only loads client-side after hydration.
 */
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;

    let cancelled = false;
    import("workbox-window")
      .then(({ Workbox }) => {
        if (cancelled) return;
        const wb = new Workbox("/sw.js");
        wb.register().catch(() => {
          /* registration is best-effort; app works without it */
        });
      })
      .catch(() => {
        /* workbox-window failed to load — ignore, app still works online */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
