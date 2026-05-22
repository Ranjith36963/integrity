"use client";
import React from "react";

/**
 * Design harness layout. Applies max-w-[430px] page shell and marks the
 * root with data-testid="design-harness" for e2e targeting.
 * Route: /design (no underscore — see ADR-030; privacy from prod nav
 * is enforced by absence of any link, not by directory naming).
 */
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="design-harness"
      className="mx-auto max-w-[430px] px-4 py-6"
    >
      {children}
    </div>
  );
}
