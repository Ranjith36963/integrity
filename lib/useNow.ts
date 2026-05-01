"use client";
import { useState, useEffect } from "react";

function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Returns the current local time as "HH:MM", updated every 60 seconds.
 * Initial value is derived from `new Date()` at mount time.
 * `prefers-reduced-motion` does NOT suppress clock updates — the displayed
 * time must stay accurate for accessibility (WCAG-aligned).
 */
export function useNow(): string {
  const [now, setNow] = useState<string>(() => formatHHMM(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(formatHHMM(new Date()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}
