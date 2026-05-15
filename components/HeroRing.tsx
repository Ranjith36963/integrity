"use client";
// HeroRing — NEW in M3 (plan.md § Components — <HeroRing>).
// SVG circle wrapping the day-score numeral. Stroke-dashoffset reflects dayPct.
// SSR-safe: server renders with pct=0 (full empty arc), client hydrates to actual value.
// Accessibility: role="img", aria-label, aria-live="polite". Numeral is aria-hidden.
// Motion: dashoffset transition 600ms easeInOut. Reduced-motion → instant.
// Children: optional numeric label (aria-hidden) placed in absolute center.

import { useState, useEffect, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

const R = 56;
const CIRCUMFERENCE = 2 * Math.PI * R;
const SIZE = R * 2 + 20;

interface Props {
  pct: number;
  children?: ReactNode;
}

export function HeroRing({ pct, children }: Props) {
  // SSR safety: render with 0% on server, hydrate to actual on client.
  // Matches the M1 `mounted` two-pass pattern.
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical SSR hydration two-pass per SG-m3-17
    setMounted(true);
  }, []);

  const displayPct = mounted ? pct : 0;
  const dashoffset = (1 - displayPct / 100) * CIRCUMFERENCE;
  const roundedPct = Math.round(pct);

  const transition = prefersReducedMotion
    ? "none"
    : `stroke-dashoffset 600ms ease-in-out`;

  return (
    <div
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
        aria-label={`Day score: ${roundedPct}%`}
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

        {/* Filled arc — dashoffset reflects day score */}
        <circle
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
          style={{ transition }}
        />
      </svg>

      {/* Children (numeral) — centered absolutely, aria-hidden */}
      {children ? (
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
          {Math.round(displayPct)}%
        </div>
      )}
    </div>
  );
}
