import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { BLOCKS } from "@/lib/data";
import { currentBlockIndex } from "@/lib/dharma";
import { EditModeProvider } from "./EditModeProvider";

function renderTimeline(blocks = BLOCKS) {
  return render(
    <EditModeProvider>
      <Timeline blocks={blocks} now="11:47" onLogBrick={vi.fn()} />
    </EditModeProvider>,
  );
}

// C-bld-014: renders exactly BLOCKS.length timeline-block elements in source order
describe("C-bld-014: Timeline renders correct number of timeline blocks", () => {
  it("renders 16 [data-testid='timeline-block'] elements", () => {
    const { container } = renderTimeline();
    const blocks = container.querySelectorAll("[data-testid='timeline-block']");
    expect(blocks).toHaveLength(BLOCKS.length);
  });
});

// C-bld-015: block statuses are correct (past/current/future)
describe("C-bld-015: Timeline block statuses are correctly set", () => {
  it("assigns correct data-status to each block", () => {
    const { container } = renderTimeline();
    const blocks = container.querySelectorAll("[data-testid='timeline-block']");
    const currentIdx = currentBlockIndex(BLOCKS, "11:47"); // 9

    blocks.forEach((block, i) => {
      if (i < currentIdx) {
        expect(block).toHaveAttribute("data-status", "past");
      } else if (i === currentIdx) {
        expect(block).toHaveAttribute("data-status", "current");
      } else {
        expect(block).toHaveAttribute("data-status", "future");
      }
    });
  });
});

// C-bld-016: empty blocks renders empty state copy and no timeline-block elements
describe("C-bld-016: Timeline renders empty state for blocks=[]", () => {
  it("shows empty state copy and no timeline-block elements", () => {
    renderTimeline([]);
    expect(
      screen.getByText(/No blocks yet\. Tap \+ to add your first block\./),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-testid='timeline-block']"),
    ).toHaveLength(0);
  });
});
