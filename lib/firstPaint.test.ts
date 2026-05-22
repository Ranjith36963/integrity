/**
 * lib/firstPaint.test.ts — M7a unit tests.
 * Covers: U-m7a-001
 *
 * U-m7a-001: useFirstPaintAfterHydration ref-machine — pending → staggered → done
 *            across renders; remount restarts at pending (mutation-resistant).
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFirstPaintAfterHydration } from "./firstPaint";

// U-m7a-001: useFirstPaintAfterHydration ref-machine state transitions
describe("U-m7a-001: useFirstPaintAfterHydration — pending → staggered → done; remount restarts", () => {
  it("returns false on render 1 (hydrated=false): pre-hydration path, no stagger", () => {
    const { result } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: false } },
    );
    expect(result.current).toBe(false);
  });

  it("returns true on first hydrated render (pending → staggered transition)", () => {
    const { result, rerender } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: false } },
    );
    // render 1: hydrated=false → false
    expect(result.current).toBe(false);

    // render 2: hydrated=true → true (first hydrated render, stagger fires)
    rerender({ hydrated: true });
    expect(result.current).toBe(true);
  });

  it("returns false on the second and subsequent hydrated renders (staggered → done → done)", () => {
    const { result, rerender } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: false } },
    );

    // render 1: false (pending, hydrated=false)
    expect(result.current).toBe(false);

    // render 2: true (staggered, first hydrated render)
    rerender({ hydrated: true });
    expect(result.current).toBe(true);

    // render 3: false (done, stagger guard prevents re-fire)
    rerender({ hydrated: true });
    expect(result.current).toBe(false);

    // render 4: false (still done)
    rerender({ hydrated: true });
    expect(result.current).toBe(false);
  });

  it("a re-render with hydrated=false after reaching 'done' still returns false (ref is monotonic-forward)", () => {
    const { result, rerender } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: false } },
    );

    rerender({ hydrated: true }); // staggered → true
    rerender({ hydrated: true }); // done → false
    rerender({ hydrated: false }); // back to false, no re-trigger
    expect(result.current).toBe(false);
  });

  it("remount restarts at pending — fresh instance returns true on its first hydrated render (per-component ref, not module singleton)", () => {
    // First instance: go through the full lifecycle
    const { result: r1, unmount } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: true } },
    );
    expect(r1.current).toBe(true); // first hydrated render → stagger

    // Unmount (simulate view switch Day → Week)
    act(() => {
      unmount();
    });

    // Fresh instance: ref restarts at pending
    const { result: r2 } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useFirstPaintAfterHydration(hydrated),
      { initialProps: { hydrated: true } },
    );
    // A module-level singleton mutant would return false here (already done from r1)
    expect(r2.current).toBe(true);
  });
});
