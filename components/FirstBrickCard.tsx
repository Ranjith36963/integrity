"use client";
/**
 * components/FirstBrickCard.tsx — M7e: one-time "Your Empire begins." narrative card.
 * Mounts when the user adds their very first brick (AC #1, #2, #3 per spec).
 * Auto-dismisses after 3000 ms; tap-anywhere dismisses earlier.
 * z-index 40 (above dock z-20, below sheet z-50 — SG-m7e-04).
 *
 * Props:
 *   visible: boolean — controlled by BuildingClient via firstCardOpen state
 *   onDismiss: () => void — called on auto-dismiss or tap
 *   prefersReducedMotion?: boolean — when true, opacity-fade only (no spring slide)
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, type Transition } from "motion/react";

type FirstBrickCardProps = {
  visible: boolean;
  onDismiss: () => void;
  prefersReducedMotion?: boolean;
};

export function FirstBrickCard({
  visible,
  onDismiss,
  prefersReducedMotion = false,
}: FirstBrickCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // R7-ROOT-M7-NIT-4: stabilize onDismiss via a ref. Pre-R7 the effect deps
  // included onDismiss; BuildingClient passes an inline arrow (() => setFirstCardOpen(false))
  // so every parent re-render produced a new function identity, re-firing the
  // effect → clearing + rescheduling the timer at full 3000ms. If useNow ticks
  // landed near the timer boundary, the card could stay up indefinitely.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!visible) return;
    // Schedule auto-dismiss after 3000 ms (AC #3). Calls the ref so the
    // effect itself only runs on the visible edge, not on every parent render.
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, 3000);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible]);

  function handleClick() {
    // Synchronous dismiss on tap — cancel the auto-dismiss timer (AC #3)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDismiss();
  }

  // Motion variants based on PRM — Transition typed explicitly to avoid ease:string widening.
  const prmTransition: Transition = { duration: 0.2, ease: "linear" };
  const exitTransition: Transition = { duration: 0.22, ease: "easeIn" };

  // Framer Motion writes the `transform` CSS property when animating x/y,
  // which overrides any inline `transform: translateX(-50%)`. To keep the
  // card centered we have to set the centering offset via Framer's `x`
  // value too. Pre-fix the card slid up correctly but rendered starting at
  // left:50% with no compensating translateX, so the right edge spilled
  // 215px off-screen ("Your Emp…" cut off at the viewport edge).
  const variants = prefersReducedMotion
    ? {
        initial: { opacity: 0, x: "-50%" },
        animate: { opacity: 1, x: "-50%", transition: prmTransition },
        exit: { opacity: 0, x: "-50%", transition: prmTransition },
      }
    : {
        initial: { opacity: 0, x: "-50%", y: "100%" },
        animate: {
          opacity: 1,
          x: "-50%",
          y: "0%",
          transition: {
            type: "spring",
            stiffness: 220,
            damping: 26,
          } satisfies Transition,
        },
        exit: {
          opacity: 0,
          x: "-50%",
          y: "100%",
          transition: exitTransition,
        },
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="first-brick-card"
          data-testid="first-brick-card"
          role="status"
          aria-live="polite"
          className="first-brick-card"
          onClick={handleClick}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            // Centering happens via Framer's `x: "-50%"` in variants — do
            // not duplicate as `transform: translateX(...)` here, Framer
            // would silently overwrite it.
            width: "100%",
            maxWidth: "430px",
            zIndex: 40,
            pointerEvents: "auto",
            background: "var(--card)",
            border: "1px solid var(--card-edge)",
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.4)",
            padding: "var(--sp-24) var(--sp-16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-32)",
              color: "var(--ink)",
            }}
          >
            Your Empire begins.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
