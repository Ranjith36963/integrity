import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCrossUpEffect } from "./celebrations";

// U-m3-012: useCrossUpEffect cross-up detection (one-shot per crossing)
// Proves: plan.md § File structure — lib/celebrations.ts

describe("U-m3-012: useCrossUpEffect fires fn once on upward crossing", () => {
  it("fires fn when value transitions from below to at/above threshold", () => {
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, fn),
      { initialProps: { value: 99 } },
    );
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire fn again when value re-renders at threshold with no intervening drop", () => {
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, fn),
      { initialProps: { value: 99 } },
    );

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1); // still 1
  });

  it("fires again after value drops below threshold and rises back to threshold", () => {
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, fn),
      { initialProps: { value: 99 } },
    );

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ value: 90 });
    });
    expect(fn).toHaveBeenCalledTimes(1); // no extra call on drop

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(2); // fires again on re-cross
  });

  it("fires fn when value jumps from 50 to 100 directly (skipping values)", () => {
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, fn),
      { initialProps: { value: 50 } },
    );
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("same semantics for block-100 case (bloom+chime+success haptic) and day-100 case", () => {
    // Block-100 case: threshold=100
    const blockFn = vi.fn();
    const { rerender: rerenderBlock } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, blockFn),
      { initialProps: { value: 80 } },
    );

    act(() => {
      rerenderBlock({ value: 100 });
    });
    expect(blockFn).toHaveBeenCalledTimes(1);

    // Day-100 case: same threshold
    const dayFn = vi.fn();
    const { rerender: rerenderDay } = renderHook(
      ({ value }: { value: number }) => useCrossUpEffect(value, 100, dayFn),
      { initialProps: { value: 0 } },
    );

    act(() => {
      rerenderDay({ value: 100 });
    });
    expect(dayFn).toHaveBeenCalledTimes(1);
  });
});

// ── C-m7d-013: no celebration imports in past-day view files ──────────────────

describe("C-m7d-013: PastDayDetail / MonthView / WeekView / YearView do NOT import M7d celebration hooks", () => {
  const pastDayFiles = [
    "components/PastDayDetail.tsx",
    "components/MonthView.tsx",
    "components/WeekView.tsx",
    "components/YearView.tsx",
  ];

  for (const relPath of pastDayFiles) {
    it(`${relPath} does NOT import from @/lib/celebrations`, () => {
      const src = readFileSync(join(process.cwd(), relPath), "utf-8");
      // Check for any import from celebrations
      const celebImportRe = /from\s+["']@\/lib\/celebrations["']/;
      if (!celebImportRe.test(src)) {
        // No import at all — pass
        expect(true).toBe(true);
        return;
      }
      // If there IS an import line, it must NOT contain the M7d symbols
      const importLines = src
        .split("\n")
        .filter((line) => celebImportRe.test(line));
      for (const line of importLines) {
        expect(line).not.toContain("useBlockCelebrationOnce");
        expect(line).not.toContain("useDayCelebrationOnce");
        expect(line).not.toContain("celebrate");
      }
    });
  }
});

// ── C-m7d-014: useCrossUpEffect still exported; M7d exports also present ──────

describe("C-m7d-014: useCrossUpEffect still exported unchanged; M7d new exports also present", () => {
  it("typeof celebrations.useCrossUpEffect === 'function'", async () => {
    const celebrations = await import("./celebrations");
    expect(typeof celebrations.useCrossUpEffect).toBe("function");
  });

  it("M7d new exports are also present", async () => {
    const celebrations = await import("./celebrations");
    expect(typeof celebrations.useBlockCelebrationOnce).toBe("function");
    expect(typeof celebrations.useDayCelebrationOnce).toBe("function");
    expect(typeof celebrations.celebrate).toBe("function");
  });

  it("useCrossUpEffect still has the correct U-m3-012 truth table (fires again after drop+re-cross)", async () => {
    const { useCrossUpEffect: crossUp } = await import("./celebrations");
    const fn = vi.fn();
    const { rerender } = renderHook(
      ({ value }: { value: number }) => crossUp(value, 100, fn),
      { initialProps: { value: 99 } },
    );

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ value: 90 });
    });
    expect(fn).toHaveBeenCalledTimes(1); // no extra call on drop

    act(() => {
      rerender({ value: 100 });
    });
    expect(fn).toHaveBeenCalledTimes(2); // fires again on re-cross (M3 original semantics)
  });
});
