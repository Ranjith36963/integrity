"use client";
/**
 * components/BurstOverlay.tsx — Sci-fi Phase 4b.
 *
 * Mount-once burst surface. The `fireBurst({ x, y })` helper enqueues
 * a particle scatter at the given viewport coordinates; the overlay
 * renders 12 motes that animate outward via CSS and unmount after the
 * animation completes. Multiple bursts can stack — each becomes its
 * own short-lived sub-tree.
 *
 * Usage:
 *   import { BurstOverlay, fireBurst } from "@/components/BurstOverlay";
 *   <BurstOverlay />   // mount once at the AppShell root
 *   fireBurst({ x: 200, y: 800 });  // from anywhere
 *
 * The fire helper is decoupled from React — it uses a module-level
 * subscriber so callers don't need a context. The overlay subscribes
 * on mount.
 */

import { useEffect, useState } from "react";

type Burst = { id: number; x: number; y: number };

let nextId = 1;
const subscribers = new Set<(burst: Burst) => void>();

/**
 * Fire a particle burst at the given viewport coordinates. Coordinates
 * default to bottom-center (the dock area) if omitted, which is the
 * canonical position for a brick-log feedback.
 */
export function fireBurst(at?: { x?: number; y?: number }): void {
  if (typeof window === "undefined") return;
  const x = at?.x ?? window.innerWidth / 2;
  const y = at?.y ?? window.innerHeight - 80;
  const burst: Burst = { id: nextId++, x, y };
  for (const cb of subscribers) cb(burst);
}

const PARTICLE_COUNT = 12;
const BURST_LIFETIME_MS = 750;

export function BurstOverlay(): React.JSX.Element | null {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const cb = (burst: Burst) => {
      setBursts((prev) => [...prev, burst]);
      // Auto-remove after the animation completes so the DOM doesn't
      // grow unboundedly across a long session.
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burst.id));
      }, BURST_LIFETIME_MS);
    };
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  if (bursts.length === 0) return null;

  return (
    <>
      {bursts.map((b) => (
        <div
          key={b.id}
          className="scifi-burst"
          aria-hidden="true"
          data-testid="scifi-burst"
          style={
            {
              "--burst-x": `${b.x}px`,
              "--burst-y": `${b.y}px`,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
            // Distribute evenly around 360deg. Add a small per-mote
            // angle jitter so the burst doesn't read as mechanical.
            const baseAngle = (i / PARTICLE_COUNT) * 360;
            // Deterministic jitter from index so SSR + CSR match.
            const jitter = ((i * 37) % 20) - 10;
            return (
              <span
                key={i}
                className="scifi-burst-mote"
                style={
                  {
                    "--angle": `${baseAngle + jitter}deg`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
