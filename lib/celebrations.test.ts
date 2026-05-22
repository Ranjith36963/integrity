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
