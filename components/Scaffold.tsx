"use client";
import { useEffect, useState } from "react";
// [obsolete: not-imported-in-M2] — stays on disk for M3+ revisit.
// Uses local Category type from ui/types.ts to avoid depending on removed lib/types exports.
import type { Category } from "@/components/ui/types";

const CATEGORY_COLOR: Record<Category, string> = {
  health: "#34d399",
  mind: "#c4b5fd",
  career: "#fbbf24",
  passive: "#64748b",
};

interface Props {
  pct: number;
  category: Category;
  height?: number;
}

export function Scaffold({ pct, category, height = 56 }: Props) {
  const [h, setH] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setH(pct), 80);
    return () => window.clearTimeout(t);
  }, [pct]);
  return (
    <div
      role="img"
      className="scaffold"
      style={
        {
          height,
          "--brick-color": CATEGORY_COLOR[category],
        } as React.CSSProperties
      }
      aria-label={`${Math.round(pct)} percent`}
    >
      <div className="scaffold__fill" style={{ height: `${h}%` }} />
    </div>
  );
}
