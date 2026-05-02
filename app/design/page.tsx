/**
 * app/_design/page.tsx — Design system harness.
 * Renders all 10 M0 primitives in every documented state.
 * Also includes a contrast-pair table at the bottom for axe scanning.
 *
 * Route: /_design
 * Accessible in dev and Playwright; excluded from prod nav by Next.js
 * underscore-prefix convention. See components/ui/README.md for docs.
 */
import React from "react";
import { HarnessClient } from "./HarnessClient";

export default function DesignPage() {
  return (
    <main>
      <h1 className="mb-6 font-mono text-[--fs-22] text-[--ink]">
        M0 Design System Harness
      </h1>
      <HarnessClient />

      {/* Contrast-pair table — raw style so axe can scan every combo */}
      <section className="mt-12">
        <h2 className="mb-4 font-mono tracking-wider text-[--fs-14] text-[--ink-dim] uppercase">
          Token Contrast Pairs
        </h2>
        <div className="flex flex-col gap-2">
          <div
            style={{ color: "#f5f1e8", background: "#07090f" }}
            className="rounded p-3 font-mono text-[--fs-12]"
          >
            --ink on --bg (#f5f1e8 / #07090f) ≈ 17.5:1 AAA
          </div>
          <div
            style={{ color: "rgba(245,241,232,0.5)", background: "#07090f" }}
            className="rounded p-3 font-mono text-[--fs-12]"
          >
            --ink-dim on --bg (rgba warm-white 50%) ≈ 8.7:1 AA
          </div>
          <div
            style={{ color: "#fbbf24", background: "#07090f" }}
            className="rounded p-3 font-mono text-[--fs-12]"
          >
            --accent on --bg (#fbbf24 / #07090f) ≈ 13:1 AA
          </div>
          <div
            style={{ color: "#f5f1e8", background: "#0c1018" }}
            className="rounded p-3 font-mono text-[--fs-12]"
          >
            --ink on --bg-elev (#f5f1e8 / #0c1018) elevated surface
          </div>
        </div>
      </section>
    </main>
  );
}
