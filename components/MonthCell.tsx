"use client";
/**
 * MonthCell — M9e: one month tile in the Year (Empire) 3×4 grid.
 * Mirrors WeekDayCell's reuse-not-fork relationship to DayCell.
 *
 * Props:
 *   year, monthIndex, name: descriptor for this month tile
 *   score: number | null — monthScore result; null means no-data (fully future/pre-start)
 *   isCurrentMonth?: boolean — adds the today-marker accent outline
 *   onOpen: () => void — every month is tappable (SG-m9e-03, AC #10)
 *
 * Heat-fill formula: alpha = 0.12 + (score/100) * 0.78 — identical to DayCell/WeekDayCell.
 * score === null → no heat fill, --card background, --card-edge border, em-dash glyph.
 * score === 0 → alpha 0.12 (floor), visible numeral "0".
 *
 * Design tokens: --card, --card-edge, --ink, --ink-dim, --accent — all defined M0 tokens.
 * No --surface-2 (undefined in globals.css).
 * ADR-031: minHeight 44px.
 */

type MonthCellProps = {
  year: number;
  monthIndex: number;
  name: string;
  score: number | null;
  isCurrentMonth?: boolean;
  onOpen: () => void;
};

export function MonthCell({
  year,
  name,
  score,
  isCurrentMonth,
  onOpen,
}: MonthCellProps) {
  const rounded = score !== null ? Math.round(score) : null;

  // aria-label grammar: "<Month> <year>, score <N> percent" or "<Month> <year>, no data"
  // with ", current month" inserted when isCurrentMonth
  const scorePart = score !== null ? `score ${rounded} percent` : "no data";
  const currentPart = isCurrentMonth ? ", current month" : "";
  const ariaLabel = `${name} ${year}, ${scorePart}${currentPart}`;

  // Heat fill: alpha = 0.12 + (score/100) * 0.78
  const alpha = score !== null ? 0.12 + (score / 100) * 0.78 : null;

  const buttonStyle: React.CSSProperties =
    score !== null
      ? {
          // Scored tile: heat fill
          background: `rgba(251, 191, 36, ${alpha})`,
          border: "none",
          ...(isCurrentMonth
            ? { outline: "2px solid var(--accent)", outlineOffset: "1px" }
            : {}),
          minHeight: "44px",
          minWidth: "44px",
          borderRadius: "6px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          fontFamily: "var(--font-ui)",
          padding: "4px",
          width: "100%",
        }
      : {
          // No-data tile: flat --card bg + --card-edge border
          background: "var(--card)",
          border: "1px solid var(--card-edge)",
          ...(isCurrentMonth
            ? { outline: "2px solid var(--accent)", outlineOffset: "1px" }
            : {}),
          minHeight: "44px",
          minWidth: "44px",
          borderRadius: "6px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          fontFamily: "var(--font-ui)",
          padding: "4px",
          width: "100%",
        };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onOpen}
      style={buttonStyle}
    >
      {/* Month name */}
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12)",
          color: score !== null ? "var(--ink)" : "var(--ink-dim)",
          lineHeight: 1.2,
        }}
      >
        {name}
      </span>

      {/* Score indicator or no-data glyph */}
      {score !== null ? (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-12)",
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          {rounded}
        </span>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-12)",
            color: "var(--ink-dim)",
            lineHeight: 1,
          }}
        >
          &mdash;
        </span>
      )}
    </button>
  );
}
