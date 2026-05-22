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

  useEffect(() => {
    if (!visible) return;
    // Schedule auto-dismiss after 3000 ms (AC #3)
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, onDismiss]);

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

  const variants = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: prmTransition },
        exit: { opacity: 0, transition: prmTransition },
      }
    : {
        initial: { opacity: 0, y: "100%" },
        animate: {
          opacity: 1,
          y: "0%",
          transition: {
            type: "spring",
            stiffness: 220,
            damping: 26,
          } satisfies Transition,
        },
        exit: {
          opacity: 0,
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
            transform: "translateX(-50%)",
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
