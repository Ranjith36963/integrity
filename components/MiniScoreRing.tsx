"use client";
// MiniScoreRing — a small progress ring (score 0..100) used for the Year view's
// 12 month-rings. Track + glowing accent arc; null score → empty track.

interface Props {
  score: number | null;
  size?: number;
}

export function MiniScoreRing({ score, size = 40 }: Props) {
  const stroke = Math.max(3, size * 0.1);
  const r = (size - stroke) / 2;
  const C = size / 2;
  const circ = 2 * Math.PI * r;
  const prog = score !== null ? (score / 100) * circ : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle
        cx={C}
        cy={C}
        r={r}
        fill="none"
        stroke="var(--card-edge)"
        strokeWidth={stroke}
        opacity={0.5}
      />
      {score !== null && (
        <circle
          cx={C}
          cy={C}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={`${prog} ${circ - prog}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
          style={{ filter: "drop-shadow(0 0 2px var(--accent))" }}
        />
      )}
    </svg>
  );
}
