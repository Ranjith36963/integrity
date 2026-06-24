"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose(): void;
  title?: string;
  /**
   * id of an element inside the sheet that names the dialog (for callers
   * that render their own heading). Required when `title` is omitted,
   * otherwise the dialog has no accessible name (MS-2).
   */
  "aria-labelledby"?: string;
  children?: React.ReactNode;
  className?: string;
  /**
   * Layout variant. Default `"full"` covers the viewport (the right
   * choice for form-heavy sheets). `"compact"` is a bottom-anchored
   * auto-sized sheet — the right choice for short decision UIs like
   * "Add block / Add brick / Cancel", which previously rendered the
   * full-height layout and stranded the bottom 60% of the viewport.
   */
  variant?: "full" | "compact";
}

export function Sheet({
  open,
  onClose,
  title,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  variant = "full",
}: SheetProps) {
  // Track whether the scrollable content region has scrolled — used to
  // toggle a subtle elevation/shadow under the sticky header, iOS-style.
  const [scrolled, setScrolled] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Close on ESC key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset scroll state every time the sheet (re)opens. The header
  // shadow is a function of scrollTop; on every re-open the scroll
  // container has scrolled itself back to 0, so the elevation must
  // follow. setState in effect is correct here — it's a one-shot
  // synchronization with an external state change (open prop flip).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs header shadow with the open prop edge; no cascade because the dep array is the prop itself.
    if (open) setScrolled(false);
  }, [open]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const next = e.currentTarget.scrollTop > 2;
    if (next !== scrolled) setScrolled(next);
  }

  if (!open) return null;

  const isCompact = variant === "compact";

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "fixed inset-0 z-50 flex",
        // Compact = bottom-anchored, full = right-anchored (mobile = full-width).
        isCompact ? "items-end justify-center" : undefined,
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Full-screen sheet ≤430px; slide-in from right at desktop.
          Sci-fi Phase 2b — iris entrance: panel reveals via an expanding
          circular clip-path on mount. 320ms ease-out makes it feel like
          the sheet "blooms" from the bottom-center toward the corners.
          PRM users skip the animation (.scifi-iris-in opts into the
          existing PRM block in globals.css).
          Compact variant: auto-height, top-rounded corners, anchored to the
          bottom edge — the iOS / Material bottom-sheet pattern. */}
      <div
        data-variant={variant}
        className={cn(
          "scifi-iris-in relative z-10 flex w-full max-w-[430px] flex-col",
          isCompact ? "h-auto max-h-[90dvh] rounded-t-2xl" : "ml-auto h-full",
          "bg-[var(--bg-elev)]",
          className,
        )}
        style={{
          paddingTop: isCompact
            ? "var(--sp-16)"
            : "calc(var(--safe-top, 0px) + var(--sp-16))",
          paddingBottom: isCompact
            ? "calc(var(--safe-bottom, 0px) + var(--sp-16))"
            : "var(--safe-bottom, 0px)",
        }}
      >
        {title && (
          <header
            data-scrolled={scrolled ? "true" : undefined}
            className="flex items-center justify-between gap-[var(--sp-12)] border-b border-white/5 px-[var(--sp-16)] pb-[var(--sp-12)] transition-shadow duration-150"
            style={{
              // Subtle shadow only when content has scrolled under the header.
              // Pre-scroll: flat hairline border-b carries the separation.
              // Post-scroll: 0 4px 12px -4px black ~40% lifts the header.
              boxShadow: scrolled ? "0 4px 12px -4px rgba(0,0,0,0.5)" : "none",
            }}
          >
            <h2 className="font-mono [font-size:var(--fs-22)] tracking-tight text-[var(--ink)]">
              {title}
            </h2>
            <button
              type="button"
              data-testid="sheet-close"
              aria-label="Close"
              onClick={onClose}
              className="tap grid h-11 w-11 place-items-center rounded-md [font-size:var(--fs-22)] text-[var(--ink-dim)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              ×
            </button>
          </header>
        )}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "px-[var(--sp-16)] pt-[var(--sp-16)]",
            // Full variant: scroll container fills remaining height so the
            // primary action can pin to the bottom via mt-auto.
            // Compact variant: no scroll, content sets its own height.
            isCompact ? undefined : "flex flex-1 flex-col overflow-y-auto",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
