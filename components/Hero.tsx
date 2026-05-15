"use client";
// Hero — re-authored for M3 (plan.md § Components — <Hero>):
// - Wraps the numeral in <HeroRing> (SVG arc reflecting day score)
// - Numeral becomes aria-hidden; HeroRing carries the aria-label
// - pct prop: consumer passes dayPct(state) (M3 updated signature)
// - Date/Building/DAY COMPLETE metadata unchanged from M1

import { HeroRing } from "./HeroRing";

interface Props {
  dateLabel: string;
  dayNumber?: number;
  totalDays: number;
  pct: number;
}

export function Hero({ dateLabel, dayNumber, totalDays, pct }: Props) {
  const roundedPct = Math.round(pct);

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
        {/* HeroRing wraps the numeral. The ring's aria-label is the canonical reading. */}
        <HeroRing pct={pct}>
          <span
            aria-hidden="true"
            className="font-serif-italic text-[72px] leading-[0.85]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {roundedPct}%
          </span>
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
