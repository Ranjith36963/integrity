"use client";
/**
 * VoiceCaptureOverlay — listening modal overlay.
 *
 * - role="dialog" + aria-label="Listening" + aria-modal="true"
 * - Animated pulsing ring around Mic glyph (reuses nowPulse cadence from globals.css)
 * - PRM: static amber ring when prefersReducedMotion=true
 * - Interim transcript in role="status" aria-live="polite"; placeholder "Listening…" when empty
 * - Cancel button: mirrors AddChooserSheet Cancel styling
 * - Focus moves to Cancel on open; ESC and backdrop click both call onCancel
 *
 * Resolves SG-m10-02.
 */

import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface Props {
  /** Mounted/visible while status === "listening" */
  open: boolean;
  /** Live partial transcript text (AC #5) */
  interim: string;
  /** Cancel affordance → hook cancel() (AC #8) */
  onCancel: () => void;
  /** PRM → static indicator, no animation (AC #6) */
  prefersReducedMotion: boolean;
}

export function VoiceCaptureOverlay({
  open,
  interim,
  onCancel,
  prefersReducedMotion,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel button on open (C-m10-013)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      cancelRef.current?.focus();
    }, 10);
    return () => clearTimeout(timer);
  }, [open]);

  // ESC key fires onCancel (C-m10-009)
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    /* Backdrop (C-m10-010): covers full viewport, dimmed */
    <div
      data-testid="voice-overlay-backdrop"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(7,9,15,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Dialog panel — stopPropagation prevents backdrop click when clicking inside */}
      <div
        role="dialog"
        aria-label="Listening"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          padding: "40px 32px",
          borderRadius: "20px",
          background: "var(--card)",
          border: "1px solid var(--card-edge)",
          width: "min(320px, calc(100vw - 40px))",
          maxWidth: "430px",
        }}
      >
        {/* Listening ring indicator */}
        <div
          data-testid="voice-ring"
          data-prm={prefersReducedMotion ? "true" : "false"}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "2px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            // Static ring always; pulse added via className below for non-PRM
            boxShadow: prefersReducedMotion
              ? "0 0 0 4px var(--accent-bloom)"
              : "0 0 0 4px var(--accent-bloom), 0 0 20px var(--accent-glow)",
          }}
          className={prefersReducedMotion ? "" : "voice-ring-pulse"}
        >
          <Mic size={28} />
        </div>

        {/* Live interim transcript */}
        <div
          role="status"
          aria-live="polite"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            color: interim ? "var(--ink)" : "var(--ink-dim)",
            textAlign: "center",
            minHeight: "1.5em",
          }}
        >
          {interim || "Listening…"}
        </div>

        {/* Cancel button — mirrors AddChooserSheet Cancel */}
        <button
          ref={cancelRef}
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          style={{
            height: "48px",
            paddingLeft: "32px",
            paddingRight: "32px",
            borderRadius: "8px",
            border: "1px solid var(--ink-dim)",
            background: "transparent",
            color: "var(--ink-dim)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-14)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
