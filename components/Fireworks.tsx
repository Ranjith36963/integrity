"use client";
// Fireworks — M4a new component (plan.md § Components > Fireworks).
// Day-100% celebration overlay. Fixed-position, pointer-events:none, aria-hidden.
// Respects prefers-reduced-motion: returns null when reduced-motion is true.
// Particle count bounded (~12); ~1.6s easeOut animation.
// No internal audio or haptic — caller (BuildingClient) handles those.

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const PARTICLE_COUNT = 12;

interface Particle {
  id: number;
  x: number; // 0..100
  y: number; // 0..100
  color: string;
  size: number; // px
}

const COLORS = [
  "var(--accent)",
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#3b82f6", // blue
];

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
  }));
}

interface Props {
  active: boolean;
  /**
   * R7-ROOT-R2-P1-2: optional PRM override. When provided, this value
   * is used instead of the live useReducedMotion() reading — lets the
   * parent freeze PRM at celebration start so a mid-window OS toggle
   * doesn't flip Fireworks invisibility while DayCompleteCard stays
   * frozen-hidden. BuildingClient.tsx passes celebratingPrm.
   */
  prmOverride?: boolean | null;
}

export function Fireworks({ active, prmOverride }: Props) {
  const livePrm = useReducedMotion();
  // R7-ROOT-R2-P1-2: prefer the frozen override when supplied, fall back to
  // the live reading otherwise.
  const prefersReducedMotion =
    prmOverride !== null && prmOverride !== undefined ? prmOverride : livePrm;
  // particles drives visibility; null means not playing
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    // Synchronous setState in this effect is intentional: active prop drives a one-shot
    // particle burst triggered by a user gesture (tap tick brick). The effect only fires
    // when active changes (dep array = [active]), so no cascading render loop is possible.
    // plan.md § Components > Fireworks (SG-m4a fireworks one-shot design).
    /* eslint-disable react-hooks/set-state-in-effect -- plan.md SG-m4a: one-shot active prop, no cascade */
    if (!active) {
      setParticles(null);
      return;
    }
    setParticles(makeParticles());
    /* eslint-enable react-hooks/set-state-in-effect */
    const stopTimer = window.setTimeout(() => setParticles(null), 1700);
    return () => window.clearTimeout(stopTimer);
  }, [active]);

  // Reduced-motion: returns null (visual suppressed; caller still fires haptic/chime)
  if (prefersReducedMotion) return null;

  if (particles === null) return null;

  return (
    <div
      data-testid="fireworks"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: `${p.x}vw`, y: `${p.y}vh` }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0, 1.5, 1.2],
            y: [`${p.y}vh`, `${p.y - 15}vh`, `${p.y + 5}vh`],
          }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
