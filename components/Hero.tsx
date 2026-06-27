"use client";
// Hero — re-authored for M3 (plan.md § Components — <Hero>):
// - Wraps the numeral in <HeroRing> (SVG arc reflecting day score)
// - Numeral becomes aria-hidden; HeroRing carries the aria-label
// - pct prop: consumer passes dayPct(state) (M3 updated signature)
// - Date/Building/DAY COMPLETE metadata unchanged from M1
// M7c: firstPaintCountUp prop — threaded to <HeroRing firstPaintCountUp={...}>.
//   The 72-px numeral child is a children-as-function (render prop) so it receives
//   the live tween value (displayPct) from HeroRing, keeping stroke + numeral in sync.
// R7-ROOT-5: optional `hydrated` prop. When false, the date/dayNumber rows
//   render a stable em-dash placeholder so the brief SSR-vs-CSR clock
//   mismatch (ADR-023 server-paint window) is invisible to the user.
//   Defaults to true for backwards-compat with every pre-R7 caller.

import { HeroRing } from "./HeroRing";

interface Props {
  dateLabel: string;
  dayNumber?: number;
  totalDays: number;
  pct: number;
  firstPaintCountUp?: boolean; // M7c — threaded to <HeroRing>; default false (backwards-compat)
  hydrated?: boolean; // R7-ROOT-5 — when false, render skeleton for date surfaces
}

export function Hero({
  dateLabel,
  dayNumber,
  totalDays,
  pct,
  firstPaintCountUp = false,
  hydrated = true,
}: Props) {
  // R7-ROOT-5: em-dash placeholders avoid showing the SSR server-clock value
  // for the ~60s window before useNow() reconciles to the client clock. The
  // layout is stable (same number of characters reserved) so there's no CLS.
  const dateLabelDisplay = hydrated ? dateLabel : "————, ——— —";
  const showDayNumber = hydrated && dayNumber !== undefined;
  const totalDaysDisplay = hydrated ? totalDays : "———";

  return (
    <section className="px-5 pt-2 pb-5">
      <div
        data-testid="hero-date-label"
        aria-live={hydrated ? undefined : "polite"}
        aria-busy={!hydrated || undefined}
        className="text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "var(--ink-dim)" }}
      >
        {dateLabelDisplay}
      </div>
      {(showDayNumber || !hydrated) && (
        <div
          data-testid="hero-day-number"
          aria-busy={!hydrated || undefined}
          className="mt-1 text-[11px] tracking-[0.22em] uppercase"
          style={{
            color: "var(--ink-dim)",
            fontVariantNumeric: "tabular-nums slashed-zero",
          }}
        >
          DAY{" "}
          <span aria-hidden="true" style={{ color: "var(--accent)" }}>
            ⌬
          </span>{" "}
          <span style={{ color: "var(--amber)" }}>
            {hydrated && dayNumber !== undefined
              ? String(dayNumber).padStart(3, "0")
              : "———"}
          </span>{" "}
          / {totalDaysDisplay}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 leading-none">
        {/* HeroRing renders the numeral as SVG text internally (E-m7c-003: SVG text
            is outside the CSS layout flow, preventing count-up CLS). The ring's
            aria-label is the canonical accessible reading; the numeral is aria-hidden. */}
        <HeroRing pct={pct} firstPaintCountUp={firstPaintCountUp} />
      </div>
      <div
        className="mt-2 text-[10px] tracking-[0.18em] uppercase"
        style={{ color: "var(--ink-dim)" }}
      >
        day complete
      </div>
    </section>
  );
}
