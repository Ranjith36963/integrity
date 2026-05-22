"use client";
// EmptyBlocks — re-authored for M1:
// Uses M0 <EmptyState> primitive with the locked SPEC copy (plan.md § Components).
// The <EmptyState> primitive already honors prefers-reduced-motion via CSS:
//   @media (prefers-reduced-motion: no-preference) { .empty-state-root[data-pulse="true"] { animation: pulse } }
// So pulse stops under reduced-motion for free (globals.css:151).
// M1 also reads usePrefersReducedMotion to set data-pulse explicitly,
// confirming the intent in the data attribute for test assertability.

import { EmptyState } from "@/components/ui/EmptyState";
import { usePrefersReducedMotion } from "@/lib/reducedMotion";

export function EmptyBlocks() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <EmptyState
      message="Tap any slot to lay your first block."
      pulse={!reducedMotion}
    />
  );
}
