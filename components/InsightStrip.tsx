/**
 * components/InsightStrip.tsx — 3-card stat strip used below the
 * Week / Month / Year grid. Replaces dead bottom space with concrete
 * "what did I do" context.
 *
 * Visual language matches the rest of the app: dark --card panels, mono
 * label + serif numeric, ink-dim secondary copy. The big number is the
 * signal — the label is the floor. No decorative gradients, no icons.
 *
 * Props are flat KPIs to keep this component stateless and trivial to
 * test. Each card may show "—" when value is null (no data yet).
 */

import type { ReactNode } from "react";

type Item = {
  label: string;
  /** Value to display. null renders an em-dash to mean "no data yet." */
  value: number | string | null;
  /** Optional suffix (e.g., "%", "days") rendered smaller, dim, after the value. */
  suffix?: string;
};

type Props = {
  items: [Item, Item, Item];
  /** Optional id (used by aria-labelledby on the section). */
  id?: string;
};

function Numeric({ value, suffix }: { value: Item["value"]; suffix?: string }) {
  if (value === null) {
    return (
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--fs-32)",
          color: "var(--ink-dim)",
          letterSpacing: "-0.02em",
        }}
      >
        —
      </span>
    );
  }
  // A literal zero is honest data (the user has produced nothing yet for
  // this period). Dim it so the eye reads it as "haven't started" rather
  // than competing with real numbers. Non-zero values get full --ink.
  const isZero = value === 0 || value === "0";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "2px",
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: "var(--fs-32)",
        color: isZero ? "var(--ink-dim)" : "var(--ink)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        // HUD readout: real data glows faintly, zero stays dark — the glow
        // itself is information (same rule as the calendar cells).
        textShadow: isZero ? "none" : "0 0 12px rgba(251, 191, 36, 0.35)",
      }}
    >
      {value}
      {suffix !== undefined && (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-12)",
            fontStyle: "normal",
            color: "var(--ink-dim)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}

function Card({ label, value, suffix }: Item): ReactNode {
  return (
    <li
      data-testid="insight-card"
      style={{
        flex: 1,
        minWidth: 0,
        padding: "var(--sp-12, 12px)",
        borderRadius: "12px",
        background: "var(--surface-1)",
        border: "1px solid var(--surface-2)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-10, 10px)",
          color: "var(--ink-dim)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <Numeric value={value} suffix={suffix} />
    </li>
  );
}

export function InsightStrip({ items, id }: Props) {
  return (
    <section
      id={id}
      aria-label="Insights"
      data-testid="insight-strip"
      style={{
        marginTop: "var(--sp-16, 16px)",
        padding: "0 var(--sp-16, 16px)",
      }}
    >
      <ul
        style={{
          display: "flex",
          gap: "8px",
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        <Card {...items[0]} />
        <Card {...items[1]} />
        <Card {...items[2]} />
      </ul>
    </section>
  );
}
