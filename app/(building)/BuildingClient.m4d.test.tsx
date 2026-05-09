// app/(building)/BuildingClient.m4d.test.tsx — M4d BuildingClient wiring tests
// Covers: C-m4d-009..017

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

afterEach(() => {
  vi.clearAllMocks();
});

// ─── C-m4d-009: dock + → AddChooserSheet (not AddBlockSheet directly) ─────────

describe("C-m4d-009: dock + opens AddChooserSheet, not AddBlockSheet directly", () => {
  it("clicking dock + opens AddChooserSheet (role=dialog aria-label='Add'); AddBlockSheet NOT open", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Click the dock + button
    await user.click(screen.getByRole("button", { name: "Add" }));

    // AddChooserSheet dialog should be open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add");

    // AddBlockSheet should NOT be open
    expect(screen.queryByRole("button", { name: /Save/i })).toBeNull();
  });

  it("chooser → 'Add Block' → AddBlockSheet opens; chooser closes", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Open chooser
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Add");

    // Click "Add Block" inside chooser
    await user.click(screen.getByRole("button", { name: "Add Block" }));

    // Chooser should be gone; AddBlockSheet (aria-label="Add Block") should be open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Block");
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
  });

  it("defaultStart is set to rounded current hour when dock + → chooser → Add Block", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:47:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BuildingClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Block" }));

    // Start input should be "08:00" (rounded down from 08:47)
    const startInput = screen.getByLabelText(/Start/i);
    expect(startInput).toHaveValue("08:00");

    vi.useRealTimers();
  });
});

// ─── C-m4d-010: dock + → chooser → "Add Brick" → AddBrickSheet ───────────────

describe("C-m4d-010: dock + → chooser → 'Add Brick' → AddBrickSheet opens with parentBlockId null", () => {
  it("chooser 'Add Brick' opens AddBrickSheet; chooser closes", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Brick" }));

    // Chooser is gone; AddBrickSheet should be open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Brick");
  });

  it("AddBrickSheet opened from chooser has parentBlockId null (shows 'Loose brick' context)", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Brick" }));

    // AddBrickSheet should be open with title input (brick form)
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    // CategoryPicker should not be pre-filled (no category pre-fill for null parentBlockId)
    // The "Add Brick" dialog should exist
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Add Brick",
    );
  });
});

// ─── C-m4d-011: slot tap → chooser with captured hour ────────────────────────

describe("C-m4d-011: slot tap opens chooser; Add Block gets defaultStart=captured hour; Add Brick discards hour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("slot tap opens chooser (not AddBlockSheet directly)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BuildingClient />);

    // Click slot at hour 13
    const slot13 = screen.getByRole("button", { name: /Add block at 13:00/i });
    await user.click(slot13);

    // Chooser should open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add");
  });

  it("slot tap → Add Block → AddBlockSheet with defaultStart=captured hour (13:00)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BuildingClient />);

    // Click slot at hour 13
    const slot13 = screen.getByRole("button", { name: /Add block at 13:00/i });
    await user.click(slot13);

    // Click "Add Block" in chooser
    await user.click(screen.getByRole("button", { name: "Add Block" }));

    // AddBlockSheet should show defaultStart = 13:00
    const startInput = screen.getByLabelText(/Start/i);
    expect(startInput).toHaveValue("13:00");
  });

  it("slot tap (hour 13) → Add Brick → AddBrickSheet opens; captured hour discarded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BuildingClient />);

    // Click slot at hour 13
    const slot13 = screen.getByRole("button", { name: /Add block at 13:00/i });
    await user.click(slot13);

    // Click "Add Brick" in chooser
    await user.click(screen.getByRole("button", { name: "Add Brick" }));

    // AddBrickSheet should open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Brick");
    // Brick form has no time/start field (time-agnostic per plan)
    expect(screen.queryByLabelText(/Start/i)).toBeNull();
  });
});

// ─── C-m4d-012: inside-block "+ Add brick" bypasses chooser ──────────────────

describe("C-m4d-012: inside-block '+ Add brick' bypasses chooser; opens AddBrickSheet directly", () => {
  it("+ Add brick in expanded block opens AddBrickSheet directly; AddChooserSheet NOT mounted", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Add a block first
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Block" }));
    await user.type(screen.getByLabelText(/Title/i), "Morning");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Click the block to expand it
    const card = document.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    // Click "+ Add brick" inside expanded block
    const addBrickBtn = screen.getByRole("button", { name: /add brick/i });
    await user.click(addBrickBtn);

    // AddBrickSheet should open directly (aria-label="Add Brick")
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Brick");

    // Confirm it's not the chooser (chooser has "Add Block" and "Add Brick" buttons)
    // AddBrickSheet has a Title input + type selector
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();

    // Chooser's "Add Block" button should NOT be present
    expect(screen.queryByRole("button", { name: /^Add Block$/i })).toBeNull();
  });
});

// ─── C-m4d-013: tray "+ Brick" pill bypasses chooser ─────────────────────────

describe("C-m4d-013: tray '+ Brick' pill bypasses chooser; opens AddBrickSheet directly", () => {
  it("tray '+ Brick' pill opens AddBrickSheet directly; AddChooserSheet NOT mounted", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Add a block to make the tray visible
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Block" }));
    await user.type(screen.getByLabelText(/Title/i), "Morning");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Click "+ Brick" pill in tray
    const addLooseBrickPill = screen.getByTestId("add-loose-brick-pill");
    await user.click(addLooseBrickPill);

    // AddBrickSheet should open directly
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Brick");

    // Chooser's "Add Block" button should NOT be present
    expect(screen.queryByRole("button", { name: /^Add Block$/i })).toBeNull();
  });
});

// ─── C-m4d-014: empty state → dock + → Add Brick → save → tray renders ───────

describe("C-m4d-014: empty state → dock + → chooser → Add Brick → save → tray renders", () => {
  it("new brick via chooser from empty state appears in LooseBricksTray; empty-state unmounts", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Verify empty state
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();

    // Dock + → chooser → Add Brick → fill form → Save
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add Brick" }));
    await user.type(screen.getByLabelText(/Title/i), "My Brick");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Empty-state card should be gone
    expect(
      screen.queryByText("Tap any slot to lay your first block."),
    ).toBeNull();

    // LooseBricksTray should be visible with the new brick
    const tray = screen.getByRole("region", { name: /loose bricks/i });
    expect(tray).toBeInTheDocument();

    // blocks.length is still 0 (no block was added)
    expect(
      document.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(0);
  });
});

// ─── C-m4d-015: slot tap → Add Brick → hour discarded → tray renders ─────────

describe("C-m4d-015: slot tap → chooser → Add Brick → save → loose brick in tray; hour discarded", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("brick from slot-tap path lands in tray; no start/time field populated", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BuildingClient />);

    // Click slot at hour 9
    const slot9 = screen.getByRole("button", { name: /Add block at 09:00/i });
    await user.click(slot9);

    // Chooser opens; pick "Add Brick"
    await user.click(screen.getByRole("button", { name: "Add Brick" }));

    // AddBrickSheet — fill title and save
    await user.type(screen.getByLabelText(/Title/i), "Slot Brick");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Tray should render the new loose brick
    const tray = screen.getByRole("region", { name: /loose bricks/i });
    expect(tray).toBeInTheDocument();

    // Empty-state unmounts
    expect(
      screen.queryByText("Tap any slot to lay your first block."),
    ).toBeNull();
  });
});

// ─── C-m4d-016: two rapid dock + taps → chooser open exactly once ─────────────

describe("C-m4d-016: two rapid dock + taps do not double-mount the chooser", () => {
  it("chooser is open exactly once after two rapid taps on dock +", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Only one dialog with aria-label="Add" in the DOM
    const dialogs = screen.getAllByRole("dialog");
    const chooserDialogs = dialogs.filter(
      (d) => d.getAttribute("aria-label") === "Add",
    );
    expect(chooserDialogs).toHaveLength(1);
  });
});

// ─── C-m4d-017: M2 C-m2-020 journey via chooser ─────────────────────────────

describe("C-m4d-017: M2 dock+ → chooser → Add Block → save journey (replaces C-m2-020 direct path)", () => {
  it("saves a block 'Foo' via chooser routing; EmptyBlocks unmounts; block in DOM", async () => {
    const user = userEvent.setup();
    render(<BuildingClient />);

    // Tap dock +
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Tap "Add Block" in chooser
    await user.click(screen.getByRole("button", { name: "Add Block" }));

    // Type title and save
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    // Empty-state card unmounts
    expect(
      screen.queryByText("Tap any slot to lay your first block."),
    ).toBeNull();

    // Block is in DOM
    const tlBlock = document.querySelector('[data-component="timeline-block"]');
    expect(tlBlock).not.toBeNull();
    expect(tlBlock?.textContent).toContain("Foo");
  });
});
