"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  tone?: "neutral" | "info";
  pulse?: boolean;
  actionLabel?: string;
  onAction?(): void;
  className?: string;
}

export function EmptyState({
  message,
  tone = "neutral",
  pulse = true,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      data-pulse={pulse ? "true" : "false"}
      className={cn(
        "empty-state-root flex flex-col items-center gap-[--sp-12] rounded-xl border border-[--ink-dim]/20 bg-[--bg-elev] p-[--sp-24] text-center",
        tone === "info" && "border-[--accent]/30",
        className,
      )}
    >
      <p className="font-mono text-[--fs-14] text-[--ink-dim]">{message}</p>
      {actionLabel && onAction && (
        <Button variant="ghost" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
