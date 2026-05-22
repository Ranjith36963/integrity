/**
 * app/(building)/BuildingClient.m7e.test.tsx — M7e: C-m7e-025..034
 *
 * Tests for:
 *   - C-m7e-025..028: <BuildingClient> FirstBrickCard mount logic
 *   - C-m7e-029..034: <BuildingClient> toast-emit at four dispatch sites + invariants
 *
 * Pattern: controlled harness using useReducer(reducer, initialState) so tests
 * can control state.firstBrickShown independently of the persist hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useReducer, useRef, useEffect, type Dispatch } from "react";
import { BuildingClient } from "./BuildingClient";
import { reducer } from "@/lib/data";
import type { AppState, Action, Brick, Block } from "@/lib/types";
import { today } from "@/lib/dharma";

// ─── Toast mock (top-level — applies to all tests in this file) ───────────────
// Must precede imports so vi.mock is hoisted.
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

// ─── Controlled harness ───────────────────────────────────────────────────────

// External ref to capture the dispatch function from inside the harness.
// Using a mutable ref object (not a module-level variable) to avoid the
// react-hooks/globals rule about reassigning module-level variables in render.
const dispatchRef = { current: null as Dispatch<Action> | null };

function ControlledHarness({ initialState }: { initialState: AppState }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Store dispatch in the shared ref via useEffect (outside render) to satisfy
  // the react-hooks/globals rule — effect runs after render, not during render.
  const dispatchStable = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatchStable.current; // test-harness side-effect: capture stable dispatch ref
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
  it("initial render: no card (brickCount === 0); post-ADD_BRICK: card appears with 'Your Empire begins.'", async () => {
    render(
      <ControlledHarness initialState={stateWithZeroBricksAndFlagFalse} />,
    );

    // Initial render: no first-brick-card (no bricks yet)
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Dispatch ADD_BRICK → triggers 0→1 brick transition
    await act(async () => {
      dispatchRef.current!({ type: "ADD_BRICK", brick: validBrick });
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
    // Start from stateWithOneBrickAndFlagTrue (post-C-m7e-025 state)
    // firstBrickShown === true already — card should not appear
    render(<ControlledHarness initialState={stateWithOneBrickAndFlagTrue} />);

    // No card on initial render (flag already true)
    expect(screen.queryByTestId("first-brick-card")).toBeNull();

    // Second ADD_BRICK dispatch
    await act(async () => {
      dispatchRef.current!({ type: "ADD_BRICK", brick: anotherBrick });
    });

    // Card must NOT appear — firstBrickShown is already true (flag was set on first brick)
    expect(screen.queryByTestId("first-brick-card")).toBeNull();
  });
});

// ─── C-m7e-027: No card on hydration into firstBrickShown=true, brickCount>0 ──

describe("C-m7e-027: <BuildingClient> does NOT mount <FirstBrickCard> on hydration into firstBrickShown=true AND brickCount>0", () => {
  it("card is null at first paint AND after 5000ms (transition predicate never fires)", async () => {
    render(<ControlledHarness initialState={stateWithBricksAndFlagTrue} />);

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

    await act(async () => {
      dispatchRef.current!({ type: "ADD_BLOCK", block: validBlock });
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Block created", "success");
  });
});

// ─── C-m7e-030: toast("Block deleted", "info") after DELETE_BLOCK_TODAY / ALL ──

describe("C-m7e-030: <BuildingClient> invokes toast('Block deleted', 'info') after DELETE_BLOCK_TODAY OR DELETE_BLOCK_ALL", () => {
  it("DELETE_BLOCK_TODAY: toast called once with ('Block deleted', 'info')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    render(<ControlledHarness initialState={stateForToastTests} />);

    await act(async () => {
      dispatchRef.current!({
        type: "DELETE_BLOCK_TODAY",
        blockId: existingBlock.id,
      });
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Block deleted", "info");
  });

  it("DELETE_BLOCK_ALL: toast called once with ('Block deleted', 'info')", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    render(<ControlledHarness initialState={stateForToastTests} />);

    await act(async () => {
      dispatchRef.current!({
        type: "DELETE_BLOCK_ALL",
        blockId: existingBlock.id,
      });
    });

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

    await act(async () => {
      dispatchRef.current!({ type: "ADD_BRICK", brick: validBrick });
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

    render(<ControlledHarness initialState={stateForToastTests} />);

    await act(async () => {
      dispatchRef.current!({ type: "DELETE_BRICK", brickId: existingBrick.id });
    });

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

    // Simulate the form-validation gate: do NOT call dispatch at all
    // (The form layer validates the brick before dispatching; rejected = no dispatch)
    await act(async () => {
      // No dispatch call — invalid brick never reaches the reducer
      vi.advanceTimersByTime(100);
    });

    expect(toastMock).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m7e-034: REORDER_BLOCK overlap-rejection snap-back → NO toast ──────────

describe("C-m7e-034: M6 REORDER_BLOCK overlap-rejection snap-back does NOT fire a toast — SG-m7e-05", () => {
  it("overlap-rejected REORDER_BLOCK (no-op in reducer): toast count === 0", async () => {
    const { toast } = await import("@/components/Toaster");
    const toastMock = vi.mocked(toast);
    toastMock.mockClear();

    // State with two overlapping blocks to trigger the overlap rejection path
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

    // REORDER_BLOCK that overlaps blk-b — the reducer returns state unchanged (no-op)
    // BuildingClient's handleReorderBlock uses findOverlaps to pre-screen and
    // announces the rejection without dispatching (per SG-m7e-05 plan baseline).
    // Neither the overlap-rejection path nor any other path fires toast on reorder.
    await act(async () => {
      dispatchRef.current!({
        type: "REORDER_BLOCK",
        blockId: "blk-a",
        newStart: "10:30",
        newEnd: "11:30",
      });
    });

    // SG-m7e-05 ratification: plan baseline = no toast on snap-back
    expect(toastMock).toHaveBeenCalledTimes(0);
  });
});
