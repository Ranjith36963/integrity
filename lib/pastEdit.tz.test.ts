/**
 * lib/pastEdit.tz.test.ts — TZ-pinned regression suite for pastEdit.ts.
 *
 * daysBetween() / canEditPastDay() do local-date arithmetic (new Date(y,m-1,d)),
 * which yields the same whole-day gap in every runtime timezone — no UTC drift.
 * The window gate must hold identically under all four pinned zones, including
 * the Jan-1 negative-UTC edge and a month/year boundary.
 */
import { describe, it, expect } from "vitest";
import { daysBetween, canEditPastDay } from "./pastEdit";
import { defaultState } from "./data";
import type { AppState, ArchivedDay } from "./types";

const TZ = process.env.TZ ?? "UTC";

const day: ArchivedDay = { blocks: [], categories: [], looseBricks: [] };

function stateOn(currentDate: string, historyDays: string[]): AppState {
  const history: Record<string, ArchivedDay> = {};
  for (const d of historyDays) history[d] = day;
  return { ...defaultState(), currentDate, history, pastEditDays: 3 };
}

describe(`pastEdit.ts under TZ=${TZ}`, () => {
  it("daysBetween is TZ-invariant across month/year boundaries", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2026-06-28", "2026-07-02")).toBe(4);
    expect(daysBetween("2025-12-30", "2026-01-02")).toBe(3);
  });

  it("canEditPastDay window holds across a year boundary in every zone", () => {
    const s = stateOn("2026-01-01", ["2025-12-31", "2025-12-29"]);
    expect(canEditPastDay(s, "2025-12-31")).toBe(true); // 1 day back
    expect(canEditPastDay(s, "2025-12-29")).toBe(true); // 3 days back
  });

  it("Jan-1 negative-UTC edge: yesterday is editable, older is not (window 1)", () => {
    const s: AppState = {
      ...stateOn("2026-01-01", ["2025-12-31", "2025-12-28"]),
      pastEditDays: 1,
    };
    expect(canEditPastDay(s, "2025-12-31")).toBe(true);
    expect(canEditPastDay(s, "2025-12-28")).toBe(false);
  });
});
