"use client";
// Hero — re-authored for M3 (plan.md § Components — <Hero>):
// - Wraps the numeral in <HeroRing> (SVG arc reflecting day score)
// - Numeral becomes aria-hidden; HeroRing carries the aria-label
// - pct prop: consumer passes dayPct(state) (M3 updated signature)
// - Date/Building/DAY COMPLETE metadata unchanged from M1
// M7c: firstPaintCountUp prop — threaded to <HeroRing firstPaintCountUp={...}>.
//   The 72-px numeral child is a children-as-function (render prop) so it receives
//   the live tween value (displayPct) from HeroRing, keeping stroke + numeral in sync.

import { HeroRing } from "./HeroRing";

interface Props {
  dateLabel: string;
  dayNumber?: number;
  totalDays: number;
  pct: number;
  firstPaintCountUp?: boolean; // M7c — threaded to <HeroRing>; default false (backwards-compat)
}

export function Hero({
  dateLabel,
  dayNumber,
  totalDays,
  pct,
  firstPaintCountUp = false,
}: Props) {
  return (
    <section className="px-5 pt-2 pb-5">
      <div
        className="text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "var(--ink-dim)" }}
      >
        {dateLabel}
      </div>
      {dayNumber !== undefined && (
        <div
          className="mt-1 text-[12px] tracking-[0.04em]"
          style={{ color: "var(--ink-dim)" }}
        >
          Building <span style={{ color: "var(--amber)" }}>{dayNumber}</span> of{" "}
          {totalDays}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 leading-none">
        {/* HeroRing wraps the numeral. The ring's aria-label is the canonical reading.
            M7c: children-as-function so the 72-px numeral receives the live tween value
            (roundedDisplayPct) from HeroRing, keeping stroke-dashoffset + numeral in sync
            (joint-state AC #1). */}
        <HeroRing pct={pct} firstPaintCountUp={firstPaintCountUp}>
          {(rounded) => (
            <span
              aria-hidden="true"
              data-testid="hero-numeral"
              className="font-serif-italic text-[72px] leading-[0.85]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rounded}%
            </span>
          )}
        </HeroRing>
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
