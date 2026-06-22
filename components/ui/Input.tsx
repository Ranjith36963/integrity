"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps {
  id: string;
  type?: "text" | "time" | "number";
  value: string | number;
  onChange(value: string): void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Input({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  disabled,
  label,
  className,
}: InputProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={id}
          className="font-mono [font-size:var(--fs-12)] text-[var(--ink-dim)]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
        inputMode={type === "number" ? "numeric" : undefined}
        className={cn(
          "h-11 w-full rounded-lg border border-[var(--ink-dim)]/30 bg-[var(--bg-elev)] px-3",
          "font-mono [font-size:var(--fs-14)] text-[var(--ink)] placeholder:text-[var(--ink-dim)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          "disabled:pointer-events-none disabled:opacity-50",
          error &&
            "border-[var(--accent-deep)] focus:ring-[var(--accent-deep)]",
        )}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          className="font-mono [font-size:var(--fs-12)]"
          style={{ color: "var(--accent-deep)" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
