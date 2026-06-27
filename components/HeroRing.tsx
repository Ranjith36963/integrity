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

import { useState, useEffect, useRef } from "react";
import { useReducedMotion, animate } from "motion/react";
import { motionTokens } from "@/lib/motion";

const R = 56;
const CIRCUMFERENCE = 2 * Math.PI * R;
const SIZE = R * 2 + 20;

interface Props {
  pct: number;
  firstPaintCountUp?: boolean;
}

export function HeroRing({ pct, firstPaintCountUp = false }: Props) {
  // SSR safety: render with 0% on server, hydrate to actual on client.
  // Matches the M1 `mounted` two-pass pattern.
  const [mounted, setMounted] = useState(false);
  // M7c: single displayPct state drives BOTH stroke-dashoffset AND numeral (joint-state AC #1).
  // SSR: 0 (full empty arc). Post-mount: pct (snap) or tween start.
  const [displayPct, setDisplayPct] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // M7c: refs for tween lifecycle. tweenRef holds animate() controls so we can stop
  // on unmount or mid-tween pct change. tweenPctRef records the target so we can detect
  // when pct changes vs when firstPaintCountUp just flipped false (the common case).
  const tweenRef = useRef<{ stop: () => void } | null>(null);
  const tweenPctRef = useRef<number | null>(null);

  // Unmount-only cleanup: stop any in-progress count-up tween.
  useEffect(() => {
    return () => {
      tweenRef.current?.stop();
      tweenRef.current = null;
      tweenPctRef.current = null;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical SSR hydration two-pass per SG-m3-17 + M7c count-up
    setMounted(true);

    if (
      firstPaintCountUp &&
      pct > 0 &&
      !prefersReducedMotion &&
      !tweenRef.current
    ) {
      // M7c: start count-up tween. We do NOT return a cleanup here because
      // useFirstPaintAfterHydration causes firstPaintCountUp to flip true→false on the
      // very next render, and a cleanup return would stop the tween immediately (0ms of
      // animation). Instead, the tween is stopped only via: (a) the unmount-cleanup
      // effect above, (b) a pct-change mid-tween (C-m7c-010, handled below).
      const controls = animate(0, pct, {
        duration: motionTokens.countUp.durationMs / 1000, // 1.6 s
        ease: [0, 0, 0.2, 1], // SG-m7c-02 — easeOut cubic-bezier
        onUpdate: (v) => setDisplayPct(v),
      });
      tweenRef.current = controls;
      tweenPctRef.current = pct;
      return; // Explicit no-cleanup — tween must survive the next dep-change re-run
    }

    // C-m7c-010: pct changed while a count-up tween is in progress → cancel and snap.
    if (tweenRef.current && pct !== tweenPctRef.current) {
      tweenRef.current.stop();
      tweenRef.current = null;
      tweenPctRef.current = null;
      setDisplayPct(pct);
      return;
    }

    // Tween is running and pct hasn't changed (firstPaintCountUp just flipped false, or
    // prefersReducedMotion changed while tween was already animating). Let it complete.
    if (tweenRef.current) return;

    // No tween in progress: PRM path, pct===0, or firstPaintCountUp===false → snap.
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
      {/* R7-ROOT-M7-NIT-1: aria-live moved from the svg to a sibling
          visually-hidden status node that updates only when displayPct
          reaches the prop pct (i.e., AT tween completion, not every
          frame). Pre-R7 the svg had aria-live='polite' AND
          aria-label='Day score: <live tween value>%' — SR users heard 50
          announcements ("Day score: 1%, Day score: 2%, ...") during the
          1.6s count-up. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {/* Only announce when displayPct === pct (tween settled or no-tween path). */}
        {Math.abs(displayPct - pct) < 0.5
          ? `Day score: ${Math.round(pct)}%`
          : ""}
      </span>
      <svg
        role="img"
        // R7-ROOT-R2-NIT: lock the svg's aria-label to round(pct) so it
        // doesn't mutate 50 times during the tween. The visible numeral
        // animates via children-as-function; the aria-label is the final
        // canonical value. Rotor/focus inspection mid-tween now sees the
        // settled value.
        aria-label={`Day score: ${Math.round(pct)}%`}
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

        {/* Sci-fi Phase 2 — orbital data dashes. */}
        <circle
          className="scifi-orbital-dashes"
          cx={R + 10}
          cy={R + 10}
          r={R}
          fill="none"
          stroke="var(--accent-glow)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="4 14"
        />

        {/* Numeral — SVG text so the count-up value changes don't cause CSS
            layout instability (E-m7c-003). SVG text is outside the CSS layout
            flow, so its rect changes aren't tracked by the Layout Instability
            API. textAnchor + dominantBaseline center it at the ring center.
            Joint-state AC #1: same roundedDisplayPct drives both this text and
            the stroke-dashoffset above, keeping them in sync at all times. */}
        <text
          data-testid="hero-numeral"
          aria-hidden="true"
          x={R + 10}
          y={R + 10}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "72px",
            fontStyle: "italic",
            fontWeight: "400",
            fill: "var(--ink)",
          }}
        >
          {roundedDisplayPct}%
        </text>
      </svg>

      {/* Sci-fi Phase 1 — orbital particles. Three amber motes spinning
          at varying angles + radii around the ring stroke. CSS-only,
          aria-hidden, respects prefers-reduced-motion via globals.css. */}
      <div
        className="scifi-orbital"
        aria-hidden="true"
        data-testid="hero-orbital"
        style={{ position: "absolute", inset: 0 }}
      >
        <span
          className="scifi-orbital-mote"
          style={{ transform: `translate(${R + 14}px, 0)` }}
        />
        <span
          className="scifi-orbital-mote"
          style={{
            transform: `rotate(135deg) translate(${R + 10}px, 0)`,
            animationDelay: "0.9s",
          }}
        />
        <span
          className="scifi-orbital-mote"
          style={{
            transform: `rotate(245deg) translate(${R + 18}px, 0)`,
            animationDelay: "1.7s",
          }}
        />
      </div>
    </div>
  );
}
