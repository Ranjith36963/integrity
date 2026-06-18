"use client";
/**
 * components/BrandMarkLongPress.tsx — M7e: brand-mark easter-egg long-press wrapper.
 *
 * Wraps the DHARMA brand-mark cluster in <TopBar> with a 600 ms long-press gesture.
 * On threshold: fires haptics.light() + opens YearHeatmapPreview overlay.
 * On release/cancel/leave: closes overlay.
 * Short tap (<600 ms): no-op (brand mark is decorative).
 *
 * Props: { state: AppState; children: ReactNode; prefersReducedMotion?: boolean }
 * Uses useLongPress (M4c single-fire variant) with holdMs: 600 (SG-m7e-07).
 *
 * A11y: <button> wrapper with aria-label="DHARMA — long-press for year heatmap"
 *        min-height ≥ 44 px via padding (ADR-031)
 * data-testid="brand-mark-longpress" on the wrapper.
 */

import { useState, type ReactNode } from "react";
import { useLongPress } from "@/lib/longPress";
import { haptics } from "@/lib/haptics";
import { YearHeatmapPreview } from "./YearHeatmapPreview";
import type { AppState } from "@/lib/types";

type BrandMarkLongPressProps = {
  state: AppState;
  children: ReactNode;
  prefersReducedMotion?: boolean;
};

// Long-press threshold for the brand-mark easter egg (SG-m7e-07: 600 ms NOT 500 ms)
const BRAND_HOLD_MS = 600;

export function BrandMarkLongPress({
  state,
  children,
  prefersReducedMotion = false,
}: BrandMarkLongPressProps) {
  const [overlayVisible, setOverlayVisible] = useState(false);

  function openOverlay() {
    haptics.light();
    setOverlayVisible(true);
  }

  function closeOverlay() {
    setOverlayVisible(false);
  }

  const { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave } =
    useLongPress({
      onTap: () => {}, // brand mark is decorative — tap is no-op
      onLongPress: openOverlay,
      holdMs: BRAND_HOLD_MS,
    });

  // Override pointer handlers to also close overlay on any termination
  function handlePointerUp(e: React.PointerEvent) {
    closeOverlay();
    onPointerUp(e);
  }

  function handlePointerCancel(e: React.PointerEvent) {
    closeOverlay();
    onPointerCancel(e);
  }

  function handlePointerLeave(e: React.PointerEvent) {
    closeOverlay();
    onPointerLeave(e);
  }

  return (
    <>
      <button
        type="button"
        data-testid="brand-mark-longpress"
        aria-label="DHARMA — long-press for year heatmap"
        onPointerDown={onPointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "12px 0", // vertical padding to reach ≥44 px tap target (ADR-031)
          minHeight: "44px",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {children}
      </button>
      {overlayVisible && (
        <YearHeatmapPreview
          state={state}
          prefersReducedMotion={prefersReducedMotion}
        />
      )}
    </>
  );
}
