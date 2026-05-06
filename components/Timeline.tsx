"use client";
// Timeline — re-authored for M1: 24-hour vertical scroll column with hour labels + NowLine.
// M2 re-adds the block-card list path (<TimelineBlock>) when blocks become non-empty.
// Hour-grid rendering: CSS background-image linear-gradient on the right column
// (SG-m1-03: if gradient antialiases poorly on mobile WebKit, BUILDER falls back to
//  24 absolutely-positioned <div> hairlines — current implementation uses CSS gradient).
// NowLine: imported from NowLine.tsx; uses HOUR_HEIGHT_PX (single source of truth).
// Auto-scroll: fires once on mount in useEffect (SSR-safe per plan.md § Edge cases).

import { useRef, useEffect } from "react";
import type { Block } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { NowLine } from "./NowLine";
import { EmptyBlocks } from "./EmptyBlocks";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0") + ":00",
);

interface Props {
  blocks: Block[];
  now: string;
}

export function Timeline({ blocks, now }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on mount so NowLine is vertically centered in the visible viewport.
  // Runs once after first paint (SSR-safe: useEffect never runs on the server).
  // Uses behavior:"auto" (instant — no jarring smooth scroll on mount).
  useEffect(() => {
    if (!scrollRef.current) return;
    const containerHeight = scrollRef.current.clientHeight;
    const offsetPx = timeToOffsetPx(now, HOUR_HEIGHT_PX);
    const targetTop = Math.max(0, offsetPx - containerHeight / 2);
    scrollRef.current.scrollTop = targetTop;
    // Intentionally runs only once on mount — not on every `now` tick.
    // The user may have scrolled away intentionally; we don't re-center.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHeight = 24 * HOUR_HEIGHT_PX;
  const labelColumnWidth = 56;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-auto overflow-x-hidden"
      style={{
        // Reserve space for BottomBar (~96px) and above chrome.
        maxHeight: "calc(100dvh - 360px)",
      }}
    >
      <div
        data-testid="hour-grid"
        className="relative"
        style={{ height: `${totalHeight}px` }}
      >
        {/* Left column: hour labels */}
        <div
          className="absolute left-0 top-0 bottom-0 flex flex-col"
          style={{ width: `${labelColumnWidth}px` }}
        >
          {HOURS.map((label) => (
            <div
              key={label}
              data-testid="hour-label"
              className="flex-shrink-0 select-none px-2 pt-1 text-[10px]"
              style={{
                height: `${HOUR_HEIGHT_PX}px`,
                color: "var(--ink-dim)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Right column: schedule region with NowLine and EmptyBlocks */}
        <div
          className="absolute top-0 bottom-0 right-0"
          style={{
            left: `${labelColumnWidth}px`,
            // Hour-grid lines via CSS gradient (SG-m1-03 choice: CSS gradient).
            // Each row is HOUR_HEIGHT_PX tall; hairline at top of each row.
            backgroundImage:
              `repeating-linear-gradient(to bottom, var(--grid) 0px, var(--grid) 1px, transparent 1px, transparent ${HOUR_HEIGHT_PX}px)`,
          }}
        >
          {/* NowLine: z-10 keeps it above the EmptyState card (SG-m1-10) */}
          <NowLine now={now} />

          {/* EmptyBlocks card inside the timeline column (C-m1-014) */}
          {blocks.length === 0 && (
            <div
              className="absolute inset-x-4 z-0"
              style={{ top: "20px" }}
            >
              <EmptyBlocks />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
