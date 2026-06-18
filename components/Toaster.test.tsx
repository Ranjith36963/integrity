/**
 * components/Toaster.test.tsx — M7e: C-m7e-015..022
 * Tests for the module-level event-emitter toast system.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Re-import between tests to reset module-level state would require vi.resetModules()
// Instead we import at top level and accept that module state persists between tests.
// Each test dismisses any pending toast by advancing timers.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(async () => {
  // Advance past any pending auto-dismiss timers to clean up state
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });
  vi.useRealTimers();
});

// Dynamic imports so toast function gets the right module
async function getToaster() {
  const mod = await import("./Toaster");
  return mod;
}

// C-m7e-015: <Toaster /> mounts hidden when no toast has fired
describe("C-m7e-015: <Toaster /> mounts hidden when no toast has fired", () => {
  it("container present, toast element absent", async () => {
    const { Toaster } = await getToaster();
    render(<Toaster />);
    expect(screen.getByTestId("toaster")).toBeTruthy();
    expect(screen.queryByTestId("toast")).toBeNull();
  });
});

// C-m7e-016: toast("hello", "success") → role=status + aria-live=polite
describe("C-m7e-016: toast success → role=status + aria-live=polite", () => {
  it("mounts a toast with correct ARIA and text", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster />);

    await act(async () => {
      toast("hello", "success");
    });

    const toastEl = screen.getByTestId("toast");
    expect(toastEl.textContent).toContain("hello");
    expect(toastEl.getAttribute("role")).toBe("status");
    expect(toastEl.getAttribute("aria-live")).toBe("polite");
  });
});

// C-m7e-017: toast("oops", "error") → role=alert + aria-live=assertive
describe("C-m7e-017: toast error → role=alert + aria-live=assertive", () => {
  it("mounts an alert toast with assertive aria-live", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster />);

    await act(async () => {
      toast("oops", "error");
    });

    const toastEl = screen.getByTestId("toast");
    expect(toastEl.textContent).toContain("oops");
    expect(toastEl.getAttribute("role")).toBe("alert");
    expect(toastEl.getAttribute("aria-live")).toBe("assertive");
  });
});

// C-m7e-018: toast("info-msg", "info") → role=status + aria-live=polite
describe("C-m7e-018: toast info → role=status + aria-live=polite", () => {
  it("mounts a polite status toast", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster />);

    await act(async () => {
      toast("info-msg", "info");
    });

    const toastEl = screen.getByTestId("toast");
    expect(toastEl.textContent).toContain("info-msg");
    expect(toastEl.getAttribute("role")).toBe("status");
    expect(toastEl.getAttribute("aria-live")).toBe("polite");
  });
});

// C-m7e-019: auto-dismisses after exactly 2000 ms
describe("C-m7e-019: <Toaster /> auto-dismisses after exactly 2000 ms", () => {
  it("toast visible at 1999 ms, gone at 2000 ms", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster />);

    await act(async () => {
      toast("hello", "success");
    });
    expect(screen.queryByTestId("toast")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.queryByTestId("toast")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("toast")).toBeNull();
  });
});

// C-m7e-020: last-write-wins — second call replaces first, timer resets
describe("C-m7e-020: last-write-wins — second toast replaces first; timer resets", () => {
  it("only shows latest toast; timer resets from second emit", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster />);

    await act(async () => {
      toast("first", "success");
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      toast("second", "info");
    });

    // At t=1000: only "second" visible
    const toastEl = screen.getByTestId("toast");
    expect(toastEl.textContent).toContain("second");
    expect(screen.queryAllByTestId("toast")).toHaveLength(1);

    // t=2999 (1000 + 1999): toast still visible (timer reset at t=1000, fires at t=3000)
    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.queryByTestId("toast")).toBeTruthy();

    // t=3000: toast unmounted
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("toast")).toBeNull();
  });
});

// C-m7e-021: container z-index is 30 (SG-m7e-04 stacking contract)
describe("C-m7e-021: <Toaster /> container z-index is 30", () => {
  it("toaster container has z-index 30 in inline style", async () => {
    const { Toaster } = await getToaster();
    render(<Toaster />);
    const container = screen.getByTestId("toaster");
    const style = container.getAttribute("style") ?? "";
    expect(style).toContain("z-index: 30");
  });
});

// C-m7e-022: under PRM, toast appears instantly — no slide animation
describe("C-m7e-022: under PRM, toast appears instantly — no slide", () => {
  it("toast has no translateY style under PRM", async () => {
    const { Toaster, toast } = await getToaster();
    render(<Toaster prefersReducedMotion={true} />);

    await act(async () => {
      toast("instant", "success");
    });

    const toastEl = screen.getByTestId("toast");
    const style = toastEl.getAttribute("style") ?? "";
    expect(style).not.toMatch(/translateY/);
  });
});
