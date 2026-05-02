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
          className="font-mono text-[--fs-12] text-[--ink-dim]"
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
          "h-11 w-full rounded-lg border border-[--ink-dim]/30 bg-[--bg-elev] px-3",
          "font-mono text-[--fs-14] text-[--ink] placeholder:text-[--ink-dim]",
          "focus:ring-2 focus:ring-[--accent] focus:ring-offset-0 focus:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          error && "border-[--accent-deep] focus:ring-[--accent-deep]",
        )}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          className="font-mono text-[--fs-12]"
          style={{ color: "var(--accent-deep)" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
