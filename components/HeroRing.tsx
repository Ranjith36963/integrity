"use client";
// HeroRing — M3 + M7c (plan.md § Components — <HeroRing>).
// SVG circle wrapping the day-score numeral. Stroke-dashoffset reflects dayPct.
// SSR-safe: server renders with pct=0 (full empty arc), client hydrates to actual value.
// Accessibility: role="img", aria-label, aria-live="polite". Numeral is aria-hidden.
// Motion: dashoffset transition 600ms easeInOut. Reduced-motion → instant.
// Children: optional ReactNode label OR children-as-function (displayPct: number) => ReactNode
//   (M7c — allows parent to consume the live tween value for synchronized numeral rendering).
// M7c: firstPaintCountUp prop — drives a 1.6s easeOut tween from 0 → pct on first mount.
//   Both the SVG stroke-dashoffset AND the visible numeral consume a single displayPct state.
//   They cannot desync (joint AC #1). Subsequent pct changes snap via setDisplayPct(pct).
//   Reduced-motion: tween collapses to instant setDisplayPct(pct) on mount.

import { useState, useEffect, type ReactNode } from "react";
import { useReducedMotion, animate } from "motion/react";
import { motionTokens } from "@/lib/motion";

const R = 56;
const CIRCUMFERENCE = 2 * Math.PI * R;
const SIZE = R * 2 + 20;

interface Props {
  pct: number;
  firstPaintCountUp?: boolean;
  children?: ReactNode | ((displayPct: number) => ReactNode);
}

export function HeroRing({ pct, firstPaintCountUp = false, children }: Props) {
  // SSR safety: render with 0% on server, hydrate to actual on client.
  // Matches the M1 `mounted` two-pass pattern.
  const [mounted, setMounted] = useState(false);
  // M7c: single displayPct state drives BOTH stroke-dashoffset AND numeral (joint-state AC #1).
  // SSR: 0 (full empty arc). Post-mount: pct (snap) or tween start.
  const [displayPct, setDisplayPct] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical SSR hydration two-pass per SG-m3-17 + M7c count-up
    setMounted(true);

    if (firstPaintCountUp && pct > 0 && !prefersReducedMotion) {
      // M7c: imperitive animate(from, to, options) from motion/react.
      // onUpdate subscriber writes to displayPct so stroke + numeral stay in sync.
      // ease: [0, 0, 0.2, 1] — Framer canonical easeOut cubic-bezier (SG-m7c-02).
      const controls = animate(0, pct, {
        duration: motionTokens.countUp.durationMs / 1000, // 1.6 s — single source of truth
        ease: [0, 0, 0.2, 1], // SG-m7c-02 — Framer canonical easeOut cubic-bezier
        onUpdate: (v) => setDisplayPct(v),
      });
      return () => controls.stop();
    }

    // No-tween path: PRM, pct===0, or firstPaintCountUp===false — snap to final value.
    setDisplayPct(pct);
  }, [firstPaintCountUp, pct, prefersReducedMotion]);

  const dashoffset = (1 - displayPct / 100) * CIRCUMFERENCE;
  const roundedDisplayPct = Math.round(displayPct); // SG-m7c-01 — integer steps for numeral

  const transition = prefersReducedMotion
    ? "none"
    : `stroke-dashoffset 600ms ease-in-out`;

  return (
    <div
      data-testid="hero-ring"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${SIZE}px`,
        height: `${SIZE}px`,
      }}
    >
      <svg
        role="img"
        aria-label={`Day score: ${roundedDisplayPct}%`}
        aria-live="polite"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Track circle */}
        <circle
          cx={R + 10}
          cy={R + 10}
          r={R}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={8}
        />

        {/* Filled arc — dashoffset reflects displayPct (live tween or snap value) */}
        <circle
          data-testid="hero-ring-circle"
          cx={R + 10}
          cy={R + 10}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${R + 10} ${R + 10})`}
          style={{ transition: mounted ? transition : "none" }}
        />
      </svg>

      {/* Children (numeral) — centered absolutely, aria-hidden */}
      {typeof children === "function" ? (
        // M7c: children-as-function — pass roundedDisplayPct so parent's numeral stays in sync
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children(roundedDisplayPct)}
        </div>
      ) : children ? (
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-14)",
            color: "var(--ink)",
          }}
        >
          {roundedDisplayPct}%
        </div>
      )}
    </div>
  );
}
