// lib/longPress.test.ts — M4b Goal Brick Stepper tests for useLongPressRepeat hook
// Covers: U-m4b-012, U-m4b-013, U-m4b-014

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPressRepeat, HOLD_MS, INTERVAL_MS } from "./longPress";

// ─── U-m4b-012: HOLD_MS and INTERVAL_MS constants ────────────────────────────

describe("U-m4b-012: longPress module exports HOLD_MS === 500 and INTERVAL_MS === 50", () => {
  it("HOLD_MS is exactly 500", () => {
    expect(HOLD_MS).toBe(500);
  });

  it("INTERVAL_MS is exactly 50", () => {
    expect(INTERVAL_MS).toBe(50);
  });
});
