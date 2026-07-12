"use client";
/**
 * WeekDayCell — M9d: one day row in the Castle week view.
 * Reuses M9c DayCell kind vocabulary at row scale (no blank kind — weeks are always 7 real dates).
 *
 * Props mirror DayCell but row-shaped:
 *   { kind: "future" | "pre-start" | "missed" | "scored"; date: string; dayOfMonth: number;
 *     weekdayLabel: string; score?: number; isToday?: boolean; onOpen?: () => void }
 *
 * Per-kind rendering (ADR-038 forgiveness, ADR-031 44px, ADR-019 0=Sun):
 *   scored:    <div role="listitem"> wrapping <button> with heat fill (var(--accent) at alpha)
 *              + numeric score + aria-label "Weekday, Month day, year, [today, ]score N percent"
 *              isToday: adds 2px var(--accent) outline to the button
 *   missed:    plain <div role="listitem">, var(--card) bg, var(--card-edge) border, no numeral (ADR-038)
 *   future:    plain <div role="listitem">, transparent bg, ink-dim text
 *   pre-start: identical inert treatment to future
 *
 * Design tokens: --accent, --card, --card-edge, --ink, --ink-dim, --font-ui, --fs-12, --fs-10
 * No --surface-2 (undefined in globals.css).
 */

// Month name lookup for aria-label construction
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Short label → full day name lookup
const WEEKDAY_SHORT_TO_FULL: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

type WeekDayCellProps =
  | {
      kind: "scored";
      date: string;
      dayOfMonth: number;
      weekdayLabel: string;
      score: number;
      isToday?: boolean;
      onOpen: () => void;
    }
  | {
      kind: "missed" | "future" | "pre-start";
      date: string;
      dayOfMonth: number;
      weekdayLabel: string;
      score?: never;
      isToday?: never;
      onOpen?: never;
    };

/**
 * Build the aria-label for a scored row.
 * Format: "Weekday, Month day, year[, today], score N percent"
 */
function buildAriaLabel(
  date: string,
  weekdayLabel: string,
  score: number,
  isToday: boolean,
): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  const fullWeekday = WEEKDAY_SHORT_TO_FULL[weekdayLabel] ?? weekdayLabel;
  const monthName = MONTH_NAMES[month];
  const todayPart = isToday ? ", today" : "";
  return `${fullWeekday}, ${monthName} ${day}, ${year}${todayPart}, score ${Math.round(score)} percent`;
}

export function WeekDayCell(props: WeekDayCellProps) {
  const { kind, dayOfMonth, weekdayLabel } = props;

  if (kind === "scored") {
    const { date, score, isToday = false, onOpen } = props;
    const alpha = 0.12 + (score / 100) * 0.78;
    const ariaLabel = buildAriaLabel(date, weekdayLabel, score, isToday);

    return (
      <div role="listitem">
        <button
          type="button"
          onClick={onOpen}
          aria-label={ariaLabel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minHeight: "44px",
            padding: "var(--sp-8, 8px) var(--sp-12, 12px)",
            background: `rgba(251,191,36,${alpha})`, // var(--accent) at scaled alpha
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            outline: isToday ? "2px solid var(--accent)" : "none",
            outlineOffset: "1px",
            textAlign: "left",
            boxSizing: "border-box",
            // HUD heat: glow scales with the score (same rule as Month/Year).
            boxShadow: `0 0 ${Math.round(6 + (score / 100) * 12)}px -2px rgba(251, 191, 36, ${(0.1 + (score / 100) * 0.4).toFixed(2)})`,
          }}
        >
          <span
            style={{
              display: "flex",
              gap: "var(--sp-8, 8px)",
              alignItems: "center",
              color: "var(--ink)",
              fontSize: "var(--fs-12)",
            }}
          >
            <span style={{ minWidth: "3ch", fontFamily: "var(--font-ui)" }}>
              {weekdayLabel}
            </span>
            <span style={{ fontFamily: "var(--font-ui)" }}>{dayOfMonth}</span>
          </span>
          <span
            style={{
              color: "var(--ink)",
              fontSize: "var(--fs-12)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {Math.round(score)}
          </span>
        </button>
      </div>
    );
  }

  if (kind === "missed") {
    return (
      <div
        role="listitem"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: "44px",
          padding: "var(--sp-8, 8px) var(--sp-12, 12px)",
          background: "var(--card)",
          border: "1px solid var(--card-edge)",
          borderRadius: "6px",
          fontFamily: "var(--font-ui)",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "flex",
            gap: "var(--sp-8, 8px)",
            alignItems: "center",
            color: "var(--ink-dim)",
            fontSize: "var(--fs-12)",
          }}
        >
          <span style={{ minWidth: "3ch" }}>{weekdayLabel}</span>
          <span>{dayOfMonth}</span>
        </span>
      </div>
    );
  }

  // future or pre-start — identical inert treatment
  return (
    <div
      role="listitem"
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: "44px",
        padding: "var(--sp-8, 8px) var(--sp-12, 12px)",
        background: "transparent",
        borderRadius: "6px",
        fontFamily: "var(--font-ui)",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "flex",
          gap: "var(--sp-8, 8px)",
          alignItems: "center",
          color: "var(--ink-dim)",
          fontSize: "var(--fs-12)",
          opacity: 0.5,
        }}
      >
        <span style={{ minWidth: "3ch" }}>{weekdayLabel}</span>
        <span>{dayOfMonth}</span>
      </span>
    </div>
  );
}
