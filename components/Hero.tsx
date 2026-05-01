import { AnimatedPercent } from "./AnimatedPercent";

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
          Building <span style={{ color: "var(--amber)" }}>{dayNumber}</span> of{" "}
          {totalDays}
        </div>
      )}
      <div className="mt-3 flex items-end gap-2 leading-none">
        <AnimatedPercent
          value={pct}
          className="font-serif-italic text-[112px] leading-[0.85]"
        />
        <span
          className="font-serif-italic pb-2 text-[40px] leading-[0.9]"
          style={{ color: "var(--ink-dim)" }}
        >
          %
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
