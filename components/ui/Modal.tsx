"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose(): void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        data-variant="bottom-sheet"
        className={cn(
          "relative z-10 w-full max-w-[430px] rounded-t-2xl",
          "border-t border-[--ink-dim]/20 bg-[--bg-elev]",
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

  // Render into a portal to avoid stacking-context issues
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
