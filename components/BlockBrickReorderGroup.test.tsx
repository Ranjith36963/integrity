// components/BlockBrickReorderGroup.test.tsx — M6 component tests.
// Covers C-m6-012 (onReorder dispatches REORDER_BRICK_IN_BLOCK with correct from/to)
// and C-m6-013 (single-brick block does NOT mount Reorder.Group; plain <ul> renders).
//
// Drag interactions via Reorder.Group.onReorder are invoked programmatically.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BlockBrickReorderGroup } from "./BlockBrickReorderGroup";
import { EditModeContext } from "./EditModeProvider";
import type { Block, Brick } from "@/lib/types";

// Track Reorder.Group onReorder for programmatic invocation
let capturedOnReorder: ((newOrder: Brick[]) => void) | null = null;
// Track Reorder.Item props for dragListener check
const capturedItemProps: Array<{ dragListener?: unknown; value?: unknown }> =
  [];

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
    useDragControls: vi.fn(() => ({ start: vi.fn() })),
    Reorder: {
      ...actual.Reorder,
      Group: ({
        children,
        onReorder,
        "data-testid": testId,
        ...rest
      }: {
        children?: React.ReactNode;
        onReorder?: (newOrder: Brick[]) => void;
        "data-testid"?: string;
        [key: string]: unknown;
      }) => {
        // Capture the onReorder callback so tests can invoke it programmatically
        capturedOnReorder = onReorder ?? null;
        return (
          <ul
            data-testid={testId ?? "block-brick-reorder-group"}
            {...(rest as React.HTMLAttributes<HTMLUListElement>)}
          >
            {children}
          </ul>
        );
      },
      Item: ({
        children,
        dragListener,
        value,
        ...rest
      }: {
        children?: React.ReactNode;
        dragListener?: boolean;
        value?: unknown;
        [key: string]: unknown;
      }) => {
        capturedItemProps.push({ dragListener, value });
        return (
          <li
            data-drag-listener={
              dragListener !== undefined ? String(dragListener) : undefined
            }
            {...(rest as React.HTMLAttributes<HTMLLIElement>)}
          >
            {children}
          </li>
        );
      },
    },
  };
});

// M6 fixture bricks
const brkA1: Brick = {
  id: "brk-A1",
  name: "Push-ups",
  kind: "tick",
  done: false,
  categoryId: null,
  hasDuration: false,
  parentBlockId: "blk-A",
};

const brkA2: Brick = {
  id: "brk-A2",
  name: "Pull-ups",
  kind: "tick",
  done: false,
  categoryId: null,
  hasDuration: false,
  parentBlockId: "blk-A",
};

const brkA3: Brick = {
  id: "brk-A3",
  name: "Plank",
  kind: "tick",
  done: false,
  categoryId: null,
  hasDuration: false,
  parentBlockId: "blk-A",
};

const blkA: Block = {
  id: "blk-A",
  name: "Morning",
  start: "08:00",
  end: "09:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkA1, brkA2, brkA3],
};

const brkS1: Brick = {
  id: "brk-S1",
  name: "Stretch",
  kind: "tick",
  done: false,
  categoryId: null,
  hasDuration: false,
  parentBlockId: "blk-single",
};

const blkSingle: Block = {
  id: "blk-single",
  name: "Single",
  start: "07:00",
  end: "07:30",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkS1],
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnReorder = null;
  capturedItemProps.length = 0;
});

// ─── C-m6-012: onReorder dispatches REORDER_BRICK_IN_BLOCK with correct from/to ─

describe("C-m6-012: BlockBrickReorderGroup onReorder dispatches correctly", () => {
  it("renders Reorder.Group with data-testid='block-brick-reorder-group' in editMode", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <BlockBrickReorderGroup
          block={blkA}
          categories={[]}
          onReorderBrickInBlock={vi.fn()}
        />
      </EditModeContext.Provider>,
    );
    expect(screen.getByTestId("block-brick-reorder-group")).toBeInTheDocument();
  });

  it("calls onReorderBrickInBlock exactly once with correct blockId, fromIndex, toIndex", () => {
    const onReorderBrickInBlock = vi.fn();
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <BlockBrickReorderGroup
          block={blkA}
          categories={[]}
          onReorderBrickInBlock={onReorderBrickInBlock}
        />
      </EditModeContext.Provider>,
    );

    // Invoke Reorder.Group onReorder with brk-A1 moved from index 0 to end
    // New order: [brk-A2, brk-A3, brk-A1]
    act(() => {
      capturedOnReorder?.([brkA2, brkA3, brkA1]);
    });

    expect(onReorderBrickInBlock).toHaveBeenCalledTimes(1);
    expect(onReorderBrickInBlock).toHaveBeenCalledWith("blk-A", 0, 2);
  });

  it("each Reorder.Item carries dragListener={false}", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <BlockBrickReorderGroup
          block={blkA}
          categories={[]}
          onReorderBrickInBlock={vi.fn()}
        />
      </EditModeContext.Provider>,
    );

    // All items should have dragListener=false
    expect(capturedItemProps.length).toBe(3);
    for (const itemProps of capturedItemProps) {
      expect(itemProps.dragListener).toBe(false);
    }
  });
});

// ─── C-m6-013: single-brick block does NOT mount Reorder.Group ───────────────

describe("C-m6-013: BlockBrickReorderGroup skips Reorder.Group for single-brick block", () => {
  it("returns null (no Reorder.Group rendered) when bricks.length === 1", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <BlockBrickReorderGroup
          block={blkSingle}
          categories={[]}
          onReorderBrickInBlock={vi.fn()}
        />
      </EditModeContext.Provider>,
    );

    // The block-brick-reorder-group testId should NOT be in the DOM
    expect(
      screen.queryByTestId("block-brick-reorder-group"),
    ).not.toBeInTheDocument();
  });

  it("returns null when bricks.length === 0", () => {
    const blkEmpty: Block = { ...blkA, bricks: [] };
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <BlockBrickReorderGroup
          block={blkEmpty}
          categories={[]}
          onReorderBrickInBlock={vi.fn()}
        />
      </EditModeContext.Provider>,
    );

    expect(
      screen.queryByTestId("block-brick-reorder-group"),
    ).not.toBeInTheDocument();
  });
});
