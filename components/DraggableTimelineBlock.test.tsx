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
      div: (props: {
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
        // Destructure after type check; filter Framer-specific props from DOM spread
        const {
          children,
          drag,
          onDragStart,
          onDragEnd,
          "data-testid": testId,
          dragControls: _dc,
          dragListener: _dl,
          dragConstraints: _dcs,
          dragMomentum: _dm,
          whileDrag: _wd,
          transition: _tr,
          ...rest
        } = props;
        void _dc;
        void _dl;
        void _dcs;
        void _dm;
        void _wd;
        void _tr; // intentionally omitted from DOM
        // Capture handlers ONLY for the outer DraggableTimelineBlock wrapper
        // (testId="draggable-timeline-block"). Inner motion.div elements
        // (TimelineBlock card) must not overwrite them.
        if (testId === "draggable-timeline-block") {
          capturedOnDragStart = onDragStart ?? null;
          capturedOnDragEnd = onDragEnd ?? null;
        }
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

  it("calls onReorderRequest with (blockId, '13:00', '14:00') on valid drop at 13:00 snap; haptics.light fires on commit", async () => {
    const { haptics } = await import("@/lib/haptics");
    // blkA is 08:00–09:00 (1hr duration). Drop at 13:00 → newStart="13:00", newEnd="14:00"
    // In JSDOM, scrollRef.current is null, so containerTop=0, scrollTop=0.
    // info.point.y = snapToSlot offset for 13:00: 13hr * HOUR_HEIGHT_PX=64 → 832px
    const HOUR_HEIGHT_PX = 64;
    const pointY = 13 * HOUR_HEIGHT_PX; // snaps to 13:00

    // Simulate the reducer accepting the move: after onReorderRequest fires,
    // the parent re-renders with block.start="13:00". We model this inside the
    // SAME act() so React flushes the re-render BEFORE the microtask fires
    // (act processes effects before microtasks — giving useEffect([block.start])
    // a chance to clear pendingNewStartRef before the rejection microtask runs).
    const acceptedBlock = { ...blkA, start: "13:00", end: "14:00" };
    const onReorderRequest = vi.fn();

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
    // Simulate lift (first haptics.light)
    act(() => {
      capturedOnDragStart?.();
    });
    expect(haptics.light).toHaveBeenCalledTimes(1);
    // Simulate drop + acceptance in one act(): re-render happens before microtask
    await act(async () => {
      capturedOnDragEnd?.(null, { point: { y: pointY } });
      // Immediately re-render with accepted block (simulates parent reducer accepting).
      // React processes this re-render (and runs useEffect([block.start])) before
      // the queueMicrotask rejection check fires.
      rerender(
        <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
          <DraggableTimelineBlock
            block={acceptedBlock}
            categories={[]}
            modalOpen={false}
            onReorderRequest={onReorderRequest}
            dragConstraintsRef={{ current: null }}
          />
        </EditModeContext.Provider>,
      );
    });
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    expect(onReorderRequest).toHaveBeenCalledWith("blk-A", "13:00", "14:00");
    // haptics.light fired a second time on successful commit (lift=1, commit=2)
    expect(haptics.light).toHaveBeenCalledTimes(2);
    // haptics.medium NOT called (success path)
    expect(haptics.medium).toHaveBeenCalledTimes(0);
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

  it("onReorderRequest fires on valid drop even under reduced motion; haptics.light fires on commit", async () => {
    const { useReducedMotion } = await import("motion/react");
    (useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { haptics } = await import("@/lib/haptics");
    const onReorderRequest = vi.fn();
    const HOUR_HEIGHT_PX = 64;
    const pointY = 13 * HOUR_HEIGHT_PX;
    const acceptedBlock = { ...blkA, start: "13:00", end: "14:00" };

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
    // Lift + drop + acceptance in one act() to beat the microtask rejection check
    await act(async () => {
      capturedOnDragStart?.();
      capturedOnDragEnd?.(null, { point: { y: pointY } });
      rerender(
        <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
          <DraggableTimelineBlock
            block={acceptedBlock}
            categories={[]}
            modalOpen={false}
            onReorderRequest={onReorderRequest}
            dragConstraintsRef={{ current: null }}
          />
        </EditModeContext.Provider>,
      );
    });
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    expect(onReorderRequest).toHaveBeenCalledWith("blk-A", "13:00", "14:00");
    // haptics.light fires: once for lift, once for commit (both under reduced motion)
    expect(haptics.light).toHaveBeenCalledTimes(2);
  });
});

// ─── C-m6-008: overlap rejection — medium haptic; NO onReorderRequest; announce

describe("C-m6-008: DraggableTimelineBlock overlap rejection path", () => {
  it("calls haptics.medium on rejection; calls onReorderRequest once; calls onAnnounce once; haptics.light NOT fired a second time", async () => {
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
    // Simulate lift (fires haptics.light once)
    act(() => {
      capturedOnDragStart?.();
    });
    // Simulate drop at overlapping slot
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    // Rejection path: onReorderRequest dispatched once (reducer may reject it)
    expect(onReorderRequest).toHaveBeenCalledTimes(1);
    // medium haptic fires on rejection (block.start unchanged after dispatch)
    expect(haptics.medium).toHaveBeenCalledTimes(1);
    // haptics.light fired only ONCE (the lift), NOT a second time on rejection
    // A mutant firing light instead of medium on rejection fails this
    expect(haptics.light).toHaveBeenCalledTimes(1);
    // announce fires with rejection message
    expect(onAnnounce).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m6-009: same-slot no-op — no dispatch, no haptic ──────────────────────

describe("C-m6-009: DraggableTimelineBlock same-slot no-op", () => {
  it("no dispatch, no second haptic, no announce when drop snaps to same slot as current", async () => {
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
    // Simulate lift (haptics.light fires once for the lift)
    act(() => {
      capturedOnDragStart?.();
    });
    expect(haptics.light).toHaveBeenCalledTimes(1);
    // Simulate same-slot drop
    await act(async () => {
      await capturedOnDragEnd?.(null, { point: { y: pointY } });
    });
    // Same-slot guard: no dispatch, no additional haptic, no announce
    expect(onReorderRequest).toHaveBeenCalledTimes(0);
    // haptics.light still only once (the lift — no second fire for same-slot no-op)
    expect(haptics.light).toHaveBeenCalledTimes(1);
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
