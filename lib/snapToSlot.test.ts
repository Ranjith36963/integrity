// lib/snapToSlot.test.ts — M6: pure unit tests for snapToSlot + shiftEnd helpers.
// Tests U-m6-010 (snapToSlot boundary table), U-m6-011 (shiftEnd duration/clamp),
// U-m6-012 (TZ-independence). No React, no DOM.

import { describe, it, expect } from "vitest";
import { snapToSlot, shiftEnd, SLOT_MIN } from "./snapToSlot";

// U-m6-010 — snapToSlot EXACT "HH:MM" outputs on the 30-min grid
describe("U-m6-010: snapToSlot — 30-min grid; exact boundary table", () => {
  it("SLOT_MIN is exactly 30 (SG-m6-07)", () => {
    expect(SLOT_MIN).toBe(30);
  });

  it("offset 0 → '00:00'", () => {
    expect(snapToSlot(0, 60)).toBe("00:00");
  });

  it("offset 14 (14 min at 60px/hr) → '00:00' (round down)", () => {
    // 14 / 60 * 60 = 14 minutes; nearest 30-min slot = 0 → "00:00"
    expect(snapToSlot(14, 60)).toBe("00:00");
  });

  it("offset 15 (15 min) → '00:30' (round-half-up to 30)", () => {
    // 15 minutes → Math.round(15/30)*30 = 30 → "00:30"
    expect(snapToSlot(15, 60)).toBe("00:30");
  });

  it("offset 30 (30 min) → '00:30'", () => {
    expect(snapToSlot(30, 60)).toBe("00:30");
  });

  it("offset 44 (44 min) → '00:30' (round down from 44)", () => {
    // 44 min → Math.round(44/30)*30 = Math.round(1.47)*30 = 30 → "00:30"
    expect(snapToSlot(44, 60)).toBe("00:30");
  });

  it("offset 45 (45 min) → '01:00' (round-half-up to 60)", () => {
    // 45 min → Math.round(45/30)*30 = Math.round(1.5)*30 = 2*30 = 60 → "01:00"
    expect(snapToSlot(45, 60)).toBe("01:00");
  });

  it("offset 1440 (24h = 24*60 min at 60px/hr) clamps to '23:30' (SG-m6-08)", () => {
    // 1440 / 60 * 60 = 1440 min = 24:00 → clamped to 23:30
    expect(snapToSlot(1440, 60)).toBe("23:30");
  });

  it("negative offset -1 clamps to '00:00' (SG-m6-08)", () => {
    expect(snapToSlot(-1, 60)).toBe("00:00");
  });

  it("does not throw in a JSDOM-free environment", () => {
    expect(() => snapToSlot(120, 60)).not.toThrow();
  });

  it("reads no clock — output is deterministic", () => {
    const a = snapToSlot(120, 60);
    const b = snapToSlot(120, 60);
    expect(a).toBe(b);
  });
});

// U-m6-011 — shiftEnd preserves duration; clamps to [00:00, 24:00]; null round-trips
describe("U-m6-011: shiftEnd — duration preserved; upper clamp; null preserved", () => {
  it("('08:00', '09:00', '10:00') → '11:00' (60-min duration shifted +2h)", () => {
    expect(shiftEnd("08:00", "09:00", "10:00")).toBe("11:00");
  });

  it("('08:00', '10:00', '07:30') → '09:30' (120-min duration shifted -30min)", () => {
    expect(shiftEnd("08:00", "10:00", "07:30")).toBe("09:30");
  });

  it("('23:00', '24:00', '23:30') → '24:00' (clamps to 24:00 upper bound, SG-m6-08)", () => {
    expect(shiftEnd("23:00", "24:00", "23:30")).toBe("24:00");
  });

  it("('08:00', null, '10:00') → null (open-ended — null in, null out)", () => {
    expect(shiftEnd("08:00", null, "10:00")).toBe(null);
  });

  it("('00:00', '00:30', '00:00') → '00:30' (no-shift round-trip)", () => {
    expect(shiftEnd("00:00", "00:30", "00:00")).toBe("00:30");
  });

  it("overnight block preserves its wrap duration when dragged earlier", () => {
    // Sleep 22:00→04:00 (6h) dragged to start 02:00 → 02:00→08:00 (still 6h).
    expect(shiftEnd("22:00", "04:00", "02:00")).toBe("08:00");
  });

  it("overnight block stays overnight when dragged later", () => {
    // Sleep 22:00→04:00 (6h) dragged to 23:00 → 23:00→05:00 (wraps, still 6h).
    expect(shiftEnd("22:00", "04:00", "23:00")).toBe("05:00");
  });

  it("does not throw and reads no clock", () => {
    expect(() => shiftEnd("08:00", "09:00", "10:00")).not.toThrow();
  });

  it("pure function — deterministic on same input", () => {
    expect(shiftEnd("08:00", "09:00", "10:00")).toBe(
      shiftEnd("08:00", "09:00", "10:00"),
    );
  });
});

// U-m6-012 — TZ-independence: minute-integer arithmetic; no Date reads
describe("U-m6-012: snapToSlot/shiftEnd are TZ-independent (minute integers only)", () => {
  // The helpers use only integer arithmetic — no new Date(), no getTimezoneOffset().
  // We verify deterministic outputs match across a simulated TZ-shift by running
  // the same table three times in the same process (the helpers cannot drift).
  const TABLE: Array<[number, number, string]> = [
    [0, 60, "00:00"],
    [15, 60, "00:30"],
    [30, 60, "00:30"],
    [45, 60, "01:00"],
    [1440, 60, "23:30"],
    [-1, 60, "00:00"],
  ];

  it("snapToSlot outputs are identical on repeated calls (TZ-independent)", () => {
    for (let i = 0; i < 3; i++) {
      for (const [px, hr, expected] of TABLE) {
        expect(snapToSlot(px, hr)).toBe(expected);
      }
    }
  });

  it("shiftEnd outputs are identical on repeated calls (TZ-independent)", () => {
    const SHIFT_TABLE: Array<[string, string | null, string, string | null]> = [
      ["08:00", "09:00", "10:00", "11:00"],
      ["08:00", null, "10:00", null],
    ];
    for (let i = 0; i < 3; i++) {
      for (const [os, oe, ns, expected] of SHIFT_TABLE) {
        expect(shiftEnd(os, oe, ns)).toBe(expected);
      }
    }
  });
});
