"use client";
// RecurrenceChips — new for M2 (plan.md § Components — Recurrence chips):
// - 4-chip single-select: Just today / Every weekday / Every day / Custom range
// - Default: just-today
// - role="radiogroup" on wrapper; role="radio" + aria-checked on each chip
// - Custom range selected: reveals two date <input>s and 7 weekday chips
// - Emits fully-formed Recurrence discriminated-union value via onChange(rec)
// - Pure presentational — consumer (AddBlockSheet) calls isValidCustomRange(rec)

import type { Recurrence } from "@/lib/types";

const TODAY_ISO = "2026-05-06"; // default date for just-today chip

const CHIPS: { label: string; kind: Recurrence["kind"] }[] = [
  { label: "Just today", kind: "just-today" },
  { label: "Every weekday", kind: "every-weekday" },
  { label: "Every day", kind: "every-day" },
  { label: "Custom range", kind: "custom-range" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  value: Recurrence;
  onChange: (rec: Recurrence) => void;
  today?: string; // ISO YYYY-MM-DD, defaults to page-load date
}

function makeDefault(kind: Recurrence["kind"], today: string): Recurrence {
  switch (kind) {
    case "just-today":
      return { kind: "just-today", date: today };
    case "every-weekday":
      return { kind: "every-weekday" };
    case "every-day":
      return { kind: "every-day" };
    case "custom-range":
      return { kind: "custom-range", start: "", end: "", weekdays: [] };
  }
}

export function RecurrenceChips({ value, onChange, today = TODAY_ISO }: Props) {
  const isCustom = value.kind === "custom-range";
  const customRange = isCustom
    ? (value as Extract<Recurrence, { kind: "custom-range" }>)
    : null;

  function handleChipClick(kind: Recurrence["kind"]) {
    if (kind === value.kind) return;
    onChange(makeDefault(kind, today));
  }

  function handleDateChange(field: "start" | "end", val: string) {
    if (!customRange) return;
    onChange({ ...customRange, [field]: val });
  }

  function handleWeekdayToggle(day: number) {
    if (!customRange) return;
    const next = customRange.weekdays.includes(day)
      ? customRange.weekdays.filter((d) => d !== day)
      : [...customRange.weekdays, day].sort((a, b) => a - b);
    onChange({ ...customRange, weekdays: next });
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Recurrence"
        style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
      >
        {CHIPS.map(({ label, kind }) => {
          const selected = value.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleChipClick(kind)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-12)",
                padding: "8px 12px",
                minHeight: "44px",
                borderRadius: "9999px",
                border: `1px solid ${selected ? "var(--accent)" : "var(--ink-dim)"}`,
                background: selected ? "var(--accent)" : "transparent",
                color: selected ? "var(--bg)" : "var(--ink-dim)",
                cursor: "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Custom range sub-form — only visible when kind === 'custom-range' */}
      {isCustom && customRange && (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--ink-dim)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                From
              </label>
              <input
                type="date"
                aria-label="Custom range start date"
                value={customRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14)",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--ink-dim)",
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--ink-dim)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                To
              </label>
              <input
                type="date"
                aria-label="Custom range end date"
                value={customRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14)",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--ink-dim)",
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>

          {/* 7-button weekday picker */}
          <div
            role="group"
            aria-label="Weekdays"
            style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
          >
            {WEEKDAYS.map((day, i) => {
              const selected = customRange.weekdays.includes(i);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  aria-label={day}
                  onClick={() => handleWeekdayToggle(i)}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-12)",
                    padding: "6px 8px",
                    minHeight: "44px",
                    minWidth: "44px",
                    borderRadius: "8px",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--ink-dim)"}`,
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "var(--bg)" : "var(--ink-dim)",
                    cursor: "pointer",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
