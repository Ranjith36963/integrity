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
}

export function Sheet({
  open,
  onClose,
  title,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
}: SheetProps) {
  // Close on ESC key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-labelledby={ariaLabelledBy}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Full-screen sheet ≤430px; slide-in from right at desktop */}
      <div
        data-variant="full"
        className={cn(
          "relative z-10 ml-auto flex h-full w-full max-w-[430px] flex-col",
          "bg-[var(--bg-elev)]",
          className,
        )}
        style={{
          paddingTop: "calc(var(--safe-top, 0px) + var(--sp-16))",
          paddingBottom: "var(--safe-bottom, 0px)",
        }}
      >
        {title && (
          <header className="flex items-center justify-between gap-[var(--sp-12)] border-b border-white/5 px-[var(--sp-16)] pb-[var(--sp-12)]">
            <h2 className="font-mono text-[var(--fs-22)] tracking-tight text-[var(--ink)]">
              {title}
            </h2>
            <button
              type="button"
              data-testid="sheet-close"
              aria-label="Close"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-md text-[var(--fs-22)] text-[var(--ink-dim)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              ×
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-[var(--sp-16)] pt-[var(--sp-16)]">
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
