"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  durationMs?: number;
  className?: string;
}

export function AnimatedPercent({
  value,
  durationMs = 1600,
  className,
}: Props) {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const effective = reduce ? 0 : durationMs;
    const target = value;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = effective <= 0 ? 1 : Math.min(1, elapsed / effective);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [value, durationMs]);

  return <span className={className}>{Math.round(n)}</span>;
}
