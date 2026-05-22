"use client";
/**
 * components/Toaster.tsx — M7e: singleton bottom-anchored toast system.
 *
 * Module-level event emitter (no React context, no store dependency).
 * Call sites invoke toast(message, kind) from anywhere.
 *
 * Design:
 *   - Single toast slot: last-write-wins, no queue (spec AC #9)
 *   - Auto-dismiss: 2000 ms per toast (reset on every emit)
 *   - z-index 30 (above dock z-20, below sheet z-50 — SG-m7e-04)
 *   - Bottom-anchored: bottom: calc(80px + env(safe-area-inset-bottom))
 *   - kind-discriminated ARIA:
 *     success/info → role="status" + aria-live="polite"
 *     error       → role="alert"  + aria-live="assertive"   (SG-m7e-03)
 *   - PRM: prefersReducedMotion=true → instant appear/disappear (no slide)
 *   - data-testid="toaster" on container; data-testid="toast" on visible toast
 */

import { useState, useEffect, useRef } from "react";

export type ToastKind = "success" | "info" | "error";

type ToastEvent = {
  id: string;
  message: string;
  kind: ToastKind;
};

// ─── Module-level event emitter (singleton) ────────────────────────────────
// Using a Set of subscriber callbacks — O(1) emit, no React coupling.
const subscribers = new Set<(t: ToastEvent | null) => void>();

/**
 * toast(message, kind) — fire-and-forget toast emit.
 * Replaces the current toast (last-write-wins, no queue).
 * Safe to call from any module — no import of React or AppState needed.
 */
export function toast(message: string, kind: ToastKind = "info"): void {
  const event: ToastEvent = {
    id: Math.random().toString(36).slice(2),
    message,
    kind,
  };
  subscribers.forEach((fn) => fn(event));
}

// ─── <Toaster /> component ─────────────────────────────────────────────────

type ToasterProps = {
  prefersReducedMotion?: boolean;
};

export function Toaster({ prefersReducedMotion = false }: ToasterProps) {
  const [current, setCurrent] = useState<ToastEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Subscribe to toast events
    function handler(event: ToastEvent | null) {
      // Cancel any in-flight auto-dismiss timer (last-write-wins reset)
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setCurrent(event);
      if (event !== null) {
        // Schedule auto-dismiss after 2000 ms
        timerRef.current = setTimeout(() => {
          setCurrent(null);
          timerRef.current = null;
        }, 2000);
      }
    }

    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Determine ARIA attributes based on kind (SG-m7e-03)
  const isError = current?.kind === "error";
  const role = isError ? "alert" : "status";
  const ariaLive = isError ? "assertive" : "polite";

  return (
    <div
      data-testid="toaster"
      style={{
        position: "fixed",
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        width: "100%",
        maxWidth: "360px",
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {current !== null && (
        <div
          key={current.id}
          data-testid="toast"
          role={role}
          aria-live={ariaLive}
          style={{
            background: "var(--card)",
            border: `1px solid ${
              current.kind === "success"
                ? "var(--accent)"
                : current.kind === "error"
                  ? "var(--cat-9)"
                  : "var(--ink-dim)"
            }`,
            borderRadius: "8px",
            padding: "10px 16px",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            color: "var(--ink)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            ...(prefersReducedMotion
              ? {}
              : {
                  animation: "toastSlideUp 180ms ease-out forwards",
                }),
          }}
        >
          {current.message}
        </div>
      )}
    </div>
  );
}
