/**
 * U-m0-007: haptics.* calls navigator.vibrate with correct patterns.
 * U-m0-008: haptics.* is a silent no-op when navigator.vibrate is undefined.
 * U-m0-009: HapticEvent type admits exactly the four documented values.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { haptics } from "./haptics";
import type { HapticEvent } from "./haptics";
import { expectTypeOf } from "vitest";

// U-m0-007: navigator.vibrate is a stub fn — assert patterns
describe("U-m0-007: haptics calls navigator.vibrate with correct patterns", () => {
  const vibrateSpy = vi.fn();

  beforeEach(() => {
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    });
    vibrateSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("haptics.light() calls vibrate([10])", () => {
    haptics.light();
    expect(vibrateSpy).toHaveBeenCalledOnce();
    expect(vibrateSpy).toHaveBeenCalledWith([10]);
  });

  it("haptics.medium() calls vibrate([20])", () => {
    haptics.medium();
    expect(vibrateSpy).toHaveBeenCalledOnce();
    expect(vibrateSpy).toHaveBeenCalledWith([20]);
  });

  it("haptics.success() calls vibrate([15,30,15])", () => {
    haptics.success();
    expect(vibrateSpy).toHaveBeenCalledOnce();
    expect(vibrateSpy).toHaveBeenCalledWith([15, 30, 15]);
  });

  it("haptics.notification() calls vibrate([20,40,20,40,20])", () => {
    haptics.notification();
    expect(vibrateSpy).toHaveBeenCalledOnce();
    expect(vibrateSpy).toHaveBeenCalledWith([20, 40, 20, 40, 20]);
  });
});

// U-m0-008: navigator.vibrate is undefined → silent no-op
describe("U-m0-008: haptics is a silent no-op when navigator.vibrate is undefined", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("haptics.light() does not throw when vibrate is undefined", () => {
    expect(() => haptics.light()).not.toThrow();
  });

  it("haptics.medium() does not throw when vibrate is undefined", () => {
    expect(() => haptics.medium()).not.toThrow();
  });

  it("haptics.success() does not throw when vibrate is undefined", () => {
    expect(() => haptics.success()).not.toThrow();
  });

  it("haptics.notification() does not throw when vibrate is undefined", () => {
    expect(() => haptics.notification()).not.toThrow();
  });
});

// U-m0-009: HapticEvent type — verified via expectTypeOf
describe("U-m0-009: HapticEvent type admits exactly the four documented values", () => {
  it("HapticEvent is a union of four string literals", () => {
    expectTypeOf<HapticEvent>().toEqualTypeOf<
      "light" | "medium" | "success" | "notification"
    >();
  });

  it("runtime check: all four values assignable to HapticEvent", () => {
    const events: HapticEvent[] = [
      "light",
      "medium",
      "success",
      "notification",
    ];
    expect(events).toHaveLength(4);
  });
});
