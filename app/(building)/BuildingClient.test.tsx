import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingClient } from "./BuildingClient";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-1" }));

// C-bld-034 (re-authored M2): BuildingClient initializes with empty blocks
describe("C-bld-034 (re-authored M2): BuildingClient initializes with empty blocks", () => {
  it("renders locked SPEC empty-state copy when no blocks are present", () => {
    render(<BuildingClient />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });
});

// C-bld-035 (re-authored M2): BlueprintBar IS in the DOM (unconditional)
describe("C-bld-035 (re-authored M2): BlueprintBar always present even with empty blocks", () => {
  it("BlueprintBar section is in the DOM with empty blocks", () => {
    const { container } = render(<BuildingClient />);
    const blueprint = container.querySelector('[aria-label="Day blueprint"]');
    expect(blueprint).not.toBeNull();
  });
});

// C-bld-036: NowCard is NOT in the DOM
describe("C-bld-036: NowCard absent when blocks is empty", () => {
  it("no element with data-component='now-card' is in the DOM", () => {
    const { container } = render(<BuildingClient />);
    expect(container.querySelector('[data-component="now-card"]')).toBeNull();
  });
});

// C-bld-039: BuildingClient uses live clock
describe("C-bld-039: BuildingClient shows live dateLabel and now pin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders live dateLabel 'Wed, May 6' (not the placeholder '')", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:30:00"));
    render(<BuildingClient />);
    expect(screen.getByText("Wed, May 6")).toBeInTheDocument();
    expect(screen.queryByLabelText("Now 00:00")).not.toBeInTheDocument();
  });
});

// C-bld-040 (re-authored M2): BuildingClient shows 'Building 126 of 365' for May 6, 2026
describe("C-bld-040 (re-authored M2): BuildingClient shows 'Building 126 of 365' on May 6, 2026", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Hero renders 'Building 126 of 365' for dayOfYear on May 6, 2026", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:30:00"));
    const { container } = render(<BuildingClient />);
    const dayCounter = container.querySelector("section .mt-1");
    expect(dayCounter).not.toBeNull();
    const text = dayCounter?.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toBe("Building 126 of 365");
  });
});

// C-m1-019: NowCard NOT in DOM
describe("C-m1-019: BuildingClient does not render NowCard", () => {
  it("no element with data-component='now-card' is in the DOM", () => {
    const { container } = render(<BuildingClient />);
    expect(container.querySelector('[data-component="now-card"]')).toBeNull();
  });
});

// C-m1-020 (re-authored M2): BuildingClient renders no block cards initially
describe("C-m1-020 (re-authored M2): BuildingClient renders no block cards initially", () => {
  it("has zero timeline-block and brick-chip elements", () => {
    const { container } = render(<BuildingClient />);
    expect(
      container.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-component="brick-chip"]'),
    ).toHaveLength(0);
  });

  it("timeline column contains hour-grid, NowLine, and EmptyBlocks card", () => {
    const { container } = render(<BuildingClient />);
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="empty-state"]'),
    ).not.toBeNull();
  });
});

// C-m1-021: BlueprintBar always rendered unconditionally
describe("C-m1-021: BlueprintBar is rendered unconditionally with empty blocks", () => {
  it("exactly one element with aria-label='Day blueprint' is in the DOM", () => {
    const { container } = render(<BuildingClient />);
    const blueprints = container.querySelectorAll(
      '[aria-label="Day blueprint"]',
    );
    expect(blueprints).toHaveLength(1);
  });
});

// C-m2-012: New category persists even if block is Cancelled (re-authored M2)
describe("C-m2-012: New category persists if block Cancelled (re-authored M2)", () => {
  it("category exists in state after create+cancel, block does not", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Open sheet via + button
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Should see dialog
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Type title
    await user.type(screen.getByLabelText(/Title/i), "Test Block");

    // Click + New
    await user.click(screen.getByRole("button", { name: /\+ New/i }));

    // Fill new category form
    await user.type(screen.getByLabelText(/Name/i), "Health");
    await user.click(screen.getByRole("radio", { name: "Color 1" }));
    await user.click(screen.getByRole("button", { name: /Done/i }));

    // Should be back on block form
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Add Block",
    );

    // Cancel the block form
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Dialog should be gone
    expect(screen.queryByRole("dialog")).toBeNull();

    // No blocks were added (EmptyBlocks still shows)
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();

    // Open sheet again — Health category chip should appear in CategoryPicker
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("radio", { name: /Health/i })).toBeInTheDocument();
  });
});

// C-m2-016: Empty-state card unmounts when blocks.length > 0 (re-authored M2)
describe("C-m2-016: Empty-state card unmounts when blocks.length > 0 (re-authored M2)", () => {
  it("EmptyBlocks card disappears after saving a block via AddBlockSheet", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Initially EmptyBlocks is visible
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();

    // Open sheet, type title, save
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // EmptyBlocks should be gone
    expect(
      screen.queryByText("Tap any slot to lay your first block."),
    ).toBeNull();

    // Timeline block should be in DOM
    const { container } = render(<BuildingClient />);
    // (state is per-component instance; this is a fresh render of an empty state)
    // The prior rendered instance has the block — check in same render context:
    expect(
      document.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(1);
  });
});

// C-m2-020: BuildingClient wires reducer + sheet + onSave dispatch (re-authored M2)
describe("C-m2-020: BuildingClient wires reducer + sheet + onSave (re-authored M2)", () => {
  it("saves a block: name='Foo', categoryId=null, bricks=[]", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Click + button
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Type title
    await user.type(screen.getByLabelText(/Title/i), "Foo");

    // Save
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Dialog should be dismissed
    expect(screen.queryByRole("dialog")).toBeNull();

    // Block is in DOM
    const tlBlock = document.querySelector('[data-component="timeline-block"]');
    expect(tlBlock).not.toBeNull();
    expect(tlBlock?.textContent).toContain("Foo");

    // Hero 0% unchanged
    expect(screen.getByText("0%")).toBeInTheDocument();

    // No localStorage writes (no accidental persistence)
    expect(localStorage.length).toBe(0);
  });

  it("Add button opens sheet; Cancel closes without adding block", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      document.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(0);
  });
});

// U-m2-010: roundDownToHour helper (tested via BuildingClient export)
describe("U-m2-010: roundDownToHour string-slice helper", () => {
  it("rounds down '09:47' to '09:00'", async () => {
    const { roundDownToHour } = await import("./BuildingClient");
    expect(roundDownToHour("09:47")).toBe("09:00");
  });

  it("returns '00:00' for '00:00'", async () => {
    const { roundDownToHour } = await import("./BuildingClient");
    expect(roundDownToHour("00:00")).toBe("00:00");
  });

  it("returns '23:00' for '23:59'", async () => {
    const { roundDownToHour } = await import("./BuildingClient");
    expect(roundDownToHour("23:59")).toBe("23:00");
  });

  it("returns '12:00' for '12:00'", async () => {
    const { roundDownToHour } = await import("./BuildingClient");
    expect(roundDownToHour("12:00")).toBe("12:00");
  });
});
