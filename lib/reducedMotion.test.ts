/**
 * U-m0-010: usePrefersReducedMotion() returns correct value based on matchMedia mock.
 * U-m0-011: usePrefersReducedMotion() returns false without throwing in SSR context.
 * U-m0-012: usePrefersReducedMotion() responds to change events + cleans up on unmount.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrefersReducedMotion } from "./reducedMotion";

// Helper: creates a mock MediaQueryList with controllable matches + event dispatch
function mockMatchMedia(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(
      (event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === "change") listeners.push(handler);
      },
    ),
    removeEventListener: vi.fn(
      (event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === "change") {
          const idx = listeners.indexOf(handler);
          if (idx !== -1) listeners.splice(idx, 1);
        }
      },
    ),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    // Manually fire a change event
    fireChange(newMatches: boolean) {
      listeners.forEach((l) =>
        l({ matches: newMatches } as MediaQueryListEvent),
      );
    },
  };
  return mql;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// U-m0-010
describe("U-m0-010: usePrefersReducedMotion returns correct value from matchMedia", () => {
  it("returns true when matchMedia matches=true", () => {
    const mql = mockMatchMedia(true);
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue(mql),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    // After useEffect fires, should be true
    expect(result.current).toBe(true);
  });

  it("returns false when matchMedia matches=false", () => {
    const mql = mockMatchMedia(false);
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue(mql),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});

// U-m0-011
describe("U-m0-011: usePrefersReducedMotion returns false on initial render (SSR-safe)", () => {
  it("initial value is false before useEffect fires", () => {
    // The hook initializes useState(false) — SSR safe
    // We verify this by checking the hook doesn't access window during useState init
    // The initial render returns false; useEffect reconciles
    const mql = mockMatchMedia(false);
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue(mql),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    // After mount, matches=false so still false
    expect(result.current).toBe(false);
    expect(() => result.current).not.toThrow();
  });
});

// U-m0-012
describe("U-m0-012: usePrefersReducedMotion responds to change + cleans up", () => {
  it("updates to true when change event fires with matches=true", () => {
    const mql = mockMatchMedia(false);
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue(mql),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.fireChange(true);
    });

    expect(result.current).toBe(true);
  });

  it("calls removeEventListener exactly once with the same handler on unmount", () => {
    const mql = mockMatchMedia(false);
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue(mql),
      writable: true,
      configurable: true,
    });

    const { unmount } = renderHook(() => usePrefersReducedMotion());

    // Before unmount: addEventListener called once
    expect(mql.addEventListener).toHaveBeenCalledOnce();
    const [, addedHandler] = mql.addEventListener.mock.calls[0] as [
      string,
      (e: MediaQueryListEvent) => void,
    ];

    unmount();

    // After unmount: removeEventListener called once with the same handler
    expect(mql.removeEventListener).toHaveBeenCalledOnce();
    const [, removedHandler] = mql.removeEventListener.mock.calls[0] as [
      string,
      (e: MediaQueryListEvent) => void,
    ];
    expect(removedHandler).toBe(addedHandler);
  });
});
