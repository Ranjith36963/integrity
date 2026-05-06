"use client";
// Hero — re-authored for M1 (SG-m1-08): drop <AnimatedPercent> count-up.
// M3 re-adds the count-up animation via <AnimatedPercent> once real scoring lands.
// The AnimatedPercent component file stays on disk; M1 simply does not import it.

interface Props {
  dateLabel: string;
  dayNumber?: number;
  totalDays: number;
  pct: number;
}

export function Hero({ dateLabel, dayNumber, totalDays, pct }: Props) {
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
          Building{" "}
          <span style={{ color: "var(--amber)" }}>{dayNumber}</span> of{" "}
          {totalDays}
        </div>
      )}
      <div className="mt-3 flex items-end gap-2 leading-none">
        {/* Plain span replaces <AnimatedPercent> for M1. M3 re-adds count-up. */}
        <span
          className="font-serif-italic text-[112px] leading-[0.85]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {pct}%
        </span>
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
