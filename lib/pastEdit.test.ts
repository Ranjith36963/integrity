/**
 * lib/pastEdit.test.ts — M11 Step 3b: editing-past-days policy + reducer (DEC-2).
 */
import { describe, it, expect } from "vitest";
import { canEditPastDay, pastEditDaysOf, daysBetween } from "./pastEdit";
import { reducer } from "./data";
import { defaultState } from "./data";
import type { AppState, ArchivedDay } from "./types";

function archived(done: boolean): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "b1",
        name: "Meditate",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done,
      },
    ],
  };
}

function stateWith(over: Partial<AppState>): AppState {
  return {
    ...defaultState(),
    currentDate: "2026-07-02",
    history: {
      "2026-07-01": archived(false), // yesterday
      "2026-06-29": archived(false), // 3 days ago
      "2026-06-25": archived(false), // 7 days ago
    },
    ...over,
  };
}

describe("daysBetween", () => {
  it("counts whole days forward and backward", () => {
    expect(daysBetween("2026-07-01", "2026-07-02")).toBe(1);
    expect(daysBetween("2026-06-29", "2026-07-02")).toBe(3);
    expect(daysBetween("2026-07-02", "2026-07-01")).toBe(-1);
  });
});

describe("pastEditDaysOf normalizes to 0/1/3", () => {
  it("defaults to 0 and rejects junk", () => {
    expect(pastEditDaysOf(stateWith({}))).toBe(0);
    expect(pastEditDaysOf(stateWith({ pastEditDays: 1 }))).toBe(1);
    expect(pastEditDaysOf(stateWith({ pastEditDays: 3 }))).toBe(3);
    expect(pastEditDaysOf(stateWith({ pastEditDays: 5 as 1 }))).toBe(0);
  });
});

describe("canEditPastDay — window gating", () => {
  it("read-only (0) locks every past day", () => {
    const s = stateWith({ pastEditDays: 0 });
    expect(canEditPastDay(s, "2026-07-01")).toBe(false);
  });
  it("yesterday (1) allows only the day before, not older", () => {
    const s = stateWith({ pastEditDays: 1 });
    expect(canEditPastDay(s, "2026-07-01")).toBe(true); // 1 day back
    expect(canEditPastDay(s, "2026-06-29")).toBe(false); // 3 days back
  });
  it("3 days allows within window, not beyond", () => {
    const s = stateWith({ pastEditDays: 3 });
    expect(canEditPastDay(s, "2026-07-01")).toBe(true); // 1
    expect(canEditPastDay(s, "2026-06-29")).toBe(true); // 3
    expect(canEditPastDay(s, "2026-06-25")).toBe(false); // 7
  });
  it("never edits today, the future, or a non-archived day", () => {
    const s = stateWith({ pastEditDays: 3 });
    expect(canEditPastDay(s, "2026-07-02")).toBe(false); // today
    expect(canEditPastDay(s, "2026-07-05")).toBe(false); // future
    expect(canEditPastDay(s, "2026-06-30")).toBe(false); // in-window but no history entry
  });
});

describe("reducer SET_PAST_EDIT_DAYS", () => {
  it("persists a valid window and ignores junk", () => {
    const s = stateWith({});
    expect(
      reducer(s, { type: "SET_PAST_EDIT_DAYS", days: 3 }).pastEditDays,
    ).toBe(3);
    // @ts-expect-error runtime guard test
    expect(reducer(s, { type: "SET_PAST_EDIT_DAYS", days: 9 })).toBe(s);
  });
});

describe("reducer TOGGLE_ARCHIVED_TICK — gated back-logging", () => {
  it("toggles the archived tick when the day is editable", () => {
    const s = stateWith({ pastEditDays: 1 });
    const next = reducer(s, {
      type: "TOGGLE_ARCHIVED_TICK",
      isoDate: "2026-07-01",
      brickId: "b1",
    });
    const brick = next.history["2026-07-01"].looseBricks[0];
    expect(brick.kind === "tick" && brick.done).toBe(true);
    // original state untouched (immutability)
    expect(s.history["2026-07-01"].looseBricks[0]).toMatchObject({
      done: false,
    });
  });

  it("is a no-op when the day is outside the window (read-only default)", () => {
    const s = stateWith({}); // window 0
    const next = reducer(s, {
      type: "TOGGLE_ARCHIVED_TICK",
      isoDate: "2026-07-01",
      brickId: "b1",
    });
    expect(next).toBe(s); // unchanged reference
  });

  it("is a no-op for an out-of-window older day even when editing is on", () => {
    const s = stateWith({ pastEditDays: 1 });
    const next = reducer(s, {
      type: "TOGGLE_ARCHIVED_TICK",
      isoDate: "2026-06-29", // 3 days back, window is 1
      brickId: "b1",
    });
    expect(next).toBe(s);
  });
});
