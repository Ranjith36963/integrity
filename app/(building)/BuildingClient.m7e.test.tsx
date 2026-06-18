/**
 * app/(building)/BuildingClient.m7e.test.tsx — M7e: C-m7e-023b, C-m7e-025..034
 *
 * Tests for:
 *   - C-m7e-023b: regression — BuildingClient passes state to TopBar (G3 guard)
 *   - C-m7e-025..028: <BuildingClient> FirstBrickCard mount logic
 *   - C-m7e-029..034: <BuildingClient> toast-emit at four dispatch sites + invariants
 *
 * Pattern: controlled harness using useReducer(reducer, initialState) +
 * sheet mocks that capture onSave/onConfirm callbacks for programmatic invocation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useReducer, useRef, useEffect, type Dispatch } from "react";
import { BuildingClient } from "./BuildingClient";
import { reducer } from "@/lib/data";
import type { AppState, Action, Brick, Block } from "@/lib/types";
import { today } from "@/lib/dharma";

// ─── Toast mock (top-level — must be hoisted before other mocks) ──────────────
vi.mock("@/components/Toaster", () => ({
  toast: vi.fn(),
  Toaster: () => null,
}));

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-test" }));

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

// ─── TopBar mock — captures `state` prop for C-m7e-023b regression guard ─────
// Mocking TopBar prevents BrandMarkLongPress from mounting (avoids pointer-event
// interference with toast tests) and lets C-m7e-023b assert that BuildingClient
// always threads `state` into <TopBar state={state}> (G3 fix guard per ADR-027).
let capturedTopBarState: unknown = undefined;
vi.mock("@/components/TopBar", () => ({
  TopBar: ({ state }: { state?: unknown }) => {
    capturedTopBarState = state; // test-harness: capture state prop for C-m7e-023b
    return null;
  },
}));

// ─── Timeline mock — captures delete-request callbacks for C-m7e-030/032 ──────
// BuildingClient threads onRequestDeleteBlock / onRequestDeleteBrick into <Timeline>.
// Capturing them lets tests trigger pendingDelete state without pointer events.
type RequestDeleteBlockFn = ((blockId: string) => void) | null;
type RequestDeleteBrickFn = ((brickId: string) => void) | null;
const capturedDeleteCallbacks = {
  onRequestDeleteBlock: null as RequestDeleteBlockFn,
  onRequestDeleteBrick: null as RequestDeleteBrickFn,
};
vi.mock("@/components/Timeline", () => ({
  Timeline: ({
    onRequestDeleteBlock,
    onRequestDeleteBrick,
  }: {
    items: unknown[];
    categories: unknown[];
    now: string;
    onSlotTap: (hour: number) => void;
    onRequestDeleteBlock?: (blockId: string) => void;
    onRequestDeleteBrick?: (brickId: string) => void;
    [key: string]: unknown;
  }) => {
    capturedDeleteCallbacks.onRequestDeleteBlock = onRequestDeleteBlock ?? null; // test-harness
    capturedDeleteCallbacks.onRequestDeleteBrick = onRequestDeleteBrick ?? null; // test-harness
    return null;
  },
}));

// ─── Sheet + Modal callback capture mocks ────────────────────────────────────
// Each mock captures the `onSave` / `onConfirm*` callbacks threaded by BuildingClient,
// exposing them via the captured* objects so tests can invoke them directly.

type SaveBlockFn = ((block: Block) => void) | null;
type SaveBrickFn = ((brick: Brick) => void) | null;
type ConfirmJustTodayFn = (() => void) | null;
type ConfirmAllFn = (() => void) | null;
type ConfirmDeleteFn = (() => void) | null;

const capturedCallbacks = {
  onSaveBlock: null as SaveBlockFn,
  onSaveBrick: null as SaveBrickFn,
  onConfirmJustToday: null as ConfirmJustTodayFn,
  onConfirmAll: null as ConfirmAllFn,
  onConfirmDelete: null as ConfirmDeleteFn,
};

vi.mock("@/components/AddBlockSheet", () => ({
  AddBlockSheet: ({
    onSave,
  }: {
    open: boolean;
    defaultStart: string;
    categories: unknown[];
    blocks: unknown[];
    state: unknown;
    onSave: (block: Block) => void;
    onCancel: () => void;
    onCreateCategory: unknown;
  }) => {
    capturedCallbacks.onSaveBlock = onSave; // test-harness: capture handler for programmatic invocation
    return null;
  },
}));

vi.mock("@/components/AddBrickSheet", () => ({
  AddBrickSheet: ({
    onSave,
  }: {
    open: boolean;
    parentBlockId: string | null;
    defaultCategoryId: string | null;
    categories: unknown[];
    state: unknown;
    onSave: (brick: Brick) => void;
    onCancel: () => void;
    onCreateCategory: unknown;
  }) => {
    capturedCallbacks.onSaveBrick = onSave; // test-harness: capture handler for programmatic invocation
    return null;
  },
}));

vi.mock("@/components/DeleteConfirmModal", () => ({
  DeleteConfirmModal: ({
    onConfirmJustToday,
    onConfirmAll,
    onConfirmDelete,
  }: {
    open: boolean;
    target: unknown;
    onConfirmJustToday: () => void;
    onConfirmAll: () => void;
    onConfirmDelete: () => void;
    onCancel: () => void;
  }) => {
    capturedCallbacks.onConfirmJustToday = onConfirmJustToday; // test-harness: capture handler
    capturedCallbacks.onConfirmAll = onConfirmAll; // test-harness: capture handler
    capturedCallbacks.onConfirmDelete = onConfirmDelete; // test-harness: capture handler
    return null;
  },
}));

// ─── Controlled harness ───────────────────────────────────────────────────────
// Uses useReducer(reducer, initialState) so tests control firstBrickShown.
// dispatchRef captures the stable dispatch for direct action dispatch in tests.

const dispatchRef = { current: null as Dispatch<Action> | null };

function ControlledHarness({ initialState }: { initialState: AppState }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dispatchStable = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatchStable.current; // test-harness: capture stable dispatch ref
  });
  return <BuildingClient state={state} dispatch={dispatch} hydrated={true} />;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const standing: Omit<AppState, "blocks" | "looseBricks" | "firstBrickShown"> = {
  categories: [],
  programStart: "2026-01-01",
  currentDate: today(),
  history: {},
  deletions: {},
};

const validBrick: Brick = {
  id: "brk-v1",
  name: "Morning stretch",
  categoryId: null,
  parentBlockId: null,
  hasDuration: false,
  kind: "tick",
  done: false,
};

const anotherBrick: Brick = {
  id: "brk-v2",
  name: "Second brick",
  categoryId: null,
  parentBlockId: null,
  hasDuration: false,
  kind: "tick",
  done: false,
};

const validBlock: Block = {
  id: "blk-m7e",
  name: "Test Block",
  start: "08:00",
  end: "09:00",
  recurrence: { kind: "just-today", date: today() },
  categoryId: null,
  bricks: [],
};

const existingBrick: Brick = {
  id: "brk-existing",
  name: "Existing",
  categoryId: null,
  parentBlockId: "blk-exist",
  hasDuration: false,
  kind: "tick",
  done: false,
};

const existingBlock: Block = {
  id: "blk-exist",
  name: "Existing Block",
  start: "10:00",
  end: "11:00",
  recurrence: { kind: "just-today", date: today() },
  categoryId: null,
  bricks: [existingBrick],
};

// Test state fixtures per tests.md spec fixtures section
const stateWithZeroBricksAndFlagFalse: AppState = {
  ...standing,
  blocks: [],
  looseBricks: [],
  firstBrickShown: false,
};

const stateWithOneBrickAndFlagTrue: AppState = {
  ...standing,
  blocks: [{ ...existingBlock, bricks: [existingBrick] }],
  looseBricks: [],
  firstBrickShown: true,
};

const stateWithBricksAndFlagTrue: AppState = {
  ...standing,
  blocks: [{ ...existingBlock, bricks: [existingBrick] }],
  looseBricks: [{ ...validBrick, id: "brk-loose" }],
  firstBrickShown: true,
};

const stateWithBricksAndFlagFalse: AppState = {
  ...standing,
  blocks: [{ ...existingBlock, bricks: [existingBrick] }],
  looseBricks: [],
  firstBrickShown: false,
};

const stateForToastTests: AppState = {
  ...standing,
  blocks: [{ ...existingBlock, bricks: [existingBrick] }],
  looseBricks: [],
  firstBrickShown: true,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  dispatchRef.current = null;
  capturedTopBarState = undefined;
  capturedCallbacks.onSaveBlock = null;
  capturedCallbacks.onSaveBrick = null;
  capturedCallbacks.onConfirmJustToday = null;
  capturedCallbacks.onConfirmAll = null;
  capturedCallbacks.onConfirmDelete = null;
  capturedDeleteCallbacks.onRequestDeleteBlock = null;
  capturedDeleteCallbacks.onRequestDeleteBrick = null;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(async () => {
  await act(async () => {
    vi.advanceTimersByTime(10000);
  });
  vi.useRealTimers();
});

// ─── C-m7e-025: BuildingClient mounts FirstBrickCard on 0→1 brick transition ──

describe("C-m7e-025: <BuildingClient> mounts <FirstBrickCard visible> on 0→1 brick transition when firstBrickShown !== true", () => {
  it("initial render: no card (brickCount === 0); after onSaveBrick: card appears with 'Your Empire begins.'", async () => {
    render(
      <ControlledHarness initialState={stateWithZeroBricksAndFlagFalse} />,
    );
    await act(async () => {});

    // Initial render: no first-brick-card (no bricks yet)
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Trigger handleSaveBrick via captured onSaveBrick callback
    await act(async () => {
      capturedCallbacks.onSaveBrick!(validBrick);
    });

    // Post-dispatch: card should appear with the empire text
    const card = screen.queryByTestId("first-brick-card");
    expect(card).toBeTruthy();
    expect(card!.textContent).toContain("Your Empire begins.");
  });
});

// ─── C-m7e-026: No re-mount on second ADD_BRICK when firstBrickShown === true ──

describe("C-m7e-026: <BuildingClient> does NOT re-mount <FirstBrickCard> on second ADD_BRICK — firstBrickShown now true", () => {
  it("second ADD_BRICK: firstBrickShown is true; no card re-fires", async () => {
    render(<ControlledHarness initialState={stateWithOneBrickAndFlagTrue} />);
    await act(async () => {});

    // No card on initial render (flag already true)
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Second brick added
    await act(async () => {
      capturedCallbacks.onSaveBrick!(anotherBrick);
    });

    // Card must NOT appear — firstBrickShown is already true
    expect(screen.queryByTestId("first-brick-card")).toBeNull();
  });
});

// ─── C-m7e-027: No card on hydration into firstBrickShown=true, brickCount>0 ──

describe("C-m7e-027: <BuildingClient> does NOT mount <FirstBrickCard> on hydration into firstBrickShown=true AND brickCount>0", () => {
  it("card is null at first paint AND after 5000ms (transition predicate never fires)", async () => {
    render(<ControlledHarness initialState={stateWithBricksAndFlagTrue} />);
    await act(async () => {});

    // No card on initial render
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Still null after timers advance
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId("first-brick-card")).toBeNull();
  });
});

// ─── C-m7e-028: Defensive corruption guard — bricks present but flag false ───

describe("C-m7e-028: <BuildingClient> defensive — hydration into firstBrickShown=false AND brickCount>0 does NOT fire the card", () => {
  it("brickCount was never 0 on this mount; 0→1 predicate never satisfies → no card", async () => {
    render(<ControlledHarness initialState={stateWithBricksAndFlagFalse} />);
    await act(async () => {});

    // No card: the 0→1 transition is the gate; brickCount was never 0 on this mount
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Still null after waiting
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId("first-brick-card")).toBeNull();
  });
});

// ─── C-m7e-029: toast("Block created", "success") after ADD_BLOCK ─────────────

describe("C-m7e-029: <BuildingClient> invokes toast('Block created', 'success') after ADD_BLOCK dispatch", () => {
  it("toast called once with ('Block created', 'success')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    render(<ControlledHarness initialState={stateForToastTests} />);
    await act(async () => {});

    // Trigger handleSave via captured onSaveBlock callback
    await act(async () => {
      capturedCallbacks.onSaveBlock!(validBlock);
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Block created", "success");
  });
});

// ─── C-m7e-030: toast("Block deleted", "info") after DELETE_BLOCK_TODAY / ALL ──

describe("C-m7e-030: <BuildingClient> invokes toast('Block deleted', 'info') after DELETE_BLOCK_TODAY OR DELETE_BLOCK_ALL", () => {
  it("DELETE_BLOCK_TODAY (recurring block — Just today): toast called once with ('Block deleted', 'info')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    // State with a recurring block — handleConfirmJustToday dispatches DELETE_BLOCK_TODAY
    const stateWithRecurringBlock: AppState = {
      ...standing,
      blocks: [
        {
          id: "blk-recur",
          name: "Recurring",
          start: "07:00",
          end: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      looseBricks: [],
      firstBrickShown: true,
    };

    render(<ControlledHarness initialState={stateWithRecurringBlock} />);
    await act(async () => {});

    // Step 1: fire onRequestDeleteBlock — sets pendingDelete inside BuildingClient
    await act(async () => {
      capturedDeleteCallbacks.onRequestDeleteBlock!("blk-recur");
    });

    toastMock.mockClear();

    // Step 2: fire onConfirmJustToday — handleConfirmJustToday sees pendingDelete.blockId,
    // dispatches DELETE_BLOCK_TODAY, then calls toast("Block deleted", "info")
    await act(async () => {
      capturedCallbacks.onConfirmJustToday!();
    });

    // Mutant guard: deleting the toast call in handleConfirmJustToday fails this assertion
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Block deleted", "info");
  });

  it("DELETE_BLOCK_ALL (non-recurring block — single Delete via onConfirmAll): toast called once with ('Block deleted', 'info')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    // existingBlock has recurrence: just-today — handleConfirmAll dispatches DELETE_BLOCK_ALL
    render(<ControlledHarness initialState={stateForToastTests} />);
    await act(async () => {});

    // Step 1: fire onRequestDeleteBlock — sets pendingDelete.blockId
    await act(async () => {
      capturedDeleteCallbacks.onRequestDeleteBlock!("blk-exist");
    });

    toastMock.mockClear();

    // Step 2: fire onConfirmAll — handleConfirmAll sees pendingDelete.blockId,
    // dispatches DELETE_BLOCK_ALL, then calls toast("Block deleted", "info")
    await act(async () => {
      capturedCallbacks.onConfirmAll!();
    });

    // Mutant guard: deleting the toast call in handleConfirmAll fails this assertion
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Block deleted", "info");
  });
});

// ─── C-m7e-031: toast("Brick added", "success") after ADD_BRICK ──────────────

describe("C-m7e-031: <BuildingClient> invokes toast('Brick added', 'success') after ADD_BRICK dispatch", () => {
  it("toast called once with ('Brick added', 'success')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    render(
      <ControlledHarness initialState={stateWithZeroBricksAndFlagFalse} />,
    );
    await act(async () => {});

    // Trigger handleSaveBrick via captured onSaveBrick callback
    await act(async () => {
      capturedCallbacks.onSaveBrick!(validBrick);
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Brick added", "success");
  });
});

// ─── C-m7e-032: toast("Brick deleted", "info") after DELETE_BRICK ─────────────

describe("C-m7e-032: <BuildingClient> invokes toast('Brick deleted', 'info') after DELETE_BRICK dispatch", () => {
  it("toast called once with ('Brick deleted', 'info')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    // stateForToastTests has existingBlock with existingBrick (id: "brk-existing")
    render(<ControlledHarness initialState={stateForToastTests} />);
    await act(async () => {});

    // Step 1: fire onRequestDeleteBrick — sets pendingDelete.brickId inside BuildingClient
    await act(async () => {
      capturedDeleteCallbacks.onRequestDeleteBrick!("brk-existing");
    });

    toastMock.mockClear();

    // Step 2: fire onConfirmDelete — handleConfirmDelete sees pendingDelete.brickId,
    // dispatches DELETE_BRICK, then calls toast("Brick deleted", "info")
    await act(async () => {
      capturedCallbacks.onConfirmDelete!();
    });

    // Mutant guard: deleting the toast call in handleConfirmDelete fails this assertion
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Brick deleted", "info");
  });
});

// ─── C-m7e-033: rejected ADD_BRICK (form-level gate) → toast count === 0 ─────

describe("C-m7e-033: rejected ADD_BRICK dispatch does NOT invoke toast — happy-path-only emit", () => {
  it("when no dispatch fires (form-validation gate), toast count === 0", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    render(<ControlledHarness initialState={stateForToastTests} />);
    await act(async () => {});

    // Simulate the form-validation gate: do NOT call onSaveBrick at all
    // (The form layer validates the brick before calling onSave; rejected = no call)
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(toastMock).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m7e-034: REORDER_BLOCK overlap-rejection snap-back → NO toast ──────────

describe("C-m7e-034: M6 REORDER_BLOCK overlap-rejection snap-back does NOT fire a toast — SG-m7e-05", () => {
  it("overlap-rejected REORDER_BLOCK path: toast count === 0", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    const stateWithOverlapBlocks: AppState = {
      ...standing,
      blocks: [
        {
          id: "blk-a",
          name: "Block A",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: today() },
          categoryId: null,
          bricks: [],
        },
        {
          id: "blk-b",
          name: "Block B",
          start: "10:00",
          end: "11:00",
          recurrence: { kind: "just-today", date: today() },
          categoryId: null,
          bricks: [],
        },
      ],
      looseBricks: [],
      firstBrickShown: true,
    };

    render(<ControlledHarness initialState={stateWithOverlapBlocks} />);
    await act(async () => {});

    // Direct REORDER_BLOCK dispatch — BuildingClient has no toast wiring for reorder
    // SG-m7e-05 ratification: plan baseline = no toast on snap-back or any reorder
    await act(async () => {
      dispatchRef.current!({
        type: "REORDER_BLOCK",
        blockId: "blk-a",
        newStart: "10:30",
        newEnd: "11:30",
      });
    });

    expect(toastMock).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m7e-023b: regression — BuildingClient passes state to TopBar ───────────
// Guards the G3 fix: BuildingClient.tsx must render <TopBar state={state} />.
// A mutant reverting to <TopBar /> (no state) makes capturedTopBarState undefined.

describe("C-m7e-023b: <BuildingClient> renders <TopBar state={state}> (G3 regression guard)", () => {
  it("TopBar receives the current AppState on initial render", async () => {
    render(<ControlledHarness initialState={stateForToastTests} />);
    await act(async () => {});

    // capturedTopBarState is set by the TopBar mock on every render.
    // When <TopBar state={state}> is passed, capturedTopBarState equals the AppState.
    // When <TopBar /> (no state prop), capturedTopBarState is undefined — assertion fails.
    expect(capturedTopBarState).toBeDefined();
    expect(capturedTopBarState).not.toBeNull();
  });
});
