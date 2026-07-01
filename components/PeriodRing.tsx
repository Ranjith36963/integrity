"use client";
// PeriodRing — shared sci-fi score ring for the Week / Month / Year headers.
// Replaces the near-identical inline WeekAggregate / YearAggregate rings and
// gives them the same sci-fi language as the Hero / Day rings: a glowing
// progress arc, a rotating amber orbital-dash ring, a faint core glow, and a
// glowing numeral. Motion is CSS-class driven (disabled under reduced-motion).

interface Props {
  /** 0..100, or null when the period has no data yet. */
  score: number | null;
  /** Period name shown under the ring + used for the accessible label. */
  label: string;
}

const SIZE = 100;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const R_DASH = R + STROKE / 2 + 2; // orbital dashes just outside the band

export function PeriodRing({ score, label }: Props) {
  const progress = score !== null ? (score / 100) * CIRCUMFERENCE : 0;
  const ariaLabel =
    score !== null
      ? `${label} score ${Math.round(score)} percent`
      : `${label} score: no data`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--sp-12, 12px) 0",
      }}
    >
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg
          role="img"
          aria-label={ariaLabel}
          width={SIZE}
          height={SIZE}
          viewBox={`-10 -10 ${SIZE + 20} ${SIZE + 20}`}
        >
          <defs>
            <radialGradient
              id={`period-core-${label}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.14} />
              <stop offset="70%" stopColor="var(--accent)" stopOpacity={0.03} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Sci-fi: faint amber core glow */}
          <circle cx={C} cy={C} r={R} fill={`url(#period-core-${label})`} />

          {/* Track */}
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="var(--card-edge)"
            strokeWidth={STROKE}
          />

          {/* Progress arc — starts at top (rotate -90), glows in accent */}
          {score !== null && (
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={STROKE}
              strokeDasharray={`${progress} ${CIRCUMFERENCE - progress}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${C} ${C})`}
              style={{ filter: "drop-shadow(0 0 3px var(--accent))" }}
            />
          )}

          {/* Sci-fi: rotating amber orbital data-dashes on the outer edge */}
          <circle
            className="scifi-orbital-dashes"
            cx={C}
            cy={C}
            r={R_DASH}
            fill="none"
            stroke="var(--accent-glow, var(--accent))"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="3 12"
            opacity={0.7}
          />
        </svg>

        {/* Centered numeral (glowing) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-32)",
              color: score !== null ? "var(--ink)" : "var(--ink-dim)",
              lineHeight: 1,
              textShadow:
                score !== null
                  ? "0 0 8px var(--accent-glow, rgba(251,191,36,0.5))"
                  : "none",
            }}
          >
            {score !== null ? `${Math.round(score)}%` : "—"}
          </span>
        </div>
      </div>

      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-10)",
          color: "var(--ink-dim)",
          marginTop: "var(--sp-4, 4px)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
