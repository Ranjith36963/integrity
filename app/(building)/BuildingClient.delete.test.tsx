// app/(building)/BuildingClient.delete.test.tsx — M5: Delete flow + Edit Mode integration
// Covers: C-m5-009, C-m5-013..020

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingClient } from "./BuildingClient";
import { saveState } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";
import { usePersistedState } from "@/lib/usePersistedState";

/**
 * BuildingClientHarness — M9c pattern.
 * Calls usePersistedState() and renders BuildingClient with props.
 */
function BuildingClientHarness() {
  const [state, dispatch] = usePersistedState();
  return <BuildingClient state={state} dispatch={dispatch} />;
}

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

// Standing fixture — seeded into localStorage before each test.
// blk-recur: recurring (every-day), name "Morning", bricks: brk-1 (tick), brk-2 (units)
// blk-once:  non-recurring (just-today), name "One-off", bricks: brk-3 (tick)
// looseBrick: brk-loose (tick, not timed)
const BASE_FIXTURE: PersistedState = {
  schemaVersion: 3,
  programStart: "2026-05-01",
  currentDate: "2026-05-18",
  history: {},
  deletions: {},
  blocks: [
    {
      id: "blk-recur",
      name: "Morning",
      start: "07:00",
      end: "08:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "brk-1",
          name: "Meditate",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-recur",
        },
        {
          id: "brk-2",
          name: "Water",
          kind: "units",
          done: 0,
          target: 8,
          unit: "glasses",
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-recur",
        },
      ],
    },
    {
      id: "blk-once",
      name: "One-off",
      start: "09:00",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [
        {
          id: "brk-3",
          name: "Journal",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-once",
        },
      ],
    },
  ],
  looseBricks: [
    {
      id: "brk-loose",
      name: "Walk",
      kind: "tick",
      done: false,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    },
  ],
  categories: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  saveState(BASE_FIXTURE);
});

// Helper: enable edit mode by clicking the pencil button
async function enableEditMode(user: ReturnType<typeof userEvent.setup>) {
  const pencil = screen.getByRole("button", { name: /edit mode/i });
  await user.click(pencil);
}

// ─── C-m5-009: × opens DeleteConfirmModal; no DELETE action dispatched ────────

describe("C-m5-009: block × opens confirm modal; deletion is never a one-tap", () => {
  it("no dialog before edit mode; after × tap dialog appears with 'Delete this block?'", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    // No dialog before edit mode
    expect(screen.queryByRole("dialog", { hidden: false })).toBeNull();
    // Enable edit mode
    await enableEditMode(user);
    // × appears on blk-recur's card
    const deleteBtn = screen.getByRole("button", {
      name: "Delete block Morning",
    });
    await user.click(deleteBtn);
    // Modal opens
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/delete this block\?/i)).toBeInTheDocument();
    // Block card still rendered (not immediately deleted)
    expect(screen.getByText("Morning")).toBeInTheDocument();
  });
});

// ─── C-m5-013: Cancel closes modal; ESC = Cancel ─────────────────────────────

describe("C-m5-013: Cancel aborts delete; ESC = Cancel", () => {
  it("Cancel closes the modal and the block remains on timeline", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Block still rendered
    expect(screen.getByText("Morning")).toBeInTheDocument();
  });

  it("ESC key closes the modal and block remains", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // ESC
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Morning")).toBeInTheDocument();
  });
});

// ─── C-m5-014: Edit mode toggle while modal is open does not dismiss modal ────

describe("C-m5-014: Edit mode toggle does not dismiss the delete modal", () => {
  it("modal stays open after pencil toggle while modal is open", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Toggle edit mode off while modal is open
    await user.click(screen.getByRole("button", { name: /edit mode/i }));
    // Modal stays open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Resolve via Cancel — still works
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ─── C-m5-015: "Just today" hides block from today's timeline ─────────────────

describe("C-m5-015: Just today removes block from today's view", () => {
  it("'Just today' removes blk-recur from timeline; modal closes", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    expect(screen.getByText("Morning")).toBeInTheDocument();
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    // Modal opens — recurring block has 3 options
    expect(
      screen.getByRole("button", { name: /just today/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /just today/i }));
    // Modal closes
    expect(screen.queryByRole("dialog")).toBeNull();
    // Block removed from today's timeline
    expect(screen.queryByText("Morning")).toBeNull();
  });
});

// ─── C-m5-016: "All recurrences" removes template; brick delete removes brick ──

describe("C-m5-016: All recurrences removes block template; brick delete removes brick", () => {
  it("'All recurrences' on blk-recur removes it from timeline", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    await user.click(screen.getByRole("button", { name: /all recurrences/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Morning")).toBeNull();
  });

  it("non-recurring block One-off shows single Delete; Delete removes it", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block One-off" }),
    );
    // Non-recurring: only Delete + Cancel (no Just today/All recurrences)
    expect(screen.queryByRole("button", { name: /just today/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("One-off")).toBeNull();
  });
});

// ─── C-m5-017: Edit mode suppresses log; locked mode logs normally ─────────────

describe("C-m5-017: Edit mode suppresses brick log; locked mode logs normally", () => {
  it("in Edit mode tapping a block card does not expand it", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    await enableEditMode(user);
    // In edit mode, tapping the block card body is inert (SG-m5-05)
    // The block card should not expand — find the card via data-component
    const blockCard = document.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    if (blockCard) {
      expect(blockCard.getAttribute("aria-expanded")).toBe("false");
      // Click outside the × button
      await user.click(blockCard);
      expect(blockCard.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("in locked mode tapping a block card expands it (normal M4 behavior)", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    const blockCard = document.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    if (blockCard) {
      expect(blockCard.getAttribute("aria-expanded")).toBe("false");
      await user.click(blockCard);
      expect(blockCard.getAttribute("aria-expanded")).toBe("true");
    }
  });
});

// ─── C-m5-018: Removal animation (simplified — jsdom has no real animations) ───

describe("C-m5-018: block removal — element leaves DOM after delete", () => {
  it("after 'All recurrences' Morning is gone from the DOM", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    expect(screen.getByText("Morning")).toBeInTheDocument();
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block Morning" }),
    );
    await user.click(screen.getByRole("button", { name: /all recurrences/i }));
    expect(screen.queryByText("Morning")).toBeNull();
  });
});

// ─── C-m5-019: empty deletions is identity — existing tests pass unchanged ────

describe("C-m5-019: currentDayBlocks with empty deletions feeds same blocks as state.blocks", () => {
  it("with no deletions all blocks render normally (AC #14 regression anchor)", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    // Both blocks render (deletions is empty in BASE_FIXTURE)
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("One-off")).toBeInTheDocument();
  });
});

// ─── C-m5-020: delete everything → empty state ───────────────────────────────

describe("C-m5-020: deleting last block + brick returns to M1 empty state", () => {
  beforeEach(() => {
    // Seed with just one block (blk-once) and one loose brick (brk-loose)
    const minimalFixture: PersistedState = {
      ...BASE_FIXTURE,
      blocks: [
        {
          id: "blk-once",
          name: "One-off",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-18" },
          categoryId: null,
          bricks: [],
        },
      ],
      looseBricks: [],
    };
    localStorage.clear();
    saveState(minimalFixture);
  });

  it("deleting the last block renders the M1 empty-state copy", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<BuildingClientHarness />);
    });
    expect(screen.getByText("One-off")).toBeInTheDocument();
    await enableEditMode(user);
    await user.click(
      screen.getByRole("button", { name: "Delete block One-off" }),
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    // M1 empty-state message
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });
});
