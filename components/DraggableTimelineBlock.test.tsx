// components/DraggableTimelineBlock.test.tsx — M6 component tests.
// Covers C-m6-006 (lift + valid drop), C-m6-007 (reduced motion suppresses lift),
// C-m6-008 (overlap rejection snap-back), C-m6-009 (same-slot no-op),
// C-m6-010 (modalOpen suppresses drag), C-m6-011 (Edit Mode toggle mid-drag).
//
// Drag interactions are simulated programmatically — JSDOM has no real pointer model.
// We call the component's drag handlers directly via React Testing Library + vi mocks.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DraggableTimelineBlock } from "./DraggableTimelineBlock";
import { EditModeContext } from "./EditModeProvider";
import type { Block } from "@/lib/types";

// Mock haptics to observe calls
vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

// Captured drag handlers — updated each time the mock div renders
let capturedOnDragStart: (() => void) | null = null;
let capturedOnDragEnd:
  | ((e: unknown, info: { point: { y: number } }) => Promise<void> | void)
  | null = null;

// Mock motion/react — motion.div records drag prop and captures handlers for test invocation
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({
        children,
        drag,
        onDragStart,
        onDragEnd,
        "data-testid": testId,
        // Filter out Framer-specific props that React warns about on a plain div
        dragControls: _dragControls,
        dragListener: _dragListener,
        dragConstraints: _dragConstraints,
        dragMomentum: _dragMomentum,
        whileDrag: _whileDrag,
        transition: _transition,
        ...rest
      }: {
        children?: React.ReactNode;
        drag?: string | boolean;
        onDragStart?: () => void;
        onDragEnd?: (
          e: unknown,
          info: { point: { y: number } },
        ) => Promise<void> | void;
        "data-testid"?: string;
        dragControls?: unknown;
        dragListener?: unknown;
        dragConstraints?: unknown;
        dragMomentum?: unknown;
        whileDrag?: unknown;
        transition?: unknown;
        [key: string]: unknown;
      }) => {
        // Capture handlers so tests can invoke them programmatically
        capturedOnDragStart = onDragStart ?? null;
        capturedOnDragEnd = onDragEnd ?? null;
        return (
          <div
            data-testid={testId}
            data-drag={drag !== undefined ? String(drag) : undefined}
            {...(rest as React.HTMLAttributes<HTMLDivElement>)}
          >
            {children}
          </div>
        );
      },
    },
    useReducedMotion: vi.fn(() => false),
    useDragControls: vi.fn(() => ({ start: vi.fn() })),
  };
});

// M6 fixture — blkA at 08:00–09:00
const blkA: Block = {
  id: "blk-A",
  name: "Morning",
  start: "08:00",
  end: "09:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnDragStart = null;
  capturedOnDragEnd = null;
});

// ─── C-m6-006: lift haptic on onDragStart; onReorderRequest called on valid drop

describe("C-m6-006: DraggableTimelineBlock lift + valid drop", () => {
  it("fires haptics.light on drag start (lift)", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onReorderRequest = vi.fn();
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    // Simulate lift
    act(() => {
      capturedOnDragStart?.();
    });
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });

  it("calls onReorderRequest with (blockId, '13:00', '14:00') on valid drop at 13:00 snap", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onReorderRequest = vi.fn();
    // blkA is 08:00–09:00 (1hr duration). Drop at 13:00 → newStart="13:00", newEnd="14:00"
    // In JSDOM, scrollRef.current is null, so containerTop=0, scrollTop=0.
    // info.point.y = snapToSlot offset for 13:00:
    // 13:00 = 13hr * HOUR_HEIGHT_PX. HOUR_HEIGHT_PX=64 → 13*64=832px
    const HOUR_HEIGHT_PX = 64;
    const pointY = 13 * HOUR_HEIGHT_PX; // snaps to 13:00

    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    expect(onReorderRequest).toHaveBeenCalledWith("blk-A", "13:00", "14:00");
    // haptics.light fires once on successful commit
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });

  it("drag='y' when editMode=true and modalOpen=false", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("y");
  });

  it("drag='false' when editMode=false (Locked mode)", () => {
    render(
      <EditModeContext.Provider value={{ editMode: false, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("false");
  });
});

// ─── C-m6-007: reduced motion suppresses visual lift; haptics + dispatch still fire

describe("C-m6-007: reduced motion — haptics and onReorderRequest still fire", () => {
  it("haptics.light fires on drag start even under reduced motion", async () => {
    const { useReducedMotion } = await import("motion/react");
    (useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { haptics } = await import("@/lib/haptics");
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    act(() => {
      capturedOnDragStart?.();
    });
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });

  it("onReorderRequest fires on valid drop even under reduced motion", async () => {
    const { useReducedMotion } = await import("motion/react");
    (useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const onReorderRequest = vi.fn();
    const HOUR_HEIGHT_PX = 64;
    const pointY = 13 * HOUR_HEIGHT_PX;
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    expect(onReorderRequest).toHaveBeenCalledWith("blk-A", "13:00", "14:00");
  });
});

// ─── C-m6-008: overlap rejection — medium haptic; NO onReorderRequest; announce

describe("C-m6-008: DraggableTimelineBlock overlap rejection path", () => {
  it("calls haptics.medium on rejection; calls onReorderRequest once; calls onAnnounce once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onReorderRequest = vi.fn();
    const onAnnounce = vi.fn();

    // Overlap is detected via post-dispatch readback: if block.start unchanged
    // after onReorderRequest is called, the reducer rejected it.
    // We simulate rejection by: onReorderRequest is called but block prop stays "08:00"
    // (parent doesn't update the prop). The component detects block.start===oldStart→rejection.
    // Info: drop at 10:00 (overlapping "Workout" in a real scenario)
    const HOUR_HEIGHT_PX = 64;
    const pointY = 10 * HOUR_HEIGHT_PX; // snaps to 10:00

    // blkA starts at 08:00. After drop attempt to 10:00, if parent doesn't update
    // block.start to "10:00", the component interprets as rejection.
    // Since we never re-render with updated block, block.start stays "08:00" → rejection.

    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          onAnnounce={onAnnounce}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    // Rejection path: onReorderRequest dispatched once (reducer may reject it)
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    // medium haptic fires on rejection (block.start unchanged after dispatch)
    expect(haptics.medium).toHaveBeenCalledTimes(1);
    // light haptic does NOT fire on rejection (distinguishes from success path)
    expect(haptics.light).toHaveBeenCalledTimes(0);
    // announce fires with rejection message
    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m6-009: same-slot no-op — no dispatch, no haptic ──────────────────────

describe("C-m6-009: DraggableTimelineBlock same-slot no-op", () => {
  it("no onReorderRequest, no haptic, no announce when drop snaps to same slot", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onReorderRequest = vi.fn();
    const onAnnounce = vi.fn();

    // blkA starts at 08:00. Drop at same slot (8 * 64 = 512px → snaps to "08:00")
    const HOUR_HEIGHT_PX = 64;
    const pointY = 8 * HOUR_HEIGHT_PX; // snaps to 08:00 — same as block.start

    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          onAnnounce={onAnnounce}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    // Same-slot guard: nothing dispatched, no haptic, no announce
    expect(onReorderRequest).toHaveBeenCalledTimes(0);
    expect(haptics.light).toHaveBeenCalledTimes(0);
    expect(haptics.medium).toHaveBeenCalledTimes(0);
    expect(onAnnounce).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m6-010: modalOpen suppresses drag ─────────────────────────────────────

describe("C-m6-010: DraggableTimelineBlock — modalOpen=true suppresses drag", () => {
  it("drag prop is false when modalOpen=true even with editMode=true", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={true}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    // modalOpen=true overrides editMode=true → drag disabled
    expect(wrapper.getAttribute("data-drag")).toBe("false");
  });

  it("drag is re-enabled when modalOpen flips to false", () => {
    const { rerender } = render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={true}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    rerender(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={vi.fn()}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("y");
  });
});

// ─── C-m6-011: edit mode toggle mid-drag ─────────────────────────────────────

describe("C-m6-011: DraggableTimelineBlock — Edit Mode toggle mid-drag", () => {
  it("in-flight drag completes after Edit Mode toggle: onReorderRequest called once with new times", async () => {
    const onReorderRequest = vi.fn();
    const HOUR_HEIGHT_PX = 64;
    const pointY = 13 * HOUR_HEIGHT_PX; // snaps to 13:00

    const { rerender } = render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );

    // Simulate drag start (in-flight)
    act(() => {
      capturedOnDragStart?.();
    });

    // Toggle Edit Mode off mid-drag
    rerender(
      <EditModeContext.Provider value={{ editMode: false, toggle: vi.fn() }}>
        <DraggableTimelineBlock
          block={blkA}
          categories={[]}
          modalOpen={false}
          onReorderRequest={onReorderRequest}
          dragConstraintsRef={{ current: null }}
        />
      </EditModeContext.Provider>,
    );

    // drag prop is now false (Edit Mode off)
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("false");

    // In-flight drag still completes: onDragEnd fires with the captured pre-flip editMode
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    // The drag was started in Edit Mode (wasEditModeRef=true) so it completes
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    expect(onReorderRequest).toHaveBeenCalledWith("blk-A", "13:00", "14:00");
  });
});
