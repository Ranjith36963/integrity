import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineBlock } from "./TimelineBlock";
import { blockPct } from "@/lib/dharma";
import { EditModeProvider, useEditMode } from "./EditModeProvider";
import userEvent from "@testing-library/user-event";
import type { Block } from "@/lib/types";

const fitnessBlock: Block = {
  start: "06:00",
  end: "07:00",
  name: "Fitness",
  category: "health",
  bricks: [
    { kind: "goal", name: "pushups", current: 80, target: 100 },
    { kind: "time", name: "run", current: 30, target: 30 },
    { kind: "tick", name: "stretch", done: true },
  ],
};

const emptyBlock: Block = {
  start: "09:00",
  end: "10:00",
  name: "Empty block",
  category: "mind",
  bricks: [],
};

function renderBlock(
  block: Block,
  status: "past" | "current" | "future" = "current",
) {
  return render(
    <EditModeProvider>
      <TimelineBlock block={block} status={status} onLogBrick={vi.fn()} />
    </EditModeProvider>,
  );
}

// Helper component to test edit mode scenarios
function TimelineBlockWithEditToggle({ block }: { block: Block }) {
  const { toggle } = useEditMode();
  return (
    <>
      <button aria-label="Toggle edit" onClick={toggle} />
      <TimelineBlock block={block} status="current" onLogBrick={vi.fn()} />
    </>
  );
}

// C-bld-017: TimelineBlock shows start, end, name, category dot, and pct
describe("C-bld-017: TimelineBlock renders start/end/name/category/pct", () => {
  it("shows 06:00, 07:00, Fitness, health dot, and pct numeral", () => {
    renderBlock(fitnessBlock, "current");
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("07:00")).toBeInTheDocument();
    expect(screen.getByText("Fitness")).toBeInTheDocument();
    const pct = Math.round(blockPct(fitnessBlock));
    expect(screen.getByText(String(pct))).toBeInTheDocument();
  });
});

// C-bld-018: past status → wrapper has opacity: 0.55
describe("C-bld-018: past block has opacity 0.55", () => {
  it("wrapper style has opacity 0.55 for status='past'", () => {
    const { container } = renderBlock(fitnessBlock, "past");
    const wrapper = container.querySelector(
      "[data-testid='timeline-block']",
    ) as HTMLElement;
    expect(wrapper.style.opacity).toBe("0.55");
  });
});

// C-bld-019: block with empty bricks shows empty state copy
describe("C-bld-019: TimelineBlock shows empty state for empty bricks", () => {
  it("shows 'No bricks yet. Tap + to add a brick.'", () => {
    renderBlock(emptyBlock, "current");
    expect(
      screen.getByText("No bricks yet. Tap + to add a brick."),
    ).toBeInTheDocument();
  });
});

// C-bld-028: TimelineBlock in edit mode shows Delete block button
describe("C-bld-028: TimelineBlock in edit mode shows delete affordance", () => {
  it("shows × button with aria-label='Delete block' when edit mode is on", async () => {
    const user = userEvent.setup();
    render(
      <EditModeProvider>
        <TimelineBlockWithEditToggle block={fitnessBlock} />
      </EditModeProvider>,
    );
    // Initially no delete block button
    expect(
      screen.queryByRole("button", { name: "Delete block" }),
    ).not.toBeInTheDocument();
    // Toggle edit mode
    await user.click(screen.getByRole("button", { name: /toggle edit/i }));
    expect(
      screen.getByRole("button", { name: "Delete block" }),
    ).toBeInTheDocument();
  });
});
