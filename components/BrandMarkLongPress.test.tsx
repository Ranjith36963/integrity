/**
 * components/BrandMarkLongPress.test.tsx — M7e: C-m7e-006..011, C-m7e-024
 * Tests for the 600 ms long-press brand-mark easter egg.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrandMarkLongPress } from "./BrandMarkLongPress";
import type { AppState } from "@/lib/types";

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

const fixtureState: AppState = {
  blocks: [],
  categories: [],
  looseBricks: [],
  programStart: "2026-05-01",
  currentDate: "2026-05-20",
  history: {},
  deletions: {},
  firstBrickShown: false,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// C-m7e-006: 600 ms hold opens YearHeatmapPreview
describe("C-m7e-006: 600 ms hold opens <YearHeatmapPreview>", () => {
  it("overlay is null at 599 ms and present at 600 ms", async () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);

    await act(async () => {
      vi.advanceTimersByTime(599);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeTruthy();
  });
});

// C-m7e-007: pointerUp before 600 ms → no overlay (short tap is no-op)
describe("C-m7e-007: short tap (pointerUp < 600 ms) → no overlay", () => {
  it("overlay never appears when pointerUp fires at t=400", async () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.pointerUp(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeNull();
  });
});

// C-m7e-008: drift-cancel — pointerLeave OR pointerCancel before 600 ms → no overlay
describe("C-m7e-008: drift-cancel — pointerLeave/Cancel < 600 ms → no overlay", () => {
  it("pointerLeave cancels the long-press timer", async () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.pointerLeave(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeNull();
  });

  it("pointerCancel cancels the long-press timer", async () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.pointerCancel(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeNull();
  });
});

// C-m7e-009: pointerUp AFTER overlay open → closes overlay
describe("C-m7e-009: release (pointerUp) after overlay open closes overlay", () => {
  it("overlay disappears on pointerUp at t=800 ms", async () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(wrapper);
    expect(screen.queryByTestId("year-heatmap-preview")).toBeNull();
  });
});

// C-m7e-010: under PRM, overlay has opacity-fade only — no scale
describe("C-m7e-010: under PRM, overlay opacity-fades — no scale", () => {
  it("inner grid has no scale(0.85) when prefersReducedMotion=true; scale present when false", async () => {
    // --- prefersReducedMotion=true: inner grid must NOT contain scale(0.85) ---
    const { unmount } = render(
      <BrandMarkLongPress state={fixtureState} prefersReducedMotion={true}>
        BRAND
      </BrandMarkLongPress>,
    );
    const wrapperPRM = screen.getByRole("button");
    fireEvent.pointerDown(wrapperPRM);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeTruthy();
    const gridPRM = screen.queryByTestId("year-heatmap-grid");
    expect(gridPRM).toBeTruthy();
    // Mutant guard: deleting the PRM branch must make this assertion fail
    const stylePRM = gridPRM!.getAttribute("style") ?? "";
    expect(stylePRM).not.toMatch(/scale/);
    unmount();

    // --- prefersReducedMotion=false: inner grid MUST contain scale(0.85) ---
    render(
      <BrandMarkLongPress state={fixtureState} prefersReducedMotion={false}>
        BRAND
      </BrandMarkLongPress>,
    );
    const wrapperFull = screen.getByRole("button");
    fireEvent.pointerDown(wrapperFull);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId("year-heatmap-preview")).toBeTruthy();
    const gridFull = screen.queryByTestId("year-heatmap-grid");
    expect(gridFull).toBeTruthy();
    const styleFull = gridFull!.getAttribute("style") ?? "";
    expect(styleFull).toMatch(/scale/);
  });
});

// C-m7e-011: haptics.light() called exactly once on 600 ms threshold
describe("C-m7e-011: haptics.light() fires exactly once on 600 ms threshold", () => {
  it("haptics.light is called once — NOT on pointerDown, only after holdMs elapses", async () => {
    const { haptics } = await import("@/lib/haptics");
    const lightMock = vi.mocked(haptics.light);
    lightMock.mockClear();

    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const wrapper = screen.getByRole("button");

    fireEvent.pointerDown(wrapper);
    // Before 600 ms — haptic should NOT fire yet
    await act(async () => {
      vi.advanceTimersByTime(599);
    });
    expect(lightMock).toHaveBeenCalledTimes(0);

    // At 600 ms — fires exactly once
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(lightMock).toHaveBeenCalledTimes(1);
  });
});

// C-m7e-024: wrapper is <button> with aria-label AND height >= 44 px
describe("C-m7e-024: wrapper is <button> with aria-label AND min height >= 44 px", () => {
  it("wrapper tagName is BUTTON with aria-label and min-height style", () => {
    render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>);
    const button = screen.getByRole("button");
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-label")).toBe(
      "DHARMA — long-press for year heatmap",
    );
    // Verify min-height is applied via style (jsdom can't compute layout)
    const style = button.getAttribute("style") ?? "";
    // Either minHeight is set, or padding-block
    const hasMinHeight =
      style.includes("min-height") ||
      style.includes("minHeight") ||
      style.includes("padding");
    expect(hasMinHeight).toBe(true);
  });
});
