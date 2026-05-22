"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose(): void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
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
          "relative z-10 ml-auto h-full w-full max-w-[430px]",
          "bg-[--bg-elev]",
          "px-[--sp-16] pt-[--sp-16]",
          className,
        )}
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {title && (
          <h2 className="mb-[--sp-12] font-mono text-[--fs-16] text-[--ink]">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
