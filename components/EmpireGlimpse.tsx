"use client";
/**
 * components/EmpireGlimpse.tsx — Sci-fi Phase 4e.
 *
 * Streak-milestone cinematic. When the user crosses a streak number
 * that maps to a milestone (7 / 30 / 100 / 365), a full-screen overlay
 * surfaces ONCE celebrating the structure they've completed:
 *
 *    7 days   → "FIRST CASTLE STANDS."        (castle = week)
 *   30 days   → "KINGDOM RISES."              (kingdom = month)
 *  100 days   → "EMPIRE TAKES SHAPE."         (a third of the year)
 *  365 days   → "ONE YEAR OF BRICKS."          (a full empire)
 *
 * The cinematic runs for 4 seconds, dismissible by tap. After dismiss
 * (or auto-expire) we stamp localStorage so it never re-fires for
 * that user on this device. New milestone → new flag → it CAN re-fire.
 *
 * PRM users get a static card with the same copy + same dismiss flow,
 * without the parallax + scan-line + bloom animations.
 *
 * Component shape: open/onClose props (parent owns timing). Returns
 * null when closed.
 */

import { useEffect } from "react";
import type { StreakMilestone } from "@/lib/insights";

const MILESTONE_COPY: Record<StreakMilestone, { title: string; sub: string }> =
  {
    7: { title: "First Castle Stands", sub: "Seven days laid." },
    30: { title: "Kingdom Rises", sub: "Thirty days built." },
    100: { title: "Empire Takes Shape", sub: "One hundred days." },
    365: { title: "One Year of Bricks", sub: "An empire complete." },
  };

interface Props {
  milestone: StreakMilestone | null;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function EmpireGlimpse({
  milestone,
  onClose,
}: Props): React.JSX.Element | null {
  // Auto-dismiss after 4s. The parent decides when to mount, so this
  // effect fires once on mount + per milestone-id change.
  useEffect(() => {
    if (!milestone) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [milestone, onClose]);

  // Esc-to-dismiss for keyboard users.
  useEffect(() => {
    if (!milestone) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [milestone, onClose]);

  if (!milestone) return null;
  const copy = MILESTONE_COPY[milestone];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="empire-glimpse"
      data-milestone={milestone}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90, // above command palette (z-80), sheets (z-50)
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.18) 0%, rgba(7,9,15,0.96) 60%, var(--bg) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {/* Faint horizontal scan line through the middle — the "scanner
          passed and certified this milestone" feel. */}
      <div
        aria-hidden
        className="scifi-empire-scanline"
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)",
          opacity: 0.7,
        }}
      />
      {/* Big number — italic serif (Dharma DNA), scale-pulses on mount */}
      <div
        className="scifi-empire-numeral"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "11rem",
          color: "var(--ink)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow:
            "0 0 22px var(--accent-bloom), 0 0 64px var(--accent-glow)",
          fontVariantNumeric: "tabular-nums slashed-zero",
        }}
      >
        {milestone}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12, 12px)",
          color: "var(--accent)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          marginTop: "var(--sp-12, 12px)",
        }}
      >
        ⌬ DAY {milestone}
      </div>
      <h2
        className="scifi-empire-title"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--fs-32, 32px)",
          color: "var(--ink)",
          margin: 0,
          marginTop: "var(--sp-24, 24px)",
          textAlign: "center",
          maxWidth: "300px",
        }}
      >
        {copy.title}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-14, 14px)",
          color: "var(--ink-dim)",
          margin: 0,
          marginTop: "var(--sp-8, 8px)",
        }}
      >
        {copy.sub}
      </p>
      <button
        type="button"
        data-testid="empire-glimpse-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="tap"
        style={{
          marginTop: "var(--sp-32, 32px)",
          minHeight: "44px",
          padding: "8px 24px",
          borderRadius: "999px",
          border: "1px solid var(--accent-glow)",
          background: "transparent",
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12, 12px)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Keep Building
      </button>
    </div>
  );
}

/**
 * Has-been-shown gate for milestone overlays. localStorage-backed so
 * the same milestone never re-fires for the same user on this device.
 * Key shape: `dharma:milestone-shown:${milestone}`.
 */
const MILESTONE_KEY_PREFIX = "dharma:milestone-shown:";

export function hasMilestoneBeenShown(milestone: StreakMilestone): boolean {
  if (typeof window === "undefined") return true; // SSR: never fire
  try {
    return (
      window.localStorage.getItem(`${MILESTONE_KEY_PREFIX}${milestone}`) ===
      "true"
    );
  } catch {
    return true;
  }
}

export function markMilestoneShown(milestone: StreakMilestone): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${MILESTONE_KEY_PREFIX}${milestone}`, "true");
  } catch {
    /* private mode quota — silently no-op */
  }
}
