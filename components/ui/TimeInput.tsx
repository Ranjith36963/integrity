"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  id: string;
  value: string; // "HH:MM" or ""
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  hasError?: boolean;
  "aria-invalid"?: "true" | "false";
}

/**
 * Masked time input displaying HH:MM with a fixed colon.
 * Only the 4 digit slots are editable; the colon never moves.
 * Renders an invisible <input type="tel"> for keyboard capture and
 * a visible overlay div for the formatted display.
 */
export function TimeInput({
  id,
  value,
  onChange,
  inputRef,
  hasError,
  "aria-invalid": ariaInvalid,
}: Props) {
  // Local digit buffer (max 4 chars, no colon): "0400"
  const [digits, setDigits] = useState(() =>
    value.replace(/\D/g, "").slice(0, 4),
  );
  const [focused, setFocused] = useState(false);

  // Stable ref to current digits for the sync effect (avoids adding digits as dep)
  const digitsRef = useRef(digits);
  useEffect(() => {
    digitsRef.current = digits;
  });

  // Sync from parent when value changes externally (e.g. sheet reset on open).
  // Guard: skip when the change came from our own onChange emission to avoid loop.
  useEffect(() => {
    const cur = digitsRef.current;
    const expected =
      cur.length === 4 ? `${cur.slice(0, 2)}:${cur.slice(2)}` : "";
    if (value !== expected) {
      setDigits(value.replace(/\D/g, "").slice(0, 4));
    }
  }, [value]);

  // Display mask: "04:--", "--:--", "04:00"
  const display = `${digits[0] ?? "-"}${digits[1] ?? "-"}:${digits[2] ?? "-"}${digits[3] ?? "-"}`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setDigits(newDigits);
    if (newDigits.length === 4) {
      onChange(`${newDigits.slice(0, 2)}:${newDigits.slice(2)}`);
    } else {
      // Partial input → emit "" so parent treats it as invalid/empty
      onChange("");
    }
  }

  const borderColor = hasError
    ? "var(--accent-deep)"
    : focused
      ? "var(--accent)"
      : "var(--ink-dim)";

  return (
    <div style={{ position: "relative", height: "44px", width: "100%" }}>
      {/* Real input — transparent, positioned over display, receives keyboard */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="numeric"
        value={digits}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={ariaInvalid}
        style={{
          position: "absolute",
          inset: 0,
          height: "100%",
          width: "100%",
          opacity: 0,
          cursor: "text",
          fontSize: "16px", // prevent iOS zoom
          zIndex: 1,
        }}
      />
      {/* Visual mask overlay — pointer-events:none so taps fall through to input */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderRadius: "8px",
          border: `1px solid ${borderColor}`,
          background: "var(--bg-elev)",
          color: digits.length === 0 ? "var(--ink-dim)" : "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-14)",
          letterSpacing: "0.08em",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {display}
      </div>
    </div>
  );
}
