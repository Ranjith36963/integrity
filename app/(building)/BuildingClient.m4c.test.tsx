// app/(building)/BuildingClient.m4c.test.tsx — M4c BuildingClient integration
// Covers: C-m4c-013..018
// Uses a dedicated file per M4b precedent so we can mock defaultState() with
// time bricks without affecting BuildingClient.test.tsx's empty-state tests.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingClient } from "./BuildingClient";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-1" }));

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

vi.mock("@/lib/audio", () => ({
  playChime: vi.fn(),
}));

// Mock: single block with two time bricks (t1 and t2) to support all test scenarios.
// Tests that only need t1 search by name /read.*/i; tests that need t2 use /write.*/i.
vi.mock("@/lib/data", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/data")>("@/lib/data");
  return {
    ...actual,
    defaultState: () => ({
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-09" },
          categoryId: null,
          bricks: [
            {
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 0,
              categoryId: null,
              parentBlockId: "b1",
            },
            {
              id: "t2",
              name: "Write",
              kind: "time",
              durationMin: 30,
              minutesDone: 0,
              categoryId: null,
              parentBlockId: "b1",
            },
          ],
        },
      ],
      looseBricks: [],
      categories: [],
      runningTimerBrickId: null,
    }),
  };
});

/** Helper: expand timeline block via fireEvent (synchronous, safe with fake timers) */
function expandBlock(container: HTMLElement) {
  const card = container.querySelector(
    '[data-component="timeline-block"]',
  ) as HTMLElement;
  fireEvent.click(card);
  return card;
}

/** Helper: short tap on element (pointerdown + pointerup, no fake-timer consumption) */
function shortTap(el: HTMLElement) {
  fireEvent(el, new PointerEvent("pointerdown", { bubbles: true }));
  fireEvent(el, new PointerEvent("pointerup", { bubbles: true }));
}

// ─── C-m4c-013: tap chip → START_TIMER, tap again → STOP_TIMER ───────────────

describe("C-m4c-013: BuildingClient tap time chip toggles START/STOP and flips glyph", () => {
  it("first tap: aria-pressed='true' (START dispatched); second tap: aria-pressed='false' (STOP dispatched)", async () => {
    const user = userEvent.setup();
    const { container } = render(<BuildingClient />);

    // Expand the block to see the chips
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    // Find the Read time chip (stopped initially)
    const chipBefore = screen.getByRole("button", {
      name: /read.*stopped/i,
    });
    expect(chipBefore.getAttribute("aria-pressed")).toBe("false");

    // Tap to start
    chipBefore.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    chipBefore.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    // After start: aria-pressed="true"
    const chipAfterStart = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(chipAfterStart.getAttribute("aria-pressed")).toBe("true");

    // Tap again to stop
    chipAfterStart.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    chipAfterStart.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 50));

    // After stop: aria-pressed="false"
    const chipAfterStop = screen.getByRole("button", {
      name: /read.*stopped/i,
    });
    expect(chipAfterStop.getAttribute("aria-pressed")).toBe("false");
  });
});

// ─── C-m4c-014: two-timer swap — single running invariant at UI level ─────────

describe("C-m4c-014: tapping t2 while t1 runs swaps running state; only one chip aria-pressed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("after t2 tap: t1=aria-pressed:false(Play), t2=aria-pressed:true(Pause); only one running", async () => {
    const { container } = render(<BuildingClient />);

    // Expand block using fireEvent (sync, safe with fake timers)
    const card = expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Get t1 chip (stopped)
    const t1Before = screen.getByRole("button", { name: /read.*stopped/i });
    const t2Before = screen.getByRole("button", { name: /write.*stopped/i });

    // Start t1
    act(() => {
      shortTap(t1Before);
      vi.advanceTimersByTime(50);
    });

    // t1 is now running, t2 still stopped
    const t1Running = screen.getByRole("button", { name: /read.*running/i });
    expect(t1Running.getAttribute("aria-pressed")).toBe("true");
    expect(t2Before.getAttribute("aria-pressed")).toBe("false");

    // Tap t2 to swap
    const t2ToTap = screen.getByRole("button", { name: /write.*stopped/i });
    act(() => {
      shortTap(t2ToTap);
      vi.advanceTimersByTime(50);
    });

    // After swap: t1 stopped, t2 running
    const t1Stopped = screen.getByRole("button", { name: /read.*stopped/i });
    const t2Running = screen.getByRole("button", { name: /write.*running/i });
    expect(t1Stopped.getAttribute("aria-pressed")).toBe("false");
    expect(t2Running.getAttribute("aria-pressed")).toBe("true");

    // Only one chip has aria-pressed="true"
    const allPressedTrue = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(allPressedTrue).toHaveLength(1);
  });
});

// ─── C-m4c-015: useTimer integration — badge advances after 60s ──────────────

describe("C-m4c-015: useTimer integration — chip badge advances after 60s fake timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("after start + 60s elapsed: badge reads '1 / 25 m'; aria-pressed remains true", async () => {
    const { container } = render(<BuildingClient />);

    // Expand block
    expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Start the Read timer
    const chip = screen.getByRole("button", { name: /read.*stopped/i });
    act(() => {
      shortTap(chip);
      vi.advanceTimersByTime(50);
    });

    // Advance 60 seconds for one minute boundary
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Badge should now show "1 / 25 m"
    const runningChip = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(runningChip.getAttribute("aria-pressed")).toBe("true");
    expect(runningChip.textContent).toMatch(/1\s*\/\s*25/);
  });
});

// ─── C-m4c-016: timer keeps running while block is collapsed (chip off-DOM) ───

describe("C-m4c-016: timer ticks while chip is off-DOM during block collapse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("after 1 min + collapse + 2 min + re-expand: badge reads '3 / 25 m'", async () => {
    const { container } = render(<BuildingClient />);

    // Expand block
    const card = expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Start Read timer
    const chip = screen.getByRole("button", { name: /read.*stopped/i });
    act(() => {
      shortTap(chip);
      vi.advanceTimersByTime(50);
    });

    // Advance 1 minute
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Collapse block (chip unmounts)
    act(() => {
      fireEvent.click(card);
      vi.advanceTimersByTime(50);
    });

    // Advance 2 more minutes while chip is unmounted
    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    // Re-expand block
    act(() => {
      fireEvent.click(card);
      vi.advanceTimersByTime(50);
    });

    // Badge should read "3 / 25 m"
    const remountedChip = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(remountedChip.getAttribute("aria-pressed")).toBe("true");
    expect(remountedChip.textContent).toMatch(/3\s*\/\s*25/);
  });
});

// ─── C-m4c-017: long-press opens TimerSheet; Save clamps; Cancel discards ─────

describe("C-m4c-017: long-press opens TimerSheet; Save clamps; Cancel discards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("long-press → sheet opens pre-filled; type 30 + Save: badge='25 / 25 m'", async () => {
    const { haptics } = await import("@/lib/haptics");
    const user = userEvent.setup();
    const { container } = render(<BuildingClient />);

    // Expand block
    const card = expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const chip = screen.getByRole("button", { name: /read.*stopped/i });

    // Long-press: pointerdown + 500ms
    act(() => {
      fireEvent(chip, new PointerEvent("pointerdown", { bubbles: true }));
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent(chip, new PointerEvent("pointerup", { bubbles: true }));
      vi.advanceTimersByTime(50);
    });

    // TimerSheet should be open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Input pre-filled with minutesDone=0
    const input = screen.getByLabelText("Minutes done");
    expect((input as HTMLInputElement).value).toBe("0");

    // Switch back to real timers for userEvent interactions
    vi.useRealTimers();

    // Clear mocks AFTER the long-press (which fired haptics.medium for the gesture)
    // so we can assert the overflow-clamp haptic in isolation.
    vi.clearAllMocks();

    // Type 30 (overflow — durationMin is 25)
    await user.clear(input);
    await user.type(input, "30");

    // Click Save
    await user.click(screen.getByRole("button", { name: "Save minutes" }));

    // Sheet closes
    expect(screen.queryByRole("dialog")).toBeNull();

    // Badge shows "25 / 25 m" (clamped)
    const chipAfter = screen.getByRole("button", {
      name: /read.*stopped/i,
    });
    expect(chipAfter.textContent).toMatch(/25\s*\/\s*25/);

    // haptics.medium called once (overflow clamp — the long-press haptic was cleared above)
    expect(haptics.medium).toHaveBeenCalledTimes(1);
  });

  it("long-press → Cancel: sheet closes; no dispatch (badge unchanged)", async () => {
    const user = userEvent.setup();
    const { container } = render(<BuildingClient />);

    const card = expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const chip = screen.getByRole("button", { name: /read.*stopped/i });

    act(() => {
      fireEvent(chip, new PointerEvent("pointerdown", { bubbles: true }));
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent(chip, new PointerEvent("pointerup", { bubbles: true }));
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Switch back to real timers for userEvent interactions
    vi.useRealTimers();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Sheet closes; badge unchanged (still "0 / 25 m")
    expect(screen.queryByRole("dialog")).toBeNull();
    const chipAfter = screen.getByRole("button", {
      name: /read.*stopped/i,
    });
    expect(chipAfter.textContent).toMatch(/0\s*\/\s*25/);
  });
});

// ─── C-m4c-018: manual entry while running — timer continues with new floor ───

describe("C-m4c-018: manual entry while running does NOT stop timer; next tick uses new floor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start timer, open sheet, save 10, advance 60s: badge reads '11 / 25 m'", async () => {
    const { container } = render(<BuildingClient />);

    // Expand block
    expandBlock(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Start the Read timer
    const chip = screen.getByRole("button", { name: /read.*stopped/i });
    act(() => {
      shortTap(chip);
      vi.advanceTimersByTime(50);
    });

    // Verify timer is running
    const runningChip = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(runningChip.getAttribute("aria-pressed")).toBe("true");

    // Open sheet via long-press
    act(() => {
      fireEvent(
        runningChip,
        new PointerEvent("pointerdown", { bubbles: true }),
      );
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent(runningChip, new PointerEvent("pointerup", { bubbles: true }));
      vi.advanceTimersByTime(50);
    });

    // Sheet open
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Use fireEvent for input + button to stay within fake timer context
    const input = screen.getByLabelText("Minutes done");
    // Set value to 10 via fireEvent.change (uncontrolled input)
    fireEvent.change(input, { target: { value: "10" } });
    expect((input as HTMLInputElement).value).toBe("10");

    // Click Save using fireEvent (synchronous, no timer deps)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Save minutes" }));
      vi.advanceTimersByTime(50);
    });

    // Sheet closes
    expect(screen.queryByRole("dialog")).toBeNull();

    // Timer still running (aria-pressed="true")
    const stillRunning = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(stillRunning.getAttribute("aria-pressed")).toBe("true");

    // Advance 60s for one minute tick from new floor (10)
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Badge should read "11 / 25 m" (10 from SET_TIMER_MINUTES + 1 elapsed)
    const updatedChip = screen.getByRole("button", {
      name: /read.*running/i,
    });
    expect(updatedChip.textContent).toMatch(/11\s*\/\s*25/);
  });
});
