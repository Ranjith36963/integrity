"use client";
import { useEffect, useState } from "react";
import { CATEGORY_COLOR, Category } from "@/lib/types";

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
